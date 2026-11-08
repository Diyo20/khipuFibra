# Revisión del proyecto Supabase existente

Fecha: 8 de noviembre de 2026. Revisión de solo lectura mediante la integración de Supabase y el endpoint público de configuración de Auth. No se aplicaron migraciones, no se crearon usuarios y no se modificaron datos ni claves.

Este documento conserva el diagnóstico anterior a la implementación. Para el estado después de las migraciones aprobadas y sus pruebas, consultar [APLICACION_FASE_1.md](APLICACION_FASE_1.md).

## Proyecto identificado

- Nombre: Diyo20's Project.
- Referencia: `yaksomcgqtnmsczvvyzs`.
- Estado comunicado por Supabase: `ACTIVE_HEALTHY`.
- PostgreSQL: `17.11.0.018`.
- Región: `us-east-1`.
- URL pública: `https://yaksomcgqtnmsczvvyzs.supabase.co`.

## Estado comprobado

| Elemento | Resultado |
| --- | --- |
| Tablas de la aplicación en `public` | Solo `artesanas_autorizadas` |
| Filas de esa tabla | 2, ambas activas; no se copiaron correos al informe |
| Usuarios en `auth.users` | 0 |
| Identidades de autenticación | 0 |
| Perfiles, productos y valoraciones remotos | Sus tablas todavía no existen |
| Membresías, invitaciones e historial administrativo de Fase 1 | Sus tablas todavía no existen |
| Buckets de Storage | Ninguno |
| Migraciones registradas | Ninguna; la tabla existente fue creada sin historial de migraciones |
| Edge Functions desplegadas | Ninguna |
| Email en Auth | Habilitado |
| Registro de cuentas | Habilitado |
| Confirmación de correo | Requerida (`mailer_autoconfirm=false`) |
| Google en Auth | Deshabilitado |
| Claves públicas | Una publishable y una anon heredada habilitadas; valores omitidos |
| Configuración local del frontend | URL y clave pública vacías |
| Advisories de salud y rendimiento | Sin avisos en la consulta realizada |

No se verificaron las credenciales OAuth de Google, SMTP, límites de correo, Site URL ni la lista de redirecciones permitidas: esos parámetros no están expuestos por las herramientas consultadas. No se realizaron envíos, inicios de sesión ni recuperaciones de contraseña reales.

## Seguridad

La tabla `artesanas_autorizadas` tiene RLS habilitado, sin políticas ni permisos concedidos a `anon` o `authenticated`. Para una lista privada gestionada en servidor, no se debe añadir una política pública solo para quitar el aviso informativo de RLS sin políticas.

Existe un trigger de eventos `ensure_rls`, que llama a `public.rls_auto_enable()` al crear tablas. Se inspeccionó su definición: habilita RLS en tablas nuevas del esquema `public`, usa `search_path=pg_catalog` y devuelve `event_trigger`.

Security Advisor marca permisos EXECUTE de esa función para visitantes y usuarios autenticados:

- [Aviso para anon](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable).
- [Aviso para authenticated](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

Su tipo es un trigger de eventos, no una función normal de negocio. El aviso no demuestra que alguien haya podido acceder a correos o modificar permisos mediante una llamada RPC. Conviene restringir los permisos de ejecución innecesarios al preparar la migración, conservando el trigger automático. No se cambió durante esta revisión.

## Consecuencia para la Fase 1

El proyecto está creado, pero solo contiene la lista inicial de dos correos. Aún no tiene el backend de la aplicación ni el esquema preparado en la rama de desarrollo. Tener esos correos registrados no equivale a tener dos usuarias autenticadas.

El esquema remoto es **parcial**: no se puede marcar toda la línea base local como aplicada. Para avanzar:

1. Respaldar la tabla existente y su definición sin publicar información personal.
2. Preparar la adopción de esa tabla y crear los objetos que faltan, conservando las dos filas. Comparar las restricciones y los permisos antes de aplicar.
3. Aplicar las membresías y políticas de Fase 1 y comprobar el resultado con los roles de PostgreSQL.
4. Conectar exclusivamente la vista previa al proyecto elegido con URL y clave pública.
5. Configurar redirecciones, correo y Google; desplegar la función de invitaciones.
6. Crear y confirmar la cuenta administradora con intervención de su titular y asignar el rol mediante el procedimiento SQL restringido.
7. Ejecutar pruebas reales de autenticación y aislamiento entre dos artesanas antes de publicar.

Los pasos anteriores son trabajo pendiente, no acciones ejecutadas por esta revisión. No se creó un proyecto nuevo ni se incurrió en una contratación nueva.

## Documentación vigente revisada

- [RLS y habilitación automática](https://supabase.com/docs/guides/database/postgres/row-level-security).
- [Cambio a permisos explícitos para nuevas tablas](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically): la preparación debe conceder solo los permisos que necesita cada rol.
- [Historial de cambios](https://supabase.com/changelog.md): la CLI v3 cambió el destino predeterminado a local; antes de usar los comandos de la guía anterior se debe comprobar la versión instalada y su ayuda. No se ejecutaron comandos de migración remota.
