# SGE Visual Brand & Documentation Theme

## Color System

### Primary Colors

**SGE Green** - Primary brand color
- Main: `#10B981` (Emerald-500)
- Light: `#34D399` (Emerald-400)
- Dark: `#059669` (Emerald-600)
- Usage: Primary buttons, links, success states, brand elements

**Slate** - Secondary neutral
- Main: `#64748B` (Slate-500)
- Light: `#94A3B8` (Slate-400)
- Dark: `#475569` (Slate-600)
- Usage: Body text, secondary elements, borders

### Accent Colors

**Amber** - Warning & alerts
- Main: `#F59E0B` (Amber-500)
- Light: `#FCD34D` (Amber-300)
- Dark: `#D97706` (Amber-600)
- Usage: Warnings, pending states, cautionary information

**Red** - Danger & errors
- Main: `#EF4444` (Red-500)
- Light: `#F87171` (Red-400)
- Dark: `#DC2626` (Red-600)
- Usage: Errors, critical alerts, destructive actions

**Blue** - Information
- Main: `#3B82F6` (Blue-500)
- Light: `#60A5FA` (Blue-400)
- Dark: `#2563EB` (Blue-600)
- Usage: Information callouts, hyperlinks, neutral status

### Background & Surface Colors

**White** - `#FFFFFF`
- Primary background, cards, modals

**Gray-50** - `#F9FAFB`
- Secondary backgrounds, subtle surfaces

**Gray-100** - `#F3F4F6`
- Hover states, disabled states

**Gray-900** - `#111827`
- Primary text, headings

## Typography

### Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
  'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
```

### Font Scale
- **3XL**: 48px - Page headers
- **2XL**: 36px - Section headers
- **XL**: 24px - Component headers
- **LG**: 18px - Subheadings
- **Base**: 16px - Body text
- **SM**: 14px - Secondary text
- **XS**: 12px - Labels, captions

### Monospace (Code/Addresses)
```css
font-family: 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace;
```

## Callout Blocks

### NOTE - Informational
```markdown
::: info NOTE
Standard information that helps understanding.
:::
```
- Background: Blue-50 (`#EFF6FF`)
- Border: Blue-200 (`#BFDBFE`)
- Icon: ℹ️ (Blue-600)

### WARN - Caution Required
```markdown
::: warning WARN
Something that could cause issues if ignored.
:::
```
- Background: Amber-50 (`#FFFBEB`)
- Border: Amber-200 (`#FDE68A`)
- Icon: ⚠️ (Amber-600)

### SECURITY - Security Considerations
```markdown
::: danger SECURITY
Critical security information requiring immediate attention.
:::
```
- Background: Red-50 (`#FEF2F2`)
- Border: Red-200 (`#FECACA`)
- Icon: 🔒 (Red-600)

### OPS - Operational Best Practice
```markdown
::: tip OPS
Operational guidance for production deployments.
:::
```
- Background: Emerald-50 (`#ECFDF5`)
- Border: Emerald-200 (`#A7F3D0`)
- Icon: ⚙️ (Emerald-600)

## Component Patterns

### Status Badges

**Completed / Healthy**
- Background: Green-100
- Text: Green-800
- Border: Green-200

**Pending / In Progress**
- Background: Yellow-100
- Text: Yellow-800
- Border: Yellow-200

**Failed / Error**
- Background: Red-100
- Text: Red-800
- Border: Red-200

**Cancelled / Disabled**
- Background: Gray-100
- Text: Gray-600
- Border: Gray-200

### Cards & Panels

**Elevation 1** (Default cards)
```css
box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
border-radius: 8px;
border: 1px solid #E5E7EB;
```

**Elevation 2** (Modal dialogs)
```css
box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
border-radius: 12px;
```

**Elevation 3** (Dropdown menus)
```css
box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
border-radius: 8px;
```

### Buttons

**Primary (SGE Green)**
```css
background: #10B981;
color: white;
hover: #059669;
active: #047857;
```

**Secondary (Slate outline)**
```css
background: transparent;
border: 1px solid #CBD5E1;
color: #475569;
hover: background #F1F5F9;
```

**Danger (Red)**
```css
background: #EF4444;
color: white;
hover: #DC2626;
active: #B91C1C;
```

## Diagram Style

### Mermaid Configuration
```javascript
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#10B981',
    'primaryTextColor': '#fff',
    'primaryBorderColor': '#059669',
    'lineColor': '#64748B',
    'secondaryColor': '#3B82F6',
    'tertiaryColor': '#F59E0B'
  }
}}%%
```

### Flow Diagram Colors
- **User Actions**: Blue (#3B82F6)
- **System Processes**: Emerald (#10B981)
- **Data Storage**: Slate (#64748B)
- **External Services**: Amber (#F59E0B)
- **Decision Points**: Purple (#8B5CF6)
- **Error Handling**: Red (#EF4444)

## Icon Usage

### System Icons
- ✅ Success, Completed, Approved
- ⚠️ Warning, Pending, Attention Required
- ❌ Error, Failed, Rejected
- 🔒 Security, Authentication, Permissions
- 💰 Financial, Payments, Settlements
- 👤 User, Profile, Account
- 📊 Analytics, Reports, Charts
- ⚙️ Settings, Configuration, Operations
- 🚀 Launch, Deploy, Start
- 🔄 Refresh, Sync, Retry

### Brand Icons
- 🌱 Growth, Sustainability (primary brand icon)
- ⚡ Energy, Power, Speed
- 🌍 Global, Network, Ecosystem

## Layout Grid

### Breakpoints
- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: 1024px - 1536px
- **Wide**: > 1536px

### Max Widths
- **Prose**: 65ch (optimal reading width)
- **Content**: 1280px (main content)
- **Full**: 100% (tables, dashboards)

### Spacing Scale (Tailwind)
- **xs**: 4px (0.25rem)
- **sm**: 8px (0.5rem)
- **md**: 16px (1rem)
- **lg**: 24px (1.5rem)
- **xl**: 32px (2rem)
- **2xl**: 48px (3rem)

## Documentation Structure

### Page Template
```markdown
# Page Title

> Brief description of what this page covers (1-2 sentences)

## Overview

High-level introduction with context.

## [Section with Callout]

::: info NOTE
Relevant information for this section.
:::

## Code Examples

\`\`\`typescript
// Well-commented code with inline explanations
\`\`\`

## Visual Diagrams

\`\`\`mermaid
graph LR
  A[Start] --> B[Process]
\`\`\`

## Related Pages
- [Link to related documentation]
```

## Chart & Visualization Style

### Bar Charts
- Primary bars: SGE Green (#10B981)
- Comparison bars: Blue (#3B82F6)
- Negative values: Red (#EF4444)

### Line Charts
- Primary line: SGE Green (#10B981)
- Secondary line: Blue (#3B82F6)
- Tertiary line: Amber (#F59E0B)
- Grid lines: Gray-200 (#E5E7EB)

### Pie/Donut Charts
- Segment 1: Green (#10B981)
- Segment 2: Blue (#3B82F6)
- Segment 3: Amber (#F59E0B)
- Segment 4: Purple (#8B5CF6)
- Segment 5: Pink (#EC4899)

## Animation & Motion

### Durations
- **Instant**: 100ms - Tooltips, highlights
- **Fast**: 200ms - Dropdowns, modals
- **Normal**: 300ms - Page transitions
- **Slow**: 500ms - Loading states

### Easing
- **Default**: cubic-bezier(0.4, 0, 0.2, 1)
- **In**: cubic-bezier(0.4, 0, 1, 1)
- **Out**: cubic-bezier(0, 0, 0.2, 1)
- **Bounce**: cubic-bezier(0.68, -0.55, 0.265, 1.55)

---

## Implementation

### Tailwind Config
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        'sge': {
          green: '#10B981',
          'green-light': '#34D399',
          'green-dark': '#059669',
        },
      },
    },
  },
};
```

### CSS Variables
```css
:root {
  --sge-green: #10B981;
  --sge-green-light: #34D399;
  --sge-green-dark: #059669;
  --slate: #64748B;
  --amber: #F59E0B;
  --red: #EF4444;
  --blue: #3B82F6;
}
```
