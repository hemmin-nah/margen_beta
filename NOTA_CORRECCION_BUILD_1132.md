# MARGEN 1.13.2 — Corrección del workflow (21/11/2026)

Se conserva la versión de la aplicación **1.13.2**. Esta actualización modifica únicamente el descargador de recursos léxicos y el workflow de GitHub Actions; no cambia las funciones de la pizarra ni la base de datos del usuario.

## Problema

GitHub Actions detenía el proceso en `python herramientas_lexicas.py --build` porque la URL oficial `https://en-word.net/static/english-wordnet-2025.zip` devolvía HTTP 503.

## Solución

- Reintentos limitados con espera en errores transitorios de red y HTTP 408, 429, 500, 502, 503 y 504.
- Si el servidor principal persiste sin responder, descarga **el mismo paquete WNDB de English WordNet 2025** de la publicación oficial de `globalwordnet/english-wordnet` en GitHub: `https://github.com/globalwordnet/english-wordnet/releases/download/2025-edition/english-wordnet-2025.zip`.
- Registra en `SOURCE_MANIFEST.json` la URL realmente utilizada, además de la principal, y conserva SHA-256, licencias y comprobaciones de contenido existentes.
- Añade prueba sin red `pruebas/test_1132_lexicon_download.py` en el workflow.
- Si ambas fuentes fallan, el build **se detiene**: nunca se entrega un instalador con diccionarios ausentes.

## Uso

1. Descomprimir el ZIP y subir **su contenido interior** al repositorio de MARGEN, conservando la carpeta `.github/`.
2. Confirmar el archivo `.github/workflows/build-windows.yml` en GitHub (el nombre no cambia).
3. Actions → Compilar MARGEN para Windows → Run workflow.
4. Descargar el artefacto `MARGEN-1.13.2-Windows-x64` si la ejecución termina correctamente.

Este ZIP contiene las fuentes para Windows, **no contiene el .exe ya compilado**. La comprobación Windows/NSIS debe realizarse con GitHub Actions.
