# MARGEN Desktop 1.10.0 — Biblioteca bajo demanda y diccionarios protegidos

## Objetivo de esta versión

1.10.0 no añade herramientas creativas nuevas. Cierra dos tareas de infraestructura: reducir lo que MARGEN carga al arrancar y garantizar que un instalador de distribución no pueda salir sin sus recursos léxicos.

## Biblioteca bajo demanda

- SQLite conserva el esquema incremental por libro introducido en 1.9.1.
- Se añade `book_summaries`, un índice ligero por versión de libro.
- Al arrancar, MARGEN carga la cabecera global y las fichas ligeras de los libros, no todos sus manuscritos, pizarras, galerías e imágenes.
- El contenido completo de un libro se recupera con `desktop_load_book` únicamente cuando una vista necesita abrirlo.
- Las portadas se recuperan por separado con `desktop_load_cover`, para no obligar a materializar el libro completo solo por mostrar la Biblioteca.
- Si se cerró MARGEN dentro de un libro, en el siguiente arranque se materializa únicamente ese libro para restaurar la ruta.
- Los índices ligeros nunca se envían como contenido de libro al guardado incremental.

## Copias, recuperación y seguridad

- Las copias JSON siguen usando el formato v1 completo.
- Si hay libros todavía ligeros al exportar una copia, se materializan en ese momento antes de generar el JSON.
- La copia por conflicto entre ventanas también se materializa completa.
- Recovery, autocopias, tokens de conflicto, versiones inmutables por libro y medios por SHA-256 se mantienen.
- La primera generación de un resumen para una versión antigua se guarda en SQLite; los siguientes arranques pueden reutilizarlo.

## Diccionarios ES/EN

El sistema léxico sigue siendo offline durante el uso. Para el instalador de Windows:

- `herramientas_lexicas.py --build` obtiene y transforma las fuentes aprobadas.
- `herramientas_lexicas.py --verify` comprueba después que existen las tres SQLite, pasan `PRAGMA quick_check` y superan los mínimos de entradas esperados.
- Tauri enumera las tres bases y `SOURCE_MANIFEST.json` como recursos **exactos**, no mediante un glob permisivo. Si falta una base, el empaquetado debe fallar en lugar de producir un instalador con la pantalla de Diccionario pero sin datos.
- Las licencias y el manifiesto de procedencia se publican junto al artefacto del workflow.

Bases esperadas:

- `english.sqlite3` — Open English WordNet 2025.
- `spanish-synonyms.sqlite3` — Spanish WordNet / MCR 3.0.
- `spanish-definitions-CC-BY-SA.sqlite3` — definiciones procedentes de Wikcionario mediante Wiktextract/Kaikki.

Las bases generadas no se guardan dentro de este ZIP de fuentes: se generan y verifican en GitHub Actions antes de compilar. El **instalador final sí debe contenerlas**. Esto evita mantener binarios léxicos enormes en el repositorio y, desde 1.10.0, tampoco permite que su ausencia pase desapercibida.

## Pruebas añadidas

`pruebas/test_110_lazy.py` verifica en navegador con backend simulado que:

- el arranque no materializa libros completos;
- el contador de palabras funciona con el índice;
- un cambio global no intenta persistir un stub;
- abrir A no carga B;
- editar A envía únicamente A al guardado incremental;
- la exportación JSON materializa los libros que siguen cerrados.

## Límite de validación en este entorno

Aquí no está instalado Rust, por lo que `cargo test` y el instalador NSIS no pueden compilarse localmente. El workflow de Windows sigue siendo la barrera final: sólo debe distribuirse el `.exe` si todos sus pasos terminan en verde.
