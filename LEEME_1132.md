# MARGEN 1.13.2 Beta · Proyecto Windows/Tauri

Este ZIP contiene **el proyecto completo**, incluido `.github/workflows/build-windows.yml`, `frontend`, `dist`, `src-tauri` y las pruebas. **No contiene un instalador .exe precompilado.**

## Actualizar

1. **Exporta primero una copia JSON completa** de tu biblioteca desde la versión que utilizas y guárdala fuera de la carpeta de MARGEN.
2. Descomprime el archivo ZIP. Sube **el contenido interior de la carpeta** al repositorio GitHub de MARGEN, conservando todos los directorios, en particular `.github/workflows/`.
3. En GitHub, ve a **Actions → Compilar MARGEN para Windows → Run workflow**.
4. Si el workflow termina en verde, descarga el artefacto **MARGEN-1.13.2-Windows-x64**. Dentro estará el instalador NSIS `.exe` para Windows.
5. Instala y verifica primero con un libro y una pizarra de prueba. Lee `GUIA_BETA_TESTER_1132.md`.

El identificador de la app sigue siendo `com.margen.escritorio`. El backend sigue guardando grupos como campos JSON de los objetos; no se modifica el esquema SQLite. La exportación individual de libros de 1.13.1 permanece.

## Comprobaciones locales

```text
python herramientas_frontend.py
npm run check:frontend
python pruebas/test_1132_release_static.py
python pruebas/test_1131_single_book_export.py
python pruebas/test_1132_board_groups.py
python pruebas/test_113_board_shortcuts.py
python pruebas/test_1131_single_book_export_ui.py
```

Las pruebas con navegador requieren Python Playwright y Chromium; no se ejecutan por defecto durante la compilación en GitHub Actions. El paso de compilación final y el arranque en Windows deben confirmarse en GitHub y en tu PC.
