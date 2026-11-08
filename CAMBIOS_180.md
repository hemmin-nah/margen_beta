# MARGEN Desktop 1.8.0 — Exportación editorial

## Incluido

- **DOCX** editable, generado sin Word instalado: capítulos seleccionados y en orden, títulos, texto, negritas, cursivas, subrayados, encabezados, listas visibles, tablas sencillas e imágenes PNG/JPEG/WebP/GIF convertibles. Papel, tipografía, tamaño, márgenes, interlineado y saltos de capítulo.
- **PDF** con texto seleccionable, varias páginas, separación de capítulos, negritas, cursivas, listas visibles e imágenes; opciones de tamaño de hoja y márgenes. Los colores tipográficos de Word no se reproducen (de acuerdo con la política actual de tinta del manuscrito).
- **TXT** en UTF‑8 con BOM, sin formatos ni imágenes, por diseño. Se marca la posición de las imágenes.
- Exportación **total o de capítulos elegidos**, desde «Vista general» o «Manuscrito»/«Guion». No cambia la base SQLite ni las novelas.
- Ventana con vista previa **orientativa**, no un motor de maquetación de imprenta.
- En el ejecutable Tauri los archivos van a **Descargas** con sufijo único para evitar sobrescritura accidental. El usuario recibe la ruta completa.
- Menús y diálogos nuevos en español/inglés, según MARGEN.

## Límites conocidos y decisiones técnicas

1. **PDF básico para narrativa**: utiliza las fuentes estándar PDF (Times, Helvetica o Courier); «Georgia» se sustituye por Times en PDF. No se incrustan fuentes externas ni se asegura que cualquier carácter de alfabetos no latinos se conserve: el generador informa cuando sustituye caracteres no compatibles. DOCX y TXT sí conservan Unicode. Para documentos con alfabetos no latinos recomendamos DOCX mientras ampliamos el generador PDF.
2. PDF no conserva estructuras tabulares: coloca las celdas como texto separado. DOCX conserva las tablas sencillas como tablas. PDF avanzado, páginas enfrentadas, viudas/huérfanas, imprenta y cubierta pertenecen a **GALERADA**.
3. La vista previa reproduce el aspecto general del primer capítulo seleccionado, **no el paginado exacto** del PDF ni de Word.
4. No se importan imágenes mediante enlaces remotos. Las imágenes locales embebidas se procesan dentro del equipo; si una no se puede leer se advierte al usuario. Imágenes individuales de más de 18 MB se omiten con aviso, y el total embebido se limita a 80 MB.
5. Hay un límite de exportación de 95 MB por archivo y el proceso usa memoria. Las bibliotecas gigantes requieren aún mejoras de almacenamiento y pruebas de Windows (plan 1.9).
6. Los bloques de guion se exportan como párrafos enriquecidos básicos, no como un guion cinematográfico profesional con sangrías tipográficas específicas; esa composición se evaluará más adelante.
7. No se abre un cuadro para elegir carpeta: se utiliza **Descargas**, como en las copias JSON, y se informa de la ruta.

## Verificado en el entorno de pruebas

- DOCX generado abierto con `python-docx` y representado visualmente mediante LibreOffice; tipografía, negritas, cursivas, imágenes, las dos columnas de la tabla y salto de capítulo comprobados.
- PDF validado por `pdfinfo`, texto extraído con `pdftotext`, 2 páginas y prueba adicional de **120 capítulos / 120 páginas**.
- TXT validado como UTF-8, incluyendo tildes y ñ.
- Exportación de un solo capítulo, edición sin modificación del libro, acceso desde Biblioteca/Manuscrito y ambas interfaces de idioma.
- Revisión estática JavaScript + pruebas de navegación.

**Sin verificar**: compilación Rust/Tauri en Windows y guardado real en Descargas con WebView2, así como importación/descarga completa de los recursos léxicos de la 1.7.3. No considerar la 1.8.0 distribuible hasta superar dichas pruebas.
