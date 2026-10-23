# Page Override: admin.html (Admin Panel)

Overrides: MASTER.md rules for this page only.

## Visual Identity

The admin panel is a command center for the pharmacy. It should feel authoritative, dense, and scannable — like a dispatch board. The sidebar uses the primary color as a thin vertical accent strip (right edge, since RTL) rather than a full-color background. Tables use flat design: white cards, 1px borders, green status chips.

### Color Adaptations

- Sidebar background: white with right border `#BBF7D0`
- Active nav item: background `#F0FDF4`, text `#15803D`, right border 3px `#15803D`
- Stats cards: white with border `#BBF7D0`, value in primary `#15803D`
- Status chips: pending (amber), confirmed/priced (green), delivered (green), cancelled (red)

## Layout Concept

RTL. Sidebar on the right (230px), main content on the left.

```
┌──────────────┬────────────────────────────────────────┐
│  Sidebar     │  Topbar                                │
│  (right)     │  [Menu] [Title] [Status]               │
│              │                                        │
│  [Dashboard] │  Stats Grid (4 cards)                  │
│  [Orders]    │                                        │
│  [Products]  │  Page Content (table, form, etc.)      │
│  [Couriers]  │                                        │
└──────────────┴────────────────────────────────────────┘
```

## Typography

- Headings: Noto Naskh Arabic, 700-800 weight
- Body/table text: Noto Sans Arabic, 400-500 weight
- Stats values: Noto Sans Arabic, 900 weight, monospace-ish feel for numbers

## Component Specs

- Stat cards: flat, no shadow, 1px border, border-radius 12px
- Tables: zebra stripes not needed; hover row tint `#F0FDF4`
- Badges/chips: flat, no shadow, border-radius 20px (pill)
- Forms: inputs with 1px border, focus ring 3px `#15803D20`
- Modals: white, border-radius 16px, overlay backdrop blur

## Anti-Pattern Check

- No emoji icons in nav — use SVG
- No gradient buttons — flat primary/secondary only
- No AI cliché layouts
- No all-caps labels