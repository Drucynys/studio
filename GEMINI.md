# PokeTRKR Development Rules (`GEMINI.md`)

This document outlines the strict coding rules, architectural guidelines, and styling standards for the PokeTRKR codebase. All code edits and new features must comply with these guidelines.

---

## 1. SOLID Principles in React & TypeScript

### Single Responsibility Principle (SRP)
- **Hooks vs. Components:** Components should only handle presentation and layout. Complex business logic, state calculations, or asynchronous operations must be extracted into custom React hooks (e.g., `usePokedexFilter`, `useCardCollection`).
- **Utility Segregation:** Extract pure utility functions (e.g., data formatting, math calculations) into dedicated files in `src/utils/` rather than nesting them in React components.

### Open/Closed Principle (OCP)
- **Component Composition:** Design components to be open for extension but closed for modification. Use composition (`children` prop) or configuration schemas (like render props) rather than adding complex boolean flags to components for new features.
- **Theme & Styles:** Rely on CSS variables and theme configurations rather than writing inline overrides for new design variants.

### Liskov Substitution Principle (LSP)
- **Prop Inheritance:** Custom UI components must behave predictably and accept standard HTML attributes when wrapping native elements. If a component wraps a button, it should extend `React.ButtonHTMLAttributes<HTMLButtonElement>` so it can be swapped with a native button without breaking features.

### Interface Segregation Principle (ISP)
- **Narrow Prop Types:** Components should only request the data they need to render. Do not pass large, complex database models (like a full `User` or `PokemonCard` object) to a component that only displays a name or thumbnail. Define narrow, specific prop interfaces.

### Dependency Inversion Principle (DIP)
- **Service Abstractions:** React components must not directly instantiate or depend on specific database or client operations. Instead, wrap database connections and integrations (e.g., Firebase Auth, Firestore queries) in abstract hooks or context providers so they can be easily mocked during testing or replaced (e.g., swapping Firestore client libraries).

---

## 2. Strict Typing Standards

- **No `any` Types:** The use of `any` is strictly prohibited. If a type is unknown or dynamic, use `unknown`, generics, or define precise unions.
- **Explicit Returns:** Explicitly declare return types for all functions, custom hooks, and React Functional Components:
  ```typescript
  export function CardThumbnail({ card }: CardThumbnailProps): React.JSX.Element { ... }
  ```
- **Next.js Signature Types:** Strictly type Next.js API Routes using `NextRequest` and `NextResponse`:
  ```typescript
  import { NextRequest, NextResponse } from "next/server";
  
  export async function GET(request: NextRequest): Promise<NextResponse> { ... }
  ```
- **State & Props:** Avoid implicit type inferences for state or props. Define structured interfaces at the top of each component file or inside a dedicated `types/` folder.

---

## 3. Zero Placeholder Comments

- **No TODOs / Placeholders:** Do not commit incomplete methods, placeholder comments (e.g., `// TODO: implement later` or `// ...`), or empty function stubs. All written code must be complete, compiled, and functional.
- **Complete Mocking:** If testing requires simulated behavior, build fully functional mock structures with real data returns rather than empty wrappers.

---

## 4. Performance & State Architecture

- **React Re-render Prevention:** 
  - Never instantiate objects, arrays, or Set structures directly inside the component render body if they are passed as props or in dependency arrays.
  - Extract static arrays or configurations into constants outside the component.
  - Use `useMemo` for derived states and `useCallback` for event handlers passed to virtualized or performance-critical children.
- **Virtualization Standards:**
  - For large collections (e.g., the Pokédex grid), use our intersection-observer-based virtualization (`LazySection`) to prevent layout shifts (CLS) and keep DOM size manageable.

---

## 5. UI/UX & Styling Guidelines

- **Next.js `<Image>` Standards:** 
  - Always use the native Next.js `<Image>` component for rendering card art and assets.
  - Provide explicit width/height dimensions or use `fill` with a relative parent container to prevent layout shifts.
  - Implement smooth transition wrappers to prevent flickers when images swap state.
- **iOS Liquid Glass Theme:** 
  - Adhere to the iOS Liquid Glass style system: frosted glass borders (`backdrop-filter: blur()`), HSL-curated color gradients, and micro-animations for hover states.
  - Avoid ad-hoc utility classes. Rely on the design tokens defined in the theme.
  
## 6. Web Navigation & UI Analysis Constraints
- NEVER attempt to use browser automation tools (e.g., Playwright, Puppeteer, Chrome DevTools).
- NEVER read or parse raw HTML DOM structures from live websites.
- For all UI debugging, visual verifications, or layout reviews, PAUSE execution immediately.
- Explicitly ask the user to provide a screenshot of the current interface state instead.
- Analyze the user-provided image using vision tokens only, focusing strictly on the visual layout.
