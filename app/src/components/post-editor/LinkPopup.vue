<template>
    <div
        v-if="isVisible"
        class="overlay">
        <div class="popup popup-link-add">
            <div class="message">
                <h1>{{ $t('link.insertEditLink') }}</h1>

                <field :label="$t('link.selectLinkType') + ':'">
                    <v-select
                        slot="field"
                        v-model="type"
                        :options="linkTypes"
                        :searchable="false"
                        :custom-label="customTypeLabels"
                        :show-labels="false"
                        :placeholder="$t('link.selectLinkType')"></v-select>
                </field>

                <field
                    v-if="type === 'post'"
                    :label="$t('post.postName')">
                    <v-select
                        slot="field"
                        ref="postPagesSelect"
                        :options="postPages"
                        v-model="post"
                        :custom-label="customPostLabels"
                        :close-on-select="true"
                        :show-labels="false"
                        @select="closeDropdown('postPagesSelect')"
                        :placeholder="$t('post.selectPostPage')"></v-select>
                </field>

                <field
                    v-if="type === 'page'"
                    :label="$t('page.pageName')">
                    <v-select
                        slot="field"
                        ref="pageItemsSelect"
                        :options="pageItems"
                        v-model="page"
                        :custom-label="customPageLabels"
                        :close-on-select="true"
                        :show-labels="false"
                        @select="closeDropdown('pageItemsSelect')"
                        :placeholder="$t('page.selectPage')"></v-select>
                </field>

                <field
                    v-if="type === 'tag'"
                    :label="$t('tag.tagName')">
                    <v-select
                        slot="field"
                        ref="tagPagesSelect"
                        :options="tagPages"
                        v-model="tag"
                        :custom-label="customTagLabels"
                        :close-on-select="true"
                        :show-labels="false"
                        @select="closeDropdown('tagPagesSelect')"
                        :placeholder="$t('tag.selectTagPage')"></v-select>
                </field>

                <field
                    v-if="type === 'author'"
                    :label="$t('author.authorName') + ':'">
                    <v-select
                        slot="field"
                        ref="authorPagesSelect"
                        :options="authorPages"
                        v-model="author"
                        :custom-label="customAuthorsLabels"
                        :close-on-select="true"
                        :show-labels="false"
                        @select="closeDropdown('authorPagesSelect')"
                        :placeholder="$t('author.selectAuthorPage')"></v-select>
                </field>

                <field
                    v-if="type === 'external'"
                    :label="$t('ui.customLink') + ':'">
                    <input
                        slot="field"
                        type="text"
                        spellcheck="false"
                        v-model="external"
                        class="link-popup-field-external" />
                </field>

                <field
                    v-if="type === 'file'"
                    :label="$t('file.fileSemicolon')">
                    <v-select
                        slot="field"
                        ref="fileSelect"
                        :options="filesList"
                        v-model="file"
                        :close-on-select="true"
                        :show-labels="false"
                        @select="closeDropdown('fileSelect')"
                        :placeholder="$t('file.selectFile')"></v-select>
                </field>

                <field
                    v-if="!markdown"
                    :label="$t('ui.linkTarget') + ':'">
                    <v-select
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

                <field :label="$t('settings.linkLabel') + ':'">
                    <input
                        slot="field"
                        type="text"
                        :spellcheck="$store.state.currentSite.config.spellchecking"
                        v-model="label"
                        class="link-popup-field-label" />
                </field>

                <field
                    v-if="!markdown"
                    :label="$t('link.linkTitleAttribute')">
                    <input
                        slot="field"
                        type="text"
                        :spellcheck="$store.state.currentSite.config.spellchecking"
                        v-model="title"
                        class="link-popup-field-title" />
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
                        label=""
                        v-model="downloadAttr" />
                </field>
            </div>

            <div class="buttons">
                <p-button
                    type="medium no-border-radius half-width"
                    @click.native="setLink">
                    {{ $t('ui.ok') }}
                </p-button>

                <p-button
                    type="medium no-border-radius half-width cancel-popup"
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
        }
    },
    mounted () {
        this.$bus.$on('init-link-popup', config => {
            this.postID = config.postID;
            this.parseContent(config.selection);
            this.isVisible = true;
        });

        this.loadFiles();
        this.$bus.$on('link-popup-updated', this.addLink);
    },
    methods: {
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
            return this.$store.state.currentSite.tags.filter(tag => tag.additionalData.indexOf('"isHidden":true') === -1 && tag.id === value).map(tag => tag.name)[0];
        },
        customAuthorsLabels (value) {
            return this.$store.state.currentSite.authors.filter(author => author.username === value).map(author => author.name)[0];
        },
        customPostLabels (value) {
            return this.$store.state.currentSite.posts.filter(post => post.id === value).map(post => post.title)[0];
        },
        customPageLabels (value) {
            return this.$store.state.currentSite.pages.filter(page => page.id === value).map(page => page.title)[0];
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
                if (urlContent[1].indexOf('/post/') !== -1) {
                    let id = urlContent[1].replace('#INTERNAL_LINK#/post/', '');
                    this.type = 'post';
                    this.post = parseInt(id, 10);
                } else if (urlContent[1].indexOf('/page/') !== -1) {
                    let id = urlContent[1].replace('#INTERNAL_LINK#/page/', '');
                    this.type = 'page';
                    this.page = parseInt(id, 10);
                } else if (urlContent[1].indexOf('/tag/') !== -1) {
                    let id = urlContent[1].replace('#INTERNAL_LINK#/tag/', '');
                    this.type = 'tag';
                    this.tag = parseInt(id, 10);
                } else if (urlContent[1].indexOf('/tags/') !== -1) {
                    this.type = 'tags';
                } else if (urlContent[1].indexOf('/author/') !== -1) {
                    let id = urlContent[1].replace('#INTERNAL_LINK#/author/', '');
                    this.type = 'author';
                    this.author = parseInt(id, 10);
                } else if (urlContent[1].indexOf('/frontpage/') !== -1) {
                    this.type = 'frontpage';
                } else if (urlContent[1].indexOf('/blogpage/') !== -1) {
                    this.type = 'blogpage';
                } else if (urlContent[1].indexOf('/file/') !== -1) {
                    this.type = 'file';
                    this.file = urlContent[1].replace('#INTERNAL_LINK#/file/', '');
                } else {
                    this.type = 'external';
                    this.external = urlContent[1];
                }
            }
        },
        setLink () {
            let response = {
                url: '',
                title: '',
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

            this.cleanPopup();
            this.isVisible = false;
            this.$bus.$emit('link-popup-updated', response);
        },
        cancel () {
            this.cleanPopup();
            this.isVisible = false;
            this.$bus.$emit('link-popup-updated', false);
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

                let linkHTMLStart = `<a href="${response.url}"${response.title}${response.target}${relAttr}>`;
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
            mainProcessAPI.send('app-file-manager-list', {
                siteName: this.$store.state.currentSite.config.name,
                dirPath: 'root-files'
            });

            mainProcessAPI.receiveOnce('app-file-manager-listed', (data) => {
                this.filesList = data.map(file => file.name);

                mainProcessAPI.send('app-file-manager-list', {
                    siteName: this.$store.state.currentSite.config.name,
                    dirPath: 'media/files'
                });

                mainProcessAPI.receiveOnce('app-file-manager-listed', (data) => {
                    this.filesList = this.filesList.concat(data.map(file => 'media/files/' + file.name));
                });
            });
        }
    },
    beforeDestroy () {
        this.$bus.$off('init-link-popup');
        this.$bus.$off('link-popup-updated', this.addLink);
    }
}
</script>

<style lang="scss" scoped>
@import '../../scss/variables.scss';
@import '../../scss/popup-common.scss';

.overlay {
    z-index: 100005;
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
    font-size: 1.6rem;
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
