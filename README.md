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
- **API:** por defecto `https://gestor-pagos.com` (`VITE_API_BASE_URL` al construir la imagen). El navegador envía `Authorization: Bearer` después del login.
- **Login:** `POST /login` con `application/x-www-form-urlencoded` (`username`, `password`). La respuesta trae `access_token`, `token_type`, `rol` y `nombre_completo`. Un rechazo de FastAPI llega en `detail`.
- **Consultas:** `GET /dashboard/resumen`, `GET /dashboard/detalles_hoy`, `GET /rutas/`, `GET /rutas/{id}/estadisticas`, `GET /clientes/?ruta_id=` y `GET /clientes/{id}/historial`
- **Escrituras disponibles en el cliente, sin botones en la pantalla:** `POST /pagos/` (`deuda_id`, `monto`), `POST /deudas/` (esquema `DeudaCreate`) y `POST /liquidar/` (`ruta_id` opcional), en JSON. `DELETE /deudas/{deuda_id}` manda `motivo` por query cuando se informa.

```bash
docker inspect fastapi_app --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{"\n"}}{{end}}'
COBRANZA_DOCKER_NETWORK=<red> docker compose up -d --build
```

El panel queda en `http://<servidor>:3000` y el navegador consulta `https://gestor-pagos.com`. En la máquina local:

```bash
npm install
npm run dev
```
