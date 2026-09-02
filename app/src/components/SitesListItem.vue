<template>
    <li
        :class="{ 
            'single-site': true, 
            'is-duplicating': isDuplicating 
        }">

        <button
            type="button"
            class="single-site-primary-action"
            @click="showWebsite(site)">
            <span class="single-site-icon">
                <icon
                    :name="siteLogoIcon"
                    iconset="svg-map-site"
                    customWidth="22"
                    customHeight="22"
                    non-interactive
                    aria-hidden="true" />
            </span>

            <strong class="single-site-name" :title="displayName">
                <span>
                    {{ displayName }}
                </span>

                <small v-if="description">
                    {{ description }}
                </small>
            </strong>
        </button>

        <div 
            :class="{
                'single-site-actions': true, 
                'single-site-actions-disabled': duplicateInProgress 
            }">
            <button
                v-if="currentSiteName"
                type="button"
                :class="{
                    'single-site-actions-btn': true,
                    'open-in-new-window': true,
                    'is-unavailable': isCurrentSite
                }"
                :title="openWebsiteInNewWindowLabel"
                :aria-label="openWebsiteInNewWindowLabel"
                :aria-disabled="isCurrentSite ? 'true' : 'false'"
                :disabled="duplicateInProgress"
                @click.stop="openWebsiteInNewWindow">
                <icon
                    name="open-new-window"
                    size="xs"
                    non-interactive
                    aria-hidden="true" />
            </button>

            <button
                type="button"
                :class="{ 'single-site-actions-btn': true, 'is-duplicating': isDuplicating }"
                :title="$t('site.duplicateWebsite')"
                :aria-label="$t('site.duplicateWebsite') + ': ' + displayName"
                :disabled="duplicateInProgress"
                @click.stop="askForClone">
                <icon
                    name="duplicate"
                    size="xs"
                    non-interactive
                    aria-hidden="true" />
            </button>

            <button
                type="button"
                class="single-site-actions-btn delete"
                :title="$t('site.deleteWebsite')"
                :aria-label="$t('site.deleteWebsite') + ': ' + displayName"
                :disabled="duplicateInProgress"
                @click.stop="askForRemove">
                <icon
                    name="trash"
                    size="xs"
                    non-interactive
                    aria-hidden="true" />
            </button>
        </div>
    </li>
</template>

<script>
export default {
    name: 'sites-list-item',
    props: [
        'site',
        'duplicateInProgress'
    ],
    computed: {
        description: function() {
            return this.$store.state.sites[this.site].description;
        },
        displayName: function() {
            return this.$store.state.sites[this.site].displayName;
        },
        siteLogoIcon: function() {
            return this.$store.state.sites[this.site].logo.icon;
        },
        currentSiteName () {
            return this.$store.state.currentSite && this.$store.state.currentSite.config
                ? this.$store.state.currentSite.config.name || ''
                : '';
        },
        isCurrentSite () {
            return this.currentSiteName === this.site;
        },
        openWebsiteInNewWindowLabel () {
            if (this.isCurrentSite) {
                return this.$t('site.websiteAlreadyOpenInCurrentWindow', { websiteName: this.displayName });
            }

            return this.$t('site.openWebsiteInNewWindow', { websiteName: this.displayName });
        }
    },
    data () {
        return {
            isDuplicating: false
        };
    },
    methods: {
        showWebsite (siteToDisplay) {
            window.localStorage.setItem('publii-last-opened-website', siteToDisplay);
            this.$bus.$emit('site-switched');
            this.$bus.$emit('sites-popup-hide');
            this.$router.push(`/site/${siteToDisplay}`);
        },
        async openWebsiteInNewWindow () {
            if (this.isCurrentSite) {
                return;
            }

            try {
                let result = await mainProcessAPI.invoke('app-open-new-window', this.site);

                if (result && (result.status === true || result.error === 'site-already-open')) {
                    this.$bus.$emit('sites-popup-hide');
                    return;
                }
            } catch (error) {
                // The shared warning below is sufficient for renderer-side failures.
            }

            this.$bus.$emit('message-display', {
                message: this.$t('site.siteLoadingErrorMsg'),
                type: 'warning'
            });
        },
        askForRemove () {
            this.$bus.$emit('confirm-display', {
                message: this.$t('site.deleteWebsiteConfirmMsg'),
                okClick: this.removeWebsite.bind(this, this.site),
                okLabel: this.$t('site.removeWebsite'),
                isDanger: true
            });
        },
        askForClone () {
            this.isDuplicating = true;

            this.$bus.$emit('confirm-display', {
                message: this.$t('site.specifyNameForWebsiteDuplicate'),
                okClick: this.cloneWebsite,
                cancelClick: () => this.isDuplicating = false,
                hasInput: true,
                okLabel: this.$t('site.cloneWebsite')
            });
        },
        cloneWebsite (newName) {
            if (newName.replace(/\s/gmi, '').trim() === '') {
                this.$bus.$emit('alert-display', {
                    message: this.$t('site.websiteNameCantBeEmpty')
                });

                this.isDuplicating = false;
                return;
            }

            if (!this.checkIfNewNameIsFree(newName)) {
                this.$bus.$emit('alert-display', {
                    message: this.$t('site.websiteNameAlreadyInUseMsg')
                });

                this.isDuplicating = false;
                return;
            }

            this.$bus.$emit('sites-list-duplicate-in-progress', true);

            mainProcessAPI.send('app-site-clone', {
                catalogName: this.site,
                siteName: newName
            });

            mainProcessAPI.receiveOnce('app-site-cloned', (clonedWebsiteData) => {
                this.$bus.$emit('sites-list-duplicate-in-progress', false);
                this.isDuplicating = false;

                this.$store.commit('cloneWebsite', {
                    clonedWebsiteCatalog: this.site,
                    newSiteName: clonedWebsiteData.siteName,
                    newSiteCatalog: clonedWebsiteData.siteCatalog,
                    newSiteConfig: clonedWebsiteData.siteConfig
                });

                this.$router.push(`/site/${clonedWebsiteData.siteCatalog}`);
                window.localStorage.setItem('publii-last-opened-website', clonedWebsiteData.siteCatalog);
                this.$bus.$emit('message-display', {
                    message: this.$t('site.cloneWebsiteSuccessMsg') + clonedWebsiteData.siteCatalog,
                    type: 'success',
                    lifeTime: 3
                });

                this.$bus.$emit('sites-popup-hide');
            });
        },
        removeWebsite (name) {
            mainProcessAPI.send('app-site-delete', {
                site: name
            });

            mainProcessAPI.receiveOnce('app-site-deleted', () => {
                this.$store.commit('removeWebsite', name);
                let sites = Object.keys(this.$store.state.sites);

                if(sites.length > 0) {
                    this.$router.push(`/site/${sites[0]}`);
                    window.localStorage.setItem('publii-last-opened-website', sites[0]);
                    this.$bus.$emit('message-display', {
                        message: this.$t('site.deleteWebsiteSuccessMsg') + sites[0],
                        type: 'success',
                        lifeTime: 3
                    });
                    return;
                }

                this.$router.push(`/site/!`);
                this.$bus.$emit('message-display', {
                    message: this.$t('site.deleteWebsiteCSuccessMsg'),
                    type: 'success',
                    lifeTime: 3
                });
            });
        },
        checkIfNewNameIsFree (newName) {
            let keys = Object.keys(this.$store.state.sites);

            for (let i = 0; i < keys.length; i++) {
                if (newName === this.$store.state.sites[keys[i]].displayName) {
                    return false;
                }
            }

            return true;
        }
    }
}
</script>

<style scoped>

/*
 * Single site
 */
.single-site {
    align-items: center;
    background: var(--collection-bg);
    border-bottom: 1px solid var(--border-light-color);
    color: var(--link-primary-color-hover);
    display: flex;
    margin: 0;
    padding: 1.2rem var(--space-8);
    position: relative;

    &:focus-within {
        background: var(--input-bg-light);
    }

    &:last-child {
        border: none;
    }

    &:hover,
    &.is-duplicating {
        background: var(--collection-bg-hover);
        box-shadow: inset 3px 0 0 var(--color-primary);
        color: var(--link-primary-color);
        will-change: transform;

        .single-site-actions-btn {
            opacity: 1;

            &.is-unavailable {
                opacity: .6;
            }
        }
    }
}
.single-site-primary-action {
    align-items: center;
    background: none;
    border: 0;
    color: inherit;
    cursor: pointer;
    display: flex;
    flex: 1;
    font: inherit;
    min-width: 0;
    padding: 0;
    text-align: left;

    &:focus-visible {
        outline: 2px solid var(--input-border-focus);
        outline-offset: 2px;
    }
}
.single-site-actions {
    display: flex;
    gap: 8px;
    margin-left: auto;

    &:focus-within {
        .single-site-actions-btn {
            opacity: 1;

            &.is-unavailable {
                opacity: .6;
            }
        }
    }
}
.single-site-actions-disabled {
    opacity: .75;
    pointer-events: none;
}
.single-site-actions-btn {
    align-items: center;
    background: var(--bg-primary);
    border: 0;
    border-radius: 50%;
    color: inherit;
    cursor: pointer;
    display: inline-flex;
    font: inherit;
    height: 3rem;
    justify-content: center;
    opacity: 0;
    padding: 0;
    position: relative;
    text-align: center;
    width: 3rem;

    &:active,
    &:focus,
    &:hover {
        color: var(--headings-color);
    }

    &:focus-visible {
        outline: 2px solid var(--input-border-focus);
        outline-offset: 2px;
    }

    &:hover {

        & > svg {
           fill: var(--icon-tertiary-color);
           transform: scale(1);
       }
    }

    svg {
        fill: var(--icon-secondary-color);
        height: 1.6rem;
        pointer-events: none;
        transform: scale(.9);
        transition: var(--transition-default);
        width: 1.6rem;
    }

    &.delete {

        &:hover {

            & > svg {
               fill: var(--color-danger);
           }
        }
    }

    &.open-in-new-window {
        svg {
            color: var(--icon-secondary-color);
            fill: none;
        }

        &:hover > svg {
            color: var(--icon-tertiary-color);
            fill: none;
        }
    }

    &.is-unavailable {
        cursor: not-allowed;

        &:hover > svg {
            color: var(--icon-secondary-color);
            transform: scale(.9);
        }
    }

    &.is-duplicating {
        &::after { 
           animation: spin .9s infinite linear;
           border-top: 2px solid oklch(from var(--color-primary) l c h / 20%);
           border-right: 2px solid oklch(from var(--color-primary) l c h / 20%);
           border-bottom: 2px solid oklch(from var(--color-primary) l c h / 20%);
           border-left: 2px solid var(--color-primary);
           border-radius: 50%;
           content: "";
           display: block;
           height: 100%;
           width: 100%;
           position: absolute;
           top: 50%;
           left: 50%;
           transform: translate(-50%, -50%)
        }

        svg {
            opacity: 0;
        }
    }
}
@keyframes spin {
    100% {
        transform: translate(-50%, -50%) rotate(360deg);
    }
}
.single-site-icon {
    align-items: center;
    border-radius: 3px;
    color: currentColor;
    display: flex;
    height: auto;
    justify-content: center;
    margin-right: var(--space-6);
    position: relative;
    width: 3.3rem;
}
.single-site-name {
    display: block;    
    font-weight: var(--font-weight-medium);
    line-height: 3.6rem;
    margin: 0;
    overflow: hidden;
    padding: 0;
    text-align: left;
    text-overflow: ellipsis;
    transition: var(--transition-default);
    white-space: nowrap;
    max-width: 82%;

    span {
        display: block;
        line-height: 1.4;
    }

    small {
        color: var(--color-text-muted);
        display: block;
        line-height: 1.4;
        white-space: normal;
    }
}
</style>
