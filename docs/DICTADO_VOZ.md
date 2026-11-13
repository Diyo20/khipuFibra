GATE: OPEN — la auditoría visual general anterior continúa abierta; esta revisión verifica los controles de dictado añadidos.

# Dictado de voz — 13 de noviembre de 2026

Implementación local en la arquitectura HTML/CSS/JavaScript existente. El módulo `assets/voice-input.js` incorpora «Grabar voz» en la descripción del producto, los dos campos de historia del perfil y el texto de promoción. Utiliza SpeechRecognition o su variante webkit con idioma es-PE. El constructor y la solicitud de acceso al micrófono solo se ejecutan después de pulsar el botón.

El control muestra espera de permiso, escucha, frases parciales y detención. Solo las frases finales entran al campo; se añaden una vez al final sin reemplazar lo escrito. El resultado sigue editable y los eventos de edición existentes revocan la aprobación del producto o de la publicación. Guardar continúa siendo una acción explícita. Los textos se envían mediante los mismos formularios y operaciones de Supabase; este módulo no guarda audio ni crea archivos de grabación.

El usuario puede detener el reconocimiento y revisar su última frase. Al guardar, aprobar, generar con IA, cambiar de contexto, esconder el paso, deshabilitar el editor, salir de la página o cambiar de sesión, se cancela la escucha y se ignoran resultados tardíos. No se reinicia automáticamente. No consume generaciones de las funciones de IA del proyecto.

Permiso denegado, micrófono ausente, problemas de red o idioma no admitido producen mensajes sin borrar el contenido. Si el navegador no ofrece reconocimiento o la página carece de contexto seguro, el botón queda deshabilitado con explicación; se conserva la edición manual. Si la siguiente frase excede maxlength, se conserva el texto anterior y se solicita acortarlo, sin truncar silenciosamente la frase.

## Compatibilidad y alcance

La API tiene compatibilidad limitada y algunos navegadores envían audio a un servicio de reconocimiento del proveedor: [SpeechRecognition en MDN](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition). La interfaz avisa de este comportamiento junto al botón. No se promete funcionamiento offline ni reconocimiento local en el dispositivo. No se configura un proveedor nuevo, un secreto, una función de pago o transcripción de respaldo en backend; esa alternativa continúa pendiente si las pruebas del piloto muestran que el soporte nativo es insuficiente. Se usan los controles existentes de generación de texto después del dictado, con sus mismas reglas y aprobación.

## Verificación

Las pruebas de voz usan un reconocedor simulado, nunca el micrófono. Cubren inicio manual, compatibilidad, frases parciales/finales, eventos repetidos, texto editado durante el dictado, detener, errores de permiso/red, cambios entre campos, cierre de sesión, editores deshabilitados/ocultos/desmontados, límite de longitud y recuperación. Las pruebas integradas con los editores reales verifican invalidación de aprobación, guardado de la descripción y del perfil, y edición de promoción sin invocar generación.

Los fixtures locales se regeneran con `node scripts/panels-fixtures.cjs`; `panels-editor-voz.html` emite únicamente eventos sintéticos para mostrar «Escuchando», y `panels-editor-sin-voz.html` muestra la alternativa sin soporte. Ninguno accede a Supabase ni abre el micrófono. Las capturas y comprobaciones de navegador están en `.taste-skill/voice-*`, excluidas de publicación. La auditoría visual global anterior permanece abierta; esta revisión es específica de los controles añadidos.

Resultado de pruebas: **122/122**, sintaxis/referencias y compilación correctas. Revisión visual del editor a 390 px y perfil a 1440 px, con eventos sintéticos para el estado de escucha. Checker del editor a 1440 y 390 px y recorrido estrecho a 320: cero errores de scripts/recursos y sin hallazgos de desbordamiento o colisión; contraste, foco visible, nombres accesibles y jerarquía pasan. Se mantienen en el informe bruto 17 FAIL y 26 WARN de la composición general (`nav`, `no-visual`, `button-styles`, `copy-actions`, `off-grid`, `fold-action`). El control de voz tiene advertencias de alineación junto a su ayuda en escritorio y ancho propio en móvil: es una acción contextual del campo, sin ocultar el texto ni otros controles. A 320 hay una advertencia del límite de la primera pantalla en el texto del paso. No se suprimen resultados ni se declara aprobada la auditoría global.

Falta comprobar reconocimiento de voz real, calidad del español, permisos y comportamiento en teléfonos físicos del piloto. Las pruebas automatizadas de eventos no certifican el servicio del navegador ni el hardware.

## Comprobación manual

1. Servir el proyecto con `npm run preview` y abrirlo en localhost; para probar desde un teléfono, usar una Preview HTTPS autorizada.
2. Iniciar sesión como artesana. En Agregar producto, abrir Descripción, pulsar Grabar voz y aceptar el permiso. Dictar una frase, detener y corregirla. Revisar/aprobar antes de guardar o publicar.
3. En Mi perfil, dictar la historia y guardar explícitamente. Recargar para comprobar el texto recuperado de la cuenta.
4. En Promocionar, seleccionar un producto publicado, dictar/editar el mensaje y aprobarlo antes de compartir. Cambiar de producto o red debe detener la escucha.
5. Denegar permiso y probar una cuenta sin soporte: los datos escritos deben permanecer y la escritura debe seguir disponible.

Sin commit, push, despliegue, cambios remotos ni nuevas dependencias en este incremento.
