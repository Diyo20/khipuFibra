# Textos comerciales y ajustes locales de fotos

13 de noviembre de 2026. Se conserva la integración Gemini de texto existente; no se incorpora una API de imágenes ni se activa facturación.

## Uso del texto

En Descripción, escribir los detalles reales y pulsar «Mejorar con IA» para comparar, o «Generar descripción» para partir de nombre, materiales e historia. Ahora se solicita una apertura atractiva, redacción comercial e invitación a consultar, sin inventar cualidades, procedencia, descuentos ni disponibilidad. Los perfiles reciben una redacción cercana en primera persona; cuidados, reseñas y moderación mantienen su intención informativa. Cada propuesta sigue consumiendo el intento correspondiente y requiere revisión.

Función `generar-descripcion` desplegada ACTIVE v4, SHA256 `2c9fa8cd700e5a8916306266fcbcd87529c6bbd34183e638d40d9909d966e4df`. No se modificó el esquema ni los permisos. La calidad de esta nueva redacción debe revisarse con contenido real; los tests validan las solicitudes, no garantizan el resultado del modelo.

## Uso de fotografías

En Fotografías, abrir «Ajustar fotografía sin coste», elegir iluminación, contraste y giro y pulsar «Aplicar ajustes y margen blanco». Revisar, aprobar y guardar. Procesamiento local en canvas; salida JPEG 960 × 780 con la pieza completa y sin ampliar el original. Los ajustes se calculan siempre desde la foto de origen para evitar acumulación de filtros. Se puede restaurar antes de guardar; guardar reemplaza la imagen principal del registro como en el flujo anterior. Las demás fotografías de la galería se conservan.

El margen blanco no elimina el fondo existente ni recupera detalles perdidos por desenfoque. No se presenta como IA. No consume cuota del proveedor. La API de edición de imágenes permanece pendiente por presupuesto.

## Verificación

149/149 pruebas aprobadas; check y build satisfactorios. Prueba de flujo con canvas simulado: filtros, reutilización del original, aprobación invalidada, restauración y guardado explícito de la versión elegida. Fixture local sin autenticación ni escrituras; revisión visual móvil con ajustes abiertos. El frontend sigue local y requiere publicación autorizada para aparecer en Vercel.

GATE: OPEN. Se conserva la auditoría general del diseño existente. Checker rápido de la fixture con ajustes abiertos en 1440 y 390: 16 FAIL y 34 WARN. Categorías abiertas: nav, no-visual, button-styles, copy-actions, off-grid y fold-action; incluyen reglas de portada comercial aplicadas a un formulario con varias acciones necesarias. No se ocultan ni se declaran resueltas. Contraste, etiquetas, foco, colisiones y desbordamiento pasaron; se inspeccionó la captura móvil completa. No equivale a certificación visual de toda la plataforma. Endpoint desplegado sin sesión: 401; no se ejecutaron generaciones reales ni se activó el micrófono durante las pruebas.
