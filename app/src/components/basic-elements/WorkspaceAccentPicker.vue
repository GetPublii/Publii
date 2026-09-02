<template>
    <div
        class="workspace-accent-picker"
        role="radiogroup"
        :aria-labelledby="labelledBy || null">
        <label
            v-for="accent in accentOptions"
            :key="accent.value"
            class="workspace-accent-option"
            :data-workspace-accent-preview="accent.value"
            :for="inputID(accent.value)"
            :title="accent.label">
            <input
                :id="inputID(accent.value)"
                type="radio"
                :name="resolvedGroupName"
                :value="accent.value"
                :checked="value === accent.value"
                @change="$emit('input', accent.value)" />
            <span
                class="workspace-accent-swatch"
                aria-hidden="true">
                <svg
                    class="workspace-accent-check"
                    viewBox="0 0 16 16">
                    <path d="M3.5 8.25 6.6 11.2 12.5 4.9" />
                </svg>
            </span>
            <span class="workspace-accent-label">
                {{ accent.label }}
            </span>
        </label>
    </div>
</template>

<script>
import {
    DEFAULT_WORKSPACE_ACCENT,
    getSupportedWorkspaceAccents
} from './../../helpers/app-appearance.js';

export default {
    name: 'workspace-accent-picker',
    props: {
        groupName: {
            default: '',
            type: String
        },
        idPrefix: {
            default: 'workspace-accent',
            type: String
        },
        labelledBy: {
            default: '',
            type: String
        },
        value: {
            default: DEFAULT_WORKSPACE_ACCENT,
            type: String
        }
    },
    computed: {
        accentOptions () {
            let labels = {
                default: this.$t('settings.workspaceAccentDefault'),
                indigo: this.$t('settings.workspaceAccentIndigo'),
                violet: this.$t('settings.workspaceAccentViolet'),
                magenta: this.$t('settings.workspaceAccentMagenta'),
                crimson: this.$t('settings.workspaceAccentCrimson'),
                rose: this.$t('settings.workspaceAccentRose'),
                orange: this.$t('settings.workspaceAccentOrange'),
                emerald: this.$t('settings.workspaceAccentEmerald'),
                petrol: this.$t('settings.workspaceAccentPetrol'),
                graphite: this.$t('settings.workspaceAccentGraphite'),
                navy: this.$t('settings.workspaceAccentNavy'),
                midnight: this.$t('settings.workspaceAccentMidnight')
            };
            let appAppearance = this.$root.getCurrentAppAppearance();

            return getSupportedWorkspaceAccents(appAppearance).map(value => ({
                label: labels[value] || value,
                value
            }));
        },
        resolvedGroupName () {
            return this.groupName || `${this.idPrefix}-${this._uid}`;
        }
    },
    methods: {
        inputID (value) {
            return `${this.idPrefix}-${value}`;
        }
    }
}
</script>

<style scoped>

.workspace-accent-picker {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
    padding-top: var(--space-1);
}

.workspace-accent-option {
    align-items: center;
    cursor: pointer;
    display: inline-flex;
    height: 4rem;
    justify-content: center;
    width: 4rem;

    &:hover .workspace-accent-swatch {
        box-shadow:
            0 0 0 2px var(--bg-primary),
            0 0 0 4px var(--input-border-color);
    }

    input {
        clip: rect(0 0 0 0);
        clip-path: inset(50%);
        height: 1px;
        overflow: hidden;
        position: absolute;
        white-space: nowrap;
        width: 1px;

        &:checked + .workspace-accent-swatch {
            box-shadow:
                0 0 0 2px var(--bg-primary),
                0 0 0 4px var(--color-primary);

            .workspace-accent-check {
                opacity: 1;
            }
        }

        &:focus-visible + .workspace-accent-swatch {
            outline: 2px solid var(--text-primary-color);
            outline-offset: 5px;
        }
    }
}

.workspace-accent-swatch {
    align-items: center;
    background: var(--workspace-accent-preview);
    border-radius: 50%;
    display: inline-flex;
    height: 2.6rem;
    justify-content: center;
    transition: var(--transition-default);
    width: 2.6rem;
}

.workspace-accent-check {
    color: var(--workspace-accent-preview-check);
    fill: none;
    height: 1.7rem;
    opacity: 0;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 2.25;
    width: 1.7rem;
}

.workspace-accent-label {
    clip: rect(0 0 0 0);
    clip-path: inset(50%);
    height: 1px;
    overflow: hidden;
    position: absolute;
    white-space: nowrap;
    width: 1px;
}
</style>
