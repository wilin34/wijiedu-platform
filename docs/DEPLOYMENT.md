# Despliegue fuera de Manus

## Requisitos

WijiEdu requiere un servicio Node.js persistente, una base de datos MySQL/TiDB y almacenamiento de archivos compatible con S3. GitHub aloja el código fuente, pero GitHub Pages no puede ejecutar el backend, las sesiones, tRPC, las migraciones ni las grabaciones de proctoring.

## Render

El archivo `render.yaml` define el servicio web. En el panel de Render configura como secretos las variables siguientes:

| Variable | Uso |
|---|---|
| `DATABASE_URL` | Conexión de producción MySQL/TiDB |
| `JWT_SECRET` | Firma de sesiones |
| `APP_BASE_URL` | URL pública del servicio |
| `VITE_APP_ID` | Identificador OAuth actual |
| `OAUTH_SERVER_URL` | Servidor OAuth actual |
| `OWNER_OPEN_ID` | Identidad del propietario |
| `BUILT_IN_FORGE_API_URL` | API actual de IA/almacenamiento |
| `BUILT_IN_FORGE_API_KEY` | Credencial de API actual |
| `RESEND_API_KEY` | Correo opcional |
| `EMAIL_FROM` | Remitente de correo opcional |

Después del primer despliegue ejecuta las migraciones con la conexión de producción:

```bash
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

## Reducir dependencia de Manus

La versión actual conserva OAuth y almacenamiento Manus porque son parte del funcionamiento existente. Para una independencia completa hay que sustituir:

1. La autenticación OAuth en `server/_core/oauth.ts` y `server/_core/context.ts` por un proveedor elegido por el propietario.
2. `server/storage.ts` por un adaptador S3/R2 con claves propias.
3. Las llamadas IA de `server/_core/llm.ts` por el proveedor de modelos elegido.

No se almacenan credenciales en GitHub. Esa migración debe hacerse después de elegir proveedores y obtener sus claves.
