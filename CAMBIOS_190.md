# MARGEN Desktop 1.9.0 — Exportación configurable y copias automáticas

## Realizado

- Eliminada la línea superior del pie del cuadro de exportación que rompía su continuidad visual.
- Márgenes por separado: superior, derecha, inferior e izquierda, en milímetros, con pasos de 0,5 y valores de 0 a 80. La salida debe conservar un área de texto mínima de 30 × 40 mm.
- Tamaño de letra con valor numérico de 7 a 36 pt, paso de 0,5 pt; interlineado de 1 a 3, paso de 0,05.
- Márgenes aplicados al DOCX (OOXML `w:pgMar`) y al PDF (composición real de texto e imágenes), además de la vista previa.
- El cuadro de guardado nativo de Windows permite elegir carpeta y nombre para exportar DOCX, PDF, TXT o JSON. Los accesos antiguos a exportar texto se redirigen al cuadro editorial.
- Cancelar «Guardar como» no crea un archivo ni anuncia éxito. El backend impide sobrescribir un archivo existente: en su lugar, incorpora un sufijo numérico y muestra la ruta definitiva.
- Dos copias automáticas JSON completas como máximo, aproximadamente una cada 24 horas después de un guardado correcto, bajo `AppData` de MARGEN. Se conservan los dos últimos archivos; la nueva copia se termina antes de eliminar la más antigua. Si falla, la interfaz lo advierte una vez por sesión.
- Se mantienen los identificadores de libros, el formato JSON v1, la base SQLite y la clave de aplicación `com.margen.escritorio`. No se destruyen ni se migran libros existentes.

## Qué se ha probado

- El generador real de DOCX y PDF con cuatro márgenes asimétricos, 12,5 pt, interlineado 1,75, dos capítulos y acentos.
- Validación de límites y cancelación de guardado simulada.
- Regresión del exportador 1.8 para negritas, tablas e imágenes; comprobación visual de la ventana.
- Validación sintáctica JavaScript. Se añaden pruebas Rust de no sobrescritura y rotación de copias para ejecutar con `cargo test`.

## Pendiente antes de distribuir

1. Compilación efectiva Rust/Tauri y prueba del selector nativo de Windows. No se ha compilado aquí un `.exe`.
2. Prueba con la biblioteca real, después de cerrar y volver a abrir el programa, y actualización 1.8 → 1.9 con copia previa.
3. **Rendimiento a escala**: el esquema actual sigue cargando y reescribiendo la biblioteca entera. Las copias automáticas y el selector no resuelven el trabajo pendiente de **carga perezosa y persistencia incremental por libro**. No podemos garantizar todavía fluidez con 500 libros grandes. Eso deberá ser un subbloque posterior de 1.9.
4. Autocopias no equivalen a una copia externa desconectada del disco. Exportar JSON a un segundo disco sigue siendo aconsejable.

La exportación PDF sigue siendo básica y no garantiza Unicode no latino; DOCX y TXT conservan Unicode. GALERADA se reserva para maquetación avanzada, EPUB y preimpresión.
