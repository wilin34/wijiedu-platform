# WijiEdu Platform

Plataforma educativa multiinstitución con gestión académica, exámenes supervisados, generación de evaluaciones con IA, notas, LMS y almacenamiento de documentos.

## Desarrollo local

```bash
pnpm install
cp .env.example .env
pnpm check
pnpm test
pnpm dev
```

## Despliegue recomendado

El proyecto es **full-stack**: necesita un proceso Node.js, una base de datos MySQL/TiDB y almacenamiento compatible con S3. GitHub conserva el código, pero no ejecuta por sí solo el backend ni la base de datos.

La configuración `render.yaml` prepara un servicio web en Render. Antes de desplegar, crea una base MySQL/TiDB y completa las variables marcadas como secretas en Render.

### Variables principales

- `DATABASE_URL`: conexión MySQL/TiDB de producción.
- `JWT_SECRET`: secreto largo y aleatorio para cookies.
- `APP_BASE_URL`: URL pública del servicio.
- `VITE_APP_ID`, `OAUTH_SERVER_URL`, `OWNER_OPEN_ID`: autenticación actualmente configurada.
- `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY`: almacenamiento y servicios Manus usados por la implementación actual.
- `RESEND_API_KEY`, `EMAIL_FROM`: correo transaccional opcional.

> Para eliminar completamente la dependencia de Manus se debe sustituir la autenticación OAuth y el adaptador de almacenamiento de `server/storage.ts` por un proveedor propio (por ejemplo, Auth.js/Clerk y S3/R2). Esta migración requiere credenciales y decisiones de proveedor separadas; no se incluyen secretos en este repositorio.

## Migraciones

Genera y aplica las migraciones en el entorno de producción después de configurar `DATABASE_URL`:

```bash
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

## Validación

```bash
pnpm check
pnpm test
pnpm build
```

Nunca subas archivos `.env`, contraseñas, tokens, claves de API ni grabaciones al repositorio.

## Licencia y seguridad

El repositorio se crea como privado por defecto. Revisa los permisos de colaboradores, rota cualquier secreto expuesto y configura copias de seguridad de la base de datos y del almacenamiento antes de usarlo con instituciones reales.
