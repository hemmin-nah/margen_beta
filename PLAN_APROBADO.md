# MARGEN — plan de cambios (actualizado a 1.6.4)

**Completados hasta esta entrega:** 1.6.1 (editor/importador), 1.6.2 (pizarras y fichas), 1.6.3 (árbol genealógico), 1.6.4 (hermanos, deshacer, personajes, escaletas y cronología).

**Próximos bloques:** 1.6.5 (biblioteca, configuración e inglés). Después retomaremos las ideas posteriores: presentación inicial, tutorial guiado, diálogos y recursos léxicos. Sin objetivos ni rachas; Biblioteca tampoco abrirá automáticamente el último libro.

---

# Estado del plan de mejora de MARGEN Desktop

**1.6.1 — Importación, capítulos y editor:** implementado y conservado.

**1.6.2 — Pizarras y experiencia del editor:** implementado en el proyecto actual: lápiz SVG, estampación repetida, cajas arrastrables, asas ocultas, líneas nítidas, JSON en Descargas, iconos y visor de fichas único. Pendiente validación del ejecutable real.

**1.6.3 — Genealogía avanzada:** siguiente fase; parentescos confirmados y sugeridos en panel rojo de confirmación, jerarquía por generaciones, sin líneas redundantes, más parentescos.

**1.6.4 — Fichas, escaletas y cronología:** bloques plegables, vínculos derivados en personaje, escenarios puntuales, múltiples personajes en eventos y limpieza de elementos redundantes.

**1.6.5 — Biblioteca, escritorio, preferencias e inglés:** mejora de la biblioteca sin rachas ni objetivos, revisión de traducciones y simplificación.

**Después:** bienvenida inicial, tutorial opcional, iniciador visual, diálogos del programa con el estilo de MARGEN, recursos léxicos libres/licencias verificadas.

---

# MARGEN Desktop — Decisiones confirmadas y hoja de ruta

**Fecha:** 31 de octubre de 2026. Base Tauri 1.6.0 → primera iteración 1.6.1. No añadir ninguna de las ideas futuras hasta terminar estos bloques.

## Regla general

- El programa es un estudio de creación literaria, **no** un organizador de productividad. **No** incluir objetivos diarios, rachas, gamificación, insignias ni contadores motivacionales en la versión principal.
- Evitar funciones duplicadas, títulos repetidos, controles permanentes que no se utilizan y mensajes que llamen a MARGEN «prototipo HTML».
- Todo contenido de Word debe conservar su **formato**, incluidas negrita, cursiva y estructuras HTML que admite el importador.
- No editar ni traducir de manera automática los textos escritos por la persona usuaria.

## 1.6.1 — Importación y capítulos/editor

- [x] Reformular información sobre `.doc` para usuario final; no prometer soporte inexistente.
- [x] Deshacer/Rehacer antes de importar para unión, división, cambio de orden, eliminación y títulos.
- [x] División con cursor en la vista previa; preservar etiquetas HTML y formato.
- [x] Reordenar capítulos arrastrando desde su propia fila, sin icono y con alternativa de teclado.
- [x] Reducir separación entre modos del manuscrito.
- [x] Retirar Concentración del editor normal y dar el acceso a Referencias.
- [x] Panel derecho para buscar en el libro, consultar fichas y referencias del capítulo.
- [x] En guion, eliminar «Formato monoespaciado» y poner Fichas en ese sitio; mismo patrón de panel.
- [ ] Validación final en el `.exe` de Windows 11 y con archivos Word reales de distintas complejidades.

## 1.6.2 — Pizarras y Relaciones

- [ ] Arrastrar **la CAJA de texto completa**, no palabras del texto; tanto notas como cajas de texto e imágenes se pueden mover desde su superficie sin cruceta, separando gesto de edición/selección.
- [ ] Esquinas de redimensionamiento visibles solo al pasar ratón o seleccionar.
- [ ] Trazos nuevos vectoriales y nítidos con zoom, compatibilidad con antiguos; fondo rayado nítido.
- [ ] Sellos como herramienta de **estampar repetidamente por clic**, en vez de insertar un PNG para recolocar.
- [ ] Fondo de puntos en Relaciones; tecla Supr sobre tarjeta sin foco editable.
- [ ] Etiquetas de flechas origen/destino fuera de la ficha, discretas.
- [ ] Más espacio entre tarjetas al organizar en Relaciones.

## 1.6.3 — Genealogía real, no enlaces arbitrarios

- [ ] Miniatura de foto del personaje en el icono de la tarjeta cuando exista.
- [ ] Tecla Supr borra la tarjeta y sus conexiones, **nunca** la ficha del personaje.
- [ ] Parentescos múltiples: padres, madres, matrimonios, hermanos, abuelos, primos, tíos, cuñados, sobrinos, vínculos adoptivos, de afinidad, etc.
- [ ] Al crear vínculos familiares, inferir **propuestas** y mostrar una lista de **«Confirmar relaciones» en el panel derecho**, con aviso rojo discreto de pendientes. Diferenciar vínculo confirmado e inferido; permitir corregir excepciones.
- [ ] El marido de la madre no pasa a ser padre biológico automáticamente; confirmar si es padre, padrastro, adoptivo o sin vínculo.
- [ ] Organizador jerárquico por generaciones y parejas, líneas solo para relaciones principales; abuelos, primos etc. se derivan sin dibujar todas las conexiones.
- [ ] Espacio suficiente entre tarjetas y etiquetas para árboles enormes.

## 1.6.4 — Personajes, escaletas y cronología

- [ ] Evolución por capítulos plegable en bloque completo y etapas plegables dentro.
- [ ] Tarjeta **Vínculos** al lado de Trasfondo, del mismo tamaño; se nutre automáticamente de Genealogía y Relaciones y se modifica exclusivamente desde ellas.
- [ ] Escenarios de paso (aeropuerto, gasolinera...) y personajes pasajeros como etiquetas locales de escena, sin ficha obligatoria.
- [ ] Objetivo, Conflicto y Consecuencia como sección optativa plegable.
- [ ] Solucionar interacciones reales de arrastre en escaletas y barra lateral; retirar instrucciones incorrectas.
- [ ] Texto de estado vacío sobre la línea temporal, no tachado.
- [ ] Varios personajes por acontecimiento.
- [ ] Explicación de Cronología debajo del título.
- [ ] Escenarios: sin cambios adicionales.

## 1.6.5 — Biblioteca, Escritorio, Ajustes, Inglés

- [ ] Eliminar Escritorio si no aporta nada, llevando los «Elementos a revisar» a Biblioteca si resulta útil.
- [ ] Biblioteca con búsqueda, filtros/ordenación y diseño de portadas más cuidado. **Sin** panel de «último libro utilizado» ni apertura automática del último libro.
- [ ] Quitar descripción repetitiva de Biblioteca. Colocar «Nuevo libro» junto a «Importar Word».
- [ ] Quitar «Puedes modificar estas preferencias siempre que quieras» y «Ajustes generales».
- [ ] Solo nuevas preferencias justificadas: idioma, apariencia, accesibilidad y ubicación/gestión de copias.
- [ ] Evitar jerarquías de rótulos redundantes en Escaletas y demás vistas.
- [ ] Revisión completa inglés: placeholders, ejemplos, Configurar secciones, Cronología, menús, ayudas, avisos, validaciones propias por idioma.

## Ideas para después de estos bloques — NO implementar aún

- Pantalla de arranque ligera tipo Photoshop, con ilustración actualizable, sin forzar espera.
- Primera bienvenida antes de elegir configuración.
- Tutorial opcional por pasos, con foco en cada herramienta y oscurecimiento del resto; saltable, repetible.
- Diálogos internos MARGEN en lugar de `alert`/`confirm` nativos; los permisos de Windows siguen gestionados por el SO.
- Recursos legales offline de diccionario y sinónimos inglés/español, revisando licencias y atribuciones antes de distribuir.
- Más adelante: exportación editorial DOCX, PDF y TXT, guardado incremental por libro, rendimiento de imágenes y pruebas realistas en Windows.

**Criterio de entrega:** todo cambio grande se acompaña de pruebas de flujo real y de formato/datos; no llamar estable a una compilación no verificada en Windows.
