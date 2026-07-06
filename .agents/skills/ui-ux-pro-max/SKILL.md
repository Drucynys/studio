---
name: ui-ux-pro-max
description: "UI/UX design intelligence for web and mobile. Includes essential guidelines for accessibility, interaction, performance, style, layout, typography, animation, forms, navigation, and charts."
---

# UI/UX Pro Max - Essential Guidelines

## When to Use
Apply this guide when designing/building interfaces, making visual decisions, or reviewing UX quality.

## Core Principles (Priority Order)

### 1. Accessibility (CRITICAL)
- **Contrast**: Text ≥4.5:1 against background (3:1 for large text)
- **Focus**: Visible focus indicators (2-4px) on all interactive elements
- **Touch Targets**: Minimum 44×44pt (iOS) / 48×48dp (Android) with 8px+ spacing
- **Labels**: Visible labels for all form fields (not placeholder-only)
- **Screen Readers**: Descriptive alt text, aria-labels, logical tab order
- **Color**: Never convey information by color alone
- **Motion**: Respect prefers-reduced-motion; avoid triggering animations

### 2. Interaction & Feedback
- **Feedback**: Visual response within 80-150ms on tap/press
- **Loading**: Show skeleton/spinner for operations >300ms
- **Disabled States**: Visibly distinct (opacity 30-50%) + non-interactive
- **Gestures**: One primary gesture per region; avoid conflicts
- **Navigation**: Predictable back behavior; visible indicator for current location
- **Forms**: Inline validation on error; helpful messages near fields

### 3. Performance
- **Images**: WebP/AVIF with lazy loading; declare dimensions
- **Fonts**: font-display: swap; limit web font variations
- **Layout**: Avoid layout shifts; reserve space for async content
- **JS**: Code splitting; debounce/throttle frequent events
- **Lists**: Virtualize for >50 items
- **Main Thread**: Keep work <16ms/frame for 60fps

### 4. Style & Consistency
- **Platform**: Follow platform conventions (iOS HIG, Material Design)
- **Icons**: SVG icons (no emojis); consistent style/stroke weight
- **Colors**: Semantic tokens (primary, secondary, error, etc.); test light/dark
- **Typography**: Base 16px; line-height 1.5; clear hierarchy (weight/size)
- **Spacing**: 4/8dp grid; consistent padding/margins
- **Elevation**: Consistent shadow/z-index hierarchy for depth

### 5. Layout & Responsive
- **Viewport**: width=device-width, initial-scale=1 (user-scalable)
- **Breakpoints**: Mobile-first approach (320px, 768px, 1024px, 1440px)
- **Measure**: 35-60 chars/line (mobile), 60-75 chars (desktop)
- **Hierarchy**: Visual priority through size, spacing, contrast (not just color)
- **Safe Areas**: Respect device notches, home indicators, gesture areas
- **Fixed Elements**: Account for keyboard/bars; don't obscure content

### 6. Forms & Data Input
- **Labels**: Always visible; use `<label>` or equivalent
- **Validation**: Show errors near field; suggest fixes
- **Inputs**: Semantic types (email, tel, number) for proper keyboards
- **Buttons**: Clear primary/secondary distinction; loading states
- **Accessibility**: Error messages announced to screen readers
- **Touch**: Input height ≥44px; adequate spacing between fields

### 7. Navigation Patterns
- **Priority**: Primary actions prominent; secondary visually subdued
- **Consistency**: Same navigation placement/pattern across screens
- **Accessibility**: Labeled icons; predictable behavior
- **Gesture**: Support platform navigation gestures (swipe-back, etc.)
- **Structure**: Clear hierarchy; avoid overwhelming options
- **Feedback**: Indicate loading/state changes during navigation

### 8. Charts & Data Visualization
- **Clarity**: Choose chart type matching data relationship
- **Accessibility**: Provide data table alternative; avoid color-only meaning
- **Labels**: Clearly labeled axes with units; readable tick marks
- **Interactivity**: Tooltips on hover/tap; legends when needed
- **Performance**: Aggregate/sample large datasets (>1000 points)
- **States**: Loading skeletons; meaningful empty states

## Quick Reference: Critical Avoidances
- ❌ Removing focus outlines
- ❌ Touch targets <44pt without expanded hit area
- ❌ Relying solely on hover for interactions
- ❌ Layout-shifting animations (width/height changes)
- ❌ Low-contrast text (<4.5:1 body text)
- ❌ Placeholder-only form labels
- ❌ Disabled controls that look interactive
- ❌ Animations that ignore prefers-reduced-motion
- ❌ Horizontal scroll on mobile (unless intentional carousel)
- ❌ Inconsistent spacing/icon styles
- ❌ Vague or missing error messages
- ❌ Icons without accessible only without text labels for primary navigation

## Implementation Checks
Before considering work complete, verify:
- [ ] All text meets contrast minimums
- [ ] Interactive elements have visible focus states
- [ ] Touch targets meet minimum size requirements
- [ ] No layout shifts on initial load
- [ ] Form fields have visible labels
- [ ] Error messages are clear and actionable
- [ ] Primary actions are visually distinct
- [ ] Navigation is predictable and accessible
- [ ] Animations are purposeful and performant
- [ ] Content is readable without horizontal scrolling