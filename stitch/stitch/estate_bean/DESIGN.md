# Design System Strategy: The Artisanal Lens

## 1. Overview & Creative North Star: "The Digital Sommelier"
This design system moves away from the transactional nature of e-commerce and toward the editorial feel of a high-end lifestyle magazine. Our Creative North Star is **"The Digital Sommelier."** 

We do not just sell coffee; we curate an experience of origin, aroma, and craft. To achieve this, the layout must feel "un-templated." We embrace **intentional asymmetry**, where high-resolution imagery of steam or coffee beans breaks the container bounds, and **high-contrast typography scales** create a rhythmic flow. This system prioritizes breathing room (whitespace) as a luxury commodity, ensuring the user feels unhurried—much like the ritual of a slow-pour brew.

---

## 2. Colors & Surface Philosophy
The palette is rooted in the "Deep Espresso" (`primary: #25140a`) and "Cream" (`background: #fcf9f4`), with "Muted Gold" (`secondary: #775a19`) acting as a sophisticated accent for moments of conversion or premium highlight.

### The "No-Line" Rule
Standard 1px solid borders are strictly prohibited for sectioning. We define space through **Tonal Transitions**. 
*   **Implementation:** Use a `surface-container-low` (`#f6f3ee`) section to house a product carousel against a `surface` (`#fcf9f4`) background. The change in warmth is enough to signal a new context without the "boxed-in" feel of a border.

### Surface Hierarchy & Nesting
Treat the UI as physical layers of organic material.
*   **Layer 0 (Base):** `surface` (#fcf9f4)
*   **Layer 1 (Cards):** `surface-container-lowest` (#ffffff) for maximum "lift."
*   **Layer 2 (Overlays):** `surface-container-high` (#ebe8e3) for elevated navigation or drawers.

### The "Glass & Gradient" Rule
To evoke the translucency of a glass carafe, use **Glassmorphism** for floating elements (like a sticky header). 
*   **Formula:** `surface` at 80% opacity + `backdrop-blur: 12px`.
*   **Signature Texture:** Apply a subtle radial gradient transitioning from `primary` (#25140a) to `primary_container` (#3c281d) on hero call-to-actions to add "soul" and depth that prevents the dark coffee tones from looking flat.

---

## 3. Typography: The Editorial Voice
Our typography pairing balances the tradition of the craft with the modern precision of roasting.

*   **Display & Headlines (Noto Serif):** These are our "Voice." Use `display-lg` (3.5rem) for hero statements. The serif evokes history and quality. Ensure tight tracking (-2%) on large headlines for a custom, bespoke feel.
*   **Body & Titles (Manrope):** These are our "Information." Manrope provides a clean, geometric contrast to the serif. Use `body-lg` (1rem) for product descriptions to ensure a premium, readable density.
*   **Hierarchy:** Always use `on_surface_variant` (#504442) for secondary body text to maintain a soft, low-contrast aesthetic that is easier on the eyes than pure black.

---

## 4. Elevation & Depth
In this system, depth is felt, not seen through heavy shadows.

*   **The Layering Principle:** Stack `surface-container` tiers. For example, place a `surface-container-lowest` card on a `surface-container-low` section. This "paper-on-linen" effect is the hallmark of luxury.
*   **Ambient Shadows:** If an element must float (e.g., a "Quick Add" button), use an extra-diffused shadow: `box-shadow: 0 20px 40px rgba(37, 20, 10, 0.06)`. Note the use of the `primary` (Espresso) color in the shadow tint—never use neutral grey.
*   **The "Ghost Border" Fallback:** If accessibility requires a stroke, use `outline_variant` at 15% opacity. It should be a "whisper" of a line.

---

## 5. Components

### Buttons
*   **Primary:** `primary` (#25140a) background with `on_primary` text. Use `rounded-sm` (0.125rem) for a sharp, architectural look.
*   **Secondary (The Gold Standard):** `secondary` (#775a19) text with a `surface-variant` background or a simple underline.
*   **Interaction:** On hover, primary buttons should shift to `primary_container` (#3c281d) with a slight "lift" using an ambient shadow.

### Input Fields
*   **Styling:** No bottom line or full box. Use a `surface-container-high` background with `rounded-md`.
*   **Focus:** Transition the background to `surface-container-highest` and add a `secondary` (Muted Gold) "Ghost Border" at 20% opacity.

### Cards & Lists
*   **Constraint:** Zero dividers. Use vertical whitespace from the scale (e.g., `spacing-8` or `spacing-12`) to separate items.
*   **Imagery:** All product cards must use high-aspect-ratio photography with the `rounded-md` (0.375rem) corner radius to keep the feel "soft-modern."

### Signature Component: The "Origin Tag" (Chip)
*   Use `secondary_container` (#fed488) with `on_secondary_container` (#785a1a) text. 
*   **Shape:** `rounded-full`. Use these to denote "Single Origin," "Direct Trade," or "Limited Release."

---

## 6. Do’s and Don’ts

### Do:
*   **Do** use asymmetrical margins. If the left margin is `spacing-16`, try a `spacing-24` on the right for an editorial layout.
*   **Do** lean into the "Espresso" `primary` color for footer backgrounds to "ground" the page.
*   **Do** use `notoSerif` for numbers (prices) to make them feel like a boutique menu.

### Don’t:
*   **Don’t** use pure black (#000000). Always use `primary` (#25140a) for the darkest tones.
*   **Don’t** use high-contrast dividers. If you can't separate content with whitespace, the content is too crowded.
*   **Don’t** use standard "Material" blue for errors. Use our specific `error` (#ba1a1a) which is tuned to sit harmoniously against the cream background.
*   **Don’t** rush the user. Avoid aggressive pop-ups; use subtle `surface-container` snackbars that fade in elegantly.