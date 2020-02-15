<template>
    <section class="content tools">
        <div class="tools-container">
            <p-header title="Tools" />

            <div class="tools-list">
                <div
                    v-for="(item, key) in items">
                    <router-link :to="getUrl(item.link)">
                        <icon
                            :name="item.icon"
                            customWidth="50"
                            customHeight="46" />
                        {{ item.name }}
                    </router-link>
                </div>
            </div>
        </div>
    </section>
</template>

<script>
export default {
    name: 'tools',
    data: function() {
        return {
            items: [{
                    name: 'Backups',
                    link: 'tools/backups',
                    icon: 'backup'
                }, {
                    name: 'Custom CSS',
                    link: 'tools/custom-css', 
                    icon: 'css'
                }, {
                    name: 'Custom HTML',
                    link: 'tools/custom-html',
                    icon: 'code'
                }, {
                    name: 'File manager',
                    link: 'tools/file-manager',
                    icon: 'file-manager'
                }, {
                    name: 'Log viewer',
                    link: 'tools/log-viewer',
                    icon: 'log'
                }, {
                    name: 'Regenerate thumbnails',
                    link: 'tools/regenerate-thumbnails',
                    icon: 'regenerate-thumbnails' 
                }, {
                    name: 'WP Importer',
                    link: 'tools/wp-importer',
                    icon: 'importer'
                }
            ]
        };
    },
    methods: {
        getUrl: function(link) {
            return '/site/' + this.$route.params.name + '/' + link;
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';
    
.tools {
    
    &-container {
        margin: 0 auto;
        max-width: $wrapper;
        user-select: none;
        z-index: 1;        
    }

    &-list {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        grid-auto-rows: minmax(calc(8rem + 8vh), auto);
        grid-gap: 2rem; 

       & > div {           
            background: var(--gray-1);
            border: 1px solid transparent;   
            border-radius: 3px;
            height: 100%;
            transition: var(--transition);
            text-align: center;
            
            &:hover {
               background: var(--bg-primary);
               border-color: var(--secondary-color);
               box-shadow: 0 0 26px rgba(black, .07);
               cursor: pointer;
                
               svg {
                  fill: var(--primary-color);
               }
                
               a {
                  color: var(--primary-color);
               }
            }
           
            a {
               color: var(--text-primary-color);
               display: flex;
               flex-direction: column;
               justify-content: center;
               font-weight: 500;
               height: 100%;
               width: 100%;
            }
            
           svg {
               display: block;
               fill: var(--gray-5);
               margin: 0 auto 1rem;
               transition: inherit;
            }
        }
    }

    &-description {
        background: var(--option-sidebar-bg);
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
