# Draft Board Guide

**Last Updated:** April 2, 2026
**Version:** Storylab v0.2.1

## Overview

The **Draft Board** is a visual canvas for planning your story structure. It lets you create chapter cards, organise them spatially, and link them with connections to show narrative flow. Each card can represent a chapter, scene, or plot point, and arrows show how they connect.

---

## Features

### Card Shapes

Cards come in four different shapes, each suited to different planning needs:

| Shape | Dimensions | Use Case |
|-------|-----------|----------|
| **Rectangle** | 200 × 120px | Standard chapters with title + content |
| **Circle** | 160 × 160px | Key plot points or turning moments |
| **Diamond** | 160 × 160px | Decision points or branching paths |
| **Triangle** | 160 × 140px | Climactic moments or resolutions |

Each card displays:
- **Title** (required, editable)
- **Body text** (rectangles only)
- **Colour** (customisable from 6 presets)
- **Chapter link** (optional badge showing linked chapter)

### Connections (Arrows)

Arrows connect cards to show narrative flow or relationships:
- **Directional** — Arrow points to the target card
- **Editable** — Drag the start/end point to rewire
- **Deletable** — Select and press Backspace/Delete or click the X button

---

## Toolbar

The **Draft Board Toolbar** (top-left) provides shape selection and connection controls:

| Button | Action |
|--------|--------|
| ▭ | Add rectangle card |
| ○ | Add circle card |
| ◇ | Add diamond card |
| △ | Add triangle card |
| → | Toggle connection mode |
| ⟲ | Reset board (clear all cards) |

---

## How to Use

### Adding Cards

1. Click a shape button (▭, ○, ◇, △) in the toolbar
2. Hover to see a preview
3. Click on the canvas where you want to place the card
4. A new card appears ready for editing

### Editing Cards

**Title:**
- Click or tap the title field
- Type to edit
- Auto-saves to server

**Body text** (rectangles only):
- Click or tap the body area
- Type to edit
- Auto-saves to server

**Colour:**
- Click the palette icon (🎨) in the card's hover bar
- Choose from 6 colour presets
- Colour updates immediately

**Delete:**
- Click the X button (✕) in the card's hover bar
- Card is deleted immediately
- Connected arrows are also deleted

### Moving Cards

- Grab the grip handle (⋮⋮) in the card's hover bar
- Drag to reposition
- Position updates on release

### Linking Chapters

Cards can be linked to chapters in your manuscript:

1. Click the book icon (📖) in the card's hover bar
2. Chapter picker modal opens
3. Select a chapter to link
4. Card shows a chapter badge with the chapter name
5. Click the X on the badge to unlink

---

## Creating Connections (Arrows)

### Method 1: Arrow Button + Click-Click

1. Click the arrow button (→) in the toolbar to enable connection mode
2. Click on the first card to start the connection
3. Click on the second card to complete the connection
4. Arrow is drawn from first card to second card

### Method 2: Direct Drag (Coming Soon)

Hold down the arrow button on a card and drag to another card (currently uses click-click method).

---

## Managing Connections

### Selecting an Arrow

Click on the arrow line to select it:
- Arrow becomes opaque
- Delete button (orange circle with ✕) appears at the midpoint
- Selection outline shows the connection

### Deleting an Arrow

**Option 1 — Delete Button:**
1. Click the arrow to select it
2. Click the orange ✕ button

**Option 2 — Keyboard Shortcut:**
1. Click the arrow to select it
2. Press `Backspace` or `Delete`

### Rewiring an Arrow

Drag the endpoint circles (small dots) to change which cards the arrow connects:

- **Grab the dot at the start** of the arrow → drag to a different card
- **Grab the dot at the end** of the arrow → drag to a different card
- Release over a card to complete the rewire

---

## Canvas Navigation

### Scrolling

The draft board canvas is tall (6000px) to accommodate large story structures:
- **Scroll vertically** to navigate up/down
- Cards maintain their position as you scroll
- Connections update automatically

### Selecting Multiple Cards

Currently, only one card at a time is selected (shown with a highlight border). Multi-select is planned for a future release.

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Escape` | Cancel card placement, connection mode, or rewiring |
| `Backspace` / `Delete` | Delete selected arrow |

---

## Technical Details

### Data Structure

**Card:**
```typescript
interface BoardCard {
  id: string
  shape: 'rectangle' | 'circle' | 'diamond' | 'triangle'
  x: number                    // Canvas position (left)
  y: number                    // Canvas position (top)
  title: string
  body?: string                // Only for rectangles
  color: string
  chapterId?: string           // Optional chapter link
  chapterName?: string
}
```

**Connection:**
```typescript
interface StoryPath {
  id: string
  fromCardId: string
  toCardId: string
  label?: string               // Optional path label
}
```

### Files

| File | Purpose |
|------|---------|
| `src/components/draftboard/DraftBoard.tsx` | Main wrapper component |
| `src/components/draftboard/DraftBoardCanvas.tsx` | Canvas & keyboard shortcuts |
| `src/components/draftboard/BoardCard.tsx` | Individual card component |
| `src/components/draftboard/ConnectionLayer.tsx` | Arrows & connections (SVG) |
| `src/components/draftboard/DraftBoardToolbar.tsx` | Toolbar buttons |
| `src/components/draftboard/ChapterPickerModal.tsx` | Chapter selection dialog |
| `src/components/draftboard/useBoardState.ts` | State management hook |
| `server/src/routes/draftboard.ts` | Server API |
| `src/api/draftboard.ts` | Client API & types |

### API Endpoints

All endpoints use JSON and return standard responses:

| Method | Endpoint | Action |
|--------|----------|--------|
| `GET` | `/api/draftboard/board` | Get all cards |
| `PUT` | `/api/draftboard/board` | Replace all cards |
| `POST` | `/api/draftboard/cards` | Create card |
| `PATCH` | `/api/draftboard/cards/:id` | Update card |
| `PATCH` | `/api/draftboard/cards/:id/position` | Update card position |
| `DELETE` | `/api/draftboard/cards/:id` | Delete card |
| `GET` | `/api/draftboard/paths` | Get all connections |
| `POST` | `/api/draftboard/paths` | Create connection |
| `DELETE` | `/api/draftboard/paths/:id` | Delete connection |

---

## Tips & Best Practices

- **Use shapes consistently** — Use diamonds for decision points and circles for climaxes to help readers visualise your structure at a glance
- **Colour-code by status** — Use different colours to mark draft, revision, or completed sections
- **Link chapters early** — Linking cards to chapters keeps your board in sync with your manuscript
- **Keep spacing logical** — Position related cards near each other to show narrative proximity
- **Test connections** — Before writing, trace arrows to ensure your plot flow makes sense

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Arrow won't connect | Click arrow button first to enable connection mode |
| Can't delete arrow | Click the arrow first to select it, then press Backspace |
| Card position reverts | Wait for auto-save (0.5 sec), check server logs if error persists |
| Chapter link disappears | Ensure the chapter still exists in your manuscript |
| Canvas is slow | Too many cards (100+) can affect performance; consider archiving old cards |

---

## Future Features

- [ ] Arrow labels (name the connection type)
- [ ] Multi-select & batch operations
- [ ] Keyboard-only connection creation
- [ ] Card grouping & collapsing
- [ ] Export story structure as outline
- [ ] AI suggestions for narrative flow
