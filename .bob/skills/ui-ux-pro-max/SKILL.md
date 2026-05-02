---
name: ui-ux-pro-max
description: AI-powered design intelligence with 67 UI styles, 161 color palettes, 57 font pairings, 99 UX guidelines, and 25 chart types. Automatically generates complete design systems for web applications.
---

# UI/UX Pro Max - Design Intelligence Skill

An AI-powered design intelligence toolkit providing searchable databases of UI styles, color palettes, font pairings, chart types, and UX guidelines for building professional web applications.

## When to Use This Skill

Activate this skill when the user requests:

- **New UI/UX work**: "Build a landing page", "Create a dashboard", "Design a form"
- **Style recommendations**: "What style fits a SaaS app?", "Recommend colors for fintech"
- **Component design**: "Create a pricing card", "Add a modal", "Design a navigation"
- **UI review**: "Review this page for UX issues", "Check accessibility"
- **Design system**: "Generate a design system for my app"

## Prerequisites

Python 3.x is required for the search script.

```bash
# Check if Python is installed
python3 --version

# Install if needed (macOS)
brew install python3

# Install if needed (Ubuntu/Debian)
sudo apt update && sudo apt install python3
```

## Core Workflow

### Step 1: Generate Design System (REQUIRED)

**Always start with design system generation** to get comprehensive recommendations:

```bash
python3 .bob/skills/ui-ux-pro-max/scripts/search.py "<product_type> <industry> <keywords>" --design-system [-p "Project Name"]
```

This command:
1. Searches 5 domains in parallel (product, style, color, landing, typography)
2. Applies 161 reasoning rules to select best matches
3. Returns complete design system: pattern, style, colors, typography, effects
4. Includes anti-patterns to avoid

**Example:**
```bash
python3 .bob/skills/ui-ux-pro-max/scripts/search.py "SaaS dashboard analytics" --design-system -p "Aegis Swarm"
```

### Step 2: Persist Design System (Optional)

Save the design system for hierarchical retrieval across sessions:

```bash
python3 .bob/skills/ui-ux-pro-max/scripts/search.py "<query>" --design-system --persist -p "Project Name"
```

This creates:
- `design-system/MASTER.md` — Global Source of Truth
- `design-system/pages/` — Page-specific overrides

### Step 3: Domain-Specific Searches (As Needed)

Get detailed information for specific aspects:

```bash
python3 .bob/skills/ui-ux-pro-max/scripts/search.py "<keyword>" --domain <domain> [-n <max_results>]
```

**Available Domains:**

| Domain | Use For | Example |
|--------|---------|---------|
| `product` | Product type recommendations | `--domain product "SaaS dashboard"` |
| `style` | UI styles with CSS keywords | `--domain style "glassmorphism"` |
| `typography` | Font pairings with Google Fonts | `--domain typography "modern professional"` |
| `color` | Color palettes by product type | `--domain color "fintech"` |
| `landing` | Page structure and CTA strategies | `--domain landing "hero social-proof"` |
| `chart` | Chart types and libraries | `--domain chart "analytics dashboard"` |
| `ux` | Best practices and anti-patterns | `--domain ux "accessibility animation"` |

### Step 4: Stack-Specific Guidelines

Get implementation-specific best practices:

```bash
python3 .bob/skills/ui-ux-pro-max/scripts/search.py "<keyword>" --stack <stack>
```

**Available Stacks:**
- `html-tailwind` (default)
- `react`, `nextjs`, `shadcn`
- `vue`, `nuxtjs`, `nuxt-ui`
- `svelte`, `astro`
- `swiftui`, `react-native`, `flutter`, `jetpack-compose`

## Example Workflow

**User request:** "Build a security audit dashboard for Aegis Swarm"

### Step 1: Generate Design System
```bash
python3 .bob/skills/ui-ux-pro-max/scripts/search.py "security audit dashboard SaaS" --design-system -p "Aegis Swarm"
```

### Step 2: Get Additional Details
```bash
# Get chart recommendations for security metrics
python3 .bob/skills/ui-ux-pro-max/scripts/search.py "security metrics vulnerability" --domain chart

# Get UX best practices for dashboards
python3 .bob/skills/ui-ux-pro-max/scripts/search.py "dashboard data visualization" --domain ux
```

### Step 3: Stack Guidelines
```bash
# Get React best practices
python3 .bob/skills/ui-ux-pro-max/scripts/search.py "performance optimization" --stack react
```

## Output Formats

```bash
# ASCII box (default) - best for terminal
python3 .bob/skills/ui-ux-pro-max/scripts/search.py "fintech" --design-system

# Markdown - best for documentation
python3 .bob/skills/ui-ux-pro-max/scripts/search.py "fintech" --design-system -f markdown
```

## Pre-Delivery Checklist

Before delivering UI code, verify:

### Visual Quality
- [ ] No emojis used as icons (use SVG: Heroicons/Lucide)
- [ ] All interactive elements have `cursor-pointer`
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Consistent spacing using 4/8px rhythm

### Accessibility
- [ ] Text contrast >=4.5:1 for body text
- [ ] Text contrast >=3:1 for large text
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected
- [ ] All images have alt text

### Responsive Design
- [ ] Tested at: 375px, 768px, 1024px, 1440px
- [ ] Mobile-first approach
- [ ] Touch targets >=44x44px on mobile

### Dark Mode (if applicable)
- [ ] Both themes tested independently
- [ ] Sufficient contrast in both modes
- [ ] Semantic color tokens used

## Common Anti-Patterns to Avoid

- ❌ Using emojis as structural icons
- ❌ Hardcoded colors instead of design tokens
- ❌ Missing hover/focus states
- ❌ Poor contrast ratios
- ❌ Inconsistent spacing
- ❌ No loading states
- ❌ Inaccessible forms
- ❌ Layout shifts on interaction

## Tips for Better Results

1. **Use multi-dimensional keywords**: Combine product + industry + tone
   - Good: `"security audit dashboard professional dark"`
   - Avoid: `"dashboard"`

2. **Start with design system**: Always use `--design-system` first

3. **Supplement as needed**: Use domain searches for specific details

4. **Test thoroughly**: Verify on multiple screen sizes and themes

5. **Follow the checklist**: Use the pre-delivery checklist before completion

## Resources

- **67 UI Styles**: Glassmorphism, Minimalism, Brutalism, Dark Mode, AI-Native UI, etc.
- **161 Color Palettes**: Industry-specific palettes
- **57 Font Pairings**: Curated typography with Google Fonts
- **25 Chart Types**: Dashboard and analytics recommendations
- **99 UX Guidelines**: Best practices and anti-patterns
- **161 Reasoning Rules**: Industry-specific design system generation

## Support

For issues or questions about this skill:
- Repository: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
- Website: https://uupm.cc