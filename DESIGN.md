# SpiritLM Design System

This document describes the visual language and implementation patterns used on the SpiritLM site. Use it as a practical reference when extending the existing interface.

## Design direction

- Dark, restrained interface for an AI platform aimed at developers and teams.
- Near-black page backgrounds, soft gray text, and warm yellow for primary actions and selected states.
- Large, tightly tracked headlines balance compact navigation, quiet labels, and dense product information.
- Use the supplied SpiritLM logo and landing artwork as brand assets; avoid adding decorative imagery without a clear product purpose.

## Color

| Purpose | Value |
| --- | --- |
| Main background | `#080808` |
| Header background | `#050505` |
| Section background | `#101010` |
| Card / raised surface | `#1b1b1b` |
| Hover surface | `#242424` |
| Main text | `#f3f2ee` |
| Secondary text | `#a5a5a1` |
| Quiet text | `#777875` |
| Accent yellow | `#ffe02e` |
| Deep accent | `#dfc21e` |
| Border | `#30302e` |

Use yellow sparingly for primary calls to action, active navigation, highlighted model imagery, and small directional icons. Provider/model identities may use muted, distinct colors on dark tinted backgrounds.

## Typography

- **Body and interface:** Figtree, with Arial as fallback.
- **Headings:** Manrope, with Figtree as fallback.
- Body text defaults to `16px` with a `1.5` line-height. Interface labels generally use `11–14px`.
- Headlines use a bold weight, compact line height, and tight negative tracking. The hero heading is responsive (`54–78px` desktop); section headings are `38–54px`.
- Use sentence case. Keep supporting copy short and muted rather than competing with the headline.

## Layout and spacing

- Center content in a fluid page container capped at `1340px`, with `40px` minimum side gutters on wide screens.
- The desktop hero uses two balanced columns: copy and actions on the left, supplied artwork on the right.
- The model catalog uses a three-column card grid on wide screens, two columns below `900px`, and one column below `620px`.
- The team section pairs explanatory copy with a product preview; stack these vertically on mobile.
- Use generous vertical spacing between major sections and compact spacing within cards and toolbars.
- Mobile page gutters are `18px`; tablet gutters are `24px`.

## Surfaces and shape

- Standard cards use a `15px` radius (`13px` on small screens), dark raised surfaces, and subtle borders only where needed.
- Buttons and controls use approximately `8–12px` radii. Pills and avatars may be fully rounded.
- Ghost buttons use a dark filled surface that brightens subtly on hover. Do not add decorative borders or outlines to ghost buttons; retain the visible keyboard focus ring for accessibility.
- Separate page sections with background tone and spacing. Do not draw divider lines or borders between landing page sections, including the header and footer.
- Avoid bright outlines and heavy shadows; reserve deeper shadows for the raised workspace preview.

## Components

- **Navigation:** compact top bar with logo, centered links, a yellow documentation action, and a circular profile control. Indicate the active link with a thin yellow underline.
- **Primary button:** yellow fill, dark text, medium-semibold label, and a small trailing arrow/document icon. Secondary actions are quiet text or transparent buttons.
- **Model card:** provider badge and subtle external arrow above a model symbol, title, short description, then a bottom metadata row divided by a fine line. The featured card may use a slightly warmer surface.
- **Tabs and search:** low-contrast controls on dark surfaces. Selected tabs use a warm dark tint with yellow text. On narrow screens, tabs scroll horizontally and the search field is hidden.
- **Workspace preview:** treat as a compact product UI, using dense rows, restrained separators, small role chips, and a muted active-status indicator.
- **Footer:** logo, concise brand line, navigation, and copyright in quiet text, separated from content by spacing.

## Icons and imagery

- Use simple, thin-stroke line icons, generally `18px`, with rounded caps and joins. Icons inherit their color from surrounding text unless highlighted.
- Prefer existing inline SVG conventions and the provided `logo.png`, `icon.png`, and `landing.png` assets.
- Keep the hero artwork contained within its column; preserve its aspect ratio.

## Interaction and accessibility

- Hover states are subtle: small surface shifts, yellow emphasis, or a slight upward movement on buttons/cards.
- Keep transitions short (about `0.2s`) and honor `prefers-reduced-motion`.
- Provide a visible yellow focus outline for keyboard-focused links and buttons.
- Maintain readable contrast for body text and preserve semantic headings, links, buttons, labels, and accessible names.

## Responsive behavior

- At `900px`, reduce the hero and workspace proportions and switch the model grid to two columns.
- At `620px`, simplify navigation, stack the hero and workspace, use a single-column model list, and reduce card density and type sizes.
- Avoid horizontal page overflow. Keep model tabs scrollable and allow action groups and footer links to wrap when needed.

Use tailwindCSS and shadcn/ui in code
