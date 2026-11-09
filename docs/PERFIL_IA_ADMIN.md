GATE: OPEN — el rediseño general mantiene los 15 hallazgos registrados en `REDISENO_TIENDA.md`. Este incremento no declara una revisión visual completa aprobada.

# Perfil primero, marcas de IA y administración comercial

Incremento del 9 de noviembre de 2026, sobre `develop/khipufibra-fase-1`.

## Perfil como primer paso

«Mi perfil» es el primer acceso del panel y de su navegación lateral. Si no hay un perfil guardado en Supabase, se muestra «Crear mi perfil» con la indicación del primer paso.

Una cuenta sin perfil no recibe el formulario de producto, aunque abra directamente `nuevo.html`: se dirige a `mi-perfil.html?primero=1` antes de cargar sus campos o permitir fotografías. Al guardar el perfil desde ese recorrido, continúa a Agregar producto después de la confirmación del servidor. Un fallo mantiene el formulario y no habilita la creación.

La decisión usa el perfil recibido de Supabase, no el nombre por defecto ni un indicador de `localStorage`. Las comprobaciones de perfil y pertenencia en el guardado y las políticas RLS existentes siguen vigentes.

## Identificación de IA

Las acciones de generación de descripciones y textos sociales, incluida la regeneración, llevan el símbolo **✦ IA**. El símbolo es decorativo para lectores de pantalla; la etiqueta «IA» permanece en el nombre del control.

Cuando la función de generación devuelve un resultado, el editor lo identifica como «Texto generado con IA · revisa sus datos». Se conserva editable y pendiente de aprobación. El origen identificado corresponde a la generación observada en esa sesión; no se inventa procedencia de textos antiguos recuperados de la base.

El encuadre de fotografía sigue identificado como un proceso local que no utiliza IA. No se marca como una mejora generativa ni se presentan plantillas como resultados de IA. Activar proveedores, mejora fotográfica, cuotas y consumos sigue siendo otro bloque del alcance.

## Administración de productos y valoraciones

La administración se organiza en cuatro secciones: Accesos, Productos y valoraciones, Historial y Seguridad. Solo se muestra la sección seleccionada. Se conservan invitaciones, aprobación y suspensión de cuentas, recuperación y cambio de contraseña.

La gestión comercial permite:

- Buscar por producto, material, categoría o artesana y filtrar estados.
- Consultar información y las fotografías disponibles.
- Ocultar un producto mediante un bloqueo administrativo independiente de su publicación.
- Retirar el bloqueo conservando el producto sin publicar, para que su creadora lo revise y publique otra vez.
- Revisar valoraciones pendientes/ocultas o aprobadas; aprobarlas u ocultarlas.
- Exigir confirmación y un motivo de 5 a 500 caracteres; registrar actor, fecha, registro, motivo y estados anteriores/posteriores.

Se consultan los 200 registros más recientes de cada sección. «Pendiente / oculta» refleja el estado booleano existente de valoraciones; no inventa un estado separado de rechazo. No se eliminan productos ni valoraciones mediante moderación.

## Activación de Supabase

**Estado: migración preparada localmente, pendiente de autorización explícita para la base remota.** Archivo: `supabase/migrations/20261109140210_admin_commerce.sql`.

La propuesta crea una tabla de bloqueos con RLS y sin acceso directo para navegadores. Las operaciones usan wrappers públicos invocadores y funciones privadas con verificación de administrador activo. La consulta de estados de la artesana solo devuelve sus propios registros. El catálogo público excluye un producto bloqueado aunque su propietaria vuelva a marcarlo como publicado. Los motivos administrativos no se exponen públicamente.

Las decisiones y su evento de auditoría se realizan en la misma operación. Retirar un bloqueo no publica automáticamente. No se amplían privilegios directos de escritura sobre productos, valoraciones o cuentas.

El frontend detecta funciones aún no desplegadas y presenta la gestión comercial como pendiente de activación, conservando la administración de accesos. Los cambios de perfil primero y marcas de IA funcionan con el esquema remoto actual.

## Validación y revisión

- `npm run check`, `npm test` (**106 pruebas**) y `npm run build`.
- PostgreSQL local con las migraciones reales: acceso solo de administrador, tabla de moderación cerrada, bloqueo persistente, restauración sin publicar, aprobación/ocultación de valoraciones, motivo obligatorio y auditoría atómica.
- `supabase/tests/commerce_remote_smoke.sql` preparado y validado localmente. Crea datos sintéticos en una subtransacción y los revierte. Solo se ejecutará remotamente después de aplicar una migración autorizada.
- Pruebas del frontend: bloqueo temprano por perfil, prioridad del menú, continuación tras guardar, errores de red, símbolos de IA y texto editable, filtros de moderación, confirmación, solicitudes duplicadas y navegación de secciones.
- Revisión de cuerpos de Panel, Editor y Gestión comercial mediante fixtures locales a 1440, 1024, 768, 390 y 320 px. No se introducen cuentas ni productos de ejemplo en Supabase. Los fixtures se regeneran con `node scripts/workspace-fixtures.cjs` y no entran en el build.
- Respaldo de Git verificado: `.backups/antes-perfil-administracion-20261109.bundle`.

Queda pendiente verificar el recorrido con las cuentas reales del piloto y un teléfono físico. La UI identifica acciones de IA, pero no se realizaron llamadas de pago ni se configuraron secretos o proveedores nuevos.

## Cómo verificar

1. Con una cuenta artesana sin perfil, abrir Agregar producto: debe aparecer primero Crear mi perfil.
2. Guardar el perfil y comprobar que continúa al formulario de producto.
3. Verificar la marca ✦ IA en generar descripción y en generar/regenerar texto social. Escribir a mano debe seguir siendo posible.
4. Tras activar la migración de administración: entrar como administrador, abrir Productos y valoraciones, buscar una pieza y ocultarla con motivo.
5. Comprobar desde incógnito que desaparece del catálogo y desde la cuenta propietaria que ve el motivo.
6. Retirar el bloqueo, revisar y publicar como artesana. Aprobar u ocultar una valoración y consultar el historial.

Siguen pendientes la edición comercial avanzada desde administración, categorías/reportes, planes y pagos, consumos de IA, micrófono, integraciones sociales y validación final del piloto. No se fusiona `main` ni se publica la web de producción en este incremento.
