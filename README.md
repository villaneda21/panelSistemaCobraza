# Sistema de Cobranza - Documentación de Infraestructura y Arquitectura

## 1. Resumen del Proyecto

Sistema de gestión y cobranza modular diseñado para operar en entornos contenerizados (Docker), garantizando seguridad, trazabilidad de auditoría y separación de responsabilidades entre la operación de campo y la gerencia.

---

## 2. Arquitectura de Contenedores (Docker)

La infraestructura actual consta de dos servicios principales desplegados en la red local del servidor:

### 2.1. Backend API (`fastapi_app`)

- **Contenedor ID:** `667f82a69014`
- **Imagen:** `sistema_cobranza_api`
- **Tecnología:** FastAPI (Python 3.10.19), Uvicorn
- **Comando de Arranque:** `uvicorn main:app --host 0.0.0.0 --port 8000`
- **Puerto Expuesto:** `8000:8000`
- **Middleware:** Registro automático de auditoría (`logs_auditoria`) capturando tiempos de respuesta, códigos HTTP y rutas consultadas.

### 2.2. Base de Datos (`postgres_db`)

- **Contenedor ID:** `e1d49f5cd543`
- **Imagen:** `postgres:15` (Healthy)
- **Puerto Expuesto:** `5432:5432`
- **Base de Datos:** `cobranza_db`
- **Usuario:** `Admin_pg`
- **URL de Conexión Interna:** `postgresql://Admin_pg:***@db:5432/cobranza_db`

---

## 3. Inventario de Endpoints API (FastAPI)

- **Autenticación (`/auth`):** Login y renovación de tokens JWT.
- **Usuarios (`/users`):** Gestión de operadores y roles.
- **Rutas (`/rutas`):** Zonas geográficas / de cobro.
- **Clientes (`/clientes`):** Información de deudores por ruta.
- **Deudas (`/deudas`):** Créditos activos, saldos y estados.
- **Pagos (`/pagos`):** Registro de abonos y transacciones.
- **Gastos (`/gastos`):** Control operativo en campo.
- **Liquidaciones & Auditoría (`/liquidaciones`, `/logs_auditoria`):** Cierres de caja y trazabilidad de peticiones.

---

## 4. Política de Seguridad para el Panel Gerencial

- **Modo Exclusivo de Consulta (Solo Lectura):** Por motivos de seguridad y control gerencial, el panel administrativo web **no** tendrá permisos de escritura, actualización (`PUT`/`PATCH`) ni eliminación (`DELETE`) sobre la base de datos operativa. Su propósito es únicamente la visualización de métricas, reportes, estados de cartera y auditoría.

---

## 5. Panel Gerencial (`panel_gerencial`)

Frontend de consulta para gerencia. No registra, edita ni elimina información operativa.

- **Tecnología:** React 18, TypeScript, Vite, Tailwind CSS, Recharts
- **Imagen:** `panel_gerencial`
- **Puerto publicado:** `3000` hacia Nginx `80` (`PANEL_PORT` para cambiarlo)
- **Red:** externa, la misma de `fastapi_app`. Variable `COBRANZA_DOCKER_NETWORK` (por defecto `sistema_cobranza_default`)
- **Proxy:** el navegador llama a `/api`. Nginx reenvía ese prefijo a `http://fastapi_app:8000` y rechaza `POST`, `PUT`, `PATCH` y `DELETE`, excepto `POST /api/auth/login`
- **Vistas:** ingreso, resumen ejecutivo, cartera, liquidación por ruta y auditoría (`/logs_auditoria`)
- **Login:** `POST /api/auth/login` con JSON `{ "username", "password" }`. La respuesta debe traer `access_token` (o `token`)

```bash
docker inspect fastapi_app --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{"\n"}}{{end}}'
COBRANZA_DOCKER_NETWORK=<red> docker compose up -d --build
```

El panel queda en `http://<servidor>:3000`. En desarrollo local, con el API en `localhost:8000`:

```bash
npm install
npm run dev
```
