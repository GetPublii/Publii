<template>
    <div
        v-if="isVisible"
        :class="['overlay', { 'is-local': local }]"
        @keydown="onDialogKeyDown">
        <div
            ref="dialog"
            class="popup popup-link-add"
            :role="local ? 'dialog' : null"
            :aria-modal="local ? 'true' : null"
            :aria-label="local ? $t('link.insertEditLink') : null"
            tabindex="-1">
            <div class="message">
                <h1>{{ $t('link.insertEditLink') }}</h1>

                <field
                    :id="fieldID('type')" :label="$t('link.selectLinkType') + ':'">
                    <v-select
                        :id="fieldID('type')"
                        slot="field"
                        ref="linkTypeSelect"
                        v-model="type"
                        :options="linkTypes"
                        :searchable="false"
                        :custom-label="customTypeLabels"
                        :show-labels="false"
                        :placeholder="$t('link.selectLinkType')"></v-select>
                </field>

                <field
                    :id="fieldID('post')"
                    v-if="type === 'post'"
                    :label="$t('post.postName')">
                    <v-select
                        :id="fieldID('post')"
                        slot="field"
                        ref="postPagesSelect"
                        :options="postPages"
                        :options-limit="100"
                        v-model="post"
                        :custom-label="customPostLabels"
                        :close-on-select="true"
                        :show-labels="false"
                        @select="closeDropdown('postPagesSelect')"
                        :placeholder="$t('post.selectPostPage')"></v-select>
                </field>

                <field
                    :id="fieldID('page')"
                    v-if="type === 'page'"
                    :label="$t('page.pageName')">
                    <v-select
                        :id="fieldID('page')"
                        slot="field"
                        ref="pageItemsSelect"
                        :options="pageItems"
                        :options-limit="100"
                        v-model="page"
                        :custom-label="customPageLabels"
                        :close-on-select="true"
                        :show-labels="false"
                        @select="closeDropdown('pageItemsSelect')"
                        :placeholder="$t('page.selectPage')"></v-select>
                </field>

                <field
                    :id="fieldID('tag')"
                    v-if="type === 'tag'"
                    :label="$t('tag.tagName')">
                    <v-select
                        :id="fieldID('tag')"
                        slot="field"
                        ref="tagPagesSelect"
                        :options="tagPages"
                        :options-limit="100"
                        v-model="tag"
                        :custom-label="customTagLabels"
                        :close-on-select="true"
                        :show-labels="false"
                        @select="closeDropdown('tagPagesSelect')"
                        :placeholder="$t('tag.selectTagPage')"></v-select>
                </field>

                <field
                    :id="fieldID('author')"
                    v-if="type === 'author'"
                    :label="$t('author.authorName') + ':'">
                    <v-select
                        :id="fieldID('author')"
                        slot="field"
                        ref="authorPagesSelect"
                        :options="authorPages"
                        :options-limit="100"
                        v-model="author"
                        :custom-label="customAuthorsLabels"
                        :close-on-select="true"
                        :show-labels="false"
                        @select="closeDropdown('authorPagesSelect')"
                        :placeholder="$t('author.selectAuthorPage')"></v-select>
                </field>

                <field
                    :id="fieldID('external')"
                    v-if="type === 'external'"
                    :label="$t('ui.customLink') + ':'">
                    <input
                        :id="fieldID('external')"
                        slot="field"
                        type="text"
                        spellcheck="false"
                        v-model="external"
                        class="link-popup-field-external" />
                </field>

                <field
                    :id="fieldID('file')"
                    v-if="type === 'file'"
                    :label="$t('file.fileSemicolon')">
                    <v-select
                        :id="fieldID('file')"
                        slot="field"
                        ref="fileSelect"
                        :options="filesList"
                        :options-limit="100"
                        v-model="file"
                        :close-on-select="true"
                        :show-labels="false"
                        @select="closeDropdown('fileSelect')"
                        :placeholder="$t('file.selectFile')"></v-select>
                </field>

                <field
                    :id="fieldID('target')"
                    v-if="!markdown"
                    :label="$t('ui.linkTarget') + ':'">
                    <v-select
                        :id="fieldID('target')"
                        slot="field"
                        ref="targetSelect"
                        :options="targetList"
                        v-model="target"
                        :custom-label="customTargetLabels"
                        :close-on-select="true"
                        :show-labels="false"
                        @select="closeDropdown('targetSelect')"
                        :placeholder="$t('ui.selectOption')"></v-select>
                </field>

                <field
                    :id="fieldID('label')" :label="$t('settings.linkLabel') + ':'">
                    <input
                        :id="fieldID('label')"
                        slot="field"
                        type="text"
                        :spellcheck="$store.state.currentSite.config.spellchecking"
                        v-model="label"
                        class="link-popup-field-label" />
                </field>

                <field
                    :id="fieldID('title')"
                    v-if="!markdown"
                    :label="$t('link.linkTitleAttribute')">
                    <input
                        :id="fieldID('title')"
                        slot="field"
                        type="text"
                        :spellcheck="$store.state.currentSite.config.spellchecking"
                        v-model="title"
                        class="link-popup-field-title" />
                </field>

                <field
                    :id="fieldID('cssClass')"
                    v-if="!markdown"
                    :label="$t('link.linkClassAttribute')">
                    <input
                        :id="fieldID('cssClass')"
                        slot="field"
                        type="text"
                        :spellcheck="$store.state.currentSite.config.spellchecking"
                        v-model="cssClass"
                        class="link-popup-field-class" />
                </field>

                <field
                    v-if="!markdown"
                    :label="$t('link.linkRelAttribute')">
                    <switcher
                        slot="field"
                        label="nofollow"
                        v-model="rel.nofollow" />
                    <switcher
                        slot="field"
                        label="sponsored"
                        v-model="rel.sponsored" />
                    <switcher
                        slot="field"
                        label="ugc"
                        v-model="rel.ugc" />
                </field>

                <field
                    v-if="!markdown && type === 'file'"
                    :label="$t('link.downloadAttribute')">
                    <switcher
                        slot="field"
                        :accessible-label="$t('link.downloadAttribute')"
                        label=""
                        v-model="downloadAttr" />
                </field>
            </div>

            <div class="buttons">
                <p-button
                    size="medium"
                    width="half"
                    square
                    :disabled="local && !canSubmit"
                    @click.native="setLink">
                    {{ $t('ui.ok') }}
                </p-button>

                <p-button
                    appearance="popup-cancel"
                    size="medium"
                    width="half"
                    square
                    @click.native="cancel">
                    {{ $t('ui.cancel') }}
                </p-button>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'link-popup',
    props: {
        local: {
            type: Boolean,
            default: false
        },
        'markdown': {
            default: false
        }
    },
    data () {
        return {
            postID: 0,
            isVisible: false,
            easymdeInstance: null,
            type: 'external',
            post: null,
            page: null,
            tag: null,
            author: null,
            file: null,
            external: '',
            target: '',
            label: '',
            title: '',
            cssClass: '',
            downloadAttr: false,
            rel: {
                nofollow: false,
                sponsored: false,
                ugc: false
            },
            filesList: []
        };
    },
    computed: {
        canSubmit () {
            if (this.type === 'external') {
                return this.external.trim() !== '';
            }

            return ['tags', 'frontpage', 'blogpage'].includes(this.type) ||
                (this[this.type] !== null && this[this.type] !== '');
        },
        linkTypes () {
            return [ 'external', 'post', 'page', 'tag', 'tags', 'author', 'frontpage', 'blogpage', 'file' ];
        },
        tagPages () {
            return this.$store.state.currentSite.tags.filter(tag => tag.additionalData.indexOf('"isHidden":true') === -1).sort((a, b) => {
                return a.name.localeCompare(b.name);
            }).map(tag => tag.id);
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
            return this.$store.state.currentSite.posts.filter(post => post.status.indexOf('published') > -1).sort((a, b) => {
                return a.title.localeCompare(b.title);
            }).map(post => post.id);
        },
        pageItems () {
            return this.$store.state.currentSite.pages.filter(page => page.status.indexOf('published') > -1).sort((a, b) => {
                return a.title.localeCompare(b.title);
            }).map(page => page.id);
        },
        targetList () {
            return [ '-', '_blank' ];
        },
        postTitlesById () {
            let map = new Map();

            for (let post of this.$store.state.currentSite.posts) {
                map.set(post.id, post.title);
            }

            return map;
        },
        pageTitlesById () {
            let map = new Map();

            for (let page of this.$store.state.currentSite.pages) {
                map.set(page.id, page.title);
            }

            return map;
        },
        tagNamesById () {
            let map = new Map();

            for (let tag of this.$store.state.currentSite.tags) {
                map.set(tag.id, tag.name);
            }

            return map;
        },
        authorNamesByUsername () {
            let map = new Map();

            for (let author of this.$store.state.currentSite.authors) {
                map.set(author.username, author.name);
            }

            return map;
        }
    },
    mounted () {
        if (!this.local) {
            this.$bus.$on('init-link-popup', this.open);
            this.loadFiles();
            this.$bus.$on('link-popup-updated', this.addLink);
        }
    },
    methods: {
        fieldID (name) {
            return 'link-popup-' + this._uid + '-' + name;
        },
        open (config) {
            this.cleanPopup();
            this.postID = config.postID;
            if (this.local) {
                this.label = config.label || '';
                const attributes = config.attributes;
                if (attributes) {
                    this.title = attributes.title || '';
                    this.cssClass = attributes.class || '';
                    this.target = attributes.target || '';
                    this.downloadAttr = attributes.download !== null;
                    Object.keys(this.rel).forEach(name => {
                        this.rel[name] = (attributes.rel || '').split(/\s+/).includes(name);
                    });
                    this.parseUrlContent(['', attributes.href]);
                }
            } else {
                this.parseContent(config.selection);
            }
            this.isVisible = true;

            if (this.local) {
                this.loadFiles();
                this.$nextTick(() => {
                    if (!this.isVisible || this._isDestroyed) return;
                    // Sidebars create their own stacking context; keep the dialog above them.
                    document.body.appendChild(this.$el);
                    this.$refs.dialog.focus({ preventScroll: true });
                });
            }
        },
        onDialogKeyDown (event) {
            if (!this.local || !this.isVisible) return;
            event.stopPropagation();

            if (event.key === 'Escape') {
                event.preventDefault();
                const dropdown = Object.values(this.$refs).find(ref => ref && ref.isOpen);
                if (dropdown) {
                    dropdown.deactivate();
                } else {
                    this.cancel();
                }
            } else if (event.key === 'Tab') {
                const controls = Array.from(this.$refs.dialog.querySelectorAll(
                    'button:not([disabled]), input:not([disabled]), [tabindex="0"]'
                )).filter(element => element.tabIndex >= 0 && element.getBoundingClientRect().width > 0 && element.getBoundingClientRect().height > 0);
                if (!controls.length) return;
                const first = controls[0];
                const last = controls[controls.length - 1];
                if (event.shiftKey && (document.activeElement === first || document.activeElement === this.$refs.dialog)) {
                    event.preventDefault();
                    last.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
            }
        },
        resolve (response) {
            this.cleanPopup();
            this.isVisible = false;
            if (this.local) {
                this.$emit('resolve', response);
            } else {
                this.$bus.$emit('link-popup-updated', response);
            }
        },
        customTypeLabels (value) {
            switch (value) {
                case 'post': return this.$t('post.postLink');
                case 'page': return this.$t('page.pageLink');
                case 'tag': return this.$t('tag.tagLink');
                case 'tags': return this.$t('tag.tagsListLink');
                case 'author': return this.$t('author.authorLink');
                case 'frontpage': return this.$t('ui.frontpageLink');
                case 'blogpage': return this.$t('ui.blogIndexLink');
                case 'external': return this.$t('ui.customLink');
                case 'file': return this.$t('file.fileFromFileManager');
            }
        },
        customTagLabels (value) {
            return this.tagNamesById.get(value);
        },
        customAuthorsLabels (value) {
            return this.authorNamesByUsername.get(value);
        },
        customPostLabels (value) {
            return this.postTitlesById.get(value);
        },
        customPageLabels (value) {
            return this.pageTitlesById.get(value);
        },
        customTargetLabels (value) {
            if (value === '-') {
                return this.$t('ui.sameWindow');
            }

            if (value === '_blank') {
                return this.$t('ui.newWindow');
            }
        },
        closeDropdown (refID) {
            this.$refs[refID].isOpen = false;
        },
        cleanPopup () {
            this.type = 'external';
            this.post = null;
            this.page = null;
            this.tag = null;
            this.author = null;
            this.file = null;
            this.external = '';
            this.target = '';
            this.downloadAttr = false;
            this.label = '';
            this.title = '';
            this.cssClass = '';
            this.rel = {
                nofollow: false,
                sponsored: false,
                ugc: false
            };
        },
        parseContent (content) {
            if (!content) {
                return;
            }

            if (this.markdown) {
                this.parseMarkdownContent(content);
            } else {
                this.parseHTMLContent(content);
            }
        },
        parseHTMLContent (content) {
            let linkContent = content.match(/>(.*?)<\/a>/);
            let titleContent = content.match(/title="(.*?)"/);
            let classContent = content.match(/class="(.*?)"/);
            let targetContent = content.match(/target="(.*?)"/);
            let urlContent = content.match(/href="(.*?)"/);
            let relContent = content.match(/rel="(.*?)"/);
            let downloadContent = content.match(/<a.*?(download="download").*?>/);

            this.type = 'external';

            if (linkContent && linkContent[1]) {
                this.label = linkContent[1];
            } else {
                this.label = content;
            }

            if (titleContent && titleContent[1]) {
                this.title = titleContent[1];
            }

            if (classContent && classContent[1]) {
                this.cssClass = classContent[1];
            }

            if (targetContent && targetContent[1]) {
                this.target = targetContent[1];
            }

            if (downloadContent && downloadContent[1]) {
                this.downloadAttr = true;
            }

            this.parseUrlContent(urlContent);

            let relValues = ['nofollow', 'sponsored', 'ugc'];

            for (let i = 0; i < relValues.length; i++) {
                if (relContent && relContent[1].indexOf(relValues[i]) > -1) {
                    this.rel[relValues[i]] = true;
                }
            }
        },
        parseMarkdownContent (content) {
            let linkContent = content.match(/\[(.*?)\]/);
            let urlContent = content.match(/\((.*?)\)/);
            this.type = 'external';

            if (linkContent && linkContent[1]) {
                this.label = linkContent[1];
            } else {
                this.label = content;
            }

            this.parseUrlContent(urlContent);
        },
        parseUrlContent (urlContent) {
            if (urlContent && urlContent[1]) {
                if (urlContent[1].indexOf('#INTERNAL_LINK#/post/') === 0) {
                    let id = urlContent[1].replace('#INTERNAL_LINK#/post/', '');
                    this.type = 'post';
                    this.post = parseInt(id, 10);
                } else if (urlContent[1].indexOf('#INTERNAL_LINK#/page/') === 0) {
                    let id = urlContent[1].replace('#INTERNAL_LINK#/page/', '');
                    this.type = 'page';
                    this.page = parseInt(id, 10);
                } else if (urlContent[1].indexOf('#INTERNAL_LINK#/tag/') === 0) {
                    let id = urlContent[1].replace('#INTERNAL_LINK#/tag/', '');
                    this.type = 'tag';
                    this.tag = parseInt(id, 10);
                } else if (urlContent[1].indexOf('#INTERNAL_LINK#/tags/') === 0) {
                    this.type = 'tags';
                } else if (urlContent[1].indexOf('#INTERNAL_LINK#/author/') === 0) {
                    let id = urlContent[1].replace('#INTERNAL_LINK#/author/', '');
                    this.type = 'author';
                    this.author = id;
                } else if (urlContent[1].indexOf('#INTERNAL_LINK#/frontpage/') === 0) {
                    this.type = 'frontpage';
                } else if (urlContent[1].indexOf('#INTERNAL_LINK#/blogpage/') === 0) {
                    this.type = 'blogpage';
                } else if (urlContent[1].indexOf('#INTERNAL_LINK#/file/') === 0) {
                    this.type = 'file';
                    this.file = urlContent[1].replace('#INTERNAL_LINK#/file/', '');
                } else {
                    this.type = 'external';
                    this.external = urlContent[1];
                }
            }
        },
        setLink () {
            if (this.local && !this.canSubmit) return;
            let response = {
                url: '',
                title: '',
                cssClass: '',
                target: '',
                text: this.label,
                rel: this.rel,
                downloadAttr: this.downloadAttr
            };

            if (this.type !== 'external') {
                if (this.type === 'tags') {
                    response.url = '#INTERNAL_LINK#/tags/1';
                } else if (this.type === 'frontpage') {
                    response.url = '#INTERNAL_LINK#/frontpage/1';
                } else if (this.type === 'blogpage') {
                    response.url = '#INTERNAL_LINK#/blogpage/1';
                } else {
                    response.url = '#INTERNAL_LINK#/' + this.type + '/' + this[this.type];
                } 
            } else {
                response.url = this.external;
            }

            if (this.target !== '' && this.target !== '-') {
                response.target = ' target="' + this.target + '"';
            }

            if (this.title.trim() !== '') {
                response.title = ' title="' + this.title + '"';
            }

            if (this.cssClass.trim() !== '') {
                response.cssClass = ' class="' + this.cssClass + '"'
            }

            if (this.local) {
                const rel = Object.keys(this.rel).filter(name => this.rel[name]);
                if (this.target === '_blank') rel.push('noopener', 'noreferrer');
                if (!response.text) {
                    const labels = {
                        post: this.postTitlesById.get(this.post),
                        page: this.pageTitlesById.get(this.page),
                        tag: this.tagNamesById.get(this.tag),
                        author: this.authorNamesByUsername.get(this.author),
                        file: this.file,
                        external: response.url
                    };
                    response.text = labels[this.type] || this.customTypeLabels(this.type);
                }
                response.attributes = {
                    href: response.url,
                    title: this.title || null,
                    class: this.cssClass || null,
                    target: this.target === '_blank' ? '_blank' : null,
                    rel: rel.join(' ') || null,
                    download: this.type === 'file' && this.downloadAttr ? 'download' : null
                };
            }
            this.resolve(response);
        },
        cancel () {
            this.resolve(false);
        },
        addLink (response) {
            if (this.markdown) {
                this.addLinkMarkdown(response);
            } else {
                this.addLinkHTML(response);
            }
        },
        addLinkMarkdown (response) {
            if (response) {
                this.easymdeInstance.codemirror.replaceSelections([`[${response.text}](${response.url})`]);
            }
        },
        addLinkHTML (response) {
            if ($('#link-toolbar').css('display') !== 'none' || $('#inline-toolbar').css('display') !== 'none') {
                console.log('STOP1');
                return;
            }

            if (response) {
                let relAttr = [];
                let downloadAttr = '';

                if (response.rel && response.rel.nofollow) {
                    relAttr.push('nofollow');
                }

                if (response.rel && response.rel.sponsored) {
                    relAttr.push('sponsored');
                }

                if (response.rel && response.rel.ugc) {
                    relAttr.push('ugc');
                }

                if (response.target.indexOf('_blank') > -1) {
                    relAttr.push('noopener');
                    relAttr.push('noreferrer');
                }

                if (relAttr.length) {
                    relAttr = ' rel="' + relAttr.join(' ') + '"';
                }

                if (response.downloadAttr && response.url.indexOf('#INTERNAL_LINK#/file/') > -1) {
                    downloadAttr = ' download="download" '
                }

                let linkHTMLStart = `<a href="${response.url}"${response.title}${response.cssClass}${response.target}${relAttr}${downloadAttr}>`;
                let linkHTMLContent = response.text;
                let linkHTMLEnd = `</a>`;

                if (linkHTMLContent === '') {
                    linkHTMLContent = tinymce.activeEditor.selection.getContent();
                }

                tinymce.activeEditor.selection.setContent(linkHTMLStart + linkHTMLContent + linkHTMLEnd);
            }
        },
        setEasyMdeInstance (instance) {
            this.easymdeInstance = instance;
        },
        loadFiles () {
            if (this._filesLoading) return;
            this._filesLoading = true;
            mainProcessAPI.send('app-file-manager-list', {
                siteName: this.$store.state.currentSite.config.name,
                dirPath: 'root-files'
            });

            mainProcessAPI.receiveOnce('app-file-manager-listed', (data) => {
                if (this._isDestroyed) return;
                this.filesList = data.map(file => file.name);

                mainProcessAPI.send('app-file-manager-list', {
                    siteName: this.$store.state.currentSite.config.name,
                    dirPath: 'media/files'
                });

                mainProcessAPI.receiveOnce('app-file-manager-listed', (data) => {
                    this._filesLoading = false;
                    if (this._isDestroyed) return;
                    this.filesList = this.filesList.concat(data.map(file => 'media/files/' + file.name));
                });
            });
        }
    },
    beforeDestroy () {
        if (!this.local) {
            this.$bus.$off('init-link-popup', this.open);
            this.$bus.$off('link-popup-updated', this.addLink);
        }
        if (this.local && this.$el.parentNode === document.body) {
            document.body.removeChild(this.$el);
        }
    }
}
</script>

<style scoped>
@import '../../css/popup-common.css';

.overlay {
    z-index: var(--layer-dialog);

    &.is-local {
        display: flex;
        overflow: auto;
        padding: var(--space-6);

        .popup {
            flex-shrink: 0;
            left: auto;
            margin: auto;
            max-width: 100%;
            min-width: 0;
            position: relative;
            top: auto;
            transform: none;
            width: 60rem;
        }
    }
}

h1 {
    text-align: center;
}

.popup {
    max-width: 60rem;
    min-width: 60rem;
    padding: 4rem;

    &.popup-link-add {
        overflow: visible;
    }

    .field {
        .switcher {
            float: left;
            top: -3px;
        }
    }
}

.message {
    font-size: var(--font-size-ui-lg);
    padding: 0;
}

.buttons {
    display: flex;
    margin: 4rem -4rem -4rem -4rem;
    position: relative;
    text-align: center;
    top: 1px;

    & > .button {
        border-radius: 0 0 0 .6rem;

        & + .button {
            border-radius: 0 0 .6rem 0;
        }
    }
}
</style>
