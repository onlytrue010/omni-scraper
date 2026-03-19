# Design System: Frost & Precision

## 1. Overview & Creative North Star: "The Technical Alpinist"
The Creative North Star for this design system is **The Technical Alpinist**. We are moving away from the aggressive, high-energy aesthetics of traditional sports apps toward a quiet, authoritative precision. This system is inspired by high-end laboratory instruments and elite alpine equipment—where every gram matters and clarity is a performance requirement.

To break the "standard template" look, we utilize **intentional asymmetry**. Hero sections should feature shifted content blocks that overlap across surface boundaries, suggesting movement and depth. We replace rigid grids with "data-dense zones" balanced by expansive negative space, ensuring the UI feels like a high-performance cockpit rather than a generic dashboard.

---

## 2. Colors: Tonal Depth & The Frost Palette
The color logic centers on a "Deep Sea to Glacial Ice" spectrum. We use deep navies to anchor the experience and sharp, cool cyans to draw the eye to critical performance data.

### Core Palette
*   **Background (`#0c1324`):** The foundation. A deep, infinite navy that provides a high-contrast stage for "Frost" elements.
*   **Primary (`#85d3dc`):** The "Ice-Blue" accent. Use this sparingly for primary actions and critical data points.
*   **Tertiary (`#7bd0ff`):** A secondary "Chilled Blue" for supporting interactive elements and data visualization.
*   **Surface Tiers:** Use `surface_container_lowest` (`#070d1f`) to `surface_container_highest` (`#2e3447`) to build structural hierarchy.

### The "No-Line" Rule
**Explicit Instruction:** Do not use 1px solid borders to section off major layout areas. Boundaries must be defined through background shifts. For example, a "Live Stats" feed should use `surface_container_low` against a `background` page, creating a clean, architectural edge without the visual noise of a stroke.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers.
1.  **Level 0 (Base):** `surface` (`#0c1324`)
2.  **Level 1 (Sectioning):** `surface_container_low` (`#151b2d`)
3.  **Level 2 (Cards/Modules):** `surface_container` (`#191f31`)
4.  **Level 3 (Pop-overs/Modals):** `surface_container_highest` (`#2e3447`)

### Signature Textures
Apply a subtle linear gradient to main CTAs using `primary` to `primary_container`. This provides a metallic, "anodized" finish that feels premium and tactile.

---

## 3. Typography: The Precision Grid
We utilize a dual-font approach to balance technical density with editorial elegance.

*   **Headlines & Display (Inter):** High-legibility, neutral, and authoritative. Use `display-lg` (3.5rem) with tighter letter-spacing (-0.02em) for hero performance metrics to evoke a sense of "Engineered Power."
*   **Labels & Metadata (Space Grotesk):** We use `label-md` and `label-sm` in Space Grotesk for technical data points (e.g., heart rate, velocity, timestamps). Its geometric quirks provide the "cockpit" feel requested.
*   **Body (Inter):** `body-md` (0.875rem) in `on_surface_variant` (`#c5c6cd`) ensures long-form recovery plans or analysis reports remain legible without being visually heavy.

---

## 4. Elevation & Depth: Tonal Layering
In this system, depth is a function of light and translucency, not heavy shadows.

*   **The Layering Principle:** Instead of shadows, use "Tonal Lift." A card on the dashboard should be one step higher in the `surface_container` scale than its parent container.
*   **Glassmorphism:** For floating navigational elements or top-level overlays, use a semi-transparent `surface_container_high` (opacity 60%) with a `backdrop-blur` of 20px. This allows the navy background to bleed through, creating the "Frost" effect.
*   **The "Ghost Border" Fallback:** If a border is required for accessibility, use the `outline_variant` (`#44474d`) at 20% opacity. This creates a hair-line definition that mimics precision-cut glass.
*   **Ambient Shadows:** For high-priority floating modals, use a large 40px blur shadow using a 4% opacity of `primary` (`#85d3dc`) to create a cool, ambient glow rather than a dark void.

---

## 5. Components: Engineered Primitives

### Buttons
*   **Primary:** `primary` background with `on_primary` text. Use `roundedness-sm` (0.125rem) for a sharp, technical look.
*   **Ghost:** `outline` border at 20% opacity with `primary` text. On hover, transition to a subtle `surface_bright` background.

### Input Fields
*   **State:** Default fields use `surface_container_highest` backgrounds with no border.
*   **Focus:** Animate a 1px `primary` line at the bottom only, mimicking a digital scale or gauge.

### Cards & Lists
*   **The Divider Ban:** Strictly forbid the use of horizontal divider lines in lists. Use `0.9rem` (spacing-4) of vertical whitespace or alternating `surface_container_low` and `surface_container_lowest` backgrounds for row separation.

### Performance Chips
*   **Visuals:** Use `tertiary_container` with `on_tertiary_fixed` text. These should be `roundedness-full` to contrast against the sharp-edged modules, indicating they are interactive filters.

### Contextual Components: "The Performance Gauge"
Introduce a custom "Grit-Chart" component: a thin-line sparkline using `primary` with a `primary_container` glow effect underneath, strictly adhering to the 0.1rem spacing scale for data points.

---

## 6. Do's and Don'ts

### Do:
*   **Do** use asymmetrical margins (e.g., Spacing-10 on the left, Spacing-16 on the right) for editorial layouts.
*   **Do** use `spaceGrotesk` specifically for numerical data to lean into the technical aesthetic.
*   **Do** allow background images of athletes to be treated with a navy duotone filter to maintain the color system's integrity.

### Don't:
*   **Don't** use "pure" black (#000000); it breaks the sophisticated navy depth of the `background` token.
*   **Don't** use `roundedness-xl` on primary containers; it feels too "consumer" and soft. Stick to `sm` or `none` for a professional, technical edge.
*   **Don't** use drop shadows on text. If text is unreadable on an image, use a `surface_dim` gradient overlay.