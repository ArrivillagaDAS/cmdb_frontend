# CMDB Frontend

Interfaz de Carlos Movies Data Base hecha con HTML, CSS y JavaScript nativo. No usa frameworks ni dependencias de npm.

## Requisitos y ejecución

- Node.js 20 o posterior.
- Backend CMDB disponible en `http://localhost:3000` para desarrollo local.

Inicia el servidor estático desde la raíz del proyecto:

```sh
npm run dev
```

Abre `http://127.0.0.1:5173`. El servidor solo entrega archivos del frontend; no reemplaza ni inicia el backend.

## Estructura

```text
html/                 Páginas públicas y páginas de administración
  admin/              Resumen, gestión de obras, categorías y usuarios
css/                  Estilos compartidos y estilos del administrador
js/                   Cliente HTTP, autenticación y comportamiento público
  admin/              Lógica del panel de administración
```

Páginas principales: `html/index.html`, `html/detail.html`, `html/login.html` y `html/admin/index.html`.

## API

El cliente HTTP está en `js/api.js`; su URL se configura en `js/config.js`. En `localhost` y `127.0.0.1` usa `http://localhost:3000/api/v1`; para otros dominios usa el backend desplegado configurado allí.

Para desarrollo local, `FRONTEND_URL` del backend debe incluir el origen exacto `http://127.0.0.1:5173` (o el origen que uses) para que CORS permita las solicitudes.

El panel usa rutas protegidas por el backend para administrar obras pendientes y categorías. El backend actual no incluye rutas administrativas para gestionar cuentas; la página de usuarios informa esa limitación.
