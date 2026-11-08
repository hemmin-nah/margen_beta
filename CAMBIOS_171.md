# MARGEN Desktop 1.7.1 — Arranque y tutorial por secciones

## Correcciones

- La presentación inicial permite cambiar de español a inglés y de inglés a español repetidas veces. Se corrigió un error de referencias al elemento de la ventana que se reconstruía después del primer cambio.
- No se cambian los títulos, textos ni datos de los libros al elegir un idioma; el idioma de la configuración inicial sigue llegando al formulario de preferencias.

## Tutorial ampliado

El recorrido antiguo de ocho pasos se sustituyó por **un índice de ocho secciones opcionales, cada una con cuatro pasos** (32 explicaciones en español e inglés):

1. Biblioteca y proyectos
2. Editor e importación
3. Pizarras libres
4. Genealogía
5. Relaciones entre personajes
6. Personajes y escenarios
7. Escaletas y cronología
8. Referencias y seguridad

Los pasos detallan el funcionamiento específico de MARGEN, no solo dónde está el botón. El visitante puede entrar en una sola sección, recorrerla, volver al índice, saltarla y reabrir el índice desde Ayuda. La pantalla se oscurece y destaca las herramientas del apartado.

Durante los apartados Genealogía y Relaciones se muestra temporalmente el modo de diagrama correspondiente, **con una copia previa de la pizarra que se restaura al salir**. El tutorial no añade ni elimina tarjetas o conexiones y devuelve a la sección donde estaba el usuario.

## Inicio visual

- Nueva pantalla de arranque ilustrada, inspirada en una composición editorial y el lenguaje de marca de MARGEN.
- El archivo `frontend/assets/splash-171.svg` está separado para poder cambiar el arte en futuras actualizaciones.
- La pantalla desaparece automáticamente al acabar la inicialización de la interfaz, **sin establecer un tiempo de espera artificial**.
- No sustituye a la bienvenida de primera ejecución, que sigue apareciendo únicamente en una instalación nueva.

## Integración

- Se mantiene `frontend/assets/margen.js`, así como el backend Rust/SQLite existente y el identificador de la app `com.margen.escritorio`.
- Se corrige `frontend/assets/margen-170.js` y se añaden `margen-171.js`, `margen-171.css` y `splash-171.svg`.
- `dist` contiene copias idénticas de los archivos para Tauri.
- Versiones del manifiesto npm, Tauri y Cargo: 1.7.1.

## Pruebas realizadas

- Cambio de idioma en la introducción: ES→EN→ES→EN, sin pérdida de controles.
- Nueva configuración en inglés y apertura de la guía.
- Acceso independiente a las ocho secciones y recorrido de los 32 pasos.
- Vista real temporal de Genealogía y Relaciones; tras salir, restauración de datos y ruta originales.
- Ayuda, botón de cerrar, tecla Escape y desaparición del splash al finalizar el arranque.
- Regresiones de la interfaz bilingüe de personajes, parentescos y deshacer/rehacer diagramas, escaletas, cronología y colores DOCX.
- JavaScript: `node --check` y verificación de fuentes y carpeta dist.

**Limitación:** Estas pruebas se ejecutaron en Chromium con el puente de Tauri simulado. No se compiló Rust ni se instaló este `.exe` en Windows desde este entorno. La compilación real deberá realizarse en GitHub Actions y probarse después en Windows.
