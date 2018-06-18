<template>
    <div
        v-if="isVisible"
        class="overlay">
        <div class="popup popup-link-add">
            <div class="message">
                <h1>Insert/Edit link</h1>

                <field label="Select link type:">
                    <v-select
                        slot="field"
                        v-model="type"
                        :options="linkTypes"
                        :searchable="false"
                        :custom-label="customTypeLabels"
                        :show-labels="false"
                        placeholder="Select link type"></v-select>
                </field>

                <field
                    v-if="type === 'post'"
                    label="Post name:">
                    <v-select
                        slot="field"
                        ref="postPagesSelect"
                        :options="postPages"
                        v-model="post"
                        :custom-label="customPostLabels"
                        :close-on-select="true"
                        :show-labels="false"
                        @select="closeDropdown('postPagesSelect')"
                        placeholder="Select post page"></v-select>
                </field>

                <field
                    v-if="type === 'tag'"
                    label="Tag name:">
                    <v-select
                        slot="field"
                        ref="tagPagesSelect"
                        :options="tagPages"
                        v-model="tag"
                        :custom-label="customTagLabels"
                        :close-on-select="true"
                        :show-labels="false"
                        @select="closeDropdown('tagPagesSelect')"
                        placeholder="Select tag page"></v-select>
                </field>

                <field
                    v-if="type === 'author'"
                    label="Author name:">
                    <v-select
                        slot="field"
                        ref="authorPagesSelect"
                        :options="authorPages"
                        v-model="author"
                        :custom-label="customAuthorsLabels"
                        :close-on-select="true"
                        :show-labels="false"
                        @select="closeDropdown('authorPagesSelect')"
                        placeholder="Select author page"></v-select>
                </field>

                <field
                    v-if="type === 'external'"
                    label="External link:">
                    <input
                        slot="field"
                        type="text"
                        v-model="external"
                        class="link-popup-field-external" />
                </field>

                <field label="Link target:">
                    <v-select
                        slot="field"
                        ref="targetSelect"
                        :options="targetList"
                        v-model="target"
                        :custom-label="customTargetLabels"
                        :close-on-select="true"
                        :show-labels="false"
                        @select="closeDropdown('targetSelect')"></v-select>
                </field>

                <field label="Link label:">
                    <input
                        slot="field"
                        type="text"
                        v-model="label"
                        class="link-popup-field-label" />
                </field>

                <field label="Link title attribute:">
                    <input
                        slot="field"
                        type="text"
                        v-model="title"
                        class="link-popup-field-title" />
                </field>
            </div>

            <div class="buttons">
                <p-button
                    type="medium no-border-radius half-width"
                    @click.native="setLink">
                    OK
                </p-button>

                <p-button
                    type="medium no-border-radius half-width cancel-popup"
                    @click.native="cancel">
                    Cancel
                </p-button>
            </div>
        </div>
    </div>
</template>

<script>
import strip_tags from './../../helpers/vendor/locutus/strings/strip_tags';

export default {
    name: 'link-popup',
    data () {
        return {
            postID: 0,
            isVisible: false,
            type: 'post',
            post: null,
            tag: null,
            author: null,
            external: '',
            target: '',
            label: '',
            title: ''
        };
    },
    computed: {
        linkTypes () {
            return [ 'post', 'tag', 'author', 'frontpage', 'external' ];
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
    },
    methods: {
        customTypeLabels (value) {
            switch (value) {
                case 'post': return 'Post link';
                case 'tag': return 'Tag link';
                case 'author': return 'Author link';
                case 'frontpage': return 'Frontpage link';
                case 'external': return 'External link';
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
        customTargetLabels (value) {
            if (value === '-') {
                return 'The same window';
            }

            if (value === '_blank') {
                return 'New window';
            }
        },
        closeDropdown (refID) {
            this.$refs[refID].isOpen = false;
        },
        cleanPopup () {
            this.type = 'post';
            this.post = null;
            this.tag = null;
            this.author = null;
            this.external = '';
            this.target = '';
            this.label = '';
            this.title = '';
        },
        parseContent (content) {
            if(!content) {
                return;
            }

            let rawText = strip_tags(content);
            let linkContent = content.match(/>(.*?)<\/a>/);
            let titleContent = content.match(/title="(.*?)"/);
            let targetContent = content.match(/target="(.*?)"/);
            let urlContent = content.match(/href="(.*?)"/);

            this.type = 'post';

            if(linkContent && linkContent[1]) {
                this.label = linkContent[1];
            } else {
                this.label = rawText;
            }

            if(titleContent && titleContent[1]) {
                this.title = titleContent[1];
            }

            if(targetContent && targetContent[1]) {
                this.target = targetContent[1];
            }

            if(urlContent && urlContent[1]) {
                if(urlContent[1].indexOf('/post/') !== -1) {
                    let id = urlContent[1].replace('#INTERNAL_LINK#/post/', '');
                    this.type = 'post';
                    this.post = parseInt(id, 10);
                } else if(urlContent[1].indexOf('/tag/') !== -1) {
                    let id = urlContent[1].replace('#INTERNAL_LINK#/tag/', '');
                    this.type = 'tag';
                    this.tag = parseInt(id, 10);
                } else if(urlContent[1].indexOf('/author/') !== -1) {
                    let id = urlContent[1].replace('#INTERNAL_LINK#/author/', '');
                    this.type = 'author';
                    this.author = parseInt(id, 10);
                } else if(urlContent[1].indexOf('/frontpage/') !== -1) {
                    this.type = 'frontpage';
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
                text: this.label
            };

            if (this.type !== 'external') {
                if (this.type !== 'frontpage') {
                    response.url = '#INTERNAL_LINK#/' + this.type + '/' + this[this.type];
                } else {
                    response.url = '#INTERNAL_LINK#/frontpage/1';
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
        }
    },
    beforeDestroy () {
        this.$bus.$off('init-link-popup');
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
    background-color: $color-10;
    border: none;
    border-radius: .6rem;
    display: inline-block;
    font-size: 1.6rem;
    font-weight: 400;
    left: 50%;
    max-width: 60rem;
    min-width: 60rem;
    overflow: hidden;
    padding: 4rem;
    position: absolute;
    top: 50%;
    transform: translateX(-50%) translateY(-50%);
}

.message {
    color: $color-7;
    font-size: 1.8rem;
    font-weight: 400;
    margin: 0;
    padding: 0;
    position: relative;
}

.buttons {
    display: flex;
    margin: 4rem -4rem -4rem -4rem;
    position: relative;
    text-align: center;
    top: 1px;
}
</style>
