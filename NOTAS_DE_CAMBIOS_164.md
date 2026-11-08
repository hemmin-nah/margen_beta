# Registro técnico — MARGEN 1.6.4

Cambios exclusivos de esta versión: `cambios/margen-164.js` y `cambios/margen-164.css`. La versión consolidada del frontend está en `frontend/assets/` y `dist/assets/`.

## Datos

- `graph.dismissedSuggestions`: se conserva. Los nuevos descartes de propuestas de hermanos usan claves `sib|<parentId>|<childId>`.
- Historial Ctrl+Z: memoria temporal de la sesión, por proyecto/pizarra/modo, limitado a 70 estados. No se exporta a JSON.
- `character.m164EvolutionOpen`: estado plegado de Evolución.
- `scene.temporaryCharacters` y `scene.temporarySettings`: listas de texto plano, **no IDs de fichas**.
- `scene.m164PlanningOpen`: estado de bloque opcional.
- `event.characterIds`: lista de IDs complementarios; `event.characterId` se conserva como primer ID para compatibilidad.
- Ancho del inspector: preferencia en `localStorage('margen-diagram-inspector-width')`; no afecta a contenido de libros.
- Contraste de texto importado: CSS. No transforma documentos almacenados.

## Integridad

Las sugerencias **no crean aristas** hasta que el usuario las confirma. Los vínculos nuevos usan los IDs ya existentes de personas y fichas. Las comprobaciones de referencias incluyen `event.characterIds` y su limpieza opcional respeta fichas archivadas. No se han alterado estructuras de imágenes ni rutinas de guardado Rust.

## Avisos técnicos

El frontend sigue siendo un ensamblado histórico con varias redefiniciones de funciones, incluyendo `render` y `m122Inspector`. La 1.6.4 incorpora extensiones compatibles, pero no afirma haberlo reescrito en arquitectura modular definitiva. El historial de diagramas es local a cada sesión y no sustituye a las copias de seguridad.
