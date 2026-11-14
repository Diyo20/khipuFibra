GATE: OPEN — continúa abierta la auditoría visual general. Este incremento comprueba los controles de escritura añadidos.

# Escritura asistida — 13 de noviembre de 2026

Actualización posterior: [textos comerciales y ajustes de fotos sin coste](TEXTOS_Y_FOTOS_SIN_COSTE.md). La función Gemini v4 amplía la redacción comercial en descripciones y redes; conserva datos reales y el tono informativo en cuidados, reseñas y moderación.

Implementación en la rama de desarrollo existente, sin commit, push ni publicación del frontend. Tras autorización explícita se aplicaron la migración y el despliegue de la función de texto en Supabase. Se verificó un respaldo Git completo en `.backups/antes-escritura-asistida-20261113.bundle`. La nueva instrucción reemplaza la propuesta de transcribir audio en backend: solo se utiliza SpeechRecognition/webkitSpeechRecognition para dictar. No hay Whisper, grabador MediaRecorder, archivos de audio, subidas a Storage ni solicitudes de audio a OpenAI.

## Auditoría de campos

| Pantalla | Dictado | Mejora opcional con IA |
|---|---|---|
| Producto | Nombre, materiales, dimensiones libres, cuidados, descripción/historia | Cuidados y descripción/historia |
| Perfil | Nombre público, ciudad/comunidad, especialidad, historia, significado del trabajo, experiencia, ferias | Historia, significado del trabajo y ferias |
| Promoción | Editor compartido de Facebook, Instagram, WhatsApp y TikTok | Editor de la red seleccionada |
| Administración | Búsqueda comercial y motivo de moderación | Motivo de moderación, solo con cuenta administrativa |
| Catálogo | Búsqueda | Solo dictado |
| Producto y perfil públicos | Nombre de quien reseña y comentario | Comentario; la llamada exige una cuenta activa autorizada |
| Acceso | Nombre de la solicitud de cuenta | Solo dictado |
| Campos futuros | Inputs de texto/búsqueda y textareas elegibles detectados al insertarse | Textareas narrativas; pueden excluirse con `data-no-voice` |

Quedan excluidos contraseñas, códigos/nonce, claves/tokens, correo, teléfono/WhatsApp, precio y otros números, URLs/redes/video, archivos, selectores y campos ocultos de tipo hidden. Los campos deshabilitados o de solo lectura no pueden recibir voz. Los cuadros de comparación de IA no reciben controles recursivos. No se inventaron campos ausentes: actualmente no hay técnica de elaboración independiente, observación de suspensión ni mensaje narrativo de invitación; la invitación existente contiene solo un correo excluido.

## Comportamiento

El micrófono solicita acceso tras un clic, usa es-PE y muestra reconocimiento intermedio separado. Las frases finales se añaden una vez al final del campo, conservando lo escrito. Puede detenerse y continuar sin borrar el texto anterior. Solo un campo escucha a la vez. Al ocultar/deshabilitar/desmontar el editor, guardar, aprobar, cambiar de contexto o cerrar sesión, la escucha se cancela y los eventos tardíos se ignoran. El reconocimiento no reinicia automáticamente tras un error. El icono local de micrófono acompaña al texto «Grabar voz».

«Mejorar con IA» toma una copia del texto original y muestra una propuesta separada. «Rehacer» siempre utiliza esa misma copia; «Aceptar» copia la propuesta al formulario y dispara su evento normal de edición, revocando la aprobación anterior cuando corresponde. Si el texto o el contexto cambió entretanto, no permite sobrescribirlo con una propuesta antigua. «Conservar original» descarta la propuesta y mantiene el texto actual. Ninguna acción de comparación publica ni guarda en la base. El borrador temporal existente del editor conserva su comportamiento de edición; no se introducen guardados adicionales.

Los controles nuevos usan marfil #F7F3EB, carbón #29251F y terracota #8C402C. Se conserva la identidad general borgoña del sitio existente. La comparación se apila en móvil, sin ventanas modales.

## Cuotas preparadas localmente

Migración aplicada: `supabase/migrations/20261113191037_writing_assistance.sql`. Es el SQL autorizado como propuesta `20261113184934_writing_assistance.sql`, renombrado sin cambios de contenido para coincidir con la versión asignada remotamente. SHA256: `F623954C0E1A51AABC6FFDC9D473A6B24122239B2803CB91486C68FB86D908D9`.

- Básico: 2 intentos por contenido/herramienta y 20 por cuenta al mes.
- Pro: 6 por contenido/herramienta y 100 por cuenta al mes; una asignación de Pro necesita una fecha de vencimiento. Al vencer se usa Básico conservando los registros. No se implementan cobros ni activación de suscripciones en este incremento; la asignación se reserva a administración de base, sin escritura desde el navegador.
- El administrador puede configurar límites por contenido y mes desde el Resumen una vez activada la migración. Los cambios se auditan.
- Una generación o regeneración reserva un intento atómicamente antes de llamar a OpenAI. Las ediciones del texto, dictado, aceptación y descarte no reservan intentos. Un fallo del proveedor también mantiene la reserva consumida, pues puede haber generado costo; el error lo comunica y conserva el original.
- Los campos/herramientas tienen contadores separados; las cuatro redes también. Todos comparten el límite mensual de la cuenta y un tope global de 200 solicitudes al día. El periodo mensual usa el calendario de PostgreSQL. Los intentos por contenido no se reinician al cambiar el texto ni recargar la página. Guardar el primer borrador traslada sus consumos al producto creado. Duplicar productos no evita el límite mensual de cuenta.
- Las reservas y cierres solo pueden ejecutarse con el rol del servidor. Los navegadores consultan exclusivamente su cuota. Se verifica cuenta activa y propiedad del producto; los registros de consumo no almacenan originales ni propuestas, solo metadatos de intentos y tokens.
- Se contabiliza la generación existente además de la nueva mejora; no se deja una ruta antigua sin límites.

La función `generar-descripcion` valida el JWT con Auth, comprueba la membresía, limita el cuerpo JSON, reserva el intento y envía solo texto a Gemini mediante `generateContent`. Usa `gemini-3.5-flash-lite`, configurable en el servidor mediante `GEMINI_TEXT_MODEL`, con límite de 1600 tokens de salida. La clave viaja en la cabecera `x-goog-api-key`, nunca en la URL. El prompt exige respetar el significado y no añadir datos. Solo se aceptan respuestas completas (`STOP`), sin bloqueo y de hasta 5000 caracteres; los bloques de razonamiento se excluyen. La revisión humana sigue siendo necesaria: un prompt no garantiza por sí solo la exactitud de cada propuesta.

## Estado de activación y pruebas

La migración y la función `generar-descripcion` se activaron el 13 de noviembre de 2026 con autorización explícita. Supabase confirmó estado ACTIVE, versión 1. La función valida el JWT y la membresía dentro del handler; verify_jwt de la puerta de entrada es false para admitir las claves de firma del proyecto, sin eliminar esa validación interna. Una solicitud HTTP real sin sesión fue rechazada con 401.

La comprobación SQL remota devolvió `passed:true`, `temporary_data_rolled_back:true` y `provider_calls:0`. Se confirmó RLS y ausencia de lectura directa para anon/authenticated en las tres tablas; solo service_role puede reservar intentos, mientras authenticated puede consultar la cuota propia mediante la función protegida. La revisión de seguridad informa RLS sin políticas en estas tablas cerradas intencionalmente: [referencia](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy). Se conserva el aviso previo de protección de contraseñas filtradas desactivada; no se modificó Auth: [documentación](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

El propietario confirmó haber guardado `GEMINI_API_KEY` en Supabase y solicitó adaptar la integración a Gemini. No se consultaron claves privadas. `GEMINI_API_KEY` y la clave de servicio suministrada por Supabase se utilizan únicamente en el servidor. No hay llamadas a OpenAI ni cambio automático a otro proveedor. Los errores de configuración, modelo inexistente y cuota de Gemini tienen mensajes específicos; una solicitud enviada al proveedor queda contada incluso si falla. No hay reintentos automáticos.

Actualización Gemini desplegada: Supabase confirmó `generar-descripcion` ACTIVE, versión 3, SHA256 `695d10d0594434d2e5c929ab686b93448fd06116971a69ba42d24ddb5b3affdf`. Validación local: 147/147 pruebas, check y build satisfactorios. Las siete pruebas del handler verifican autenticación y cuotas, llamada a Google con datos originales, generaciones de producto/redes, bloqueo/truncado de respuestas, exclusión de razonamiento y errores de proveedor sin exposición de claves ni reintentos.

La generación real aún requiere una prueba desde una cuenta piloto activa; las pruebas automatizadas simulan respuestas de Google y no confirman los permisos o saldo de la clave real. La interfaz más reciente sigue local hasta que se autorice su publicación. El nivel gratuito de Google depende del proyecto/modelo y puede usar el contenido para mejorar sus productos: para el piloto, usar datos de ejemplo sin información personal. Tener Gemini Pro en la aplicación no habilita por sí mismo una cuota de API de pago.

Referencias verificadas: [API generateContent](https://ai.google.dev/api/generate-content), [precios y nivel gratuito](https://ai.google.dev/gemini-api/docs/pricing), [secretos de Supabase](https://supabase.com/docs/guides/functions/secrets).

Las pruebas automáticas cubren selección/exclusión de campos, inserción dinámica, comparación, aceptación, regeneración desde el original, agotamiento, fallos, doble clic y cierre de sesión mientras se consulta cuota. PostgreSQL local ejecuta las migraciones reales, permisos, propiedad, vencimiento, adopción de intentos y límites compartidos. El handler se prueba con respuestas de proveedor simuladas: autenticación, tamaño, rechazo de audio, reserva previa, cuotas, errores, resultados incompletos y ausencia de claves en la respuesta. `writing_remote_smoke.sql` se validó localmente; crea registros sintéticos y los revierte, sin llamadas al proveedor.

Resultado final local: **134/134 pruebas**, `npm run check`, `npm run build` y `git diff --check` correctos. No se realizó generación real con OpenAI ni se certificó voz física de esta ampliación.

Revisión en Edge headless: comparación a 390 y 1440 px con propuesta rotulada como simulada. El checker a 1440/390 y recorrido a 320 no detectó errores de scripts/recursos ni fallos de contraste, colisión o desbordamiento. El informe bruto `.taste-skill/writing-check/report.json` conserva 19 FAIL y 36 WARN generales (`nav`, `no-visual`, `button-styles`, `copy-actions`, `off-grid`, `fold-action`); no se ocultan ni se declara un pase global. Capturas: `.taste-skill/writing-mobile.png` y `writing-desktop.png`. Los fixtures se regeneran con `node scripts/writing-fixtures.cjs` y quedan excluidos del build.

## Compatibilidad conocida

| Navegador | Evidencia disponible |
|---|---|
| Edge en PC | El usuario informó dictado real funcionando. La revisión automatizada de esta ampliación usa eventos simulados y comprueba la UI; no prueba precisión del servicio. |
| Brave en PC | El usuario informó error de red del servicio de voz. Esta ampliación mejora el aviso pero conserva esa limitación; no añade transcripción externa. |
| Brave en celular | El usuario informó dictado real funcionando. No se determinó el sistema operativo ni se certificaron todas sus versiones. |
| Chrome, Firefox y Safari/iPhone | Sin prueba física de esta versión. Se detecta API disponible; su presencia no garantiza un servicio operativo. La escritura manual se conserva. |

Documentación: [SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition), [Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create), [seguridad de Edge Functions](https://supabase.com/docs/guides/functions/auth).

## Archivos

- `assets/writing-fields.js`: clasificación y contexto; `assets/voice-input.js`: dictado transversal.
- `assets/text-assist.js`: comparación y cuotas visibles; `assets/ai-settings.js`: configuración de límites en administración.
- `assets/writing-assistance.css`, `assets/microphone.svg`: presentación compartida.
- `assets/cloud.js`: llamadas seguras y errores de cuota; `app.js` y `artisan-workspace.js`: identificador de producto en generación existente.
- Las 15 páginas de contenido cargan los módulos; los dos redirects de compatibilidad no cambian. Los estilos de voz dejan de estar limitados al CSS privado.
- `supabase/functions/generar-descripcion/{index,handler}.ts`, `supabase/config.toml`, migración y comprobación SQL indicadas arriba.
- Pruebas de voz, workspace, permisos, text-assist y handler; generadores locales de fixtures.

Pendientes de verificación: mejora y regeneración reales con la cuenta piloto tras confirmar la configuración del proveedor; revisión del contenido producido; voz física de esta ampliación en navegadores móviles disponibles. El objetivo transversal queda implementado, con backend desplegado y frontend local, sin prometer reconocimiento universal.
