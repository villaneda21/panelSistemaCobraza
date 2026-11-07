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
