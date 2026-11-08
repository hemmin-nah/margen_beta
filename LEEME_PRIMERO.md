# MARGEN Desktop 1.12.1 Beta — Proyecto Windows / Tauri

Esta entrega continúa la Beta 1.12 sin rediseñar la barra del editor. El foco de 1.12.1 es Pizarra, Fichas, Referencias, Genealogía/Relaciones, Línea temporal y la estabilidad visual de la barra lateral.

## Para compilar en GitHub
1. Sustituye el contenido de tu repositorio por este proyecto completo, conservando `.git`.
2. Haz commit y push.
3. Ejecuta **Compilar MARGEN para Windows** en GitHub Actions.
4. El workflow reconstruye `dist/`, valida el frontend, ejecuta pruebas Rust y prepara NSIS 3.13 de forma local/cacheada antes de generar el instalador.
5. Descarga `MARGEN-1.12.1-Windows-x64` únicamente si todos los pasos terminan en verde.

Se incluye también `MARGEN_1.12.1_build-windows.yml` como copia visible del workflow.

## Qué probar manualmente
- Cambiar entre Capítulos, Fichas de personaje y Escenarios: la parte superior de la barra izquierda no debería dar un salto o "tic".
- Pizarra libre: Ctrl + clic, marco de selección, mover sellos, resize desde las cuatro esquinas, texto directo y cuentagotas.
- Crear una pizarra nueva y comprobar que su tipo queda fijado.
- Fichas: galería con muchas imágenes, cambiar la foto principal y personajes vinculados como tags.
- Referencias: comprobar agrupación por personaje.
- Relaciones/Genealogía: fotos, Ctrl + dos personajes + tipo de vínculo y nombres visibles en vínculos jerárquicos.
- Línea temporal: color, arrastre manual y creación antes/después.
- Confirmar que la barra del editor conserva exactamente la disposición de 1.12.0 R4.

## Datos
El identificador de aplicación continúa siendo `com.margen.escritorio` y el esquema SQLite permanece en 1110. Esta versión no crea una biblioteca paralela ni necesita una migración nueva de base de datos.
