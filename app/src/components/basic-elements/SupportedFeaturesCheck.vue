<template>
    <div 
        v-if="unavailableFeatures.length"
        class="supported-features-check">
        <div
            v-for="(feature, index) of unavailableFeatures"
            :key="'feature-to-check-' + index"
            class="msg msg-icon msg-alert">
            <icon name="warning" customWidth="28" customHeight="28" />
            <p>{{ $t('supportedFeatures.yourThemeDoNotSupport', { featureName: featureNames[feature] }) }} </p>
        </div>
    </div>
</template>

<script>
export default {
    name: 'supported-features-check',
    props: {
        featuresToCheck: {
            required: true,
            type: Array,
            default: () => ([])
        }
    },
    computed: {
        unavailableFeatures () {
            return this.featuresToCheck.filter(feature => !this.isSupported(feature));
        }
    },
    data () {
        return {
            featureNames: {
                authorImages: this.$t('supportedFeatures.featureNames.authorImages'),
                authorPages: this.$t('supportedFeatures.featureNames.authorPages'),
                blockEditor: this.$t('supportedFeatures.featureNames.blockEditor'),
                customComments: this.$t('supportedFeatures.featureNames.customComments'),
                customSearch: this.$t('supportedFeatures.featureNames.customSearch'),
                errorPage: this.$t('supportedFeatures.featureNames.errorPage'),
                searchPage: this.$t('supportedFeatures.featureNames.searchPage'),
                tagImages: this.$t('supportedFeatures.featureNames.tagImages'),
                tagsList: this.$t('supportedFeatures.featureNames.tagsList'),
                tagPages: this.$t('supportedFeatures.featureNames.tagPages')
            }
        }
    },
    methods: {
        isSupported (featureName) {
            return this.$store.state.currentSite.themeSettings && 
                this.$store.state.currentSite.themeSettings.supportedFeatures &&
                this.$store.state.currentSite.themeSettings.supportedFeatures[featureName];
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../../scss/variables.scss';
@import '../../scss/notifications.scss';

.msg {
    background: var(--bg-secondary);
    margin-bottom: 1rem;
}

</style>
