<template>
    <div class="credits">
        <div class="credits-wrapper">
            <div class="heading">
                <h1 class="title">
                    {{ $t('ui.credits') }}
                </h1>

                <p-button
                    :onClick="goBack"
                    type="clean back"
                    slot="buttons">
                    {{ $t('ui.goBack') }}
                </p-button>
            </div>

            <p class="credits-intro">{{ $t('publii.creditsIntro') }}</p>
            
            <fields-group>
               <credits-list
                   :licenses="licenses" />
            </fields-group>
        </div>
    </div>
</template>

<script>
import { mapGetters } from 'vuex';
import licenses from '../../licenses/all-licenses.json';
import AboutCreditsList from './AboutCreditsList';
import GoToLastOpenedWebsite from './mixins/GoToLastOpenedWebsite';

export default {
    name: 'about-credits',
    mixins: [GoToLastOpenedWebsite],
    components: {
        'credits-list': AboutCreditsList
    },
    computed: {
        ...mapGetters([
            'appVersion'
        ])
    },
    data: function() {
        return {
            licenses
        };
    },
    mounted () {
        this.$bus.$emit('sites-list-reset');
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';
@import '../scss/mixins.scss';

.credits {
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

    &-intro {
        margin: -2.5rem 0 4rem 0;
    }
}
</style>
