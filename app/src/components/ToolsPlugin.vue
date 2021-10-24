<template>
    <section class="content wp-import">
        <p-header :title="pluginName">
            <p-button
                :onClick="goBack"
                slot="buttons"
                type="outline">
                {{ $t('ui.backToTools') }}
            </p-button>
        </p-header>
    </section>
</template>

<script>
import BackToTools from './mixins/BackToTools.js';

export default {
    name: 'tools-plugin',
    mixins: [
        BackToTools
    ],
    data: function() {
        return {
            pluginName: ''
        };
    },
    mounted () {
        this.loadPluginConfig(this.$route.params.pluginname, this.$route.params.name);
    },
    methods: {
        loadPluginConfig (pluginName, siteName) {
            
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';
</style>
