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
- Workflow de Windows prepara y cachea NSIS 3.13 para evitar que un 504 de la descarga automática tire la build.

## Revisión 2 · barra desplegable del editor
- La barra completa se muestra como un bloque de dos filas y se recoge con una flecha central.
- Compacta ya no reduce botones: oculta la barra para ganar altura de escritura.
- Se elimina Escritura amplia de la interfaz por redundancia con la barra recogida.
- Al abrir Fichas/Referencias, la cabecera permanece inmóvil; el papel conserva su ancho y solo se desplaza hacia la izquierda.
- Se recupera el workflow estable de 1.12.0: `npm install` usa la CLI declarada por el proyecto y el bundle NSIS reintenta hasta tres veces si hay un fallo temporal de red.
