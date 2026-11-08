# Aplicación de la Fase 1 al proyecto existente

Proyecto revisado: `yaksomcgqtnmsczvvyzs` (Diyo20's Project).
Estado actualizado, 8 de noviembre de 2026: **ambas migraciones aplicadas con aprobación explícita del titular**. Se verificó el respaldo, la conservación de datos y los permisos remotos. El titular confirmó la configuración de URLs de Auth y el acceso administrativo. Continúan pendientes recuperación por correo, Google y el envío real de invitaciones.

Actualización de acceso: el titular informó que guardó las URLs de Auth, creó y confirmó su cuenta. Se verificó `email_confirmed_at`, se ejecutó el procedimiento restringido de administrador inicial y se comprobó rol `admin`, estado `active` y evento de auditoría. El titular confirmó que pudo entrar al panel. Su correo personal no se incorpora al código público.

La función `admin-invite` se desplegó después de la aprobación explícita del titular. Estado verificado: `ACTIVE`, versión 1. Se probaron preflight (200), método no permitido (405), solicitud sin sesión (401) y token inválido (401). No se prepararon ni enviaron invitaciones durante las comprobaciones. Google OAuth y la recuperación por correo siguen pendientes de prueba.

Migraciones registradas en Supabase y sincronizadas con los nombres de archivo del repositorio:

- `20261108173320_legacy_baseline.sql`
- `20261108173327_phase1_access.sql`

## Respaldo verificado

Se guardó una copia local de las 2 filas originales de `artesanas_autorizadas`, su esquema, restricciones, permisos y políticas en:

```text
.backups/supabase-before-phase1-2026-11-08.json
```

El archivo contiene información personal y está excluido de Git y del build público mediante `.gitignore` y la lista permitida del build. Se comprobó su lectura, integridad y contenido. SHA-256:

```text
1bb0a1c6e8e7b014ce76f0ae051c410a53b05826270fc18833a07cb4fbf07b64
```

Antes de aplicar, las 2 filas coincidían con el respaldo y había 0 usuarios Auth. Después de aplicar y probar los permisos, las 2 filas originales siguen idénticas; hay 0 usuarios permanentes, 0 productos y 0 objetos almacenados. Se crearon 2 autorizaciones transitorias y 1 evento de importación. Esta copia no es un respaldo completo de la plataforma; antes de la migración no había otros datos de la aplicación ni archivos de Storage.

## Cambios aplicados

Las dos migraciones de `supabase/migrations/` realizaron:

1. Conservar `artesanas_autorizadas` y sus 2 registros, sin eliminarlos ni reemplazarlos.
2. Crear 6 tablas: `artesanas_perfiles`, `productos`, `valoraciones`, `khipu_memberships`, `khipu_invitations` y `khipu_admin_events`.
3. Habilitar RLS y conceder permisos mínimos por operación. La lista de correos y las tablas de permisos no quedan disponibles para lectura directa desde el navegador.
4. Crear `khipu_private` para las funciones privilegiadas. La API pública mantiene funciones con privilegios del llamador; los controles de sesión, propiedad y administración se ejecutan en servidor.
5. Crear los buckets **públicos** `productos` y `perfiles`. Sus fotografías tendrán URLs públicas. Solo una artesana activa podrá subir en su carpeta; formatos PNG/JPEG/WebP y límites de 5 MB/3 MB. La creación no sube ninguna fotografía.
6. Convertir los dos correos previamente autorizados en autorizaciones transitorias de 30 días, que solo podrán reclamarse tras confirmar el correo. No se envían invitaciones automáticamente.
7. Incorporar aprobación, rechazo, suspensión, reactivación y auditoría. No se elimina contenido al suspender una cuenta.
8. Restringir EXECUTE de `rls_auto_enable()` para los roles del navegador, conservando su trigger automático.
9. Añadir índices para consultas de propiedad y correo.

El primer intento fue rechazado por revisión automática y no ejecutó cambios. El titular aprobó expresamente las dos migraciones con este alcance; después se aplicaron mediante la herramienta de migraciones. No se utilizó SQL directo para evitar la revisión.

## Validación completada

- **47 comprobaciones locales aprobadas**, incluyendo migración sobre un esquema parcial existente, conservación de filas, separación de cuentas, restricciones administrativas, funciones privilegiadas fuera de `public`, errores comprensibles en invitaciones y destino de correo fijo para el piloto.
- Respaldo excluido de Git y de la publicación.
- 10 escenarios de permisos aprobados en Supabase mediante `supabase/tests/phase1_remote_smoke.sql`. La subtransacción de pruebas revirtió todas las cuentas, productos, objetos y acciones sintéticas.
- Pruebas HTTP con clave pública: catálogo 200; correos privados 401; membresías privadas 401; administración sin sesión 401.
- Pruebas HTTP de `admin-invite`: OPTIONS 200, GET 405, POST sin sesión 401 y POST con token inválido 401. El despliegue está activo y la validación del usuario se realiza en el cuerpo de la función.
- Advisories sin WARN/ERROR: permanecen avisos informativos de RLS sin políticas en tablas que no tienen permisos directos del navegador, e índices nuevos aún sin uso.

El titular completó registro, confirmación y acceso real al panel. La recuperación real, Google, envío de invitaciones y revisión visual automatizada siguen pendientes. Las pruebas SQL entre artesanas simulan identidad mediante los roles de PostgreSQL; no sustituyen un inicio de sesión con dos artesanas reales.

## Continuación

1. Completado: aplicar la línea base y los accesos y comprobar las filas originales.
2. Completado: sincronizar las versiones y volver a ejecutar las pruebas locales.
3. Completado: probar permisos remotos y revisar asesores sin dejar datos sintéticos permanentes.
4. Configuración pública completada en la rama de desarrollo. Generar y comprobar su nueva Vercel Preview; no mezclar con `main` ni promover a producción.
5. Completado según confirmación del titular: configurar las URLs permitidas de Auth para esta vista previa:

```text
https://khipufibra-git-develop-khipufibra-fase-1-khipu-fibra.vercel.app/acceso.html
https://khipufibra-git-develop-khipufibra-fase-1-khipu-fibra.vercel.app/restablecer.html
```

6. Completado: el titular creó y confirmó su cuenta; se asignó el rol administrador con el procedimiento restringido y se verificó su auditoría. El titular confirmó el acceso al panel.
7. Preparar el cliente OAuth de Google. El callback del proyecto es:

```text
https://yaksomcgqtnmsczvvyzs.supabase.co/auth/v1/callback
```

8. Completado: desplegar `admin-invite` con aprobación explícita y comprobar el rechazo de peticiones anónimas o inválidas. El destino fijo de este piloto está en el código del servidor, solo se aplica al proyecto verificado y puede reemplazarse con `KHIPU_INVITE_REDIRECT_URL`. La función comprueba sesión y rol activo antes de usar la API administrativa. Para una prueba de envío real se necesitará que el titular indique el destinatario o la realice desde el panel; todavía no se afirma que la entrega y aceptación de correo estén probadas.

La integración actual permite consultar la base y desplegar funciones, pero no expone una operación para editar los parámetros de Google/SMTP/URL Configuration de Auth. Esos ajustes pueden requerir intervención del titular en el panel. Google OAuth aún no está creado; el primer recorrido se probará mediante correo.

Avisos informativos revisados: [RLS sin políticas](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [índices sin uso](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index). No se añadieron políticas públicas a tablas privadas ni se eliminaron índices recién creados para silenciarlos.
