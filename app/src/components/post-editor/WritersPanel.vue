<template>
    <div :class="{ 'post-editor-writers-panel': true, 'is-hidden': !isVisible }">
        <a
            href="#"
            class="post-editor-writers-panel-close"
            @click.prevent="close" >
            <icon
                size="m"
                name="sidebar-close" />
        </a>

        <dl>
            <dt id="counter-words">{{ words }}</dt>
            <dd>Words</dd>
            <dt id="counter-unique-words">{{ uniqueWords }}</dt>
            <dd>Unique words</dd>
            <dt id="counter-characters">{{ characters }}</dt>
            <dd>Characters</dd>
            <dt id="counter-sentences">{{ sentences }}</dt>
            <dd>Sentences</dd>
            <dt id="counter-paragraphs">{{ paragraphs }}</dt>
            <dd>Paragraphs</dd>
            <dt id="counter-reading-time"><span v-html="readingTime"></span><small>min</small></dt>
            <dd>Reading Time</dd>
        </dl>
    </div>
</template>

<script>
import strip_tags from './../../helpers/vendor/locutus/strings/strip_tags';

export default {
    name: 'post-editor-writers-panel',
    data () {
        return {
            isVisible: false,
            words: 0,
            uniqueWords: 0,
            characters: 0,
            sentences: 0,
            paragraphs: 0,
            readingTime: 0
        };
    },
    mounted () {
        this.isVisible = localStorage.getItem('publii-writers-panel') === 'opened';
        this.$bus.$on('writers-panel-refresh', () => this.refresh());
        this.$bus.$on('writers-panel-open', () => this.open());
        this.$bus.$on('writers-panel-close', () => this.close());
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
            $('.mce-publii-text-stats').find('span').text('Words: ' + this.words);
        },
        open () {
            this.isVisible = true;
            $('.mce-publii-text-stats-link').text('Hide Stats');
            localStorage.setItem('publii-writers-panel', 'opened');
        },
        close () {
            this.isVisible = false;
            $('.mce-publii-text-stats-link').text('View Stats');
            localStorage.setItem('publii-writers-panel', 'closed');
        }
    },
    beforeDestroy () {
        this.$bus.$off('writers-panel-open');
        this.$bus.$off('writers-panel-close');
        this.$bus.$off('writers-panel-refresh');
    }
};
</script>

<style lang="scss">
@import '../../scss/variables.scss';
@import '../../scss/mixins.scss';

.post-editor {
    &-writers-panel {
        background: $color-10;
        border-left: 1px solid rgba($color-8, .4);
        bottom: 0;
        box-shadow: 4px 0 12px rgba(0, 0, 0, 0.075);
        height: calc(100% - 84px);
        opacity: 1;
        position: absolute;
        right: 279px;
        text-align: center;
        transform: translateX(0);
        transform-origin: 0 0;
        transition: all .25s ease-out;
        width: 220px;
        z-index: 100;

        &.is-hidden {
            display: block;
            opacity: 0;
            pointer-events: none;
            transform: translateX(-100px);

            & + .post-editor-sidebar {
                box-shadow: -4px 0px 6px rgba(0, 0, 0, 0.075);
            }
        }

        &-close {
            height: 24px;
            position: absolute;
            right: 2rem;
            top: 2rem;
            width: 24px;

            & > svg {
                fill: $color-3;
                pointer-events: none;
                transition: all .25s ease-out;
            }

            &:active,
            &:focus,
            &:hover {
                & > svg {
                   fill: $color-4;
                }
            }
        }

        dl {
            margin: 6.4rem 15% 0 15%;
            width: 70%;

            dt {
                color: $color-5;
                font-size: 3.2rem;
                font-family: Georgia, serif;
            }

            dd {
                border-bottom: 1px solid rgba($color-8, .4);
                margin: 0 0 1rem 0;
                padding: 0 0 1.5rem 0;
            }
        }
    }
}

/*
 * Windows adjustments
 */
body[data-os="win"] {
    .post-editor-writers-panel-close {
        top: 3.5rem;
    }
}

body[data-os="linux"] {
    .post-editor {
        &-writers-panel {
            height: calc(100vh - 6.2rem);
            top: 6.2rem;
        }
    }
}

/*
 * Responsive improvements
 */
@media (max-height: 900px) {
    .post-editor-writers-panel {
        right: 179px;

        dl {
            margin: 4.8rem 15% 0 15%;

            dt {
                font-size: 2.4rem;
            }
        }
    }
}

@media (max-width: 1400px) {
    .post-editor-writers-panel {
        right: 179px;
    }
}
</style>
