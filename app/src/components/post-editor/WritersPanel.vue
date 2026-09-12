<template>
    <div class="post-editor-stats">
        <section
            v-if="isOpen"
            id="post-editor-stats-popover"
            ref="popover"
            class="post-editor-stats-popover"
            role="dialog"
            aria-labelledby="post-editor-stats-heading"
            tabindex="-1">
            <h2 id="post-editor-stats-heading">{{ $t('editor.statistics') }}</h2>

            <dl>
                <dt>
                    <icon
                        name="whole-word"
                        size="xs"
                        aria-hidden="true"
                        focusable="false"
                        non-interactive />
                    <span>{{ $t('post.words') }}</span>
                </dt>
                <dd id="counter-words">{{ words }}</dd>
                <dt>
                    <icon
                        name="whole-word"
                        size="xs"
                        aria-hidden="true"
                        focusable="false"
                        non-interactive />
                    <span>{{ $t('post.uniqueWords') }}</span>
                </dt>
                <dd id="counter-unique-words">{{ uniqueWords }}</dd>
                <dt>
                    <icon
                        name="type"
                        size="xs"
                        aria-hidden="true"
                        focusable="false"
                        non-interactive />
                    <span>{{ $t('post.characters') }}</span>
                </dt>
                <dd id="counter-characters">{{ characters }}</dd>
                <dt>
                    <icon
                        name="type"
                        size="xs"
                        aria-hidden="true"
                        focusable="false"
                        non-interactive />
                    <span>{{ $t('post.charactersWithoutSpaces') }}</span>
                </dt>
                <dd id="counter-characters-without-spaces">{{ charactersWithoutSpaces }}</dd>
                <dt>
                    <icon
                        name="text-align-start"
                        size="xs"
                        aria-hidden="true"
                        focusable="false"
                        non-interactive />
                    <span>{{ $t('post.sentences') }}</span>
                </dt>
                <dd id="counter-sentences">{{ sentences }}</dd>
                <dt>
                    <icon
                        name="pilcrow"
                        size="xs"
                        aria-hidden="true"
                        focusable="false"
                        non-interactive />
                    <span>{{ $t('post.paragraphs') }}</span>
                </dt>
                <dd id="counter-paragraphs">{{ paragraphs }}</dd>
                <dt>
                    <icon
                        name="clock"
                        size="xs"
                        aria-hidden="true"
                        focusable="false"
                        non-interactive />
                    <span>{{ $t('post.readingTime') }}</span>
                </dt>
                <dd id="counter-reading-time">
                    <span v-pure-html="readingTime"></span>
                    {{ $t('post.min') }}
                </dd>
            </dl>
        </section>

        <p-button
            id="post-stats-button"
            ref="trigger"
            appearance="clean-inverse"
            size="small"
            icon="stats"
            icon-only
            :icon-tone="isOpen ? 'primary' : 'default'"
            v-tooltip="{ text: statsToggleLabel, describe: false }"
            :aria-label="statsToggleLabel"
            :aria-expanded="isOpen ? 'true' : 'false'"
            aria-controls="post-editor-stats-popover"
            aria-haspopup="dialog"
            @click.native="toggle" />
    </div>
</template>

<script>
import strip_tags from './../../helpers/vendor/locutus/strings/strip_tags';
import countTextStatistics from './../../helpers/text-statistics';
import Tooltip from './../../helpers/tooltip';

export default {
    name: 'post-editor-writers-panel',
    directives: {
        tooltip: Tooltip
    },
    data () {
        return {
            isOpen: false,
            words: 0,
            uniqueWords: 0,
            characters: 0,
            charactersWithoutSpaces: 0,
            sentences: 0,
            paragraphs: 0,
            readingTime: 0
        };
    },
    computed: {
        statsToggleLabel () {
            return this.$t(this.isOpen ? 'editor.hideStats' : 'editor.viewStats');
        }
    },
    mounted () {
        this.editorDocument = null;
        this.$bus.$on('writers-panel-refresh', this.refresh);
        this.refresh();
    },
    methods: {
        toggle () {
            if (this.isOpen) {
                this.close();
                return;
            }

            this.isOpen = true;
            this.refresh();

            let iframe = document.getElementById('post-editor_ifr');
            this.editorDocument = iframe ? iframe.contentDocument : null;
            this.setDismissListeners(true);

            this.$nextTick(() => {
                if (this.isOpen) {
                    this.$refs.popover.focus({ preventScroll: true });
                }
            });
        },
        close (restoreFocus = false) {
            if (!this.isOpen) {
                return;
            }

            this.isOpen = false;
            this.setDismissListeners(false);
            this.editorDocument = null;

            if (restoreFocus) {
                this.$refs.trigger.$el.focus({ preventScroll: true });
            }
        },
        setDismissListeners (enabled) {
            let method = enabled ? 'addEventListener' : 'removeEventListener';

            for (let target of [document, this.editorDocument]) {
                if (!target) {
                    continue;
                }

                target[method]('pointerdown', this.handleOutsideInteraction, true);
                target[method]('focusin', this.handleOutsideInteraction, true);
                target[method]('keydown', this.handleKeydown, true);
            }

            window[method]('blur', this.handleWindowBlur);
        },
        handleOutsideInteraction (event) {
            if (!this.$el.contains(event.target)) {
                this.close();
            }
        },
        handleKeydown (event) {
            if (event.key === 'Escape' && !event.isComposing) {
                event.preventDefault();
                event.stopPropagation();
                this.close(true);
            }
        },
        handleWindowBlur () {
            this.close();
        },
        refresh() {
            let iframe = document.getElementById('post-editor_ifr');

            if(!iframe) {
                return false;
            }

            let body = iframe.contentDocument.body;
            let content = body.innerHTML;
            let statistics = countTextStatistics(body.innerText);
            let paragraphs = content.match(/<(p|blockquote|ul|ol|h1|h2|h3|h4|h5|h6|pre).*?>/g);
            let sentencesSource = content.split('</p>').map(sentence => strip_tags(sentence.replace(/&nbsp;/g, ' ').replace(/\s+/g, ' '))).join("\n");
            let sentences = sentencesSource.split(/[\.\?!\n]/).filter(fragment => fragment.trim() !== '');
            let readingTime = Math.floor(statistics.words / 180);
            let readingTimePrefix = '';

            if(statistics.words < 180) {
                readingTimePrefix = '&lt; ';
                readingTime = 1;
            }

            this.uniqueWords = statistics.uniqueWords;
            this.words = statistics.words;
            this.characters = statistics.characters;
            this.charactersWithoutSpaces = statistics.charactersWithoutSpaces;
            this.sentences = sentences.length;
            this.paragraphs = paragraphs ? paragraphs.length : 0;
            this.readingTime = readingTimePrefix + readingTime;
        }
    },
    beforeDestroy () {
        this.close();
        this.$bus.$off('writers-panel-refresh', this.refresh);
    }
};
</script>

<style>
.post-editor-stats {
    bottom: .4rem;
    left: 1.8rem;
    position: absolute;
    z-index: var(--layer-editor-help);

    #post-stats-button {
        background: var(--bg-primary);
        height: 4.4rem;
        padding: 0;
        width: 4.4rem;

        > svg {
            left: 50%;
            transform: translate(-50%, -50%);
        }
    }
}

.post-editor-stats-popover {
    background: var(--popup-bg);
    border: 1px solid var(--border-light-color);
    border-radius: calc(var(--radius-base) * 2);
    bottom: calc(100% + var(--space-2));
    box-shadow: var(--shadow-md);
    color: var(--text-primary-color);
    font-family: var(--font-family-sans);
    font-size: var(--font-size-ui-sm);
    left: 0;
    line-height: 1.5;
    max-height: calc(100vh - 16rem);
    max-width: calc(100vw - 3.6rem);
    overflow-y: auto;
    padding: var(--space-6) var(--space-8) var(--space-8);
    position: absolute;
    user-select: text;
    width: 30rem;

    &:focus-visible {
        outline: 2px solid var(--input-border-focus);
        outline-offset: 2px;
    }

    h2 {
        border-bottom: 1px solid var(--border-light-color);
        color: var(--headings-color);
        font-size: var(--font-size-ui-md);
        font-weight: var(--font-weight-semibold);
        line-height: 1.5;
        margin: 0 0 var(--space-6);
        padding: 0 0 var(--space-4);
        text-transform: none;
    }

    dl {
        column-gap: var(--space-8);
        display: grid;
        grid-template-columns: minmax(0, 1fr) max-content;
        margin: 0;
        row-gap: var(--space-4);
    }

    dt {
        align-items: start;
        color: var(--text-light-color);
        column-gap: var(--space-3);
        display: grid;
        grid-template-columns: 16px minmax(0, 1fr);
        overflow-wrap: anywhere;

        > .icon {
            margin-top: 2px;
        }
    }

    dd {
        font-variant-numeric: tabular-nums;
        font-weight: var(--font-weight-semibold);
        margin: 0;
        text-align: right;
    }
}
</style>
