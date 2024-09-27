<template>
    <div
        v-if="isVisible"
        class="overlay">
        <div class="popup">
            <p class="message">
                <template v-if="itemType === 'post'">
                    {{ $t('author.changePostAuthor') }}
                </template>
                <template v-else-if="itemType === 'page'">
                    {{ $t('author.changePageAuthor') }}
                </template>
            </p>

            <dropdown
                id="author-select"
                :items="authors"
                v-model="selectedAuthor" />

            <div class="buttons">
                <p-button
                    type="medium no-border-radius half-width"
                    @click.native="changeAuthor">
                    {{ $t('ui.ok') }}
                </p-button>

                <p-button
                    type="medium no-border-radius half-width cancel-popup"
                    @click.native="cancel">
                    {{ $t('ui.cancel') }}
                </p-button>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'author-popup',
    props: [
        'itemType'
    ],
    data () {
        return {
            isVisible: false,
            selectedAuthor: 0
        };
    },
    computed: {
        authors () {
            let authors = [];
            let sortedAuthors = this.$store.state.currentSite.authors.slice().sort((a, b) => {
                if (a.name.toLowerCase() > b.name.toLowerCase()) {
                    return 1;
                }

                if (a.name.toLowerCase() < b.name.toLowerCase()) {
                    return -1;
                }

                return 0;
            });

            for (let author of sortedAuthors) {
                authors.push({
                    value: author.id,
                    label: author.name
                });
            }

            return authors;
        }
    },
    mounted: function() {
        this.$bus.$on('author-popup-display', (authorID) => {
            this.selectedAuthor = authorID;

            setTimeout(() => {
                this.isVisible = true;
            }, 0);
        });
    },
    methods: {
        changeAuthor: function() {
            this.$bus.$emit('author-changed', this.selectedAuthor);
            this.isVisible = false;
        },
        cancel: function() {
            this.isVisible = false;
        }
    },
    beforeDestroy () {
        this.$bus.$off('author-popup-display');
    }
}
</script>

<style lang="scss" scoped>
@import '../../scss/variables.scss';
@import '../../scss/popup-common.scss';

.overlay {
    z-index: 100005;
}

.popup {
    max-width: 48rem;
    min-width: 48rem;
    padding: 4rem;
}

.message {
    font-size: 1.6rem;
    padding: 0 0 4rem 0;
}

.buttons {
    display: flex;
    margin: 4rem -4rem -4rem -4rem;
    position: relative;
    text-align: center;
    top: 1px;
}

#author-select {
    margin-top: -1rem;
}

</style>
