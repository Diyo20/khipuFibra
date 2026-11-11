GATE: OPEN — los hallazgos del analizador se documentan por separado de las pruebas funcionales; no se reinicia ni se declara aprobado el gate anterior de la tienda.

# Identidad visual integral de KhipuFibra

11 de noviembre de 2026. Base: `ac25092`. Propuesta visual aprobada por el usuario. Trabajo exclusivamente local, sin commit, push, despliegue ni cambios de Supabase.

## Identidad y referencia

La imagen modelo orienta la composición, no se utiliza como imagen de fondo ni se incluye como una captura dentro de la web. Navegación, textos, tarjetas, botones, formularios, favoritos y ventanas HTML siguen siendo elementos nativos interactivos. El único recurso nuevo de marca es una pequeña franja geométrica SVG decorativa, independiente de la fotografía.

Paleta compartida mediante variables: terracota `#913F2A`, bosque `#244C3B`, ocre `#C18B45`, marfil `#E6D6BE` y carbón `#292521`; sus variantes se usan para contraste, bordes, campos y estados. Fraunces y DM Sans se conservan. El título manual «Hecho a mano. Compartido con el mundo.» permanece; la segunda frase utiliza un tono cálido más claro sobre bosque para conservar contraste.

Se conserva el logotipo original. **La fotografía actual de `assets/img` es propia**, según confirmación expresa del usuario durante este trabajo, y se usa en portada. No se modificaron sus píxeles. Se corrigieron el texto alternativo, la atribución antigua de Wikimedia del pie, la página de imágenes y el registro `assets/img/credits.json`. Los archivos de productos y perfiles no se sustituyen ni se les asignan fotografías ajenas. Los ejemplos siguen identificados como ejemplos.

## Cobertura

| Página o estado | Presentación |
| --- | --- |
| `index.html` | Encabezado terracota, portada bosque con fotografía independiente, separador curvo, tarjetas con profundidad y secciones claras/oscuras. |
| `catalogo.html` | Búsqueda y orden dentro de una superficie legible, categorías, resultados, tarjetas y estados de carga/sin resultados. |
| `producto.html` | Fotografía y galería, precio, disponibilidad, contacto, favoritos, datos, historia, creadora, preguntas, valoraciones, relacionados y enlace inexistente. |
| `artesanas.html` | Presentación, perfiles, fotografías disponibles, ubicación, historia, experiencia y enlaces existentes. |
| `artesana.html` | Cubierta bosque, avatar, historia, redes, productos, videos, valoraciones y perfil inexistente. |
| `favoritos.html` | Cabecera, tarjetas guardadas y estado vacío, conservando almacenamiento y botones existentes. |
| `acceso.html` | Inicio con Google/correo, solicitud de cuenta y estados de aprobación, proveedor deshabilitado y errores. |
| `recuperar.html`, `restablecer.html` | Campos, ayudas y mensajes; enlace vencido o cuenta de otro proveedor conserva su flujo. |
| `creditos.html` | Información de la fotografía propia y de los recursos del proyecto, con la nueva presentación. |
| `panel.html` | Bienvenida bosque, prioridad del perfil, accesos, métricas existentes y administración de productos. |
| `mi-perfil.html` | Perfil, fotografía, historia, contacto, enlaces sociales y seguridad. |
| `nuevo.html` | Las cuatro etapas existentes, selección y aprobación de fotografías/texto, marcas ✦ IA, revisión, borrador y publicación. |
| `difusion.html` | Selección de producto/red/estilo, texto y aprobación, copia, descarga y compartir existentes. Guardar un enlace social no se convierte en OAuth ni publicación automática. |
| `admin.html` | Resumen, cuentas, invitaciones, productos/valoraciones, historial, seguridad y diálogos de confirmación existentes. |
| `estudio.html`, `revision.html` | Se conservan las redirecciones y enlaces a `nuevo.html#preparar`, sin crear recorridos nuevos. |
| Componentes transversales | Menús, foco, botones, campos, etiquetas, ventanas HTML, mensajes, notificaciones, estados vacíos y pies. Las confirmaciones y selectores nativos del navegador conservan su interfaz del sistema. |

## Archivos y protección funcional

- Estilos: `assets/design-system.css`, `assets/storefront.css`, `assets/access-pilot.css`, `assets/artisan-workspace.css`, `assets/admin-panel.css`.
- Presentación: `assets/storefront.js` (estructura de tarjetas, portada y jerarquía de títulos) y `assets/app.js` (encabezados de tarjetas y texto de atribución del pie). No se cambian sus eventos de negocio.
- Los perfiles demostrativos existentes reciben una etiqueta visible «Perfil de ejemplo» mediante el mismo criterio de identificación que ya usa la portada. Los perfiles recibidos del servidor mantienen sus datos y fotografías.
- HTML: color de interfaz del navegador en las quince páginas de contenido; ámbito y contenido visual de la página de imágenes.
- Recursos: `assets/textile-border.svg` y metadatos de la fotografía propia en `assets/img/credits.json`.
- Revisión local: `scripts/integral-fixtures.cjs`; `scripts/panels-fixtures.cjs` amplía los casos de ventanas sin confirmar operaciones. Ambos generan archivos excluidos del build.

Se comprobó que `cloud.js`, `supabase-config.js`, `auth-ui.js`, `account-security.js`, `artisan-workspace.js`, `admin.js` y `admin-commerce.js` permanecen idénticos a la base. Tampoco se modificaron SQL, RLS, funciones del servidor, paquetes, cuotas, cargas de fotos, validaciones ni integraciones.

Se compararon los enlaces, identificadores, atributos y controles generados por inicio, catálogo, ficha, tarjeta y ficha inexistente con la versión anterior. Los cambios de jerarquía de títulos son semánticos; conservan los controles y datos. Los archivos CSS se analizaron además con el parser ya instalado, sin dependencias nuevas.

## Pruebas y límites

- Respaldo Git verificado: `.backups/antes-integral-20261111.bundle`.
- Base antes del rediseño: 109/110 pruebas pasan. La falla de `tests/storefront.test.cjs:36` espera WhatsApp en un ejemplo sin teléfono válido. No se corrige cambiando contactos o comportamientos dentro de este encargo estético.
- Las revisiones visuales se realizan con las herramientas de taste-skill en Edge, usando el código real y fixtures locales claramente identificados. Las funciones de escritura y generación de los fixtures rechazan operaciones; no hay SDK, credenciales ni conexiones de Supabase en esas páginas.
- La revisión local no prueba el correo real, Google OAuth remoto, consumo de IA, diálogo nativo de compartir ni operaciones con cuentas reales de producción. No se consumen servicios de pago.
- La moderación comercial conserva su estado de activación; el rediseño no aplica su migración pendiente ni activa servicios.
- Resultado funcional final: **109 de 110 pruebas pasan**, igual que en la base. `npm run check`, el build estático, las referencias locales y el análisis de CSS completados. No se añadieron dependencias ni se modificaron los archivos de paquetes.
- Se comprobaron catálogo, acceso y ambos paneles a 1440, 1024, 768 y 390 px; portada, producto y perfil público se revisaron también a esos tamaños. Las correcciones finales de contraste y composición se volvieron a comprobar a 1440 y 390 px, con recorrido adicional a 320 px. El editor se comprobó a 1440/390 y 320 px.
- Las capturas permitieron corregir la distribución de la creadora dentro de la ficha móvil, que inicialmente dejaba demasiado poco ancho al nombre. También se corrigieron el contraste de valoraciones en la cubierta oscura y el foco de teclado sobre fondos oscuros.
- Los informes completos de taste-skill se conservan en [diseno/integral-auditoria.json](diseno/integral-auditoria.json), incluidos los hallazgos abiertos y las comprobaciones no ejecutadas. Los criterios comerciales de hero, altura por pantalla, densidad de acciones o fotografía por tarjeta no equivalen a una prueba de flujo funcional. El gate histórico permanece abierto.
- Las categorías y etiquetas de ejemplo se superponen intencionadamente a la fotografía con su propio fondo, como en la referencia del usuario; sus textos no quedan ocultos. El detector genérico de solapamiento registra estas superposiciones. Se documentan conservando los hallazgos originales, sin eliminar la comprobación.
- Reverificación de teclado en portada, acceso y menú compartido: `focus-visible`, `focus-ring` y `focus-hidden` pasan. Los informes complementarios están dentro del JSON, separados de las revisiones completas anteriores. Los contornos se reforzaron sobre bosque/terracota. Las incidencias ya corregidas siguen conservadas en `resolvedFindings` con su comprobación posterior; las superposiciones deliberadas, en `intentionalOverlays`.
- Se inspeccionaron capturas de todas las familias de páginas y estados representativos: tienda, producto, artesanas/perfil, favoritos vacíos y llenos, acceso/registro/recuperación/restablecimiento, imágenes, panel, perfil privado, fotografía/descripción, promoción, administración y sus confirmaciones. Las dos rutas antiguas se validan como redirecciones hacia el editor existente.
- Portada capturada además a 390 px con movimiento reducido: contenido visible y fotografía propia conservada. Esta comprobación visual es adicional a los modos rápidos del analizador; no se presenta como una certificación completa de accesibilidad.

## Capturas del resultado

Los datos de estas capturas son ejemplos y fixtures de revisión local, no nuevas cuentas o productos creados en Supabase.

- [Inicio en escritorio](diseno/integral-inicio-escritorio.png) y [en móvil](diseno/integral-inicio-movil.png).
- [Ficha de producto en móvil](diseno/integral-producto-movil.png).
- [Panel de artesanas](diseno/integral-artesana-escritorio.png).
- [Administración](diseno/integral-admin-escritorio.png).
- [Acceso](diseno/integral-acceso-escritorio.png).

## Cómo revisar localmente

Desde la carpeta `khipuFibra`, ejecutar `npm run preview` y abrir `http://127.0.0.1:4173/`. Las rutas privadas siguen requiriendo la cuenta y el permiso correspondientes. El servidor sirve únicamente páginas y recursos públicos del frontend.

Para revisión sin servicios remotos: `node scripts/integral-fixtures.cjs` y `node scripts/panels-fixtures.cjs`. Las páginas generadas permanecen en `.taste-skill/` y se revisan con `shoot.mjs --root .`; no se publican en el build.
