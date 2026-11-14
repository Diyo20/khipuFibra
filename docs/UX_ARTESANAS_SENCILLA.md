# Paneles sencillos para artesanas

13 de noviembre de 2026, hora de Perú. Rama `develop/khipufibra-fase-1`. Cambios locales; sin commit, push, publicación ni modificaciones remotas.

## Auditoría y respaldo

Se revisaron el editor, galería, panel, promoción, perfil, menús administrativos, voz y comparación de IA, junto con sus llamadas existentes. Problemas: cuatro etapas para un solo formulario, fotografía principal demasiado grande, acciones siempre expuestas, varias formas de generar/aprobar texto y ayuda de voz repetida.

El árbol estaba limpio en `b811603072f92933f5d6f747cea1d8fb80ea7f02`. Se creó y verificó `.backups/antes-ux-simple-20261113.bundle`, con historial completo. SHA256: `6BC3FCB30F0D48C4DE631F31E2A66FB41CF0CF48DCD629A5C064A4FE678BF1C2`.

La referencia se tradujo a HTML/CSS: borgoña, terracota, marfil, logotipo original, zona de trabajo central y botones táctiles. No se usa la imagen del brief como fondo.

## Implementación por fases

Primero se sustituyó el asistente del producto por una pantalla, comprobando guardado, galería, voz, IA y los tamaños móvil/escritorio. Después se extendió el criterio al resto de paneles.

- **Agregar/editar:** nombre, tres espacios de fotografías, categoría, precio opcional, materiales y descripción. Materiales sigue visible porque el backend lo exige para publicar. Medidas, cuidados y disponibilidad están en «Más detalles». La validación abre una sección si fuera necesario; el navegador valida antes de deshabilitar el formulario.
- **Publicar/guardar:** dos acciones al final. Publicar confirma la revisión sin obligar a aprobar por separado. La revisión y aprobación individuales siguen en «Vista previa y revisión», junto con la generación explícita desde datos. Se conservan borradores, ID, edición publicada, guardado y ocultación explícita, errores y bloqueos administrativos. Enter en un campo no envía ni oculta accidentalmente un producto.
- **Fotos:** tocar una abre Reemplazar, Hacer principal y Quitar. «Mejorar fotografía» contiene ajustes gratuitos, restauración, Pollinations, comparación y regeneración. No se alteró el backend ni el número de fotos enviadas a Pollinations: solo la principal actual.
- **Texto IA:** Hablar y Mejorar con IA son las acciones visibles. Si está vacío, genera a partir de datos existentes. La propuesta se acepta, rehace o descarta dentro de la página. Conserva el original y las cuotas reales. La generación avanzada desde los datos también sigue accesible.
- **Voz:** micrófonos compactos y una ayuda plegada; solo SpeechRecognition/webkitSpeechRecognition, es-PE. Conserva texto y errores, no transcribe en backend. Cerrar una sección detiene el micrófono y descarta resultados tardíos. Si no se admite voz, queda el teclado.
- **Inicio:** cuatro acciones, sin estadísticas. Se conserva el requisito de crear perfil antes de agregar productos. El menú mantiene Mi plan, catálogo y cierre de sesión.
- **Mis productos:** foto, nombre, precio, estado y Editar. Ocultar/publicar, duplicar, disponibilidad, ver publicación y eliminar pasan a «⋯». Eliminar conserva su confirmación. La ruta `panel.html#mis-productos` muestra la lista en la misma página.
- **Promocionar:** producto, red, mensaje y compartir. No requiere una aprobación intermedia; pulsar Compartir es la acción explícita. Estilos, generación avanzada, aprobación manual, copia, descarga y compartir mediante el dispositivo están en Más opciones. Facebook/Instagram/TikTok siguen siendo difusión asistida, sin simular publicación automática. Cambiar red o estilo conserva el texto escrito.
- **Perfil:** Mis datos, Mi historia, Mis redes, Mi plan y Seguridad/contraseña. Los campos y sus eventos se mueven a secciones; no se recrean ni se pierden datos al abrir/cerrar. Se conserva el acceso al perfil público y la continuación al producto tras crear el perfil requerido.
- **Administración:** mantiene Accesos, productos/valoraciones, planes/pagos, historial y seguridad; cuotas plegadas en Resumen. Se mejoraron tamaños táctiles y tipografía. No se redujeron permisos ni acciones.

## Preservación y comprobación

Se reutilizan las llamadas y validaciones existentes. En `cloud.js` solo se actualizó un mensaje de error sobre cuotas; no se modificaron Supabase, autenticación, roles, RLS, migraciones ni Edge Functions. No se realizaron pagos, generaciones reales de IA, grabaciones ni publicaciones durante las pruebas.

166/166 pruebas aprobadas; check y build correctos. Incluyen PostgreSQL local de permisos, estados de cuenta, planes, cuotas y galería; sustitución de foto adicional sin alterar las otras; errores/duplicados de guardado; comparación y aceptación de texto e imágenes; regeneración desde los mismos datos; dictado y detención al cerrar una sección; perfil completo y difusión sin autoenvío. Las pruebas de paneles ahora cargan los scripts declarados en los HTML reales.

Capturas revisadas: editor 390/1440, inicio 1440, promoción 390, perfil 390, lista 390 y administración 1440. Las fotos del editor se limitaron a una fila compacta de hasta 420 px de ancho en escritorio. Se usaron fixtures sintéticas sin conexión al servidor. La edición real con cuentas y teclado físico/móvil debe comprobarse en el piloto antes de publicar.

**GATE: OPEN.** Checker inicial a 1440/1024/768/390 detectó foco invisible en selectores de archivos. Se sustituyeron por botones visibles con los inputs nativos ocultos y se repitió el checker a 1440/390: 8 FAIL y 28 WARN. Continúan categorías de navegación, variedad de botones y número de acciones de portada aplicadas a un formulario. Sin errores de ejecución, desbordamiento, colisiones, contraste, etiquetas ni foco en esa revisión final. No se ocultaron hallazgos ni se certifica toda la web.

## Prueba manual sugerida

Abrir `npm.cmd run preview` y entrar con una cuenta artesana. Crear un borrador, añadir/reemplazar tres fotos, elegir principal, aceptar o descartar una propuesta y publicar. Editar y guardar el producto publicado; confirmar que sigue publicado. Revisar Mis productos y su menú, compartir por cada red sin confundir apertura con publicación, y guardar el perfil desde sus secciones. El despliegue a Vercel requiere autorización aparte.

## Ajustes de micrófono, experiencia y mensajes de IA

- Micrófonos de tamaño fijo, sin desplazamiento al pasar el puntero o pulsar. El estado de dictado se muestra fuera del botón y no modifica su anchura. Se conservan permisos, texto anterior, detención y errores del navegador.
- Años de experiencia se eligen en un selector opcional de 0 a 100. Se guardan y se presentan como «12 años» o «1 año», usando la misma columna existente. Los valores anteriores con número se recuperan; cualquier texto anterior no convertible se conserva hasta elegir un número.
- Mensajes de texto, fotografía, cuotas y planes actualizados para las integraciones de Gemini y Pollinations existentes. Se conservan los borradores de productos y los avisos reales de error, cuotas o solicitudes de Pro deshabilitadas.
- `mi-perfil.html` y `difusion.html` ahora cargan el módulo del panel simplificado. No cambian las rutas, formularios ni integraciones.
- Comprobación en Edge a 390 y 1440 px con reconocimiento simulado: la posición y el tamaño del micrófono y del botón de IA contiguo se mantienen al esperar permiso, escuchar, mostrar texto provisional, detener y dar error. Selector de experiencia revisado a 390 px. Sin activar micrófono, autenticación ni llamadas de pago. Scripts reproducibles: `scripts/panels-fixtures.cjs` y `scripts/voice-layout-fixture.cjs`.
