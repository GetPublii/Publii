<template>
    <div class="overlay">
        <div
            ref="dialog"
            class="popup plugin-details"
            role="dialog"
            aria-modal="true"
            :aria-labelledby="'plugin-details-title-' + _uid"
            tabindex="-1"
            @keydown.stop="onKeydown">
            <div class="details-content">
                <h2 :id="'plugin-details-title-' + _uid">{{ plugin.name }}</h2>
                <p class="description">{{ plugin.description || $t('tools.list.noDescription') }}</p>
                <dl>
                    <template v-if="plugin.author">
                        <dt>{{ $t('author.author') }}</dt>
                        <dd>{{ plugin.author }}</dd>
                    </template>
                    <dt>{{ $t('tools.list.version') }}</dt>
                    <dd>{{ plugin.version }}</dd>
                    <dt>{{ $t('tools.list.requiredVersion') }}</dt>
                    <dd>{{ plugin.minimumPubliiVersion }}</dd>
                    <dt>{{ $t('tools.list.siteStatus') }}</dt>
                    <dd>{{ $t(!plugin.stateKnown ? 'tools.list.unknownState' : plugin.enabled ? 'tools.list.enabled' : 'tools.list.disabled') }}</dd>
                </dl>
                <p v-if="plugin.incompatible" class="notice">
                    {{ $t('tools.list.requiresVersion', { version: plugin.minimumPubliiVersion }) }}
                </p>
                <p v-if="plugin.hasUpdate">
                    <span class="extension-notice-badge is-update">
                        {{ $t('tools.list.updateVersion', { version: plugin.updateVersion }) }}
                    </span>
                </p>
                <p v-if="plugin.isDiscontinued">
                    <span class="extension-notice-badge is-discontinued">
                        <span aria-hidden="true">!</span>
                        {{ $t('tools.list.discontinued') }}
                    </span>
                    <span
                        v-if="plugin.discontinuedText"
                        class="notice-description">
                        {{ plugin.discontinuedText }}
                    </span>
                </p>
                <p v-if="!plugin.hasSettings">{{ $t('toolsPlugin.thisPluginHasNoOptions') }}</p>
                <div class="details-links">
                    <a
                        v-for="link in links"
                        :key="link.url"
                        :href="link.url"
                        @click.prevent="openLink(link.url)">{{ link.label }}</a>
                </div>
            </div>
            <div class="buttons">
                <p-button
                    v-if="plugin.stateKnown && !plugin.incompatible && (plugin.enabled ? plugin.hasSettings : true)"
                    :onClick="() => $emit(plugin.enabled ? 'settings' : 'enable')"
                    size="medium"
                    width="half"
                    square>
                    {{ $t(plugin.enabled ? 'tools.list.settings' : 'tools.list.enable') }}
                </p-button>
                <p-button
                    ref="close"
                    :onClick="() => $emit('close')"
                    appearance="popup-cancel"
                    size="medium"
                    :width="plugin.stateKnown && !plugin.incompatible && (plugin.enabled ? plugin.hasSettings : true) ? 'half' : 'full'"
                    square>
                    {{ $t('ui.close') }}
                </p-button>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'tools-plugin-details',
    props: {
        plugin: {
            type: Object,
            required: true
        }
    },
    computed: {
        links () {
            return [
                { url: this.plugin.releaseNotes, label: this.$t('tools.list.releaseNotes') },
                { url: this.plugin.download, label: this.$t('tools.list.downloadUpdate') }
            ].filter(link => link.url);
        }
    },
    mounted () {
        this.$nextTick(() => this.$refs.dialog.focus({ preventScroll: true }));
    },
    methods: {
        openLink (url) {
            mainProcessAPI.shellOpenExternal(url);
        },
        onKeydown (event) {
            if (event.isComposing) {
                return;
            }

            if (event.key === 'Escape') {
                event.preventDefault();
                this.$emit('close');
                return;
            }

            if (event.key !== 'Tab') {
                return;
            }

            const dialog = this.$refs.dialog;
            const controls = dialog.querySelectorAll('a[href], button:not([disabled])');
            const first = controls[0];
            const last = controls[controls.length - 1];

            if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }
    }
};
</script>

<style scoped>
@import '../css/popup-common.css';
@import '../css/extension-notice-badges.css';

.plugin-details {
    display: flex;
    flex-direction: column;
    max-height: calc(100% - var(--space-16));
    max-width: calc(100% - var(--space-16));
    width: 60rem;
}

.details-content {
    overflow-y: auto;
    overflow-wrap: anywhere;
    padding: var(--space-12);
    text-align: left;
    user-select: text;
}

h2 {
    margin: 0 0 var(--space-6);
    text-align: left;
}

.description {
    white-space: pre-line;
}

dl {
    display: grid;
    gap: var(--space-3) var(--space-6);
    grid-template-columns: auto minmax(0, 1fr);
    margin: var(--space-8) 0;
}

dt {
    color: var(--text-light-color);
}

dd {
    margin: 0;
}

.notice {
    color: var(--text-light-color);
    font-size: var(--font-size-ui-xs);
}

.extension-notice-badge {
    max-width: 100%;
}

.notice-description {
    color: var(--text-light-color);
    display: block;
    margin-top: var(--space-2);
}

.details-links {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-6);
}

.buttons {
    display: flex;
    flex-shrink: 0;
}

.buttons .button {
    min-width: 0;
    white-space: normal;
}

.details-links a:focus-visible,
.plugin-details:focus-visible {
    outline: 2px solid var(--input-border-focus);
    outline-offset: 2px;
}
</style>
