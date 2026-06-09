---
name: GHC Operations Manual Design System
description: An Apple-inspired, content-first design system for the GHC Operations Manual.
colors:
  primary: "#f59e0b"
  neutral-bg: "#ffffff"
  neutral-bg-dark: "#09090b"
  neutral-text: "#09090b"
  neutral-text-dark: "#f4f4f5"
  border: "#e4e4e7"
  border-dark: "#27272a"
typography:
  display:
    fontFamily: "var(--font-geist-sans), sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: "var(--font-geist-sans), sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  sidebar-item-active:
    backgroundColor: "rgba(245, 158, 11, 0.1)"
    textColor: "#b45309"
    rounded: "{rounded.md}"
---

# Design System: GHC Operations Manual Editor

## 1. Overview

**Creative North Star: "The Apple Stationery"**

The Garrison Honors Center visual system is designed to mimic a clean physical notepad—combining borderless writing surfaces, subtle hairline borders, and warm amber accents. This system prioritizes speed, high-density reading, and content clarity, ensuring that staff can navigate and update Standard Operating Procedures (SOPs) without layout distractions.

### Key Characteristics:
- **Borderless Sheets:** Document editors stretch to fill the screen viewport natively, eliminating artificial paper shadows.
- **Warm Amber Accent:** Warm gold-amber selections are reserved strictly for active elements and folder states.
- **Hairline Dividers:** Spacing and containment are defined by 1px dividers rather than filled background blocks.

## 2. Colors

The color palette is split between strict grayscale neutrals and a single warm accent.

### Primary
- **Warm Amber** (#f59e0b / oklch(76.7% 0.197 78.4)): Used exclusively for active navigation states, selected folders, and the primary formatting marker.

### Neutral
- **True Paper White** (#ffffff): Main editor canvas sheet background in light mode.
- **Midnight Black** (#09090b): Main editor background in dark mode and primary text.
- **Warm Gray** (#f4f4f5): Sidebar background in light mode.
- **Hairline Gray** (#e4e4e7 / #27272a): Used for thin 1px border lines and grid alignments.

### Named Rules
**The Single Accent Rule.** Amber highlights must occupy less than 5% of any screen. If the accent is rare, it stays meaningful.

## 3. Typography

**Display Font:** Geist Sans (var(--font-geist-sans)) falling back to sans-serif.
**Body Font:** Geist Sans falling back to sans-serif.

### Hierarchy
- **Display (H1)** (Bold (700), 1.75rem (28px), 1.2): Title headers of documents and SOP sections.
- **Headline (H2)** (Semibold (600), 1.35rem (21.6px), 1.25): Major section dividers.
- **Title (H3)** (Semibold (600), 1.15rem (18.4px), 1.3): Subsections.
- **Body** (Regular (400), 0.875rem (14px), 1.6): Main paragraphs and SOP guidelines. Cap lines at 75ch.
- **Label** (Medium (500), 0.75rem (12px), normal): Sidebar file directories and action names.

## 4. Elevation

Depth in the GHC Manual is entirely flat, relying on tonal layering rather than drop shadows.

### Named Rules
**The Zero Shadow Rule.** Floating shadow blurs are prohibited. Depth is conveyed strictly through borders (1px) and dark/light mode background tints.

## 5. Components

Components are flat, clean, and restrained.

### Sidebar Item
- **Shape:** Rounded corners (8px)
- **Active State:** Tinted amber background (rgba(245, 158, 11, 0.1)) with amber text.
- **Hover State:** Warm gray highlight with no border.

### Editor Page
- **Background:** Crisp White (#ffffff) in light mode; Deep Black (#09090b) in dark mode.
- **Margin:** 0px borderless padding container.

### Buttons & Headers
- **Toolbar Buttons:** Restrained ghost buttons that toggle colors on active state. No physical fill.

## 6. Do's and Don'ts

### Do:
- **Do** wrap long prose in `text-wrap: pretty` to prevent typographic orphans.
- **Do** check contrast ratios for gray labels to ensure they meet the 4.5:1 readability standard.
- **Do** keep headings aligned to the start of the borderless page.

### Don't:
- **Don't** use side-stripe colored borders on alert cards or callout items.
- **Don't** use gradient text or colored card background containers.
- **Don't** exceed a border-radius of 10px on buttons, inputs, or sidebar panels.
