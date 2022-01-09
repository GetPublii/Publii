<template>
    <dl
        class="credits-list"
        ref="content">
        <template v-for="(licenseData, index) in licensesData">
            <dt class="credits-item">
                {{ licenseData.name }}

                <a
                    v-if="licenseData.target !== '_blank'"
                    class="credits-toggle"
                    @click.prevent="itemClicked($event, licenseData.id, licenseData.url)"
                    :href="licenseData.href">
                    {{ $t('publii.license') }}
                </a>

                <a
                    v-if="licenseData.target === '_blank'"
                    class="credits-toggle"
                    :href="licenseData.href"
                    target="_blank">
                    {{ $t('publii.license') }}
                </a>

                <a
                    v-if="licenseData.homepage"
                    :href="licenseData.homepage"
                    target="_blank"
                    rel="noopener noreferrer">
                    {{ $t('publii.homepage') }}
                </a>
            </dt>

            <dd :class="licenseData.cssClasses" :data-id="licenseData.id">
                <pre></pre>
            </dd>
        </template>
    </dl>
</template>

<script>
export default {
    name: 'about-credits-list',
    props: [
        'licenses'
    ],
    data: function() {
        return {
            openedID: -1
        };
    },
    computed: {
        licensesData: function() {
            let licensesData = [];
            let licensePackages = Object.keys(this.licenses).sort();
            let licenseID = 1;

            for(let licenseKey of licensePackages) {
                let licenseObject = this.parseLicense(licenseKey, licenseID);
                licensesData.push(licenseObject);
                licenseID++;
            }

            return licensesData;
        }
    },
    mounted () {
        (async () => {
            this.appDirPath = await mainProcessAPI.invoke('app-credits-list:get-app-path');
        });
    },
    methods: {
        itemClicked: function(e, id, licenseUrl) {
            if(e.target.getAttribute('href') === '#') {
                if(this.openedID === id) {
                    this.openedID = -1;
                    return;
                }

                this.openedID = id;
                this.loadLicense(e.target, licenseUrl);
            }
        },
        loadLicense: function(link, licenseUrl) {
            mainProcessAPI.send('app-license-load', {
                url: licenseUrl
            });

            mainProcessAPI.receiveOnce('app-license-loaded', function(licenseText) {
                if (licenseText.translation) {
                    licenseText = this.$t(licenseText);
                }

                link.parentNode.nextElementSibling.querySelector('pre').innerText = licenseText;
            });
        },
        parseLicense: function(licenseKey, licenseID) {
            let licenseHomepage = this.licenses[licenseKey].url;
            let licenseName = licenseKey.split('@')[0];
            let licenseUrl = `licenses/${licenseName}/license.txt`;
            let licenseExternal = false;
            let licenseHref = '#';
            let licenseTarget = '';

            if(!licenseHomepage) {
                licenseHomepage = this.licenses[licenseKey].repository;
            }

            if(this.licenses[licenseKey].licenseFile) {
                licenseUrl = this.licenses[licenseKey].licenseFile;
            }

            if(this.licenses[licenseKey]['helper-text']) {
                let appDirPath = remote.app.getAppPath();
                licenseUrl = 'file://' + appDirPath + '/' + this.licenses[licenseKey].url;
                licenseHomepage = false;
                licenseExternal = true;
                licenseHref = licenseUrl;
                licenseTarget = '_blank';
            }

            return {
                id: licenseID,
                name: licenseName,
                url: licenseUrl,
                href: licenseHref,
                homepage: licenseHomepage,
                isExternal: licenseExternal,
                target: licenseTarget,
                cssClasses: {
                    'credits-content': true,
                    'is-hidden': parseInt(this.openedID, 10) !== licenseID
                }
            };
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.credits {
    &-list {
        margin-top: 0;
    }

    &-item {
        border-bottom: 1px solid var(--border-light-color);
        padding: 1.4rem 0;

        & > a {
            color: var(--link-primary-color);
            float: right;
            font-size: 1.4rem;
            margin-left: 5rem;

            &:active,
            &:focus,
            &:hover {
                color: var(--link-primary-color-hover);
            }
        }

        &:last-of-type {
            border-bottom: none;
        }
    }

    &-content {
        margin: 0;
        padding: 2rem;

        pre {
            white-space: pre-line;
        }
    }
}
</style>
