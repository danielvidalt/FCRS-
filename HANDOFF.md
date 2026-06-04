# FCRS Grid Tool — Hand-off

**Última actualización:** 2026-06-04  
**Producción:** https://fcrs-zeta.vercel.app  
**Repo:** https://github.com/danielvidalt/FCRS-

---

## Estado actual

La app está en producción y funcional. Todas las features del MVP están implementadas más el sistema de Anchors completo. Los bugs críticos de la sesión han sido corregidos y deployados.

---

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16.2.6 (App Router) |
| UI | React 19 + Tailwind CSS |
| Canvas | Fabric.js 7.4.0 |
| Deploy | Vercel (proyecto `fcrs`) |
| Storage | localStorage (save/load) |

---

## Arquitectura de archivos

```
src/
  app/
    layout.tsx          — layout global, metadatos, PWA manifest
    page.tsx            — entry point (renderiza FacadeGridMapper)

  components/
    FacadeGridMapper.tsx — componente raíz: estado global, coordina sidebar ↔ canvas
    GridCanvas.tsx       — canvas Fabric.js: toda la lógica de dibujo, edición, historia
    LeftSidebar.tsx      — upload, zoom, pan, reset view, modo mover grid
    RightSidebar.tsx     — 3 secciones colapsables: Grid | Labels | Anchors
    TopToolbar.tsx       — save, export, undo/redo, reset grid
    ImageUploadDropzone  — dropzone overlay para drag-and-drop
    WorkspaceDropOverlay — indicador visual de drag

  lib/
    grid.ts             — cálculo de líneas, labels (texto), settings por defecto
    grid-labels.ts      — estilos de labels, posicionamiento, sync, patch de background
    fabric-grid.ts      — construcción y actualización de objetos Fabric (Polyline)
    line-points.ts      — inserción de puntos de control en líneas
    project.ts          — serialización/deserialización JSON + localStorage
    export.ts           — exportación PNG/JPG/clipboard
    image-upload.ts     — lectura de File → dataURL
    image-metadata.ts   — extracción de metadatos de imagen

  types/
    grid.ts             — GridSettings, GridLineData, FreeLabelData, AnchorData,
                          AnchorMarkerType, ProjectData, etc.
```

---

## Flujo de datos principal

```
FacadeGridMapper (estado: settings, panMode, moveGridMode, anchorMode, anchors…)
  ↕ props + ref
GridCanvas (ref handle: generateGrid, addFreeLabel, deleteAnchor, updateAnchorMarker…)
  → Fabric.js Canvas
      → Polyline   (líneas de grilla)     — GRID_LINE_KEY
      → IText      (labels de línea)      — LABEL_KEY
      → IText      (free labels)          — FREE_LABEL_KEY
      → IText      (anchor badges)        — ANCHOR_KEY
      → IText      (anchor notes labels)  — ANCHOR_NOTES_KEY
```

`GridCanvas` expone un `useImperativeHandle` con ~25 métodos imperativos. `FacadeGridMapper` los llama desde los sidebars via `canvasRef.current.método()`.

---

## Sistema de labels (grid labels)

Hay **dos tipos** de labels:

### 1. Grid labels (ligados a líneas)
- Creados en `renderLabels()` — un `IText` por placement (top/bottom/left/right)
- Identificados por `LABEL_KEY = "gridLabelId"`, valor = `"{lineId}-{placement}"`
- Estilo: `fabricLabelStyle(settings)` → `backgroundColor` + `padding: 6`
- Posición: `defaultLabelPosition()` o manual (drag del usuario)
- Se sincronizan cuando se mueve una línea: `syncLabelsForLine()`

### 2. Free labels (independientes)
- Creados por el botón "Insert Label" → `addFreeLabel()`
- Identificados por `FREE_LABEL_KEY = "freeLabelId"`, valor = ID aleatorio
- Estilo: `freeLabelStyle(label, settings)` → mismo sistema de background
- Soportan estilo por-label: fontSize, color, backgroundColor, backgroundEnabled

### Bug de background corregido (sesión anterior)
**Causa:** Fabric.js `_renderBackground` dibuja el rect de fondo sin incluir el `padding`.  
**Fix en `grid-labels.ts` → `applyBackgroundPadding(text)`:** sobreescribe `_renderBackground` en cada instancia de `IText` para extender el rect por `padding` en los cuatro lados.

---

## Sistema de Anchors (nuevo — 2026-06-04)

### Concepto
Marcadores de puntos de anclaje estructural. Son **temporales por sesión** — no se persisten en `ProjectData` ni en el historial de undo/redo. Se resetean al cambiar de tab de proyecto.

### Dos objetos Fabric por anchor
Cada anchor puede tener hasta 2 objetos en el canvas:

| Objeto | Key | Tipo | Descripción |
|---|---|---|---|
| Badge | `ANCHOR_KEY` | `IText` | Marcador principal. No editable por texto. Movible. |
| Notes label | `ANCHOR_NOTES_KEY` | `IText` | Solo existe si `notes !== ""`. Editable inline, movible independientemente. |

### Tipos de marker (`AnchorMarkerType`)
```ts
"label"  → IText("A-1")  — badge naranja, texto oscuro
"x"      → IText("✕")    — carácter ✕ con fill = markerColor
"circle" → IText("●")    — carácter ● con fill = markerColor
"square" → IText("■")    — carácter ■ con fill = markerColor
```
Todos son `IText` con `editable: false`, construidos por `buildAnchorBadge(anchor)`.

### AnchorData
```ts
interface AnchorData {
  id: string;
  index: number;       // para display (A-1, #1, etc.)
  x: number; y: number;          // posición del badge
  notes: string;
  notesX?: number; notesY?: number; // posición de la notes label (independiente)
  markerType: AnchorMarkerType;
  markerSize: number;            // fontSize del IText
  markerColor: string;           // fill (shapes) o backgroundColor (label)
  notesSize: number;
  notesColor: string;
  notesBackgroundColor: string;
}
```

### Helpers de construcción (nivel de módulo en GridCanvas.tsx)
- `buildAnchorBadge(anchor)` — crea el IText del badge según el tipo
- `buildAnchorNotesText(anchor)` — crea el IText de notes con su estilo

### Estado en FacadeGridMapper
```ts
anchorMode: boolean            // modo de colocación (click en canvas coloca)
selectedAnchorId: string|null  // anchor activo (badge o notes seleccionados)
anchors: AnchorData[]          // lista reactiva, actualizada via onAnchorsChange
activeAnchorType: AnchorMarkerType  // tipo para el PRÓXIMO anchor
activeAnchorSize: number
activeAnchorColor: string
```

### Métodos imperativos de anchor
```ts
deleteAnchor(id)              — borra badge + notes del canvas y del meta
updateAnchorNotes(id, notes)  — actualiza text del notes IText (crea/elimina según vacío)
updateAnchorMarker(id, partial) — reconstruye badge o notes si cambia tipo/size/color
selectAnchor(id)              — setActiveObject del badge en el canvas
```

### Interacciones importantes
- `fireSelection`: tanto `ANCHOR_KEY` como `ANCHOR_NOTES_KEY` reportan el mismo `anchorId` — seleccionar cualquiera de los dos activa el anchor en el sidebar
- `text:editing:exited` con `ANCHOR_NOTES_KEY`: parsea el texto editado en canvas de vuelta a `AnchorData.notes`
- `Delete/Backspace` sobre notes label: borra solo las notas (badge queda)
- `Delete/Backspace` sobre badge: borra badge + notes label
- `moveGridMode`: NO mueve anchors (son independientes del grid)

---

## Sistema de historia (undo/redo)

- Stack en `historyRef` (máx. 40 entradas), índice en `historyIndexRef`
- Cada entrada: `{ lines, freeLabels, view, hiddenLabelKeys }`
- **Anchors NO están en el historial** — son marcadores efímeros de sesión
- `pushHistory()` se llama tras cualquier acción significativa

---

## RightSidebar — 3 secciones colapsables

Desde 2026-06-04 el sidebar está reorganizado en 3 `CollapsibleSection`, **todas colapsadas por defecto** al abrir la app:

### Grid
Generate/Reset, Transform (move/scale), line counts, prefixes, numbering, label positions (cross widgets), restore/rebuild labels, line appearance, selected line actions.

### Labels
Add label, selected free label style, label appearance (font, color, background).

### Anchors
- **New marker**: type selector (Aa / ✕ / ● / ■), color picker, size slider — aplica a nuevos anchors
- **Lista**: item por anchor con icono según tipo y preview de nota
- **Editor del anchor seleccionado** (se expande en la lista): type, color, size, notes field, notes color, notes size, notes background color

---

## Bug corregido hoy: labels de tabs se desajustan al navegar

**Fecha:** 2026-06-04  
**Síntoma:** Al navegar entre tabs del proyecto, los grid labels (A-1, L-1…) aparecían desplazados/desordenados respecto a su posición original.

**Causa raíz:**  
`manualLabelPositionsRef` — el Map donde se guardan las posiciones de labels arrastrados por el usuario — **no se limpiaba ni se guardaba por tab**. Las claves son genéricas (`v-1-top`, `h-1-left`…) y todas las tabs generan las mismas claves. Al cambiar de tab, las posiciones de la Tab A "contaminaban" los labels de la Tab B.

**Fix aplicado (`1b8b6e1`):**  
1. Se añadió `gridLabelPositions?: Record<string, {x,y}>` a `ProjectData`
2. `getSnapshot()` serializa `manualLabelPositionsRef.current` en ese campo
3. `applyProject()` hace `manualLabelPositionsRef.clear()` y restaura las posiciones del snapshot antes de llamar a `renderLabels()`

**Archivos tocados:** `src/types/grid.ts`, `src/components/GridCanvas.tsx`

---

## Convenciones importantes

- Todas las coordenadas de puntos están en **espacio canvas** (no espacio local de Fabric)
- `linesMetaRef` — fuente de verdad de `GridLineData[]`; los objetos Fabric son solo representación visual
- `freeLabelsMetaRef` — ídem para free labels
- `anchorsMetaRef` — ídem para anchors
- `manualLabelPositionsRef` — posiciones overrideadas por el usuario (drag de labels)
- `objectCaching: false` en todos los IText para evitar artefactos de caché
- `applyBackgroundPadding()` se llama en todo `IText` con `backgroundColor` (grid labels, free labels, anchor badges tipo "label", anchor notes)

---

## Features implementadas (completo a 2026-06-04)

- [x] Upload imagen (JPG/PNG), drag-and-drop
- [x] Zoom/pan/reset view
- [x] Generación automática de grilla (líneas verticales y horizontales)
- [x] Labels editables: prefijo, dirección, posición (top/bottom/left/right)
- [x] Labels manuales (free labels) con estilo por-label
- [x] Edición inline de labels (doble clic)
- [x] Puntos de control draggables en líneas (Polyline)
- [x] Insertar/eliminar puntos de control
- [x] Lock/unlock líneas
- [x] Move-grid mode (mover toda la grilla)
- [x] Scale grid
- [x] Undo/redo (40 pasos)
- [x] Save/load JSON (localStorage + descarga)
- [x] Export PNG, JPG, clipboard
- [x] PWA manifest + favicon FCRS
- [x] Welcome screen con branding FCRS
- [x] Modo Project multi-facade (North/South/East/West/Rooftop/Other)
- [x] Anchors: marcadores de puntos de anclaje, 4 tipos de marker, notas independientes en canvas, estilos editables
- [x] RightSidebar colapsable en 3 secciones (Grid / Labels / Anchors)
- [x] Fix: aislamiento de posiciones de labels por tab de proyecto

---

## Próximas features sugeridas (no implementadas)

- [ ] PDF export
- [ ] Cloud storage (Supabase)
- [ ] User accounts
- [ ] Defect markers sobre la grilla (diferente a anchors)
- [ ] Comentarios de inspección
- [ ] Integración AIMMS/FCRS
- [ ] Templates de grilla predefinidos
- [ ] Multi-facade project (ya hay tipo `MultiFacadeProjectData` en `types/grid.ts`)

---

## Notas técnicas para el próximo dev

1. **Fabric.js v7 breaking changes:** Las APIs difieren de v5/v6. Para Fabric: no usar documentación de v5 como referencia.

2. **`_renderBackground` patch:** `applyBackgroundPadding` en `grid-labels.ts` sobreescribe un método privado de Fabric.js. Si se actualiza Fabric.js, verificar que `_renderBackground` y `_getNonTransformedDimensions` sigan teniendo las mismas firmas.

3. **Font measurement en Fabric.js:** Fabric.js mide texto a 400px (`CACHE_FONT_SIZE`) y escala. Con fuentes con optical sizing (SF Pro en macOS), esto genera discrepancias respecto al rendering real. El patch de padding compensa esto.

4. **`originX: "center"` (default de Fabric.js):** Los IText se posicionan por su centro. `left`/`top` = coordenadas del centro del objeto.

5. **`useImperativeHandle` en GridCanvas:** Todos los métodos del canvas se exponen via ref. No agregar lógica de negocio en el handle; solo llamadas hacia `canvasRef.current`.

6. **Anchors son session-only:** No se guardan en `ProjectData`, no están en el historial de undo/redo, y se resetean al cambiar de tab (`applyProject` llama `renderAnchors(canvas, [])` que los limpia). Si en el futuro se quiere persistirlos, agregar `anchors?: AnchorData[]` a `ProjectData` y restaurarlos en `applyProject`.

7. **`ANCHOR_NOTES_KEY` vs `ANCHOR_KEY`:** Ambos reportan el mismo `anchorId` en `fireSelection`. La distinción entre badge y notes solo importa internamente para saber qué objeto borrar. Nunca filtrar por tipo de objeto — usar las keys.

8. **buildAnchorBadge / buildAnchorNotesText:** Funciones de nivel de módulo (fuera del componente React) en `GridCanvas.tsx`. Tienen acceso a `applyBackgroundPadding` porque está importado a nivel de módulo. Si se mueven a otro archivo, asegurarse de que `applyBackgroundPadding` esté disponible.
