# CMDB feature building guide

This is the reusable, start-to-finish checklist for adding a feature to CMDB. Follow it in order. The application has two separate projects: this frontend (plain HTML, CSS and JavaScript) and the sibling `cmdb-back-end-` project (Node.js, Express and MySQL). A feature that saves or loads shared data usually needs work in both projects.

Use the paths below relative to the named project root. Replace every `example` name with the real feature name. The examples use a hypothetical **watchlist** (a user saves movies to view later). It is an example only: there is no watchlist API or UI today.

## 0. Know the project before editing

Frontend structure:

```text
cmdb_frontend/
  html/                 Public pages and admin pages
  css/                  Shared and admin styles
  js/api.js             Shared HTTP client and API functions
  js/auth.js            Token and current-user helpers
  js/main.js            Public catalog page behavior
  js/detail.js          Movie detail and review behavior
  js/admin/             Admin page behavior
```

Backend structure:

```text
cmdb-back-end-/
  sql/schema.sql        Full database setup (not a safe upgrade script)
  src/app.js            Express app, middleware, API mount and error handling
  src/routes/           HTTP method + URL + middleware
  src/controllers/      HTTP request/response handling
  src/validators/       Request input rules
  src/services/         SQL and business rules
  src/dtos/             Data mapping helpers (check usage before extending)
  src/config/db.js      MySQL connection pool
  src/config/swagger.js OpenAPI/Swagger configuration
```

The frontend is served separately. `js/config.js` selects `http://localhost:3000/api/v1` on localhost and the deployed API on other hosts. The backend mounts routes at `/api/v1`, returns JSON shaped like `{ success: true, data: ... }`, and sends errors through shared middleware. `js/api.js` unwraps `data`, adds the bearer token, and turns failures into `ApiError`.

## 1. Describe the feature in plain words

Before coding, fill this in:

```text
Feature name:
Who can use it:
What the person does:
What the person sees after success:
What happens if they are signed out:
What happens if the record does not exist:
What happens if the network/API fails:
Does information need to be saved after refresh? yes/no
```

Example: “A signed-in member saves an approved movie to their own watchlist. The movie remains there after refresh. The member can list and remove their saved movies. A signed-out visitor is sent to sign in or sees a sign-in prompt.”

Draw the small flow on paper before writing files:

```text
person clicks Save
  → frontend calls API helper
  → Express route checks token and input
  → controller reads URL/body/user and calls service
  → service reads/writes MySQL
  → response returns through controller
  → frontend shows result or error
```

## 2. Decide what data must be stored

Ask: what is one record, who owns it, and what records is it connected to? Do not store a value that can safely be calculated from other values unless there is a reason. Pick column types, required/optional fields, uniqueness, and delete behavior deliberately.

For a watchlist, a movie can be saved by many users and a user can save many movies. That is a many-to-many relationship, so use a join table:

```sql
CREATE TABLE user_watchlist (
  user_id INT UNSIGNED NOT NULL,
  movie_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, movie_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE
) ENGINE=InnoDB;
```

The composite primary key makes it impossible for one user to save the same movie twice. Foreign keys stop orphan rows, and cascading deletes clean up a user's saved entries if the user or movie is deleted. Decide whether these cascade rules match the feature before copying them.

### Database safety rule

`sql/schema.sql` is the full setup script, and currently contains `DROP DATABASE IF EXISTS cmdb`. **Do not run it against a database with data you want to keep.** For an existing database, add a new incremental SQL migration file (for example `sql/002_add_user_watchlist.sql`) containing only the `CREATE TABLE` or `ALTER TABLE` needed. Back up important data, run the migration against a local development database first, and have the team use the same migration. This repository does not currently show a migration runner/history table, so document exactly how the new SQL is applied. Never put credentials in SQL or commit `.env`.

## 3. Write the API contract before coding

Write down the URL, method, access rule, input, output, and likely errors. Keep JSON property names consistent with the existing API. IDs in URL paths are singular resources; lists use plural paths.

Example contract:

| Method | Path | Access | Request | Success |
| --- | --- | --- | --- | --- |
| `GET` | `/api/v1/watchlist` | Signed in | None | `200 { success: true, data: [movie, ...] }` |
| `POST` | `/api/v1/watchlist` | Signed in | `{ "movieId": 12 }` | `201 { success: true, data: { "movieId": 12 } }` |
| `DELETE` | `/api/v1/watchlist/:movieId` | Signed in | None | `204` with no body |

Decide errors too: `400` invalid ID/body, `401` missing/expired token, `404` movie missing/not approved, `409` duplicate save if not idempotent, and `500` unexpected server issue. Decide whether repeating a save returns success or `409`, then implement the same rule in API docs and frontend behavior. Make access control depend on the verified `req.user.id`, never a user ID sent by the browser.

## 4. Add the backend, one small layer at a time

All backend file paths below are under `cmdb-back-end-/`. The order makes each layer's job clear.

### 4.1 Validator: reject bad input at the door

Create `src/validators/watchlist.validator.js`:

```js
import { body, param } from 'express-validator';

export const addWatchlistItemValidator = [
  body('movieId').isInt({ min: 1 }).withMessage('movieId must be a positive integer'),
];

export const watchlistMovieIdValidator = [
  param('movieId').isInt({ min: 1 }).withMessage('movieId must be a positive integer'),
];
```

Validators check shape and simple limits. The service still checks database facts (such as whether the movie exists and is approved). Never trust browser validation alone.

### 4.2 Service: put database and business rules here

Create `src/services/watchlist.service.js`:

```js
import db from '../config/db.js';
import { ApiError } from '../middlewares/error.middleware.js';
import { MOVIE_STATUS } from '../utils/constants.js';

export default class WatchlistService {
  async list(userId) {
    const [rows] = await db.execute(
      `SELECT m.id, m.movie_name, m.overview, m.release_year, m.image_url
       FROM user_watchlist w
       JOIN movies m ON m.id = w.movie_id
       WHERE w.user_id = ? AND m.status = ?
       ORDER BY w.created_at DESC`,
      [userId, MOVIE_STATUS.APPROVED],
    );
    return rows;
  }

  async add(userId, movieId) {
    const [movies] = await db.execute(
      'SELECT id FROM movies WHERE id = ? AND status = ?',
      [movieId, MOVIE_STATUS.APPROVED],
    );
    if (!movies[0]) throw new ApiError(404, 'Approved movie not found');

    // INSERT IGNORE makes a repeated save safe and keeps the operation idempotent.
    await db.execute(
      'INSERT IGNORE INTO user_watchlist (user_id, movie_id) VALUES (?, ?)',
      [userId, movieId],
    );
    return { movieId: Number(movieId) };
  }

  async remove(userId, movieId) {
    await db.execute(
      'DELETE FROM user_watchlist WHERE user_id = ? AND movie_id = ?',
      [userId, movieId],
    );
  }
}
```

Use `?` placeholders for SQL values. Never build SQL by joining user input into a query string. Notice that every query filters by `userId`; otherwise users could read or alter someone else's private list.

### 4.3 Controller: translate HTTP into service calls

Create `src/controllers/watchlist.controller.js`:

```js
import WatchlistService from '../services/watchlist.service.js';

const watchlist = new WatchlistService();

export const listWatchlist = async (req, res, next) => {
  try {
    res.json({ success: true, data: await watchlist.list(req.user.id) });
  } catch (error) { next(error); }
};

export const addWatchlistItem = async (req, res, next) => {
  try {
    const data = await watchlist.add(req.user.id, Number(req.body.movieId));
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};

export const removeWatchlistItem = async (req, res, next) => {
  try {
    await watchlist.remove(req.user.id, Number(req.params.movieId));
    res.status(204).end();
  } catch (error) { next(error); }
};
```

Controllers do not write SQL. They take authenticated identity from `req.user`, call the service, choose the HTTP status and response shape, and pass errors to `next(error)`.

### 4.4 Routes: connect URL + method + protections + validation

Create `src/routes/watchlist.routes.js`:

```js
import { Router } from 'express';
import auth from '../middlewares/auth.middleware.js';
import validate from '../middlewares/validate.middleware.js';
import {
  addWatchlistItemValidator,
  watchlistMovieIdValidator,
} from '../validators/watchlist.validator.js';
import {
  addWatchlistItem,
  listWatchlist,
  removeWatchlistItem,
} from '../controllers/watchlist.controller.js';

const router = Router();

router.get('/', auth, listWatchlist);
router.post('/', auth, addWatchlistItemValidator, validate, addWatchlistItem);
router.delete('/:movieId', auth, watchlistMovieIdValidator, validate, removeWatchlistItem);

export default router;
```

Register the router in `src/routes/index.js`:

```js
import watchlistRoutes from './watchlist.routes.js';
// alongside the other router.use lines:
router.use('/watchlist', watchlistRoutes);
```

`src/app.js` already mounts this router tree at `/api/v1`; do not add `/api/v1` again inside each feature router. Add `auth` to private routes. Add `requireRole('administrator')` only for actions that truly require an administrator, as in `src/routes/categories.routes.js`.

### 4.5 Update API documentation

The backend exposes Swagger at `/api-docs` and configures it in `src/config/swagger.js`. Add the new paths, request body, response schema, auth requirement, and error responses using the format already present there. If the file references route JSDoc, follow its existing source. Also update the backend README's endpoint table and keep the contract table in this guide or a feature-specific design note in sync.

## 5. Connect the frontend API client

In `js/api.js`, add named functions next to the related existing API group:

```js
// Watchlist
export const listWatchlist = () => request('/watchlist');

export const addWatchlistItem = (movieId) =>
  request('/watchlist', {
    method: 'POST',
    body: { movieId: Number(movieId) },
  });

export const removeWatchlistItem = (movieId) =>
  request(`/watchlist/${encodeURIComponent(movieId)}`, { method: 'DELETE' });
```

The shared `request()` already attaches a saved JWT when present and unwraps `{ data }`. Do not call `fetch()` separately for a normal CMDB endpoint, and do not add the full base URL to each helper. Use `encodeURIComponent` for values inserted into a URL.

If adding a public API function, explicitly pass `{ auth: false }` as existing public calls do. If an endpoint needs no body on DELETE, do not send `{}` unless the API contract requires it.

## 6. Build the screen from the HTML outward

Choose the page that owns the feature. Existing pages are `html/index.html`, `html/detail.html`, `html/login.html`, and `html/admin/*.html`. Create a new HTML page only if it is a distinct destination. Put visible structure in HTML, behavior in a JS module, and appearance in CSS.

Example: add a button to a movie card or detail page with a stable data hook:

```html
<button class="button button-quiet" type="button" data-watchlist-add="12">
  Save to watchlist
</button>
<p data-watchlist-message aria-live="polite"></p>
```

In the page's JS module, import the API helper, listen for a click, disable while saving, then show a readable success or error message:

```js
import { addWatchlistItem } from './api.js';
import { isLoggedIn } from './auth.js';

document.querySelectorAll('[data-watchlist-add]').forEach((button) => {
  button.addEventListener('click', async () => {
    const message = document.querySelector('[data-watchlist-message]');
    if (!isLoggedIn()) {
      message.textContent = 'Inicia sesión para guardar películas.';
      return;
    }

    button.disabled = true;
    try {
      await addWatchlistItem(button.dataset.watchlistAdd);
      message.textContent = 'Película guardada.';
    } catch (error) {
      message.textContent = error.message || 'No se pudo guardar la película.';
    } finally {
      button.disabled = false;
    }
  });
});
```

This is a pattern, not a complete copy-paste page: a catalog may render cards after the initial page load, so attach one delegated listener to the grid or bind after rendering. Keep DOM text with `textContent` (the existing UI avoids inserting untrusted data with `innerHTML`). Add matching styles to `css/components.css` or the page's relevant stylesheet. Use existing classes and responsive rules where possible.

Load and render state using the same pattern as `js/admin/works.js`: show a loading state, fetch, render records, show an empty state for zero results, and show an error if loading fails. For forms, call `event.preventDefault()`, read values, validate helpful basics in the browser, disable submit while waiting, then either clear/close and reload or leave the form open with an error. The backend remains the final authority on input.

## 7. Check every user path

Walk through each of these manually in the browser and API docs/client:

1. Signed-out user visits the feature.
2. Signed-in normal user uses the happy path.
3. User refreshes; saved information still appears.
4. User enters invalid or missing data.
5. User tries an ID that does not exist.
6. User repeats an action (duplicate save, repeated delete, etc.).
7. API is offline or responds with an error.
8. A different user cannot see or change private information.
9. Administrator behavior, if the feature has admin-only actions.
10. Narrow/mobile layout and keyboard-only use; buttons have labels and messages use `aria-live` where useful.

The frontend repository currently has no test script or test dependencies. The backend README says API endpoints are available in Swagger UI. Follow the project/team's verification process; do not claim the feature was tested unless you actually ran through the relevant paths. Keep development CORS aligned: `FRONTEND_URL` in backend must contain the exact frontend origin (for example `http://127.0.0.1:5173`).

## 8. Finish the change cleanly

Before calling the feature done, check these boxes:

- [ ] Database change is incremental, reviewed, and applied to the intended database.
- [ ] API contract, access rules, validation, errors, and response examples agree.
- [ ] SQL uses placeholders and the authenticated user identity is enforced server-side.
- [ ] New backend route is imported and mounted from `src/routes/index.js`.
- [ ] Frontend helper is in `js/api.js` and uses the shared request function.
- [ ] HTML, JS, and CSS are connected; loading, empty, success, and error states exist.
- [ ] Swagger and backend documentation describe the new endpoint.
- [ ] README/setup instructions mention any new environment or migration step.
- [ ] Verification results are recorded honestly, including what was not verified.

## 9. What kinds of features fit this project?

These examples match the existing movie catalog and database relationships. Some require backend work first; a table in `schema.sql` does not mean an API already exists.

| Example feature | Existing foundation | Likely new work |
| --- | --- | --- |
| Watchlist / saved movies | `users`, `movies`, user-movie join table pattern | Migration, private watchlist endpoints, account page or detail button |
| Actor and director pages | `actors`, `directors`, `movie_actors`, `movie_directors`; movie details already return credits | CRUD/list/search routes and pages (the tables exist but there are currently no actor/director endpoints) |
| User profile editing | `users` and auth/JWT | Safe profile endpoint, validation, account form; never return `password_hash` |
| Admin user management | `administrator` column and frontend admin shell | Backend admin routes are currently absent; add role-protected API before enabling `html/admin/users.html` |
| Favorites or personal ratings | Reviews already store 1–10 ratings | Clarify whether this means a separate private score or simply a personal favorite; design uniqueness and permissions first |
| Search by title/person | Movie list and existing actor/director relations | Query parameters, indexed SQL where useful, validator, filter controls |
| Pagination | Current frontend loads catalog results and slices visible items in browser | API `limit`/`cursor` or `page` contract, stable ordering, next-page UI |
| Lists/collections | Movies and categories | Collection table plus membership join table, ownership rules, CRUD API and UI |
| Review edit/delete controls | Backend supports owner/admin review update/delete | Add owner-aware controls and refresh/error states in the detail UI |

Prefer extending an existing domain flow (movies, categories, reviews, auth) when the idea belongs there. For a new domain, start again at the contract and database steps above rather than adding a button first.
