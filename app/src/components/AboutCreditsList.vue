<template>
    <dl
        class="credits-list"
        ref="content">
        <template v-for="licenseData in licensesData">
            <dt
                class="credits-item"
                :key="'item-' + licenseData.id">
                {{ licenseData.name }}

                <a
                    class="credits-toggle"
                    href="#"
                    @click.prevent="toggleLicense(licenseData)">
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

            <dd
                :class="{ 'credits-content': true, 'is-hidden': openedID !== licenseData.id }"
                :data-id="licenseData.id"
                :key="'content-' + licenseData.id">
                <pre>{{ licenseTexts[licenseData.id] }}</pre>
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
            openedID: -1,
            licenseTexts: {}
        };
    },
    computed: {
        licensesData: function() {
            // Order and content of the list come from build/scripts/generate-licenses.js
            return Object.keys(this.licenses).map((licenseName, index) => ({
                id: index + 1,
                name: licenseName,
                url: this.licenses[licenseName].licenseFile,
                homepage: this.licenses[licenseName].homepage,
                openExternally: this.licenses[licenseName].openExternally === true
            }));
        }
    },
    methods: {
        toggleLicense: async function(licenseData) {
            if (this.openedID === licenseData.id) {
                this.openedID = -1;
                return;
            }

            if (licenseData.openExternally) {
                let isOpened = await mainProcessAPI.invoke('app-credits-list:open-license', licenseData.url);

                if (!isOpened) {
                    this.openedID = licenseData.id;
                    this.$set(this.licenseTexts, licenseData.id, this.$t('core.credits.errorLoadingLicenseMsg'));
                }

                return;
            }

            this.openedID = licenseData.id;

            let licenseText = await mainProcessAPI.invoke('app-credits-list:load-license', licenseData.url);

            if (licenseText && licenseText.translation) {
                licenseText = this.$t(licenseText.translation);
            }

            this.$set(this.licenseTexts, licenseData.id, licenseText);
        }
    }
}
</script>

<style scoped>

.credits {
}

.credits-list {
    margin-top: 0;
}

.credits-item {
    border-bottom: 1px solid var(--border-light-color);
    padding: 1.4rem 0;

    & > a {
        color: var(--link-primary-color);
        float: right;
        font-size: var(--font-size-ui-md);
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

.credits-content {
    margin: 0;
    padding: var(--space-8);

    pre {
        white-space: pre-line;
    }
}
</style>
