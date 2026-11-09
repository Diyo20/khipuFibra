GATE: OPEN — permanecen los 15 hallazgos del rediseño general registrados en `REDISENO_TIENDA.md`. Este incremento funcional no los declara resueltos.

# Galería de productos · 9 de noviembre de 2026

## Funciones disponibles

Cada producto puede guardar una foto principal y hasta dos adicionales. Se puede seleccionar un lote, reemplazar la principal, quitar fotos o convertir una adicional en principal. Quitar la principal promueve la siguiente foto. La ficha pública muestra las tres y permite cambiar la vista con sus miniaturas.

Los borradores, las ediciones y las copias conservan la galería y su orden. Cualquier cambio de fotografías revoca su aprobación y requiere revisar de nuevo antes de publicar. La preparación del encuadre se aplica a la principal; las otras fotos se conservan.

No se anuncia un guardado exitoso si falla una carga o la escritura en la base. Las cargas que ya terminaron se reutilizan al reintentar desde la misma pestaña. Se validan cantidad, formato, tamaño y pertenencia de las URLs conservadas antes de guardar. Cambiar de cuenta cancela el uso de resultados pendientes de la cuenta anterior.

## Base de datos

La ampliación remota se aplicó **después de la autorización explícita del usuario**. Versión registrada en Supabase: `20261109132705`, nombre `product_gallery`. El archivo local se renombró para coincidir con ese historial; la propuesta anterior era `20261108222826_product_gallery.sql`.

- `image_url`: fotografía principal existente.
- `gallery_urls`: arreglo no nulo de hasta dos fotografías adicionales; su valor inicial es vacío.
- `khipu_public_catalog`: devuelve las adicionales como `photos`; mantiene los filtros de perfil visible, artesana activa y producto publicado.
- No se ampliaron las políticas RLS ni los privilegios. El wrapper público sigue como invocador; la implementación conserva su propietario, ACL y `search_path` vacío.

La detección del esquema permite desplegar el frontend también en un entorno que todavía no tenga esta migración: allí funciona el guardado de una foto y se desactiva la carga adicional con una explicación. No se descartan silenciosamente las fotos de un borrador.

No se borran archivos de Storage al quitar una foto de la galería: otro producto duplicado puede seguir utilizándolos. Se elimina únicamente la referencia del producto cuando se guarda. La limpieza de archivos sin referencias sigue pendiente.

## Validación

- `npm run check`, **90 pruebas** en `npm test`, y `npm run build` aprobados.
- Pruebas de galería: carga de tres fotos, reemplazo, selección de principal, eliminación, reapertura, publicación, copia, límites, fotos ajenas, errores parciales y reintentos.
- Pruebas de compatibilidad con el esquema anterior y errores de red durante su detección.
- `supabase/tests/phase1_remote_smoke.sql` ejecutado en Supabase: persistencia, reordenamiento, límite, galería pública, aislamiento entre propietarias y suspensión aprobados. Sus registros temporales se revirtieron; después seguían **2 cuentas, 0 perfiles y 0 productos**.
- Advisors: sin hallazgos de salud o rendimiento ni nuevas advertencias de seguridad. Persisten las tablas de acceso cerradas intencionalmente y la advertencia previa sobre protección de contraseñas filtradas, que no se modificó en este incremento. Referencias: [tablas con RLS sin política](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) y [protección de contraseñas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- Cuerpo del editor revisado en navegador a 1440, 1024, 768, 390 y 320 px. Fixtures locales sintéticos generados con `node scripts/workspace-fixtures.cjs`; reutilizan tres tamaños de la fotografía editorial de referencia únicamente para verificar distribución. No se añadieron artesanas ni productos ficticios a la base.

La validación automatizada de Storage usa respuestas simuladas en el frontend y permisos de metadatos en PostgreSQL. Queda pendiente probar el archivo de un teléfono real en una cuenta artesana; no se presenta como una prueba de carga autenticada completa en navegador.

Respaldos previos: `.backups/antes-galeria-20261109.bundle`, verificado, y `.backups/schema-before-gallery-20261109.json` con la definición y permisos anteriores. No contienen una exportación de credenciales.

## Cómo probar

1. Abrir la Preview de desarrollo, iniciar sesión con una cuenta artesana activa y guardar su perfil si está pendiente.
2. En Agregar producto, elegir una foto principal y agregar hasta dos más.
3. Guardar borrador y volver a abrirlo desde Mis productos: deben conservarse las tres fotos.
4. Elegir otra principal y quitar o reemplazar una fotografía.
5. Aprobar fotografías y descripción, y publicar.
6. Abrir la ficha desde incógnito y cambiar de fotografía con las miniaturas.

Este incremento no fusiona `main` ni publica la web de producción. El siguiente bloque funcional sigue siendo la administración de productos y valoraciones; IA, redes y planes/pagos permanecen pendientes según el alcance original.
