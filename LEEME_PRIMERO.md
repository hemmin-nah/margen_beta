# MARGEN Desktop 1.12.3 · Beta final — Proyecto Windows / Tauri

Esta es la versión destinada a la ronda completa de beta externa antes del Release Candidate.

## Compilar en GitHub Actions

1. Sustituye el contenido del repositorio por este proyecto y haz commit + push.
2. Abre **Actions** y lanza una ejecución nueva del workflow de Windows.
3. No reutilices una ejecución antigua con **Re-run**, porque GitHub vuelve a usar el commit de aquella ejecución.
4. Espera a que las pruebas, Rust y el empaquetado NSIS terminen en verde.
5. Descarga el artefacto generado. El workflow conserva deliberadamente el mismo nombre de artefacto que la versión anterior para no tocar el build que ya está funcionando.

El workflow `.github/workflows/build-windows.yml` se mantiene idéntico al de la última compilación validada.

## Qué cierra esta Beta final

- Papelera recuperable para libros completos: mover, restaurar, eliminar definitivamente y vaciar.
- Ubicación configurable de la biblioteca de libros, separada de los datos técnicos de MARGEN.
- Migración segura de biblioteca: copia, comprobación SQLite y activación solo después de verificar.
- Conservación de la ubicación anterior como copia de seguridad hasta que el usuario decide eliminarla.
- Regreso a la ubicación predeterminada.
- Detección de una biblioteca personalizada no disponible.
- Limpieza de imágenes huérfanas solo cuando ninguna versión/recovery las necesita.
- Se mantienen todos los cambios de 1.12.0–1.12.2.

## Importante para la beta

No probar una migración de carpeta usando la única copia de una novela importante. Para la primera prueba, usa un libro de prueba o conserva además un backup JSON externo.

La barra del editor y el workflow de compilación están congelados en esta versión: cualquier cambio ahí debe considerarse bug/regresión, no rediseño pendiente.
