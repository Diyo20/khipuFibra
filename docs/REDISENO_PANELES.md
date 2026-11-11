GATE: OPEN — este trabajo no cierra el gate visual general de la tienda registrado en REDISENO_TIENDA.md.

# Paneles privados: rediseño local

11 de noviembre de 2026. Implementación visual aprobada por el usuario después de la auditoría. Sin commit, push, despliegues ni modificaciones remotas.

## Cambios

- Artesanas: navegación lateral con Mi espacio, Mi perfil, Agregar producto, Mis productos y Promocionar; acceso al catálogo y cierre de sesión. Menú móvil desplegable nativo, utilizable con teclado. La sección activa conserva un indicador textual y visual.
- Inicio: bienvenida cálida, perfil como primer acceso de trabajo, tarjetas de herramientas y conteos de productos guardados/publicados/borradores obtenidos de la colección propia que ya se cargaba. El estado vacío distingue si falta el perfil o el primer producto.
- Perfil y promoción: superficies arena, campos legibles y agrupaciones más claras. Se retiran las instrucciones de desarrollo sobre el archivo del logotipo. Los botones sociales exponen su selección con aria-pressed.
- Producto: cuatro etapas de presentación (Información, Fotografías, Descripción y Revisión). Los controles permanecen montados; avanzar, volver o seleccionar una etapa no guarda, no sube archivos y no genera contenido. El resumen escapa los valores y utiliza los mismos datos, fotografías y aprobaciones del editor.
- Se conservan los límites de fotografías y formatos, campos, validaciones, estructura del guardado, aprobación de fotos/texto, borrador y publicación. El teclado no provoca un guardado implícito al pulsar Enter en los campos de las primeras etapas; navega a la siguiente etapa. Enter dentro de la descripción sigue escribiendo una nueva línea.
- Administración: lateral marrón profundo y secciones Resumen, Accesos, Productos y valoraciones, Historial y Seguridad. Resumen reutiliza los conteos existentes del servidor. Cuentas e invitaciones mantienen sus acciones y confirmaciones, con estados más visibles. La gestión comercial conserva su aviso de activación pendiente cuando el backend no está disponible.
- Identidad: marfil, arena y terracota; oliva reservado a superficies y estados, con texto explícito. Fraunces en los títulos del espacio de artesanas y DM Sans en controles y administración. Foco visible, controles táctiles y movimiento reducido.

## Archivos

| Archivo | Responsabilidad |
| --- | --- |
| `assets/artisan-workspace.js` | Bienvenida, productos, presentación y navegación del asistente. |
| `assets/artisan-workspace.css` | Estilos del espacio privado y sus estados responsive. |
| `assets/app.js` | Navegación privada, contenido visual del perfil y accesibilidad de la selección social. |
| `panel.html`, `nuevo.html`, `mi-perfil.html`, `difusion.html` | Carga y ámbito de los estilos privados. |
| `admin.html`, `assets/admin.js` | Estructura visual y selección de secciones, preservando las operaciones existentes. |
| `assets/admin-panel.css` | Nuevo estilo administrativo aislado de las pantallas de acceso. |
| `assets/admin-commerce.js` | Atributos de estado para la presentación; operaciones sin cambios. |
| `tests/workspace.test.cjs`, `tests/admin-ui.test.cjs` | Conservación del formulario, ausencia de efectos al navegar, acciones y conteos existentes. |
| `scripts/panels-fixtures.cjs` | Fixtures locales de revisión; no se incluyen en el build. |

No se modificaron cloud.js, configuración de Supabase, SQL, migraciones, funciones del servidor, autenticación, roles ni consultas. El renderizado de siete recorridos públicos se comparó con el app.js anterior y resultó idéntico: inicio, catálogo, producto de ejemplo, producto inexistente, artesanas, perfil inexistente y favoritos.

## Verificación

- Respaldo local de Git creado y verificado: `.backups/antes-paneles-20261111.bundle`, sobre `671a3cc`.
- Sintaxis JavaScript, referencias HTML locales y build estático comprobados.
- Pruebas nuevas: recorrido del asistente sin perder controles/valores ni invocar IA o guardados; resumen con precio cero y contenido escapado; bloqueo de navegación durante un guardado; error conservando el texto; cierre de sesión desde las cuatro páginas; resumen administrativo sin consultas comerciales adicionales.
- Suite completa: **109 de 110 pruebas pasan**. La única falla está en `tests/storefront.test.cjs:36`: espera un enlace WhatsApp para el producto de ejemplo, cuyos datos actuales no tienen un número válido. Se reprodujo ejecutando exactamente el app.js de HEAD anterior a estos cambios, con el mismo error. Se conserva el comportamiento público existente.
- Revisión en Edge con las herramientas de taste-skill y datos sintéticos locales. Las fotografías de los fixtures son referencias editoriales ya licenciadas en el proyecto; no representan un producto o una artesana real. No se crearon registros ni se consumieron generaciones en servicios remotos.
- Los informes de composición de taste-skill incluyen criterios pensados para páginas comerciales (hero, fotografías en tarjetas, máximo de acciones por pantalla). No equivalen a una certificación de dashboard. Se conserva el gate general abierto y se distinguen estos hallazgos de las comprobaciones de accesibilidad y desbordamiento.
- Panel, Accesos y Revisión de producto comprobados a **1440, 1024, 768 y 390 px**, con recorrido adicional a 320 px. Los tres pasan contraste de texto/controles, nombres accesibles, etiquetas, jerarquía de encabezados, foco, tamaño táctil, colisiones y desbordamiento. Sin errores de carga de scripts en los informes finales. A 320 px, el editor mantiene un aviso de composición porque el indicador de etapa cruza el primer pliegue; el contenido sigue accesible mediante desplazamiento.
- Hallazgos completos y comprobaciones no ejecutadas: [diseno/paneles-auditoria.json](diseno/paneles-auditoria.json). El panel registra 33 FAIL y 46 WARN; administración, 22 FAIL y 23 WARN; revisión de producto, 23 FAIL y 34 WARN. Son informes del analizador comercial, no resultados de las pruebas funcionales. Se conserva su detalle sin ocultar hallazgos ni reiniciar el gate anterior.

La revisión no sustituye una prueba con cuentas reales en un teléfono físico, ni verifica entregas de correo, disponibilidad remota de IA o activación de moderación. Esos servicios no se modificaron.

Capturas con datos sintéticos: [artesanas en escritorio](diseno/panel-artesana-escritorio.png), [artesanas en móvil](diseno/panel-artesana-movil.png), [administración en escritorio](diseno/panel-admin-escritorio.png) y [revisión del producto en móvil](diseno/asistente-producto-movil.png). También se revisaron capturas del panel a 1024, 820 y 768 px, y de las etapas Información, Fotografías, Descripción, Perfil y Promocionar a 390 px.

Se inspeccionó además una captura del resumen del producto a 320 px con preferencia de movimiento reducido: contenido visible y controles dentro del ancho disponible. Esta inspección es adicional a los informes automáticos, cuyo modo rápido no evalúa toda la interacción de movimiento reducido.

## Cómo revisar

1. Abrir `panel.html` desde el servidor local con la cuenta de artesana. Verificar el menú, Mi perfil primero entre los accesos y los productos propios.
2. Abrir Agregar producto, completar datos y recorrer las cuatro etapas. Volver atrás para comprobar que los valores permanecen. Revisar fotografías y descripción antes de publicar.
3. Probar Mi perfil y Promocionar; la marca ✦ IA sigue identificando las acciones de generación y el encuadre continúa indicado como local.
4. Entrar a `admin.html` con la cuenta administrativa. Revisar Resumen, Accesos, invitaciones, Historial y Seguridad. Las acciones sensibles conservan sus confirmaciones.
5. Reducir el ancho a celular y abrir los menús con teclado o toque. Verificar los estados pendientes/aprobados y los mensajes de error sin realizar operaciones reales durante una revisión exclusivamente visual.

Los fixtures se regeneran con `node scripts/panels-fixtures.cjs`. Para revisarlos con taste-skill usar `--root .`, por ejemplo `shoot.mjs --url .taste-skill/panels-panel.html --root . --w 390 --out .taste-skill/panels-shots/panel-390.png --no-tiles`.

La migración remota de moderación y los pendientes funcionales del proyecto inicial permanecen fuera de este incremento visual.
