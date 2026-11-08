# MARGEN 1.12.3 · Beta final

## Biblioteca y seguridad

- Los libros eliminados pasan a una Papelera de libros recuperable.
- Restaurar devuelve el libro a su posición original cuando es posible.
- Eliminación definitiva y vaciado de Papelera liberan versiones y medios que ya no estén protegidos por Recovery.
- Preferencias permite elegir la carpeta física de la biblioteca.
- MARGEN copia y verifica la nueva biblioteca con `PRAGMA quick_check` antes de activarla.
- La copia anterior se conserva hasta que el usuario la elimina explícitamente.
- Puede restaurarse la ubicación predeterminada de MARGEN.
- Una ubicación personalizada ausente se notifica como incidencia de inicio.

## Conservación de datos

- Los datos técnicos (configuración, diagnóstico y ubicación elegida) permanecen en AppData.
- Libros, SQLite, medios y autocopias pueden residir en la carpeta elegida.
- La limpieza de imágenes nunca elimina un archivo todavía referenciado por una versión conservada, Recovery o cuarentena.

## Congelado para Beta final

- Barra del editor: sin cambios respecto a la versión aprobada.
- Workflow de Windows: idéntico byte por byte al build validado anteriormente.
