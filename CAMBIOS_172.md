# MARGEN Desktop 1.7.2 — Diálogos y limpieza visual

## Qué ha cambiado

- Sistema único de diálogo modal para las confirmaciones y avisos que antes llamaban a `confirm()` o `alert()` del navegador. Se han convertido **30 llamadas de confirmación** y **16 llamadas de aviso** del frontend principal.
- Diálogos centrados, con fondo atenuado, compatibles con los temas claro/oscuro, el color de acento y español/inglés.
- Acciones destructivas con botón rojo. «Cancelar», Escape o pulsar fuera **nunca aceptan** una eliminación. Foco inicial en «Cancelar», navegación de teclado y devolución del foco.
- Las preguntas sobre el ámbito de los sellos ofrecen «Solo este libro» y «Todos mis libros», en lugar de confundir Cancelar con un permiso de alcance.
- Las confirmaciones de restauración y de importación con advertencias esperan a que la persona responda. No se modifica la estrategia de guardado.
- En la vista de Escaletas se elimina solamente el encabezado duplicado «Escaletas»/«Outlines» bajo «Libro · Planificación». Se conserva el título de la escaleta concreta, los controles y la lista de escenas.
- El número de versión visible, de Tauri, del paquete npm y del workflow pasa a 1.7.2.

## Límites / precauciones

- Solo se sustituyen `confirm()` y `alert()` **de MARGEN**. Los avisos de permisos de Windows y los controles del sistema no pueden personalizarse libremente.
- Quedan modales antiguos de formularios con diseño propio: no se ha reescrito su lógica en esta revisión.
- El diálogo de confirmación es ahora **asíncrono**: las funciones antiguas que lo llamaban han sido adaptadas con `async`/`await`; hay que seguir probándolas en Windows.
- No se ha recompilado Rust ni generado un ejecutable .exe en este entorno. El proyecto continúa usando el mismo SQLite y estructura de datos que 1.7.1.
- Copia tus libros en JSON antes de instalar nuevas versiones.

## Pruebas reproducibles

```bash
python herramientas_frontend.py
npm run check:frontend
python pruebas/verificar_proyecto.py
python pruebas/test_172_dialogos.py
python pruebas/test_171_experience.py
```

Las pruebas de navegador se ejecutaron con Tauri simulado. No constituyen una prueba del instalador ni de SQLite real en Windows.
