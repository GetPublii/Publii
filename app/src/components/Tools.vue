<template>
    <section class="content tools">
        <p-header title="Tools" />

        <ul class="tools-list">
            <li
                v-for="(item, key) in items"
                :key="key"
                @mouseover="setActiveItem(key)"
                @mouseleave="setInactiveItem">
                <router-link :to="getUrl(item.link)">
                    <icon
                        :name="item.icon"
                        size="m" />
                    {{ item.name }}
                </router-link>
            </li>
        </ul>

        <div class="tools-description">
            <div class="tools-tab">
                <h2>Description:</h2>

                <div v-html="currentDescription"></div>
            </div>
        </div>
    </section>
</template>

<script>
export default {
    name: 'tools',
    data: function() {
        return {
            defaultDescription: `<p>Hover a tool from the list to see its description.</p>`,
            currentDescription: `<p>Hover a tool from the list to see its description.</p>`,
            items: [{
                    name: 'Backups',
                    link: 'tools/backups',
                    icon: 'backup',
                    description: `<p>Protect your site from server crashes or other data loss using the backup and restore tools included with Publii. Instantly create multiple backups of your complete site content and settings and safely store them locally.</p>
                    <p>Should you need to roll back to an earlier version of your site or rebuild it after a server crash, a few clicks will get your site content back up and running, ready to be synced to your server.</p>`
                }, {
                    name: 'Regenerate Thumbnails',
                    link: 'tools/regenerate-thumbnails',
                    icon: 'sidebar-image',
                    description: `<p>Every theme available with Publii can make use of thumbnails in its design; thumbnail versions of images may be used for article previews or other highlights for your content, but each theme will have its own particular settings.</p>
                    <p>When switching to a new theme the thumbnail settings may change, causing visual issues on your site. By using the Regenerate Thumbnails tool you can re-create your content&#39;s thumbnails to meet the new theme&#39;s requirements.</p>`
                }, {
                    name: 'Custom CSS',
                    link: 'tools/custom-css',
                    icon: 'css',
                    description: `<p>With the right know-how it&#39;s easy to add your own styling to the Publii themes; a little bit of CSS code can go a long way. If you&#39;ve got an idea for making a theme your own, the Custom CSS code tool is just the ticket.</p>
                    <p>Whether you wish to insert entirely new pieces of CSS, or override existing elements with your own rules, by using this tool you can avoid fiddling directly with CSS files; just open, modify and go.</p>`
                }, {
                    name: 'Custom HTML',
                    link: 'tools/custom-html',
                    icon: 'code',
                    description: `<p>Some site tools or other elements require custom HTML code to be inserted into a webpage; the Custom HTML Code tool in Publii allows you to inject your own HTML code easily into a theme.</p>
                    <p>Code can be added to the header, footer or body of the theme, providing a flexible, stress-free solution to expanding your website&#39;s scope.</p>`
                }, {
                    name: 'Log viewer',
                    link: 'tools/log-viewer',
                    icon: 'log',
                    description: `<p>Having problems when syncing or rendering a site? Check your logs with this tool; it can provide important information that our support team will need to resolve your issue.</p>`
                }, {
                    name: 'File manager',
                    link: 'tools/file-manager',
                    icon: 'file-manager',
                    description: `<p>Allows you to add additional files into your website root directory and also into media/files catalog. Useful if you want to add .htaccess, robots.txt files or PDF file for download.</p>`
                }, {
                    name: 'WP Importer',
                    link: 'tools/wp-importer',
                    icon: 'importer',
                    description: `<p><strong>It is an experimental feature - we recommend to use it only on newly created websites.</strong> You can import your WordPress website using the WXR file.</p>`
                }
            ]
        };
    },
    methods: {
        setActiveItem: function(key) {
            this.currentDescription = this.items[key].description;
        },
        setInactiveItem: function() {
            this.currentDescription = this.defaultDescription;
        },
        getUrl: function(link) {
            return '/site/' + this.$route.params.name + '/' + link;
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.tools {
    margin: 0 auto;
    z-index: 1;

    &-list {
        float: left;
        display: flex;
        flex-flow: row wrap;
        list-style-type: none;
        margin: -1rem;
        padding: 0;
        width: calc(55% - 3rem);

        li {
            box-shadow: inset 0 0 0 1px $color-8;
            flex-basis: calc(33% - 2rem);
            margin: 1rem;
            text-align: center;
            transition: all .25s ease-out;

            &:hover {
                box-shadow: inset 0 0 2px 1px $color-1;
            }

            a {
                align-items: center;
                color: $color-5;
                display: flex;
                flex-direction: column;
                height: 100%;
                padding: 1rem 1rem 3.5rem;
                transition: all .25s ease-out;

                &:active,
                &:focus,
                &:hover {
                    color: $link-hover-color;


                    svg {
                        fill: $link-hover-color;
                    }
                }

                svg {
                    display: block;
                    fill: $grey-icon-color;
                    height: 2.4rem;
                    margin: 2rem auto;
                    position: relative;
                    top: 5px;
                    transition: all .25s ease-out;
                    width: 2.4rem;
                }
            }
        }
    }

    &-description {
        background: $post-editor-sidebar-color;
        float: right;
        padding: 2.4rem 3.6rem;
        width: 45%;
    }

    &-tab {
        h2 {
            font-size: 1.6rem;
            font-weight: 400;
            margin: 1rem 0 0;
            text-transform: none;
        }

        div {
            font-size: 1.4rem;
            font-style: italic;
        }
    }
}

@media (max-width: 1400px) {
    .tools {
        &-list li {
            flex-basis: calc(50% - 2rem);
        }
    }
}


@media (min-width: 1920px) {
    .tools {
        &-list li {
            flex-basis: calc(25% - 2rem);
        }
    }
}

@media (min-width: 2560px) {
    .tools {
        &-list li {
            flex-basis: calc(20% - 2rem);
        }
    }
}
</style>
