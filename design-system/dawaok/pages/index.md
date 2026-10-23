# Page Override: index.html (Main Store)

Overrides: MASTER.md rules for this page only.

## Visual Identity

The hero opens with the most characteristic thing in a pharmacy's world: the medicine cabinet shelf — a grid of medicine boxes with varying heights, colors, and labels — rendered as an illustrative CSS grid behind the hero headline, not as a photo. This is the "shelf" motif that runs through the entire site: product cards look like medicine boxes on a shelf, with the product name as the label on the box spine.

### Color Adaptations

- Primary `#15803D` is used sparingly — only for primary CTAs, active states, and the shelf label accent strip on product cards.
- Background `#F0FDF4` remains the page background.
- Cards are pure white `#FFFFFF` with a 1px border `#BBF7D0` and subtle shadow — they look like medicine boxes on a shelf.
- Accent `#0369A1` for secondary actions (outline buttons, links).

## Layout Concept

RTL layout. Content right-aligned by default.

```
┌─────────────────────────────────────────────────────────┐
│  Header (sticky)                                        │
│  [Logo]        [Search]          [Rx FAB] [Cart FAB]   │
├─────────────────────────────────────────────────────────┤
│  Hero                                                   │
│  [Shelf illustration CSS grid — decorative]             │
│  Headline: "صيدليتك في جيبك"                            │
│  Subhead: "أدويتك وروشتتك حتى باب البيت"                │
│  [Primary CTA] [Secondary CTA]                          │
├─────────────────────────────────────────────────────────┤
│  Categories (horizontal scroll chips)                   │
│  [الكل] [أدوية] [فيتامينات] [عناية] [طفل] [مستلزمات]  │
├─────────────────────────────────────────────────────────┤
│  Products Grid (shelf motif — cards look like boxes)   │
│  [Card] [Card] [Card] [Card]  (responsive wrap)         │
└─────────────────────────────────────────────────────────┘
```

## Typography

- Headings: Noto Naskh Arabic (elegant, traditional calligraphic feel)
- Body: Noto Sans Arabic (clean, readable)
- Product names: Noto Naskh Arabic, 700 weight — the label on the box

## Interaction Notes

- Product cards: subtle hover lift (translateY -2px), border color shifts to primary
- No emoji icons — replace with SVG (Lucide-style pharmacy icons)
- Add to cart: immediate toast feedback
- Reduced motion: disable shelf animation, static grid only

## Anti-Pattern Check

- No AI purple/pink gradients
- No warm cream (#F4F1EA) background
- No all-caps labels
- No tracked-out letter-spacing
- No single-word accent in headlines
- No numbered markers (01 / 02 / 03) — categories are not a sequence