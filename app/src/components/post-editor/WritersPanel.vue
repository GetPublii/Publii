<template>
    <div :class="{ 'post-editor-writers-panel': true, 'is-hidden': !isVisible }">
        <dl>
            <dt id="counter-words">{{ words }}</dt>
            <dd>{{ $t('post.words') }}</dd>
            <dt id="counter-unique-words">{{ uniqueWords }}</dt>
            <dd>{{ $t('post.uniqueWords') }}</dd>
            <dt id="counter-characters">{{ characters }}</dt>
            <dd>{{ $t('post.characters') }}</dd>
            <dt id="counter-sentences">{{ sentences }}</dt>
            <dd>{{ $t('post.sentences') }}</dd>
            <dt id="counter-paragraphs">{{ paragraphs }}</dt>
            <dd>{{ $t('post.paragraphs') }}</dd>
            <dt id="counter-reading-time"><span v-pure-html="readingTime"></span><small>{{ $t('post.min') }}</small></dt>
            <dd>{{ $t('post.readingTime') }}</dd>
        </dl>
    </div>
</template>

<script>
import strip_tags from './../../helpers/vendor/locutus/strings/strip_tags';

export default {
    name: 'post-editor-writers-panel',
    props: {
        'isVisible': {
            default: false,
            type: Boolean
        }
    },
    data () {
        return {
            words: 0,
            uniqueWords: 0,
            characters: 0,
            sentences: 0,
            paragraphs: 0,
            readingTime: 0
        };
    },
    mounted () {
        this.$bus.$on('writers-panel-refresh', () => this.refresh());
        this.refresh();
    },
    methods: {
        refresh() {
            let iframe = document.getElementById('post-editor_ifr');

            if(!iframe) {
                return false;
            }

            let content = iframe.contentWindow.window.document.body.innerHTML;
            let paragraphs = content.match(/<(p|blockquote|ul|ol|h1|h2|h3|h4|h5|h6|pre).*?>/g);
            let sentencesSource = content.split('</p>').map(sentence => strip_tags(sentence.replace(/&nbsp;/g, ' ').replace(/\s+/g, ' '))).join("\n");
            let words = sentencesSource.toLowerCase().split(/[\n\s]/).filter(fragment => fragment.trim() !== '');
            let sentences = sentencesSource.split(/[\.\?!\n]/).filter(fragment => fragment.trim() !== '');
            let uniqueWords = [...new Set(words)];
            let readingTime = Math.floor(words.length / 180);
            let readingTimePrefix = '';

            if(words.length < 180) {
                readingTimePrefix = '&lt; ';
                readingTime = 1;
            }

            this.uniqueWords = uniqueWords.length;
            this.words = words.length;
            this.characters = sentences.join(' ').length;
            this.sentences = sentences.length;
            this.paragraphs = paragraphs ? paragraphs.length : 0;
            this.readingTime = readingTimePrefix + readingTime;
        }
    },
    beforeDestroy () {
        this.$bus.$off('writers-panel-open');
    }
};
</script>

<style lang="scss">
@import '../../scss/variables.scss';
@import '../../scss/mixins.scss';

.post-editor {
    &-writers-panel {
       background: var(--option-sidebar-bg);
        border-right: 1px solid var(--input-border-color);
        bottom: 0;
        color: var(--label-color);
        height: calc(100vh - var(--topbar-height));
        left: 0;
        opacity: 1;
        position: absolute;
        text-align: center;
        top: var(--topbar-height);
        transition: var(--transition);
        width: $writers-panel-width;
        z-index: 100;

        &.is-hidden {
            opacity: 0;
            pointer-events: none;
        }

        dl {
            margin: 10rem 15% 0 15%;
            width: 70%;

            dt {
                color: var(--text-primary-color);
                font-size: 2.6rem;
                font-family: Georgia, serif;
            }

            dd {
                border-bottom: 1px solid var(--input-border-color);
                font-size: 1.4rem;
                margin: 0 0 1rem 0;
                padding: 0 0 2rem 0;

                &:last-child {
                    border-bottom: none;
                }
            }
        }
    }
}

/*
 * Windows adjustments
 */
body[data-os="linux"] {
    .post-editor {
        &-writers-panel {
            height: 100vh;
            top: 0;
        }
    }
}

/*
 * Responsive improvements
 */
@media (max-height: 900px) {
    .post-editor-writers-panel {
        dl {
            dd {
                line-height: 1.1;
            }
        }
    }
}
</style>
