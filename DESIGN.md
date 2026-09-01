---
version: alpha
name: Publii Application
description: Normative visual contract for the Publii desktop application renderer.
omitted:
  - section: components
    reason: Component contracts remain normative in prose because the selected DTCG compatibility target does not emit component definitions.
colors:
  primary: "{colors.color-primary}"
  color-primary: "#0D8BF2"
  white: "#FFFFFF"
  color-danger: "#EA1A16"
  color-success: "#40B771"
  color-warning: "#F2B900"
  color-highlight-surface: "#FFF8E1"
  overlay: "rgba(0, 0, 0, 0.35)"
  bg-primary: "#FFFFFF"
  bg-secondary: "#FFFFFF"
  bg-site: "#F6F6F9"
  color-surface-subtle: "#F6F6F9"
  color-surface-notice: "#E7E8EA"
  color-surface-strong: "#686C78"
  color-border-subtle: "#F6F6F9"
  color-border-default: "#D7D8DC"
  color-border-muted: "#E7E8EA"
  color-border-emphasis: "#5D616B"
  color-border-strong: "#686C78"
  color-text-faint: "#D7D8DC"
  color-text-subtle: "#5D616B"
  color-text-muted: "#686C78"
  color-icon-faint: "#F6F6F9"
  color-icon-muted: "#686C78"
  color-control-surface-hover: "#E7E8EA"
  color-control-border-hover: "#5D616B"
  border-light-color: "#E7E8EA"
  text-primary-color: "#313339"
  text-light-color: "#686C78"
  text-lightest-color: "#767B88"
  headings-color: "#02192B"
  label-color: "#02192B"
  link-primary-color: "#0A6ABA"
  link-primary-color-hover: "#02192B"
  link-invert-color: "#0A6ABA"
  link-invert-color-hover: "#02192B"
  icon-primary-color: "#3C3F46"
  icon-secondary-color: "#5D616B"
  icon-tertiary-color: "#3C3F46"
  icon-quaternary-color: "#84C4F9"
  input-bg: "#FFFFFF"
  input-border-dark: "#C7C9CE"
  input-bg-light: "#F6F6F9"
  input-bg-lightest: "#FFFFFF"
  input-border-color: "#D7D8DC"
  input-border-focus: "#0D8BF2"
  button-primary-bg: "#0D8BF2"
  button-primary-bg-hover: "#0B7BD6"
  button-secondary-bg: "#D8ECFD"
  button-secondary-bg-hover: "#C7E4FC"
  button-secondary-color: "#0A6ABA"
  button-secondary-color-hover: "#085A9D"
  button-danger-bg: "#EA1A16"
  button-danger-bg-hover: "#CD1613"
  collection-bg: "#FFFFFF"
  collection-bg-hover: "#F4FAFE"
  sidebar-bg-top: "#0B7BD6"
  sidebar-bg-bottom: "#0D8BF2"
  sidebar-link-color: "#FFFFFF"
  sidebar-link-color-hover: "#FFFFFF"
  sidebar-link-color-active: "#FFFFFF"
  sidebar-link-bg-hover: "rgba(98, 185, 255, 0.35)"
  sidebar-link-bg-active: "rgba(98, 185, 255, 0.35)"
  sidebar-sync-btn-bg: "rgba(98, 185, 255, 0.55)"
  tab-color: "#02192B"
  tab-color-hover: "#0A6ABA"
  tab-active-bg: "#D8ECFD"
  tab-active-color: "#0A6ABA"
  popup-bg: "#FFFFFF"
  popup-btn-cancel-color: "#686C78"
  popup-btn-cancel-hover-color: "#474A52"
  popup-btn-cancel-bg: "#FFFFFF"
  popup-btn-cancel-bg-hover: "#F6F6F9"
  scrollbar: "#E7E8EA"
  scrollbar-hover: "#D7D8DC"
  top-app-bar: "#D7D8DC"
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

Publii is a desktop static-site CMS. Its application renderer uses system typography, a blue action accent, neutral work surfaces, persistent site context, and light and dark color schemes. The production appearance represented by this document is the normative baseline while the design system is reorganized.

This contract covers the application workspace and the shared visual roles consumed by its editors. Editor layouts and editor component contracts remain outside the current component-normalization scope.

## Colors

The blue scale supplies application identity and interactive emphasis. Neutral scales supply work surfaces, text, borders, controls, and collections. Shared semantic roles remain the governing interface between these palettes and components. `primary` is the canonical brand-action role; `color-primary` remains its source-compatible alias during migration.

Status roles use `color-danger`, `color-success`, and `color-warning`. Highlight surfaces remain independent from warning states so content emphasis does not inherit status semantics.

Static black and white channels compose alpha colors such as shadows, scrims, and inverse loading indicators. Opacity is local to the effect; it does not require a separate global token for every alpha value.

An `appAppearance` remaps shared visual roles. A component does not require selector overrides to participate in an application appearance.

## Themes

Use `siteTheme` for themes applied to generated websites. Use `appAppearance` for a named visual preset of the Publii application. Use `colorScheme` for the resolved `light` or `dark` application scheme. `system` is a user preference that resolves `colorScheme`; it is not an appearance or a site theme.

Light and dark share semantic role names and component contracts, not literal color values. The dark scheme is an independently tuned palette with its own contrast, surface, border, hover, and disabled-state relationships. Do not derive it mechanically by darkening, inverting, or changing the opacity of the light scheme.

`app-appearance.js` is the single runtime owner of appearance attributes for the main document and embedded documents. It sets `data-app-appearance` and `data-color-scheme` while retaining `data-theme` for plugin and migration compatibility. Components must not write any of these attributes directly.

The current `default` implementation is the light scheme of the `publii` application appearance. The existing source name remains valid during compatibility migration.

| Token | Default/light | Dark |
| --- | --- | --- |
| `primary` | `#0D8BF2` | `#1089FF` |
| `color-primary` | `#0D8BF2` | `#1089FF` |
| `white` | `#FFFFFF` | `#FFFFFF` |
| `color-danger` | `#EA1A16` | `#FF4A4B` |
| `color-success` | `#40B771` | `#56A900` |
| `color-warning` | `#F2B900` | `#F2B900` |
| `color-highlight-surface` | `#FFF8E1` | `#343540` |
| `overlay` | `rgba(0, 0, 0, 0.35)` | `rgba(28, 29, 35, 0.85)` |
| `bg-primary` | `#FFFFFF` | `#191A1F` |
| `bg-secondary` | `#FFFFFF` | `#202128` |
| `bg-site` | `#F6F6F9` | `#191A1F` |
| `color-surface-subtle` | `#F6F6F9` | `#2A2B34` |
| `color-surface-notice` | `#E7E8EA` | `#393A47` |
| `color-surface-strong` | `#686C78` | `#5D6074` |
| `color-border-subtle` | `#F6F6F9` | `#2A2B34` |
| `color-border-default` | `#D7D8DC` | `#393A47` |
| `color-border-muted` | `#E7E8EA` | `#393A47` |
| `color-border-emphasis` | `#5D616B` | `#A5A7B7` |
| `color-border-strong` | `#686C78` | `#5D6074` |
| `color-text-faint` | `#D7D8DC` | `#393A47` |
| `color-text-subtle` | `#5D616B` | `#A5A7B7` |
| `color-text-muted` | `#686C78` | `#5D6074` |
| `color-icon-faint` | `#F6F6F9` | `#2A2B34` |
| `color-icon-muted` | `#686C78` | `#5D6074` |
| `color-control-surface-hover` | `#E7E8EA` | `#393A47` |
| `color-control-border-hover` | `#5D616B` | `#A5A7B7` |
| `border-light-color` | `#E7E8EA` | `#2A2B34` |
| `text-primary-color` | `#313339` | `#A5A7B7` |
| `text-light-color` | `#686C78` | `#8C8EA3` |
| `text-lightest-color` | `#767B88` | `#5D6074` |
| `headings-color` | `#02192B` | `#F2F2F5` |
| `label-color` | `#02192B` | `#BFC0CC` |
| `link-primary-color` | `#0A6ABA` | `#42A0FF` |
| `link-primary-color-hover` | `#02192B` | `#D9D9E0` |
| `link-invert-color` | `#0A6ABA` | `#D9D9E0` |
| `link-invert-color-hover` | `#02192B` | `#42A0FF` |
| `icon-primary-color` | `#3C3F46` | `#A5A7B7` |
| `icon-secondary-color` | `#5D616B` | `#8C8EA3` |
| `icon-tertiary-color` | `#3C3F46` | `#D9D9E0` |
| `icon-quaternary-color` | `#84C4F9` | `#72758E` |
| `input-bg` | `#FFFFFF` | `#1C1D23` |
| `input-border-dark` | `#C7C9CE` | `#494B5B` |
| `input-bg-light` | `#F6F6F9` | `#2A2B34` |
| `input-bg-lightest` | `#FFFFFF` | `#25262E` |
| `input-border-color` | `#D7D8DC` | `#393A47` |
| `input-border-focus` | `#0D8BF2` | `#1089FF` |
| `button-primary-bg` | `#0D8BF2` | `#1089FF` |
| `button-primary-bg-hover` | `#0B7BD6` | `#0079F2` |
| `button-secondary-bg` | `#D8ECFD` | `#004080` |
| `button-secondary-bg-hover` | `#C7E4FC` | `#004E9C` |
| `button-secondary-color` | `#0A6ABA` | `#8DC6FF` |
| `button-secondary-color-hover` | `#085A9D` | `#C0DFFF` |
| `button-danger-bg` | `#EA1A16` | `#ED0001` |
| `button-danger-bg-hover` | `#CD1613` | `#A90001` |
| `collection-bg` | `#FFFFFF` | `#1C1D23` |
| `collection-bg-hover` | `#F4FAFE` | `#202128` |
| `sidebar-bg-top` | `#0B7BD6` | `#16161B` |
| `sidebar-bg-bottom` | `#0D8BF2` | `#191A1F` |
| `sidebar-link-color` | `#FFFFFF` | `#BFC0CC` |
| `sidebar-link-color-hover` | `#FFFFFF` | `#D9D9E0` |
| `sidebar-link-color-active` | `#FFFFFF` | `#D9D9E0` |
| `sidebar-link-bg-hover` | `rgba(98, 185, 255, 0.35)` | `#1C1D23` |
| `sidebar-link-bg-active` | `rgba(98, 185, 255, 0.35)` | `#25262E` |
| `sidebar-sync-btn-bg` | `rgba(98, 185, 255, 0.55)` | `#1089FF` |
| `tab-color` | `#02192B` | `#BFC0CC` |
| `tab-color-hover` | `#0A6ABA` | `#D9D9E0` |
| `tab-active-bg` | `#D8ECFD` | `#2A2B34` |
| `tab-active-color` | `#0A6ABA` | `#D9D9E0` |
| `popup-bg` | `#FFFFFF` | `#25262E` |
| `popup-btn-cancel-color` | `#686C78` | `#A5A7B7` |
| `popup-btn-cancel-hover-color` | `#474A52` | `#F2F2F5` |
| `popup-btn-cancel-bg` | `#FFFFFF` | `#25262E` |
| `popup-btn-cancel-bg-hover` | `#F6F6F9` | `#343540` |
| `scrollbar` | `#E7E8EA` | `#2A2B34` |
| `scrollbar-hover` | `#D7D8DC` | `#343541` |
| `top-app-bar` | `#D7D8DC` | `#25262E` |
| `text-selection-color` | `#B6D8FD` | `#94B6DB` |

## Typography

Application chrome and controls use the shared system sans-serif stack. Serif and monospace stacks remain available for content and code contexts owned by the application. Shared UI sizes and the light, regular, medium, semibold, and bold weights form the application typography contract; editor content sizes remain independently owned.

Persisted editor font preferences use the CSS generic families `sans-serif` or `serif`. Editor content can live in documents that do not load the application token sheet, so cross-document font preferences must not depend on application custom properties. The store boundary normalizes legacy token values when configuration is loaded or updated.

## Layout

The primary workspace uses a persistent site sidebar and a separately scrolling content region. Shared layout variables own the application sidebar, content wrapper, top bar, and options-sidebar dimensions.

The compact spacing scale covers the recurring application rhythm: `space-1`, `space-2`, `space-3`, `space-4`, `space-6`, `space-8`, `space-12`, and `space-16`. The numeric suffix is the multiplier of the 0.25rem base unit. Use these tokens for margins, padding, and gaps when the exact value exists in the scale. `space-unit` remains available for proportional calculations; optical corrections and structural dimensions remain local. Do not create a global token for a one-off measurement.

## Elevation & Depth

Hierarchy relies primarily on surface contrast and borders. The shared `shadow-sm` and `shadow-md` roles are reserved for raised controls, panels, and overlays; `shadow-list-hover` owns the common hover elevation of installable-item lists, and `shadow-color` supports composed editor shadows. Unique popup and feedback effects remain locally owned rather than expanding the global elevation scale.

Viewport-level stacking follows the shared order from panel and editor help through overlay, editor toolbar, popup, toast, dialog, and alert. Numeric `z-index` values remain valid only for local sibling ordering inside a component-owned stacking context.

## Shapes

The shared base corner radius governs rectangular controls and containers. Circular controls and fully rounded search fields remain component-specific shapes.

## Components

Buttons separate `intent`, `appearance`, `size`, `width`, and `layout`. Loading, active, disabled, square, back, and icon-only states are independent booleans; leading-icon layout is derived from the `icon` prop. Callers must not encode multiple concerns in a space-delimited variant string.

Inputs use the shared input background, border, focus, text, disabled, readonly, and validation roles. `TextInput` separates native input type, visual size, and keyboard blocking; these concerns must not share a string-based property. `Dropdown`, `RadioButton`, and `Switcher` each have one value contract through `value`/`v-model`; initial-state aliases such as `selected` and `checked` are not part of those contracts. The list-selection `Checkbox` remains a controlled primitive with explicit `checked`, item `value`, and callback props. `customCssClasses` is retained only as a schema-driven extension point for theme and plugin settings. `Field` accepts `normal` or `small` spacing while label layout states remain independent booleans. `ImageUpload` exposes `default` and `small` through its size contract. `ButtonDropdown` uses an explicit intent and derives icon layout from its icon prop. `ProgressBar` uses semantic `default`, `success`, `danger`, and `warning` intents rather than color names. `Overlay` uses `default` or `drop-zone` appearance rather than color-named booleans. `Icon` uses its existing named size set and the `nonInteractive` boolean; pointer behavior must not be encoded in a string of properties. Its custom-class extension remains available for controlled file-type classes. `Collection` receives its column count explicitly; `CollectionCell` uses a validated visual `variant`, while row states such as the main author are booleans. Collections use their shared background and hover roles with the common border role. `Tabs` uses an explicit `vertical` or `horizontal` orientation and an independent `scrollable` capability, together with the shared text, hover, active-background, and active-text roles.

The sidebar is the principal branded application surface. Its existing gradient, inverse content, site context, preview action, and synchronization action remain part of the Publii application appearance.

## Automated Governance

Run `npm run audit:design-system` before merging renderer styling changes. The audit must keep global custom-property references resolved, reject unused or legacy global tokens, enforce the shared semantic contract across light and dark color schemes, prevent new literal colors from entering application-owned styles, require canonical spacing and typography values to use their shared tokens, and reject retired shared-component props.

The color-literal baseline records existing local exceptions without promoting them to design tokens. Fixed file-type colors, transparency artwork, and other genuinely local technical colors may remain component-owned. Reducing that baseline is allowed; increasing it requires replacing the literal with an existing semantic role or explicitly revising the design-system contract. Vendor assets, schema color data, brand artwork, and editor-owned styles are excluded until their respective migration phases.

The regular `npm test` command runs the design-system audit before the backend test suite. A production renderer build remains the final structural verification for changes to shared tokens or primitives.

## Do's and Don'ts

- Do preserve the current rendered appearance during design-system foundation work.
- Do use `siteTheme`, `appAppearance`, and `colorScheme` as separate concepts.
- Do remove an internal legacy token when every in-repository consumer can migrate atomically; reserve compatibility aliases for public or staged APIs.
- Do add a global token only for a semantic role shared across components, a value that changes by application appearance, or an established foundation used repeatedly.
- Do keep editor-specific layouts and editor-owned component contracts outside the current normalization scope while routing shared tokens through editor chrome.
- Do migrate schema-driven component options such as separator sizing through an explicit settings-schema version; keep their current compatibility contract until that migration is atomic for themes and plugins.
- Do use shared layer roles for viewport-level surfaces and local numeric stacking only inside component-owned contexts.
- Do configure buttons through their explicit intent, appearance, size, width, layout, and state props.
- Don't call an application appearance a theme or template.
- Don't make an application appearance depend on internal component selectors when a shared visual role exists.
- Don't replace a shared visual role with a local literal value during compatibility migration.
- Don't mirror every local measurement, shadow, or one-off color as a new global token; keep component-owned values local until they acquire a shared semantic role.
