<template>
    <div class="about" ref="content">
        <div class="heading">
            <h1 class="title">
                About Publii
            </h1>

            <p-button
                :onClick="goBack"
                type="outline"
                slot="buttons">
                Go back
            </p-button>
        </div>

        <p class="about-version">
            v.{{ appVersion.version }} (build {{ appVersion.build }}) {{ appVersion.status }}
        </p>

        <p class="about-copyright">
            Copyright 2020 <a href="https://tidycustoms.net" target="_blank">TidyCustoms</a>. All rights reserved.<br>
            Publli is designed and maintained by core team with cooperation with <a href="https://github.com/dziudek" target="_blank">Dev Zen</a> and is made possible by the <a href="http://electron.atom.io" target="_blank">Electron</a>
            Open Source project and other <router-link to="/about/credits">Open Source Software</router-link>.
        </p>

        <p>
            <strong>We do not collect any </strong>personal data while you use Publii app; also we do not store, we do not track,  we do not allow third parties to collect personally identifiable information about you. 
        </p>

        <p>
            <a href="https://getpublii.com/license.html" target="_blank">Licensing information</a>
        </p>
    </div>
</template>

<script>
import { shell } from 'electron';
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
    color: var(--text-light-color);
    margin: 0 auto;
    max-width: 960px;
    padding: 4.4rem 0;

    & > .heading {
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
        color: var(--text-primary-color);
        margin: -2rem 0 5rem;
    }   
}
</style>
