# MARGEN 1.13.2 · Guía de prueba de la pizarra

1. Abre un libro de **prueba** y una pizarra libre. Crea dos notas o imágenes y dibuja un trazo.
2. Activa **Seleccionar (V)** y arrastra el trazo. Debe moverse el dibujo, sin abrirse un rectángulo de selección.
3. Haz clic sobre el **fondo vacío**: el trazo deja de tener contorno de selección. Haz clic en una nota y vuelve a pulsar en el fondo: también se deselecciona.
4. Selecciona nota, imagen y trazo con **Ctrl+clic** (o dibujando un marco desde un área vacía) y pulsa **Agrupar** o **Ctrl+G**.
5. Arrastra uno de ellos: todo el grupo debe moverse manteniendo las posiciones relativas. Prueba también a arrastrar desde un trazo.
6. Pulsa **Ctrl+Z**, después **Ctrl+Y**: debe deshacerse y rehacerse el movimiento.
7. Pulsa **Desagrupar** (Ctrl+Mayús+G). Arrastra uno de los objetos: los demás deben quedarse en su sitio.
8. Agrupa de nuevo y prueba **Ctrl+C / Ctrl+V**. El nuevo grupo debe moverse independientemente del original.
9. **Guarda y cierra la aplicación**; vuelve a abrirla y comprueba que el grupo conserva sus miembros. Haz esta prueba con contenido de prueba, no con la única copia de un manuscrito.
10. Confirma que **Exportar JSON → Un solo libro** continúa funcionando igual que en 1.13.1.

Si encuentras un fallo, anota el paso concreto, la herramienta activa y si ocurrió con trazos, imágenes, notas o sellos.
