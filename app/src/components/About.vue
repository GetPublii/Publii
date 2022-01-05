<template>
    <div class="about" ref="content">
        <div class="about-wrapper">
            <div class="heading">
                <h1 class="title">
                    {{ $t('publii.aboutPublii') }}
                </h1>

                <p-button
                    :onClick="goBack"
                    type="clean back"
                    slot="buttons">
                    {{ $t('ui.goBack') }}
                </p-button>
            </div>

            <p class="about-version">{{ $t('publii.currentPubliiVersion') }}: {{ appVersion.version }} (build {{ appVersion.build }})</p>

            <fields-group>
                <p class="about-copyright">
                    <span v-pure-html="$t('publii.copyright')"></span>
                    <router-link to="/about/credits">{{ $t('publii.openSourceSoftware') }}</router-link>.
                </p>

                <p v-pure-html="$t('publii.dataCollectionInfo')"></p>

                <p>
                    <a href="https://getpublii.com/license.html" target="_blank" rel="noopener noreferrer">{{ $t('publii.licensingInformation') }}</a>
                </p>
            </fields-group>
        </div>
    </div>
</template>

<script>
import { mapGetters } from 'vuex';
import GoToLastOpenedWebsite from './mixins/GoToLastOpenedWebsite';

export default {
    name: 'about',
    mixins: [
        GoToLastOpenedWebsite
    ],
    computed: {
        ...mapGetters([
            'appVersion'
        ])
    },
    mounted () {
        this.$bus.$emit('sites-list-reset');
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';
@import '../scss/mixins.scss';

.about {
    padding: 3rem 0 4rem;
    width: 100%;

    &-wrapper {
        margin: 0 auto;
        max-width: $wrapper;
    }

    .heading {
        margin-bottom: 10 * $spacing;
        width: 100%;

        @include clearfix;

        .title {
            float: left;
            margin: 0;
        }

        .button {
            float: right;
            margin-top: -.5rem;
        }
    }

    &-version {
       
        margin: -2.5rem 0 4rem 0;
    }
}
</style>
