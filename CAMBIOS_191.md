# MARGEN Desktop 1.9.1 — Almacenamiento y rendimiento

Esta versión es deliberadamente técnica. No añade herramientas, secciones ni cambios de flujo.

## Corregido

- El panel izquierdo de **Exportación editorial** ya no desborda por detrás del pie de la ventana: su fila interna queda limitada al alto real disponible y el contenido se desplaza dentro del propio panel. Esto mantiene completamente accesible el campo **Interlineado** incluso en ventanas bajas. Los cuatro márgenes continúan mostrándose en dos columnas.
- Se mantiene exactamente la misma configuración del exportador de 1.9.0: formato, capítulos, página, márgenes, tipografía, tamaño, interlineado y saltos de capítulo.

## Nuevo almacenamiento interno

- La biblioteca deja de escribirse como una sola instantánea SQLite en cada autoguardado.
- SQLite separa ahora:
  - la cabecera global de MARGEN;
  - el orden de los libros;
  - versiones inmutables de cada libro.
- Un autoguardado normal envía y escribe **sólo el libro modificado**. Los libros sin cambios reutilizan su versión ya almacenada.
- El contenido de cada versión se identifica por SHA-256. Si el contenido no cambia, no se duplica.
- La recuperación anterior usa referencias a las versiones previas, en vez de copiar otra vez todos los textos e imágenes.
- Las versiones de libro que ya no pertenecen ni al guardado actual ni al recuperable se eliminan de la tabla de versiones.
- Las imágenes siguen externalizadas por SHA-256 en el almacén de medios y no se duplican por cada guardado.

## Arranque y memoria

- En un arranque normal sólo se reconstruye la biblioteca principal.
- La copia de recuperación ya no se carga completa en RAM sólo para saber que existe.
- La recuperación se materializa cuando el guardado principal falla o cuando la persona pulsa **Recuperar**.

## Migración desde 1.9.0

- La primera apertura de 1.9.1 detecta la base monolítica anterior y la migra al esquema por libro.
- Se mantienen IDs de libros, JSON v1, `com.margen.escritorio`, medios y ruta de datos.
- Las filas monolíticas de 1.9.0 **no se eliminan** durante la migración: quedan como red de seguridad heredada.
- Si la recuperación 1.9.1 no pudiera abrirse, el backend intenta todavía la recuperación monolítica válida de 1.9.0.
- El control de conflicto entre dos ventanas continúa usando un token transaccional de biblioteca.

## Copias

- Se mantienen las dos autocopias JSON como máximo y el intervalo aproximado de 24 horas.
- Generar una autocopia completa sí requiere reconstruir la biblioteca entera, pero ocurre como máximo una vez por ese intervalo, no en cada autoguardado.
- Las copias JSON manuales siguen usando el formato v1 completo y portable.

## Pruebas

Se añadió `pruebas/test_191_storage.py`, que comprueba en WebView simulado:

- que editar Libro A envía sólo Libro A al guardado incremental;
- que el orden completo de la biblioteca se conserva;
- que editar Libro B no vuelve a enviar Libro A;
- que la recuperación puede anunciarse sin cargar su payload al inicio;
- que el panel del exportador tiene scroll vertical real, no supera el alto disponible y que la caja completa de **Interlineado** queda dentro del área visible después de desplazarlo.

Los tests Rust añadidos comprueban reutilización de versiones idénticas y que `workspace` / `recovery` compartan el mismo payload de libro en vez de duplicarlo.

## Límite que sigue siendo real

1.9.1 reduce de forma importante el trabajo de **guardado** y evita cargar dos bibliotecas completas al arrancar, pero la biblioteca principal actual todavía se reconstruye en memoria para mantener compatibilidad con la interfaz existente. Por tanto, no se afirma todavía fluidez garantizada con cientos de libros enormes. Una carga verdaderamente perezosa por libro sería otro cambio arquitectónico y no se ha metido a escondidas en esta versión.
