# Page Override: delivery.html (Courier Portal)

Overrides: MASTER.md rules for this page only.

## Visual Identity

The courier portal is a mobile-first dispatch screen. Couriers use it on phones while moving. It must be high-contrast, large-touch-target, and glanceable. The primary color is used as a header band and action button background. Order cards look like delivery manifests.

### Color Adaptations

- Header band: primary `#15803D` background, white text
- Order cards: white, border `#BBF7D0`, shadow `--shadow-md`
- Status pill: primary tint background `#E8F0F1`, primary text
- Map link: accent `#0369A1`, underlined on hover

## Layout Concept

RTL, single column, mobile-first. Stacked sections.

```
┌─────────────────────────────┐
│  Header (green band)        │
│  [Back]   Dawaok   [Site]   │
├─────────────────────────────┐
│  Hero: "بوابة التوصيل"       │
│  Sub: "اعرض الطلبات..."      │
├─────────────────────────────┐
│  Login card (centered)      │
│  [Email] [Password] [Login] │
├─────────────────────────────┐
│  (After login)              │
│  Toolbar: [Name] [Count] [Logout]│
│  Order cards (stacked)      │
│  [Customer] [Items] [Total] │
│  [Map] [Accept / Next Step] │
└─────────────────────────────┘
```

## Typography

- Headings: Noto Naskh Arabic, 800 weight
- Body: Noto Sans Arabic, 500 weight for readability on small screens
- Money values: Noto Sans Arabic, 900 weight

## Interaction Notes

- Touch targets minimum 44×44px
- Large buttons for accept / next step actions
- Immediate toast feedback on status change
- Map opens in external Google Maps

## Anti-Pattern Check

- No small touch targets (< 44px)
- No hover-only interactions (mobile-first)
- No emoji icons — use SVG
- No low-contrast text on green band