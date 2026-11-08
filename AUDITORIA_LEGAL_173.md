# Auditoría de recursos lingüísticos — MARGEN 1.7.3

Fecha de consulta: **2 de noviembre de 2026**. La licencia verificada es la del **recurso concreto**, no la existencia de una URL gratuita o de una licencia genérica del sitio.

| Recurso | Edición usada | Licencia del contenido | ¿Comercial? | Obligaciones que implementa MARGEN |
|---|---|---|---|---|
| Open English WordNet | OEWN 2025, WNDB | CC BY 4.0 + WordNet original Princeton | Sí | Atribuir equipo OEWN + Princeton; conservar licencias, avisos y disclaimer; registrar modificaciones |
| Spanish WordNet | MCR 3.0, `wn-data-spa.tab` de OMW | CC BY 3.0 Unported (módulo español) | Sí | Atribuir proyecto MCR, fuente, licencia y transformación; no mezclar módulos con licencias diferentes |
| Wikcionario ES | Dump eswiktionary extraído con Wiktextract | CC BY-SA 4.0, con algunas condiciones históricas de reutilización de Wikcionario | Sí, con condiciones | Atribuir colaboradores vía página e historial, señalar la extracción, conservar la base derivada bajo CC BY-SA y separada del resto; no imponer DRM ni restricciones adicionales a los datos |

### Fuentes comprobadas

- OEWN licencia y avisos: https://github.com/globalwordnet/english-wordnet/blob/main/LICENSE.md
- Princeton, permiso de uso comercial con condiciones: https://wordnet.princeton.edu/license-and-commercial-use
- Descarga de OEWN 2025: https://en-word.net/downloads
- Titular de Spanish WordNet: https://nlp.lsi.upc.edu/esWN/licenseWN.php
- Licencia del archivo MCR: https://github.com/omwn/omw-data/blob/main/wns/mcr/LICENSE
- Estructura OMW: https://omwn.org/omw1.html
- Términos de Wikimedia: https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use/es
- Derechos y condiciones de Wiktionary: https://en.wiktionary.org/wiki/Wiktionary:Copyrights
- Extracción española: https://kaikki.org/eswiktionary/rawdata.html
- Licencia CC BY 3.0: https://creativecommons.org/licenses/by/3.0/
- Licencia CC BY 4.0: https://creativecommons.org/licenses/by/4.0/
- Licencia CC BY-SA 4.0: https://creativecommons.org/licenses/by-sa/4.0/

### Qué NO hemos hecho

- No copiar contenido de RAE, Oxford ni diccionarios comerciales de licencia desconocida.
- No obtener ejemplos de obras literarias, imágenes o audios de Wikcionario.
- No traducir las novelas del usuario ni incluirlas en ningún corpus.
- No asumir que una licencia CC BY-SA convierte automáticamente en libre todo el código de la aplicación; la base adaptada se mantiene separada.
- No afirmar que un extracto de Wikcionario está libre de errores editoriales o de infracciones puntuales. La licencia por sí sola no garantiza todos los derechos de terceros: habrá que permitir corregir o retirar entradas controvertidas si se distribuye públicamente.

### Preparación de licencias y trazabilidad

En cada compilación oficial se descargan los textos originales de licencia, se calcula SHA-256 de cada corpus y documento, se guarda la fecha de descarga y se rechaza la instalación si un corpus falta o tiene una estructura anómala. `SOURCE_MANIFEST.json` conservará la trazabilidad de esa edición.

El archivo original español en OMW está fijado también por su **Git blob SHA** (`86c9e367d64a794300b414e55c78b54dbb07eb27`). Si cambia sin revisar, el empaquetado falla. Los otros corpus quedan identificados por edición, origen y SHA-256 calculado durante el build; se debería fijar también su huella antes de una venta pública.

### Limitación de la auditoría

Se verificaron páginas oficiales y licencias públicas, pero **no se pudieron descargar íntegramente los tres corpus ni auditar entrada por entrada** desde este entorno. El sistema de compilación debe hacerlo en GitHub; la conformidad del ejecutable final aún requiere prueba técnica y, si se comercializa, revisión jurídica.
