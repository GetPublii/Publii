<template>
    <div
        v-if="isVisible"
        class="overlay">
        <div class="popup">
            <p class="message">
                Change post author:
            </p>

            <dropdown
                id="author-select"
                :items="authors"
                v-model="selectedAuthor" />

            <div class="buttons">
                <p-button
                    type="medium no-border-radius half-width"
                    @click.native="changeAuthor">
                    OK
                </p-button>

                <p-button
                    type="medium no-border-radius half-width cancel-popup"
                    @click.native="cancel">
                    Cancel
                </p-button>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'author-popup',
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
    background-color: $color-10;
    border: none;
    border-radius: .6rem;
    display: inline-block;
    font-size: 1.6rem;
    font-weight: 400;
    left: 50%;
    max-width: 48rem;
    min-width: 48rem;
    overflow: hidden;
    padding: 4rem;
    position: absolute;
    text-align: center;
    top: 50%;
    transform: translateX(-50%) translateY(-50%);
}

.message {
    color: $color-7;
    font-size: 1.8rem;
    font-weight: 400;
    margin: 0;
    padding: 0 0 4rem 0;
    position: relative;
    text-align: center;

    &.text-centered {
        text-align: center;
    }
}

.buttons {
    display: flex;
    margin: 4rem -4rem -4rem -4rem;
    position: relative;
    text-align: center;
    top: 1px;
}
</style>
