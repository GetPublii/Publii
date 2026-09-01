<template>
    <div class="about" ref="content">
        <div class="about-wrapper">
            <p-header :title="$t('publii.aboutPublii')">
                <p-button
                    :onClick="goBack"
                    appearance="clean"
                    back
                    slot="buttons">
                    {{ $t('ui.goBack') }}
                </p-button>
            </p-header>

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

<style scoped>

.about {
    padding: var(--space-12) 0 var(--space-16);
    width: 100%;

    .heading {
        margin-bottom: calc(10 * var(--space-unit));
        width: 100%;

        &:after {

            content: " ";

            display: block;

            clear: both;

        }

        .title {
            float: left;
            margin: 0;
        }

        .button {
            float: right;
            margin-top: -.5rem;
        }
    }
}

.about-wrapper {
    margin: 0 auto;
    max-width: var(--wrapper-width);
}

.about-version {
   
    margin: -2.5rem 0 var(--space-16) 0;
}
</style>
