# khipuFibra 2.0 — revisión de Fase 1 y seguridad de cuenta

Fecha: 8 de noviembre de 2026 (Perú). Rama: `develop/khipufibra-fase-1`.

## Punto de partida verificado

El checkout estaba limpio en `9960921` (Boton de Login), un commit por delante del remoto `e904bc4`. Se conservaron ambos. Los commits `5482552`, `c072f11` y `e904bc4` ya implementaban autenticación, roles e invitaciones; no se reemplazaron. Antes de editar se creó `.backups/antes-seguridad-20261108.bundle` y `git bundle verify` confirmó su integridad e historial completo. Este respaldo es del código, no de los datos remotos ni de Storage.

La consulta del Supabase conectado confirmó:

- Proyecto `yaksomcgqtnmsczvvyzs`, activo.
- Migraciones registradas: `20261108173320_legacy_baseline` y `20261108173327_phase1_access`. No se reaplicaron ni se crearon migraciones nuevas.
- Dos usuarios confirmados: un administrador activo y una artesana activa.
- Cero perfiles y cero productos remotos; el contenido comercial visible sigue siendo demostrativo.
- Dos invitaciones transitorias: una aceptada y una pendiente. No existe un evento de correo de invitación enviado por `admin-invite`; la aceptación registrada no acredita el envío de esa función.
- `admin-invite` desplegada, versión 1. Verifica usuario y rol dentro del código; no depende de botones ocultos. No se desplegó una versión nueva.
- RLS habilitada en las siete tablas de la aplicación. Las tablas de membresías, invitaciones, historial y autorizaciones legadas carecen deliberadamente de acceso directo desde el navegador; se utilizan funciones con autorización explícita.
- Sin avisos de salud o rendimiento. Security Advisor informa cuatro tablas cerradas con RLS sin políticas (diseño deliberado) y protección de contraseñas filtradas deshabilitada. No se modificó esa configuración sensible.

## Estado de la Fase 1

| Área | Estado |
| --- | --- |
| Correo, confirmación y solicitudes | Implementados; la cuenta inicial ya fue confirmada antes de esta sesión |
| Roles administrador/artesana y estados de acceso | Implementados en PostgreSQL, sin autorasignación desde metadatos del usuario |
| Panel administrativo de accesos | Lista, filtra, aprueba, rechaza, suspende, reactiva, invita y revoca; no equivale al panel operativo completo de fases posteriores |
| Invitaciones | Código y función desplegados; envío/recepción/aceptación por correo real todavía requieren prueba con destinataria acordada |
| Recuperación y establecimiento de contraseña | Implementados; pruebas automatizadas; correo real y redirección del proveedor pendientes de comprobación de extremo a extremo |
| Cambio de contraseña dentro de Mi perfil y administrador | Añadido en este incremento |
| Google | El código está preparado; proveedor y recorrido OAuth requieren configuración y prueba |
| Aislamiento por propietaria y suspensión | Pruebas locales PostgreSQL y smoke remoto con rollback satisfactorios |

## Cambios realizados

- `assets/cloud.js`: conserva códigos de error de Auth; comprueba longitud de contraseña; envía `currentPassword` y `nonce` con los nombres del SDK fijado; incorpora consulta verificada de identidades y reautenticación.
- `assets/account-security.js`: formulario compartido de cambio de contraseña, confirmación, manejo de código por correo si Auth lo exige, prevención de envíos simultáneos, cierre de sesión y protección al cambiar de cuenta. No guarda contraseñas en el estado de la aplicación ni en Storage.
- `assets/app.js`, `mi-perfil.html`: integra seguridad como sección independiente del formulario de perfil.
- `assets/admin.js`, `admin.html`: añade seguridad de la propia cuenta administradora. No permite cambiar contraseñas de otras personas.
- `assets/auth-ui.js`: un enlace de restablecimiento con error no se acepta por tener una sesión previa; una identidad exclusivamente de Google no recibe formulario convencional de contraseña.
- `assets/access.css`: presentación y objetivos táctiles del bloque de seguridad.
- Pruebas de cuenta, integración con Auth y errores añadidas a `tests/`.

Las identidades solo deciden la presentación de métodos de acceso; los permisos siguen comprobándose en servidor mediante membresías. No se añadió registro paralelo ni vinculación automática de cuentas.

## Verificación

- Antes de cambios: 47 pruebas, todas satisfactorias.
- Después: 55 pruebas, todas satisfactorias; sintaxis y referencias HTML correctas; build estático satisfactorio.
- Se ejecutó el script existente `supabase/tests/phase1_remote_smoke.sql` en la base alojada. Comprueba acceso pendiente, escalada de rol, aprobación, propiedad de productos/Storage, aislamiento, catálogo público, suspensión, reactivación y auditoría.
- Todos sus datos sintéticos vivieron en una subtransacción revertida. Resultado: `passed=true`, `temporary_data_rolled_back=true`. La comprobación posterior conservó 2 usuarios, 2 membresías, 0 perfiles, 0 productos y 3 eventos originales. No se enviaron correos ni se modificaron contraseñas reales.
- Las pruebas de UI usan LinkeDOM y Auth simulado: no acreditan entrega de correo ni inicio de sesión real.

## Cómo verificar el incremento

1. Abrir la Preview de la rama con una cuenta de correo/contraseña aprobada.
2. En Mi perfil → Seguridad de mi cuenta, abrir Cambiar contraseña. Comprobar confirmación y contraseña actual incorrecta; después guardar una válida e iniciar sesión de nuevo.
3. Repetir desde la cuenta administradora en el bloque de seguridad de `admin.html`.
4. Si Auth requiere reautenticación, comprobar recepción del código y guardado con él. La app no cambia las políticas remotas de Auth.
5. Con una cuenta que solo tenga Google, comprobar que no aparece el formulario convencional.
6. Solicitar recuperación y probar enlace válido, vencido y usado. El mensaje de solicitud no revela existencia de una cuenta.
7. Acordar una destinataria de prueba para invitación real; verificar entrega, aceptación y revocación sin usar el correo de una persona sin consentimiento.

## Pendientes manuales y fases posteriores

Confirmar SMTP/cuotas, URLs exactas de Preview y recuperación, mínimo remoto de contraseña y reautenticación. Configurar y probar Google. Security Advisor: [protección de contraseñas filtradas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), disponible según el plan de Supabase. No se solicita cambiar de plan ni se activa automáticamente.

No están implementados por este incremento la administración completa de productos/planes/pagos, motivos administrativos adicionales, micrófono, cuotas e IA de imágenes, conexiones Meta, Yape ni métricas nuevas. Se respetará el orden de fases del documento de khipuFibra 2.0. No se publicará en producción ni se fusionará con `main` sin autorización.

Referencias consultadas: [contraseñas](https://supabase.com/docs/guides/auth/passwords), [seguridad y reautenticación](https://supabase.com/docs/guides/auth/password-security), [SDK reauthenticate](https://supabase.com/docs/reference/javascript/auth-reauthenticate) e [historial de cambios](https://supabase.com/changelog.md). El SDK existente permanece fijado en 2.119.0.
