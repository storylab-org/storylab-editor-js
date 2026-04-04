# Design System — Storylab

A reference for UI design decisions, token values, and consistency across the Lexical editor and Draft Board.

---

## 1. Z-Index Ladder

The canonical stacking order. **Never invent a new level—pick the nearest slot or add a new row to this table.**

| Value | Layer | Elements | Notes |
|---|---|---|---|
| `0` | Canvas base | `<svg>` ConnectionLayer | Sits behind all cards |
| `1` | Cards (default) | `BoardCard` (non-selected, non-dragging) | Normal card z-index |
| `5` | Popovers | `EntityCardPopover`, `EntityMentionPopover` | Lowest overlay layer; can be covered by modals |
| `10` | UI Chrome | `.editor-toolbar`, `.draft-board-toolbar`, `.formatting-toolbar` (sticky) | Always above canvas content |
| `15` | Drag previews | `PreviewCard` (chapter/entity/shape) | Drag ghost during preview |
| `20` | Palettes | `.slash-command-palette`, `.entity-mention-palette` | Autocomplete/entity picker dropdowns |
| `25` | Toasts | `.toast-container` | Notification stack |
| `29` | Modal backdrops | `*-backdrop` divs | Transparent click-capture layer |
| `30` | Modals | `*-panel` divs, reset confirm, inline modals | Modal panels always sit on backdrops |
| `35` | Dropdowns | `.dropdown` (ToolbarStyles) | Shared dropdown overlay (has `!important`) |
| `100` | Hover bars | `.board-card-hover-bar` | Floating action bar on card hover |
| `1000` | Dragging card | `BoardCard` during drag | Dynamic escalation while dragging |

---

## 2. Colour Palette

### Primary & Brand
| Hex | Usage | Contexts |
|---|---|---|
| `#0066cc` | Primary action, focus rings, connection arrows, active states | Button primary bg, input focus border, arrow normal colour |
| `#0052a3` | Primary hover | Button primary hover bg |
| `#4a9eff` | Active format button background, drag target line | Format button `.active`, connection target line |
| `#3b82f6` | Chapter badge accent | Chapter badge `border-left`, Book icon colour |

### Entity Type Accents
Used everywhere entity types appear (chips, badges, icons, borders, text).

| Entity | Hex | Semantic | Usage |
|---|---|---|---|
| **Character** | `#7c3aed` | Purple | Chip border, badge border, icon, text highlight |
| **Location** | `#0d9488` | Teal | Chip border, badge border, icon, text highlight |
| **Item** | `#b45309` | Amber | Chip border, badge border, icon, text highlight |

**Important**: Entity colours are defined in `src/components/draftboard/entityConstants.ts`. Never hardcode these values.

### Semantic / Status
| Hex | Usage | Context |
|---|---|---|
| `#d32f2f` | Destructive action | Clear board button |
| `#ff6666` | Delete icon, danger hover | Card delete button, path delete glyph |
| `#cc3300` | Error toast text | Toast border + icon colour |
| `#cc8800` | Warning toast | Toast border + icon colour |
| `#d68910` | Duplicate warning text | Warning badge text |
| `#ffa726` | Duplicate warning border | Warning badge border-left, apply-order note border |
| `#fff3e0` | Duplicate warning background | Warning badge background |

### Text & Typography Scale
| Hex | Lightness | Usage |
|---|---|---|
| `#0f0f0f` / `#1a1a1a` | Darkest | Primary text (titles, headers, body) |
| `#333` | Very dark | Secondary text, toolbar labels |
| `#555` / `#666` | Dark | Muted text, descriptions, SVG labels |
| `#999` | Medium | Placeholder text, disabled state |
| `#bbb` / `#aaa` | Light | Hint text, footer text |

### Surface & Background
| Hex | Usage | Lightness |
|---|---|---|
| `#ffffff` | Default surface | Brightest—toolbars, cards, modals, popovers, chips |
| `#fafafa` | Canvas background | Very light—draft board canvas, toolbar background |
| `#f5f5f5` | Secondary surface | Light—badge/chip backgrounds, button secondary hover |
| `#f0f0f0` | Hover state | Light—button hover background, panel hover |
| `#e0e0e0` | Active state | Light—button active background |

### Borders
| Hex | Usage | Strength |
|---|---|---|
| `#e5e5e5` | Structural dividers | Weakest—toolbar bottom border, modal section dividers |
| `#e5e7eb` | Popover/palette borders | Weak—slightly blue-grey tone |
| `#d0d0d0` | Input/button borders | Medium—form inputs, toolbar buttons, dropdowns |
| `#d9d9d9` | Secondary button borders | Medium—secondary buttons, chapter inputs |

### Overlays & Shadows
| Value | Usage | Contexts |
|---|---|---|
| `rgba(0,0,0,0.15)` | Standard shadow | `0 4px 12px` modal/popover shadows |
| `rgba(0,0,0,0.2)` | Drag ghost shadow | `0 4px 12px` drag preview |
| `rgba(0,0,0,0.3)` | Strong shadow | `0 5px 15px` stronger drag ghost effect |
| `rgba(40, 40, 40, 0.6)` | Modal overlay (dark) | Backdrop (deprecated, use transparent instead) |
| `rgba(0, 0, 0, 0.5)` | Dialog overlay | Insert table dialog overlay |

### Editor Background Presets
Selectable chapter background colours:

| Preset | Hex | Theme |
|---|---|---|
| White | `#ffffff` | Clean, bright |
| Light | `#f9f9f9` | Soft white |
| Parchment | `#f5f0e8` | Warm, paper-like |
| Sepia | `#fdf6e3` | Vintage, warm |
| Dark | `#1e1e1e` | Dark mode |
| Soft Dark | `#2d2d2d` | Dark mode variant |

---

## 3. Typography

### Font Sizes
| Value | Usage | Contexts |
|---|---|---|
| `12px` | Smallest detail | Badge text, descriptions, SVG labels, small form labels |
| `13px` | Small body | Toolbar items, card titles (compact), modal inputs/buttons/labels, toolbar buttons |
| `14px` | Regular body | Card titles (full), list items, body text in modals/popovers, chapter items |
| `15px` | Large | Modal/panel headers, form label text |
| `16px` | Main | Editor input, chapter title, main heading (h5 in editor) |
| `0.9em` / `0.95em` / `1.1em` / `1.25em` / `1.5em` / `2em` | Relative | Code, subscript, h6, h4, h3, h2, h1 (editor content) |

### Font Weights
| Value | Usage | Contexts |
|---|---|---|
| `300` | Thin | Scene break text, minimal emphasis |
| `400` | Regular | Body text default, normal weight |
| `500` | Medium | Card titles, badge text, toolbar labels, button labels, input labels |
| `600` | Semibold | Section headers, modal titles, entity badge type labels, chapter settings labels |
| `700` | Bold | Heading elements (h1–h6 in editor) |

### Font Families
| Family | Usage | File |
|---|---|---|
| `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` | UI text (buttons, labels, modals) | `ToastContainer.css` line 35 |
| `'JetBrains Mono', 'Fira Code', 'Menlo', 'Monaco', 'Courier New', monospace` | Code blocks only | `PlaygroundEditorTheme.css` |

### Line Heights
| Value | Usage | Contexts |
|---|---|---|
| `1.4` | Body text | Descriptions in modals, toast messages, popover text |
| `1.6` | Code | Code block content |
| `1.7` | Editor default | Editor shell base line-height |

---

## 4. Spacing & Sizing Tokens

### Border Radius
| Value | Usage | Shapes |
|---|---|---|
| `4px` | Default | Buttons, inputs, badges, dropdowns, toolbar buttons, swatches, dividers |
| `6px` | Medium | Rectangle cards, entity chips, chapter badges, modal panels |
| `8px` | Large | Popovers, palettes, dialogs |
| `12px` | Extra large | Tag pills in editor modals |
| `14px` | Extra large | Tag pills in Draft Board popovers |
| `50%` | Circle | Circle cards |

### Padding
| Element | Value | Usage |
|---|---|---|
| Icon buttons | `0` | Buttons are 32×32px or 24×24px containers; no padding |
| Text+icon buttons | `0 10px` (toolbar), `6px 12px`, `8px 16px` | Toolbar buttons, modal buttons, dropdown items |
| Chips/badges | `8px 12px` | Entity chips, chapter badges, entity badges |
| Cards | `12px` | Shape card internal padding |
| Modal sections | `16px` | Header, body, footer all have 16px padding |
| Popovers | `12px` | Popover internal padding |

### Gap (Flexbox)
| Context | Value | Usage |
|---|---|---|
| Between toolbar buttons | `4px` | Toolbar button spacing |
| Between toolbar sections | `8px`–`16px` | Section groups in toolbar |
| Between modal fields | `12px` | Form field spacing in modals |
| Between badge/chip internals | `8px` | Icon + text gap in chips, badges |
| Between tag pills | `6px` | Tag list spacing |

### Sizing
| Dimension | Value | Element |
|---|---|---|
| Icon buttons (square) | `32×32px` | Toolbar format buttons, chapter settings button |
| Icon buttons (compact) | `24×24px` | Card handle, unlink button |
| Toolbar button icon size | `14px`–`16px` | Lucide icon `size` prop |
| Hover bar | `36px` height | Floating action bar (4px padding + 24px buttons + gap) |
| Shape cards | 200×120 (rect), 160×160 (circle/diamond), 160×140 (triangle) | Canvas card dimensions |
| Entity chip | `160px` width | Card chip width (fixed) |
| Canvas inner | `6000px` height × `9999px` width | Scrollable canvas bounds |
| Popover | `280px` width | Entity card popover width |
| Modal | min `320px` / max `450px` width | Entity creation modal |
| Palette | `320px` width, max `280px` height | Entity mention palette |

---

## 5. Animation & Transition Tokens

### Micro-interactions (0.15s default)
Used for hover states, active states, and small state changes:

```css
transition: all 0.15s; /* Default easing (ease) */
transition: background 0.15s;
transition: opacity 0.15s;
transition: color 0.15s;
transition: box-shadow 0.15s;
transition: transform 0.15s;
```

Contexts: button hover, badge unlink hover, colour swatch scale, chapter badge hover, etc.

### Toolbar buttons (0.2s)
```css
transition: all 0.2s ease;
```

Used on primary/secondary toolbar buttons for smoother state changes.

### Popover/palette entrance (0.2s)
Standard pattern for all popovers and palettes—vertical slide + fade:

```css
animation: palette-fade-in 0.2s ease-out;

@keyframes palette-fade-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

For slash palette: `120ms ease-out` instead of `0.2s`.

### Toast entrance (0.2s)
Horizontal slide from right + fade:

```css
animation: toast-enter 0.2s ease forwards;

@keyframes toast-enter {
  from {
    opacity: 0;
    transform: translateX(110%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
```

### Saving indicator
Opacity pulse while saving:

```css
animation: pulse 1.5s ease-in-out infinite;

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}
```

### No transforms except entrance/pulse
Avoid `scaleX()`, `scaleY()`, `rotate()`, `skew()` on interactive elements. Exception: colour swatches scale on hover (`scale(1.1)` / `scale(0.95)`).

---

## 6. Shadow & Depth

### Standard shadow (0 4px 12px)
```css
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
```

Used on: modals, popovers, palettes, dropdowns.

### Strong shadow (0 5px 15px)
```css
box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
```

Used on: drag ghost when hovering over drop zones.

### Subtle shadow (0 1px 4px / 0 2px 6px)
```css
box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
```

Used on: cards, badges, smaller elements.

### Toolbar shadow (0 1px 2px)
```css
box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
```

Very subtle shadow on top chrome elements.

---

## 7. Special Values & Patterns

### Editor toolbar layout
- Padding: `12px 20px`
- Gap between sections: `16px`
- Word count badge: `4px 8px` padding, `#f5f5f5` background, `13px` font

### Draft board canvas
- Top padding: `40px` (clearance for hover bars)
- Inner size: `6000px` height × `9999px` width
- Background: `#fafafa`
- Toolbar background: `#fafafa`

### Connection arrow
- Normal: `#0066cc` stroke, 2px width
- Rewiring preview: `#ff9900`
- Delete button: `#ff6600` fill circle with `#1a1a1a` glyph
- Label text: `#666`, `12px` font

### Card shape defaults
- Rectangle: `200px` × `120px`, `border-radius: 6px`
- Circle: `160px` × `160px`, `border-radius: 50%`
- Diamond: `160px` × `160px`, `clip-path: polygon(...)`
- Triangle: `160px` × `140px`, `clip-path: polygon(...)`
- Default fill: `#fff9e6` (off-white)
- Preview fill: `#ffe6cc` with `#ffd699` border

### Modal dimensions
- Backdrop: full viewport, `position: fixed` with transparent background
- Panel: centred via `top: 50% / left: 50% / transform: translate(-50%, -50%)`
- Typical width: 320–450px min/max
- Border: `1px solid #e5e5e5` (optional)
- Corner radius: `6px`

---

## 8. Implementation Notes

### CSS custom properties (future use)
Consider defining tokens as CSS variables for easier theming:

```css
:root {
  --color-primary: #0066cc;
  --color-primary-hover: #0052a3;
  --color-entity-character: #7c3aed;
  --color-entity-location: #0d9488;
  --color-entity-item: #b45309;
  
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 12px;
  --spacing-lg: 16px;
  
  --z-card: 1;
  --z-popover: 5;
  --z-toolbar: 10;
  --z-modal: 30;
  
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
}
```

### Dark mode preparation
All current colour values assume a light theme. Dark mode would require inverse palettes for surfaces and text, but entity type accents would remain consistent.

### Accessibility
- All text colours meet WCAG AA contrast (4.5:1 for body, 3:1 for UI)
- Focus rings are always `#0066cc` with visible offset
- Entity type colours are not the sole way to distinguish types—always pair with text labels or icons

