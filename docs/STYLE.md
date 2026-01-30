# SGE Design System

This document defines the visual language and design standards for the SGE Energy documentation site and repository.

## Brand Colors

### Primary Palette
- **SGE Green** (Primary): `#22c55e` / `rgb(34, 197, 94)`
- **Deep Green** (Accent): `#16a34a` / `rgb(22, 163, 74)`
- **Dark Green** (Hover): `#15803d` / `rgb(21, 128, 61)`

### Neutral Palette
- **Background Dark**: `#0a0a0a` / `rgb(10, 10, 10)`
- **Surface Dark**: `#1a1a1a` / `rgb(26, 26, 26)`
- **Border**: `#2a2a2a` / `rgb(42, 42, 42)`
- **Text Primary**: `#f5f5f5` / `rgb(245, 245, 245)`
- **Text Secondary**: `#a3a3a3` / `rgb(163, 163, 163)`

### Semantic Colors
- **Success**: `#22c55e` (matches primary)
- **Warning**: `#f59e0b` / `rgb(245, 158, 11)`
- **Error**: `#ef4444` / `rgb(239, 68, 68)`
- **Info**: `#3b82f6` / `rgb(59, 130, 246)`

## Typography

### Font Stack
```css
--font-family-base: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
--font-family-mono: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", monospace;
```

### Type Scale
- **H1**: 2.5rem / 40px (bold)
- **H2**: 2rem / 32px (semibold)
- **H3**: 1.5rem / 24px (semibold)
- **H4**: 1.25rem / 20px (medium)
- **Body**: 1rem / 16px (regular)
- **Small**: 0.875rem / 14px (regular)

## Callout Styles

### Info
```css
background: rgba(59, 130, 246, 0.1);
border-left: 4px solid #3b82f6;
```

### Warning
```css
background: rgba(245, 158, 11, 0.1);
border-left: 4px solid #f59e0b;
```

### Risk
```css
background: rgba(239, 68, 68, 0.1);
border-left: 4px solid #ef4444;
```

### Success
```css
background: rgba(34, 197, 94, 0.1);
border-left: 4px solid #22c55e;
```

## Diagram Colors (Mermaid)

```css
--mermaid-primary: #22c55e;
--mermaid-secondary: #3b82f6;
--mermaid-accent: #f59e0b;
--mermaid-background: #1a1a1a;
--mermaid-text: #f5f5f5;
--mermaid-border: #2a2a2a;
```

### Node Colors
- **User/Client**: `#3b82f6` (blue)
- **API/Backend**: `#22c55e` (green)
- **Smart Contract**: `#f59e0b` (orange)
- **External Service**: `#8b5cf6` (purple)

## Icons

Icons should be simple, monochrome SVGs placed in `docs/public/icons/`:
- Use 24x24 or 32x32 viewBox
- Stroke width: 2px
- Color: currentColor (inherits from parent)

## Layout

### Spacing Scale
- **xs**: 0.25rem / 4px
- **sm**: 0.5rem / 8px
- **md**: 1rem / 16px
- **lg**: 1.5rem / 24px
- **xl**: 2rem / 32px
- **2xl**: 3rem / 48px

### Border Radius
- **sm**: 0.25rem / 4px
- **md**: 0.5rem / 8px
- **lg**: 0.75rem / 12px

## Component Styles

### Badges
```css
padding: 0.25rem 0.75rem;
border-radius: 0.25rem;
font-size: 0.875rem;
font-weight: 600;
```

### Cards
```css
background: #1a1a1a;
border: 1px solid #2a2a2a;
border-radius: 0.75rem;
padding: 1.5rem;
```

### Code Blocks
```css
background: #0a0a0a;
border: 1px solid #2a2a2a;
border-radius: 0.5rem;
```

## Usage Guidelines

1. **Consistency**: Use colors from the defined palette only
2. **Contrast**: Ensure minimum 4.5:1 contrast ratio for text
3. **Hierarchy**: Use size and weight to establish visual hierarchy
4. **Spacing**: Follow the spacing scale for consistent rhythm
5. **Accessibility**: All interactive elements must be keyboard accessible
