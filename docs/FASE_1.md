# Fase 1 — roles y autenticación

Implementación del 8 de noviembre de 2026, en `develop/khipufibra-fase-1`.

Las dos migraciones se aplicaron al proyecto existente con aprobación explícita del titular. Se conservaron las dos filas originales y se verificaron los permisos en el servidor y la API pública. El frontend incluye únicamente URL y clave pública, y el SDK está fijado en `2.119.0`. No se crearon cuentas permanentes ni se enviaron correos reales durante las pruebas.

La rama utiliza Vercel Preview; no se ha mezclado con `main` ni promovido a producción. La configuración de URLs de Auth, el registro de la primera cuenta administradora y Google siguen pendientes. Consulta [el estado y los pasos actuales](APLICACION_FASE_1.md).

## Qué incluye

- Google mediante Supabase Auth; correo/contraseña; solicitud de cuenta; recuperación y cambio de contraseña.
- Estados pendiente, activa, rechazada y suspendida. Registrarse no concede acceso de artesana.
- Una invitación administrativa autoriza un correo; solo una sesión con correo confirmado puede aceptarla.
- Panel administrador: listar y filtrar cuentas, aprobar, rechazar, suspender, reactivar, invitar y revocar invitaciones.
- Historial administrativo inmutable para los roles del navegador.
- Administrador inicial asignado exclusivamente mediante SQL restringido.
- RLS por UID, protección de Storage y catálogo público con una lista explícita de campos.
- La suspensión impide nuevas escrituras y retira el perfil y los productos del catálogo, sin eliminarlos.
- Preferencias públicas en localStorage; borradores de cada cuenta en sessionStorage, separados por UID y limpiados al salir o cambiar de cuenta.

Los borradores ya existentes en el antiguo almacenamiento compartido de demostración no se importan a cuentas reales. Al abrir la versión conectada se conservan los favoritos y se retiran esos datos privados compartidos. Si necesitas conservar una demostración antigua, exporta su información antes de conectar esta versión. Los nuevos borradores permanecen durante la sesión de la pestaña; al cerrarla o cerrar sesión se pierden. La sincronización de borradores corresponde a la Fase 2.

## Archivos modificados y agregados

| Área | Archivos |
| --- | --- |
| Integración existente | `assets/cloud.js`, `assets/app.js`, `acceso.html` |
| Nuevas pantallas | `recuperar.html`, `restablecer.html`, `admin.html` |
| Interfaz de acceso | `assets/auth-ui.js`, `assets/admin.js`, `assets/access.css` |
| Base de datos | `supabase/migrations/20261108173320_legacy_baseline.sql`, `20261108173327_phase1_access.sql` |
| Servidor | `supabase/functions/admin-invite/index.ts`, `supabase/config.toml` |
| Build y verificaciones | `package.json`, `package-lock.json`, `scripts/`, `tests/`, `.github/workflows/checks.yml`, `vercel.json` |
| Configuración y guía | `.gitignore`, `.env.example`, `README.md`, `LEEME_PRIMERO.md`, este documento |

## 1. Preparar el entorno de prueba y respaldo

Usa un proyecto Supabase de prueba independiente y una Vercel Preview de esta rama. No apuntes una vista previa experimental a la base de producción.

Antes de tocar un proyecto existente, guarda y verifica una copia de sus datos y esquema, así como el inventario/copia de los objetos de Storage, configuración de Auth y funciones. El respaldo de tablas no equivale a una copia de los archivos de Storage.

Inspección de solo lectura, desde SQL Editor:

```sql
select tablename, policyname, roles, cmd, qual, with_check
from pg_policies where schemaname in ('public','storage')
order by schemaname, tablename, policyname;

select table_name,column_name,data_type,is_nullable
from information_schema.columns
where table_schema='public' order by table_name,ordinal_position;

select grantee,table_name,privilege_type
from information_schema.role_table_grants
where table_schema='public' and grantee in ('anon','authenticated');
```

Revisa también triggers, funciones, restricciones, valores predeterminados y buckets frente a la línea base. Las diferencias deben resolverse mediante una migración adicional revisada; no las ocultes marcando una migración como aplicada.

## 2. Aplicar las migraciones únicamente al entorno elegido

**Proyecto nuevo y vacío:** aplicar primero `20261108173320_legacy_baseline.sql` y luego `20261108173327_phase1_access.sql`. El proyecto conectado ya tiene ambas migraciones registradas: no volver a ejecutarlas allí. Para futuros proyectos, usar un único método de migración y comprobar la versión de la CLI antes de ejecutar comandos.

**Proyecto existente completo:** la línea base reproduce el esquema legado. No volver a ejecutarla sobre tablas/políticas existentes. Solo después de demostrar su equivalencia, si se usará la CLI, registrar esa línea base como ya aplicada:

```text
supabase migration repair 20261108173320 --status applied
supabase migration list
supabase db push --dry-run
```

Estos comandos se ejecutan desde este repositorio, con la CLI instalada y enlazada explícitamente al proyecto de prueba. `migration repair` cambia el historial remoto: no es una comprobación de esquema. Revisa el plan antes de `supabase db push`.

Si trabajas con SQL Editor, ejecuta únicamente la migración de Fase 1 después de verificar la línea base y documenta el historial aplicado. No mezcles métodos sin reconciliar el historial.

**Proyecto parcial verificado:** el proyecto conectado contiene solo `artesanas_autorizadas`. No equivale a una línea base completa y no se debe marcar toda la línea base como aplicada. El plan específico para conservar esa tabla y crear lo que falta está en [APLICACION_FASE_1.md](APLICACION_FASE_1.md).

La migración de Fase 1 es transaccional. Sustituye todas las políticas existentes de `artesanas_perfiles` y `productos`, preserva las filas y añade guardas restrictivas a Storage. Esta sustitución requiere revisar posibles reglas personalizadas antes de aplicar. Las tablas nuevas no se vuelven a crear en ejecuciones repetidas: usa el historial de migraciones.

Los correos ya autorizados se migran a membresías para las cuentas con correo confirmado. Las cuentas antes desactivadas permanecen suspendidas. Los correos activos aún sin cuenta confirmada obtienen una autorización transitoria de 30 días, visible en invitaciones, sin envío automático de correo. Después de la migración, administra accesos desde el panel; modificar `artesanas_autorizadas` ya no cambia permisos.

## 3. Configurar Auth

En el proyecto Supabase de prueba:

1. Habilitar Email y confirmación de correo. Establecer mínimo de contraseña en 12 caracteres en el servicio remoto; el TOML local no cambia por sí solo la configuración alojada.
2. Configurar SMTP y comprobar los límites de envío. Las solicitudes pueden requerir ajustes de límites/CAPTCHA si se abre un registro público amplio.
3. Habilitar Google con Client ID y secreto guardados solo en Supabase. En Google Cloud, usar el callback exacto que muestra Supabase. Agregar usuarios de prueba si el consentimiento está restringido.
4. En URL Configuration, usar el origen del entorno elegido como Site URL y permitir exactamente sus rutas `/acceso.html` y `/restablecer.html`. Añadir `http://localhost:4173/acceso.html` y `http://localhost:4173/restablecer.html` para desarrollo.
5. Conservar las plantillas oficiales con el enlace de confirmación que respeta RedirectTo. Probar invitación, confirmación y recuperación por separado.

Las pantallas no aceptan un destino arbitrario mediante `next` o `redirectTo`. Google y recuperación vuelven a rutas fijas del origen actual. No usar comodines amplios para redirecciones de producción.

## 4. Configuración pública y Vercel Preview

El proyecto sigue siendo estático. Node 24 se utiliza para build y pruebas; no se añade un servidor frontend.

En Vercel, verificar Root Directory contra el repositorio remoto: debe ser la carpeta que contiene `package.json`, `index.html` y `vercel.json`. El checkout local tiene una carpeta contenedora adicional; no se debe asumir que también existe en GitHub.

En el entorno **Preview**, configurar:

```text
SUPABASE_URL=https://PROJECT_REF.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_CLAVE_PUBLICA
```

El build escribe solo valores públicos en `dist/assets/supabase-config.js`. También admite la clave heredada `anon`, comprobando su rol. Rechaza claves secretas y JWT con rol distinto de `anon`.

Para Live Server o `npm run preview`, completar únicamente los dos valores públicos de `assets/supabase-config.js`. El script no carga `.env` automáticamente. Sin configuración se conserva el catálogo de demostración, pero no se concede acceso privado con un clic.

`vercel.json` usa `npm run build` y publica `dist/`. No deben publicarse SQL, documentación interna, funciones backend, pruebas, Git ni node_modules. No modificar aún variables o despliegues de Production.

## 5. Administrador inicial

1. Crear una cuenta de prueba con Google o correo y confirmar su correo.
2. Copiar su UUID desde Supabase Authentication → Users, verificando la identidad.
3. En SQL Editor, con privilegios de propietario, ejecutar sustituyendo el ejemplo:

```sql
select public.khipu_bootstrap_admin('UUID_DE_LA_CUENTA_CONFIRMADA'::uuid);
```

La función no está concedida a `anon`, `authenticated` ni `service_role`; solo permite configurar la administración inicial una vez. No existe selector de rol en el frontend. Volver a iniciar sesión o recargar `/acceso.html` para entrar a `/admin.html`.

El panel no permite modificar ni suspender administradores. La incorporación posterior de otro administrador requiere un procedimiento de servidor revisado, fuera de este flujo inicial.

## 6. Invitaciones por correo

Desplegar exclusivamente la función nueva, en el proyecto de prueba:

```text
supabase functions deploy admin-invite
```

Definir en los secretos del backend, desde el panel de Supabase:

```text
KHIPU_INVITE_REDIRECT_URL=https://HOST_DE_PREVIEW/restablecer.html
```

Esa URL debe estar autorizada en Auth. La plataforma proporciona `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` a la Edge Function. No copiar la service-role key al frontend, Vercel público, archivos de ejemplo ni registros.

La función verifica el JWT con `auth.getUser()` y comprueba el rol activo mediante SQL antes de usar la API administrativa. `verify_jwt=false` delega la verificación en esa comprobación explícita y permite proyectos con distintos tipos de claves de firma; no hace público el envío de invitaciones. No retirar esas comprobaciones.

El SQL permite 10 preparaciones de invitación por administrador y hora, y espera de un minuto por correo. La aceptación exige correo confirmado y autorización vigente. Una cuenta ya registrada se administra desde su solicitud; no se usa una invitación para saltar una suspensión.

Si el proveedor falla, el panel informa que **la autorización quedó guardada pero el correo no se envió**. Puede revocarse. Para una cuenta existente sin membresía, la persona puede autenticarse con sus credenciales normales y reclamar la autorización. No se informa de un correo enviado sin confirmación del proveedor.

No desplegar ni habilitar IA como parte de esta fase: la función existente sigue sin cuotas y su control de costos pertenece a la Fase 4.

## 7. Comprobaciones locales

Desde la carpeta del repositorio, Node 24:

```text
npm ci
npm run check
npm test
npm run build
npm run preview
```

En PowerShell con bloqueo de `npm.ps1`, usar `npm.cmd` en su lugar. El preview escucha solo en `127.0.0.1:4173` y sirve HTML y assets; no permite leer SQL ni archivos internos. Cerrar con Ctrl+C.

Las pruebas SQL ejecutan las migraciones sin modificar sobre PostgreSQL embebido (PGlite), con contratos mínimos de `auth.users`, JWT y Storage. Comprueban roles reales de PostgreSQL y RLS. Las pruebas de formularios usan DOM simulado; las de la Edge Function simulan Auth y el proveedor de correo. No equivalen a una prueba alojada de Supabase Auth, envío real de correo, Deno o navegador móvil.

Resultado actualizado: **45 comprobaciones locales aprobadas**, sintaxis y referencias HTML correctas y build con Supabase configurado. Además, pasaron 10 escenarios de permisos en Supabase, con todos sus datos temporales revertidos, y 4 comprobaciones HTTP con la clave pública: catálogo accesible, lista de correos y membresías protegidas y administración bloqueada sin sesión. El host de acceso al navegador automatizado no está disponible; no se completó la revisión visual. No se ejecutó `deno check` ni se desplegó la Edge Function.

## 8. Prueba de aceptación en Preview

Usar ventanas o perfiles de navegador separados para administrador, artesana A y artesana B:

1. Visitante: catálogo sin cuenta; `/panel.html` y `/admin.html` no conceden permisos.
2. Solicitar una cuenta, confirmar correo y entrar: debe mostrar pendiente. Cambiar localStorage o metadatos no debe activarla.
3. Administrador: aprobar A. A puede entrar al panel. B continúa pendiente hasta aprobación independiente.
4. Aprobar B, crear perfiles/productos de prueba y verificar por API que A no puede editar, borrar ni atribuirse los de B. Repetir con Storage y rutas de otra cuenta.
5. Suspender A con su sesión abierta: la próxima escritura debe denegarse sin esperar a que venza el JWT; el catálogo deja de mostrar su perfil y productos. Al enfocar/volver a la pestaña privada se revalida el acceso. Reactivar y comprobar recuperación sin pérdida de datos.
6. Entrar con Google y con contraseña. Recuperar contraseña desde correo real; probar enlace vencido y contraseñas diferentes.
7. Cerrar sesión; refrescar y usar Atrás. Cambiar de cuenta en otra pestaña: no debe mostrarse el borrador ni panel de la anterior. Los access tokens de Supabase pueden seguir vigentes hasta su expiración; RLS vuelve a consultar membresías y la UI se revalida.
8. Invitar una dirección nueva; comprobar correo, contraseña, aceptación, historial y revocación antes de aceptar. Comprobar también un error de envío real.
9. Revisar 320/390/768 px y escritorio, teclado, etiquetas, estados de carga, mensajes y autofill. En Android/iPhone, probar OAuth desde el navegador y el enlace de recuperación.
10. Confirmar que solo `dist/` se publica y que ninguna clave privada aparece en el bundle o respuestas. No aprobar el paso a producción hasta completar esta matriz.

## Pendientes y límites

- El esquema y los permisos remotos están verificados. Google, SMTP, confirmación/recuperación por correo real, Deno, invitaciones y dispositivos reales requieren completar los pasos anteriores.
- No se midieron layout, accesibilidad ni rendimiento en navegador real. Las verificaciones DOM no miden esos aspectos.
- Los buckets existentes siguen siendo públicos: suspender/ocultar no revoca una URL de imagen previamente conocida. Los borradores con medios privados se resolverán en Fase 2.
- Permanecen los datos ficticios del catálogo; deben señalarse o sustituirse antes del piloto público.
- El panel limita su lista a 200 cuentas, 100 invitaciones y 100 eventos recientes; la paginación queda pendiente para mayor volumen.
- La lista de correos registra una instantánea de la identidad. Cambios de correo, eliminación de cuentas y transferencia de administración requieren procedimientos posteriores.
- El SDK del navegador y los imports de las dos funciones están fijados en `2.119.0`. La función de IA no se desplegó y sigue pendiente de cuotas en Fase 4.
- Productos avanzados, dictado, cuotas IA, Meta, pagos y moderación de contenido corresponden a las siguientes fases.

## Referencias oficiales revisadas

- [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Recuperación de contraseña](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail)
- [Cambios de autenticación](https://supabase.com/docs/reference/javascript/auth-onauthstatechange)
- [Invitaciones administrativas](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail)
- [URLs de redirección](https://supabase.com/docs/guides/auth/redirect-urls)
- [Historial de migraciones](https://supabase.com/docs/reference/cli/supabase-migration-repair)
- [Configuración de Vercel](https://vercel.com/docs/project-configuration)
