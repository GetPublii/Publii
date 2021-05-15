<template>
    <div class="screen">
        <div class="splashscreen">
            <h1 class="title">
                <img src="../assets/svg/logo.svg" alt="Publii logo">
            </h1>

            <small class="version">
                v.{{ version }} (build <span class="splashscreen-build">{{ build }}</span>)
            </small>

            <div
                v-if="!licenseAccepted"
                class="license">
                <p>
                    This software is licensed under GNU GPL version 3.<br>
                    By clicking "Accept" you are agree to the
                    <a
                        href="#"
                        @click="showLicense">
                        Publii License Agreement.
                    </a>
                </p>

                <p-button
                    :onClick="acceptLicense">
                    Accept
                </p-button>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'splashscreen',
    computed: {
        licenseAccepted: function() {
            return this.$store.state.app.config.licenseAccepted;
        },
        version: function() {
            return this.$store.state.app.versionInfo.version;
        },
        build: function() {
            return this.$store.state.app.versionInfo.build;
        }
    },
    beforeDestroy: function() {
        mainProcessAPI.stopReceiveAll('app-license-accepted');
    },
    methods: {
        showLicense: function(e) {
            e.preventDefault();
            mainProcessAPI.shellOpenExternal('https://getpublii.com/license.html');
        },
        acceptLicense: function() {
            let self = this;

            mainProcessAPI.send('app-license-accept', true);
            mainProcessAPI.receiveOnce('app-license-accepted', function(event, data) {
                self.$bus.$emit('license-accepted');
            });
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

/*
 * Splashscreen component
 */
.splashscreen {
    left: 50%;
    position: absolute;
    text-align: center;
    top: 50%;
    transform: translateX(-50%) translateY(-50%);
}

.title {
    height: 81px;
    margin: 1.5rem auto;
    width: 206px;

    img {
        display: block;
        height: 81px;
        width: 206px;
    }
}

.version {
    color: var(--gray-4);
    font-size: 1.5rem;
    font-weight: 400;
}

.license {
    -webkit-app-region: no-drag;
    color: var(--gray-4);
    font-weight: 400;
    margin-top: 5rem;
}

.accept {
    -webkit-app-region: no-drag;
    font-weight: bold;
    height: 3.6rem;
    line-height: 3.4rem;
    margin-top: 1rem;
    padding: 0 2rem;
}
</style>
