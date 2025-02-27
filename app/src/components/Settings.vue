<template>
    <section
        class="content"
        ref="content">
        <div class="site-settings">
            <p-header :title="$t('settings.siteSettings')">
                <p-button
                    @click.prevent.native="checkBeforeSave(false)"
                    slot="buttons"
                    type="secondary"
                    :disabled="buttonsLocked">
                    {{ $t('settings.saveSettings') }}
                </p-button>

                <btn-dropdown
                    slot="buttons"
                    buttonColor="green"
                    :items="dropdownItems"
                    :disabled="!siteHasTheme || buttonsLocked"
                    localStorageKey="publii-preview-mode"
                    :previewIcon="true"
                    defaultValue="full-site-preview" />
            </p-header>

            <fields-group :title="$t('settings.basicSettings')">
                <logo-creator
                    ref="logo-creator"
                    slot="" />

                <field
                    id="name"
                    :label="$t('site.siteName')">
                    <text-input
                        slot="field"
                        ref="name"
                        id="name"
                        key="name"
                        :readonly="syncInProgress"
                        :spellcheck="false"
                        v-model="name" />
                    <small
                        v-if="syncInProgress"
                        slot="note"
                        class="note">
                        {{ $t('sync.syncInProgressMessage') }}
                    </small>
                </field>

                <field
                    id="description"
                    :label="$t('site.siteDescription')">
                    <text-area
                        slot="field"
                        ref="description"
                        id="description"
                        key="description"
                        :spellcheck="false"
                        v-model="description" />
                </field>

                <field
                    id="language"
                    :label="$t('langs.language')">
                    <dropdown
                        slot="field"
                        id="language"
                        ref="language"
                        key="language"
                        v-model="language"
                        :items="availableLanguages"></dropdown>
                </field>

                <field
                    v-if="language === 'custom'"
                    id="customLanguage"
                    :label="$t('settings.customLanguageCode')">
                    <text-input
                        slot="field"
                        id="customLanguage"
                        ref="customLanguage"
                        key="customLanguage"
                        :spellcheck="false"
                        v-model="customLanguage" />
                </field>

                <field
                    id="spellchecking"
                    :label="$t('settings.enableSpellchecker')">
                    <switcher
                        slot="field"
                        id="spellchecking"
                        v-model="spellchecking" />
                    <small
                        v-if="hasNonAutomaticSpellchecker && spellcheckIsNotSupported"
                        slot="note"
                        class="note is-invalid">
                        {{ $t('settings.spellcheckerDoesNotSupportLanguage') }}
                    </small>
                </field>

                <field
                    id="theme"
                    :label="$t('settings.currentTheme')">
                    <strong
                        v-if="currentTheme"
                        slot="field">
                        {{ currentTheme }} (v.{{currentThemeVersion}})
                    </strong>

                    <strong
                        v-if="!currentTheme"
                        slot="field">
                        {{ $t('settings.notSelected') }}
                    </strong>

                    <themes-dropdown
                        slot="field"
                        id="theme"
                        ref="theme"
                        key="theme"
                        v-model="theme"></themes-dropdown>
                </field>

                <div
                    v-if="!currentThemeHasSupportedFeaturesList"
                    class="msg msg-icon msg-alert">
                    <icon
                        name="warning"
                        customWidth="28"
                        customHeight="28" />
                    <div v-pure-html="$t('settings.themeDoesNotHaveSupportedFeaturesList')"></div>
                </div>
            </fields-group>
            
            <fields-group :title="$t('settings.advancedOptions')">
                <div
                    v-if="this.$store.state.currentSite.config.advanced && this.$store.state.currentSite.config.advanced.gdpr && this.$store.state.currentSite.config.advanced.gdpr.enabled && !this.$store.state.currentSite.config.advanced.gdpr.settingsVersion"
                    class="msg msg-icon msg-alert msg-bm">
                    <icon name="warning" customWidth="28" customHeight="28" />
                    <p v-pure-html="$t('settings.youMustReviewGdprSettings')"></p>
                </div>

                <tabs
                    ref="advanced-tabs"
                    id="advanced-basic-settings-tabs"
                    :items="advancedTabs">
                    <div slot="tab-0">
                        <field
                            id="no-index-this-page"
                            :label="$t('settings.noIndexWebsite')">
                            <switcher
                                slot="field"
                                v-model="advanced.noIndexThisPage" />
                            <small
                                slot="note"
                                class="note">
                                {{ $t('settings.dontIndexThisPage') }}
                            </small>
                        </field>

                        <field
                            v-if="!advanced.noIndexThisPage"
                            id="no-index-for-chat-gpt-bot"
                            :label="$t('settings.noIndexForChatGPTBot')">
                            <switcher
                                slot="field"
                                v-model="advanced.noIndexForChatGPTBot" />
                            <small
                                slot="note"
                                class="note"
                                v-pure-html="$t('settings.noIndexForChatGPTBotInfo')">
                            </small>
                        </field>

                        <field
                            v-if="!advanced.noIndexThisPage"
                            id="no-index-for-chat-gpt-user"
                            :label="$t('settings.noIndexForChatGPTUser')">
                            <switcher
                                slot="field"
                                v-model="advanced.noIndexForChatGPTUser" />
                            <small
                                slot="note"
                                class="note"
                                v-pure-html="$t('settings.noIndexForChatGPTUserInfo')">
                            </small>
                        </field>

                        <field
                            v-if="!advanced.noIndexThisPage"
                            id="no-index-for-common-crawl-bots"
                            :label="$t('settings.noIndexForCommonCrawlBots')">
                            <switcher
                                slot="field"
                                v-model="advanced.noIndexForCommonCrawlBots" />
                            <small
                                slot="note"
                                class="note">
                                {{ $t('settings.noIndexForCommonCrawlBotsInfo') }}
                            </small>
                        </field>

                        <separator
                            type="medium"
                            :label="$t('settings.frontpage')" />

                        <field
                            id="homepage-as-page"
                            :label="$t('settings.usePageAsFrontpage')">
                            <switcher
                                slot="field"
                                id="homepage-as-page"
                                v-model="advanced.usePageAsFrontpage"
                                :disabled="!currentThemeSupportsPages" />
                            <small
                                slot="note"
                                class="note"
                                v-pure-html="$t('settings.usePageAsFrontpageNotice')">
                            </small>
                        </field>

                        <field
                            v-if="advanced.usePageAsFrontpage"
                            id="page-as-frontpage"
                            :label="$t('settings.pageAsFrontpage')">
                            <pages-dropdown
                                v-model="advanced.pageAsFrontpage"
                                :multiple="false"
                                slot="field"></pages-dropdown>
                            <small
                                v-if="errors.indexOf('page-as-frontpage') > -1"
                                class="note is-warning"
                                slot="note">
                                {{ $t('settings.youMustSelectFrontpage') }}
                            </small>
                        </field>

                        <separator
                            v-if="!advanced.noIndexThisPage && !advanced.usePageAsFrontpage && advanced.urls.postsPrefix"
                            type="medium"
                            :label="$t('settings.homepage')" />

                        <field
                            v-if="!advanced.noIndexThisPage && advanced.urls.postsPrefix && !advanced.usePageAsFrontpage"
                            id="meta-title"
                            :label="$t('settings.pageTitle')">
                            <text-input
                                id="meta-title"
                                v-model="advanced.homepageMetaTitle"
                                slot="field"
                                :spellcheck="$store.state.currentSite.config.spellchecking"
                                :charCounter="true"
                                :preferredCount="70" />
                        </field>

                        <field
                            v-if="!advanced.noIndexThisPage && advanced.urls.postsPrefix && !advanced.usePageAsFrontpage"
                            id="meta-description"
                            :label="$t('settings.metaDescription')">
                            <text-area
                                id="meta-description"
                                v-model="advanced.homepageMetaDescription"
                                slot="field"
                                :charCounter="true"
                                :spellcheck="$store.state.currentSite.config.spellchecking"
                                :preferredCount="160" />
                        </field>

                        <field
                            v-if="!advanced.noIndexThisPage && advanced.urls.postsPrefix && !advanced.usePageAsFrontpage"
                            id="meta-robots-index"
                            :label="$t('settings.metaRobots')">
                            <dropdown
                                id="meta-robots-index"
                                slot="field"
                                :items="seoOptions"
                                v-model="advanced.homepageMetaRobotsIndex">
                            </dropdown>
                        </field>

                        <separator
                            v-if="!advanced.noIndexThisPage && advanced.urls.postsPrefix"
                            type="medium"
                            :label="$t('settings.postsIndex')" />

                        <field
                            v-if="!advanced.noIndexThisPage && (advanced.urls.postsPrefix || (!advanced.urls.postsPrefix && !advanced.usePageAsFrontpage))"
                            id="meta-title"
                            :label="$t('settings.pageTitle')">
                            <text-input
                                id="meta-title"
                                v-model="advanced.metaTitle"
                                slot="field"
                                :spellcheck="$store.state.currentSite.config.spellchecking"
                                :charCounter="true"
                                :preferredCount="70" />
                        </field>

                        <field
                            v-if="!advanced.noIndexThisPage && (advanced.urls.postsPrefix || (!advanced.urls.postsPrefix && !advanced.usePageAsFrontpage))"
                            id="meta-description"
                            :label="$t('settings.metaDescription')">
                            <text-area
                                id="meta-description"
                                v-model="advanced.metaDescription"
                                slot="field"
                                :charCounter="true"
                                :spellcheck="$store.state.currentSite.config.spellchecking"
                                :preferredCount="160" />
                        </field>

                        <field
                            v-if="!advanced.noIndexThisPage && (advanced.urls.postsPrefix || (!advanced.urls.postsPrefix && !advanced.usePageAsFrontpage))"
                            id="meta-robots-index"
                            :label="$t('settings.metaRobots')">
                            <dropdown
                                id="meta-robots-index"
                                slot="field"
                                :items="seoOptions"
                                v-model="advanced.metaRobotsIndex">
                            </dropdown>
                        </field>

                        <field
                            v-if="!advanced.noIndexThisPage && (advanced.urls.postsPrefix || (!advanced.urls.postsPrefix && !advanced.usePageAsFrontpage))"
                            id="homepage-no-index-pagination"
                            :label="$t('settings.disableHomepagePaginationIndexing')">
                            <switcher
                                slot="field"
                                id="homepage-no-index-pagination"
                                v-model="advanced.homepageNoIndexPagination" />
                            <small
                                slot="note"
                                class="note"
                                v-pure-html="$t('settings.homepageNoIndexPagination')">
                            </small>
                        </field>

                        <field
                            v-if="advanced.urls.postsPrefix || (!advanced.urls.postsPrefix && !advanced.usePageAsFrontpage)"
                            id="homepage-no-pagination"
                            :label="$t('settings.disableHomepagePagination')">
                            <switcher
                                slot="field"
                                id="homepage-no-pagination"
                                v-model="advanced.homepageNoPagination" />
                            <small
                                slot="note"
                                class="note"
                                v-pure-html="$t('settings.disableHomepagePaginationInfo')">
                            </small>
                        </field>

                        <separator
                            type="medium"
                            :label="$t('post.postPage')" />

                        <field
                            v-if="!advanced.noIndexThisPage"
                            id="post-meta-title"
                            :withCharCounter="true"
                            :label="$t('settings.pageTitle')">
                            <text-input
                                id="post-meta-title"
                                slot="field"
                                v-model="advanced.postMetaTitle"
                                :charCounter="true"
                                :spellcheck="$store.state.currentSite.config.spellchecking"
                                :preferredCount="70" />
                            <small
                                slot="note"
                                class="note">
                                {{ $t('settings.postPageTitleVariables') }}
                            </small>
                        </field>

                        <field
                            v-if="!advanced.noIndexThisPage"
                            id="post-meta-description"
                            :label="$t('settings.metaDescription')">
                            <text-area
                                id="post-meta-description"
                                v-model="advanced.postMetaDescription"
                                slot="field"
                                :charCounter="true"
                                :spellcheck="$store.state.currentSite.config.spellchecking"
                                :preferredCount="160" />
                            <small
                                slot="note"
                                class="note">
                                {{ $t('settings.postPageTitleVariables') }}
                            </small>
                        </field>

                        <field
                            id="post-use-text-without-custom-excerpt"
                            :label="$t('settings.hideCustomExcerptsOnPostPages')">
                            <switcher
                                slot="field"
                                id="post-use-text-without-custom-excerpt"
                                v-model="advanced.postUseTextWithoutCustomExcerpt" />
                            <small
                                slot="note"
                                class="note">
                                {{ $t('settings.hideCustomExcerptsOnPostPagesInfo') }}
                            </small>
                        </field>

                        <separator
                            type="medium"
                            :label="$t('page.pages')" />

                        <field
                            v-if="!advanced.noIndexThisPage"
                            id="page-meta-title"
                            :withCharCounter="true"
                            :label="$t('settings.pageTitle')">
                            <text-input
                                id="page-meta-title"
                                slot="field"
                                v-model="advanced.pageMetaTitle"
                                :charCounter="true"
                                :spellcheck="$store.state.currentSite.config.spellchecking"
                                :preferredCount="70" />
                            <small
                                slot="note"
                                class="note">
                                {{ $t('settings.pageTitleVariables') }}
                            </small>
                        </field>

                        <field
                            v-if="!advanced.noIndexThisPage"
                            id="page-meta-description"
                            :label="$t('settings.metaDescription')">
                            <text-area
                                id="page-meta-description"
                                v-model="advanced.pageMetaDescription"
                                slot="field"
                                :charCounter="true"
                                :spellcheck="$store.state.currentSite.config.spellchecking"
                                :preferredCount="160" />
                            <small
                                slot="note"
                                class="note">
                                {{ $t('settings.pageTitleVariables') }}
                            </small>
                        </field>

                        <field
                            id="page-use-text-without-custom-excerpt"
                            :label="$t('settings.hideCustomExcerptsOnPagePages')">
                            <switcher
                                slot="field"
                                id="page-use-text-without-custom-excerpt"
                                v-model="advanced.pageUseTextWithoutCustomExcerpt" />
                            <small
                                slot="note"
                                class="note">
                                {{ $t('settings.hideCustomExcerptsOnPagePagesInfo') }}
                            </small>
                        </field>

                        <separator
                            v-if="advanced.urls.tagsPrefix !== '' && !advanced.noIndexThisPage"
                            type="medium"
                            :label="$t('settings.tagsListPage')" />

                        <div
                            v-if="advanced.urls.tagsPrefix !== '' && !currentThemeSupportsTagsList"
                            class="msg msg-icon msg-alert">
                            <icon name="warning" customWidth="28" customHeight="28" />
                            <p>{{ $t('settings.themeDoesNotSupportTagsListPage') }} </p>
                        </div>

                        <field
                            v-if="!advanced.noIndexThisPage && advanced.urls.tagsPrefix !== '' && currentThemeSupportsTagsList"
                            id="tags-list-meta-title"
                            :withCharCounter="true"
                            :label="$t('settings.pageTitle')">
                            <text-input
                                id="tags-list-meta-title"
                                v-model="advanced.tagsMetaTitle"
                                slot="field"
                                :spellcheck="$store.state.currentSite.config.spellchecking"
                                :charCounter="true"
                                :preferredCount="70" />
                            <small
                                slot="note"
                                class="note">
                                {{ $t('settings.tagsListPageTitleVariables') }}
                            </small>
                        </field>

                        <field
                            v-if="!advanced.noIndexThisPage && advanced.urls.tagsPrefix !== '' && currentThemeSupportsTagsList"
                            id="tags-list-meta-description"
                            :label="$t('settings.metaDescription')">
                            <text-area
                                id="tags-list-meta-description"
                                v-model="advanced.tagsMetaDescription"
                                slot="field"
                                :charCounter="true"
                                :spellcheck="$store.state.currentSite.config.spellchecking"
                                :preferredCount="160" />
                            <small
                                slot="note"
                                class="note">
                                {{ $t('settings.tagsListPageTitleVariables') }}
                            </small>
                        </field>

                        <field
                            v-if="!advanced.noIndexThisPage && advanced.urls.tagsPrefix !== '' && currentThemeSupportsTagsList"
                            id="meta-robots-tags-list"
                            :label="$t('settings.metaRobots')">
                            <dropdown
                                id="meta-robots-tags-list"
                                slot="field"
                                :items="seoOptions"
                                v-model="advanced.metaRobotsTagsList">
                            </dropdown>
                        </field>

                        <separator
                            type="medium"
                            :label="$t('tag.tagPage')" />

                        <div
                            v-if="!currentThemeSupportsTagPages"
                            class="msg msg-icon msg-alert">
                            <icon name="warning" customWidth="28" customHeight="28" />
                            <p>{{ $t('settings.themeDoesNotSupportTagPages') }}</p>
                        </div>

                        <field
                            v-if="!advanced.noIndexThisPage && currentThemeSupportsTagPages"
                            id="tag-meta-title"
                            :withCharCounter="true"
                            :label="$t('settings.pageTitle')">
                            <text-input
                                id="tag-meta-title"
                                v-model="advanced.tagMetaTitle"
                                slot="field"
                                :spellcheck="$store.state.currentSite.config.spellchecking"
                                :charCounter="true"
                                :preferredCount="70" />
                            <small
                                slot="note"
                                class="note">
                                {{ $t('settings.tagPageTitleVariables') }}
                            </small>
                        </field>

                        <field
                            v-if="!advanced.noIndexThisPage && currentThemeSupportsTagPages"
                            id="tag-meta-description"
                            :label="$t('settings.metaDescription')">
                            <text-area
                                id="tag-meta-description"
                                v-model="advanced.tagMetaDescription"
                                slot="field"
                                :charCounter="true"
                                :spellcheck="$store.state.currentSite.config.spellchecking"
                                :preferredCount="160" />
                            <small
                                slot="note"
                                class="note">
                                {{ $t('settings.tagPageTitleVariables') }}
                            </small>
                        </field>

                        <field
                            v-if="!advanced.noIndexThisPage && currentThemeSupportsTagPages"
                            id="meta-robots-tags"
                            :label="$t('settings.metaRobots')">
                            <dropdown
                                id="meta-robots-tags"
                                slot="field"
                                :items="seoOptions"
                                v-model="advanced.metaRobotsTags">
                            </dropdown>
                        </field>

                        <field
                            v-if="currentThemeSupportsTagPages"
                            id="display-empty-tags"
                            :label="$t('settings.displayEmptyTags')">
                            <switcher
                                slot="field"
                                id="display-empty-tags"
                                v-model="advanced.displayEmptyTags" />
                            <small
                                slot="note"
                                class="note">
                                {{ $t('settings.displayEmptyTagsInfo') }}
                            </small>
                        </field>

                        <field
                            v-if="!advanced.noIndexThisPage && currentThemeSupportsTagPages"
                            id="tag-no-index-pagination"
                            :label="$t('settings.disableTagsPaginationIndexing')">
                            <switcher
                                slot="field"
                                id="tag-no-index-pagination"
                                v-model="advanced.tagNoIndexPagination" />
                            <small
                                slot="note"
                                class="note"
                                v-pure-html="$t('settings.disableTagsPaginationIndexingInfo')">
                            </small>
                        </field>

                        <field
                            v-if="currentThemeSupportsTagPages"
                            id="tag-no-pagination"
                            :label="$t('settings.disableTagsPagination')">
                            <switcher
                                slot="field"
                                id="tag-no-pagination"
                                v-model="advanced.tagNoPagination" />
                            <small
                                slot="note"
                                class="note">
                                {{ $t('settings.disableTagsPaginationInfo') }}
                            </small>
                        </field>

                        <separator
                            type="medium"
                            :label="$t('settings.authorPage')" />

                        <div
                            v-if="!currentThemeSupportsAuthorPages"
                            class="msg msg-icon msg-alert">
                            <icon name="warning" customWidth="28" customHeight="28" />
                            <p>{{ $t('settings.themeDoesNotSupportAuthorPages') }}</p>
                        </div>

                        <field
                            v-if="!advanced.noIndexThisPage && currentThemeSupportsAuthorPages"
                            id="author-meta-title"
                            :withCharCounter="true"
                            :label="$t('settings.pageTitle')">
                            <text-input
                                id="author-meta-title"
                                v-model="advanced.authorMetaTitle"
                                slot="field"
                                :spellcheck="$store.state.currentSite.config.spellchecking"
                                :charCounter="true"
                                :preferredCount="70" />
                            <small
                                slot="note"
                                class="note">
                                {{ $t('settings.authorPageTitleVariables') }}
                            </small>
                        </field>

                        <field
                            v-if="!advanced.noIndexThisPage && currentThemeSupportsAuthorPages"
                            id="author-meta-description"
                            :label="$t('settings.metaDescription')">
                            <text-area
                                id="author-meta-description"
                                v-model="advanced.authorMetaDescription"
                                slot="field"
                                :charCounter="true"
                                :spellcheck="$store.state.currentSite.config.spellchecking"
                                :preferredCount="160" />
                            <small
                                slot="note"
                                class="note">
                                {{ $t('settings.authorPageTitleVariables') }}
                            </small>
                        </field>

                        <field
                            v-if="!advanced.noIndexThisPage && currentThemeSupportsAuthorPages"
                            id="meta-robots-authors"
                            :label="$t('settings.metaRobots')">
                            <dropdown
                                id="meta-robots-tags"
                                slot="field"
                                :items="seoOptions"
                                v-model="advanced.metaRobotsAuthors">
                            </dropdown>
                        </field>

                        <field
                            v-if="currentThemeSupportsAuthorPages"
                            id="display-empty-authors"
                            :label="$t('settings.displayEmptyAuthors')">
                            <switcher
                                slot="field"
                                v-model="advanced.displayEmptyAuthors" />
                            <small
                                slot="note"
                                class="note">
                                {{ $t('settings.displayEmptyAuthorsInfo') }}
                            </small>
                        </field>

                        <field
                            v-if="!advanced.noIndexThisPage && currentThemeSupportsAuthorPages"
                            id="author-no-index-pagination"
                            :label="$t('settings.disableAuthorsPaginationIndexing')">
                            <switcher
                                slot="field"
                                id="author-no-index-pagination"
                                v-model="advanced.authorNoIndexPagination" />
                            <small
                                slot="note"
                                class="note"
                                v-pure-html="$t('settings.disableAuthorsPaginationIndexingInfo')">
                            </small>
                        </field>

                        <field
                            v-if="currentThemeSupportsAuthorPages"
                            id="author-no-pagination"
                            :label="$t('settings.disableAuthorsPagination')">
                            <switcher
                                slot="field"
                                id="author-no-pagination"
                                v-model="advanced.authorNoPagination" />
                            <small
                                slot="note"
                                class="note">
                                {{ $t('settings.disableAuthorsPaginationInfo') }}
                            </small>
                        </field>

                        <separator
                            v-if="!advanced.noIndexThisPage"
                            type="medium"
                            :label="$t('settings.errorPage')" />

                        <div
                            v-if="!advanced.noIndexThisPage && !currentThemeSupportsErrorPage"
                            class="msg msg-icon msg-alert">
                            <icon name="warning" customWidth="28" customHeight="28" />
                            <p>{{ $t('settings.themeDoesNotSupport404ErrorPage') }}</p>
                        </div>

                        <field
                            v-if="!advanced.noIndexThisPage && currentThemeSupportsErrorPage"
                            id="error-meta-title"
                            :withCharCounter="true"
                            :label="$t('settings.pageTitle')">
                            <text-input
                                id="author-meta-title"
                                v-model="advanced.errorMetaTitle"
                                slot="field"
                                :spellcheck="$store.state.currentSite.config.spellchecking"
                                :charCounter="true"
                                :preferredCount="70" />
                            <small
                                slot="note"
                                class="note">
                                {{ $t('settings.errorPageTitleVariables') }}
                            </small>
                        </field>

                        <field
                            v-if="!advanced.noIndexThisPage && currentThemeSupportsErrorPage"
                            id="error-meta-description"
                            :label="$t('settings.metaDescription')">
                            <text-area
                                id="error-meta-description"
                                v-model="advanced.errorMetaDescription"
                                slot="field"
                                :charCounter="true"
                                :spellcheck="$store.state.currentSite.config.spellchecking"
                                :preferredCount="160" />
                            <small
                                slot="note"
                                class="note">
                                {{ $t('settings.errorPageTitleVariables') }}
                            </small>
                        </field>

                        <field
                            v-if="!advanced.noIndexThisPage && currentThemeSupportsErrorPage"
                            id="meta-robots-error"
                            :label="$t('settings.metaRobots')">
                            <dropdown
                                id="meta-robots-error"
                                slot="field"
                                :items="seoOptions"
                                v-model="advanced.metaRobotsError">
                            </dropdown>
                        </field>

                        <separator
                            v-if="!advanced.noIndexThisPage"
                            type="medium"
                            :label="$t('settings.searchPage')" />

                        <div
                            v-if="!advanced.noIndexThisPage && !currentThemeSupportsSearchPage"
                            class="msg msg-icon msg-alert">
                            <icon name="warning" customWidth="28" customHeight="28" />
                            <p>{{ $t('settings.themeDoesNotSupportSearchPages') }}</p>
                        </div>

                        <field
                            v-if="!advanced.noIndexThisPage && currentThemeSupportsSearchPage"
                            id="error-meta-title"
                            :withCharCounter="true"
                            :label="$t('settings.pageTitle')">
                            <text-input
                                id="search-meta-title"
                                v-model="advanced.searchMetaTitle"
                                slot="field"
                                :spellcheck="$store.state.currentSite.config.spellchecking"
                                :charCounter="true"
                                :preferredCount="70" />
                            <small
                                slot="note"
                                class="note">
                                {{ $t('settings.searchPageTitleVariables') }}
                            </small>
                        </field>

                        <field
                            v-if="!advanced.noIndexThisPage && currentThemeSupportsSearchPage"
                            id="search-meta-description"
                            :label="$t('settings.metaDescription')">
                            <text-area
                                id="search-meta-description"
                                v-model="advanced.searchMetaDescription"
                                slot="field"
                                :charCounter="true"
                                :spellcheck="$store.state.currentSite.config.spellchecking"
                                :preferredCount="160" />
                            <small
                                slot="note"
                                class="note">
                                {{ $t('settings.searchPageTitleVariables') }}
                            </small>
                        </field>

                        <field
                            v-if="!advanced.noIndexThisPage && currentThemeSupportsSearchPage"
                            id="meta-robots-search"
                            :label="$t('settings.metaRobots')">
                            <dropdown
                                id="meta-robots-search"
                                slot="field"
                                :items="seoOptions"
                                v-model="advanced.metaRobotsSearch">
                            </dropdown>
                        </field>
                    </div>

                    <div slot="tab-1">
                        <field
                            id="clean-urls"
                            :label="$t('settings.usePrettyURLs')">
                            <switcher
                                slot="field"
                                v-model="advanced.urls.cleanUrls" />
                            <small
                                slot="note"
                                class="note"
                                v-pure-html="$t('settings.usePrettyURLsInfo')">
                            </small>
                        </field>

                        <field
                            id="add-index"
                            :label="$t('settings.alwaysAddIndexHTMLInURLs')">
                            <switcher
                                slot="field"
                                v-model="advanced.urls.addIndex" />
                            <small
                                slot="note"
                                class="note">
                                {{ $t('settings.cannotAddIndexHTMLInURLsInfo') }}
                            </small>
                        </field>

                        <field
                            v-if="advanced.urls.cleanUrls"
                            id="url-posts-prefix"
                            :label="$t('settings.postsPrefix')">
                            <text-input
                                id="url-posts-prefix"
                                :class="{ 'is-invalid': errors.indexOf('posts-prefix') > -1 }"
                                @click.native="clearErrors('posts-prefix')"
                                v-model="advanced.urls.postsPrefix"
                                :spellcheck="false"
                                slot="field" />
                            <small
                                slot="note"
                                class="note"
                                v-pure-html="$t('settings.postPrefixInfo')">
                            </small>
                        </field>

                        <field
                            id="url-tags-prefix"
                            :label="$t('settings.tagPrefix')">
                            <text-input
                                id="url-tags-prefix"
                                :class="{ 'is-invalid': errors.indexOf('tags-prefix') > -1 }"
                                @click.native="clearErrors('tags-prefix')"
                                v-model="advanced.urls.tagsPrefix"
                                :spellcheck="false"
                                :disabled="!currentThemeSupportsTagPages"
                                slot="field" />
                            <small
                                v-if="!currentThemeSupportsTagPages"
                                class="note is-warning"
                                slot="note">
                                {{ $t('settings.themeDoesNotSupportTagPages') }}
                            </small>
                            <small
                                v-else
                                slot="note"
                                class="note"
                                v-pure-html="advanced.urls.postsPrefix && advanced.urls.tagsPrefixAfterPostsPrefix ? $t('settings.tagPrefixInfoExtended') : $t('settings.tagPrefixInfo')">
                            </small>
                        </field>

                        <field
                            v-if="advanced.urls.postsPrefix"
                            id="tags-prefix-after-posts-prefix"
                            :label="$t('settings.tagsPrefixAfterPostsPrefix')">
                            <switcher
                                slot="field"
                                v-model="advanced.urls.tagsPrefixAfterPostsPrefix" />
                        </field>

                        <field
                            id="url-authors-prefix"
                            :label="$t('settings.authorPrefix')">
                            <text-input
                                id="url-authors-prefix"
                                :class="{ 'is-invalid': errors.indexOf('authors-prefix') > -1 }"
                                @click.native="clearErrors('authors-prefix')"
                                v-model="advanced.urls.authorsPrefix"
                                :spellcheck="false"
                                :disabled="!currentThemeSupportsAuthorPages"
                                slot="field" />
                            <small
                                v-if="!currentThemeSupportsAuthorPages"
                                class="note is-warning"
                                slot="note">
                                {{ $t('settings.themeDoesNotSupportAuthorPages') }}
                            </small>
                            <small
                                v-else
                                slot="note"
                                class="note"
                                v-pure-html="advanced.urls.postsPrefix && advanced.urls.authorsPrefixAfterPostsPrefix ? $t('settings.authorPrefixInfoExtended') : $t('settings.authorPrefixInfo')">
                            </small>
                        </field>

                        <field
                            v-if="advanced.urls.postsPrefix"
                            id="authors-prefix-after-posts-prefix"
                            :label="$t('settings.authorsPrefixAfterPostsPrefix')">
                            <switcher
                                slot="field"
                                v-model="advanced.urls.authorsPrefixAfterPostsPrefix" />
                        </field>

                        <field
                            id="url-pagination-phrase"
                            :label="$t('settings.paginationPhrase')">
                            <text-input
                                id="url-pagination-phrase"
                                :class="{ 'is-invalid': errors.indexOf('pagination-phrase') > -1 }"
                                @click.native="clearErrors('pagination-phrase')"
                                v-model="advanced.urls.pageName"
                                :spellcheck="false"
                                slot="field" />
                            <small
                                slot="note"
                                class="note"
                                v-pure-html="$t('settings.paginationPhraseInfo')">
                            </small>
                        </field>

                        <field
                            id="error-page-file"
                            :label="$t('settings.errorPage')">
                            <text-input
                                id="error-page-file"
                                :class="{ 'is-invalid': errors.indexOf('error-page') > -1 }"
                                @click.native="clearErrors('error-page')"
                                :readonly="!currentThemeSupportsErrorPage"
                                v-model="advanced.urls.errorPage"
                                :spellcheck="false"
                                :disabled="!currentThemeSupportsErrorPage"
                                slot="field" />
                            <small
                                v-if="!currentThemeSupportsErrorPage"
                                class="note is-warning"
                                slot="note">
                                {{ $t('settings.themeDoesNotSupportErrorPages') }}
                            </small>
                        </field>

                        <field
                            id="search-page-file"
                            :label="$t('settings.searchPage')">
                            <text-input
                                id="search-page-file"
                                :class="{ 'is-invalid': errors.indexOf('search-page') > -1 }"
                                @click.native="clearErrors('search-page')"
                                :readonly="!currentThemeSupportsSearchPage"
                                v-model="advanced.urls.searchPage"
                                :spellcheck="false"
                                :disabled="!currentThemeSupportsSearchPage"
                                slot="field" />
                            <small
                                v-if="!currentThemeSupportsSearchPage"
                                class="note is-warning"
                                slot="note">
                                {{ $t('settings.themeDoesNotSupportSearchPages') }}
                            </small>
                        </field>
                    </div>

                    <div slot="tab-2">
                        <field
                            v-if="advanced.noIndexThisPage"
                            :label="$t('settings.toViewSitemapEnableIndexingInfo')"
                            :labelFullWidth="true" />

                        <field
                            v-if="siteUsesRelativeUrls"
                            :label="$t('settings.sitemapRelativeUrlsInfo')"
                            :labelFullWidth="true" />

                        <field
                            v-if="!advanced.noIndexThisPage && !siteUsesRelativeUrls"
                            id="sitemap-enabled"
                            :label="$t('settings.createXMLSitemap')">
                            <switcher
                                slot="field"
                                v-model="advanced.sitemapEnabled" />
                            <small
                                v-if="sitemapLink"
                                slot="note"
                                class="note"
                                v-pure-html="$t('settings.sitemapLinkInfo', { sitemapLink: sitemapLink })">
                            </small>
                        </field>

                        <field
                            class="multiple-checkboxes field-with-switcher"
                            v-if="!advanced.noIndexThisPage && !siteUsesRelativeUrls && advanced.sitemapEnabled"
                            :label="$t('settings.content')">
                            <label
                                v-if="advanced.sitemapEnabled"
                                slot="field">
                                <switcher 
                                    v-model="advanced.sitemapAddTags"
                                    :disabled="!currentThemeSupportsTagPages" />
                                {{ $t('settings.tagPages') }}
                            </label>

                            <label
                                v-if="advanced.sitemapEnabled && !siteUsesRelativeUrls"
                                slot="field">
                                <switcher 
                                    v-model="advanced.sitemapAddAuthors"
                                    :disabled="!currentThemeSupportsAuthorPages" />
                                {{ $t('settings.authorPages') }}
                            </label>

                            <label
                                v-if="advanced.sitemapEnabled && !siteUsesRelativeUrls"
                                slot="field">
                                <switcher v-model="advanced.sitemapAddHomepage" />
                                {{ $t('settings.homepagePagination') }}
                            </label>

                            <label
                                v-if="advanced.sitemapEnabled && !siteUsesRelativeUrls"
                                slot="field">
                                <switcher v-model="advanced.sitemapAddExternalImages" />
                                {{ $t('settings.externalImages') }}
                            </label>
                        </field>

                        <field
                            v-if="!advanced.noIndexThisPage && !siteUsesRelativeUrls && advanced.sitemapEnabled"
                            :label="$t('settings.excludedFiles')">
                            <text-area
                                slot="field"
                                :spellcheck="false"
                                v-model="advanced.sitemapExcludedFiles" />
                            <small
                                slot="note"
                                class="note"
                                v-pure-html="$t('settings.excludeFilesFromSitemapInfo')">
                            </small>
                        </field>
                    </div>

                    <div slot="tab-3">
                        <field
                            id="open-graph-enabled"
                            :label="$t('settings.generateOpenGraphTags')">
                            <switcher
                                slot="field"
                                id="open-graph-enabled"
                                v-model="advanced.openGraphEnabled" />
                        </field>

                        <field
                            v-if="advanced.openGraphEnabled"
                            :label="$t('settings.fallbackImage')">
                            <image-upload
                                slot="field"
                                v-model="advanced.openGraphImage"
                                imageType="optionImages" />
                        </field>

                        <field
                            v-if="advanced.openGraphEnabled"
                            id="use-page-title-instead-item-name"
                            :label="$t('settings.useAsTitlePageTitle')">
                            <switcher
                                slot="field"
                                id="use-page-title-instead-item-name"
                                v-model="advanced.usePageTitleInsteadItemName" />
                            <small
                                slot="note"
                                class="note">
                                {{ $t('settings.useAsTitlePageTitleInfo') }}
                            </small>
                        </field>

                        <field
                            v-if="advanced.openGraphEnabled"
                            :label="$t('settings.facebookAppID')">
                            <input
                                slot="field"
                                type="text"
                                spellcheck="false"
                                v-model="advanced.openGraphAppId" />
                            <small
                                slot="note"
                                class="note"
                                v-pure-html="$t('settings.facebookAppIDInfo')">
                            </small>
                        </field>
                    </div>

                    <div slot="tab-4">
                        <field
                            id="twitter-cards-enabled"
                            :label="$t('settings.generateTwitterCards')">
                            <switcher
                                slot="field"
                                id="twitter-cards-enabled"
                                v-model="advanced.twitterCardsEnabled" />
                        </field>

                        <field
                            v-if="advanced.twitterCardsEnabled"
                            id="twitter-username"
                            :label="$t('settings.twitterUsername')">
                            <text-input
                                id="twitter-username"
                                v-model="advanced.twitterUsername"
                                :spellcheck="false"
                                slot="field" />
                        </field>

                        <field
                            v-if="advanced.twitterCardsEnabled"
                            id="twitter-cards-type"
                            :label="$t('settings.cardTypes')">
                            <dropdown
                                slot="field"
                                id="twitter-cards-type"
                                v-model="advanced.twitterCardsType"
                                :items="twitterCardsTypes">
                            </dropdown>
                        </field>
                    </div>

                    <div slot="tab-5">
                        <separator
                            type="small"
                            :is-line="true"
                            :label="$t('settings.embedVideos')" />

                        <field
                            id="yt-nocookie"
                            :label="$t('settings.ytNoCookies')">
                            <switcher
                                id="yt-nocookies"
                                slot="field"
                                v-model="advanced.gdpr.ytNoCookies" />

                            <small
                                slot="note"
                                class="note"
                                v-pure-html="$t('settings.howYtNoCookiesWorks')">
                            </small>
                        </field>

                        <field
                            id="vimeo-no-track"
                            :label="$t('settings.vimeoNoTrack')">
                            <switcher
                                slot="field"
                                id="vimeo-no-track"
                                v-model="advanced.gdpr.vimeoNoTrack" />

                            <small
                                slot="note"
                                class="note"
                                v-pure-html="$t('settings.howVimeoNoTrackWorks')">
                            </small>
                        </field>

                        <separator
                            type="big"
                            :is-line="true"
                            :label="$t('settings.cookieBanner')" />

                        <field
                            id="gdpr-enabled"
                            :label="$t('settings.addGDPRCookieBanner')">
                            <switcher
                                id="html-compression"
                                slot="field"
                                v-model="advanced.gdpr.enabled" />

                            <small
                                slot="note"
                                class="note"
                                v-pure-html="$t('settings.howToPrepareYourThemeForGDPRInfo')">
                            </small>
                        </field>

                        <separator
                            v-if="advanced.gdpr.enabled"
                            type="medium thin"
                            :is-line="true"
                            :note="$t('settings.cookieBasicDescription')"
                            :label="$t('settings.cookieBasic')" />                     

                        <field
                            v-if="advanced.gdpr.enabled"
                            id="gdpr-popup-title-primary"
                            :label="$t('settings.gdprBannerTitle')">
                            <text-input
                                id="gdpr-popup-title-primary"
                                v-model="advanced.gdpr.popupTitlePrimary"
                                :spellcheck="$store.state.currentSite.config.spellchecking"
                                slot="field" />
                        </field>

                        <field
                            v-if="advanced.gdpr.enabled"
                            id="gdpr-popup-desc"
                            :label="$t('settings.gdprBannerMessage')">
                            <text-area
                                id="gdpr-popup-desc"
                                v-model="advanced.gdpr.popupDesc"
                                :rows="6"
                                :spellcheck="$store.state.currentSite.config.spellchecking"
                                slot="field" />
                        </field>

                        <separator
                            v-if="advanced.gdpr.enabled"
                            type="big thin"
                            :is-line="true"/>

                        <field
                            v-if="advanced.gdpr.enabled"
                            id="show-privacy-policy-link"
                            :label="$t('settings.showPrivacyPolicyLink')">
                            <switcher
                                id="show-privacy-policy-link"
                                slot="field"
                                v-model="advanced.gdpr.showPrivacyPolicyLink" />
                        </field>

                        <field
                            v-if="advanced.gdpr.enabled && advanced.gdpr.showPrivacyPolicyLink"
                            id="gdpr-readmore-link-label"
                            :label="$t('settings.privacyPolicyLinkLabel')">
                            <text-input
                                id="gdpr-readmore-link-label"
                                v-model="advanced.gdpr.privacyPolicyLinkLabel"
                                :spellcheck="$store.state.currentSite.config.spellchecking"
                                slot="field" />
                        </field>

                        <field
                            v-if="advanced.gdpr.enabled && advanced.gdpr.showPrivacyPolicyLink"
                            id="gdpr-page-type"
                            :label="$t('settings.privacyPolicyURL')">
                            <dropdown
                                slot="field"
                                id="gdpr-page-type"
                                key="gdpr-page-type"
                                v-model="advanced.gdpr.privacyPolicyLinkType"
                                :items="{ 
                                    'internal': $t('settings.internalPage'), 
                                    'external': $t('settings.externalPage'),  
                                }">
                            </dropdown>
                        </field>

                        <field
                            v-if="advanced.gdpr.enabled && advanced.gdpr.showPrivacyPolicyLink && advanced.gdpr.privacyPolicyLinkType === 'internal'"
                            id="gdpr-page"
                            :label="$t('settings.privacyPolicyPage')">
                            <v-select
                                ref="gdprPagesSelect"
                                slot="field"
                                :options="postPages"
                                v-model="advanced.gdpr.privacyPolicyPostId"
                                :custom-label="customPostLabels"
                                :close-on-select="true"
                                :show-labels="false"
                                @select="closeDropdown('gdprPagesSelect')"
                                :placeholder="$t('settings.selectPage')"></v-select>
                        </field>

                        <field
                            v-if="advanced.gdpr.enabled && advanced.gdpr.showPrivacyPolicyLink && advanced.gdpr.privacyPolicyLinkType === 'external'"
                            id="gdpr-page-url"
                            :label="$t('settings.privacyPolicyPageURL')">
                            <text-input
                                id="gdpr-page-url"
                                v-model="advanced.gdpr.privacyPolicyExternalUrl"
                                :spellcheck="false"
                                slot="field" />
                        </field>

                        <separator
                            v-if="advanced.gdpr.enabled"
                            type="small thin"
                            :is-line="true"/>

                        <field
                            v-if="advanced.gdpr.enabled"
                            id="gdpr-save-button-label"
                            :label="$t('settings.saveButtonLabel')">
                            <text-input
                                id="gdpr-save-button-label"
                                v-model="advanced.gdpr.saveButtonLabel"
                                :spellcheck="$store.state.currentSite.config.spellchecking"
                                slot="field" />
                        </field>

                        <field
                            v-if="advanced.gdpr.enabled && advanced.gdpr.allowAdvancedConfiguration"
                            id="gdpr-show-reject-button"
                            :label="$t('settings.gdprShowRejectButton')">
                            <switcher
                                id="gdpr-show-reject-button"
                                slot="field"
                                v-model="advanced.gdpr.popupShowRejectButton" />
                        </field>

                        <field
                            v-if="advanced.gdpr.enabled && advanced.gdpr.allowAdvancedConfiguration && advanced.gdpr.popupShowRejectButton"
                            id="gdpr-reject-button-label"
                            :label="$t('settings.gdprRejectButtonLabel')">
                            <text-input
                                id="gdpr-reject-button-label"
                                slot="field"
                                v-model="advanced.gdpr.popupRejectButtonLabel"
                                :spellcheck="$store.state.currentSite.config.spellchecking" />
                        </field>

                        <separator
                            v-if="advanced.gdpr.enabled"
                            type="small thin"
                            :is-line="true"/>

                        <field
                            v-if="advanced.gdpr.enabled"
                            id="gdpr-behaviour"
                            :label="$t('settings.openPopupWindowBy')">
                            <dropdown
                                slot="field"
                                id="posts-listing-order-by"
                                key="posts-listing-order-by"
                                v-model="advanced.gdpr.behaviour"
                                :items="{ 
                                    'badge': $t('settings.badge'), 
                                    'link': $t('ui.customLink'), 
                                    'badge-link': $t('settings.badgeAndCustomLink') 
                                }">
                            </dropdown>
                        </field>

                        <field
                            v-if="advanced.gdpr.enabled && advanced.gdpr.behaviour !== 'link'"
                            id="gdpr-popup-label"
                            :label="$t('settings.badgeLabel')">
                            <text-input
                                id="gdpr-popup-label"
                                v-model="advanced.gdpr.badgeLabel"
                                :spellcheck="$store.state.currentSite.config.spellchecking"
                                slot="field" />
                        </field>

                        <field
                            v-if="advanced.gdpr.enabled && advanced.gdpr.behaviour !== 'badge'"
                            id="gdpr-behaviour-link"
                            :label="$t('settings.anchorLink')">
                            <text-input
                                id="gdpr-behaviour-link"
                                v-model="advanced.gdpr.behaviourLink"
                                :spellcheck="false"
                                slot="field" />
                            <small
                                class="note"
                                slot="note">
                                {{ $t('settings.gdprBehaviourInfo') }}
                            </small>
                        </field>

                        <separator
                            v-if="advanced.gdpr.enabled"
                            type="small thin"
                            :is-line="true"/>

                        <field
                            v-if="advanced.gdpr.enabled"
                            id="gdpr-banner-position"
                            :label="$t('settings.bannerPosition')">
                            <dropdown
                                slot="field"
                                id="gdpr-banner-position"
                                key="gdpr-banner-position"
                                v-model="advanced.gdpr.popupPosition"
                                :items="{ 
                                    'centered': $t('settings.gdprBannerPosition.centered'), 
                                    'left': $t('settings.gdprBannerPosition.left'), 
                                    'right': $t('settings.gdprBannerPosition.right'),
                                    'bar': $t('settings.gdprBannerPosition.bar') 
                                }">
                            </dropdown>
                        </field>

                        <separator
                            v-if="advanced.gdpr.enabled"
                            type="ultra thin"
                            :is-line="true" 
                            :note="$t('settings.cookieAdvancedDescription')"
                            :label="$t('settings.cookieAdvanced')" />

                        <field
                            v-if="advanced.gdpr.enabled"
                            id="gdpr-allow-advanced-configuration"
                            :label="$t('settings.gdprAllowAdvancedConfiguration')">
                            <switcher
                                id="gdpr-allow-advanced-configuration"
                                slot="field"
                                v-model="advanced.gdpr.allowAdvancedConfiguration" />
                        </field>

                        <field
                            v-if="advanced.gdpr.enabled && advanced.gdpr.allowAdvancedConfiguration"
                            id="gdpr-advanced-configuration-link-label"
                            :label="$t('settings.gdprAdvancedConfigurationLinkLabel')">
                            <text-input
                                id="gdpr-advanced-configuration-link-label"
                                v-model="advanced.gdpr.advancedConfigurationLinkLabel"
                                :spellcheck="$store.state.currentSite.config.spellchecking" 
                                :placeholder="$t('settings.gdprAdvancedConfigurationLinkPlaceholder')"
                                slot="field" />
                        </field>

                        <separator
                            v-if="advanced.gdpr.enabled && advanced.gdpr.allowAdvancedConfiguration"
                            type="small thin"
                            :is-line="true"/>

                         <field
                            v-if="advanced.gdpr.enabled && advanced.gdpr.allowAdvancedConfiguration"
                            id="gdpr-advanced-configuration-title"
                            :label="$t('settings.gdprAdvancedConfigurationTitle')">
                            <text-input
                                id="gdpr-advanced-configuration-title"
                                v-model="advanced.gdpr.advancedConfigurationTitle"
                                :spellcheck="$store.state.currentSite.config.spellchecking"
                                slot="field" />
                        </field>

                        <field
                            v-if="advanced.gdpr.enabled && advanced.gdpr.allowAdvancedConfiguration"
                            id="gdpr-advanced-configuration-description"
                            :label="$t('settings.gdprAdvancedConfigurationDescription')">
                            <text-area
                                id="gdpr-advanced-configuration-description"
                                v-model="advanced.gdpr.advancedConfigurationDescription"
                                :rows="4"
                                :spellcheck="$store.state.currentSite.config.spellchecking"
                                slot="field" />
                        </field>
                        

                        <field
                            v-if="advanced.gdpr.enabled && advanced.gdpr.allowAdvancedConfiguration"
                            id="gdpr-advanced-configuration-accept-button-label"
                            :label="$t('settings.gdprAdvancedConfigurationAcceptButtonLabel')">
                            <text-input
                                id="gdpr-advanced-configuration-accept-button-label"
                                v-model="advanced.gdpr.advancedConfigurationAcceptButtonLabel"
                                :spellcheck="$store.state.currentSite.config.spellchecking"
                                slot="field" />
                        </field>

                        <field
                            v-if="advanced.gdpr.enabled && advanced.gdpr.allowAdvancedConfiguration"
                            id="gdpr-advanced-configuration-reject-button-label"
                            :label="$t('settings.gdprAdvancedConfigurationRejectButtonLabel')">
                            <text-input
                                id="gdpr-advanced-configuration-reject-button-label"
                                v-model="advanced.gdpr.advancedConfigurationRejectButtonLabel"
                                :spellcheck="$store.state.currentSite.config.spellchecking"
                                slot="field" />
                        </field>

                        <field
                            v-if="advanced.gdpr.enabled && advanced.gdpr.allowAdvancedConfiguration"
                            id="gdpr-advanced-configuration-save-button-label"
                            :label="$t('settings.gdprAdvancedConfigurationSaveButtonLabel')">
                            <text-input
                                id="gdpr-advanced-configuration-reject-button-label"
                                v-model="advanced.gdpr.advancedConfigurationSaveButtonLabel"
                                :spellcheck="$store.state.currentSite.config.spellchecking"
                                slot="field" />
                        </field>

                        <field
                            v-if="advanced.gdpr.enabled && advanced.gdpr.allowAdvancedConfiguration"
                            id="gdpr-advanced-configuration-show-description-link"
                            :label="$t('settings.gdprAdvancedConfigurationPrivacyLink')">
                            <switcher
                                id="gdpr-advanced-configuration-show-description-link"
                                v-model="advanced.gdpr.advancedConfigurationShowDescriptionLink"
                                slot="field" />
                             <small
                                slot="note"
                                class="note"
                                v-pure-html="$t('settings.gdprAdvancedConfigurationPrivacyLinkDescription')">
                            </small>
                        </field>

                        <separator
                            v-if="advanced.gdpr.enabled"
                            type="small thin"
                            :is-line="true"/>

                        <field
                            v-if="advanced.gdpr.enabled && advanced.gdpr.allowAdvancedConfiguration"
                            id="gdpr-debug-mode"
                            :label="$t('settings.gdprDebugMode')">
                            <switcher
                                id="gdpr-debug-mode"
                                v-model="advanced.gdpr.debugMode"
                                slot="field" />
                        </field>

                        <field
                            v-if="advanced.gdpr.enabled"
                            id="gdpr-cookie-settings-revision"
                            :label="$t('settings.gdprCookieSettingsRevision')">
                            <text-input
                                id="gdpr-cookie-settings-revision"
                                v-model="advanced.gdpr.cookieSettingsRevision"
                                :spellcheck="false"
                                type="number"
                                min="1"
                                step="1"
                                slot="field" />
                        </field>

                        <field
                            v-if="advanced.gdpr.enabled"
                            id="gdpr-cookie-settings-ttl"
                            :label="$t('settings.gdprCookieSettingsTTL')">
                            <text-input
                                id="gdpr-cookie-settings-ttl"
                                v-model="advanced.gdpr.cookieSettingsTTL"
                                :spellcheck="false"
                                type="number"
                                min="0"
                                step="1"
                                slot="field" />
                        </field>

                        <separator
                            v-if="advanced.gdpr.enabled && advanced.gdpr.allowAdvancedConfiguration"
                            type="ultra thin"
                            :is-line="true"
                            :label="$t('settings.cookieGroups')" />

                        <field
                            v-if="advanced.gdpr.enabled && advanced.gdpr.allowAdvancedConfiguration"
                            id="gdpr-popup-groups"
                            label=""
                            :labelFullWidth="true">
                            <gdpr-groups
                                id="gdpr-popup-groups"
                                v-model="advanced.gdpr.groups"
                                slot="field" />
                        </field>

                        <separator
                            v-if="advanced.gdpr.enabled && advanced.gdpr.allowAdvancedConfiguration"
                            type="ultra thin"
                            :is-line="true"
                            :label="$t('settings.gConsentMode.title')"
                            :note="$t('settings.gConsentMode.description')" />

                        <field
                            v-if="advanced.gdpr.enabled && advanced.gdpr.allowAdvancedConfiguration"
                            id="g-consent-mode-enabled"
                            :label="$t('settings.gConsentModeEnabled')">
                            <switcher
                                id="g-consent-mode-enabled"
                                v-model="advanced.gdpr.gConsentModeEnabled"
                                slot="field" />
                        </field>

                        <field
                            v-if="advanced.gdpr.enabled && advanced.gdpr.allowAdvancedConfiguration && advanced.gdpr.gConsentModeEnabled"
                            id="g-consent-mode-default-state"
                            :label="$t('settings.gConsentModeDefaultState')">

                            <switcher 
                                key="g-consent-mode-default-state-switcher-1"
                                v-model="advanced.gdpr.gConsentModeDefaultState.ad_storage"
                                label="ad_storage"
                                slot="field" />
                            
                            <switcher 
                            key="g-consent-mode-default-state-switcher-2"
                                v-model="advanced.gdpr.gConsentModeDefaultState.ad_personalization"
                                label="ad_personalization"
                                slot="field" />

                            <switcher 
                                key="g-consent-mode-default-state-switcher-3"
                                v-model="advanced.gdpr.gConsentModeDefaultState.ad_user_data"
                                label="ad_user_data"
                                slot="field" />

                            <switcher 
                                key="g-consent-mode-default-state-switcher-4"
                                v-model="advanced.gdpr.gConsentModeDefaultState.analytics_storage"
                                label="analytics_storage"
                                slot="field" />

                            <switcher 
                                key="g-consent-mode-default-state-switcher-5"
                                v-model="advanced.gdpr.gConsentModeDefaultState.personalization_storage"
                                label="personalization_storage"
                                slot="field" />

                            <switcher 
                                key="g-consent-mode-default-state-switcher-6"
                                v-model="advanced.gdpr.gConsentModeDefaultState.functionality_storage"
                                label="functionality_storage"
                                slot="field" />

                            <switcher 
                                key="g-consent-mode-default-state-switcher-7"
                                v-model="advanced.gdpr.gConsentModeDefaultState.security_storage"
                                label="security_storage"
                                slot="field" />
                        </field>

                        <g-consent-mode-groups
                            v-if="advanced.gdpr.enabled && advanced.gdpr.allowAdvancedConfiguration && advanced.gdpr.gConsentModeEnabled"
                            id="g-consent-mode-groups"
                            v-model="advanced.gdpr.gConsentModeGroups"
                            :cookieGroups="advanced.gdpr.groups"
                            slot="field" />

                        <separator
                            v-if="advanced.gdpr.enabled && advanced.gdpr.allowAdvancedConfiguration"
                            type="ultra thin"
                            :is-line="true"
                            :label="$t('settings.embedConsents')"
                            :note="$t('settings.embedConsentsDescription')" />

                        <div
                            v-if="!currentThemeSupportsEmbedConsents && advanced.gdpr.enabled && advanced.gdpr.allowAdvancedConfiguration"
                            class="msg msg-icon msg-alert">
                            <icon name="warning" customWidth="28" customHeight="28" />
                            <p>{{ $t('settings.themeDoesNotSupportEmbedConsents') }}</p>
                        </div>

                        <field
                            v-if="advanced.gdpr.enabled && advanced.gdpr.allowAdvancedConfiguration"
                            id="embed-consents-groups"
                            label=""
                            :labelFullWidth="true">
                            <embed-consents-groups
                                id="embed-consents-groups"
                                v-model="advanced.gdpr.embedConsents"
                                :cookieGroups="advanced.gdpr.groups"
                                slot="field" />
                        </field>
                    </div>

                    <div slot="tab-6">
                        <field
                            id="html-compression"
                            :label="$t('settings.enableHTMLCompression')">
                            <switcher
                                id="html-compression"
                                v-model="advanced.htmlCompression"
                                slot="field" />
                        </field>

                        <field
                            id="css-compression"
                            :label="$t('settings.enableCSSCompression')">
                            <switcher
                                id="css-compression"
                                v-model="advanced.cssCompression"
                                slot="field" />
                        </field>

                        <field
                            id="html-compression-remove-comments"
                            :label="$t('settings.removeHTMLComments')">
                            <switcher
                                id="html-compression-remove-comments"
                                v-model="advanced.htmlCompressionRemoveComments" 
                                slot="field" />
                        </field>

                        <field
                            id="media-lazyload"
                            :label="$t('settings.enableMediaLazyLoad')">
                            <switcher
                                id="media-lazyload"
                                v-model="advanced.mediaLazyLoad"
                                slot="field" />

                            <small
                                slot="note"
                                class="note">
                                {{ $t('settings.enableMediaLazyLoadInfo') }}
                            </small>
                        </field>

                        <field
                            id="version-suffix"
                            :label="$t('settings.versionParameter')">
                            <switcher
                                id="version-suffix"
                                v-model="advanced.versionSuffix"
                                slot="field" />

                            <small
                                slot="note"
                                class="note">
                                {{ $t('settings.versionParameterInfo') }}
                            </small>
                        </field>

                        <separator
                            type="small thin"
                            :is-line="true"/>

                        <field
                            id="responsive-images"
                            :label="$t('settings.enableResponsiveImages')">
                            <switcher
                                id="responsive-images"
                                v-model="advanced.responsiveImages"
                                slot="field" />

                            <small
                                slot="note"
                                class="note">
                                {{ $t('settings.enableResponsiveImagesInfo') }}
                            </small>
                        </field>

                        <field
                            v-if="advanced.responsiveImages"
                            id="images-quality"
                            :label="$t('settings.responsiveImagesQuality')">
                            <label slot="field">
                                <text-input
                                    id="images-quality"
                                    type="number"
                                    min="1"
                                    max="100"
                                    step="1"
                                    :disabled="advanced.forceWebp && advanced.webpLossless"
                                    v-model="advanced.imagesQuality" />
                                %
                            </label>
                        </field>

                        <separator
                            v-if="advanced.responsiveImages"
                            type="small thin"
                            :is-line="true"/>
                        
                        <field
                            v-if="advanced.responsiveImages"
                            id="convert-to-webp"
                            :label="$t('settings.convertToWebp')">
                            <switcher
                                id="version-suffix"
                                v-model="advanced.forceWebp"
                                slot="field" />

                            <p
                                v-if="advanced.forceWebp && $store.state.app.config.resizeEngine === 'jimp'"
                                slot="note" 
                                class="msg msg-icon msg-alert">
                                <icon name="warning" customWidth="28" customHeight="28" />
                                <span>{{ $t('settings.convertToWebpJimpWarning') }}</span>
                            </p>

                            <small
                                slot="note"
                                class="note">
                                {{ $t('settings.convertToWebpInfo') }}
                            </small>
                        </field>

                        <field
                            v-if="advanced.responsiveImages && advanced.forceWebp"
                            id="webp-lossless"
                            :label="$t('settings.webpLossless')">
                            <switcher
                                id="webp-lossless"
                                v-model="advanced.webpLossless"
                                slot="field" />
                        </field>

                        <field
                            v-if="advanced.responsiveImages && advanced.forceWebp"
                            id="images-alpha-quality"
                            :label="$t('settings.responsiveImagesAlphaQuality')">
                            <label slot="field">
                                <text-input
                                    id="images-alpha-quality"
                                    type="number"
                                    min="1"
                                    max="100"
                                    step="1"
                                    :disabled="advanced.forceWebp && advanced.webpLossless"
                                    v-model="advanced.alphaQuality" />
                                %
                            </label>
                        </field>
                    </div>

                    <div slot="tab-7">
                        <field
                            v-if="siteUsesRelativeUrls"
                            :label="$t('settings.feedsRelativeUrlsInfo')"
                            :labelFullWidth="true" />

                        <field
                            v-if="!siteUsesRelativeUrls"
                            id="feed-enable-rss"
                            :label="$t('settings.enableRSSFeed')">
                            <switcher
                                id="feed-enable-rss"
                                v-model="advanced.feed.enableRss"
                                slot="field" />
                        </field>

                        <field
                            v-if="!siteUsesRelativeUrls"
                            id="feed-enable-json"
                            :label="$t('settings.enableJSONFeed')">
                            <switcher
                                id="feed-enable-json"
                                v-model="advanced.feed.enableJson"
                                slot="field" />
                        </field>

                        <field
                            v-if="!siteUsesRelativeUrls && (advanced.feed.enableRss || advanced.feed.enableJson)"
                            id="feed-title"
                            :label="$t('settings.feedTitle')">
                            <dropdown
                                slot="field"
                                id="feed-title"
                                key="feed-title"
                                v-model="advanced.feed.title"
                                :items="{ 
                                    'displayName': $t('settings.websiteName'), 
                                    'customTitle': $t('settings.customFeedTitle') 
                                }"></dropdown>
                        </field>

                        <field
                            v-if="!siteUsesRelativeUrls && (advanced.feed.enableRss || advanced.feed.enableJson) && advanced.feed.title === 'customTitle'"
                            id="feed-title-value"
                            :label="$t('settings.customFeedTitle')">
                            <text-input
                                id="feed-title-value"
                                type="text"
                                :spellcheck="$store.state.currentSite.config.spellchecking"
                                v-model="advanced.feed.titleValue"
                                slot="field" />
                        </field>

                        <field
                            v-if="!siteUsesRelativeUrls && (advanced.feed.enableRss || advanced.feed.enableJson)"
                            id="feed-show-full-text"
                            :label="$t('settings.showFullText')">
                            <switcher
                                id="feed-show-full-text"
                                v-model="advanced.feed.showFullText"
                                slot="field" />

                            <small
                                slot="note"
                                class="note">
                                {{ $t('settings.showFullTextInFeedInfo') }}
                            </small>
                        </field>

                        <field
                            v-if="!siteUsesRelativeUrls && advanced.feed.enableRss"
                            id="feed-updated-date-type"
                            :label="$t('settings.feedUpdatedDateType')">
                            <dropdown
                                slot="field"
                                id="feed-updated-date-type"
                                key="feed-updated-date-type"
                                v-model="advanced.feed.updatedDateType"
                                :items="{ 
                                    'createdAt': $t('settings.postCreationDate'), 
                                    'modifiedAt': $t('settings.postModificationDate') 
                                }">
                            </dropdown>
                        </field>

                        <field
                            v-if="!siteUsesRelativeUrls"
                            id="feed-show-only-featured"
                            :label="$t('settings.showOnlyFeaturedPosts')">
                            <switcher
                                id="feed-show-only-featured"
                                v-model="advanced.feed.showOnlyFeatured"
                                slot="field" />
                        </field>

                        <field
                            v-if="!siteUsesRelativeUrls && !advanced.feed.showOnlyFeatured"
                            id="feed-exclude-featured"
                            :label="$t('settings.excludeFeaturedPosts')">
                            <switcher
                                id="feed-exclude-featured"
                                v-model="advanced.feed.excludeFeatured"
                                slot="field" />
                        </field>

                        <field
                            v-if="!siteUsesRelativeUrls && (advanced.feed.enableRss || advanced.feed.enableJson)"
                            id="feed-number-of-posts"
                            :label="$t('settings.numberOfPostsInFeed')">
                            <text-input
                                id="feed-number-of-posts"
                                type="number"
                                min="0"
                                max="10000000"
                                step="1"
                                v-model="advanced.feed.numberOfPosts"
                                slot="field" />
                        </field>

                        <field
                            v-if="!siteUsesRelativeUrls && (advanced.feed.enableRss || advanced.feed.enableJson)"
                            id="feed-show-featured-image"
                            :label="$t('settings.showFeaturedImage')">
                            <switcher
                                id="feed-show-featured-image"
                                v-model="advanced.feed.showFeaturedImage"
                                slot="field" />

                            <small
                                slot="note"
                                class="note">
                                {{ $t('settings.showFeaturedImageInfo') }}
                            </small>
                        </field>
                    </div>

                    <div slot="tab-8">
                        <field
                            id="posts-listing-order-by"
                            :label="$t('settings.postsOrderBy')">
                            <dropdown
                                slot="field"
                                id="posts-listing-order-by"
                                key="posts-listing-order-by"
                                v-model="advanced.postsListingOrderBy"
                                :items="orderByOptions"></dropdown>
                        </field>

                        <field
                            id="posts-listing-order"
                            :label="$t('settings.postsOrdering')">
                            <dropdown
                                slot="field"
                                id="posts-listing-order"
                                key="posts-listing-order"
                                v-model="advanced.postsListingOrder"
                                :items="orderOptions"></dropdown>
                        </field>

                        <field
                            id="featured-posts-listing-order-by"
                            :label="$t('settings.featuredPostsOrderBy')">
                            <dropdown
                                slot="field"
                                id="featured-posts-listing-order-by"
                                key="featured-posts-listing-order-by"
                                v-model="advanced.featuredPostsListingOrderBy"
                                :items="orderByOptions"></dropdown>
                        </field>

                        <field
                            id="featured-posts-listing-order"
                            :label="$t('settings.featuredPostsOrdering')">
                            <dropdown
                                slot="field"
                                id="featured-posts-listing-order"
                                key="featured-posts-listing-order"
                                v-model="advanced.featuredPostsListingOrder"
                                :items="orderOptions"></dropdown>
                        </field>

                        <field
                            id="hidden-posts-listing-order-by"
                            :label="$t('settings.hiddenPostsOrderBy')">
                            <dropdown
                                slot="field"
                                id="hidden-posts-listing-order-by"
                                key="hidden-posts-listing-order-by"
                                v-model="advanced.hiddenPostsListingOrderBy"
                                :items="orderByOptions"></dropdown>
                        </field>

                        <field
                            id="hidden-posts-listing-order"
                            :label="$t('settings.hiddenPostsOrdering')">
                            <dropdown
                                slot="field"
                                id="hidden-posts-listing-order"
                                key="hidden-posts-listing-order"
                                v-model="advanced.hiddenPostsListingOrder"
                                :items="orderOptions"></dropdown>
                        </field>

                        <separator
                            type="small"
                            :is-line="true"
                            label="" />

                        <field
                            id="related-posts-criteria"
                            :label="$t('settings.relatedPostsSelectionMechanism')">
                            <dropdown
                                slot="field"
                                id="related-posts-order-by"
                                key="related-posts-order-by"
                                v-model="advanced.relatedPostsCriteria"
                                :items="relatedPostsCriteriaOptions"></dropdown>
                        </field>

                        <field
                            id="related-posts-order-by"
                            :label="$t('settings.relatedPostsOrdering')">
                            <dropdown
                                slot="field"
                                id="related-posts-order-by"
                                key="related-posts-order-by"
                                v-model="advanced.relatedPostsOrder"
                                :items="relatedPostsOrderingOptions"></dropdown>
                        </field>

                         <field
                            id="related-posts-use-all-posts"
                            :label="$t('settings.relatedPostsOptions')">
                            <switcher
                                id="related-posts-use-all-posts"
                                v-model="advanced.relatedPostsIncludeAllPosts"
                                slot="field" />

                            <small
                                slot="note"
                                class="note">
                                {{ $t('settings.relatedPostsOptionsInfo') }}
                            </small>
                        </field>
                    </div>

                    <div slot="tab-9">
                        <separator
                            type="medium"
                            :label="$t('post.editorWYSIWYG')" />

                        <field
                            :label="$t('settings.additionalValidElementsInWYSIWYGEditor')">
                            <text-area
                                slot="field"
                                :spellcheck="false"
                                :rows="8"
                                v-model="advanced.editors.wysiwygAdditionalValidElements" />
                            <small
                                slot="note"
                                class="note"
                                v-pure-html="$t('settings.additionalValidElementsInWYSIWYGEditorInfo')">
                            </small>
                        </field>

                        <field
                            :label="$t('settings.customElementsInWYSIWYGEditor')">
                            <text-area
                                slot="field"
                                :spellcheck="false"
                                :rows="8"
                                v-model="advanced.editors.wysiwygCustomElements" />
                            <small
                                slot="note"
                                class="note"
                                v-pure-html="$t('settings.customElementsInWYSIWYGEditorInfo')">
                            </small>
                        </field>

                        <separator
                            type="medium"
                            :label="$t('settings.codeEditor')" />

                        <field
                            id="codemirror-indent-size"
                            :label="$t('settings.indentSize')">
                            <text-input
                                id="codemirror-indent-size"
                                type="number"
                                min="1"
                                max="100"
                                step="1"
                                v-model="advanced.editors.codemirrorTabSize"
                                slot="field" />
                        </field>

                        <field
                            id="codemirror-auto-indent"
                            :label="$t('settings.enableAutoIndent')">
                            <switcher
                                slot="field"
                                id="codemirror-auto-indent"
                                v-model="advanced.editors.codemirrorAutoIndent" />
                        </field>
                    </div>
                </tabs>
            </fields-group>

            <p-footer>
                <btn-dropdown
                    slot="buttons"
                    buttonColor="green"
                    :items="dropdownItems"
                    :disabled="!siteHasTheme || buttonsLocked"
                    localStorageKey="publii-preview-mode"
                    :previewIcon="true"
                    :isReversed="true"
                    defaultValue="full-site-preview" />

                <p-button
                    @click.native="checkBeforeSave(false)"
                    slot="buttons"
                    type="secondary"
                    :disabled="buttonsLocked">
                    {{ $t('settings.saveSettings') }}
                </p-button>
            </p-footer>
        </div>
    </section>
</template>

<script>
import Utils from './../helpers/utils.js';
import AvailableLanguagesList from './../config/langs.js';
import EmbedConsentsGroups from './basic-elements/EmbedConsentsGroups';
import GConsentModeGroups from './basic-elements/GConsentModeGroups';
import GdprGroups from './basic-elements/GdprGroups';
import ThemesDropdown from './basic-elements/ThemesDropdown';

export default {
    name: 'site-settings',
    components: {
        'embed-consents-groups': EmbedConsentsGroups,
        'g-consent-mode-groups': GConsentModeGroups,
        'gdpr-groups': GdprGroups,
        'themes-dropdown': ThemesDropdown
    },
    data () {
        return {
            buttonsLocked: false,
            logo: {
                color: '',
                icon: ''
            },
            language: '',
            customLanguage: '',
            spellchecking: false,
            description: '',
            name: '',
            uuid: '',
            theme: '',
            currentTheme: '',
            currentThemeVersion: '',
            advanced: {},
            errors: [],
            spellcheckerLanguages: false
        };
    },
    computed: {
        currentThemeHasSupportedFeaturesList () {
            return this.$store.state.currentSite.themeSettings.supportedFeatures;
        },
        currentThemeSupportsEmbedConsents () {
            return this.$store.state.currentSite.themeSettings.supportedFeatures && this.$store.state.currentSite.themeSettings.supportedFeatures.embedConsents;
        },
        currentThemeSupportsPages () {
            return this.$store.state.currentSite.themeSettings.supportedFeatures && this.$store.state.currentSite.themeSettings.supportedFeatures.pages;
        },
        currentThemeSupportsTagsList () {
            return this.$store.state.currentSite.themeSettings.supportedFeatures && this.$store.state.currentSite.themeSettings.supportedFeatures.tagsList;
        },
        currentThemeSupportsTagPages () {
            return (
                this.$store.state.currentSite.themeSettings.supportedFeatures &&
                (
                    this.$store.state.currentSite.themeSettings.supportedFeatures.tagPages ||
                    typeof this.$store.state.currentSite.themeSettings.supportedFeatures.tagPages === 'undefined'
                )
            ) || (
                !this.$store.state.currentSite.themeSettings.supportedFeatures &&
                this.$store.state.currentSite.themeSettings.renderer &&
                this.$store.state.currentSite.themeSettings.renderer.createTagPages
            ) || (
                this.$store.state.currentSite.themeSettings.supportedFeatures &&
                (
                    this.$store.state.currentSite.themeSettings.supportedFeatures.tagPages ||
                    typeof this.$store.state.currentSite.themeSettings.supportedFeatures.tagPages === 'undefined'
                ) &&
                this.$store.state.currentSite.themeSettings.renderer &&
                this.$store.state.currentSite.themeSettings.renderer.createTagPages
            );
        },
        currentThemeSupportsAuthorPages () {
            return (
                this.$store.state.currentSite.themeSettings.supportedFeatures &&
                (
                    this.$store.state.currentSite.themeSettings.supportedFeatures.authorPages ||
                    typeof this.$store.state.currentSite.themeSettings.supportedFeatures.authorPages === 'undefined'
                )
            ) || (
                !this.$store.state.currentSite.themeSettings.supportedFeatures &&
                this.$store.state.currentSite.themeSettings.renderer &&
                this.$store.state.currentSite.themeSettings.renderer.createAuthorPages
            ) || (
                this.$store.state.currentSite.themeSettings.supportedFeatures &&
                (
                    this.$store.state.currentSite.themeSettings.supportedFeatures.authorPages ||
                    typeof this.$store.state.currentSite.themeSettings.supportedFeatures.authorPages === 'undefined'
                ) &&
                this.$store.state.currentSite.themeSettings.renderer &&
                this.$store.state.currentSite.themeSettings.renderer.createAuthorPages
            );
        },
        currentThemeSupportsSearchPage () {
            return (
                this.$store.state.currentSite.themeSettings.supportedFeatures &&
                this.$store.state.currentSite.themeSettings.supportedFeatures.searchPage
            ) || (
                !this.$store.state.currentSite.themeSettings.supportedFeatures && 
                this.$store.state.currentSite.themeSettings.renderer &&
                this.$store.state.currentSite.themeSettings.renderer.createSearchPage
            ) || (
                this.$store.state.currentSite.themeSettings.supportedFeatures &&
                (
                    this.$store.state.currentSite.themeSettings.supportedFeatures.searchPage ||
                    typeof this.$store.state.currentSite.themeSettings.supportedFeatures.searchPage === 'undefined'
                ) &&
                this.$store.state.currentSite.themeSettings.renderer &&
                this.$store.state.currentSite.themeSettings.renderer.createSearchPage
            );
        },
        currentThemeSupportsErrorPage () {
            return (
                this.$store.state.currentSite.themeSettings.supportedFeatures &&
                this.$store.state.currentSite.themeSettings.supportedFeatures.errorPage
            ) || (
                !this.$store.state.currentSite.themeSettings.supportedFeatures && 
                this.$store.state.currentSite.themeSettings.renderer &&
                this.$store.state.currentSite.themeSettings.renderer.create404Page
            ) || (
                this.$store.state.currentSite.themeSettings.supportedFeatures &&
                (
                    this.$store.state.currentSite.themeSettings.supportedFeatures.errorPage ||
                    typeof this.$store.state.currentSite.themeSettings.supportedFeatures.errorPage === 'undefined'
                ) &&
                this.$store.state.currentSite.themeSettings.renderer &&
                this.$store.state.currentSite.themeSettings.renderer.create404Page
            );
        },
        advancedTabs () {
            return [
                this.$t('ui.seo'),
                this.$t('settings.urls'),
                this.$t('settings.sitemap'),
                this.$t('settings.openGraph'),
                this.$t('settings.twitterCards'),
                this.$t('settings.GDPR'),
                this.$t('settings.websiteSpeed'),
                this.$t('settings.RSSJSONFeed'),
                this.$t('settings.postsListing'),
                this.$t('settings.editors')
            ];
        },
        seoOptions () {
            return {
                'index, follow': this.$t('ui.indexFollow'),
                'index, nofollow': this.$t('ui.indexNofollow'),
                'index, follow, noarchive': this.$t('ui.indexFollowNoArchive'),
                'index, nofollow, noarchive': this.$t('ui.indexNofollowNoArchive'),
                'noindex, follow': this.$t('ui.noindexFollow'),
                'noindex, nofollow': this.$t('ui.noindexNofollow')
            };
        },
        orderByOptions () {
            return {
                'created_at': this.$t('settings.postCreationDate'),
                'title': this.$t('settings.postTile'),
                'modified_at': this.$t('settings.postModificationDate'),
                'id': this.$t('settings.postID')
            };
        },
        orderOptions () {
            return {
                'DESC': this.$t('settings.descending'),
                'ASC': this.$t('settings.ascending')
            };
        },
        relatedPostsOrderingOptions () {
            return {
                'default': this.$t('settings.byIDDescending'),
                'id-asc': this.$t('settings.byIDAscending'),
                'random': this.$t('settings.random')
            };
        },
        relatedPostsCriteriaOptions () {
            return {
                'titles': this.$t('settings.useOnlyTitles'),
                'tags': this.$t('settings.useOnlyTags'),
                'titles-and-tags': this.$t('settings.useTitlesAndTags')
            };
        },
        siteHasTheme () {
            if (
                !this.$store.state.currentSite.config.theme &&
                this.theme.indexOf('use-') !== 0 &&
                this.theme.indexOf('install-use-') !== 0
            ) {
                return false;
            }

            if (
                this.$store.state.currentSite.config.theme &&
                this.theme === 'uninstall-' + this.$store.state.currentSite.config.theme
            ) {
                return false;
            }

            return true;
        },
        siteUsesRelativeUrls () {
            return !!this.$store.state.currentSite.config.deployment.relativeUrls;
        },
        websiteName () {
            return this.$store.state.currentSite.config.name;
        },
        availableLanguages () {
            let langs = {};

            for (let lang of AvailableLanguagesList) {
                langs[lang.code] = lang.name;
            }

            return langs;
        },
        twitterCardsTypes () {
            return {
                'summary': this.$t('settings.twitterSummaryCard'),
                'summary_large_image': this.$t('settings.twitterSummaryCardLargeImage')
            };
        },
        sitemapLink () {
            let sitemapLink = false;
            let syncDate = this.$store.state.currentSite.config.syncDate;

            if (this.$store.state.currentSite.config.domain && typeof syncDate !== 'undefined') {
                sitemapLink = this.$store.state.currentSite.config.domain + '/sitemap.xml';
            }

            return sitemapLink;
        },
        postPages () {
            let posts = this.$store.state.currentSite.posts.filter(post => post.status.indexOf('published') > -1).map(post => post.id);
            let pages = this.$store.state.currentSite.pages.filter(page => page.status.indexOf('published') > -1).map(page => page.id)
            return posts.concat(pages);
        },
        dropdownItems () {
            return [
                {
                    label: this.$t('ui.previewFullWebsite'),
                    activeLabel: this.$t('ui.saveAndPreview'),
                    value: 'full-site-preview',
                    isVisible: () => true,
                    icon: 'full-preview-monitor',
                    onClick: this.saveAndPreview.bind(this, 'full-site')
                },
                {
                    label: this.$t('ui.renderFullWebsite'),
                    activeLabel: this.$t('ui.saveAndRender'),
                    value: 'full-site-render',
                    isVisible: () => !!this.$store.state.app.config.enableAdvancedPreview,
                    icon: 'full-render-monitor',
                    onClick: this.saveAndRender.bind(this, 'full-site')
                },
                {
                    label: this.$t('ui.previewFrontPageOnly'),
                    activeLabel: this.$t('ui.saveAndPreview'),
                    value: 'homepage-preview',
                    icon: 'quick-preview',
                    isVisible: () => true,
                    onClick: this.saveAndPreview.bind(this, 'homepage')
                },
                {
                    label: this.$t('ui.renderFrontPageOnly'),
                    activeLabel: this.$t('ui.saveAndRender'),
                    value: 'homepage-render',
                    icon: 'quick-render',
                    isVisible: () => !!this.$store.state.app.config.enableAdvancedPreview,
                    onClick: this.saveAndRender.bind(this, 'homepage')
                }
            ];
        },
        hasNonAutomaticSpellchecker () {
            return mainProcessAPI.getEnv().platformName !== 'darwin';
        },
        spellcheckIsNotSupported () {
            if (this.spellcheckerLanguages === false) {
                return false;
            }

            let language = this.language;

            if (language === 'custom') {
                language = this.customLanguage;
            }

            if (this.spellcheckerLanguages.indexOf(language) > -1) {
                return false;
            } else {
                language = language.split('-');
                language = language[0];

                if (this.spellcheckerLanguages.indexOf(language) > -1) {
                    return false;
                }
            }

            return true;
        },
        syncInProgress () {
            return this.$store.state.components.sidebar.syncInProgress;
        }
    },
    beforeMount () {
        this.logo.color = this.$store.state.currentSite.config.logo.color;
        this.logo.icon = this.$store.state.currentSite.config.logo.icon;
        this.language = this.$store.state.currentSite.config.language;
        this.spellchecking = this.$store.state.currentSite.config.spellchecking;

        if (!this.availableLanguages[this.language]) {
            this.customLanguage = this.language;
            this.language = 'custom';
        }

        this.name = this.$store.state.currentSite.config.displayName;
        this.description = this.$store.state.currentSite.config.description;

        if (this.$store.state.currentSite.config.uuid) {
            this.uuid = this.$store.state.currentSite.config.uuid;
        }

        this.setCurrentTheme();
        this.advanced = Object.assign({}, this.advanced, this.$store.state.currentSite.config.advanced);
    },
    watch: {
        'advanced.urls.cleanUrls': function (newValue, oldValue) {
            if (newValue === false && oldValue === true) {
                this.advanced.urls.postsPrefix = '';
                this.advanced.urls.tagsPrefixAfterPostsPrefix = false;
                this.advanced.urls.authorsPrefixAfterPostsPrefix = false;
            }
        }
    },
    async mounted () {
        setTimeout(() => {
            this.$refs['logo-creator'].changeIcon(this.logo.icon);
            this.$refs['logo-creator'].changeColor(this.logo.color);
        }, 0);

        this.$bus.$on('regenerate-thumbnails-close', this.savedFromPopup);
        this.spellcheckerLanguages = await mainProcessAPI.invoke('app-main-get-spellchecker-languages');

        if (this.spellcheckerLanguages.length) {
            this.spellcheckerLanguages = this.spellcheckerLanguages.map(lang => lang.toLocaleLowerCase());
        }
    },
    methods: {
        checkBeforeSave (showPreview, renderingType, renderFiles) {
            if (
                this.$store.state.currentSite.config.theme && (
                    this.theme === 'install-use-' + this.$store.state.currentSite.config.theme
                ) && 
                this.$store.state.currentSite.themeHasOverrides
            ) {
                this.$bus.$emit('confirm-display', {
                    hasInput: false,
                    message: this.$t('settings.currentThemeHasOverrides'),
                    okClick: () => {
                        this.save(showPreview, renderingType, renderFiles);
                    },
                    okLabel: this.$t('ui.ok'),
                    cancelLabel: this.$t('ui.cancel')
                });
            } else {
                this.save(showPreview, renderingType, renderFiles);
            }
        },
        saveAndPreview (renderingType = false) {
            this.checkBeforeSave(true, renderingType, false);
        },
        saveAndRender (renderingType = false) {
            this.checkBeforeSave(true, renderingType, true);
        },
        save (showPreview = false, renderingType = false, renderFiles = false) {
            this.buttonsLocked = true;

            if (!this.validate()) {
                this.buttonsLocked = false;
                return;
            }

            let siteName = this.$store.state.currentSite.config.name;
            let newTheme = this.$store.state.currentSite.config.theme;

            if(this.theme !== '') {
                newTheme = this.theme;
            }

            let newSettings = {};
            newSettings.name = this.name;
            newSettings.description = this.description;

            if (this.uuid) {
                newSettings.uuid = this.uuid;
            }

            newSettings.displayName = this.name;
            newSettings.spellchecking = this.spellchecking;
            newSettings.logo = {
                icon: this.$refs['logo-creator'].getActiveIcon(),
                color: this.$refs['logo-creator'].getActiveColor()
            };

            if (this.language === 'custom') {
                newSettings.language = this.customLanguage;
            } else {
                newSettings.language = this.language;
            }

            // Remove GDPR script groups with empty name or ID
            this.advanced.gdpr.groups = this.advanced.gdpr.groups.filter(group => {
                if (group.name === '') {
                    return false;
                }

                return true;
            });
            newSettings.advanced = Object.assign({}, this.advanced);
            newSettings.advanced.gdpr.settingsVersion = 'v2';
            newSettings.theme = this.theme;

            // Merge new settings with existing settings
            let currentSiteConfigCopy = JSON.parse(JSON.stringify(this.$store.state.currentSite.config));
            newSettings = Utils.deepMerge(currentSiteConfigCopy, newSettings);

            // Send request to the back-end
            mainProcessAPI.send('app-site-config-save', {
                "site": siteName,
                "settings": newSettings,
                "source": "settings"
            });

            // Settings saved
            mainProcessAPI.receiveOnce('app-site-config-saved', (data) => {
                if (data.status === true) {
                    newSettings.name = data.siteName;
                }

                if(
                    data.status === true &&
                    siteName !== data.siteName &&
                    data.siteName !== '' &&
                    Object.keys(this.$store.state.sites).indexOf(data.siteName) === -1
                ) {
                    this.$store.commit('replaceSite', {
                        oldSiteName: siteName,
                        newSiteName: newSettings.name,
                        displayName: newSettings.displayName
                    });

                    siteName = data.siteName;
                    this.$router.push('/site/' + siteName + '/settings/');
                    window.localStorage.setItem('publii-last-opened-website', siteName);
                }

                if(data.status === true) {
                    if (
                        data.thumbnailsRegenerateRequired &&
                        this.$store.state.currentSite.posts &&
                        this.$store.state.currentSite.posts.length > 0
                    ) {
                        mainProcessAPI.send('app-site-regenerate-thumbnails-required', {
                            name: this.$store.state.currentSite.config.name
                        });

                        mainProcessAPI.receiveOnce('app-site-regenerate-thumbnails-required-status', (data) => {
                            if (data.message) {
                                this.$bus.$emit('regenerate-thumbnails-display', {
                                    qualityChanged: false,
                                    savedSettingsCallback: {
                                        newSettings,
                                        siteName,
                                        showPreview,
                                        renderingType,
                                        renderFiles
                                    }
                                });
                            } else {
                                this.saved(newSettings, siteName, showPreview, renderingType, renderFiles);
                            }
                        });
                    } else {
                        this.saved(newSettings, siteName, showPreview, renderingType, renderFiles);
                    }

                    if(data.newThemeConfig) {
                        this.$store.commit('setNewThemeConfig', {
                            themeName: data.themeName,
                            newThemeConfig: data.newThemeConfig
                        });
                    }
                }

                if(data.message === 'success-save') {
                    this.$bus.$emit('message-display', {
                        message: this.$t('settings.siteSettingsSaveSuccessMessage'),
                        type: 'success',
                        lifeTime: 3
                    });

                    this.buttonsLocked = false;
                }

                if(data.message === 'empty-name') {
                    this.$bus.$emit('message-display', {
                        message: this.$t('settings.siteSettingsSaveEmptyNameErrorMessage'),
                        type: 'warning',
                        lifeTime: 3
                    });

                    this.buttonsLocked = false;
                }

                if(data.message === 'duplicated-name') {
                    this.$bus.$emit('message-display', {
                        message: this.$t('settings.siteSettingsSaveDuplicateNameErrorMessage'),
                        type: 'warning',
                        lifeTime: 3
                    });

                    this.buttonsLocked = false;
                }

                if(data.message === 'site-not-exists') {
                    this.$bus.$emit('message-display', {
                        message: this.$t('settings.siteSettingsSaveSiteNotExistsErrorMessage'),
                        type: 'warning',
                        lifeTime: 3
                    });

                    this.buttonsLocked = false;
                }

                if(data.message === 'no-keyring') {
                    if (document.body.getAttribute('data-os') === 'linux') {
                        this.$bus.$emit('alert-display', {
                            message: this.$t('settings.siteSettingsSaveNoKeyringErrorMessageLinux'),
                            okLabel: this.$t('ui.iUnderstand'),
                        });
                    } else {
                        this.$bus.$emit('alert-display', {
                            message: this.$t('settings.siteSettingsSaveNoKeyringErrorMessage'),
                            okLabel: this.$t('ui.iUnderstand'),
                        });
                    }

                    this.buttonsLocked = false;
                }

                mainProcessAPI.send('app-site-reload', {
                    siteName: siteName
                });

                mainProcessAPI.receiveOnce('app-site-reloaded', (result) => {
                    this.$store.commit('setSiteConfig', result);
                    this.$store.commit('switchSite', result.data);
                });
            });
        },
        savedFromPopup (callbackData) {
            this.saved(callbackData.newSettings, callbackData.siteName, callbackData.showPreview, callbackData.renderingType, callbackData.renderFiles);
        },
        saved (newSettings, oldName, showPreview = false, renderingType = false, renderFiles = false) {
            let oldTheme = this.$store.state.currentSite.config.theme;

            if (newSettings.theme) {
                newSettings.theme =    newSettings.theme.replace(/^site-/, '')
                                                        .replace(/^app-/, '')
                                                        .replace(/^install-use-/, '')
                                                        .replace(/^use-/, '')
                                                        .replace(/^uninstall-/, '');
            }

            if (newSettings.theme === '') {
                newSettings.theme = oldTheme;
            }

            this.$store.commit('replaceSiteConfig', {
                newSettings: newSettings,
                oldName: oldName
            });

            setTimeout(async () => {
                this.setCurrentTheme();

                // Remove old entry if user changed the site name
                if (oldName !== this.$store.state.currentSite.config.name) {
                    this.$store.commit('removeWebsite', oldName);
                }

                this.buttonsLocked = false;

                if (showPreview) {
                    let previewLocationExists = await mainProcessAPI.existsSync(this.$store.state.app.config.previewLocation);

                    if (this.$store.state.app.config.previewLocation !== '' && !previewLocationExists) {
                        this.$bus.$emit('confirm-display', {
                            message: this.$t('sync.previewCatalogDoesNotExistInfo'),
                            okLabel: this.$t('sync.goToAppSettings'),
                            okClick: () => {
                                this.$router.push(`/app-settings/`);
                            }
                        });
                        return;
                    }

                    if (renderingType === 'homepage') {
                        this.$bus.$emit('rendering-popup-display', {
                            homepageOnly: true,
                            showPreview: !renderFiles,
                        });
                    } else {
                        this.$bus.$emit('rendering-popup-display', {
                            showPreview: !renderFiles 
                        });
                    }
                }
            }, 1000);
        },
        validate () {
            if (this.advanced.urls.tagsPrefix.trim() === '' && !!this.advanced.urls.cleanUrls) {
                this.$bus.$emit('message-display', {
                    message: this.$t('settings.tagsPrefixCannotBeEmpty'),
                    type: 'warning',
                    lifeTime: 3
                });

                this.errors.push('tags-prefix');
                this.$refs['advanced-tabs'].toggle('URLs');

                return false;
            }

            if (this.advanced.urls.authorsPrefix.trim() === '') {
                this.$bus.$emit('message-display', {
                    message: this.$t('settings.authorsPrefixCannotBeEmpty'),
                    type: 'warning',
                    lifeTime: 3
                });

                this.errors.push('authors-prefix');
                this.$refs['advanced-tabs'].toggle('URLs');

                return false;
            }

            if (this.advanced.usePageAsFrontpage && !this.advanced.pageAsFrontpage) {
                this.$bus.$emit('message-display', {
                    message: this.$t('settings.frontpagePageCannotBeEmpty'),
                    type: 'warning',
                    lifeTime: 3
                });

                this.errors.push('page-as-frontpage');
                this.$refs['advanced-tabs'].toggle('SEO');

                return false;
            }

            if (this.advanced.urls.authorsPrefix.trim() === this.advanced.urls.tagsPrefix.trim()) {
                this.$bus.$emit('message-display', {
                    message: this.$t('settings.authorsPrefixCannotEqualTagsPrefix'),
                    type: 'warning',
                    lifeTime: 3
                });

                this.errors.push('tags-prefix');
                this.errors.push('authors-prefix');
                this.$refs['advanced-tabs'].toggle('URLs');

                return false;
            }

            if (this.advanced.urls.pageName.trim() === '') {
                this.$bus.$emit('message-display', {
                    message: this.$t('settings.paginationPhraseCannotBeEmpty'),
                    type: 'warning',
                    lifeTime: 3
                });

                this.errors.push('pagination-phrase');
                this.$refs['advanced-tabs'].toggle('URLs');

                return false;
            }

            if (this.advanced.urls.errorPage.trim() === '') {
                this.$bus.$emit('message-display', {
                    message: this.$t('settings.errorPageFilenameCannotBeEmpty'),
                    type: 'warning',
                    lifeTime: 3
                });

                this.errors.push('error-page');
                this.$refs['advanced-tabs'].toggle('URLs');

                return false;
            }

            if (this.advanced.urls.searchPage.trim() === '') {
                this.$bus.$emit('message-display', {
                    message: this.$t('settings.searchPageFilenameCannotBeEmpty'),
                    type: 'warning',
                    lifeTime: 3
                });

                this.errors.push('search-page');
                this.$refs['advanced-tabs'].toggle('URLs');

                return false;
            }

            if (this.advanced.urls.errorPage.trim() === this.advanced.urls.searchPage.trim()) {
                this.$bus.$emit('message-display', {
                    message: this.$t('settings.errorPageFilenameCannotEqualSearchPageFilename'),
                    type: 'warning',
                    lifeTime: 3
                });

                this.errors.push('error-page');
                this.errors.push('search-page');
                this.$refs['advanced-tabs'].toggle('URLs');

                return false;
            }

            return true;
        },
        clearErrors (errorName) {
            let pos = this.errors.indexOf(errorName);
            this.errors.splice(pos, 1);
        },
        setCurrentTheme () {
            this.currentTheme = this.$store.state.currentSite.config.theme;

            if (this.currentTheme !== '') {
                let oldName = this.currentTheme;
                this.currentTheme = this.$store.state.currentSite.themes.filter(theme => theme.directory === this.currentTheme);

                if(this.currentTheme.length) {
                    this.currentTheme = this.currentTheme[0].name;
                } else {
                    this.currentTheme = oldName;
                }
            }

            if (this.$store.state.currentSite.themeSettings) {
                this.currentThemeVersion = this.$store.state.currentSite.themeSettings.version;
            }
        },
        customPostLabels (value) {
            let postsAndPages = this.$store.state.currentSite.posts.concat(this.$store.state.currentSite.pages);
            return postsAndPages.filter(item => item.id === value).map(item => item.title)[0];
        },
        closeDropdown (refID) {
            this.$refs[refID].isOpen = false;
        }
    },
    beforeDestroy () {
        this.$bus.$off('regenerate-thumbnails-close', this.savedFromPopup);
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';
@import '../scss/notifications.scss';

.site-settings {
    margin: 0 auto;
    max-width: $wrapper;
    user-select: none;

    .multiple-checkboxes {
        label {
            display: block;
            margin-bottom: 1rem;
        }
    }
}

.note.is-warning {
    color: var(--warning);
}
.msg-bm {
   margin-bottom:3rem;
}

label[for="g-consent-mode-default-state"] + div > .has-label {
    display: block;
    margin: 0 0 10px 0;
}
</style>
