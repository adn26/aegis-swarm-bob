# Design System Usage Guide

## 📋 Overview

The Aegis Swarm design system has been generated and persisted to `design-system/aegis-swarm/MASTER.md`. This guide shows you how to use it with Bob to build consistent, professional UI.

## 🎨 Design System Summary

**Style:** Cyberpunk UI (Dark mode only)  
**Colors:** Matrix green (#00FF41) + Alert red (#FF3333) on black background  
**Typography:** Fira Code (headings) + Fira Sans (body)  
**Pattern:** Real-Time / Operations Landing  

## 🚀 How to Use with Bob

### Method 1: Simple Prompt (Bob Auto-Reads)

When you're in **Advanced mode**, Bob can automatically read the design system file. Just reference it in your prompt:

```
Build the main dashboard page for Aegis Swarm. 
Follow the design system in design-system/aegis-swarm/MASTER.md.
Include:
- Live vulnerability metrics
- Recent scan results table
- Security score gauge
- Quick action buttons
```

Bob will:
1. Read `design-system/aegis-swarm/MASTER.md`
2. Apply the Cyberpunk UI style
3. Use the correct colors (#00FF41, #FF3333, #000000)
4. Use Fira Code/Fira Sans fonts
5. Follow the component specs (buttons, cards, inputs)
6. Avoid anti-patterns (no light mode, no emojis as icons)

### Method 2: Explicit Context Prompt

For more control, explicitly tell Bob what to read:

```
I'm building the vulnerability details page for Aegis Swarm.

Please read design-system/aegis-swarm/MASTER.md for the global design rules.

Then create a page that shows:
- Vulnerability title and severity badge
- Code snippet with line numbers
- Exploit code example
- Recommended patch
- Related vulnerabilities

Use the Cyberpunk UI style with neon green accents and dark background.
```

### Method 3: Page-Specific Overrides

For pages that need different styling, create a page-specific override:

```bash
# Generate page-specific design system
python3 .bob/skills/ui-ux-pro-max/scripts/search.py "vulnerability report detailed" --design-system --persist -p "Aegis Swarm" --page "vulnerability-details"
```

Then prompt Bob:

```
Build the vulnerability details page.

First check if design-system/aegis-swarm/pages/vulnerability-details.md exists.
If it exists, use its rules (they override MASTER.md).
If not, use design-system/aegis-swarm/MASTER.md.

Include:
- Vulnerability header with severity
- Code diff view
- Patch recommendations
- Security impact analysis
```

## 📝 Example Prompts

### Dashboard Page

```
Build the main security dashboard for Aegis Swarm following design-system/aegis-swarm/MASTER.md.

Include:
1. Hero section with live scan status
2. Key metrics cards (Critical: 12, High: 45, Medium: 89, Low: 156)
3. Recent vulnerabilities table
4. Security score gauge (0-100)
5. Quick actions: "New Scan", "View Reports", "Settings"

Use the Cyberpunk UI style with:
- Matrix green (#00FF41) for positive indicators
- Alert red (#FF3333) for critical items
- Neon glow effects on interactive elements
- Fira Code for metrics, Fira Sans for descriptions
```

### Vulnerability List Page

```
Create a vulnerability list page for Aegis Swarm using design-system/aegis-swarm/MASTER.md.

Features:
- Filterable table (severity, type, status)
- Severity badges with color coding
- File path and line number
- Quick actions: View, Patch, Dismiss
- Pagination

Style requirements:
- Dark background (#000000)
- Green text for file paths
- Red badges for critical vulnerabilities
- Hover effects with neon glow
- Smooth transitions (200ms)
```

### Settings Page

```
Build a settings page for Aegis Swarm following the design system.

Read design-system/aegis-swarm/MASTER.md for styling.

Sections:
1. Scan Configuration
   - File extensions to scan
   - Ignored directories
   - Max file size
2. AI Provider Settings
   - Model selection
   - Temperature
   - Max tokens
3. GitHub Integration
   - Token management
   - Auto-PR settings

Use cards with the Cyberpunk UI style, form inputs with green focus states.
```

### Component Creation

```
Create a reusable VulnerabilityCard component for Aegis Swarm.

Follow design-system/aegis-swarm/MASTER.md for styling.

Props:
- severity: "Critical" | "High" | "Medium" | "Low"
- type: string (e.g., "SQL Injection")
- filePath: string
- lineNumber: number
- description: string
- onView: () => void
- onPatch: () => void

Style:
- Card background: #000000
- Border: #1F1F1F
- Severity badge colors: Critical=#FF3333, High=#FF6B6B, Medium=#FFA500, Low=#00FF41
- Hover: neon glow effect
- Buttons: Follow .btn-primary and .btn-secondary from MASTER.md
```

## 🎯 Best Practices

### 1. Always Reference the Design System

✅ **Good:**
```
Build the dashboard following design-system/aegis-swarm/MASTER.md
```

❌ **Bad:**
```
Build a dashboard with dark theme
```

### 2. Be Specific About Components

✅ **Good:**
```
Use the .btn-primary style from MASTER.md for the "Start Scan" button
```

❌ **Bad:**
```
Add a red button
```

### 3. Mention Key Design Elements

✅ **Good:**
```
Use Fira Code for code snippets and metrics, Fira Sans for descriptions.
Apply neon glow effect (#00FF41) on hover states.
```

❌ **Bad:**
```
Make it look cyberpunk
```

### 4. Reference Anti-Patterns

✅ **Good:**
```
Follow MASTER.md. Remember: no emojis as icons, no light mode, use SVG icons only.
```

❌ **Bad:**
```
Add some cool icons
```

## 🔄 Updating the Design System

If you need to adjust the design system:

```bash
# Regenerate with different keywords
python3 .bob/skills/ui-ux-pro-max/scripts/search.py "security dashboard professional minimal" --design-system --persist -p "Aegis Swarm"

# This will overwrite design-system/aegis-swarm/MASTER.md
```

Then tell Bob:
```
The design system has been updated. Please re-read design-system/aegis-swarm/MASTER.md and rebuild the dashboard with the new styles.
```

## 📊 Design System Hierarchy

```
design-system/aegis-swarm/
├── MASTER.md                    # Global Source of Truth
└── pages/                       # Page-specific overrides
    ├── dashboard.md             # Dashboard-specific rules
    ├── vulnerability-details.md # Details page rules
    └── settings.md              # Settings page rules
```

**Hierarchy Logic:**
1. Check if `pages/[page-name].md` exists
2. If yes, use page rules (override MASTER)
3. If no, use MASTER.md exclusively

## 🎨 Quick Reference

### Colors
- Primary (Green): `#00FF41`
- Accent (Red): `#FF3333`
- Background: `#000000`
- Text: `#E0E0E0`

### Typography
- Headings: Fira Code (400, 500, 600, 700)
- Body: Fira Sans (300, 400, 500, 600, 700)

### Spacing
- xs: 4px, sm: 8px, md: 16px, lg: 24px, xl: 32px

### Effects
- Neon glow: `text-shadow: 0 0 10px #00FF41`
- Transitions: 150-300ms
- Hover: `transform: translateY(-2px)`

## 🚨 Common Mistakes to Avoid

1. ❌ Not referencing the design system file
2. ❌ Using light mode (Cyberpunk UI is dark-only)
3. ❌ Using emojis as icons
4. ❌ Forgetting hover states
5. ❌ Hardcoding colors instead of using CSS variables
6. ❌ Missing responsive breakpoints
7. ❌ Poor contrast ratios

## ✅ Pre-Delivery Checklist

Before asking Bob to finalize any UI:

```
Before finalizing, verify against design-system/aegis-swarm/MASTER.md:
- [ ] All colors match the palette
- [ ] Fira Code/Fira Sans fonts used
- [ ] No emojis as icons (SVG only)
- [ ] cursor-pointer on clickable elements
- [ ] Hover states with 200ms transitions
- [ ] Neon glow effects on interactive elements
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] Dark mode only (no light mode)
- [ ] Text contrast ≥4.5:1
```

---

**Pro Tip:** Keep this guide open when working with Bob. Copy-paste the example prompts and modify them for your specific needs!