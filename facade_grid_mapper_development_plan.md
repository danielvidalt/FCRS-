# Facade Grid Mapper — Development Plan

## 1. Project Overview

### Project Name
Facade Grid Mapper  
Alternative internal AIMMS name: FCRS Grid Tool

### Purpose
Develop a simple and professional web application that allows users to upload an image of a building facade or rooftop and overlay a fully customizable editable grid system on top of the image.

The tool is designed for facade inspections, rooftop analysis, defect mapping, technical referencing, and future integration with AIMMS/FCRS systems.

---

# 2. Core Features

## A. Image Upload

### Functionalities
- Upload image from computer.
- Support JPG and PNG.
- Display image inside an editable workspace.
- Zoom in/out.
- Pan/move image.
- Reset image position and zoom.

---

## B. Automatic Grid Generation

### Main Button
Generate Grid

### User Settings
- Number of vertical lines.
- Number of horizontal lines.
- Automatic spacing.
- Line color.
- Line thickness.
- Line opacity/transparency.
- Line style:
  - Solid
  - Dashed
  - Dotted

---

## C. Vertical Labels

### Options
- Left-to-right numbering.
- Right-to-left numbering.
- Editable prefix.

### Example
D1, D2, D3, D4...

### Additional Features
- Manual editing of each label.
- Label position:
  - Top
  - Bottom
  - Both

---

## D. Horizontal Labels

### Options
- Bottom-to-top numbering.
- Top-to-bottom numbering.
- Editable prefix.

### Example
L1, L2, L3, L4...

### Additional Features
- Manual editing of each label.
- Label position:
  - Left
  - Right
  - Both

---

## E. Editable Grid Lines

### Line Selection
Each line can be selected individually.

### When Selected
The line displays editable control points.

### Functionalities
- Drag endpoints.
- Make lines vertical, horizontal, diagonal, or perspective-adjusted.
- Add extra control points.
- Delete control points.
- Lock/unlock lines.

### Goal
Allow grid lines to follow the real perspective and geometry of the building.

---

## F. Save Project

### Save Data
- Original image.
- Grid configuration.
- Labels.
- Colors.
- Control points.
- Line positions.

### Recommended Format
JSON

---

## G. Export Final Result

### Export Options
- Export as JPG.
- Export as PNG.
- Download Screenshot.
- Copy to Clipboard.

### Export Includes
- Original image.
- Grid overlay.
- Labels.
- Final adjustments.

---

# 3. User Interface Design

## Main Layout

### Top Toolbar
- Save Project
- Export
- Undo
- Redo
- Reset

---

## Left Sidebar
### Image Controls
- Upload image
- Zoom
- Pan
- Reset view

---

## Center Workspace
### Editable Canvas
- Main image
- Grid overlay
- Interactive editing

---

## Right Sidebar
### Grid Settings
- Vertical lines count
- Horizontal lines count
- Label prefixes
- Numbering directions
- Color settings
- Thickness settings
- Transparency settings
- Export options

---

# 4. User Workflow

## Step-by-Step

### Step 1
User uploads facade or rooftop image.

### Step 2
User chooses:
- Number of vertical lines.
- Number of horizontal lines.

### Step 3
User clicks:
Generate Grid

### Step 4
Automatic grid appears.

### Step 5
User adjusts lines manually.

### Step 6
User edits labels if needed.

### Step 7
User saves project.

### Step 8
User exports final image.

---

# 5. Recommended Technologies

## Frontend
- React
- Next.js
- Tailwind CSS

## Canvas System
- Fabric.js

## Storage
### MVP
- LocalStorage

### Future
- Supabase

## Deployment
- Vercel

---

# 6. Why Fabric.js

Fabric.js is ideal because it already supports:
- Interactive canvas editing.
- Draggable objects.
- Editable lines.
- Control points.
- Text labels.
- Image overlays.
- Exporting canvas content.

---

# 7. MVP (Minimum Viable Product)

## Version 1 Scope

### Include
- Image upload.
- Automatic grid generation.
- Adjustable line count.
- Editable labels.
- Draggable line endpoints.
- Export JPG/PNG.
- Local save/load.

### Do NOT Include Yet
- Login system.
- Database.
- Cloud sync.
- Multi-user collaboration.
- AI analysis.
- Defect management.

Goal:
Get a stable working editor first.

---

# 8. Future Versions

## Version 2 Features
- Cloud storage.
- User accounts.
- Templates.
- FCRS coordinate system.
- PDF export.
- Defect markers.
- Inspection comments.
- QR integration.
- Reporting integration.
- AIMMS integration.

---

# 9. Future AIMMS/FCRS Integration

## Potential Expansion
The tool can evolve into a complete facade mapping platform integrated with:
- Defect tracking.
- Rope access inspections.
- QR tags.
- Building history.
- Technical reporting.
- Asset management.

---

# 10. Initial Development Prompt

```text
Create a web application called Facade Grid Mapper.

The app must allow the user to upload an image of a building facade or rooftop and overlay a fully customizable grid on top of it.

Core features:
1. Upload image.
2. Display image inside an editable canvas.
3. Generate vertical and horizontal grid lines based on user input.
4. Allow user to define the number of vertical lines and horizontal lines.
5. Allow custom labels for vertical lines, such as D1, D2, D3.
6. Allow custom labels for horizontal lines, such as L1, L2, L3.
7. Every label must be editable manually.
8. Each grid line must be selectable.
9. Show draggable control points.
10. Allow perspective adjustments.
11. Allow adding extra control points.
12. Allow deleting control points.
13. Allow changing line styles.
14. Allow saving project configuration as JSON.
15. Allow exporting as PNG or JPG.

Use React, Tailwind CSS, and Fabric.js.
```
