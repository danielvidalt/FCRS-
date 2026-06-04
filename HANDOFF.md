# FCRS Grid Tool — Hand-off

**Última actualización:** 2026-06-04  
**Producción:** https://fcrs-zeta.vercel.app  
**Repo:** https://github.com/danielvidalt/FCRS-

---

## Estado actual

La app está en producción y funcional. Todas las features del MVP están implementadas. Los bugs críticos de renderizado de labels han sido corregidos.

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
    RightSidebar.tsx     — settings de grid, labels, export, insert label
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
    grid.ts             — GridSettings, GridLineData, FreeLabelData, ProjectData, etc.
```

---

## Flujo de datos principal

```
FacadeGridMapper (estado: settings, panMode, moveGridMode)
  ↕ props + ref
GridCanvas (ref handle: generateGrid, addFreeLabel, undo, redo, …)
  → Fabric.js Canvas
      → Polyline (líneas de grilla)   — GRID_LINE_KEY
      → IText   (labels de línea)    — LABEL_KEY
      → IText   (free labels)        — FREE_LABEL_KEY
```

`GridCanvas` expone un `useImperativeHandle` con ~20 métodos imperativo. `FacadeGridMapper` los llama desde los sidebars via `canvasRef.current.método()`.

---

## Sistema de labels

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

### Bug de background corregido (2026-06-04)
**Causa:** Fabric.js `_renderBackground` dibuja el rect de fondo con `width × height` del objeto, SIN incluir el `padding`. Esto dejaba el último carácter fuera del fondo.

**Fix en `grid-labels.ts` → `applyBackgroundPadding(text)`:** sobreescribe `_renderBackground` en cada instancia de `IText` para extender el rect por `padding` en los cuatro lados. Se llama tras cada `new IText(...)` en `GridCanvas.tsx` (3 sitios: `renderLabels`, `renderFreeLabels`, `addFreeLabel`).

---

## Sistema de historia (undo/redo)

- Stack en `historyRef` (máx. 40 entradas), índice en `historyIndexRef`
- Cada entrada: `{ lines, freeLabels, view, hiddenLabelKeys }`
- `pushHistory()` se llama tras cualquier acción significativa
- Undo/redo rerenderiza líneas y labels desde el snapshot

---

## Convenciones importantes

- Todas las coordenadas de puntos están en **espacio canvas** (no espacio local de Fabric)
- `linesMetaRef` — fuente de verdad de `GridLineData[]`; los objetos Fabric son solo la representación visual
- `freeLabelsMetaRef` — ídem para free labels
- `manualLabelPositionsRef` — posiciones overrideadas por el usuario (drag de labels)
- `objectCaching: false` en todos los IText para evitar artefactos de caché

---

## Features implementadas (MVP completo)

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

---

## Próximas features sugeridas (no implementadas)

- [ ] PDF export
- [ ] Cloud storage (Supabase)
- [ ] User accounts
- [ ] Defect markers sobre la grilla
- [ ] Comentarios de inspección
- [ ] Integración AIMMS/FCRS
- [ ] Templates de grilla predefinidos
- [ ] Multi-facade project (ya hay tipo `MultiFacadeProjectData` en `types/grid.ts`)

---

## Notas técnicas para el próximo dev

1. **Fabric.js v7 breaking changes:** Las APIs difieren de v5/v6. Leer `node_modules/next/dist/docs/` si se actualiza Next.js. Para Fabric: no usar la documentación de v5 como referencia.

2. **`_renderBackground` patch:** El método `applyBackgroundPadding` en `grid-labels.ts` sobreescribe un método privado de Fabric.js. Si se actualiza Fabric.js, verificar que `_renderBackground` y `_getNonTransformedDimensions` sigan teniendo las mismas firmas.

3. **Font measurement en Fabric.js:** Fabric.js mide texto a 400px (`CACHE_FONT_SIZE`) y escala. Con fuentes con optical sizing (SF Pro en macOS), esto genera discrepancias respecto al rendering real. El patch de padding compensa esto.

4. **`originX: "center"` (default de Fabric.js):** Los IText se posicionan por su centro. `left`/`top` = coordenadas del centro del objeto.

5. **`useImperativeHandle` en GridCanvas:** Todos los métodos del canvas se exponen via ref. No agregar lógica de negocio en el handle; solo llamadas hacia `canvasRef.current`.
