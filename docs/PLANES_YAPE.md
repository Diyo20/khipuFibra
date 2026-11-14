GATE: OPEN — la auditoría visual general sigue abierta. Este incremento implementa planes y solicitudes manuales de pago.

# Planes visibles y gestión de Yape — 13 de noviembre de 2026

## Dónde se encuentran

- **Público:** `planes.html`, enlazado desde la navegación, el pie y la invitación a artesanas de Inicio. Compara Básico y Pro con cuotas recibidas del servidor. No depende de una sesión para mostrar la comparación.
- **Artesanas:** `mi-plan.html`, dentro del menú «Mi plan». Muestra plan efectivo, vencimiento, intentos utilizados en el mes, instrucciones de pago e historial propio.
- **Administración:** «Planes y pagos» en `admin.html`. Incluye configuración, revisión de solicitudes y ajuste de vencimientos. Se conservan las demás secciones.

Para revisar los archivos locales: ejecutar `npm run preview` dentro de khipuFibra y abrir `http://127.0.0.1:4173/planes.html`. El panel privado requiere una cuenta autorizada. Los últimos cambios no están publicados en Vercel.

## Condiciones reales del producto

Básico incluye perfil, catálogo, contacto por WhatsApp y las cuotas de escritura configuradas. Pro aumenta esas cuotas. No se promete mejora fotográfica, publicación automática en redes ni IA ilimitada. El dictado nativo no consume intentos y conserva sus límites de compatibilidad.

Precio inicial de Pro: S/ 19 por mes, según la referencia solicitada previamente. El precio queda en una configuración de servidor editable por administración. Cada solicitud conserva el importe vigente al enviarse; la artesana no puede imponer un precio menor desde el navegador. Si el precio cambia antes del envío, se pide actualizar Mi plan.

Las solicitudes de pago empiezan **deshabilitadas**. Administración debe subir su QR real, indicar el titular y las instrucciones, comprobar las herramientas ofrecidas y habilitarlas explícitamente. No se inventa un QR ni un destinatario real. La configuración inicial ya se aplicó remotamente y se verificó que sigue deshabilitada, sin QR.

## Recorrido de pago

1. Una artesana activa consulta Mi plan, verifica el importe y el titular y realiza el pago por Yape fuera de KhipuFibra.
2. Envía una referencia y, opcionalmente, una imagen de comprobante PNG/JPG/WebP de hasta 5 MB. Se permite una solicitud pendiente por cuenta y hasta tres solicitudes al día.
3. La solicitud queda pendiente: no activa Pro. Administración comprueba el abono real en su cuenta, el importe y su referencia. Una captura por sí sola no confirma el pago.
4. Aprobar exige confirmación explícita, referencia real verificada y motivo. Cada referencia verificada solo puede aprobarse una vez, incluso entre cuentas. La aprobación, el vencimiento y el evento de auditoría son una sola transacción.
5. Una aprobación activa un mes de calendario desde ahora o lo añade al vencimiento Pro vigente. No hay renovación ni cobro automático. Rechazar conserva la solicitud y el motivo y no otorga Pro.
6. Al vencer, la consulta del plan y las cuotas usan Básico inmediatamente. No hace falta borrar productos ni esperar una tarea programada. El historial permanece.

Administración puede ajustar una suscripción ya registrada, con motivo obligatorio. Una fecha pasada finaliza Pro; el ajuste no simula un pago. El cambio queda auditado. No se incluyen una pasarela automática, conciliación de Yape, devolución automatizada ni webhooks.

## Datos y permisos

Migración aplicada con autorización explícita: `supabase/migrations/20261113222445_plans_yape.sql`. Es el SQL autorizado como propuesta `20261113213629_plans_yape.sql`, renombrado sin cambiar su contenido para coincidir con la versión asignada por Supabase. SHA256: `492E4450593DA99E991821E2E59ACF64EED3D9A3E1163ABEB75E3DF38F335F31`.

Se añaden configuración y solicitudes con RLS y sin lectura/escritura directa desde anon/authenticated. Los wrappers públicos son invocadores y las operaciones privadas verifican UID, membresía activa y rol. La consulta pública no devuelve solicitudes, correos de artesanas ni comprobantes. Mi plan devuelve únicamente los registros propios. Administración tiene acceso a las 200 solicitudes y suscripciones más recientes; el historial de la artesana muestra las 50 solicitudes propias más recientes.

El QR se guarda en un bucket público separado (`plan-qr`), con subidas exclusivas de administración. Los comprobantes van a `plan-proofs`, privado, con rutas por UID. Solo la propietaria activa o administración pueden consultarlos. Los enlaces de descarga caducan en cinco minutos. Los archivos son inmutables desde el navegador; una corrección sube un archivo nuevo. Un fallo después de subir se puede reintentar sin duplicar la imagen en la misma vista. Archivos huérfanos de formularios abandonados podrán requerir limpieza administrativa; este incremento no borra archivos automáticamente.

Se reutilizan `khipu_ai_plans`, las cuotas y sus comprobaciones de vencimiento existentes. No se cambia la autenticación ni se conceden permisos mediante localStorage o metadata editable. Las referencias de pago, fechas, correos, teléfonos y precios no reciben dictado; instrucciones y motivos sí lo reciben mediante el componente transversal existente.

## Verificación local

Las pruebas PostgreSQL ejecutan las migraciones reales y comprueban configuración inicial deshabilitada, bloqueo de solicitudes antes de habilitar, precio de servidor, propiedad del comprobante, acceso privado, imposibilidad de autoaprobar, confirmación del abono, aprobación duplicada, referencia repetida con reversión de la renovación, renovación válida, finalización y auditoría. El guion `supabase/tests/plans_remote_smoke.sql` pasó localmente; usa cuentas y objetos de Storage sintéticos dentro de una subtransacción que se revierte. No hace pagos ni sube archivos reales.

Las pruebas de interfaz cubren comparación sin autenticación, ruta privada Mi plan, consulta sin cargar productos, solicitudes pendientes, doble clic, fallos de envío con conservación de referencia y reutilización del comprobante, cambio de cuenta y aprobación administrativa con confirmación. Las pruebas de cliente comprueban bucket privado, enlaces temporales y rechazo de formatos/tamaños no admitidos.

Resultado local: **144/144 pruebas**, sintaxis/referencias y compilación correctas; `git diff --check` sin errores. Tras la autorización se aplicó la migración en Supabase. No se hicieron transferencias reales.

Fixtures: `node scripts/plan-fixtures.cjs`. Genera siete estados explícitamente simulados, sin SDK ni llamadas al servidor, y una imagen de prueba rotulada «Sin QR de pago». Nunca se incluye esa imagen en producción. Las capturas y los informes quedan en `.taste-skill/plans-*`.

El checker inicial público a 1440, 1024, 768 y 390 px y su recorrido a 320 no registró errores de scripts/recursos ni fallos de contraste, colisión o desbordamiento. Mantiene 43 FAIL y 25 WARN generales de composición (`hero-fill`, `nav`, `no-visual`, `text-only`, `card-visual`, `button-styles`, `cta`, `off-grid`, `product-shown`, `heading-scale`); no se borran resultados ni se declara un pase global. La captura y revisión visual posterior recogen el ajuste de encabezado de la tabla y su caption accesible.

Mi plan a 1440/390 y el recorrido a 320 tampoco registran errores de recursos/scripts ni hallazgos de contraste, foco, colisión o desbordamiento. Su informe conserva 10 FAIL y 21 WARN de composición (`nav`, `button-styles`, `top-stagger`, `fold-action`, `heading-scale`). Se inspeccionaron la comparación pública y el formulario de solicitud en móvil y la configuración administrativa en escritorio; el diálogo de aprobación se revisa con una solicitud sintética, sin confirmarla.

## Estado de activación y pasos siguientes

El 13 de noviembre de 2026 se aplicó la migración y se ejecutó su comprobación remota con autorización explícita. El resultado fue `passed:true`, `temporary_data_rolled_back:true`, `real_payments:0`, `file_uploads:0`. No persistieron las cuentas, solicitudes ni objetos sintéticos. Se confirmó RLS y ausencia de lectura directa para anon/authenticated en las dos tablas; `plan-qr` es público y `plan-proofs` privado. La configuración real mantiene S/ 19, enabled:false y ningún QR configurado. Una consulta HTTP a la función pública de planes devolvió 200 con precio y cuotas, sin solicitudes ni suscripciones privadas.

La revisión de seguridad conserva los avisos informativos de RLS sin políticas en tablas cerradas intencionalmente: [referencia](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy). Continúa la advertencia previa de protección de contraseñas filtradas desactivada, sin cambiar Auth: [documentación](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Falta configurar el QR real desde administración, comprobar las herramientas de IA ofrecidas y probar el recorrido con una cuenta piloto y un pago verificado por el responsable. No se puede afirmar que se probó una transferencia real mediante las simulaciones locales. La activación de solicitudes de pago sigue siendo una decisión explícita del administrador en la interfaz.

El frontend requiere autorización de commit/push/publicación para aparecer en Vercel. No se realizó ninguna de esas acciones. Se conserva una copia de las fuentes previas, incluidos cambios sin commit de escritura asistida, en `.backups/antes-planes-20261113`.

## Archivos principales

`planes.html`, `mi-plan.html`, `assets/plans.js`, `assets/plan-admin.js`, `assets/plans.css`, integración en `assets/app.js`, `assets/admin.js`, `assets/cloud.js`, enlace en `assets/storefront.js` y scripts/estilos de `admin.html`. Pruebas de permisos, navegación, planes y Storage; fixtures y comprobación SQL indicados arriba. Se cargan los módulos específicos solo en las dos páginas nuevas y administración.
