# Project TODO

- [x] Analizar la referencia HTML original y reproducir su estructura de dashboard.
- [x] Modelar y migrar la base de datos para perfiles académicos, estudiantes, materias, inscripciones, notas y actividades.
- [x] Implementar autorización Manus OAuth con roles administrador, docente y estudiante.
- [x] Implementar gestión persistente de estudiantes: crear, editar, listar y eliminar.
- [x] Implementar gestión persistente de materias y asignación de docentes y estudiantes.
- [x] Implementar gestión persistente de notas por estudiante, materia y período.
- [x] Implementar gestión persistente de actividades y entrega de archivos mediante almacenamiento seguro.
- [x] Construir el dashboard con estadísticas generales y navegación lateral fiel a la referencia.
- [x] Construir vistas y restricciones específicas para administrador, docente y estudiante.
- [x] Añadir y ejecutar pruebas unitarias para los flujos de datos y autorización.
- [x] Verificar el diseño en pantallas de escritorio y móviles.
- [x] Añadir interfaz para consultar y retirar inscripciones de estudiantes por materia.
- [x] Añadir pruebas de los routers académicos y sus restricciones de autorización.
- [x] Corregir el bloqueo de acceso detectado en la sesión de WijiEdu.
- [x] Sustituir el texto de acceso “Iniciar sesión con Manus” por una experiencia de registro clara y orientada a nuevos usuarios.
- [x] Verificar el flujo de registro y acceso en la vista pública.
- [x] Probar la recuperación de la vista pública cuando exista una sesión vencida o inválida.
- [x] Verificar que los controles de registro y acceso inicien el flujo seguro esperado.
- [x] Añadir cobertura de la limpieza de sesión local ante respuestas de autenticación inválidas.
- [x] Verificar mediante una ruta pública que la pantalla de registro se muestre de forma recuperable.
- [x] Añadir una prueba del redireccionamiento seguro iniciado desde el registro.
- [x] Añadir una prueba de la ruta pública de registro cuando la autenticación no está disponible.
- [x] Añadir una prueba de enrutamiento que confirme el acceso a /registro sin sesión válida.
- [x] Simular una sesión local inválida al comprobar la disponibilidad de /registro.
- [x] Reproducir el bloqueo persistente de acceso informado por el usuario.
- [x] Eliminar el estado de espera indefinida y habilitar una entrada funcional desde la pantalla inicial.
- [x] Verificar un flujo de acceso completo desde una sesión sin credenciales válidas.
- [x] Crear una cuenta local con rol de administrador usando los datos entregados por el usuario.
- [x] Verificar que la nueva cuenta tenga permisos administrativos.
- [x] Permitir seleccionar e inscribir estudiantes registrados durante la creación de materias.
- [x] Trasladar el registro de estudiantes y docentes al módulo interno de usuarios y roles del portal.
- [x] Añadir recursos, competencias y mensajería persistentes al modelo académico.
- [x] Implementar una herramienta de IA para generar propuestas de cursos, recursos y competencias.
- [x] Crear el curso de Finanzas con recursos y competencias académicas registradas.
- [x] Habilitar a estudiantes para entregar actividades y enviar mensajes a sus docentes.
- [x] Validar los flujos administrativos, docentes y estudiantiles añadidos.
- [x] Corregir y verificar una respuesta real del proveedor de IA para propuestas curriculares.
- [x] Añadir pruebas de inscripción automática al crear una materia con estudiantes seleccionados.
- [x] Verificar los flujos de cuentas internas, mensajería y entregas por rol.
- [x] Comprobar que la creación de materias inscriba cada estudiante seleccionado en la capa de datos.
- [x] Verificar de extremo a extremo las cuentas internas y las acciones de estudiante y docente.
- [x] Definir una identidad visual formal e institucional para WijiEdu.
- [x] Rediseñar navegación, cabeceras, tarjetas, formularios y tablas con una estética institucional coherente.
- [x] Verificar la presentación formal en escritorio y móvil.
- [x] Rediseñar tablas, estados y acciones de los módulos internos con el sistema visual institucional.
- [x] Revisar visualmente el dashboard autenticado y los módulos internos principales tras el rediseño.
- [x] Aplicar estilos institucionales explícitos a estados, badges y acciones de los módulos académicos.
- [x] Validar visualmente las vistas internas desde una sesión autenticada real.
- [x] Documentar la sesión autenticada y las rutas internas verificadas durante la revisión visual.
- [x] Ejecutar y registrar una comprobación autenticada verificable de las rutas internas del portal.
- [x] Automatizar una prueba HTTP autenticada para las rutas internas del portal.
- [x] Añadir una prueba versionada de acceso autenticado a materias, usuarios y recursos internos.
- [x] Sustituir la paleta azul por tonos neutros institucionales y mantener el dorado como acento.
- [x] Revisar contraste y consistencia visual de la paleta neutra en escritorio y móvil.
- [x] Sustituir explícitamente los acentos azules y morados restantes de los módulos académicos por tonos neutros y dorados.
- [x] Revisar visualmente dashboard, materias, usuarios, actividades y centro de aprendizaje con la paleta neutra en escritorio y móvil.
- [x] Reemplazar directamente los colores intensos residuales en los componentes académicos sin depender de reglas globales.
- [x] Corregir el error de ejecución del centro de aprendizaje y repetir la revisión visual autenticada.
- [x] Optimizar la distribución del portal para pantallas de computador.
- [x] Persistir clases en vivo con materia, horario, enlace de Google Meet y estado de publicación.
- [x] Permitir a administración crear, editar y publicar clases en vivo.
- [x] Permitir a estudiantes inscritos consultar y unirse a clases publicadas.
- [x] Verificar permisos, enlaces y visualización de clases en vivo.
- [x] Incorporar edición y cambio de estado para clases en vivo desde administración.
- [x] Validar el recorrido de administración y estudiante con una clase publicada temporal.
- [x] Modelar módulos curriculares detallados, temas, explicaciones y resultados de aprendizaje.
- [x] Extender la IA para proponer materias con competencias, módulos, lecciones y recursos ilustrativos.
- [x] Persistir módulos y lecciones asociados a cada materia con permisos académicos.
- [x] Crear una página de detalle al abrir una materia con su programa, módulos y contenidos.
- [x] Incorporar imágenes educativas apropiadas en la presentación de los módulos.
- [x] Verificar creación con IA, acceso por roles y visualización detallada de la materia.
- [x] Modelar evaluaciones de cierre de módulo, preguntas, intentos y resultados por estudiante.
- [x] Generar cuestionarios y actividades evaluables mediante IA a partir del contenido del módulo.
- [x] Persistir el avance de módulos y lecciones por estudiante con controles de acceso.
- [x] Incorporar resolución de cuestionarios y marcación de lecciones completadas para estudiantes.
- [x] Mostrar una barra y estados visuales de progreso dentro de cada materia.
- [x] Verificar generación, respuestas, permisos y cálculo de progreso académico.
- [x] Generar y descargar un PDF institucional con el plan completo de cada materia.
- [x] Verificar permisos, contenido y descarga del PDF curricular.
- [x] Diseñar un asistente de IA integrado en la vista de cada materia para ampliar su contenido curricular.
- [x] Permitir a administración generar y aplicar una propuesta curricular completa desde la materia.
- [x] Incluir competencias, módulos, lecciones, recursos, evaluaciones e ilustraciones en la propuesta generada.
- [x] Refinar iconos, contenedores y estados visuales para una apariencia institucional más natural.
- [x] Verificar el asistente curricular integrado y la iconografía en escritorio y móvil.
- [x] Generar evaluaciones de cierre automáticamente para cada módulo de una materia creada con IA.
- [x] Verificar que la creación IA persista evaluaciones de módulo junto al programa académico.
- [x] Implementar eliminación segura de usuarios desde administración y proteger la cuenta administradora actual.
- [x] Eliminar datos académicos dependientes al borrar una cuenta de usuario cuando corresponda.
- [x] Unificar el mensaje de inicio de sesión fallido como “Datos incorrectos” sin revelar si existe el correo.
- [x] Añadir controles visuales de eliminación y validar el flujo de acceso inválido.
- [x] Completar la limpieza de evaluaciones y referencias de autoría al eliminar una cuenta de usuario.
- [x] Verificar mediante pruebas que la eliminación sane todas las referencias académicas dependientes.
- [x] Ampliar la prueba de integración para cubrir recursos, clases en vivo, mensajes, entregas y perfiles estudiantiles al eliminar una cuenta.
- [ ] Definir productos académicos y planes de suscripción cobrables mediante Stripe.
- [ ] Preparar la integración segura de Stripe y sus variables de entorno.
- [ ] Implementar catálogo, inicio de pago y estados de suscripción en el portal.
- [ ] Probar en modo seguro los pagos, suscripciones y permisos comerciales.
- [x] Investigar y curar recursos educativos verificables para el curso de Inversiones.
- [x] Crear una materia de Inversiones de 40 horas con competencias, módulos y lecciones detalladas.
- [x] Incorporar actividades evaluables y recursos de video, PDF y lectura al curso de Inversiones.
- [x] Verificar la publicación, estructura y visualización del nuevo curso.
- [x] Confirmar mediante una sesión autenticada la consulta y presentación del curso INV-401.

- [x] Crear tokens de recuperación temporales almacenados únicamente como hash.
- [x] Implementar solicitud y confirmación de cambio de contraseña con expiración y uso único.
- [x] Integrar la pantalla de recuperación desde el acceso institucional.
- [x] Probar privacidad, expiración, cambio de contraseña y acceso posterior.
- [x] Publicar el flujo seguro de restablecimiento.

No se deben registrar contraseñas ni tokens en texto plano en respuestas, logs o base de datos.

## Gestión de usuarios y recuperación

- [x] Validar la migración y el flujo completo de recuperación en una sesión autenticada y no autenticada.
- [x] Añadir un mecanismo institucional seguro para entregar el enlace de recuperación al administrador.
- [x] Verificar que la respuesta de solicitud no revele si el correo existe.
- [x] Verificar que un token solo pueda usarse una vez y expire correctamente.
- [x] Verificar que las sesiones previas se invaliden después del cambio de contraseña.

## Curso de Inversiones

- [x] Investigar y curar recursos educativos verificables para el curso de Inversiones.
- [x] Crear una materia de Inversiones de 40 horas con competencias, módulos y lecciones detalladas.
- [x] Incorporar actividades evaluables y recursos de video, PDF y lectura al curso de Inversiones.
- [x] Verificar la publicación, estructura y visualización del nuevo curso.
- [x] Confirmar mediante una sesión autenticada la consulta y presentación del curso INV-401.

## Stripe

- [ ] Definir productos académicos y planes de suscripción cobrables mediante Stripe.
- [ ] Preparar la integración segura de Stripe y sus variables de entorno.
- [ ] Implementar catálogo, inicio de pago y estados de suscripción en el portal.
- [ ] Probar en modo seguro los pagos, suscripciones y permisos comerciales.

## Evaluaciones, progreso y PDF

- [x] Modelar evaluaciones de cierre de módulo, preguntas, intentos y resultados por estudiante.
- [x] Generar cuestionarios y actividades evaluables mediante IA a partir del contenido del módulo.
- [x] Persistir el avance de módulos y lecciones por estudiante con controles de acceso.
- [x] Incorporar resolución de cuestionarios y marcación de lecciones completadas para estudiantes.
- [x] Mostrar una barra y estados visuales de progreso dentro de cada materia.
- [x] Generar y descargar un PDF institucional con el plan completo de cada materia.
- [x] Verificar generación, respuestas, permisos, progreso y descarga del documento.

## Clases en vivo

- [x] Persistir clases en vivo con materia, horario, enlace de Google Meet y estado de publicación.
- [x] Permitir a administración crear, editar y publicar clases en vivo.
- [x] Permitir a estudiantes inscritos consultar y unirse a clases publicadas.
- [x] Verificar permisos, enlaces y visualización de clases en vivo.

## Usuarios e iconografía

- [x] Implementar eliminación segura de usuarios desde administración y proteger la cuenta administradora actual.
- [x] Eliminar datos académicos dependientes al borrar una cuenta de usuario cuando corresponda.
- [x] Unificar el mensaje de inicio de sesión fallido como “Datos incorrectos” sin revelar si existe el correo.
- [x] Añadir controles visuales de eliminación y validar el flujo de acceso inválido.
- [x] Refinar iconos, contenedores y estados visuales para una apariencia institucional más natural.

## Asistente curricular IA

- [x] Diseñar un asistente de IA integrado en la vista de cada materia para ampliar su contenido curricular.
- [x] Permitir a administración generar y aplicar una propuesta curricular completa desde la materia.
- [x] Incluir competencias, módulos, lecciones, recursos, evaluaciones e ilustraciones en la propuesta generada.
- [x] Verificar el asistente curricular integrado y la iconografía en escritorio y móvil.
- [x] Generar evaluaciones de cierre automáticamente para cada módulo de una materia creada con IA.
- [x] Verificar que la creación IA persista evaluaciones de módulo junto al programa académico.

## Notificaciones personalizadas

- [x] Diseñar notificaciones personalizadas por rol y evento académico.
- [x] Persistir y mostrar notificaciones dentro del portal.
- [x] Verificar preferencias y lectura de notificaciones.
- [x] Disparar notificaciones automáticas al publicar actividades, evaluaciones y clases en vivo, y al enviar mensajes.
- [x] Hacer navegables los avisos y marcar como leídos los avisos abiertos o seleccionados.

## Curso de Inversiones: recursos

- [x] Documentar fuentes educativas verificadas que se integrarán como recursos del curso de Inversiones.
- [x] Validar la consulta autenticada de módulos, recursos y actividades de INV-401.

## Validación de recuperación

- [x] Validar solicitud de recuperación con correo existente y no existente sin enumeración.
- [x] Validar enlace/token único, expiración y cambio de contraseña.
- [x] Validar invalidación de sesiones anteriores y acceso con la nueva contraseña.
- [x] Publicar la implementación final de recuperación.

No incluir contraseñas, hashes ni tokens de recuperación en mensajes al usuario.

## Plataforma multiinstitución

- [x] Modelar instituciones, membresías y administradores institucionales.
- [x] Añadir selección de institución y acceso diferenciado para cada institución.
- [x] Aplicar aislamiento por institución a usuarios, estudiantes, docentes y datos académicos.
- [x] Aislar clases, actividades, entregas, calificaciones, mensajes, notificaciones y recursos.
- [x] Crear administración de instituciones para el propietario de WijiEdu.
- [x] Verificar con pruebas que una institución no pueda consultar ni modificar datos de otra.
- [x] Validar la experiencia responsive de acceso y cambio de institución.

## Endurecimiento multiinstitución

- [x] Validar institutionId en todas las mutaciones y consultas por ID de usuarios, estudiantes, materias, actividades, clases, calificaciones, entregas y mensajes.
- [x] Aislar notificaciones por institución en persistencia, listado y lectura, incluyendo usuarios con múltiples membresías.
- [x] Separar la autorización del propietario de la plataforma de la administración institucional para la gestión global.

## Administradores institucionales

- [x] Crear o asignar un administrador para cada institución desde la gestión global.
- [x] Restringir al administrador institucional al tenant asignado y sus datos académicos.
- [x] Mostrar en la sección Instituciones el administrador asociado y su estado.
- [x] Probar el flujo de alta, asignación, acceso y aislamiento del administrador institucional.

## Validación del administrador institucional

- [x] Verificar con pruebas que un administrador institucional creado o asignado no pueda consultar ni modificar datos de otra institución en todas las rutas académicas y mutaciones por ID.
- [x] Validar en una sesión real el acceso de un administrador institucional creado o asignado, incluyendo visibilidad limitada y ausencia de cruces de contenido.

## Cobertura final de aislamiento

- [x] Añadir pruebas explícitas de lectura cruzada entre instituciones para usuarios, estudiantes, materias, actividades, clases, calificaciones, entregas, mensajería y currículo.
- [ ] Validar en una sesión real con al menos dos membresías institucionales el cambio de institución en escritorio y móvil, comprobando que cambian los datos visibles sin cruces.
- [x] Completar una auditoría y pruebas exhaustivas de todas las rutas y mutaciones por ID indicadas, documentando cada helper y procedimiento cubierto.

## Corrección de cuenta propietaria

- [x] Asegurar que wilinton@gmail.com tenga rol admin y coincida con la identidad propietaria configurada.
- [x] Validar que la cuenta corregida pueda iniciar sesión y ver la sección Instituciones.

## Clases Meet para docentes

- [x] Permitir a docentes crear clases Meet solo para sus propias materias e institución.
- [x] Permitir a docentes editar, publicar y eliminar únicamente sus clases autorizadas.
- [x] Actualizar la interfaz para mostrar acciones Meet a docentes con materia asignada.
- [x] Probar permisos positivos, acceso cruzado y responsive del flujo docente.

## Control y eliminación de instituciones

- [x] Ocultar la sección Instituciones a administradores de instituciones creadas.
- [x] Permitir al propietario eliminar instituciones creadas, junto con sus administradores y datos asociados.
- [x] Proteger la institución principal y evitar eliminaciones cruzadas o no autorizadas.
- [x] Probar permisos, limpieza de datos y actualización del contexto institucional tras eliminar.

## Informes y perfiles académicos

- [x] Diseñar informe descargable de notas con estudiante, curso, docente, período y calificaciones.
- [x] Añadir información y foto de perfil para estudiantes y docentes con almacenamiento seguro.
- [x] Mostrar a cada usuario únicamente la información de perfiles permitida por su rol e institución.
- [x] Permitir que estudiantes consulten su información y notas, y que docentes consulten la información de sus estudiantes.
- [x] Probar privacidad, exportación, fotos y visualización responsive.

## Brechas detectadas en revisión final

- [x] Corregir dashboard y estadísticas para filtrar estrictamente por institutionId.
- [x] Añadir filtros explícitos por institutionId a mensajería, currículo, recursos y progreso.
- [x] Añadir pruebas de lectura cruzada para cada dominio académico, incluyendo mensajes y currículo.
- [x] Documentar una matriz de auditoría de aislamiento por helper y procedimiento.
- [x] Validar responsive móvil y carga de foto con pruebas verificables.
- [ ] Validar una sesión real de administrador institucional con visibilidad limitada.
- [ ] Validar el cambio real entre dos membresías institucionales en escritorio y móvil.
- [ ] Esperar configuración de claves Stripe del usuario para implementar pagos, suscripciones y webhooks.

## Corrección de permisos del propietario global

- [x] Reconocer de forma consistente a wilinton@gmail.com como propietario y administrador global.
- [x] Permitirle crear usuarios, administrar roles y crear instituciones desde el portal.
- [x] Añadir pruebas de autorización para creación de usuarios e instituciones con la cuenta propietaria.
- [x] Validar la sesión autenticada de wilinton@gmail.com y publicar la corrección.

## Recuperación segura por correo

- [x] Exigir que las cuentas nuevas tengan un correo válido y normalizado.
- [x] Impedir que el restablecimiento cambie la contraseña solo con un nombre de usuario.
- [x] Enviar el enlace de recuperación a la dirección registrada mediante un proveedor de correo configurado.
- [x] Mantener tokens hash, expiración, uso único e invalidación de sesiones.
- [x] Actualizar la interfaz para informar que debe revisar el correo y no revelar si una cuenta existe.
- [x] Añadir pruebas de correo requerido, token no reutilizable y rechazo de cambios no verificados.

## Incidencia 403 de correo

- [x] Identificar si el 403 proviene de permisos de la API, dominio remitente o configuración de Resend.
- [x] Evitar persistir tokens de recuperación cuando el envío del correo falla.
- [x] Exponer un mensaje operativo claro y mantener la respuesta segura ante fallos del proveedor.
- [x] Añadir pruebas del manejo de errores 403 y publicar la corrección.

## Recuperación supervisada por institución

- [x] Sustituir el restablecimiento automático por solicitudes de recuperación institucionales.
- [x] Notificar al administrador de la institución correcta y mantener aislamiento por tenant.
- [x] Añadir panel administrativo para revisar solicitudes y generar contraseña temporal.
- [x] Marcar la cuenta para exigir cambio de contraseña en el primer ingreso.
- [x] Bloquear el portal del estudiante/docente hasta completar el cambio obligatorio.
- [x] Eliminar el flujo automático por correo, sus tokens y sus controles asociados.
- [x] Añadir migración, pruebas de autorización, aislamiento y primer ingreso.

## Navegación de solicitudes e informe Excel

- [x] Hacer que la notificación de recuperación abra Usuarios y roles y enfoque la solicitud pendiente correspondiente.
- [x] Añadir soporte de selección por requestId en la bandeja de solicitudes.
- [x] Reemplazar la exportación de notas PDF por un libro Excel profesional y descargable.
- [x] Incluir portada, resumen, detalle de calificaciones, promedios y datos institucionales sin inventar información.
- [x] Añadir pruebas del exportador Excel y de la navegación desde notificaciones.
- [x] Validar escritorio/móvil y publicar la versión mejorada.

## Branding institucional y Excel visual

- [x] Añadir logo y configuración de identidad visual al crear o editar una institución.
- [x] Detectar una paleta dominante segura desde el logo y aplicarla al portal de la institución.
- [x] Mostrar logo, nombre y colores institucionales en navegación y dashboard.
- [x] Rediseñar el inicio de sesión con una presentación más atractiva y adaptable.
- [x] Mejorar colores, encabezados, estilos y jerarquía visual del Excel profesional.
- [x] Añadir pruebas de branding, contraste, exportación y validación responsive.
- [x] Guardar y publicar la versión mejorada.

## Permisos docentes y branding institucional reforzado

- [x] Permitir actividades, entregas y calificaciones solo al docente asignado de la materia y a estudiantes correspondientes.
- [x] Impedir al administrador institucional crear actividades o acceder a notas y entregas calificadas.
- [x] Mantener para el administrador la gestión de usuarios, materias, recursos y configuración institucional.
- [x] Añadir pruebas positivas y negativas de autorización por rol y materia asignada.
- [x] Hacer más visible el logo, nombre y colores de la institución activa en navegación, encabezado y superficies principales.
- [x] Validar responsive, aislamiento institucional y publicar la corrección.

## Corrección de estabilidad detectada en validación

- [x] Hacer idempotente la creación de preferencias de notificación ante solicitudes concurrentes.
- [x] Repetir la suite completa y confirmar que permisos y branding siguen pasando.
