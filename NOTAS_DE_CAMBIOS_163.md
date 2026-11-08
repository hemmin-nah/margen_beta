# 1.6.3: decisiones respetadas

- **Aprobado y sin tocar:** pizarra libre 1.6.2 y sellos vectoriales.
- **Ventana:** maximizada dentro de Windows, no fullscreen exclusivo.
- **Editor:** pestañas de escritura, búsqueda, selector Novela/Guion alineados con herramientas; exportación a la derecha.
- **Escritura amplia:** un único botón Fichas en navegación, sin duplicado superior.
- **Guion:** Fichas junto a Referencias.
- **Genealogía:** retratos desde fichas; Supr; parentescos explícitos y derivados; propuestas visibles por confirmar; jerarquía por generaciones; líneas agrupadas, más espacio y encuadre adaptable.
- **Relaciones:** puntos, Supr, flechas fuera de tarjetas y más espacio entre nodos.

Detalles internos: cambios aditivos en `cambios/margen-163.js` y `cambios/margen-163.css`, incorporados a `frontend/assets/` y `dist/assets/`. El esquema de persistencia continúa admitiendo los documentos y vínculos anteriores. Las sugerencias descartadas se guardan en `graphs.genealogy.dismissedSuggestions` como campo opcional. No se ha cambiado el identificador `com.margen.escritorio`.

### Próximas mejoras NO incluidas aquí

Módulos de personaje y vínculos resumidos, Escaletas, Cronología, Biblioteca, Configuración e inglés global (1.6.4 y 1.6.5). Más adelante: pantalla de inicio, tutorial, notificaciones propias y diccionarios libres.
