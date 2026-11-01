# 🎬 CMDB — Carlos Movies Data Base (Backend API)

![Node.js](https://img.shields.io/badge/Node.js-v18+-green?style=flat-square&logo=node.js)
![Express](https://img.shields.io/badge/Express-4.x-black?style=flat-square&logo=express)
![MySQL](https://img.shields.io/badge/MySQL-8.x-blue?style=flat-square&logo=mysql)
![JWT](https://img.shields.io/badge/Auth-JWT-red?style=flat-square&logo=json-web-tokens)
![SemVer](https://img.shields.io/badge/SemVer-2.0.0-orange?style=flat-square)

## 📌 Project Overview & Theme
**CMDB (Carlos Movies Data Base)** is a high-performance RESTful API built for a full-stack web application designed for film, series, and anime enthusiasts. The platform allows users to explore catalog items, rate titles, publish detailed reviews, and engage with community feedback via like/dislike interactions.

The architecture emphasizes security, transactional consistency, dynamic rating calculations, and role-based authorization (User vs. Administrator).

### Key Features
- **Authentication & Roles:** JWT authentication with role-based permissions (`user` and `admin`).
- **Catalog Management:** Full CRUD operations for movies, series, and categories (Admin approval workflow).
- **Review System:** Interactive reviews with numerical ratings (1–10) and peer voting (like/dislike).
- **Data Integrity:** Database transactions for critical actions (rating averages and vote counters).
- **Security & Rate Limiting:** Request throttling via `express-rate-limit` and parameter validation with `express-validator`.

---

## 🛠 Tech Stack

### Core Technologies
- **Runtime Environment:** Node.js
- **Web Framework:** Express.js
- **Database:** MySQL 8.x (Relational persistence using native connection pools)

### Security & Authentication
- `jsonwebtoken` & `passport-jwt` — Token-based authorization strategies.
- `bcrypt` — Password hashing and salted security.
- `express-rate-limit` — Protection against brute-force attacks and abuse.
- `express-validator` — Strict endpoint input sanitization and validation.

### Tooling & Documentation
- `dotenv` — Environment configuration management.
- `swagger-ui-express` — Interactive API documentation.
- `semver` — API version control compliance.
- `cors` — Cross-Origin Resource Sharing for frontend client integration.

---

## 🔗 Connected Repositories

- **Backend Repository:** [danielAVAR/cmdb-back-end-](https://github.com/danielAVAR/cmdb-back-end-)
- **Frontend Repository:** [ArrivillagaDAS/cmdb_frontend](https://github.com/ArrivillagaDAS/cmdb_frontend)

---

## ⚙️ Installation & Setup Guide

### Prerequisites
- Node.js (v18.x or higher)
- MySQL Server (v8.x)
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/danielAVAR/cmdb-back-end-.git
cd cmdb-back-end-
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables Configuration
Create a `.env` file in the root directory and define the following variables:

```env
PORT=5000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=cmdb_db
DB_PORT=3306

# JWT Secret Key
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=24h
```

### 4. Database Setup
Import the database schema into your MySQL instance:
```bash
mysql -u root -p cmdb_db < database/schema.sql
```

### 5. Start the Server
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```
The server will run at: `http://localhost:5000`  
Swagger API Docs will be available at: `http://localhost:5000/api-docs`

---

## 📡 Endpoints & Consumption Examples

### 🔐 1. Authentication

#### User Login
- **Endpoint:** `POST /api/v1/auth/login`
- **Headers:** `Content-Type: application/json`
- **Request Body:**
```json
{
  "email": "user@cmdb.com",
  "password": "SecurePassword123!"
}
```
- **Response (`200 OK`):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "Sofi",
    "email": "user@cmdb.com",
    "role": "user"
  }
}
```

---

### 🎬 2. Movies & Series Catalog

#### Get Movies List (Filtered & Sorted)
- **Endpoint:** `GET /api/v1/movies?category=1&sort=ranking`
- **Response (`200 OK`):**
```json
{
  "success": true,
  "data": [
    {
      "id": 12,
      "title": "Hollow Knight: The Movie",
      "description": "An epic dark fantasy journey.",
      "category_id": 1,
      "release_year": 2026,
      "poster_path": "/images/posters/hollow_knight.jpg",
      "rating_average": 9.4,
      "status": "approved"
    }
  ]
}
```

---

### ⭐ 3. Reviews & Ratings

#### Create Movie Review
- **Endpoint:** `POST /api/v1/movies/:id/reviews`
- **Headers:** 
  - `Content-Type: application/json`
  - `Authorization: Bearer <YOUR_JWT_TOKEN>`
- **Request Body:**
```json
{
  "title": "Masterpiece",
  "comment": "Incredible sound design and breathtaking visual aesthetics.",
  "rating": 10
}
```
- **Response (`201 Created`):**
```json
{
  "success": true,
  "message": "Review submitted successfully",
  "review": {
    "id": 45,
    "movie_id": 12,
    "user_id": 1,
    "rating": 10,
    "likes_count": 0,
    "dislikes_count": 0
  }
}
```

links:
vide: https://drive.google.com/drive/folders/1XRz8e7SL5ekA93ogKyMmZz5pfo3n3u0U?usp=sharing
scrum: https://canva.link/wkx7jp6vim0mi2n
historias de usuario: https://canva.link/cagm5h6fnzxndxe
---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
