# Facade Grid Mapper

Web app for overlaying a customizable inspection grid on building facade or rooftop images. Built for facade inspections, defect mapping, and future AIMMS/FCRS integration.

## Stack

- **Next.js** (App Router) + **React** + **TypeScript**
- **Tailwind CSS**
- **Fabric.js** (interactive canvas)

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Workflow

1. Upload a JPG or PNG image.
2. Set vertical/horizontal line counts and label options in the right sidebar.
3. Click **Generate Grid**.
4. Drag line endpoints (and add control points) to match building perspective.
5. Edit labels directly on the canvas or via prefixes.
6. **Save Project** — downloads JSON and stores a copy in `localStorage`.
7. **Export PNG/JPG** or copy the result to the clipboard.

## MVP features

- Image upload, zoom, pan, reset view
- Automatic grid generation with adjustable counts
- Editable labels (D1, L1, …) with direction and position options
- Selectable grid lines with draggable control points
- Line color, thickness, opacity, solid/dashed/dotted styles
- Lock/unlock lines
- Save/load project JSON
- Export PNG, JPG, clipboard

## Deploy

Deploy to [Vercel](https://vercel.com) or any Node host:

```bash
npm run build
npm start
```
