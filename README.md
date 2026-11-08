# khipuFibra — plataforma web de artesanías

## Fase 1: roles y autenticación

La rama de desarrollo incorpora acceso con Google y correo, recuperación de contraseña, aprobación de cuentas, suspensión, invitaciones e historial administrativo. Requiere configurar Supabase y aplicar las migraciones en un entorno de prueba; no está desplegada ni validada con servicios reales.

Consulta [la guía completa de Fase 1](docs/FASE_1.md) para configuración, administrador inicial, archivos modificados y pruebas. Para verificar localmente, con Node 24: `npm ci`, `npm run check`, `npm test` y `npm run build`. Usa `npm run preview` para servir el sitio en `http://localhost:4173`.

El catálogo de demostración se conserva. El antiguo acceso privado de un clic queda desactivado: una cuenta real debe estar aprobada o invitada. Las notas siguientes describen la demostración anterior, no los permisos ni la persistencia de las cuentas conectadas.

## Cómo iniciar

1. Descomprime el ZIP.
2. Abre la carpeta `khipuFibra` con Visual Studio Code.
3. Haz clic derecho en `index.html` y elige **Open with Live Server**.
4. Navega por Inicio, Catálogo, Artesanas y los perfiles públicos.
5. En **Soy artesana**, inicia sesión después de completar la configuración de Fase 1.
6. Desde **Agregar producto**, registra los datos y fotos, prepara una versión de la foto y una descripción, aprueba ambas y publica. Todos esos pasos están en la **misma página**.
7. En **Difundir en redes**, selecciona un producto y prepara, revisa y copia el texto para Facebook, Instagram, TikTok o WhatsApp.

## Agregar tu logotipo PNG

El archivo recibido no contiene una imagen de logotipo. Coloca **tu propio archivo** PNG en `assets/logo.png` (nombre en minúsculas). El encabezado intentará cargarlo automáticamente en todas las páginas. Si no se ve, confirma que no se llama `logo.png.png` y recarga con `Ctrl + F5`. No se ha sustituido tu diseño por ningún otro.

## Navegación simplificada

Público: Inicio · Catálogo · Artesanas · Mis favoritos · Detalle del producto · Perfil de artesana.

Artesanas: Mi panel · Agregar producto (incluye preparación, edición y aprobación) · Difundir en redes · Mi perfil.

Las antiguas direcciones `estudio.html` y `revision.html` redirigen a `nuevo.html#preparar` para que los enlaces anteriores no queden rotos.

## Información y funcionalidades

- 3 perfiles completos de ejemplo, 6 productos con precio, material, medidas, cuidados, historia, disponibilidad y colección.
- Tarjetas de redes sociales, publicaciones ilustrativas vinculadas a productos y enlaces a plataformas. **Los enlaces genéricos no representan cuentas personales reales**; cada artesana puede sustituirlos en su perfil.
- Calificaciones y comentarios iniciales de ejemplo en productos y perfiles. Los clientes pueden añadir nuevas valoraciones; se almacenan localmente en el navegador.
- Favoritos, búsqueda, filtros, publicaciones, fotos propias y cambios de perfil se guardan en `localStorage`.
- La preparación de descripciones utiliza variantes de plantilla editables. Las fotos se componen sobre un fondo uniforme sin eliminar el fondo original. **No usa IA real**.
- Las publicaciones a redes no son automáticas; el sitio ayuda a preparar y copiar el contenido, abre las plataformas y permite compartir por WhatsApp.
- Sin Supabase configurado, solo está disponible el catálogo de demostración; el acceso privado queda bloqueado.
- La persistencia remota requiere la configuración y las migraciones descritas en la guía de Fase 1.

## Datos de prueba y publicación

Los nombres, testimonios, biografías, precios y perfiles iniciales son **ficticios**. Antes de publicar la web para clientes, reemplázalos con información autorizada por las artesanas.

Para probar el enlace desde otro teléfono, publica el proyecto en GitHub Pages o utiliza un servidor accesible por ambos equipos.
