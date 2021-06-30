<template>
    <div
        v-if="stats"
        class="import-stats">
        <strong>{{ $t('tools.wpImport.duringWXRAnalyzeWeHaveFound') }}:</strong>
        <p>{{ $t('ui.posts') }}: <strong>{{ stats.types.post }}</strong></p>
        <p>{{ $t('ui.pages') }}: <strong>{{ stats.types.page }}</strong></p>
        <p>{{ $t('image.images') }}: <strong>{{ stats.types.image }}</strong></p>
        <p v-if="countCpt().length">{{ $t('post.customPostTypes') }}:</p>
        <p v-for="cpt in countCpt()"> - {{ cpt.type }}: <strong>{{ cpt.count }}</strong></p>
        <p>{{ $t('ui.tags') }}: <strong>{{ stats.tags }}</strong></p>
        <p>{{ $t('tools.wpImport.categories') }}: <strong>{{ stats.categories }}</strong></p>
        <p>{{ $t('ui.authors') }}: <strong>{{ stats.authors }}</strong></p>
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
