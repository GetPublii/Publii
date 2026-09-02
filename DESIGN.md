---
version: alpha
name: Publii Application
description: Normative visual contract for the Publii desktop application renderer.
omitted:
  - section: components
    reason: Component contracts remain normative in prose because the selected DTCG compatibility target does not emit component definitions.
colors:
  primary: "{colors.color-primary}"
  color-primary: "oklch(63% 0.182 251)"
  workspace-accent-indigo: "oklch(57% 0.205 275)"
  workspace-accent-violet: "oklch(59% 0.220 300)"
  workspace-accent-magenta: "oklch(57% 0.215 330)"
  workspace-accent-crimson: "oklch(56% 0.205 355)"
  workspace-accent-rose: "oklch(56% 0.205 15)"
  workspace-accent-orange: "oklch(57% 0.150 45)"
  workspace-accent-emerald: "oklch(52% 0.125 155)"
  workspace-accent-petrol: "oklch(48% 0.075 205)"
  workspace-accent-navy: "oklch(51% 0.064 269)"
  workspace-accent-graphite: "oklch(47% 0.025 265)"
  workspace-accent-midnight: "oklch(42% 0.030 268)"
  white: "oklch(100% 0 0)"
  color-danger: "oklch(59% 0.234 29)"
  color-success: "oklch(70% 0.148 154)"
  color-warning: "oklch(82% 0.167 86)"
  color-highlight: "oklch(85% 0.174 87)"
  color-highlight-surface: "oklch(98% 0.031 93)"
  overlay: "oklch(0% 0 0 / 35%)"
  bg-primary: "oklch(100% 0 0)"
  bg-secondary: "oklch(100% 0 0)"
  bg-site: "oklch(97% 0.004 286)"
  color-surface-subtle: "oklch(97% 0.004 286)"
  color-surface-notice: "oklch(93% 0.003 265)"
  color-surface-strong: "oklch(53% 0.019 271)"
  color-border-subtle: "oklch(97% 0.004 286)"
  color-border-default: "oklch(88% 0.006 275)"
  color-border-muted: "oklch(93% 0.003 265)"
  color-border-emphasis: "oklch(49% 0.017 268)"
  color-border-strong: "oklch(53% 0.019 271)"
  color-text-faint: "oklch(88% 0.006 275)"
  color-text-subtle: "oklch(49% 0.017 268)"
  color-text-muted: "oklch(53% 0.019 271)"
  color-icon-faint: "oklch(97% 0.004 286)"
  color-icon-muted: "oklch(53% 0.019 271)"
  color-control-surface-hover: "oklch(93% 0.003 265)"
  color-control-border-hover: "oklch(49% 0.017 268)"
  border-light-color: "oklch(93% 0.003 265)"
  text-primary-color: "oklch(32% 0.011 271)"
  text-light-color: "oklch(53% 0.019 271)"
  text-lightest-color: "oklch(58% 0.021 269)"
  headings-color: "oklch(21% 0.047 244)"
  label-color: "oklch(21% 0.047 244)"
  link-primary-color: "oklch(52% 0.148 251)"
  link-primary-color-hover: "oklch(21% 0.047 244)"
  link-invert-color: "oklch(52% 0.148 251)"
  link-invert-color-hover: "oklch(21% 0.047 244)"
  icon-primary-color: "oklch(37% 0.013 267)"
  icon-secondary-color: "oklch(49% 0.017 268)"
  icon-tertiary-color: "oklch(37% 0.013 267)"
  icon-quaternary-color: "oklch(80% 0.100 245)"
  input-bg: "oklch(100% 0 0)"
  input-border-dark: "oklch(84% 0.007 269)"
  input-bg-light: "oklch(97% 0.004 286)"
  input-bg-lightest: "oklch(100% 0 0)"
  input-border-color: "oklch(88% 0.006 275)"
  input-border-focus: "oklch(63% 0.182 251)"
  button-primary-bg: "oklch(63% 0.182 251)"
  button-primary-bg-hover: "oklch(58% 0.165 251)"
  button-secondary-bg: "oklch(93% 0.031 244)"
  button-secondary-bg-hover: "oklch(91% 0.045 243)"
  button-secondary-color: "oklch(52% 0.148 251)"
  button-secondary-color-hover: "oklch(46% 0.129 251)"
  button-danger-bg: "oklch(59% 0.234 29)"
  button-danger-bg-hover: "#CD1613"
  collection-bg: "oklch(100% 0 0)"
  collection-bg-hover: "oklch(98% 0.008 237)"
  sidebar-bg-top: "oklch(58% 0.165 251)"
  sidebar-bg-bottom: "oklch(63% 0.182 251)"
  sidebar-link-color: "oklch(100% 0 0)"
  sidebar-link-color-hover: "oklch(100% 0 0)"
  sidebar-link-color-active: "oklch(100% 0 0)"
  sidebar-link-bg-hover: "oklch(100% 0 0 / 14%)"
  sidebar-link-bg-active: "oklch(100% 0 0 / 14%)"
  sidebar-sync-btn-bg: "oklch(100% 0 0 / 20%)"
  tab-color: "oklch(21% 0.047 244)"
  tab-color-hover: "oklch(52% 0.148 251)"
  tab-active-bg: "oklch(93% 0.031 244)"
  tab-active-color: "oklch(52% 0.148 251)"
  popup-bg: "oklch(100% 0 0)"
  popup-btn-cancel-color: "oklch(53% 0.019 271)"
  popup-btn-cancel-hover-color: "oklch(41% 0.014 269)"
  popup-btn-cancel-bg: "oklch(100% 0 0)"
  popup-btn-cancel-bg-hover: "oklch(97% 0.004 286)"
  scrollbar: "oklch(93% 0.003 265)"
  scrollbar-hover: "oklch(88% 0.006 275)"
  top-app-bar: "oklch(88% 0.006 275)"
  text-selection-color: "#B6D8FD"
typography:
  font-family-sans:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
  font-family-serif:
    fontFamily: 'Georgia, "Times New Roman", Times, serif'
  font-family-mono:
    fontFamily: 'Menlo, Monaco, Consolas, "Courier New", monospace'
  font-size-ui-xs:
    fontSize: 1.2rem
  font-size-ui-sm:
    fontSize: 1.3rem
  font-size-ui-md:
    fontSize: 1.4rem
  font-size-ui-lg:
    fontSize: 1.6rem
  font-size-ui-xl:
    fontSize: 2.4rem
  font-weight-light:
    fontWeight: 300
  font-weight-regular:
    fontWeight: 400
  font-weight-medium:
    fontWeight: 500
  font-weight-semibold:
    fontWeight: 600
  font-weight-bold:
    fontWeight: 700
  line-height-base:
    lineHeight: 1.5
rounded:
  base: 6px
spacing:
  unit: 0.25rem
  1: 0.25rem
  2: 0.5rem
  3: 0.75rem
  4: 1rem
  6: 1.5rem
  8: 2rem
  12: 3rem
  16: 4rem
---

## Overview

Publii is a desktop static-site CMS. Its application renderer uses system typography, a blue default action accent, neutral work surfaces, persistent site context, and light and dark color schemes. Twelve per-site workspace accents are available. The production appearance represented by this document is the normative baseline while the design system is reorganized.

This contract covers the application workspace and the shared visual roles consumed by its editors. Editor layouts and editor component contracts remain outside the current component-normalization scope.

## Colors

The blue scale supplies application identity and interactive emphasis. Neutral scales supply work surfaces, text, borders, controls, and collections. Private brand and neutral primitives are authored in OKLCH. The normative values below preserve the source notation: migrated palette and status roles use OKLCH, while intentionally unchanged compatibility roles retain their existing HEX or RGBA notation. Shared semantic roles remain the governing interface between these palettes and components. `primary` is the canonical brand-action role; `color-primary` remains its source-compatible alias during migration.

Status roles use independently tuned OKLCH values through `color-danger`, `color-success`, and `color-warning`. The solid `color-highlight` role is the source for translucent highlight effects; highlight surfaces remain independent from warning states so content emphasis does not inherit status semantics.

Static black and white OKLCH foundations compose alpha colors such as shadows, scrims, and inverse loading indicators through relative color syntax. Opacity is local to the effect; it does not require a separate global token or RGB-channel token for every alpha value.

Sidebar hover, active, and synchronization surfaces use translucent white overlays so they preserve their hierarchy across every workspace accent without embedding an accent-specific literal.

An `appAppearance` remaps the complete shared visual language, including color roles, typography, spacing, shape, depth, and motion. A component does not require selector overrides to participate in an application appearance.

A `workspaceAccent` is a per-site preference inside an `appAppearance`. It remaps only that appearance's private brand palette, leaving neutral and status palettes, typography, spacing, component contracts, and generated-site output unchanged. The `default` accent uses the base palette of the active appearance; unsupported persisted values resolve to `default`. The Publii registry keeps its first seven chromatic accents in a readable progression — `default`, `indigo`, `violet`, `magenta`, `crimson`, `rose`, and `orange` — then adds the more tonal `emerald`, `petrol`, `navy`, `graphite`, and `midnight` set. The settings UI renders this registry order directly.

Every non-default accent is independently tuned for light and dark and must satisfy the automated WCAG AA relationships used by semantic controls, links, synchronization actions, and focus indicators. The original default blue remains a deliberate visual-compatibility exception; preserving its established rendering takes precedence during this migration, and its contrast must not be treated as the standard for new accents.

## Themes

Use `siteTheme` for themes applied to generated websites. Use `appAppearance` for a named visual preset of the Publii application. Use `colorScheme` for the resolved `light` or `dark` application scheme. `system` is a user preference that resolves `colorScheme`; it is not an appearance or a site theme.

Light and dark share semantic role names and component contracts, not literal color values. The dark scheme is an independently tuned palette with its own contrast, surface, border, hover, and disabled-state relationships. Do not derive it mechanically by darkening, inverting, or changing the opacity of the light scheme.

`app-appearance.js` is the single runtime owner of appearance attributes for the main document and embedded documents. It validates registered appearances and their supported workspace accents, sets `data-app-appearance`, `data-color-scheme`, and `data-workspace-accent`, and retains `data-theme` for plugin and migration compatibility. Components must not write any of these attributes directly.

The current `default` implementation is the light scheme of the `publii` application appearance. The existing source name remains valid during compatibility migration. Each appearance lives in a matching file under `app/src/css/appearances/`; `css-variables.css` retains only appearance-independent technical foundations.

Empty-state illustrations use one inline SVG symbol per illustration. Their surfaces, borders, muted details, and shadows consume the same semantic roles as application UI, while branded details consume `color-primary`. They must therefore react to `colorScheme` and `workspaceAccent` through inherited CSS custom properties; separate light/dark illustration assets and component-owned theme switching are not part of the contract.

| Token | Default/light | Dark |
| --- | --- | --- |
| `primary` | `oklch(63% 0.182 251)` | `oklch(64% 0.199 254)` |
| `color-primary` | `oklch(63% 0.182 251)` | `oklch(64% 0.199 254)` |
| `workspaceAccent/indigo primary` | `oklch(57% 0.205 275)` | `oklch(55% 0.205 275)` |
| `workspaceAccent/violet primary` | `oklch(59% 0.220 300)` | `oklch(56% 0.220 300)` |
| `workspaceAccent/magenta primary` | `oklch(57% 0.215 330)` | `oklch(56% 0.215 330)` |
| `workspaceAccent/crimson primary` | `oklch(56% 0.205 355)` | `oklch(55% 0.205 355)` |
| `workspaceAccent/rose primary` | `oklch(56% 0.205 15)` | `oklch(56% 0.205 15)` |
| `workspaceAccent/orange primary` | `oklch(57% 0.150 45)` | `oklch(55% 0.150 45)` |
| `workspaceAccent/emerald primary` | `oklch(52% 0.125 155)` | `oklch(51% 0.120 155)` |
| `workspaceAccent/petrol primary` | `oklch(48% 0.075 205)` | `oklch(52% 0.080 205)` |
| `workspaceAccent/navy primary` | `oklch(51% 0.064 269)` | `oklch(52% 0.066 269)` |
| `workspaceAccent/graphite primary` | `oklch(47% 0.025 265)` | `oklch(52% 0.025 265)` |
| `workspaceAccent/midnight primary` | `oklch(42% 0.030 268)` | `oklch(52% 0.045 268)` |
| `white` | `oklch(100% 0 0)` | `oklch(100% 0 0)` |
| `color-danger` | `oklch(59% 0.234 29)` | `oklch(67% 0.217 25)` |
| `color-success` | `oklch(70% 0.148 154)` | `oklch(66% 0.193 135)` |
| `color-warning` | `oklch(82% 0.167 86)` | `oklch(82% 0.167 86)` |
| `color-highlight` | `oklch(85% 0.174 87)` | `oklch(85% 0.174 87)` |
| `color-highlight-surface` | `oklch(98% 0.031 93)` | `oklch(33% 0.019 281)` |
| `overlay` | `oklch(0% 0 0 / 35%)` | `rgba(28, 29, 35, 0.85)` |
| `bg-primary` | `oklch(100% 0 0)` | `oklch(22% 0.010 277)` |
| `bg-secondary` | `oklch(100% 0 0)` | `oklch(25% 0.013 279)` |
| `bg-site` | `oklch(97% 0.004 286)` | `oklch(22% 0.010 277)` |
| `color-surface-subtle` | `oklch(97% 0.004 286)` | `oklch(29% 0.016 280)` |
| `color-surface-notice` | `oklch(93% 0.003 265)` | `oklch(35% 0.023 282)` |
| `color-surface-strong` | `oklch(53% 0.019 271)` | `oklch(49% 0.032 278)` |
| `color-border-subtle` | `oklch(97% 0.004 286)` | `oklch(29% 0.016 280)` |
| `color-border-default` | `oklch(88% 0.006 275)` | `oklch(35% 0.023 282)` |
| `color-border-muted` | `oklch(93% 0.003 265)` | `oklch(35% 0.023 282)` |
| `color-border-emphasis` | `oklch(49% 0.017 268)` | `oklch(73% 0.023 280)` |
| `color-border-strong` | `oklch(53% 0.019 271)` | `oklch(49% 0.032 278)` |
| `color-text-faint` | `oklch(88% 0.006 275)` | `oklch(35% 0.023 282)` |
| `color-text-subtle` | `oklch(49% 0.017 268)` | `oklch(73% 0.023 280)` |
| `color-text-muted` | `oklch(53% 0.019 271)` | `oklch(49% 0.032 278)` |
| `color-icon-faint` | `oklch(97% 0.004 286)` | `oklch(29% 0.016 280)` |
| `color-icon-muted` | `oklch(53% 0.019 271)` | `oklch(49% 0.032 278)` |
| `color-control-surface-hover` | `oklch(93% 0.003 265)` | `oklch(35% 0.023 282)` |
| `color-control-border-hover` | `oklch(49% 0.017 268)` | `oklch(73% 0.023 280)` |
| `border-light-color` | `oklch(93% 0.003 265)` | `oklch(29% 0.016 280)` |
| `text-primary-color` | `oklch(32% 0.011 271)` | `oklch(73% 0.023 280)` |
| `text-light-color` | `oklch(53% 0.019 271)` | `oklch(65% 0.031 281)` |
| `text-lightest-color` | `oklch(58% 0.021 269)` | `oklch(49% 0.032 278)` |
| `headings-color` | `oklch(21% 0.047 244)` | `oklch(96% 0.004 286)` |
| `label-color` | `oklch(21% 0.047 244)` | `oklch(81% 0.017 282)` |
| `link-primary-color` | `oklch(52% 0.148 251)` | `oklch(69% 0.165 252)` |
| `link-primary-color-hover` | `oklch(21% 0.047 244)` | `oklch(89% 0.010 286)` |
| `link-invert-color` | `oklch(52% 0.148 251)` | `oklch(89% 0.010 286)` |
| `link-invert-color-hover` | `oklch(21% 0.047 244)` | `oklch(69% 0.165 252)` |
| `icon-primary-color` | `oklch(37% 0.013 267)` | `oklch(73% 0.023 280)` |
| `icon-secondary-color` | `oklch(49% 0.017 268)` | `oklch(65% 0.031 281)` |
| `icon-tertiary-color` | `oklch(37% 0.013 267)` | `oklch(89% 0.010 286)` |
| `icon-quaternary-color` | `oklch(80% 0.100 245)` | `oklch(57% 0.039 280)` |
| `input-bg` | `oklch(100% 0 0)` | `oklch(23% 0.012 278)` |
| `input-border-dark` | `oklch(84% 0.007 269)` | `oklch(42% 0.027 280)` |
| `input-bg-light` | `oklch(97% 0.004 286)` | `oklch(29% 0.016 280)` |
| `input-bg-lightest` | `oklch(100% 0 0)` | `oklch(27% 0.015 280)` |
| `input-border-color` | `oklch(88% 0.006 275)` | `oklch(35% 0.023 282)` |
| `input-border-focus` | `oklch(63% 0.182 251)` | `oklch(64% 0.199 254)` |
| `button-primary-bg` | `oklch(63% 0.182 251)` | `oklch(64% 0.199 254)` |
| `button-primary-bg-hover` | `oklch(58% 0.165 251)` | `oklch(59% 0.203 256)` |
| `button-secondary-bg` | `oklch(93% 0.031 244)` | `oklch(38% 0.123 255)` |
| `button-secondary-bg-hover` | `oklch(91% 0.045 243)` | `oklch(43% 0.143 255)` |
| `button-secondary-color` | `oklch(52% 0.148 251)` | `oklch(81% 0.100 249)` |
| `button-secondary-color-hover` | `oklch(46% 0.129 251)` | `oklch(89% 0.055 249)` |
| `button-danger-bg` | `oklch(59% 0.234 29)` | `#ED0001` |
| `button-danger-bg-hover` | `#CD1613` | `#A90001` |
| `collection-bg` | `oklch(100% 0 0)` | `oklch(23% 0.012 278)` |
| `collection-bg-hover` | `oklch(98% 0.008 237)` | `oklch(25% 0.013 279)` |
| `sidebar-bg-top` | `oklch(58% 0.165 251)` | `oklch(20% 0.010 285)` |
| `sidebar-bg-bottom` | `oklch(63% 0.182 251)` | `oklch(22% 0.010 277)` |
| `sidebar-link-color` | `oklch(100% 0 0)` | `oklch(81% 0.017 282)` |
| `sidebar-link-color-hover` | `oklch(100% 0 0)` | `oklch(89% 0.010 286)` |
| `sidebar-link-color-active` | `oklch(100% 0 0)` | `oklch(89% 0.010 286)` |
| `sidebar-link-bg-hover` | `oklch(100% 0 0 / 14%)` | `oklch(23% 0.012 278)` |
| `sidebar-link-bg-active` | `oklch(100% 0 0 / 14%)` | `oklch(27% 0.015 280)` |
| `sidebar-sync-btn-bg` | `oklch(100% 0 0 / 20%)` | `oklch(64% 0.199 254)` |
| `tab-color` | `oklch(21% 0.047 244)` | `oklch(81% 0.017 282)` |
| `tab-color-hover` | `oklch(52% 0.148 251)` | `oklch(89% 0.010 286)` |
| `tab-active-bg` | `oklch(93% 0.031 244)` | `oklch(29% 0.016 280)` |
| `tab-active-color` | `oklch(52% 0.148 251)` | `oklch(89% 0.010 286)` |
| `popup-bg` | `oklch(100% 0 0)` | `oklch(27% 0.015 280)` |
| `popup-btn-cancel-color` | `oklch(53% 0.019 271)` | `oklch(73% 0.023 280)` |
| `popup-btn-cancel-hover-color` | `oklch(41% 0.014 269)` | `oklch(96% 0.004 286)` |
| `popup-btn-cancel-bg` | `oklch(100% 0 0)` | `oklch(27% 0.015 280)` |
| `popup-btn-cancel-bg-hover` | `oklch(97% 0.004 286)` | `#343540` |
| `scrollbar` | `oklch(93% 0.003 265)` | `oklch(29% 0.016 280)` |
| `scrollbar-hover` | `oklch(88% 0.006 275)` | `oklch(33% 0.021 281)` |
| `top-app-bar` | `oklch(88% 0.006 275)` | `oklch(27% 0.015 280)` |
| `text-selection-color` | `#B6D8FD` | `#94B6DB` |

## Typography

Application chrome and controls use the shared system sans-serif stack. Serif and monospace stacks remain available for content and code contexts owned by the application. Shared UI sizes and the light, regular, medium, semibold, and bold weights form the application typography contract and are owned by each `appAppearance`; editor content sizes remain independently owned.

Persisted editor font preferences use the CSS generic families `sans-serif` or `serif`. Editor content can live in documents that do not load the application token sheet, so cross-document font preferences must not depend on application custom properties. The store boundary normalizes legacy token values when configuration is loaded or updated.

## Layout

The primary workspace uses a persistent site sidebar and a separately scrolling content region. Appearance-independent technical foundations own the application sidebar, content wrapper, top bar, and options-sidebar dimensions.

The appearance-owned compact spacing scale covers the recurring application rhythm: `space-1`, `space-2`, `space-3`, `space-4`, `space-6`, `space-8`, `space-12`, and `space-16`. The numeric suffix is the multiplier of the 0.25rem base unit. Use these tokens for margins, padding, and gaps when the exact value exists in the scale. `space-unit` remains available for proportional calculations; optical corrections and structural dimensions remain local. Do not create a global token for a one-off measurement.

## Elevation & Depth

Hierarchy relies primarily on surface contrast and borders. The shared `shadow-sm` and `shadow-md` roles are reserved for raised controls, panels, and overlays; `shadow-list-hover` owns the common hover elevation of installable-item lists, and `shadow-color` supports composed editor shadows. Unique popup and feedback effects remain locally owned rather than expanding the global elevation scale.

Viewport-level stacking follows the shared order from panel and editor help through overlay, editor toolbar, popup, toast, dialog, and alert. Numeric `z-index` values remain valid only for local sibling ordering inside a component-owned stacking context.

## Shapes

The appearance-owned base corner radius governs rectangular controls and containers. Circular controls and fully rounded search fields remain component-specific shapes.

## Components

Buttons separate `intent`, `appearance`, `size`, `width`, and `layout`. Loading, active, disabled, square, back, and icon-only states are independent booleans; leading-icon layout is derived from the `icon` prop. Callers must not encode multiple concerns in a space-delimited variant string.

Inputs use the shared input background, border, focus, text, disabled, readonly, and validation roles. `TextInput` separates native input type, visual size, and keyboard blocking; these concerns must not share a string-based property. `Dropdown`, `RadioButton`, and `Switcher` each have one value contract through `value`/`v-model`; initial-state aliases such as `selected` and `checked` are not part of those contracts. The list-selection `Checkbox` remains a controlled primitive with explicit `checked`, item `value`, and callback props. `customCssClasses` is retained only as a schema-driven extension point for theme and plugin settings. `Field` accepts `normal` or `small` spacing while label layout states remain independent booleans. `ImageUpload` exposes `default` and `small` through its size contract. `ButtonDropdown` uses an explicit intent and derives icon layout from its icon prop. `ProgressBar` uses semantic `default`, `success`, `danger`, and `warning` intents rather than color names. `Overlay` uses `default` or `drop-zone` appearance rather than color-named booleans. `Icon` uses its existing named size set and the `nonInteractive` boolean; pointer behavior must not be encoded in a string of properties. Its custom-class extension remains available for controlled file-type classes. `Collection` receives its column count explicitly; `CollectionCell` uses a validated visual `variant`, while row states such as the main author are booleans. Collections use their shared background and hover roles with the common border role. `Tabs` uses an explicit `vertical` or `horizontal` orientation and an independent `scrollable` capability, together with the shared text, hover, active-background, and active-text roles.

The sidebar is the principal branded application surface. Its existing gradient, inverse content, site context, preview action, and synchronization action remain part of the Publii application appearance.

The site selector owns contextual website switching and the action for opening a selected website in another application window. Application Settings contains persisted preferences only; immediate window-management commands remain in the application menu and the site selector.

## Automated Governance

Run `npm run audit:design-system` before merging renderer styling changes. The audit must keep global custom-property references resolved, reject unused or legacy global tokens, require every registered appearance to have a matching CSS file and complete shared visual-language tokens, enforce the shared semantic contract across independently tuned light and dark color schemes, require every registered non-default workspace accent to provide complete light and dark OKLCH brand palettes and previews, verify WCAG AA contrast for its semantic controls and links, keep private palettes inside appearance files, prevent new literal colors from entering application-owned styles, require canonical spacing and typography values to use their shared tokens, and reject retired shared-component props.

The color-literal baseline records existing local exceptions without promoting them to design tokens. Fixed file-type colors, transparency artwork, and other genuinely local technical colors may remain component-owned. Reducing that baseline is allowed; increasing it requires replacing the literal with an existing semantic role or explicitly revising the design-system contract. Vendor assets, schema color data, brand artwork, and editor-owned styles are excluded until their respective migration phases.

The regular `npm test` command runs the design-system audit before the backend test suite. A production renderer build remains the final structural verification for changes to shared tokens or primitives.

## Do's and Don'ts

- Do preserve the current rendered appearance during design-system foundation work.
- Do use `siteTheme`, `appAppearance`, and `colorScheme` as separate concepts.
- Do treat `workspaceAccent` as a per-site brand-palette override inside an `appAppearance`.
- Do validate new workspace accents against their real semantic foreground and background pairs in both color schemes.
- Do define complete visual-language, light, and dark contracts for every `appAppearance`.
- Do remove an internal legacy token when every in-repository consumer can migrate atomically; reserve compatibility aliases for public or staged APIs.
- Do add a global token only for a semantic role shared across components, a value that changes by application appearance, or an established foundation used repeatedly.
- Do keep editor-specific layouts and editor-owned component contracts outside the current normalization scope while routing shared tokens through editor chrome.
- Do migrate schema-driven component options such as separator sizing through an explicit settings-schema version; keep their current compatibility contract until that migration is atomic for themes and plugins.
- Do use shared layer roles for viewport-level surfaces and local numeric stacking only inside component-owned contexts.
- Do configure buttons through their explicit intent, appearance, size, width, layout, and state props.
- Don't call an application appearance a theme or template.
- Don't use `workspaceAccent` to change neutral or status palettes, typography, spacing, or generated-site output.
- Don't make an application appearance depend on internal component selectors when a shared visual role exists.
- Don't replace a shared visual role with a local literal value during compatibility migration.
- Don't mirror every local measurement, shadow, or one-off color as a new global token; keep component-owned values local until they acquire a shared semantic role.
