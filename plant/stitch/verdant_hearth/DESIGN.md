# Design System Specification: The Curated Conservatory

## 1. Overview & Creative North Star
**Creative North Star: "The Living Journal"**

This design system moves away from the sterile, rigid grids of traditional utility apps. Instead, it treats the interface as a premium editorial experience—a digital conservatory. The goal is to evoke the feeling of a high-end botanical magazine: sophisticated, breathable, and deeply organic. 

We achieve this through **intentional asymmetry**, where images of plants may break the container bounds to mimic natural growth, and **tonal depth**, where we replace harsh structural lines with soft shifts in earthy hues. The experience should feel like a sanctuary, not a spreadsheet.

---

## 2. Colors: A Botanical Palette
The palette is rooted in the "Deep Forest" primaries and "Earthy Sand" neutrals, designed to create a calm, high-contrast environment that puts the greenery of the user's plants front and center.

### Tonal Foundations
*   **Primary (`#154212`):** Our "Forest" anchor. Used for high-impact brand moments and primary actions. 
*   **Secondary (`#56642b`):** "Sage Leaf." Used for supportive elements and accents.
*   **Tertiary (`#642706`):** "Terracotta." Use this sparingly for warmth—ideal for alerts that need a soft touch rather than a harsh warning, or for grounding elements.

### The "No-Line" Rule
To maintain a premium, editorial feel, **1px solid borders are prohibited for sectioning.** Boundaries must be defined through background color shifts. 
*   **Example:** A plant gallery (using `surface-container-low`) should sit directly on the `background` (`#fdf9ee`) without a stroke. The contrast between the sand and the pale bone-white defines the space.

### Surface Hierarchy & Nesting
Treat the UI as physical layers of fine paper.
*   **Level 0 (Base):** `surface` or `background`.
*   **Level 1 (Sections):** `surface-container-low`.
*   **Level 2 (Interactive Cards):** `surface-container-lowest` (pure white) to provide a "pop" against the sand-colored base.

### The Glass & Gradient Rule
For floating navigation bars or high-end modal overlays, use **Glassmorphism**. Apply a semi-transparent version of `surface` with a 20px backdrop-blur. 
*   **Signature Polish:** Use a subtle linear gradient from `primary` (`#154212`) to `primary-container` (`#2d5a27`) for large CTA buttons to give them a dimensional, "living" feel.

---

## 3. Typography: Editorial Sophistication
We use **Plus Jakarta Sans** for its friendly yet architectural clarity. It bridges the gap between a professional tool and an approachable hobbyist companion.

*   **Display Scale:** Use `display-lg` (3.5rem) for "Hero" moments, like the name of a plant in a detail view. Reduce tracking slightly (-2%) to feel more curated.
*   **Headline Scale:** `headline-md` (1.75rem) should be used for section headers. Ensure there is significant `spacing-10` above these headers to allow the layout to breathe.
*   **The Contrast Play:** Pair a `display-sm` headline with a `label-md` uppercase subheader for a high-end magazine aesthetic. This hierarchy guides the eye toward the most "emotional" content first.

---

## 4. Elevation & Depth
In this system, depth is a feeling, not a drop-shadow effect.

### The Layering Principle
Avoid "Z-index wars." Instead, use the **Surface Tiers**.
1. Place a `surface-container-lowest` card on a `surface-container` background.
2. The slight shift in tonal value provides enough visual separation to signal "interactability" without cluttering the screen with lines.

### Ambient Shadows
Shadows should feel like natural light filtered through a window.
*   **Execution:** Use an extra-diffused blur (e.g., `blur: 24px`, `y: 8px`). 
*   **Color:** Never use pure black. Use a 6% opacity version of `on-surface` (`#1c1c15`) to ensure the shadow feels like a darker version of the surface color.

### The "Ghost Border" Fallback
If an element requires a container for accessibility (like a text input), use a **Ghost Border**.
*   **Token:** `outline-variant` at 20% opacity. It should be barely visible—enough to define the shape, but not enough to "trap" the eye.

---

## 5. Components

### Buttons
*   **Primary:** Filled with the `primary` to `primary-container` gradient. Use `roundedness-full` for a soft, pebble-like feel.
*   **Tertiary:** No background, `primary` text. Use for less critical actions like "See All."

### Cards & Lists
*   **Forbid Dividers:** Do not use lines between list items. Use `spacing-3` of vertical white space or alternate between `surface` and `surface-container-low` backgrounds.
*   **The "Organic" Card:** Use `roundedness-xl` (1.5rem) for large cards. If the card contains an image of a plant, allow the leaves to "break out" of the top edge of the card for an asymmetrical, premium look.

### Input Fields
*   Use `surface-container-highest` for the background fill.
*   Apply `roundedness-md` (0.75rem).
*   Active state: A `ghost-border` using `primary` at 50% opacity.

### Plant Health Chips
*   Use `secondary-container` for the background and `on-secondary-container` for text. These should feel like small, smooth stones. Use `roundedness-full`.

---

## 6. Do's and Don'ts

### Do
*   **DO** use whitespace as a functional tool. If a screen feels cluttered, increase spacing to the next tier in the scale (e.g., move from `spacing-6` to `spacing-8`).
*   **DO** use "Plus Jakarta Sans" in Medium weight for body text to ensure readability against the off-white background.
*   **DO** overlap elements. A plant image floating slightly over a title creates a sense of depth and bespoke design.

### Don't
*   **DON'T** use 100% black text. Always use `on-surface` (`#1c1c15`) to keep the contrast soft and high-end.
*   **DON'T** use standard 4px "rounded corners." Stick to `md` (0.75rem) or higher to ensure the "organic" brand promise is met.
*   **DON'T** use hard-edged dividers or boxes. If the UI feels like a grid of boxes, you have lost the "Conservatory" feel. Revert to tonal layering.