# MARGEN Desktop 1.13.0 · Beta — Proyecto Windows / Tauri

Esta versión parte de la Beta final 1.12.3 y mejora Pizarra y los atajos sin modificar la barra del editor ni el workflow de compilación que ya está validado.

## Compilar en GitHub Actions

1. Sustituye el contenido del repositorio por este proyecto y haz commit + push.
2. Abre **Actions** y lanza una ejecución nueva del workflow de Windows.
3. No reutilices una ejecución antigua con **Re-run**, porque GitHub vuelve a usar el commit de aquella ejecución.
4. Espera a que las pruebas, Rust y el empaquetado NSIS terminen en verde.
5. Descarga el artefacto generado. El workflow conserva deliberadamente los nombres anteriores para no tocar el build que ya funciona.

El workflow `.github/workflows/build-windows.yml` se mantiene idéntico al de la última compilación validada.

## Novedades 1.13

- Pizarra virtual amplia con recentrado automático, sin bordes perceptibles durante el uso normal.
- Trazos libres seleccionables y movibles después de dibujarlos.
- Sellos vectoriales siguen moviéndose como una pieza.
- Historial estructural prioritario para mover, borrar, redimensionar y dibujar.
- Ctrl+Z / Ctrl+Y más previsibles en Pizarra.
- Espacio + arrastrar mueve temporalmente la pizarra aunque esté activa otra herramienta.
- Atajos básicos V, B, T, Ctrl+A, Ctrl+C/V, Supr y Esc.
- Nueva pantalla **Conoce MARGEN → Atajos de teclado**.

## Compatibilidad

Las pizarras antiguas se recolocan internamente en el nuevo lienzo al abrirse por primera vez, manteniendo la misma posición visual. La migración no cambia el contenido del libro.

La barra del editor y el workflow de compilación siguen congelados: cualquier cambio ahí debe considerarse bug/regresión, no rediseño pendiente.
