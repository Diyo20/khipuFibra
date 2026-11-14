# Guardado por pasos y encuadre de fotografías

13 de noviembre de 2026. Cambios locales de frontend; sin publicación en Vercel ni cambios de backend.

Cada paso del editor contiene «Guardar cambios». Guarda el estado completo del formulario y mantiene el paso abierto. Si el producto está publicado, actualiza la publicación sin repetir las aprobaciones de primera publicación. En un borrador lo conserva como borrador, y un bloqueo administrativo sigue impidiendo publicar. La primera publicación mantiene la revisión de fotografía y descripción. El botón existente «Guardar y ocultar» continúa siendo una acción distinta, explícita, en Revisión.

Los estados de guardado y error aparecen junto al botón de cada paso. Las solicitudes simultáneas se bloquean, el ID se conserva después del primer guardado y los errores conservan los datos del formulario. El backend existente sigue verificando datos obligatorios, propiedad, sesión y bloqueos. Guardar una fotografía no genera otra propuesta de IA automáticamente.

La ficha pública y las miniaturas de galería usan encuadre centrado que llena el recuadro, igual que las tarjetas. Puede recortar bordes según la proporción, sin deformar la foto. Se retiró el padding interior de las miniaturas. Los originales en Storage no se alteran por este ajuste de presentación.

Pollinations recibe solo la fotografía principal actual. No recibe las fotografías adicionales. Para usar otra imagen como referencia se puede elegir «Hacer principal» antes de solicitar una propuesta. No se ha ampliado el número de fotos enviadas ni el consumo de generación.

Verificación: 157/157 pruebas; check y build correctos. Pruebas específicas de guardado desde los cuatro pasos, conservación de publicación y galería, borradores, bloqueo administrativo, errores y solicitudes duplicadas. Fixtures sintéticas de edición publicada y ficha pública para revisión visual; sin llamadas de IA ni escrituras reales durante estas pruebas. Se corrigió una regla CSS que hacía visibles botones con `hidden`.

GATE: OPEN. Continúa la auditoría visual general del proyecto; este ajuste no la declara completada.
