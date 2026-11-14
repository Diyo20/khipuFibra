# Edición de fotos con Pollinations

13 de noviembre de 2026, hora de Perú. Backend activado tras autorización explícita; frontend local, sin commit, push ni despliegue en Vercel.

## Cómo probar

Actualización de interfaz: [guardado desde cada paso y encuadre de fotos](GUARDADO_POR_PASOS.md). Al editar una publicación existente se guarda directamente sin repetir aprobaciones. Pollinations sigue recibiendo solo la foto principal actual.

1. Abrir el frontend local actualizado e iniciar sesión como artesana activa.
2. En Agregar/Editar producto → Fotografías, subir o elegir la foto principal.
3. Pulsar «✦ Mejorar foto con IA». Se envía una copia de hasta 1024 px a Pollinations, solo tras ese clic.
4. Comparar colores, formas, bordados y detalles. Elegir «Usar esta foto» o «Conservar foto actual».
5. Aprobar fotografías y guardar borrador o publicar explícitamente. Aceptar una propuesta no guarda ni publica. Restaurar foto original funciona antes de guardar; tras guardar, la imagen principal del registro pasa a ser la elegida.

Se mantiene la foto actual durante la generación. Una propuesta deja de poder aceptarse si cambian la foto, el producto o la cuenta. Mientras se procesa se bloquea el formulario para evitar acciones duplicadas. Los ajustes locales gratuitos siguen disponibles y no consumen cuotas.

## Proveedor, coste y seguridad

- `POLLINATIONS_API_KEY` se lee únicamente en Supabase. Debe ser clave secreta `sk_`; no se consultó ni imprimió su valor.
- Modelo fijo: `black-forest-labs/flux.2-klein-4b`. El catálogo público consultado anunció edición de imágenes y precio de 0,005 Pollen por imagen; no es una garantía de precio futuro ni implica generación ilimitada gratuita. No se cambia a otro modelo automáticamente. Configurar el presupuesto de la clave en Pollinations.
- API `POST https://gen.pollinations.ai/v1/images/edits`, archivo multipart y autenticación Bearer en cabecera. No se construyen URLs públicas con la clave ni se solicitan URLs remotas arbitrarias en el backend.
- Respuesta base64 PNG/JPEG/WebP con comprobación de firma, tamaños máximos y timeout de 90 segundos. Se rechazan errores o formatos no admitidos. No se confía en SVG ni se descargan URLs devueltas por el proveedor.
- Prompt fijo: fondo blanco, iluminación suave, conservar la pieza y sus detalles, sin inventar adornos. El resultado requiere revisión humana; puede alterar detalles. El proveedor recibe la fotografía al solicitar la edición.
- JWT validado con Auth.getUser y membresía activa en backend. `verify_jwt=false` de la puerta de entrada mantiene la validación interna, como en las funciones anteriores.

## Cuotas y migración

Migración remota `20261114000227_product_image_ai.sql`, autorizada con el nombre local original `20261113235634_product_image_ai.sql`; se renombró sin cambios de contenido para coincidir con el historial remoto. SHA256 `7B201C080149D43493094D05028213A65185AEB7BE1AAA377CE3D91C9789DBE5`.

Añade únicamente `generate_image` a las herramientas admitidas por la función privada de cuotas. Conserva las comprobaciones de propiedad/membresía, permisos y reservas atómicas. No añade tablas ni buckets. Imágenes y texto tienen contadores por herramienta y producto distintos, comparten el máximo mensual del usuario y el límite diario de plataforma. Los borradores adoptan sus intentos al guardarse. Un intento enviado al proveedor se registra incluso si falla.

Función `mejorar-foto` ACTIVE v1, SHA256 de despliegue `120a2ca5586360be128b51f107c49020310e90864301563d9739be42b76d9053`.

## Verificaciones y pendientes

- 154/154 pruebas, check y build aprobados. Incluyen cuotas PostgreSQL, acceso a producto ajeno, reservas solo de servidor, envío del archivo real a un modelo fijo, errores de saldo, formatos inválidos y timeout sin alternativa automática, aceptación y guardado explícitos.
- Comprobación remota `images_remote_smoke.sql`: passed=true, temporary_data_rolled_back=true, provider_calls=0. Endpoint real sin sesión: 401.
- No se hicieron generaciones reales ni se gastó Pollen en estas pruebas. La primera prueba desde una cuenta activa confirmará la validez de la clave, permisos, saldo, latencia y calidad del proveedor.
- Advisor de seguridad conserva los avisos previos: INFO por diez tablas intencionalmente cerradas mediante permisos/RLS y funciones protegidas; WARN de protección de contraseñas filtradas desactivada, sin cambios de Auth. Referencias: [RLS sin políticas](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [protección de contraseñas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- Fixture `panels-editor-foto-ia.html`: datos sintéticos, comparación simulada con la misma foto para revisar distribución, sin llamadas de proveedor. Capturas móviles revisadas. GATE: OPEN; permanece la auditoría visual general existente.
- Checker rápido en 1440/390 con comparación abierta: 14 FAIL, 43 WARN. Categorías abiertas: nav, button-styles, copy-actions, off-grid y fold-action. Incluyen reglas de portada comercial sobre un formulario con acciones necesarias, además de alineación/navegación heredadas; no se ocultaron. Contraste, foco, etiquetas, colisiones y desbordamiento pasaron. La revisión no certifica visualmente toda la plataforma.

Referencias del proveedor: [API oficial](https://github.com/pollinations/pollinations/blob/main/APIDOCS.md), [catálogo vivo](https://gen.pollinations.ai/image/models), [gestión de claves](https://enter.pollinations.ai/keys).
