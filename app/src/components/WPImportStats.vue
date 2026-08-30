<template>
    <div
        v-if="stats"
        class="import-stats">
        <p>{{ $t('ui.posts') }}: <strong>{{ stats.types.post }}</strong></p>
        <p>{{ $t('ui.pages') }}: <strong>{{ stats.types.page }}</strong></p>
        <p>{{ $t('image.images') }}: <strong>{{ stats.types.image }}</strong></p>
        <p v-if="countCpt().length">{{ $t('post.customPostTypes') }}:</p>
        <p v-for="cpt in countCpt()"> - {{ cpt.type }}: <strong>{{ cpt.count }}</strong></p>
        <p>{{ $t('ui.tags') }}: <strong>{{ stats.tags }}</strong></p>
        <p>{{ $t('tools.wpImport.categories') }}: <strong>{{ stats.categories }}</strong></p>
        <p>{{ $t('ui.authors') }}: <strong>{{ stats.authors }}</strong></p>
        <p v-if="stats.menus">
            {{ $t('tools.wpImport.menus') }}: <strong>{{ stats.menus }}</strong>
        </p>
        <p v-if="stats.menuItems">
            {{ $t('tools.wpImport.menuItems') }}: <strong>{{ stats.menuItems }}</strong>
        </p>
        <p v-if="stats.duplicates">
            {{ $t('tools.wpImport.duplicateWXRItemsIgnored') }}:
            <strong>{{ stats.duplicates }}</strong>
        </p>
        <p v-if="stats.ignoredSystemItems">
            {{ $t('tools.wpImport.technicalWXRItemsIgnored') }}:
            <strong>{{ stats.ignoredSystemItems }}</strong>
        </p>
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

<style scoped>

.import-stats {
    & > p {
        margin: .25rem 0;
    }
}
</style>
