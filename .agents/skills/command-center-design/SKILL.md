---
name: command-center-design
description: Applies the Aegis Swarm "Command Center" terminal-hacker aesthetic to UI components and pages.
---

# command-center-design

This skill instructs the AI agent on how to apply the "Aegis Swarm Command Center" design language to frontend components. This aesthetic is crucial for maintaining the "adversarial multi-agent security auditing" feel of the application.

## Core Aesthetic

The design theme is a sleek, modern, terminal-inspired "hacker" UI. It relies heavily on absolute dark backgrounds, monospace typography, fine borders, and specific, muted accent colors (primarily golds and ambers) mixed with standard semantic security colors (red, orange, green).

## Usage

Use this skill whenever you are tasked with creating or modifying UI components, pages, or styling in the Aegis Swarm frontend. It ensures all new elements adhere strictly to the established visual identity.

## Design Guidelines

### 1. Color Palette

**Backgrounds:**
- Primary Base: `#000` (Pure Black)
- Card/Section Base: `#070400` (Very Dark Brown/Black)
- Code Block Base: `#030200`
- Meta Data Box: `#040300`

**Borders & Dividers:**
- Primary Border: `#1a1200`
- Subtle Divider: `#0f0c00`

**Typography (Text Colors):**
- Primary/Headers (Gold): `#c9a84c`
- Secondary/Values (Amber): `#d4a843`
- Tertiary/Muted: `#7a6030`
- Labels/Small Text: `#3a2c10`
- Very subtle detail: `#5a4820`

**Semantic Security Colors:**
- **Critical/Danger (Red):**
  - Text: `#e74c3c`
  - Background (Faded): `#2a0505`
  - Border (Subtle): `#5a1010`
- **High/Warning (Orange):**
  - Text: `#e67e22`
  - Background (Faded): `#2a1800`
  - Border (Subtle): `#5a3000`
- **Safe/Success (Green):**
  - Text: `#2ecc71`
  - Background (Faded): `#052a0f`
  - Border (Subtle): `#105a22`

### 2. Typography

- **Font Family:** ALWAYS prioritize monospace fonts `var(--font-mono, monospace)`.
- **Labels:** Use small font sizes (e.g., 8px - 10px), heavy letter-spacing (`1px` to `2px`), and uppercase text (`text-transform: uppercase`).
- **Data Values:** Slightly larger (11px - 15px), colored with primary gold (`#c9a84c` or `#d4a843`).

### 3. Component Patterns

**Containers & Sections:**
- Main containers should have a border (`1px solid #1a1200`), slight border-radius (`8px`), and pure black background.
- Sections within should be separated by subtle dividers (`0.5px solid #0f0c00`).

**Risk Badges:**
- Small, pill-like or slightly rounded rectangles.
- Uppercase text, letter-spacing `2px`.
- Use the semantic color combinations listed above (e.g., Critical badge uses `#e74c3c` text on `#2a0505` background with a `#5a1010` border).

**Vulnerability/Data Cards:**
- Background: `#070400`
- Border: `0.5px solid #1f1600`
- Left Border Accent: `2px solid [SEMANTIC_COLOR]` (e.g., Red for critical, Orange for high, Green for safe).

**Code Blocks:**
- Extremely dark background (`#030200`).
- Subtle border (`0.5px solid #0f0c00`).
- Custom syntax highlighting using theme colors:
  - Keywords: `#c9a84c` (Gold)
  - Strings: `#7a5c20` (Muted Brown)
  - Comments: `#2a2010` (Very Dark Brown)
  - Functions: `#a07830`
  - Numbers: `#d4a843`

**Attack Chains (Step-by-Step UI):**
- Vertical lists representing steps.
- Left column: A circular dot (`16px` diameter) with a semantic color (Red, Amber, Green).
- A thin vertical line (`0.5px solid #1a1200`) connecting the dots.
- Right column: Title and detailed explanation.

**Buttons:**
- "Gold" Button: Background `#c9a84c`, text `#000`, border `#c9a84c`. Hover makes background slightly brighter.
- "Ghost" Button: Transparent background, text `#5a4820`, border `#1a1200`. Hover changes background slightly (`#0a0800`) and brightens text.
- Font styling: Small (9px), uppercase, letter-spacing `1.5px`, monospace.

## Steps for Implementation

1. **Analyze Requirements:** Determine which components are needed (cards, tables, code blocks, badges).
2. **Apply Typography Rules:** Ensure text elements use the correct sizing, uppercase transformations, letter spacing, and monospace font family.
3. **Map Semantic Colors:** Assign the correct semantic color (Critical/High/Safe) to the data being presented. Apply this to borders, badges, and specific text values.
4. **Build Structure:** Use flexbox or CSS grid to align items tightly. Use very thin borders (`0.5px`) to separate data sections.
5. **Implement Custom Syntax:** If code is displayed, wrap it in the defined code block styling and apply custom span classes for syntax highlighting.
6. **Review against Theme:** Check that there are no stark white backgrounds, bright blue links, or non-monospace fonts that break the immersion of the command center.
