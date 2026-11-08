# Productos, perfiles y carga de páginas

Incremento del 8 de noviembre de 2026 sobre `develop/khipufibra-fase-1`.

## Comportamiento implementado

- Inicio conserva el título del usuario: «Hecho a mano. Compartido con el mundo.». La segunda frase usa el terracota `#8C402C`.
- La tienda pública muestra su estructura antes de recibir los datos. Catálogo y comprobación de sesión se inician independientemente; navegar públicamente no consulta el perfil privado. Las valoraciones solo se consultan en Producto y Perfil público.
- El panel consulta los productos del propietario, incluidos borradores y ocultos. No incluye ejemplos ni atribuye productos por coincidencia del nombre de la artesana.
- Cuatro accesos principales: Agregar producto, Mis productos, Promocionar y Mi perfil.
- Agregar/Editar guarda un borrador real en `productos` con `publicado=false`; vuelve a abrirse desde Mis productos en otra sesión o dispositivo.
- Guardar nuevamente actualiza el mismo ID. Publicar requiere revisar y aprobar fotografía y descripción. Desde el panel, un borrador abre el editor para su revisión antes de publicarse.
- Editar, duplicar como borrador, ocultar, volver a publicar mediante revisión, marcar agotado/disponible y eliminar con confirmación están conectados a Supabase.
- Precio vacío se conserva como `NULL`; cero se conserva como cero.
- La fotografía se sube a Storage. Una edición sin reemplazarla conserva su URL; no vuelve a subirla en cada guardado. No se aceptan fotografías de ejemplo como sustitutos de una carga propia.
- Descripción e historia de elaboración comparten un campo editable, correspondiente a `productos.story`. La IA es opcional: se puede escribir y aprobar manualmente.
- Mi perfil envía los datos y la foto a Supabase antes de anunciar éxito. Un fallo conserva el formulario y permite reintentar. Se asociaron las etiquetas de sus campos.
- Un producto real sin WhatsApp registrado remite al perfil de su creadora; no reutiliza el teléfono de demostración. Un perfil inexistente muestra un estado explícito.

## Qué queda guardado

| Información | Destino |
|---|---|
| Perfil, historia, contacto y enlaces | `artesanas_perfiles` |
| Producto, descripción, material, precio, medidas, cuidados, disponibilidad y publicación | `productos` |
| Fotografía principal y foto de perfil | Storage, con URL en su registro |
| Valoraciones enviadas | `valoraciones`, pendientes de moderación |
| Favoritos de visitantes | Almacenamiento local, como permite el requerimiento original |
| Cambios del editor antes de pulsar Guardar/Publicar | Recuperación temporal por cuenta en esta pestaña; la interfaz indica que están pendientes |

Guardar borrador no equivale a autoguardar cada pulsación. Para recuperarlo en otro dispositivo hay que pulsar **Guardar borrador** o **Publicar** y esperar la confirmación. Primero debe guardarse el perfil de la artesana.

## Seguridad y compatibilidad

Se conservan HTML/CSS/JavaScript, Supabase Auth, sus roles y las políticas RLS existentes. No se alteraron configuraciones sensibles ni tablas de la base remota. Las consultas privadas incluyen el propietario y RLS vuelve a comprobarlo en PostgreSQL. El cambio de cuenta y la suspensión siguen retirando el acceso privado.

No se eliminan automáticamente archivos antiguos de Storage al reemplazar o eliminar un producto: una copia puede seguir utilizándolos. La limpieza de medios sin referencias queda pendiente.

Se preservaron los commits manuales del usuario, incluido el título. Respaldo verificado antes del cambio: `.backups/antes-productos-persistentes-20261109.bundle`, cuyo HEAD inicial es `2c6cfde`.

## Validación

- `npm run check`, `npm test`: **76 pruebas**, todas aprobadas, y `npm run build`.
- Pruebas de integración del frontend con red simulada: guardado repetido sin duplicación, reapertura, aprobación, errores de red, perfil completo y sesión pública que permanece sin resolver mientras el catálogo ya está disponible.
- Pruebas locales de PostgreSQL/RLS con las migraciones reales: aislamiento entre propietarias, publicación, suspensión y propuesta de galería.
- `supabase/tests/phase1_remote_smoke.sql` ejecutado sobre el esquema remoto ya aplicado: persistencia de borrador, edición publicada, eliminación de copia, privacidad y permisos aprobados. Sus cuentas, productos y metadatos de archivos temporales se revirtieron al terminar. Después permanecían 2 cuentas, 0 perfiles y 0 productos; no se insertaron ejemplos permanentes.
- Revisión visual de Inicio y de los cuerpos de Panel/Editor a 1440, 1024, 768 y 390 px. Se corrigió el desbordamiento del editor en móvil. Los paneles se revisaron con fixtures locales sintéticos, sin saltarse la autenticación de las páginas privadas. `node scripts/workspace-fixtures.cjs` los regenera fuera del build.
- El comprobador de los fixtures del editor a 390/320 px confirma límites de pantalla, contraste y etiquetas. Dejó 7 FAIL de reglas de página comercial que interpreta el formulario como un hero (ausencia de fotografía, hecho comercial, número de acciones y posición de esas acciones). No se presentan como un chequeo visual completo aprobado. Su advertencia de tamaño del selector de archivo se corrigió con un control de al menos 44 px. La captura final de 320 px no tiene las franjas de recorte que aparecieron antes de corregir el desbordamiento.
- El gate general del rediseño anterior permanece **OPEN con 15 hallazgos**; este incremento no declara cerrado ese trabajo ni una certificación de accesibilidad. Los detalles están en `REDISENO_TIENDA.md`.

Falta recorrer con una cuenta artesana real en Preview: foto desde teléfono → guardar perfil → crear borrador → cerrar sesión → reabrir → publicar → consultar desde incógnito. Las pruebas de Storage remoto verifican permisos de metadatos; no sustituyen esa carga de archivo desde un móvil real.

## Cómo verificar este incremento

1. Abrir la Preview de la rama y acceder con una cuenta artesana autorizada.
2. Guardar Mi perfil con nombre y WhatsApp propio.
3. Agregar un producto con fotografía propia y descripción; pulsar Guardar borrador.
4. Volver a Mis productos y comprobar que aparece como borrador. Recargar o volver a entrar y editarlo.
5. Aprobar fotografía y descripción, publicar y abrir su ficha pública desde incógnito.
6. Cambiar el precio, ocultar, duplicar y marcar agotado. Comprobar que la copia queda privada y que ocultar retira el original del catálogo.

El despliegue de la rama es Preview. No se fusiona `main` ni se publica en producción.

## Galería: propuesta pendiente de autorización

La interfaz actual declara y guarda **una fotografía principal** por producto. No ofrece tres cargas si solo se va a conservar una.

Se creó mediante la CLI oficial la migración local `supabase/migrations/20261108222826_product_gallery.sql`. **No está aplicada a Supabase remoto.** Añade `gallery_urls`, conserva `image_url` y todos los registros, limita a dos fotografías adicionales y amplía exclusivamente la lista pública de campos del catálogo. No modifica roles ni amplía RLS. Su prueba local verifica los límites y el bloqueo de cambios entre propietarias.

Aplicarla requiere aprobación expresa del usuario, según la sección 3 del requerimiento original: «Solicita autorización antes de ejecutar migraciones sobre la base de datos remota». Después se conectarán los controles de galería; este incremento no los anuncia como activos. No ejecutar `db push` sin revisar esta migración pendiente.

## Continuación del alcance original

| Área del requerimiento | Estado después de este incremento |
|---|---|
| Acceso, invitaciones y contraseñas | Base implementada; validar correos/usuarios reales y Google cuando se configure |
| Catálogo público, búsqueda, filtros, precios y favoritos | Implementado; rendimiento público desacoplado de Auth |
| Productos y perfiles | Persistencia y gestión conectadas; falta galería múltiple y validación con artesanas reales |
| Identidad visual | Inicio/Catálogo/Producto/Acceso y sistema compartido; faltan acabados de Artesanas, perfil público, Favoritos, Difusión y Administración |
| Panel de artesana | Cuatro accesos y gestión de productos implementados; plan pendiente |
| Administración | Accesos e invitaciones existentes; faltan filtros avanzados, moderación comercial, motivos, categorías, planes, pagos y consumo |
| Micrófono | Pendiente en descripción, historia y difusión; no se activa automáticamente |
| IA | Llamadas seguras existentes; falta activar/verificar proveedor, cuotas desde backend, consumos y mejora fotográfica real |
| Meta | OAuth, tokens seguros, publicación real y registro de resultados pendientes |
| WhatsApp/TikTok | Compartir asistido existente; videos y publicación directa pendiente según la fase prevista |
| Básico/Pro y Yape | Tablas, solicitudes, comprobantes, administración, vencimientos y límites pendientes |
| Métricas | Medición real de visitas/contacto/publicaciones/IA pendiente; no se muestran ventas inventadas |
| Lanzamiento | Pendientes validación en Android/iPhone, pruebas con artesanas, revisión visual abierta y aprobación de producción |

Este incremento completa el núcleo de gestión de la fase de productos y perfiles; no da por terminadas las fases de IA, redes o pagos.
