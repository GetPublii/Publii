<template>
    <div class="menu-item-editor-wrapper">
        <div class="menu-item-editor">
            <h2>
                <template v-if="menuItemID !== ''">Edit menu item</template>
                <template v-if="menuItemID === ''">Add new menu item</template>
            </h2>

            <a
                href="#"
                class="menu-item-editor-close"
                @click.prevent="hide()">
                <icon
                    size="m"
                    name="sidebar-close" />
            </a>

            <label
                :class="{ 'is-invalid': errors.indexOf('label') > -1 }"
                key="menu-item-editor-field-label">
                <span>Label</span>
                <input
                    v-model="label"
                    @keyup.native="cleanError('label')"
                    type="text">
            </label>

            <label
                :class="{ 'is-invalid': errors.indexOf('type') > -1 }"
                key="menu-item-editor-field-type">
                <span>Type</span>
                <v-select
                    v-model="type"
                    @click.native="cleanError('type')"
                    :options="linkTypes"
                    :searchable="false"
                    :custom-label="customTypeLabels"
                    :show-labels="false"
                    placeholder="Select item type"></v-select>
            </label>

            <label
                v-if="type === 'internal'"
                :class="{ 'is-invalid': errors.indexOf('internalLink') > -1 }"
                key="menu-item-editor-field-internal">
                <span>Internal link</span>
                <input
                    v-model="internalLink"
                    @keyup.native="cleanError('internalLink')"
                    type="text" />
            </label>

            <label
                v-if="type === 'external'"
                :class="{ 'is-invalid': errors.indexOf('externalLink') > -1 }"
                key="menu-item-editor-field-external">
                <span>External URL</span>
                <input
                    v-model="externalLink"
                    @keyup.native="cleanError('externalLink')"
                    type="text" />
            </label>

            <label
                v-if="type === 'tag'"
                :class="{ 'is-invalid': errors.indexOf('tagPage') > -1 }"
                key="menu-item-editor-field-tag">
                <span>Tag page</span>
                <v-select
                    ref="tagPagesSelect"
                    :options="tagPages"
                    @click.native="cleanError('tagPage')"
                    v-model="tagPage"
                    :custom-label="customTagLabels"
                    :close-on-select="true"
                    :show-labels="false"
                    @select="closeDropdown('tagPagesSelect')"
                    placeholder="Select tag page"></v-select>
            </label>

            <label
                v-if="type === 'author'"
                :class="{ 'is-invalid': errors.indexOf('authorPage') > -1 }"
                key="menu-item-editor-field-author">
                <span>Author page</span>
                <v-select
                    ref="authorPagesSelect"
                    :options="authorPages"
                    @click.native="cleanError('authorPage')"
                    v-model="authorPage"
                    :custom-label="customAuthorsLabels"
                    :close-on-select="true"
                    :show-labels="false"
                    @select="closeDropdown('authorPagesSelect')"
                    placeholder="Select author page"></v-select>
            </label>

            <label
                v-if="type === 'post'"
                :class="{ 'is-invalid': errors.indexOf('postPage') > -1 }"
                key="menu-item-editor-field-post">
                <span>Post page</span>
                <v-select
                    ref="postPagesSelect"
                    :options="postPages"
                    @click.native="cleanError('postPage')"
                    v-model="postPage"
                    :custom-label="customPostLabels"
                    :close-on-select="true"
                    :show-labels="false"
                    @select="closeDropdown('postPagesSelect')"
                    placeholder="Select post page"></v-select>
            </label>

            <label key="menu-item-editor-field-title">
                <span>Link Title attribute</span>
                <input
                    v-model="title"
                    type="text" />
            </label>

            <label key="menu-item-editor-field-cssclass">
                <span>CSS class</span>
                <input
                    v-model="cssClass"
                    type="text" />
            </label>

            <div class="menu-item-editor-buttons">
                <p-button
                    v-if="menuItemID !== ''"
                    type="primary"
                    @click.native="editMenuItem">
                    Save changes
                </p-button>

                <p-button
                    v-if="menuItemID === ''"
                    type="primary"
                    @click.native="addMenuItem">
                    Add menu item
                </p-button>

                <p-button
                    @click.native="hide()"
                    type="outline">
                    Cancel
                </p-button>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'menu-item-editor',
    data () {
        return {
            isVisible: false,
            id: '',
            menuItemID: '',
            parentID: '',
            menuID: '',
            label: '',
            title: '',
            type: '',
            cssClass: '',
            internalLink: '',
            externalLink: '',
            tagPage: '',
            authorPage: '',
            postPage: '',
            errors: []
        };
    },
    computed: {
        linkTypes () {
            return [ 'post', 'tag', 'author', 'frontpage', 'internal', 'external', 'separator' ];
        },
        tagPages () {
            return this.$store.state.currentSite.tags.map(tag => tag.id);
        },
        authorPages () {
            return this.$store.state.currentSite.authors.map(author => author.username).sort((a, b) => {
                if (a.toLowerCase() < b.toLowerCase()) {
                    return -1;
                }

                if (a.toLowerCase() > b.toLowerCase()) {
                    return 1;
                }

                return 0;
            });
        },
        postPages () {
            return this.$store.state.currentSite.posts.map(post => post.id);
        }
    },
    mounted () {
        this.$bus.$on('show-menu-item-editor', params => {
            this.reset();
            this.menuItemID = params.menuItemID || '';
            this.parentID = params.parentID || '';

            if(params.menuID || params.menuID === 0) {
                this.menuID = params.menuID;
            } else {
                this.menuID = '';
            }

            this.label = params.label || '';
            this.title = params.title || '';
            this.cssClass = params.cssClass || '';

            setTimeout(() => {
                this.type = params.type || '';
                this.setLinkValue(params.link);
            }, 0);
        });
    },
    methods: {
        customTypeLabels (value) {
            switch (value) {
                case 'post': return 'Post link';
                case 'tag': return 'Tag link';
                case 'author': return 'Author link';
                case 'frontpage': return 'Frontpage link';
                case 'internal': return 'Internal link';
                case 'external': return 'External link';
                case 'separator': return 'Text separator';
            }
        },
        customTagLabels (value) {
            return this.$store.state.currentSite.tags.filter(tag => tag.id === value).map(tag => tag.name)[0];
        },
        customAuthorsLabels (value) {
            return this.$store.state.currentSite.authors.filter(author => author.username === value).map(author => author.name)[0];
        },
        customPostLabels (value) {
            return this.$store.state.currentSite.posts.filter(post => post.id === value).map(post => post.title)[0];
        },
        closeDropdown (refID) {
            this.$refs[refID].isOpen = false;
        },
        reset () {
            this.menuItemID = Date.now();
            this.parentID = '';
            this.menuID = '';
            this.label = '';
            this.title = '';
            this.type = '';
            this.cssClass = '';
            this.internalLink = '';
            this.externalLink = '';
            this.tagPage = '';
            this.authorPage = '';
            this.postPage = '';
            this.errors = [];
        },
        hide () {
            this.reset();
            this.$bus.$emit('hide-menu-item-editor');
        },
        validate() {
            this.errors = [];

            if(this.label === '') {
                this.errors.push('label');
            }

            if(this.type === '') {
                this.errors.push('type');
            }

            if(this.type === 'post' && !(!!this.postPage)) {
                this.errors.push('postPage');
            }

            if(this.type === 'tag' && !(!!this.tagPage)) {
                this.errors.push('tagPage');
            }

            if(this.type === 'author' && !(!!this.authorPage)) {
                this.errors.push('authorPage');
            }

            if(this.type === 'external' && !(!!this.externalLink)) {
                this.errors.push('externalLink')
            }

            if(this.type === 'internal' && !(!!this.internalLink)) {
                this.errors.push('internalLink');
            }

            if(this.errors.length) {
                this.$bus.$emit('message-display', {
                    message: 'Please fill all required fields',
                    type: 'warning',
                    lifeTime: 3
                });
            }

            return this.errors.length === 0;
        },
        cleanError (field) {
            let pos = this.errors.indexOf(field);

            if (pos !== -1) {
                this.errors.splice(pos, 1);
            }
        },
        addMenuItem () {
            if (!this.validate()) {
                return;
            }

            let menuItem = {
                id: new Date().getTime(),
                label: this.label,
                title: this.title,
                type: this.type,
                link: this.getLinkValue(),
                cssClass: this.cssClass,
                items: []
            };

            if(this.parentID === '') {
                this.$store.commit('addNewMenuItem', {
                    menuItem: menuItem,
                    menuID: this.menuID
                });
            } else {
                this.$store.commit('addNewSubmenuItem', {
                    menuItem: menuItem,
                    menuID: this.menuID,
                    parentID: this.parentID
                });
            }

            this.hide();
            this.$bus.$emit('save-new-menu-structure');
        },
        editMenuItem () {
            if (!this.validate()) {
                return;
            }

            let menuItem = {
                id: this.menuItemID,
                label: this.label,
                title: this.title,
                type: this.type,
                link: this.getLinkValue(),
                cssClass: this.cssClass
            };

            this.$store.commit('editMenuItem', {
                menuItem: menuItem,
                menuID: this.menuID
            });

            this.hide();
            this.$bus.$emit('save-new-menu-structure');
        },
        getLinkValue () {
            let type = this.type;

            switch (type) {
                case 'post':      return this.postPage;
                case 'tag':       return this.tagPage;
                case 'author':    return this.authorPage;
                case 'frontpage': return 'empty';
                case 'internal':  return this.internalLink;
                case 'external':  return this.externalLink;
                case 'separator': return '';
            }
        },
        setLinkValue (value) {
            this.internalLink = this.type === 'internal' ? value : '';
            this.externalLink = this.type === 'external' ? value : '';
            this.tagPage = this.type === 'tag' ? value : '';
            this.authorPage = this.type === 'author' ? value : '';
            this.postPage = this.type === 'post' ? value : '';
        }
    },
    beforeDestroy () {
        this.$bus.$off('show-menu-item-editor');
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.menu-item-editor {
    padding: 3.6rem;

    &-wrapper {
        background: $post-editor-sidebar-color;
        box-shadow: -4px 0px 6px rgba(0, 0, 0, 0.075);
        height: 100%;
        overflow: auto;
        position: absolute;
        top: 0;
        width: 50rem;
        z-index: 10;
    }

    h2 {
        background: $color-10;
        border-bottom: 1px solid rgba($color-8, .25);
        font-size: 1.8rem;
        font-weight: 400;
        margin: -3.6rem -3.6rem 2rem -3.6rem;
        padding: calc(1rem + 0.6vw) 3.6rem;
        text-transform: none;
    }

    label {
        display: block;
        line-height: 2;
        margin-bottom: 1.5rem;

        span {
            display: block;
            font-weight: 400;
        }

        input {
            width: 100%;
        }

        &.is-invalid {
            input {
                box-shadow: inset 0 0 0 1px $color-3;
            }
        }
    }

    &-close {
        position: absolute;
        right: 3.6rem;
        top: 2rem;

        .icon {
            fill: $color-3;
        }

        &:hover {
            .icon {
                fill: $color-5;
            }
        }
    }

    &-buttons {
        padding: 2rem 0 0 0;
    }
}
</style>
