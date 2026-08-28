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
