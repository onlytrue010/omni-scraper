# Design System Document: The Precision Athlete

## 1. Overview & Creative North Star: "The Digital Cortical"
The Creative North Star for this design system is **The Digital Cortical**. In the world of high-performance sports analytics, data is the athlete’s second nervous system. This system moves away from the "clunky dashboard" trope, leaning instead into a high-end editorial aesthetic that feels like a premium Swiss chronograph: precise, lightweight, and undeniably authoritative.

We achieve this through **Intentional Asymmetry** and **Micro-Density**. By balancing vast amounts of white space (The "Breath") with small, highly-detailed clusters of technical data (The "Pulse"), we create a rhythm that guides the eye to critical performance insights without overwhelming the user. We reject the standard "boxed-in" grid in favor of a layered, fluid layout where information feels suspended in a clean, clinical environment.

---

## 2. Colors & Surface Architecture

### The Palette
The color logic is rooted in "Athletic Trust." We use **Primary (#003461)** to anchor the user in stability and **Secondary (#006970)** to highlight growth and kinetic energy.

*   **Primary (Athletic Blue):** `#003461` — Use for high-intent actions.
*   **Secondary (Crisp Teal):** `#006970` — Reserved for success states and data trend-lines.
*   **Surface (The Canvas):** `#f9f9f9` — Our base environment.

### The "No-Line" Rule
To maintain a premium editorial feel, **standard 1px solid borders are prohibited for sectioning.** We define boundaries through tonal shifts. A section should be distinguished from the background by moving from `surface` to `surface-container-low`. 

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of fine, semi-opaque materials. 
*   **Base Layer:** `surface` (#f9f9f9)
*   **Sectioning:** `surface-container-low` (#f3f3f4) to define large content areas.
*   **Interactive Cards:** `surface-container-lowest` (#ffffff) to "lift" key data points off the page.

### Signature Textures
Avoid flat, "dead" fills. For primary CTAs or Hero analytics cards, use a **Linear Tonal Shift**: 
*   From `primary` (#003461) to `primary_container` (#004b87) at a 135° angle. This creates a "machined" satin finish rather than a generic gradient.

---

## 3. Typography: Technical Authority
We use **Inter** exclusively. It is a typeface designed for screens, and we utilize its variable weights to create a "Technical Editorial" hierarchy.

*   **Display (The Stat):** `display-lg` (3.5rem). Used for "Hero Numbers" like Win Probability or Max Velocity. Use a tighter letter-spacing (-0.02em) to feel "locked-in."
*   **Headline (The Narrative):** `headline-sm` (1.5rem). Used for section titles. Pair this with `surface-tint` to create a soft, colored-ink effect.
*   **Label (The Metadata):** `label-md` (0.75rem). All labels for charts and data points must use `on_surface_variant` (#424750). These should never be pure black; they must feel secondary to the data itself.

---

## 4. Elevation & Depth: Tonal Layering

### The Layering Principle
Hierarchy is achieved by stacking. Place a `surface-container-lowest` (#ffffff) card inside a `surface-container` (#eeeeee) zone. This creates a "Natural Inset" look that mimics a high-end physical folder or a medical report.

### Ambient Shadows
Shadows must be invisible until they are noticed. 
*   **Value:** `0px 4px 20px rgba(26, 28, 28, 0.06)`
*   The shadow color is derived from `on_surface` at 6% opacity. This ensures the shadow feels like a natural obstruction of light on the grey surface, rather than a "dirty" black smudge.

### The "Ghost Border" Fallback
Where a border is required for extreme data density (e.g., complex data tables), use a **Ghost Border**:
*   **Stroke:** 1px
*   **Color:** `outline_variant` at 20% opacity. 

### Glassmorphism
For floating overlays (tooltips, dropdowns), use:
*   **Background:** `surface` at 80% opacity.
*   **Blur:** `12px` backdrop-blur.
This keeps the "Sports Lab" feel—clean, transparent, and high-performance.

---

## 5. Components & Interaction

### Buttons
*   **Primary:** `primary_container` background with `on_primary` text. Use `md` (0.375rem) roundedness. Avoid "pill" shapes for primary actions; stay geometric to feel more technical.
*   **Tertiary:** No background, no border. Use `primary` text with a subtle `surface-container-highest` background shift on hover.

### Cards & Lists: The "Zero-Divider" Mandate
**Never use horizontal lines to separate list items.** 
*   Instead, use `spacing-4` (1.4rem) of vertical white space.
*   Or, use alternating background tints: `surface` vs `surface-container-low`.

### Data Visualization (The Signature)
*   **The "Teal Spark":** All success metrics and positive growth must use `secondary` (#006970). 
*   **The "Blue Anchor":** All baseline or historical data uses `primary_fixed_dim` (#a3c9ff).

### Specific Dashboard Components
*   **The Metric Tile:** A `surface-container-lowest` card with a `px` Ghost Border. The "Hero Number" should be `display-sm`, and the "Label" should be `label-sm` in all-caps with 0.05em tracking.
*   **Performance Toggles:** Use `full` roundedness for toggle switches, using `secondary` for the "On" state to symbolize "Engine Start."

---

## 6. Do’s and Don’ts

### Do:
*   **Do** use `spacing-10` and `spacing-12` for page margins to give the data room to "breathe."
*   **Do** use asymmetrical layouts. For example, a wide 2/3 column for a graph paired with a narrow 1/3 column for "Quick Stats."
*   **Do** use `surface_bright` for interactive hover states on cards.

### Don't:
*   **Don't** use 100% opaque black (#000000) for text. Always use `on_surface` (#1a1c1c).
*   **Don't** use "Drop Shadows" on flat buttons. They should feel integrated into the surface, not floating above it.
*   **Don't** use standard "Success Green." Use our `secondary` Teal (#006970) to maintain the custom brand identity.