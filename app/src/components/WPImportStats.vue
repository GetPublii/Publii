<template>
    <div
        v-if="stats"
        class="import-stats">
        <strong>During WXR analyze we have found:</strong>
        <p>Posts: <strong>{{ stats.types.post }}</strong></p>
        <p>Pages: <strong>{{ stats.types.page }}</strong></p>
        <p>Images: <strong>{{ stats.types.image }}</strong></p>
        <p v-if="countCpt().length">Custom Post Types:</p>
        <p v-for="cpt in countCpt()"> - {{ cpt.type }}: <strong>{{ cpt.count }}</strong></p>
        <p>Tags: <strong>{{ stats.tags }}</strong></p>
        <p>Categories: <strong>{{ stats.categories }}</strong></p>
        <p>Authors: <strong>{{ stats.authors }}</strong></p>
    </div>
</template>

<script>
export default {
    name: 'wp-import-stats',
    props: {
        stats: {
            default: false,
            type: [Object, Boolean]
        }
    },
    methods: {
        countCpt: function() {
            let result = [];

            for(let postType of Object.keys(this.stats.types)) {
                if(['post', 'page', 'image'].indexOf(postType) !== -1) {
                    continue;
                }

                result.push({
                    type: postType,
                    count: this.stats.types[postType]
                });
            }

            return result;
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.import-stats {
    border-bottom: 2px solid var(--gray-1);
    padding: 4rem 0 3rem 0;

    & > strong {
        display: block;
        font-weight: 600;
        margin-bottom: 2rem;
    }

    & > p {
        margin: .25rem 0;
    }
}
</style>
