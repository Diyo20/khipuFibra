# khipuFibra — actualización integrada (Vercel + Supabase)

> **13 de noviembre de 2026 · Pollinations:** migración de cuotas de imágenes y función `mejorar-foto` activadas tras autorización. Comprobación remota aprobada y datos sintéticos revertidos, sin gastar Pollen. El botón, comparación y aceptación de fotos siguen en el frontend local, pendiente de publicación. Primera generación real pendiente desde una cuenta activa. Uso y límites: [docs/POLLINATIONS_FOTOS.md](docs/POLLINATIONS_FOTOS.md).

> **13 de noviembre de 2026 · textos y fotos:** Gemini actualizado para redactar descripciones comerciales con datos reales. Ajustes locales gratuitos de iluminación, contraste, giro y margen blanco en el editor de fotografías. Uso: [docs/TEXTOS_Y_FOTOS_SIN_COSTE.md](docs/TEXTOS_Y_FOTOS_SIN_COSTE.md); el estado posterior de IA de imágenes figura en la nota Pollinations anterior.

> **13 de noviembre de 2026 · planes y Yape:** migración de solicitudes y Storage aplicada con autorización, comprobación remota aprobada y datos sintéticos revertidos. Precio inicial S/ 19; solicitudes de pago deshabilitadas, sin QR configurado. La página `planes.html`, «Mi plan» y «Planes y pagos» siguen en el frontend local, pendiente de publicación. Alcance: [docs/PLANES_YAPE.md](docs/PLANES_YAPE.md).

> **13 de noviembre de 2026 · ampliación de escritura:** cuotas aplicadas y función de generación/mejora adaptada a Gemini mediante `GEMINI_API_KEY`, que el propietario indica haber configurado en Supabase. Modelo predeterminado: `gemini-3.5-flash-lite`; configurable solo en servidor mediante `GEMINI_TEXT_MODEL`. Falta probar generación real desde una cuenta piloto. El frontend de dictado transversal y comparación sigue local. Alcance: [docs/ESCRITURA_ASISTIDA.md](docs/ESCRITURA_ASISTIDA.md). No se incorpora transcripción de audio en backend.

> **13 de noviembre de 2026:** dictado por voz incorporado localmente en productos, perfil y promoción, con revisión del texto y manejo de permisos/compatibilidad. Alcance y comprobación: [docs/DICTADO_VOZ.md](docs/DICTADO_VOZ.md). Pendiente probar voz real en teléfonos del piloto.

> **11 de noviembre de 2026 · rediseño integral local:** identidad terracota, borgoña y marfil aplicada a la tienda, acceso, herramientas de artesanas y administración. La fotografía propia del proyecto se conserva en portada. Ajuste de paleta, logo y curva: [docs/AJUSTE_BORGONA.md](docs/AJUSTE_BORGONA.md). Cambios, cobertura y verificación del rediseño anterior: [docs/REDISENO_INTEGRAL.md](docs/REDISENO_INTEGRAL.md). Sin commit, push, despliegue ni modificaciones remotas en este incremento.

> **12 de noviembre de 2026:** moderación comercial activada en Supabase con autorización explícita y comprobación remota satisfactoria; sus datos sintéticos fueron revertidos. Conserva perfil obligatorio y símbolos ✦ IA. Estado y pruebas: [docs/AVANCE_COMERCIO_20261112.md](docs/AVANCE_COMERCIO_20261112.md). Los últimos ajustes de frontend siguen locales, sin despliegue.

> **9 de noviembre de 2026:** galería de hasta tres fotografías implementada y migración aplicada con autorización. Consulta [docs/GALERIA_PRODUCTOS.md](docs/GALERIA_PRODUCTOS.md) antes de seguir instrucciones históricas de esta página.


> **Fase 1:** consulta primero [docs/FASE_1.md](docs/FASE_1.md). La aprobación ahora se administra mediante membresías protegidas y el panel `admin.html`. Las instrucciones de esta página sobre autorizar/desactivar con `artesanas_autorizadas`, repetir el SQL original y hacer push directo son históricas y no se deben usar para esta rama. No ejecutar SQL ni desplegar en producción antes de probar la migración y el frontend juntos en Preview.

Esta carpeta **conserva tu proyecto HTML/CSS/JS y tu logotipo original** (`assets/logo.png`). Se reutiliza el **mismo repositorio** `Diyo20/khipuFibra` y el despliegue ya enlazado a Vercel.

## Qué está preparado

- Catálogo público con los ejemplos existentes y productos reales guardados en Supabase.
- Google para iniciar sesión; acceso a herramientas privadas **solo para correos aprobados**, comprobados en la base de datos mediante `soy_artesana_autorizada()`. No se confía en `localStorage` para el permiso.
- «Mi perfil»: nombre, historia, foto, trayectoria, ferias, WhatsApp y enlaces de Facebook, Instagram, TikTok y YouTube. Se guardan realmente en Supabase y aparecen públicamente.
- Una artesana autorizada puede subir fotografías, aprobar el texto y la imagen, y publicar un producto en Supabase Storage + Database. El catálogo se actualiza al recargar.
- Difusión privada con **las cuatro redes visibles**. Las descripciones pueden editarse y regenerarse; se aprueban antes de compartir. Compartir con imagen, texto y enlace funciona cuando el dispositivo y la red lo permiten; hay alternativas de copiar y descargar.
- Reseñas enviadas a Supabase **pendientes de aprobación**, no publicadas sin moderación.
- Función de IA real incluida en `supabase/functions/generar-descripcion/`, conectada a Gemini con una clave privada de API. Puede utilizar el nivel gratuito del modelo según la cuota y el plan del proyecto en Google AI Studio. No hay IA falsa cuando Supabase está conectado; aparece error si no está habilitada.

## Importante: pendientes que no se activan mágicamente

- **Publicar automáticamente en Facebook/Instagram**: registrar aplicación Meta, conectar cada página/cuenta profesional con OAuth y obtener permisos de publicación de la app. El campo de URL social **no equivale** a una autorización de publicación. No se han integrado tokens Meta todavía.
- TikTok publicación directa: API oficial, autorización y revisión. WhatsApp: compartir asistido, no publicación automática en estados.
- Vista previa de Facebook por producto: requiere URLs que entreguen Open Graph en el HTML de respuesta del servidor; `producto.html?id=...` con metadatos calculados solo en navegador **no basta**. No está implementada esa capa de servidor.
- Las fotografías se **presentan localmente** con un fondo para revisión, no se crean por IA. Procesamiento generativo de imágenes requiere servicio separado.
- Los ejemplos de artesanas y productos son ficticios y siguen visibles. Antes de lanzamiento comercial hay que señalarlos o sustituirlos.
- Las reseñas sin login son vulnerables a spam: se guardan pendientes de aprobación. Para producción añadir CAPTCHA y límites de frecuencia.

## PASO 1. Supabase SQL (una sola vez)

Abre el proyecto Supabase existente → **SQL Editor → New query**. Copia y ejecuta el contenido de `SUPABASE_01_ESTRUCTURA.sql` (no borra tu tabla previa). Debería indicar `Success`.

Para autorizar una artesana (con permiso de administrador en **SQL Editor**):

```sql
insert into public.artesanas_autorizadas (correo, nombre, activa)
values (lower('CORREO_REAL@gmail.com'), 'Nombre de la artesana', true)
on conflict (correo) do update set nombre=excluded.nombre, activa=true;
```

Para desactivar el acceso sin borrar el perfil:

```sql
update public.artesanas_autorizadas set activa=false where lower(correo)=lower('CORREO_REAL@gmail.com');
```

**No** agregues correos de artesanas mediante formularios públicos ni expongas esta tabla.

## PASO 2. Configurar Google en Supabase

1. En Supabase → **Authentication → Providers → Google**. Habilita Google después de preparar un **OAuth Client ID** y **Client Secret** desde Google Cloud Console (credenciales tipo Web Application).
2. En el cliente OAuth de Google Cloud, coloca como **Authorized redirect URI** la URL de callback que aparece en la pantalla de proveedor Google de Supabase. Suele seguir el formato `https://TU-PROJECT-REF.supabase.co/auth/v1/callback` (copia la URL exacta del panel).
3. Copia Client ID/Secret **a la configuración de Google en Supabase**, nunca al código de GitHub.
4. En Supabase **Authentication → URL Configuration**: establece `Site URL` = `https://khipufibra.vercel.app` (usa tu dirección real). Agrega a **Redirect URLs** `https://khipufibra.vercel.app/acceso.html` y la URL de Live Server para pruebas locales si necesitas.
5. Las cuentas de Google autorizadas deberán coincidir con los correos guardados en `artesanas_autorizadas`. En Google Cloud, si el consentimiento OAuth está en *Testing*, añade las artesanas como test users o completa el proceso de publicación/aprobación cuando corresponda.

**Advertencia:** aunque alguien pueda autenticarse en Supabase Auth, **NO obtiene permiso de artesana** salvo que su correo autorizado esté activo. Las políticas RLS también protegen las escrituras.

## PASO 3. Conectar la web al proyecto Supabase

En Supabase → **Project Settings / Connect → API keys** busca:

- `Project URL` (termina en `.supabase.co`)
- Clave **publishable** (`sb_publishable_...`) o **anon** pública (`eyJ...`).

Edita **`assets/supabase-config.js`**:

```js
window.KHIPU_CONFIG = {
  supabaseUrl: 'https://TU-PROJECT-REF.supabase.co',
  supabasePublishableKey: 'TU_CLAVE_PUBLICA'
};
```

Solo estas dos informaciones pueden estar en JavaScript público. **NO** compartas ni subas la contraseña PostgreSQL, `service_role`, `sb_secret`, credenciales Meta ni claves de proveedores de IA como `GEMINI_API_KEY`.

Si dejas el archivo sin configurar, la web continuará en modo local con datos de ejemplo; **NO** estará conectada a Supabase.

## PASO 4. Primera artesana real

1. Autoriza su correo desde SQL (paso 1).
2. La artesana abre khipuFibra → **Soy artesana → Continuar con Google** con ese correo.
3. Accede a **Mi perfil**, coloca nombre, foto, historia, WhatsApp, sus redes y guarda. Su perfil se refleja en **Artesanas** para todos los visitantes.
4. En **Agregar producto**, sube foto propia y completa nombre/material/otros datos. Usa la preparación fotográfica local, aprueba fotografía y descripción, y publica.
5. El producto aparece en el catálogo público y en el perfil de la artesana.
6. Desde su panel → **Difundir en redes**, elige producto y red; genera/edita/aprueba el texto, y comparte según las opciones admitidas por el teléfono y la red.

En la sección de perfil, los enlaces de redes **solo abren esos perfiles**. Para automatizar la publicación Meta necesitaremos una integración OAuth separada y permisos autorizados de cada página/cuenta profesional.

## PASO 5 (opcional ahora). IA real

La función está en `supabase/functions/generar-descripcion/{index,handler}.ts` y usa Gemini. Configura `GEMINI_API_KEY` en el panel de Supabase → Edge Functions → Secrets. Opcionalmente puedes definir `GEMINI_TEXT_MODEL`; el valor predeterminado es `gemini-3.5-flash-lite`.

La función valida la sesión mediante Auth y comprueba la membresía antes de reservar un intento. `verify_jwt=false` en la puerta de entrada se conserva porque la validación se realiza dentro del handler. No cambies ese ajuste de forma aislada. El nivel gratuito y sus límites se consultan en Google AI Studio; una suscripción a la aplicación Gemini no determina la facturación de API. No se utiliza OpenAI como alternativa automática.

**No pegues la clave privada en la terminal compartida, capturas ni GitHub.** El frontend no necesita conocerla. Tras configurar el secreto y desplegar la función actualizada, inicia sesión como artesana activa y prueba «Mejorar con IA» con un texto de ejemplo. Revisa la propuesta antes de aceptarla.

Si no despliegas esta función, **la publicación manual y los perfiles sí funcionan**, pero los botones de IA mostrarán un error claro al intentar generar descripciones.

## PASO 6. Actualizar el repositorio existente

**Haz una copia de seguridad primero.** Copia el contenido de esta carpeta sobre tu carpeta actual `khipuFibra`, **sin tocar su `.git`**. Conserva `assets/logo.png`. Revisa `git status`, luego ejecuta:

```powershell
git add .
git commit -m "Conectar khipuFibra con Supabase y redes de artesanas"
git push
```

Vercel detectará la actualización automáticamente. Visita la página cuando el despliegue figure en `Ready`.

## Comprobaciones

- Visita desde navegador incógnito: Inicio/Catálogo/Artesanas (sin entrar a Google).
- Cuenta Google no autorizada: debe negar acceso al panel.
- Cuenta autorizada: puede iniciar sesión, guardar perfil, subir producto.
- Otra artesana: no puede editar productos de su compañera gracias a RLS.
- Al refrescar desde otro teléfono, los productos y perfiles reales deben seguir allí.
- Calificaciones nuevas permanecen pendientes de moderación; en SQL Editor un administrador puede aprobarlas explícitamente:

```sql
select id, nombre, kind, target, estrellas, comentario, created_at, aprobada
from public.valoraciones order by created_at desc;
-- tras verificar contenido y autoría de una reseña concreta:
-- update public.valoraciones set aprobada = true where id = 'UUID_DE_LA_RESEÑA';
```

