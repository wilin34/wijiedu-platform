# Auditoría de aislamiento multiinstitución

Fecha de revisión: 2026-08-29.

| Área | Control aplicado | Evidencia |
|---|---|---|
| Dashboard | Conteos y promedios filtran `institutionId` para admin, docente y estudiante. | `server/db.ts:getDashboardStats`; `server/routers/academic.ts:dashboard`. |
| Usuarios y estudiantes | Consultas por tenant y permisos de administración institucional. | `server/db.ts`; `server/academic.router.test.ts`. |
| Materias e inscripciones | Consultas, creación, actualización y retiro verifican tenant activo. | `server/db.ts`; pruebas de autorización. |
| Actividades, entregas y calificaciones | Filtros por tenant en lecturas, mutaciones y joins. | `server/db.ts`; `server/academic.router.test.ts`. |
| Clases en vivo | Materia, creación, publicación y eliminación se validan dentro del tenant. | `server/academic.router.test.ts`. |
| Notificaciones | Preferencias, lectura y destinatarios se separan por institución. | `server/notifications.test.ts`. |
| Currículo y recursos | Recursos, competencias, módulos, lecciones y evaluaciones filtran `institutionId`. | `server/db.ts`; `server/academic.router.test.ts`. |
| Progreso | Lecciones completadas validan lección, módulo y progreso contra el tenant activo. | `server/db.ts`; `server/routers/academic.ts`. |
| Mensajería | Destinatarios y conversaciones filtran institución y materia. | `server/db.ts`; `server/routers/academic.ts`. |

La sesión real disponible se verificó como `wilinton@gmail.com` con rol de propietario global: el dashboard mostró el portal autenticado y la sección **Instituciones** fue accesible. La vista móvil de Estudiantes y Calificaciones también fue capturada a 390×844 px. La validación de cambio entre dos membresías requiere una cuenta con dos membresías activas o una sesión institucional adicional.
