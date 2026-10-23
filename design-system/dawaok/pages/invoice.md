# Page Override: invoice.html (Invoice Page)

Overrides: MASTER.md rules for this page only.

## Visual Identity

The invoice is a formal pharmacy receipt — clean, authoritative, print-optimized. It should look like a real pharmacy receipt that a customer can print or save as PDF. The header band uses primary green. The invoice body is white with subtle borders. The progress track shows the order journey.

### Color Adaptations

- Invoice header band: primary `#15803D`
- Invoice body: white, border `#BBF7D0`
- Status chips: pending (amber), confirmed (green), delivered (green), cancelled (red)
- Totals: primary color for grand total
- Print mode: no shadows, no colors except brand green

## Layout Concept

RTL, centered max-width 700px.

```
┌─────────────────────────────┐
│  Topbar: [Logo] [Site] [Print]│
├─────────────────────────────┐
│  Success banner (green tint)│
│  [Icon] "تم استلام طلبك بنجاح"│
├─────────────────────────────┐
│  Prescription image (if Rx) │
├─────────────────────────────┐
│  INVOICE                    │
│  [Header: brand + order ID] │
│  [Meta: customer + details] │
│  [Items table]              │
│  [Totals]                   │
│  [Progress track]           │
│  [Footer: thank you]        │
└─────────────────────────────┘
```

## Typography

- Brand name: Noto Naskh Arabic, 900 weight, large
- Body: Noto Sans Arabic, 400-500 weight
- Money: Noto Sans Arabic, 700-900 weight
- Print: serif-friendly, high contrast

## Print Notes

- `@page { size: A4; margin: 15mm; }`
- Hide topbar, banner, action buttons in print
- Invoice keeps brand colors with `-webkit-print-color-adjust: exact`

## Anti-Pattern Check

- No emoji icons — use SVG
- No gradient text
- No AI cliché invoice designs
- Print-optimized