GATE: OPEN 26 (rounds used up)

# Primera pantalla — Materia, oficio y creadoras

Tipo: catálogo de productos artesanales con acceso privado. Piloto funcional de `acceso.html`, no una portada comercial ni un rediseño extendido.

Paleta y tipografías proporcionadas por el titular: marfil `#F7F3EB`, carbón `#29251F`, terracota `#8C402C`; Fraunces y DM Sans. No se sortearon alternativas porque el brief fija estos valores. Fondos planos, sin efectos, escenas, degradados, texturas ni fotografías de terceros. El logo es el original del proyecto.

## Propuesta aplicada

- Escritorio: identidad y explicación a la izquierda; acceso real a la derecha, con alineación y márgenes comunes. No hay tarjetas repetitivas ni marcos decorativos.
- Móvil: logo dentro del encabezado y formulario primero. La explicación editorial duplicada se omite para acercar la acción principal; los campos, avisos y enlaces de cuenta permanecen.
- Campos de 52 px, texto de entrada de 16 px y etiquetas visibles; botones de 52 px; foco terracota, enlace para saltar al contenido y estados de carga existentes.
- Google muestra su estado real y permanece deshabilitado si no está disponible en Supabase. No se simula un inicio de sesión exitoso.
- El acceso, registro, recuperación, pendientes y errores utilizan el mismo contenedor. El código de autenticación existente sigue resolviendo el envío y los permisos.
- Se utiliza la capa original de hover y pulsación de taste-skill, sin modificar sus archivos, con movimiento reducido. No se agregan animaciones de scroll o secciones comerciales a un formulario de acceso.

## Archivos del piloto

`acceso.html`, `assets/access-pilot.css`, `assets/motion/motion.css`, `assets/motion/motion.js`, `assets/logo-web.png`. Los scripts de build y preview incluyen únicamente los dos archivos nuevos de motion permitidos. El resto de las pantallas no carga `access-pilot.css`.

Se creó `logo-web.png`, una copia técnica de 432 px y 314.153 bytes del PNG original de 2.183.001 bytes: reducción aproximada del 85,6 %. Se mantuvo la proporción y la transparencia; el hash SHA-256 del original se comprobó antes y después para verificar que no se modificó. No es una reinterpretación del logotipo.

## Validación y límites

Las capturas se inspeccionaron en Edge sin interfaz a 1440, 1024, 820, 768, 390 y 320 px. Se corrigieron el espacio ocupado por la marca en móvil, el salto del título editorial en tableta y una colisión del encabezado a 320 px. Los bordes de los campos se reforzaron. No se probó en dispositivos físicos Android o iPhone ni en Safari.

El verificador de rendimiento, con tres cargas por tamaño, terminó con **0 FAIL y 1 WARN**. Transferencia local medida: 868,5 KiB en escritorio y 560,6 KiB en móvil; desplazamiento de diseño 0,087 y 0,000, respectivamente. Las medidas son del entorno local, no métricas de usuarios reales.

Se conserva un aviso de imagen sobredimensionada en móvil: la copia de 432 px se presenta a 64 px y se comparte con el logo grande de escritorio. El peso ya queda por debajo de los límites del verificador. Una variante específica de 128 px puede incorporarse al extender el sistema visual.

El gate de taste-skill compara contra una página comercial de producto y su estructura propia. Identifica el logo como producto, exige una imagen de producto de gran tamaño, una sección por pantalla completa, un pie de una pantalla, un momento animado y un titular comercial. Esas exigencias no describen esta pantalla funcional. No se añadieron productos, cifras inventadas, fotografías ajenas, secciones de relleno o marcadores falsos para satisfacerlas; tampoco se modificó el kit ni se ocultó contenido al verificador. Los resultados abiertos se adjuntan abajo sin presentarlos como un aprobado.

No hay datos, testimonios, fotografías o precios nuevos asumidos. Los formularios usan Supabase, sin destinos de demostración. Las fotografías autorizadas de piezas y creadoras siguen pendientes para el futuro rediseño comercial. La prueba de invitación, recuperación y cambio con correo real sigue pendiente de intervención de sus titulares.

## Revisión del titular

Abrir `acceso.html` en la Preview de la rama. Revisar la identidad de tres colores, legibilidad del logo, botones y comodidad de los campos; después entrar al catálogo para comparar. Esta propuesta se presenta antes de extender el nuevo diseño al resto del sitio.


## Resultado final del gate

Tres rondas ejecutadas; 26 hallazgos abiertos, sin waivers. La colisión detectada a 320 px y el contraste insuficiente de un párrafo quedaron corregidos y ya no aparecen. Las reglas comerciales y de estructura del kit siguientes permanecen abiertas; no equivalen a una certificación de accesibilidad. Hay 8 avisos adicionales, incluidos la identificación de textos junto al logo como caption y el número de acciones de la pantalla.

- **hero-fill** — section#accountContent "Entra a khipuFibra": the next section shows on the first screen: it starts at 180px on a 900px screen (the hero ends at 725px)
- **flush** — main#accessMain > aside.access-story > a.link > span "→": aside.access-story and section#accountContent run together: -532px between their content, on one ground
- **nav** — header.container.account-header > a.account-brand "khipuFibra Artesanía peruana": nav link wraps to a second line
- **cta** — main#accessMain > aside.access-story: the hero has no button (the nav's does not count)
- **copy-headline** — section#accountContent > h1 "Entra a khipuFibra": "Entra a khipuFibra" does not name what is sold (artesania peruana, artesania, peruana, from flags)
- **copy-fact** — section#accountContent > h1 "Entra a khipuFibra": the first screen holds no number, price, date, place, platform or genre
- **product-shown** — main#accessMain > aside.access-story > img "img: Logotipo original de KhipuFibra": the hero's product is drawn 176 x 205px, 14% of the 1267px content width at 1440px (its img is 216px wide): a product page shows the product at 80% of the content width or more (under 60% FAILs)
- **moment-none** — (the page): a product page (--type) deals no moment: every kind carries one, two on a long page (moments.md)
- **hero-screen** — section#accountContent "Espacio de artesanasEntra a khipuFibraPa": the hero ends at 792px on a 900px screen, 108px above the fold: it ends at the fold, 1px either way (SR-1)
- **hero-screen** — main#accessMain > aside.access-story "Tu catálogo y tus redes, en un mismo esp": 657px of the next section shows on the first screen (from 243px on a 900px screen): nothing below the hero shows at load (SR-1)
- **section-height** — footer.container.account-footer "khipuFibra · Hecho a mano en PerúVolver ": the section is 93px tall (0.1 screens), 807px short of one screen (900px): every section after the hero is one screen or two, 2px either way (SR-2)
- **section-height** — main#accessMain > aside.access-story "Tu catálogo y tus redes, en un mismo esp": the section is 483px tall (0.5 screens), 417px short of one screen (900px): every section after the hero is one screen or two, 2px either way (SR-2)
- **section-height** — section#accountContent "Espacio de artesanasEntra a khipuFibraPa": the section starts at 176px, 176px below the screen grid (0 x 900px): sections start on whole screens (SR-2)
- **one-section** — main#accessMain > aside.access-story "Tu catálogo y tus redes, en un mismo esp": the screen at scroll 0px (stride 0) shows 483px of section 2 and the content of 2 sections, over 24px each beside section 1: a screen shows one section (another may peek 8px, 24px WARN) (SR-4)
- **one-section** — button#googleLogin "Continuar con Google": a band: a box 100% of the section wide on a ground of its own that holds only text: the section's own ground is the band (SR-4)
- **one-section** — form#loginForm > button.btn.wide "Entrar con mi correo": a band: a box 100% of the section wide on a ground of its own that holds only text: the section's own ground is the band (SR-4)
- **container-edges** — a.skip-link "Saltar al contenido": a <a> at the top of the page, outside header.nav, main, footer.closing and nav.actionbar (SR-6)
- **container-edges** — header.container.account-header "khipuFibraArtesanía peruana Ver catálogo": a <header> at the top of the page, outside header.nav, main, footer.closing and nav.actionbar (SR-6)
- **container-edges** — footer.container.account-footer "khipuFibra · Hecho a mano en PerúVolver ": a <footer> at the top of the page, outside header.nav, main, footer.closing and nav.actionbar (and 3 more like it: "Espacio de artesanasEntr", "Tu catálogo y tus redes,", "khipuFibra · Hecho a man") (SR-6)
- **container-edges** — section#accountContent > h1 "Entra a khipuFibra": 5 text blocks start on a left line at x 880, 760px from the container's left: text starts on the container's left, or on one split line (x 630, 732, 834) (also "Para gestionar productos necesit", "Google aún no está disponible. P", "Correo electrónico") (SR-6)
- **text-only** — section#accountContent "Entra a khipuFibra": the closing section is only text: no picture, icon, mock or effect in it
- **edge-left** — #accountContent h1 "Entra a khipuFibra": starts at x 880; the lines are 120 and the column starts
- **edge-left** — #accountContent p "Para gestionar productos necesit": starts at x 880; the lines are 120 and the column starts
- **edge-left** — #accountContent p.muted.small "Google aún no está disponible. P": starts at x 880; the lines are 120 and the column starts
- **neighbour** — #accountContent section.account-main "Espacio de artesanasEntra a khip": framed, 44px of the footer shows
- **hero-fold** — #accountContent section.account-main "Espacio de artesanasEntra a khip": starts at y 176, not under the nav


## Avisos adicionales y copy

Copy-lint sobre el archivo HTML: 0 FAIL, 0 WARN. El archivo es una shell dinámica; los avisos de contenido renderizado que siguen provienen de consistency. La voz es castellano sencillo, directo y cercano, con acciones concretas y sin testimonios o cifras inventadas.

- **flush** — section#accountContent > div.account-links > a "Olvidé mi contraseña": its button sits 13px above the rule on top of the footer
- **caption** — main#accessMain > aside.access-story > p.access-statement "Tu catálogo y tus redes, en un mismo esp": a line of words sits right under a picture, like "Tu catálogo y tus redes, en un mismo esp": the section's text says it, or the picture speaks for itself
- **copy-buttons** — button#googleLogin "Continuar con Google": "Continuar con Google" does not start with a verb (book, buy, try, start, get, see...) (and 1 more like it: "Entrar con mi correo")
- **copy-actions** — (the page): the main action "Entrar con mi correo" does not read word for word the same in the nav or hero
- **section-gaps** — main#accessMain > aside.access-story / section#accountContent: the sections overlap by 532px
- **product-shown** — (the page): no picture on this product page shows the peruana: its 1 pictures are "Logotipo original de KhipuFibra"
- **share-meta** — head: the head lacks og:title, og:description, og:image, twitter:card: a shared link shows no picture or title of its own
- **form-fields** — form#loginForm: the form has no status line (role="status"): sending, sent and errors are never read out

Se mantienen: la marca en dos niveles no es un enlace de navegación partido; los dos paneles son columnas de un único acceso, no capítulos superpuestos; los botones están en español y describen acciones; el estado accesible existe en #accountMessage, fuera del form. No se agregan metadatos de promoción a una pantalla privada noindex en este piloto. Estos motivos no transforman el resultado automático en PASS.
