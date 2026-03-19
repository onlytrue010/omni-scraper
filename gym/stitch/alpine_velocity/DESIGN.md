# Design System Document: Sports Performance Dashboard

## 1. Overview & Creative North Star
**Creative North Star: "The Kinetic Alpine"**
This design system is engineered to feel like a high-end precision instrument used in elite mountain sports. It moves beyond the "flat dashboard" trope by embracing a high-tech, editorial aesthetic that prioritizes atmospheric depth and data-driven urgency. 

We break the "template" look through **Kinetic Asymmetry**. Instead of a rigid, centered grid, we use intentional white space and overlapping "glass" modules to guide the eye toward performance peaks. The interface should feel like a head-up display (HUD) caught in a crisp, high-altitude morning: cold, sharp, and intensely focused.

---

## 2. Colors & Surface Philosophy
The palette is built on the contrast between the crushing depth of `surface` (#0a0f14) and the electric spark of `primary` (#ff9159).

### The "No-Line" Rule
**Borders are prohibited for structural sectioning.** 1px solid lines create visual noise that degrades the premium feel. Instead, define boundaries through:
*   **Tonal Shifts:** Place a `surface-container-high` module against a `surface-dim` background.
*   **Negative Space:** Use the Spacing Scale (specifically `8` to `12` units) to create "breathing gaps" that define logic.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of materials.
1.  **Base Layer:** `surface` (#0a0f14) – The "ground" of the application.
2.  **Sectional Wrappers:** `surface-container-low` (#0e1419) – For large grouping areas.
3.  **Active Modules:** `surface-container-high` (#1a2027) – For primary data cards.
4.  **Floating Elements:** `surface-bright` (#252d35) – For elements requiring the most "lift."

### The "Glass & Gradient" Rule
To achieve a "high-tech alpine" soul, use **Glassmorphism** for floating overlays. Apply `surface-container` colors at 60-80% opacity with a `backdrop-blur` of 12px-20px. 
*   **Signature Gradient:** For primary actions, transition from `primary` (#ff9159) to `primary-container` (#ff7a2f) at a 135° angle. This mimics the glow of a sunrise on a slope.

---

## 3. Typography
We utilize a dual-typeface system to balance "High-Tech Editorial" with "Data Density."

*   **Display & Headlines (Space Grotesk):** This is our "mechanical" voice. It feels engineered. Use `display-lg` for hero metrics (e.g., Heart Rate, Velocity) to create a bold, unmistakable focal point.
*   **Body & Labels (Inter):** This is our "functional" voice. Inter’s tall x-height ensures that even at `label-sm` (0.6875rem), performance stats remain legible during high-activity monitoring.

**Hierarchy Tip:** Always pair a `headline-sm` in `on-surface` with a `label-md` in `on-surface-variant` (all caps, 0.05em tracking) to create an authoritative, data-first header.

---

## 4. Elevation & Depth
In this design system, height is signaled by light and transparency, not shadows.

*   **The Layering Principle:** Depth is achieved by "stacking." A `surface-container-highest` card sitting on a `surface-container-low` background creates a natural elevation. 
*   **Ambient Shadows:** If a card must "float" (e.g., a modal), use a shadow color of `#000000` at 15% opacity with a blur of 40px and a Y-offset of 20px. It should feel like a soft glow, not a hard drop-shadow.
*   **The "Ghost Border" Fallback:** If accessibility requires a border, use `outline-variant` (#43484e) at **15% opacity**. It should be felt, not seen.

---

## 5. Components

### Buttons
*   **Primary:** Slalom Orange gradient (`primary` to `primary-container`). Roundedness: `md` (0.375rem). Text: `label-md` (Bold).
*   **Secondary:** Ghost style. `outline` color border (15% opacity) with `on-surface` text. 
*   **Action Chips:** Use `secondary-container` (#274969) for a deep alpine blue background with `on-secondary-container` (#b2d4f9) text for a "cold" interactive feel.

### Cards & Lists
*   **Rule:** **No Dividers.** Separate list items using a `2.5` (0.5rem) vertical gap.
*   **Card Styling:** Use `surface-container-high`. For high-priority cards (e.g., "Live Heart Rate"), add a 2px left-accent-border using the `primary` Slalom Orange.

### Input Fields
*   **State:** Default background is `surface-container-lowest` (pure black) to "recede" into the dashboard.
*   **Focus:** Transition the border to 40% opacity `tertiary` (#4dafff) to create a "cool" glow.

### Additional Components: "The Performance Pulse"
*   **Sparklines:** Use `tertiary` (#4dafff) with a subtle glow (0 0 8px tertiary).
*   **Data Badges:** Small, `full` roundedness chips using `secondary-fixed` for categorical data (e.g., "Aerobic," "Anaerobic").

---

## 6. Do's and Don'ts

### Do
*   **Do** use `primary` (Slalom Orange) sparingly. It is a "warning" or "peak" color; overusing it devalues the kinetic energy.
*   **Do** use `surface-bright` for hover states to create a "light-up" effect.
*   **Do** lean into `spaceGrotesk` for numbers. They are the "hero" of this dashboard.

### Don't
*   **Don't** use pure white (#ffffff) for body text. Use `on-surface` (#eaeef6) to reduce eye strain in dark environments.
*   **Don't** use `DEFAULT` roundedness for everything. Use `full` for chips and `xl` for large container modules to create a sophisticated geometry.
*   **Don't** use standard red for errors if possible; use `error_dim` (#d7383b) to keep the error state within the "Alpine" tonal range.