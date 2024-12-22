<template>
    <li
        :class="{ 
            'single-site': true, 
            'is-duplicating': isDuplicating 
        }"
        @click="showWebsite(site)"
        @keydown="showWebsiteOnEnter($event, site)">

        <span class="single-site-icon">
            <icon
                :name="siteLogoIcon"
                iconset="svg-map-site"
                customWidth="22"
                customHeight="22" />
        </span>

        <strong class="single-site-name" :title="displayName">
            <span>
                {{ displayName }}
            </span>

            <small v-if="description">
                {{ description }}
            </small>
        </strong>

        <div 
            :class="{
                'single-site-actions': true, 
                'single-site-actions-disabled': duplicateInProgress 
            }">
            <a
                href="#"
                :class="{ 'single-site-actions-btn': true, 'is-duplicating': isDuplicating }"
                :title="$t('site.duplicateWebsite')"
                tabindex="-1"
                @click.stop.prevent="askForClone">
                <icon
                    name="duplicate"
                    size="xs" />
            </a>

            <a
                href="#"
                class="single-site-actions-btn delete"
                :title="$t('site.deleteWebsite')"
                tabindex="-1"
                @click.stop.prevent="askForRemove">
                <icon
                    name="trash"
                    size="xs" />
            </a>
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
        siteLogoColor: function() {
            return this.$store.state.sites[this.site].logo.color;
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
        showWebsiteOnEnter (event, siteToDisplay) {
            if (event.key === 'Enter' && !event.isComposing && !document.body.classList.contains('has-popup-visible')) {
                this.showWebsite(siteToDisplay);
            }
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

<style lang="scss" scoped>
@import '../scss/variables.scss';
@import '../scss/mixins.scss';

/*
 * Single site
 */
.single-site {
    align-items: center;
    background: var(--collection-bg);
    border-bottom: 1px solid var(--border-light-color);
    color: var(--link-primary-color-hover);
    cursor: pointer;
    display: flex;
    margin: 0;
    padding: 1.2rem 2rem;
    position: relative;

    &:focus {
        background: var(--input-bg-light);
    }

    &:last-child {
        border: none;
    }

    &-actions {
        display: flex;
        margin-left: auto;

        &-disabled {
            opacity: .75;
            pointer-events: none;
        }

        &-btn {
            align-items: center;
            background: var(--bg-primary);
            position: relative;
            border-radius: 50%;
            display: inline-flex;
            height: 3rem;
            justify-content: center;
            margin: 0 2px;
            opacity: 0;
            position: relative;
            text-align: center;
            width: 3rem;

            &:active,
            &:focus,
            &:hover {
                color: var(--headings-color);
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
                transition: var(--transition);
                width: 1.6rem;
            }

            &.delete {

                &:hover {

                    & > svg {
                       fill: var(--warning);
                   }
                }
            }

            &.is-duplicating {
                &::after { 
                   animation: spin .9s infinite linear;
                   border-top: 2px solid rgba(var(--color-primary-rgb), .2);
                   border-right: 2px solid rgba(var(--color-primary-rgb), .2);
                   border-bottom: 2px solid rgba(var(--color-primary-rgb), .2);
                   border-left: 2px solid var(--color-primary);
                   border-radius: 50%;
                   content: "";
                   display: block;
                   height: 100%;
                   width: 100%;
                   @include centerXY(true, true);

                    @at-root {
                        @keyframes spin {
                            100% {
                                transform: translate(-50%, -50%) rotate(360deg);
                            }
                        }
                    }
                }

                svg {
                    opacity: 0;
                }
            }
        }
    }

    &-icon {
        align-items: center;
        border-radius: 3px;
        color: currentColor;
        display: flex;
        height: auto;
        justify-content: center;
        margin-right: 1.5rem;
        position: relative;
        width: 3.3rem;
    }

    &:hover,
    &.is-duplicating {
        background: var(--collection-bg-hover);
        box-shadow: inset 3px 0 0 var(--color-primary);
        color: var(--link-primary-color);
        will-change: transform;

        .single-site-actions-btn {
            opacity: 1;
        }
    }

    &-name {
        display: block;    
        font-weight: var(--font-weight-semibold);
        line-height: 3.6rem;
        margin: 0;
        overflow: hidden;
        padding: 0;
        text-align: left;
        text-overflow: ellipsis;
        transition: var(--transition);
        white-space: nowrap;
        max-width: 82%;

        span {
            display: block;
            line-height: 1.4;
        }

        small {
            color: var(--gray-4);
            display: block;
            line-height: 1.4;
            white-space: normal;
        }
    }
}
</style>


