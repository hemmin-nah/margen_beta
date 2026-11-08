# MARGEN Desktop 1.12.0 — Beta refinement · Editor y exportación

## Objetivo

1.12.0 es el primer bloque de correcciones surgidas de la beta privada. No amplía Pizarra, Fichas ni Papelera: se concentra en que escribir, cambiar de modo y exportar se comporte de forma previsible antes de continuar con 1.12.1.

## Título del capítulo: organización y manuscrito ya no son lo mismo

Cada capítulo puede conservar dos nombres distintos:

- **Nombre en el árbol**: sirve para organizar el proyecto, por ejemplo `Capítulo 1`.
- **Título visible**: forma parte del manuscrito, por ejemplo `1. La tormenta`.

Los libros anteriores se migran de forma compatible: si todavía no existe título visible, MARGEN utiliza inicialmente el nombre del árbol. Cambiar el título visible no renombra el árbol.

El título visible:

- se edita directamente sobre la página;
- admite alineación izquierda, centrada y derecha;
- se utiliza en Lectura continua;
- se utiliza como título de capítulo al exportar DOCX, PDF y TXT.

El nombre organizativo ya no se edita desde la página. Se renombra directamente en el árbol lateral con doble clic (y la acción del lápiz abre ese mismo renombrado inline).

## Editor

- Los márgenes seleccionados en el editor vuelven a gobernar realmente el papel. Una regla visual antigua de A4/Libro estaba sustituyéndolos por paddings fijos.
- Las herramientas se presentan como **un único bloque de tres filas**, fijo fuera del scroll del documento.
- El mismo bloque se usa en **Editar, Guion y Escritura amplia**.
- **Completa / Compacta** modifica las tres filas completas sin esconder una de ellas.
- `Manuscrito`, Exportar, renombrar y Papelera permanecen en su cabecera original, fuera del bloque.
- Se aprovecha el espacio superior para acercar el papel a las herramientas sin mezclar cabecera y controles.
- Nueva acción **Tx · Eliminar formato** para texto de prosa. No se aplica al guion para no destruir sus tipos estructurales de párrafo.
- Tabulador funcional: en listas indenta/desindenta; en prosa inserta sangría sin sacar el foco del editor.
- Lista con viñetas y lista numerada tienen iconos distintos.
- Al centrar elementos de una lista, el marcador/número acompaña a la alineación.
- Se limpian entidades HTML visibles como `&#x20;` al normalizar títulos cargados/importados.

## Escritura amplia

- El botón **Editar original**, situado junto a Lectura continua, vuelve al editor convencional; no existe un segundo botón de salida redundante.
- Se añade zoom de página entre 75 % y 150 %, con controles − / + / 100 %.
- El zoom es visual: no modifica tamaño de fuente, márgenes ni contenido guardado.

## Sinónimos

Los resultados del panel de Sinónimos son ahora acciones de sustitución cuando la consulta se abrió desde una palabra seleccionada en el editor. Pulsar un sinónimo sustituye esa selección y mantiene el cambio en el capítulo.

Si la selección deja de ser válida o el usuario cambia la palabra buscada manualmente, MARGEN no fuerza la sustitución.

## Exportación

- La vista previa permite recorrer los capítulos seleccionados con anterior/siguiente y muestra el capítulo completo mediante scroll, en lugar de recortarlo a una muestra fija.
- Utiliza el **título visible**, no el nombre organizativo del árbol.
- El tamaño elegido se aplica al cuerpo del documento y la vista previa elimina tamaños inline heredados para que no lo oculten visualmente.
- El título conserva su alineación.
- Los capítulos en modo Guion conservan estructura básica al exportar:
  - escena/plano en negrita;
  - personaje centrado;
  - diálogo y parentético con sangrías diferenciadas;
  - transición a la derecha;
  - escena, personaje, transición y plano en mayúsculas.

Esto sigue siendo exportación de MARGEN, no maquetación industrial de guion ni sustituye GALERADA.

## UX corregida

- `Acerca de MARGEN` recupera contraste correcto en modo noche.
- `Acerca de MARGEN` utiliza un icono diferente de `Conoce MARGEN`.
- El paso «Consultar fichas sin salir» apunta primero al botón real **Fichas** del editor.
- En la vista Diccionario se elimina la entrada redundante `Escritorio` de su barra lateral.

## Compatibilidad y almacenamiento

1.12.0 no cambia el esquema SQLite de 1.11 (`1110`) ni la arquitectura de guardado/lazy loading de 1.10. Los nuevos campos de título viven dentro del propio libro y son compatibles con libros anteriores.

## Validación incluida

`pruebas/test_1120_editor_export.py` comprueba título interno/visible, márgenes, barra fija, modos Completa/Compacta, Tab, sustitución de sinónimos, Escritura amplia, Diccionario, contraste nocturno, vista previa, tamaño real de cuerpo y estructura de guion en un DOCX generado.

`pruebas/test_1120_release_static.py` actúa como barrera sin navegador dentro de GitHub Actions antes de compilar Windows.


## Beta 2 — correcciones tras la primera prueba manual
- Unifica las herramientas del editor en un solo bloque fijo de tres filas.
- El modo Compacto reduce las tres filas sin ocultar ajustes completos.
- Fichas/Referencias y navegación quedan dentro del mismo bloque fijo.
- Editar desde Escritura amplia sale realmente de ese modo; se retira el falso botón Editar añadido a la barra superior.
- Se aísla el título visible del nombre organizativo del árbol y se corrige su alineación.
- Los sinónimos capturan la selección **antes** de que el botón robe el foco; pulsar una alternativa sustituye realmente esa palabra en el manuscrito.
- El DOCX mantiene tinta negra y, además, la **vista previa** de guion usa una clase propia con tinta negra para no heredar el beige del tema.
- El tutorial apunta al botón real de Personajes/Fichas.
- Diccionario elimina de forma robusta la entrada residual Escritorio.


## Revisión 3 — estabilización antes de 1.12.1

- Se consolida `margen-112.js`: desaparecen las capas R1/R2 que corregían unas a otras y queda una sola implementación 1.12 para título, barra, Escritura amplia y renombrado.
- Pulsar el capítulo que ya está abierto no vuelve a renderizar el editor, reduciendo el parpadeo innecesario del árbol.
- El doble clic sobre cualquier capítulo entra en renombrado inline, incluso si el primer clic tuvo que abrir ese capítulo.
- El título editorial (`1. La tormenta`) y el nombre organizativo (`Capítulo 1`) no comparten ya manejadores.
- La selección de Sinónimos se conserva antes del cambio de foco y la prueba automática reproduce el recorrido selección → botón → alternativa → sustitución.
- La previa de Guion deja de reutilizar `.screenplay-editor` y por tanto no hereda colores del tema.
- `Escritorio` deja de generarse en la fuente de la vista Diccionario, en vez de intentar eliminarlo después.
- Se corrige el objetivo exacto del tutorial de Fichas.
- `frontend/` y `dist/` se sincronizan y una verificación comprueba que el ejecutable vaya a compilar exactamente la misma interfaz que se ha probado.

## Beta Revisión 4

- Barra del editor reorganizada en un único bloque estable de tres líneas: modos/vista, navegación/consulta y formato.
- Modo Compacta real: acciones verbales pasan a iconos y los selectores reducen huella; Completa mantiene etiquetas.
- El selector de tipo de página se retira del editor; el formato de página queda para Exportar.
- Los botones normales de alineación también alinean el título visible cuando el título tiene el foco; se eliminan controles duplicados.
- La barra lateral conserva su posición durante la navegación y evita reconstruir la vista al pulsar el elemento ya abierto.
- Carpetas de un solo nivel para Personajes y Escenarios: crear, renombrar, eliminar sin borrar fichas y mover fichas entre carpetas o «Sin carpeta».
- Se mantiene el resto de correcciones de 1.12.0 R3 (título editorial, sinónimos, preview de guion, tutorial y Diccionario).
