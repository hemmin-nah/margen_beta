# MARGEN 1.13.2 Beta — Pizarra: selección y grupos reales

**Base:** proyecto funcional 1.13.1 aportado para esta revisión. No se reemplaza el editor ni la exportación de libro individual.

## Correcciones

1. **Al mover un trazo libre ya no se abre el marco de selección.** El marco de área empieza únicamente al arrastrar sobre fondo vacío (umbral de 5 píxeles).
2. **Clic en fondo vacío deselecciona trazos, notas, imágenes y grupos.** El borde de un trazo seleccionado desaparece; seleccionar otro grupo o pulsar Esc también limpia la selección anterior.
3. **Agrupar funciona realmente.** Se asigna un identificador común `groupId` a las notas, imágenes, textos y trazos de la selección. Al mover un miembro, se mueve el conjunto conservando las distancias relativas. Los sellos vectoriales siguen usando `stampInstanceId`.
4. **Desagrupar** rompe el `groupId` del conjunto seleccionado sin borrar sus elementos ni sus trazos.
5. **Atajos e historial:** Ctrl+G agrupa; Ctrl+Mayús+G desagrupa; Ctrl+Z / Ctrl+Y restauran agrupación y movimientos. Copiar/pegar genera ID nuevos para el grupo pegado, sin vincularlo al original.
6. **Selección múltiple mixta:** Ctrl+clic, Mayús+clic y selección rectangular reconocen trazos y elementos de la pizarra.

## Compatibilidad

- La propiedad `groupId` opcional se almacena como parte de cada objeto en los datos JSON existentes del libro. **No cambia el esquema SQLite** ni el formato de exportación/importación.
- Se conservan los módulos, temas, exportación `MARGEN_BOOK` y workflow para Windows de la base.
- El proyecto sigue estando preparado para generar el instalador Windows por GitHub Actions. **Este ZIP contiene el proyecto, no el .exe compilado.**

## Verificación

Se han comprobado en Chromium con un backend simulado el movimiento de trazos, la selección/deselección, los grupos mixtos, desagrupar, el historial, la selección rectangular y el pegado independiente. Esto **no equivale** a probar el instalador en Windows ni el guardado real en SQLite. Pruebas complementarias en el equipo beta recomendadas.
