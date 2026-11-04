# CMDB Frontend

Interfaz de **Carlos Movies Data Base (CMDB)**, un catálogo de películas, anime y series geek. Desde aquí los usuarios pueden descubrir títulos, proponer nuevas obras, publicar reseñas, reaccionar a las reseñas de otros y consultar el ranking. Los administradores revisan las propuestas pendientes y gestionan las categorías.

La interfaz está hecha con HTML, CSS y JavaScript nativo, sin frameworks ni dependencias de npm.

## Repositorios

- **Backend (API):** [danielAVAR/cmdb-back-end-](https://github.com/danielAVAR/cmdb-back-end-)
- **Frontend:** este repositorio.

## Documentación

El video del proyecto, planificacion scrum y las historias de usuario están en la carpeta de Google Drive:

- [Video e historias de usuario](https://drive.google.com/drive/folders/1XRz8e7SL5ekA93ogKyMmZz5pfo3n3u0U?usp=sharing)

## Tecnologías

- HTML5 y CSS3. Estilos compartidos en `css/` y estilos del panel en `css/admin.css`.
- JavaScript nativo con módulos ES (`type="module"`), sin bundler ni transpilación.
- Fetch API con `AbortController` para las peticiones y sus tiempos de espera.
- `localStorage` para guardar el token JWT y los datos de la sesión.
- Node.js únicamente para el servidor de desarrollo estático (`js/dev-server.js`).
- Google Fonts para la tipografía y `image.tmdb.org` para los pósters.

El backend usa Node.js, Express y MySQL. Consulta su [README](https://github.com/danielAVAR/cmdb-back-end-#readme) para instalarlo.

## Requisitos

- Node.js 20 o posterior.
- El backend de CMDB en ejecución. En desarrollo local debe estar en `http://localhost:3000`.

## Instalación y ejecución

1. Clona este repositorio y entra a la carpeta:

   ```sh
   git clone <URL_DE_ESTE_REPOSITORIO>
   cd cmdb_frontend
   ```

2. No hay dependencias que instalar. Inicia el servidor de desarrollo:

   ```sh
   npm run dev
   ```

3. Abre `http://127.0.0.1:5173` en el navegador.

Para usar otro puerto, ejecuta `PORT=8080 npm run dev` (en Windows, define `PORT` antes del comando según tu terminal).

El servidor solo entrega los archivos del frontend. No inicia ni reemplaza el backend.

### CORS

El backend solo acepta peticiones desde los orígenes indicados en su variable `FRONTEND_URL`. Para trabajar en local, esa variable debe incluir exactamente:

```env
FRONTEND_URL=http://127.0.0.1:5173
```

Si el origen no coincide (por ejemplo, abriste el frontend con `localhost:5173`), el navegador bloqueará las peticiones.

## Configuración de la API

La URL del backend se define en `js/config.js`:

| Entorno | URL base de la API |
| --- | --- |
| `localhost` o `127.0.0.1` | `http://localhost:3000/api/v1` |
| Cualquier otro dominio | `https://cmdb-back-end.onrender.com/api/v1` |

Otras opciones de `js/config.js`:

- `requestTimeoutMs`: tiempo máximo de espera, 60 segundos. Se amplió porque el plan gratuito de Render tarda en despertar.
- `pageSize`: número de obras por página, 30.
- `tokenKey`: clave de `localStorage` donde se guarda el token (`cmdb_access_token`).
- `credentials`: `"omit"`. El frontend no usa cookies; envía el token en el encabezado `Authorization`.

## Páginas

| Archivo | Descripción |
| --- | --- |
| `html/index.html` | Catálogo público con filtros por categoría y orden, incluido el ranking. |
| `html/detail.html` | Detalle de una obra con sus reseñas y reacciones (like o dislike). |
| `html/login.html` | Inicio de sesión y registro. |
| `html/admin.html` y `html/admin/index.html` | Resumen del panel de administración. |
| `html/admin/works.html` | Revisión de propuestas pendientes y gestión de obras. |
| `html/admin/categories.html` | Crear, editar y eliminar categorías. |
| `html/admin/users.html` | Página informativa: el backend no tiene rutas para administrar cuentas. |

## Estructura

```text
html/                 Páginas públicas y de administración
  admin/              Resumen, obras, categorías y usuarios
css/                  Estilos compartidos (styles, components) y del panel (admin)
js/                   Cliente HTTP, autenticación y lógica pública
  admin/              Lógica del panel de administración
assets/               Imágenes locales
```

## Ejemplos de endpoints

La URL base local es `http://localhost:3000/api/v1`. Las rutas que requieren sesión llevan el encabezado `Authorization: Bearer <token>`.

### Registrar un usuario

```sh
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"ana","email":"ana@example.com","password":"una-clave-segura"}'
```

La contraseña debe tener entre 8 y 72 caracteres.

### Iniciar sesión

```sh
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ana@example.com","password":"una-clave-segura"}'
```

La respuesta incluye `data.token` (JWT) y `data.user`. El frontend guarda ambos en `localStorage`.

### Listar películas aprobadas, ordenadas por ranking

```sh
curl "http://localhost:3000/api/v1/movies?sort=ranking&categoryId=1"
```

Valores válidos de `sort`: `ranking`, `popular`, `newest` y `title`. `categoryId` es opcional.

### Consultar el detalle de una obra

```sh
curl http://localhost:3000/api/v1/movies/1
```

La respuesta incluye categorías, reparto, dirección y reseñas.

### Proponer una obra (requiere sesión)

```sh
curl -X POST http://localhost:3000/api/v1/movies \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"movieName":"Ejemplo","overview":"Descripción breve.","releaseYear":2025,"categoryIds":[1],"imageUrl":null}'
```

Las obras nuevas quedan en estado `pending` hasta que un administrador las apruebe con `PATCH /movies/:id/approve`.

### Publicar una reseña (requiere sesión)

```sh
curl -X POST http://localhost:3000/api/v1/reviews \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"movieId":1,"title":"Muy buena","comment":"Me encantó el final.","rating":9}'
```

`rating` va de 1 a 10. `title` admite hasta 150 caracteres y `comment` hasta 500.

### Reaccionar a una reseña (requiere sesión)

```sh
curl -X PUT http://localhost:3000/api/v1/reviews/1/reaction \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"reaction":"like"}'
```

`reaction` acepta `like` o `dislike`. Para quitar la reacción, usa `DELETE /reviews/1/reaction`.

## Cómo consume el frontend la API

Todas las llamadas pasan por `js/api.js`. Cada función devuelve el campo `data` de la respuesta y lanza un `ApiError` con `status`, `message` y `errors` si algo falla. Así se usa en el catálogo:

```js
import { listMovies, listCategories } from "./api.js";

const categories = await listCategories();
const movies = await listMovies({ categoryId: 1, sort: "ranking" });
```

Para agregar un endpoint nuevo, crea una función en `js/api.js` con la misma forma que las existentes y úsala desde la página correspondiente.

## Límites de peticiones

El backend limita las peticiones por IP. Al superar un límite responde `429`:

- Cada IP puede hacer 300 peticiones cada 15 minutos.
- `POST /auth/login`: 10 intentos fallidos cada 15 minutos. Los inicios de sesión correctos no cuentan.
- `POST /auth/register`: 20 registros por hora.
