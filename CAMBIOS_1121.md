# MARGEN 1.12.1 Beta

## Pizarra
- Selección múltiple con Ctrl + clic y marco de selección arrastrando sobre el fondo.
- Las notas se seleccionan desde cualquier zona; resize desde cuatro esquinas, visible solo al trabajar con el objeto.
- Candado visual permanente oculto.
- Texto nuevo entra directamente en edición.
- Cuentagotas para color con fallback al selector normal.
- Sellos estampados movibles como conjunto y onboarding breve para explicar su uso.
- El tipo de pizarra se elige al crearla y queda asociado a esa pizarra.

## Fichas y referencias
- Galerías con scroll interno.
- Elección explícita de foto principal.
- Personajes vinculados mediante selector y tags.
- Referencias del editor agrupadas por personaje.
- Se conservan las carpetas de un nivel para Personajes y Escenarios incorporadas en 1.12.0 R4.

## Genealogía y relaciones
- Foto principal también visible en Relaciones.
- Ctrl + dos personajes abre un selector rápido para crear un vínculo, sin eliminar el método anterior.
- Los vínculos jerárquicos de Genealogía muestran de nuevo su nombre/tipo.
- Se corrigen nodos vinculados a fichas cuyo nombre podía quedar vacío.

## Línea temporal
- Color por acontecimiento.
- Reordenación manual mediante arrastre.
- Crear un acontecimiento antes o después del seleccionado.

## Estabilidad lateral
- Se estabiliza la geometría de la zona superior y las filas del árbol lateral para evitar el "tic" al cambiar entre vistas de distinta naturaleza.
- La distribución de la barra del editor queda congelada en esta versión.

## Build
- Versiones frontend/Tauri sincronizadas en 1.12.1.
- `frontend/` y `dist/` se sincronizan antes de compilar.
- Workflow de Windows conserva la receta estable: `npm install` usa la CLI del proyecto y el bundle NSIS reintenta hasta tres veces ante un fallo temporal de red.

## Revisión 2 · barra desplegable del editor
- La barra completa se muestra como un bloque de dos filas y se recoge con una flecha central.
- Compacta ya no reduce botones: oculta la barra para ganar altura de escritura.
- Se elimina Escritura amplia de la interfaz por redundancia con la barra recogida.
- Al abrir Fichas/Referencias, la cabecera permanece inmóvil; el papel conserva su ancho y solo se desplaza hacia la izquierda.
- Se recupera el workflow estable de 1.12.0: `npm install` usa la CLI declarada por el proyecto y el bundle NSIS reintenta hasta tres veces si hay un fallo temporal de red.

## Revisión 3 · pulido visual y cronología
- La barra completa sigue exactamente dos filas horizontales y la flecha central la recoge entera; el nombre del libro permanece sobre el papel.
- Al plegar la barra, el papel gana altura real. Abrir Fichas mantiene el ancho del papel y desplaza solo el lienzo.
- Las imágenes de Pizarra muestran también los cuatro tiradores de tamaño.
- En notas, Tab desde el título entra directamente al cuerpo para escribir.
- Genealogía separa `Pareja` y `Matrimonio` como vínculos distintos.
- Cronología usa arrastre por puntero, color visible también sobre la línea, Ctrl+Z y creación Antes/Después debajo de la línea temporal.
- Inputs de una línea desactivan autocompletado y sugerencias de gestores de contraseñas; se evita el menú contextual del navegador en esos campos.
- Al plegar todos los actos de una Escaleta también se cierran sus escenas.
- El workflow de build NO se modifica respecto a la Revisión 2 que ya compilaba correctamente.

## Revisión 4 · barra, paneles, pizarra y color de cronología
- La barra del editor usa una base de `surface` con borde inferior y esquinas inferiores redondeadas, manteniendo la estructura de dos filas aprobada.
- El selector de capítulos usa el mismo color de resaltado general de MARGEN.
- Fichas, Referencias y Buscar calculan su posición a partir de la altura real de la barra: nunca se superponen cuando está desplegada y recuperan altura cuando se pliega.
- Pizarra: Supr entiende selección múltiple y sellos dibujados; Ctrl+Z restaura correctamente los elementos eliminados.
- Pizarra: cada nueva sesión de edición de título/cuerpo crea un punto de deshacer independiente.
- Cronología: el color se guarda como propiedad única del acontecimiento y se conserva tras renderizar/reabrir la vista.
- Cronología: tarjeta, tallo y punto muestran el color; la línea general permanece neutra para evitar mezclas visuales entre acontecimientos.
- Cronología: se refuerza el arrastre manual mediante eventos de puntero a nivel de documento.
- El workflow de Windows permanece byte por byte idéntico al de la Revisión 3 que ya compila correctamente.
