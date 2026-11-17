# MARGEN 1.13.1 · prueba rápida

1. Abre el botón de **Exportar JSON** de la cabecera.
2. Elige **Biblioteca completa** y comprueba que se guarda una copia normal de todos los libros.
3. Vuelve a abrirlo, selecciona **Un solo libro**, cambia el libro del desplegable y expórtalo.
4. Abre el JSON individual con un editor de texto: debe comenzar con `format: MARGEN_BOOK`, `formatVersion: 1` y contener un único campo `book`.
5. Comprueba que el libro exportado conserva capítulos, fichas, escenarios, pizarras, escaleta, cronología, genealogía/relaciones e imágenes del propio libro.
6. Comprueba que exportar no modifica ni borra nada de la biblioteca.
7. Haz una prueba rápida de Pizarra y Editor para confirmar que la actualización no ha introducido regresiones.

> La importación de `MARGEN_BOOK` todavía no está activada; el formato queda preparado para añadirla después sin sustituir la biblioteca existente.
