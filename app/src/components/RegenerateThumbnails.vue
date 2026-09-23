<template>
    <section class="content">
        <div class="regenerate-thumbnails">
            <p-header :title="$t('tools.thumbnails.regenerateThumbnails')">
                <p-button
                    :onClick="goBack"
                    slot="buttons"
                    appearance="clean"
                    back>
                    {{ $t('ui.backToTools') }}
                </p-button>

                <p-button
                    v-if="actions.canStart || actions.isRunning"
                    ref="startButton"
                    slot="buttons"
                    :onClick="start"
                    :disabled="actions.isRunning"
                    intent="primary"
                    icon="regenerate">
                    {{ $t(actions.isCancelled ? 'tools.thumbnails.regenerateAgain' : 'tools.thumbnails.regenerate') }}
                </p-button>
            </p-header>

            <thumbnails-regeneration-panel @actions-change="setActions">
                <template #cancel>
                    <p-button
                        v-if="actions.isRunning"
                        ref="stopButton"
                        :onClick="stop"
                        appearance="clean-muted"
                        size="small">
                        {{ $t('ui.cancel') }}
                    </p-button>
                </template>
            </thumbnails-regeneration-panel>
        </div>
    </section>
</template>

<script>
import BackToTools from './mixins/BackToTools.js';
import ThumbnailsRegenerationPanel from './ThumbnailsRegenerationPanel.vue';
import { getThumbnailsRegeneration } from '../helpers/thumbnails-regeneration';

export default {
    name: 'regenerate-thumbnails',
    mixins: [
        BackToTools
    ],
    components: {
        'thumbnails-regeneration-panel': ThumbnailsRegenerationPanel
    },
    data () {
        return {
            actions: {
                canStart: false,
                isRunning: false,
                isCancelled: false
            }
        };
    },
    methods: {
        setActions (actions) {
            let buttonHadFocus = this.buttonHasFocus();
            let runningChanged = actions.isRunning !== this.actions.isRunning;

            this.actions = actions;

            // Move focus to Cancel when Start becomes disabled, and back when the run ends.
            if (!buttonHadFocus || !runningChanged) {
                return;
            }

            this.$nextTick(() => {
                let button = actions.isRunning ? this.$refs.stopButton : this.$refs.startButton;

                if (button && button.$el) {
                    button.$el.focus();
                }
            });
        },
        buttonHasFocus () {
            let buttons = [this.$refs.stopButton, this.$refs.startButton];

            return buttons.some(button => button && button.$el === document.activeElement);
        },
        start () {
            getThumbnailsRegeneration(this.$store).start(this.$store.state.currentSite.config.name);
        },
        stop () {
            getThumbnailsRegeneration(this.$store).stop();
        }
    }
}
</script>

<style scoped>
.regenerate-thumbnails {
    margin: 0 auto;
    max-width: var(--wrapper-width);
}

.regenerate-thumbnails::v-deep .heading {
    flex-wrap: wrap;
    row-gap: var(--space-4);
}
</style>
