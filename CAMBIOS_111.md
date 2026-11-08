# MARGEN Desktop 1.11.0 — Preparación para distribución

## Objetivo

1.11.0 no añade herramientas creativas. Convierte varias protecciones internas de MARGEN en mecanismos visibles y comprobables para poder entregar la aplicación a otra persona sin que necesite conocer SQLite, GitHub ni la estructura del proyecto.

## Datos y migraciones

- Se mantiene el identificador `com.margen.escritorio`, por lo que una actualización continúa usando la misma carpeta de datos.
- La base de datos incorpora un número de esquema formal mediante `PRAGMA user_version` y un historial `schema_migrations`.
- Una base creada por una versión futura de MARGEN se rechaza en lugar de intentar abrirla con una versión antigua.
- La migración desde las estructuras anteriores continúa siendo automática y conserva el legado monolítico como red de seguridad.

## Cierre inesperado y recuperación

- Al iniciar MARGEN se crea una marca de sesión local.
- En un cierre normal, MARGEN elimina esa marca.
- Si en el siguiente arranque la marca sigue existiendo, MARGEN informa de que la sesión anterior no terminó normalmente.
- La biblioteca principal se comprueba antes de mostrar el aviso.
- Si existe un guardado anterior, el usuario puede recuperarlo mediante el sistema de recovery ya existente. MARGEN nunca restaura automáticamente ni pisa el guardado actual sin confirmación.

## Comprobación de salud

Al arrancar se comprueban:

- `PRAGMA quick_check` de la base principal;
- esquema de base de datos;
- disponibilidad de recovery;
- presencia y apertura SQLite de las tres bases léxicas;
- estado básico de las autocopias.

Una incidencia en recursos auxiliares no bloquea innecesariamente la escritura: se explica y se ofrece crear un diagnóstico.

## Acerca de MARGEN

Nueva pantalla accesible desde la cabecera y desde Preferencias con:

- versión instalada;
- esquema de datos;
- tamaño de la base SQLite;
- carpeta de datos utilizada por MARGEN;
- cantidad y fecha de las autocopias conservadas;
- acceso a la carpeta de datos;
- licencias de los recursos léxicos incluidos;
- creación de informe de diagnóstico.

## Diagnóstico local y privacidad

El informe TXT contiene información técnica útil para soporte: versión, sistema operativo/arquitectura, estado SQLite, número de libros referenciados, versiones internas, resúmenes, tamaño de datos, recursos léxicos y errores técnicos recientes.

No serializa el estado de MARGEN y no incluye el texto de capítulos, fichas, notas ni imágenes. El registro local conserva como máximo 200 entradas técnicas y MARGEN no añade telemetría ni envía estos datos a ningún servidor.

## Copias

Las autocopias siguen conservando dos versiones y la copia JSON manual continúa siendo una biblioteca completa, incluso con libros que estaban cargados de forma ligera por 1.10.

## Lo que NO incluye 1.11

- actualización automática;
- cuentas de usuario;
- sincronización en nube;
- telemetría;
- nuevas herramientas de escritura;
- Galerada, Cartografía u otras expansiones.

Estas exclusiones son intencionadas: 1.11 busca una beta privada estable, no aumentar la superficie de fallo.

## Validación

Se añade `pruebas/test_111_distribution.py`, que comprueba la pantalla Acerca de, datos/copias, acceso a diagnóstico, integración con Preferencias, versión 1.11.0 y el aviso tras un cierre inesperado.

En este entorno siguen sin estar disponibles Rust ni Windows. Por tanto, `cargo test` y la compilación NSIS deben terminar en verde en GitHub Actions antes de considerar el instalador 1.11.0 válido.
