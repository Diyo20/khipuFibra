GATE: OPEN 15 (rounds used up)

# Rediseño de tienda — Materia, oficio y creadoras

Tipo: catálogo de productos artesanales peruanos (product / other), con gestión privada existente.

Dirección del brief: marfil `#F7F3EB`, carbón `#29251F` y terracota `#8C402C`; Fraunces y DM Sans. La paleta enlaza con los tonos del logotipo, que se conserva. No se sortearon colores o tipografías distintos de los aprobados. El dealer seleccionó hero `product`: título y acción sobre una fotografía amplia. El momento seleccionado es `word-highlight` en la explicación del contacto.

Voz: castellano directo y cercano; nombres y datos del proyecto, acciones concretas, sin nuevas cifras comerciales, testimonios ni promesas de publicación automática.

## Alcance aplicado

- `index.html`: portada editorial con fotografía, piezas destacadas, creadoras, recorrido de contacto y espacio de difusión. El acceso a herramientas de IA y redes permanece en la sección para artesanas.
- `catalogo.html`: introducción, búsqueda por pieza/material/artesana, orden de precio, categorías, recuento accesible y estados vacíos con restablecimiento.
- `producto.html`: nombre como título principal, imagen completa, galería cuando el dato tiene varias imágenes, precio opcional, disponibilidad, consulta, favoritos, especificaciones, historia, creadora, preguntas, opiniones y relacionados.
- Sistema compartido en las demás páginas: colores, botones, formularios, foco, encabezado, menú móvil, tarjetas de producto y pie. No se presenta como terminado el rediseño de distribución de perfiles o paneles administrativos.

## Composición de inicio

1. `store-hero`: una idea, la artesanía y sus creadoras; fotografía de trabajo textil, tipo use. Una pantalla de apertura con la acción Explorar artesanías y enlace a Artesanas.
2. `home-feature`: las piezas, tipo object. Tres ejemplos existentes o productos remotos si están publicados. Tarjetas abiertas y fotografía/ilustración sin recortes del objeto.
3. `home-makers`: las creadoras, tipo people/type. Perfiles reales si existen; iniciales para ejemplos, sin retratos ajenos atribuidos a esas personas.
4. `home-contact`: recorrido pieza–consulta–pedido, tipo statement. Momento del kit `word-highlight`: refuerza que el contacto es directo por WhatsApp. No registra ventas ni añade carrito.
5. `home-join`: herramientas para artesanas y redes, tipo type. Una franja de marca, sin dashboard simulado, sin shaders ni efectos técnicos.

En catálogo y detalle prima el contenido y la lectura continua; no se añaden pantallas de relleno para encajar alturas comerciales. En móvil las secciones crecen con sus piezas y formularios.

## Recursos y autenticidad

Fotografía de portada: Tydence Davis, “Woman Weaving (27536467371)”, [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Woman_Weaving_(27536467371).jpg), [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/). Se descargaron variantes de 500, 960 y 1280 px con el helper de la skill y se inspeccionó la fotografía antes de utilizarla. Es una referencia editorial, no una artesana identificada del proyecto; esa distinción y el crédito están visibles en el pie y en `creditos.html`. Debe sustituirse por una fotografía autorizada del piloto cuando esté disponible. No hay imágenes generadas con IA.

Se descartó el segundo recurso encontrado, una túnica histórica de museo: no representa el trabajo contemporáneo del piloto. No se utiliza en la web.

Los seis recursos originales de demostración mostraban la misma silueta de bolso para tipos distintos de producto. Se conservaron sus archivos y se añadieron ilustraciones SVG separadas para bolso, canasta, textil, sombrero, cartera y jarrón, utilizadas únicamente en las fichas de ejemplo. No son fotografías de productos reales y se identifican como ilustraciones. Los productos reales conservan sus imágenes guardadas. Las opiniones ficticias se etiquetan individualmente como ejemplo.

## Cambios de experiencia comprobables

- Guardar o quitar un favorito conserva búsqueda, categoría y orden del catálogo; el control comunica su estado y la pieza afectada.
- La búsqueda tolera tildes y ofrece una acción para limpiar filtros cuando no hay resultados.
- Los precios por consultar se muestran sin prefijo monetario y quedan al final al ordenar.
- WhatsApp incluye nombre y enlace de la pieza; el contacto desde un perfil conserva el enlace del perfil.
- Un ID de producto inexistente muestra un estado de no encontrado, sin sustituirlo por otra pieza.
- Menú móvil con estado accesible, Escape, retorno al botón y contenido inerte mientras permanece abierto.
- Formularios de opinión conservados, con etiquetas asociadas a sus campos. La revisión remota existente se mantiene.

## Protección y archivos

Respaldo previo: `.backups/antes-tienda-editorial-20261108.bundle`, verificado mediante Git. No equivale a un respaldo de la base de datos: este incremento no ejecuta migraciones ni modifica sus datos.

La presentación pública se separa en `assets/storefront.js`; el estado y los eventos existentes continúan en `assets/app.js`. `assets/design-system.css` unifica los controles y `assets/storefront.css` define estas tres composiciones. Se conservan rutas, autenticación y backend. El build copia solo archivos de frontend permitidos en las carpetas de imágenes, motion y moments; no copia SQL, funciones backend, pruebas o documentación.

La capa de movimiento y el momento proceden del kit sin cambios; `storefront-motion.js` los inicializa después de la carga asíncrona de datos. No hay animaciones de aparición en cada tarjeta ni scroll dirigido. Se respeta movimiento reducido.

## Verificación

Se añadieron seis pruebas de comportamiento público a las 55 existentes. La suite de 61 pruebas, sintaxis, referencias HTML y build pasaron. Las pruebas de DOM no sustituyen la entrega real de correos ni el uso en dispositivos físicos. Este incremento no acredita como terminadas las fases de productos editables, administración completa, micrófono/IA, Meta o Khipu Pro.

El resultado final de las capturas y verificadores se registra a continuación.


### Rendimiento

Tres cargas por tamaño en Edge sin interfaz. Los tres archivos terminaron con 0 FAIL. Las cifras son del entorno local, no de dispositivos físicos ni de usuarios reales.

| Página | Ancho | Transferencia medida | FAIL | WARN |
| --- | --- | --- | --- | --- |
| index | 1440 | 756 KiB | 0 | 2 |
| index | 390 | 609.9 KiB | 0 | 1 |
| catalogo | 1440 | 308.9 KiB | 0 | 2 |
| catalogo | 390 | 373.8 KiB | 0 | 1 |
| producto | 1440 | 364.2 KiB | 0 | 2 |
| producto | 390 | 371.6 KiB | 0 | 1 |

Avisos conservados: la foto de portada de 381 KiB supera el umbral de aviso de 350 KiB, pero está bajo el límite de hero de 400 KiB; el logo fijo no se carga de forma diferida porque está visible en la cabecera; las fichas conservan carga diferida para evitar descargar un catálogo completo al abrirlo; el SVG del producto puede ampliarse sin pérdida por ser vectorial. No hay errores de scripts ni peticiones rotas en la medición final.

Los SVG nuevos conservan su viewBox de 800 × 650 y tienen una dimensión intrínseca de 400 × 325, apropiada para las fichas; no se rasterizan. El logotipo del encabezado usa variantes de 104 px (21.967 bytes) y 144 px (39.808 bytes) mediante srcset. Se verificó que el archivo maestro original conserva su hash.


### Gate de diseño

Tres rondas ejecutadas, sin editar el kit y sin waivers. El gate no es PASS. Se corrigieron el contraste, los objetivos táctiles, la nitidez de la foto móvil y las diferencias de cuadrícula detectadas. Permanecen los siguientes hallazgos. Algunos se refieren a la estructura retenida de #app, a términos españoles no reconocidos, a la sección de perfiles sin retratos inventados o al momento de texto que la propia skill recomienda para producto. También hubo capturas antes de terminar la carga remota; se repiten las capturas de revisión con espera adicional. No se presenta el resultado como certificación de accesibilidad.

- **nav** — div#app > header.header.nav > div.container.headrow > a.brand "khipuFibra Historias que se comparten": nav link wraps to a second line
- **no-visual** — main#mainContent > section.home-makers.section "Las creadoras y sus historias": no picture, effect or mock in this section; a feature section needs a visual
- **no-visual** — main#mainContent > section.home-join.section "Tu trabajo merece ser visto.": no picture, effect or mock in this section; a feature section needs a visual
- **copy-fact** — h1#homeTitle "Artesanía peruana, con nombre propio.": the first screen holds no number, price, date, place, platform or genre
- **copy-headings** — div.cards > article.card.product-tile:nth-of-type(1) > div.cardbody > h3 "Bolso Amanecer de Algodón": "Bolso Amanecer de Algodón" names no product, part, place or section (10 headings like it; at most one brand line per page) (and 9 more like it: "Canasta Nido Natural", "Camino de Mesa Tradición", "Las creadoras y sus hist", "De la pieza al pedido", ...)
- **hero-screen** — div#app "Cargando khipuFibra…": the hero ends at 138px on a 900px screen, 762px above the fold: it ends at the fold, 1px either way (SR-1)
- **container-edges** — div#app "Cargando khipuFibra…": the content of section 1 runs 337px from the left and 337px from the right (read from its outermost blocks: no .wrap): the margin is 64-120px at 1440px (one container, equal margins, 2px either way) (SR-6)
- **cta** — div#app: the hero has no button (the nav's does not count)
- **effect-kind** — (the page): a product page (--type) has 1 data-scroll-moment (a product with a technical subject: pass --tech-subject or mark <meta name="site-kind" content="tech">): effects fit tech, gaming and software pages and a product with a technical subject, never a place, shop or service page (house rule) (first seen at 390px)
- **edge-left** — section.home-join.section p "Cuenta la historia de la pieza y": starts at x 860; the lines are 80 and the column starts
- **edge-left** — section.home-join.section p "Presenta fotografías, detalles y": starts at x 860; the lines are 80 and the column starts
- **edge-left** — section.home-join.section p "Prepara ideas breves para mostra": starts at x 860; the lines are 80 and the column starts
- **edge-left** — section.home-join.section p "Prepara el texto de tu producto ": starts at x 860; the lines are 80 and the column starts
- **sparse** — section.home-join.section section.home-join.section "Espacio de artesanasTu trabajo m": its content fills 48% of its screen; merge it or give it its visual (0.55 is the aim)
- **screen-height** — section.home-feature.section section.home-feature.section "Piezas para tu día a díaArtesaní": 2005px, 2.38 screens; a section is exactly one or two (--h), or on a phone at least one that its content fills

### Avisos del gate

- **scroll-reveal** — main#mainContent > section.home-contact.section > div.container.wrap > p.mo-wh__text "Conoce la pieza, conversa con su creador": starts "color" (0.2 s) the moment it is scrolled into view (an IntersectionObserver) on span.mo-w:nth-of-type(4) (inside a dealt moment's section, [data-moment]: an enter moment is expected on every kind; its still is judged under reduced motion)
- **copy-buttons** — nav#mainnav > a.nav-cta "Soy socio ↗": "Soy socio ↗" does not start with a verb (book, buy, try, start, get, see...)
- **copy-actions** — nav#mainnav > a.nav-cta "Soy socio ↗": 2 labels for one target /acceso.html: "Soy socio ↗", "Entrar al espacio de artesanas ↗"
- **copy-actions** — (the page): the main action "Explorar artesanías" does not read word for word the same in the closing section
- **heading-scale** — h2#joinTitle "Tu trabajo merece ser visto.": h2 headings in 2 sizes, 50px ("Artesanías destacadas") to 64px (x1.28)
- **body-size** — div.container.wrap > div.contact-steps > div:nth-of-type(1) > span "01 / La pieza": 5 of 8 paragraphs of running text are set under 16px (14, 15px)
- **section-gaps** — main#mainContent > section.store-hero.hero / main#mainContent > section.home-feature.section: 91px between these sections, -42% against the median 157px
- **section-gaps** — main#mainContent > section.home-feature.section / main#mainContent > section.home-makers.section: 223px between these sections, +42% against the median 157px of gaps at a change of ground
- **photo-credit** — (the page text): 1 library source (wikimedia): the page credits wikimedia; confirm each shows the client's own product, place or people
- **product-shown** — (the page): no picture on this product page shows the peruana: its 4 pictures are "Trabajo textil en un telar peruano; foto", "Bolso Amanecer de Algodón · ilustración ", "Canasta Nido Natural · ilustración de ej", ...
- **share-meta** — head: the head lacks og:title, og:description, og:image, twitter:card, an icon: a shared link shows no picture or title of its own
- **heading-scale** — (the page): the page has no visible h1

Copy-lint sobre las shells HTML: 0 FAIL y 0 WARN, pero sin texto estático de las páginas; el contenido se construye en JavaScript y sus hallazgos renderizados están listados arriba. No se afirma que un análisis de shells vacías valide todo el copy.

Pendiente para el piloto: fotografías autorizadas de las piezas y creadoras, pruebas en Android/iPhone físicos, correos reales de Auth y las fases funcionales restantes. Vercel Preview puede requerir la sesión del titular en Vercel. No se publica en producción ni se fusiona con main en este incremento.

Las capturas de apertura están en docs/diseno/inicio-escritorio.png, inicio-movil.png y producto-movil.png; el catálogo completo está en catalogo-escritorio.png. Se inspeccionaron tamaños de 1440, 1024, 820 (portada), 768, 390 y 320 px. La espera adicional permitió capturar las páginas completas después de la carga remota. No se probaron dispositivos físicos ni Safari.
