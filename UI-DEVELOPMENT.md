# UI development guide

This is the implementation companion to [DESIGN.md](./DESIGN.md). `DESIGN.md` defines the visual contract and accepted design decisions. This guide explains how to apply that contract in Vue templates and application-owned CSS.

The current normalization covers the main application renderer and shared visual roles used by editor chrome. Editor-owned layouts, block editor internals, vendor styles, generated-site themes, and external plugin styles are separate scopes.

## Sources of truth

| Concern | Source |
| --- | --- |
| Visual rules and accepted design decisions | [`DESIGN.md`](./DESIGN.md) |
| CSS tokens and light/dark values | [`app/src/css/css-variables.css`](./app/src/css/css-variables.css) |
| Shared component implementations and prop validators | [`app/src/components/basic-elements/`](./app/src/components/basic-elements/) |
| Globally registered component names | [`app/src/main.js`](./app/src/main.js) |
| Application appearance runtime | [`app/src/helpers/app-appearance.js`](./app/src/helpers/app-appearance.js) |
| Automated contract checks | [`build/scripts/audit-design-system.js`](./build/scripts/audit-design-system.js) |
| Approved local color exceptions | [`build/scripts/design-system-baseline.json`](./build/scripts/design-system-baseline.json) |

When this guide and a component disagree, treat the component's validated props as the executable API and update this guide in the same change. A visual-contract change must also update `DESIGN.md`.

## Working rules

1. Reuse a shared component before adding view-local controls or classes.
2. Express component meaning through props. Do not pass space-delimited class names as a variant API.
3. Use semantic CSS tokens in components. Do not consume private `--palette-*` variables outside `css-variables.css`.
4. Preserve the same semantic token names in light and dark schemes. Each scheme owns its literal values.
5. Keep one-off optical corrections and structural dimensions local. Do not create a global token for every number.
6. Do not change `data-theme`, `data-app-appearance`, or `data-color-scheme` directly from a component.
7. Run the design-system audit before committing renderer UI changes.

## Using CSS tokens

All application tokens are defined in `app/src/css/css-variables.css` and loaded globally by `App.vue`. Scoped component styles can use them directly.

### Colors

Choose a token by its role, not by its current color:

```css
.panel {
    background: var(--bg-secondary);
    border: 1px solid var(--color-border-default);
    color: var(--text-primary-color);
}

.panel-note {
    color: var(--text-light-color);
}

.panel-link {
    color: var(--link-primary-color);
}

.panel-error {
    color: var(--color-danger);
}
```

Common families are:

| Need | Token family |
| --- | --- |
| Page and panel surfaces | `--bg-*`, `--color-surface-*` |
| Text and headings | `--text-*`, `--headings-color`, `--label-color` |
| Borders | `--color-border-*`, `--border-light-color` |
| Links | `--link-*` |
| Icons | `--icon-*-color`, `--color-icon-*` |
| Form controls | `--input-*` |
| Buttons | `--button-*` |
| Status | `--color-danger`, `--color-success`, `--color-warning` |
| Collections | `--collection-*` |
| Sidebar, tabs, popups | their named component-role tokens |

For transparency, derive the alpha color from the existing semantic color with relative OKLCH syntax:

```css
background: oklch(from var(--color-primary) l c h / 17%);
box-shadow: 0 2px 6px oklch(from var(--black) l c h / 15%);
```

Do not introduce separate `*-rgb` channel tokens for alpha composition.

Private `--palette-brand-*` and `--palette-neutral-*` values are authored in OKLCH. Do not use them in a component; they are private inputs to semantic roles and may change when an application appearance is retuned.

Before adding a color token:

1. Check whether an existing semantic role describes the use.
2. Add a new global role only when it is shared, changes with application appearance, or is an established reusable foundation.
3. Define the role in both the light and dark scheme blocks.
4. Consume the semantic role from components; keep palette variables private.
5. Update `DESIGN.md` when the new role changes the visual contract.
6. Run `npm run audit:design-system`.

Do not make the audit pass by casually increasing the color-literal baseline. That file records accepted existing debt, not a list of colors available for new UI.

### Spacing

Use the shared spacing scale for `margin`, `padding`, and `gap` when the exact value exists:

| Token | Value |
| --- | --- |
| `--space-1` | `0.25rem` |
| `--space-2` | `0.5rem` |
| `--space-3` | `0.75rem` |
| `--space-4` | `1rem` |
| `--space-6` | `1.5rem` |
| `--space-8` | `2rem` |
| `--space-12` | `3rem` |
| `--space-16` | `4rem` |

```css
.toolbar {
    display: flex;
    gap: var(--space-4);
    margin-bottom: var(--space-8);
    padding: var(--space-6) var(--space-8);
}
```

`--space-unit` is available for proportional calculations. A value such as `1.3rem` may remain local when it is an intentional optical correction and changing it would alter the current layout. Heights, widths, offsets, icon dimensions, and similar structural measurements do not become spacing tokens merely because their value also exists in the spacing scale.

### Typography

Use the shared UI typography tokens:

```css
.metadata {
    font-family: var(--font-family-sans);
    font-size: var(--font-size-ui-sm);
    font-weight: var(--font-weight-regular);
    line-height: var(--line-height-base);
}
```

Available UI sizes are `--font-size-ui-xs`, `--font-size-ui-sm`, `--font-size-ui-md`, `--font-size-ui-lg`, and `--font-size-ui-xl`. Available weights are `--font-weight-light`, `--font-weight-regular`, `--font-weight-medium`, `--font-weight-semibold`, and `--font-weight-bold`.

Use `--font-family-serif` and `--font-family-mono` only when the content role requires them. Persisted editor font preferences use the generic values `sans-serif` and `serif` because editor documents may not load the application token sheet.

### Shape, depth, motion, and layers

Use `--radius-base` for ordinary rectangular controls and containers. Circles and fully rounded controls may keep a component-owned radius.

Use `--shadow-sm`, `--shadow-md`, and `--shadow-list-hover` for their documented elevation roles. Keep a unique effect local rather than adding a global shadow token without a shared role.

Use `--transition-default` for the standard UI transition. Use the named `--layer-*` tokens for viewport-level surfaces. Numeric `z-index` values are allowed only for local sibling ordering inside a component-owned stacking context.

## Application appearances

These names are not interchangeable:

| Name | Meaning |
| --- | --- |
| `siteTheme` | Theme used by a generated website |
| `appAppearance` | Named visual preset of the Publii application |
| `colorScheme` | Resolved `light` or `dark` application scheme |
| `system` | User preference that resolves to a color scheme |

Use `applyAppAppearance` from `app/src/helpers/app-appearance.js` when runtime appearance attributes must be applied. `data-theme` remains a compatibility attribute; new components must not treat it as the owner of application appearance.

## Shared components

The basic elements registered in `app/src/main.js` are globally available in Vue templates. Do not import them again into individual view components. Functional props such as callbacks and data remain documented by each component; the table below lists the normalized visual contracts.

| Component | Current visual contract |
| --- | --- |
| `p-button` | `intent`, `appearance`, `size`, `width`, `layout`; independent state booleans |
| `btn-dropdown` | `intent="default|primary"`, `button-icon`, `preview-icon`, `is-reversed`, `disabled` |
| `text-input` | native `type`; visual `size="default|small"`; `keyboard-blocked` boolean |
| `field` | `spacing="normal|small"`; independent label-layout booleans |
| `image-upload` | `size="default|small"` |
| `progress-bar` | `intent="default|success|danger|warning"` |
| `overlay` | `appearance="default|drop-zone"` |
| `icon` | named `size`; `non-interactive` boolean; controlled custom classes when required |
| `collection` | numeric `columns` |
| `collection-cell` | `variant="titles|assignment|publish-dates|modification-dates|authors|actions"` |
| `collection-row` | semantic row states such as `main-author` |
| `tabs` | `orientation="vertical|horizontal"`; independent `scrollable` boolean |

The prop validators in the component files are the complete accepted-value lists.

### Buttons

Button concerns are independent:

| Concern | Prop | Accepted values |
| --- | --- | --- |
| Meaning | `intent` | `default`, `primary`, `danger`, `success` |
| Presentation | `appearance` | `default`, `secondary`, `outline`, `popup-cancel`, `clean`, `clean-inverse`, `light` |
| Size | `size` | `default`, `small`, `medium` |
| Width | `width` | `auto`, `quarter`, `half`, `full` |
| Layout | `layout` | `inline`, `bottom` |
| Icon treatment | `icon`, `icon-only`, `icon-tone` | `icon-tone`: `default`, `primary` |
| State | booleans | `active`, `back`, `disabled`, `disabled-with-events`, `loading`, `square` |

Do not rebuild the old space-delimited `type` API:

```vue
<!-- Correct -->
<p-button
    :onClick="createBackup"
    intent="primary"
    icon="plus"
    :disabled="operationInProgress"
    :loading="operationInProgress">
    {{ $t('file.createBackup') }}
</p-button>
```

The `icon` prop automatically enables leading-icon layout. Do not pass a separate `icon` class or state. `disabled` controls availability; `loading` controls the preloader. Dynamic state belongs in the relevant boolean prop rather than in a conditional variant string.

### Form values

`dropdown`, `radio-buttons`, and `switcher` use `value` through `v-model` as their single value contract:

```vue
<dropdown
    v-model="selectedProvider"
    :items="providers" />

<radio-buttons
    v-model="importType"
    name="import-type"
    :items="importTypes" />

<switcher v-model="enabled" />
```

Do not use the retired `selected` or `checked` initialization aliases on these components.

`checkbox` is intentionally different. It is a controlled list-selection primitive and still uses `checked`, `value`, and `on-click`:

```vue
<checkbox
    :value="item.id"
    :checked="isChecked(item.id)"
    :onClick="toggleItem" />
```

`customCssClasses` remains available only where schema-driven theme or plugin settings require an extension point. Do not use it as the normal way to create component variants.

### Collections

The parent supplies the column count, cells supply validated visual roles, and rows expose semantic states:

```vue
<collection :columns="4">
    <collection-row
        v-for="item in items"
        :key="item.id"
        slot="content"
        :main-author="item.id === 1">
        <collection-cell variant="titles">
            {{ item.name }}
        </collection-cell>
    </collection-row>
</collection>
```

For the main author, `:main-author="true"` causes `CollectionRow` to apply its internal `is-main-author` class. The consumer expresses the semantic state; the shared component owns the CSS class.

## Legacy-to-current migration reference

Do not introduce the legacy forms in new code. The automated audit rejects the retired component props.

| Legacy API | Current API |
| --- | --- |
| `p-button type="primary"` | `intent="primary"` |
| `p-button type="green|success"` | `intent="success"` |
| `p-button type="danger|error|delete"` | `intent="danger"` |
| `p-button type="secondary"` | `appearance="secondary"` |
| `p-button type="outline"` | `appearance="outline"` |
| `p-button type="cancel-popup"` | `appearance="popup-cancel"` |
| `p-button type="clean"` | `appearance="clean"` |
| `p-button type="clean-invert"` | `appearance="clean-inverse"` |
| `p-button type="light"` | `appearance="light"` |
| `p-button type="small|medium"` | `size="small|medium"` |
| `quarter-width`, `half-width`, `full-width` in button `type` | `width="quarter|half|full"` |
| `bottom` in button `type` | `layout="bottom"` |
| `preloader` in button `type` | `:loading="condition"` |
| `disabled`, `disabled-with-events`, `active`, `back` in button `type` | corresponding boolean prop |
| `no-border-radius` in button `type` | `square` boolean prop |
| `icon` in button `type` | derived from the `icon` prop |
| `only-icon` in button `type` | `icon-only` boolean prop |
| `only-icon-color` in button `type` | `icon-only` plus `icon-tone="primary"` |
| `btn-dropdown buttonColor="green"` | `intent="primary"` |
| `btn-dropdown type="is-reversed"` | `is-reversed` boolean prop |
| `text-input properties="is-small"` | `size="small"` |
| `text-input properties="keyboard-blocked"` | `keyboard-blocked` boolean prop |
| `image-upload type="small"` | `size="small"` |
| `icon properties="not-clickable"` | `non-interactive` boolean prop |
| `collection itemsCount` | `columns` |
| `collection formIsOpened` | removed; the unused collection-level layout state has no replacement |
| `collection-cell type` | `variant` |
| `collection-row cssClasses` | a named semantic state prop, currently `main-author` |
| `dropdown selected` | `v-model` / `value` |
| `radio-buttons selected` | `v-model` / `value` |
| `switcher checked` | `v-model` / `value` |
| `tabs isHorizontal` | `orientation="horizontal"` |
| `tabs isScrollable` | `scrollable` boolean prop |
| `overlay hasBorder` plus `isBlue` | `appearance="drop-zone"` |
| `progress-bar color="blue|green|red|orange"` | `intent="default|success|danger|warning"` |
| `progress-bar stopped` | removed; it produced no visual behavior |
| `fields-group type="danger"` | removed unused variant; use an explicit status component when status communication is required |

`separator type` is a deliberate temporary exception because its values can come from persisted theme and plugin settings schemas. Do not copy that string-based API into other components. Its normalization requires a versioned schema migration across every owner.

## Scope boundaries

- Application design tokens belong to the Publii renderer. Generated-site themes must use their own theme contracts.
- External plugin option styles are not automatically governed by the application token file.
- Editor-owned CSS under `app/src/css/editor/`, block editor internals, post editor internals, and vendor CSS remain outside the completed component-normalization phase.
- Shared editor chrome may consume application semantic tokens, but editor content typography and layout remain independently owned.
- Keep Electron's renderer security boundary unchanged. UI work must not enable Node integration or bypass the preload bridge.

## Extending the system

Extend an existing primitive when the new behavior has the same semantic role. Add a new component under `app/src/components/basic-elements/` only when it represents a reusable UI contract; keep screen-specific composition with its owning view.

A shared component must:

- expose separate, typed props for meaning, appearance, size, layout, and state when those concerns apply;
- validate every string enum;
- own its internal CSS classes instead of asking consumers to construct them;
- use semantic tokens and support both color schemes without view-level theme overrides;
- preserve `v-model` conventions for value controls;
- be registered in `app/src/main.js` only when it is intended to be globally available;
- update this guide when it adds or changes a public visual contract.

Do not add a compatibility prop unless external or persisted data prevents an atomic migration. Document the owner and removal condition for every compatibility exception.

## Verification

Run these checks from the repository root:

```bash
npm run audit:design-system
npm test
npm run prod
```

Use them proportionally:

- Run `npm run audit:design-system` for every renderer styling or shared-component change.
- Run `npm test` before merging; it includes the design-system audit and backend tests.
- Run `npm run prod` after changing shared tokens, primitives, application appearance behavior, or webpack-visible style imports.
- Perform runtime QA in light and dark schemes when a change affects a shared visual role or component.

Before opening a pull request, confirm that:

- the UI uses an existing shared component where appropriate;
- new component behavior is represented by typed props rather than class strings;
- component CSS uses semantic roles rather than palette values or new literals;
- light and dark schemes define the same shared semantic roles;
- spacing and typography use canonical tokens where their exact values apply;
- `DESIGN.md` and this guide were updated when their public contracts changed;
- the design-system audit passes.
