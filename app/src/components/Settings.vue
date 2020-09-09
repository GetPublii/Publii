<template>
    <section
        class="content"
        ref="content">
        <div class="site-settings">
            <p-header title="Site Settings">
                <p-button
                    @click.prevent.native="save(false)"
                    slot="buttons"
                    type="secondary"
                    :disabled="buttonsLocked">
                    Save Settings
                </p-button>

                <btn-dropdown
                    slot="buttons"
                    buttonColor="green"
                    :items="dropdownItems"
                    :disabled="!siteHasTheme || buttonsLocked"
                    localStorageKey="publii-preview-mode"
                    :previewIcon="true"
                    defaultValue="full-site" />
            </p-header>

            <fields-group title="Basic settings">
                <logo-creator
                    ref="logo-creator"
                    slot="" />

                <field
                    id="name"
                    label="Site name:">
                    <text-input
                        slot="field"
                        ref="name"
                        id="name"
                        key="name"
                        :spellcheck="false"
                        v-model="name" />
                </field>

                <field
                    id="language"
                    label="Language:">
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
                    label="Custom language code:">
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
                    label="Enable spellchecker">
                    <switcher
                        slot="field"
                        id="spellchecking"
                        v-model="spellchecking" />
                    <small
                        v-if="hasNonAutomaticSpellchecker && spellcheckIsNotSupported"
                        slot="note"
                        class="note is-invalid">
                        The spellchecker does not support your selected website language. We recommend to disable this feature.
                    </small>
                </field>

                <field
                    id="theme"
                    label="Current theme:">
                    <strong
                        v-if="currentTheme"
                        slot="field">
                        {{ currentTheme }} (v.{{currentThemeVersion}})
                    </strong>

                    <strong
                        v-if="!currentTheme"
                        slot="field">
                        Not selected
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
                    <icon name="warning" customWidth="28" customHeight="28"/>
                    <p>Your theme <strong>config.json</strong> file does not contain <strong>supportedFeatures</strong> section. Please update or modify your theme to get accurate message about features which are not supported by your currently used theme. <a href="https://getpublii.com/dev/theme-supported-features">Read more about supported features</a>.</p>
                </div>
            </fields-group>

            <fields-group title="Advanced options">
                <tabs
                    ref="advanced-tabs"
                    id="advanced-basic-settings-tabs"
                    :items="advancedTabs">
                    <div slot="tab-0">
                        <field
                            id="no-index-this-page"
                            label="Noindex website">
                            <switcher
                                slot="field"
                                v-model="advanced.noIndexThisPage" />
                            <small
                                slot="note"
                                class="note">Ask the search engine not to crawl the whole website.</small>
                        </field>

                        <separator
                            v-if="!advanced.noIndexThisPage"
                            type="medium"
                            label="Frontpage" />

                        <field
                            v-if="!advanced.noIndexThisPage"
                            id="meta-title"
                            label="Page Title:">
                            <text-input
                                id="meta-title"
                                v-model="advanced.metaTitle"
                                slot="field"
                                :spellcheck="$store.state.currentSite.config.spellchecking"
                                :charCounter="true"
                                :preferredCount="70" />
                        </field>

                        <field
                            v-if="!advanced.noIndexThisPage"
                            id="meta-description"
                            label="Meta Description:">
                            <text-area
                                id="meta-description"
                                v-model="advanced.metaDescription"
                                slot="field"
                                :charCounter="true"
                                :spellcheck="$store.state.currentSite.config.spellchecking"
                                :preferredCount="160" />
                        </field>

                        <field
                            v-if="!advanced.noIndexThisPage"
                            id="meta-robots-index"
                            label="Meta Robots:">
                            <dropdown
                                id="meta-robots-index"
                                slot="field"
                                :items="seoOptions"
                                v-model="advanced.metaRobotsIndex">
                            </dropdown>
                        </field>

                        <field
                            v-if="!advanced.noIndexThisPage"
                            id="homepage-no-index-pagination"
                            label="Disable homepage pagination indexing">
                            <switcher
                                slot="field"
                                id="homepage-no-index-pagination"
                                v-model="advanced.homepageNoIndexPagination" />
                            <small
                                slot="note"
                                class="note">
                                If this option is enabled your homepage pagination files will be excluded from the sitemap and will get <strong>noindex, follow</strong> robots metatag.
                            </small>
                        </field>

                        <separator
                            type="medium"
                            label="Post page" />

                        <field
                            v-if="!advanced.noIndexThisPage"
                            id="post-meta-title"
                            :withCharCounter="true"
                            label="Page Title:">
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
                                The following variables can be used in the Post Page Title: %posttitle, %sitename, %authorname
                            </small>
                        </field>

                        <field
                            v-if="!advanced.noIndexThisPage"
                            id="post-meta-description"
                            label="Meta Description:">
                            <text-area
                                id="post-meta-description"
                                v-model="advanced.postMetaDescription"
                                slot="field"
                                :charCounter="true"
                                :spellcheck="$store.state.currentSite.config.spellchecking"
                                :preferredCount="160" />
                        </field>

                        <field
                            id="post-use-text-without-custom-excerpt"
                            label="Hide custom excerpts on post pages">
                            <switcher
                                slot="field"
                                id="post-use-text-without-custom-excerpt"
                                v-model="advanced.postUseTextWithoutCustomExcerpt" />
                            <small
                                slot="note"
                                class="note">
                                If this option is enabled your post pages won't display text which is placed above "Read more" element in the post editor.
                            </small>
                        </field>

                        <separator
                            v-if="advanced.urls.tagsPrefix !== ''"
                            type="medium"
                            label="Tags list page" />

                        <div 
                            v-if="advanced.urls.tagsPrefix !== '' && !currentThemeSupportsTagsList" 
                            class="msg msg-icon msg-alert">
                            <icon name="warning" customWidth="28" customHeight="28" />
                            <p>Your theme does not support tags list page. <a href="https://getpublii.com/dev/theme-supported-features">Read more about supported features</a>.</p>
                        </div>

                        <field
                            v-if="!advanced.noIndexThisPage && advanced.urls.tagsPrefix !== ''"
                            id="tags-list-meta-title"
                            :withCharCounter="true"
                            label="Page Title:">
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
                                The following variables can be used in the Tags List Page Title: %sitename
                            </small>
                        </field>

                        <field
                            v-if="!advanced.noIndexThisPage && advanced.urls.tagsPrefix !== ''"
                            id="tags-list-meta-description"
                            label="Meta Description:">
                            <text-area
                                id="tags-list-meta-description"
                                v-model="advanced.tagsMetaDescription"
                                slot="field"
                                :charCounter="true"
                                :spellcheck="$store.state.currentSite.config.spellchecking"
                                :preferredCount="160" />
                        </field>

                        <field
                            v-if="!advanced.noIndexThisPage && advanced.urls.tagsPrefix !== ''"
                            id="meta-robots-tags-list"
                            label="Meta Robots:">
                            <dropdown
                                id="meta-robots-tags-list"
                                slot="field"
                                :items="seoOptions"
                                v-model="advanced.metaRobotsTagsList">
                            </dropdown>
                        </field>

                        <separator
                            type="medium"
                            label="Tag page" />

                        <field
                            v-if="!advanced.noIndexThisPage"
                            id="tag-meta-title"
                            :withCharCounter="true"
                            label="Page Title:">
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
                                The following variables can be used in the Tag Page Title: %tagname, %sitename
                            </small>
                        </field>

                        <field
                            v-if="!advanced.noIndexThisPage"
                            id="tag-meta-description"
                            label="Meta Description:">
                            <text-area
                                id="tag-meta-description"
                                v-model="advanced.tagMetaDescription"
                                slot="field"
                                :charCounter="true"
                                :spellcheck="$store.state.currentSite.config.spellchecking"
                                :preferredCount="160" />
                        </field>

                        <field
                            v-if="!advanced.noIndexThisPage"
                            id="meta-robots-tags"
                            label="Meta Robots:">
                            <dropdown
                                id="meta-robots-tags"
                                slot="field"
                                :items="seoOptions"
                                v-model="advanced.metaRobotsTags">
                            </dropdown>
                        </field>

                        <field
                            v-if="!advanced.noIndexThisPage"
                            id="display-empty-tags"
                            label="Display tags w/o posts">
                            <switcher
                                slot="field"
                                id="display-empty-tags"
                                v-model="advanced.displayEmptyTags" />
                            <small
                                slot="note"
                                class="note">
                                If this option is enabled tags without posts assigned to them will still have their subpages created and appear on the tags list.
                            </small>
                        </field>

                        <field
                            v-if="!advanced.noIndexThisPage"
                            id="tag-no-index-pagination"
                            label="Disable tags pagination indexing">
                            <switcher
                                slot="field"
                                id="tag-no-index-pagination"
                                v-model="advanced.tagNoIndexPagination" />
                            <small
                                slot="note"
                                class="note">
                                If this option is enabled your tags pagination files will be excluded from the sitemap and will get <strong>noindex, follow</strong> robots metatag.
                            </small>
                        </field>

                        <field
                            id="tag-no-pagination"
                            label="Disable tags pagination">
                            <switcher
                                slot="field"
                                id="tag-no-pagination"
                                v-model="advanced.tagNoPagination" />
                            <small
                                slot="note"
                                class="note">
                                If this option is enabled your tags pagination won't be generated.
                            </small>
                        </field>

                        <separator
                            type="medium"
                            label="Author page" />

                        <field
                            v-if="!advanced.noIndexThisPage"
                            id="author-meta-title"
                            :withCharCounter="true"
                            label="Page Title:">
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
                                The following variables can be used in the Author Page Title: %authorname, %sitename
                            </small>
                        </field>

                        <field
                            v-if="!advanced.noIndexThisPage"
                            id="author-meta-description"
                            label="Meta Description:">
                            <text-area
                                id="author-meta-description"
                                v-model="advanced.authorMetaDescription"
                                slot="field"
                                :charCounter="true"
                                :spellcheck="$store.state.currentSite.config.spellchecking"
                                :preferredCount="160" />
                        </field>

                        <field
                            v-if="!advanced.noIndexThisPage"
                            id="meta-robots-authors"
                            label="Meta Robots:">
                            <dropdown
                                id="meta-robots-tags"
                                slot="field"
                                :items="seoOptions"
                                v-model="advanced.metaRobotsAuthors">
                            </dropdown>
                        </field>

                        <field
                            v-if="!advanced.noIndexThisPage"
                            id="display-empty-authors"
                            label="Display authors w/o posts">
                            <switcher
                                slot="field"
                                v-model="advanced.displayEmptyAuthors" />
                            <small
                                slot="note"
                                class="note">
                                If this option is enabled authors without posts assigned to them will still have their subpages created and appear on the authors list.
                            </small>
                        </field>

                        <field
                            v-if="!advanced.noIndexThisPage"
                            id="author-no-index-pagination"
                            label="Disable authors pagination indexing">
                            <switcher
                                slot="field"
                                id="author-no-index-pagination"
                                v-model="advanced.authorNoIndexPagination" />
                            <small
                                slot="note"
                                class="note">
                                If this option is enabled your authors pagination files will be excluded from the sitemap and will get <strong>noindex, follow</strong> robots metatag.
                            </small>
                        </field>

                        <field
                            id="author-no-pagination"
                            label="Disable authors pagination">
                            <switcher
                                slot="field"
                                id="author-no-pagination"
                                v-model="advanced.authorNoPagination" />
                            <small
                                slot="note"
                                class="note">
                                If this option is enabled your authors pagination won't be generated.
                            </small>
                        </field>

                        <separator
                            v-if="!advanced.noIndexThisPage"
                            type="medium"
                            label="Error page" />

                        <field
                            v-if="!advanced.noIndexThisPage"
                            id="error-meta-title"
                            :withCharCounter="true"
                            label="Page Title:">
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
                                The following variables can be used in the Error Page Title: %sitename
                            </small>
                        </field>

                        <field
                            v-if="!advanced.noIndexThisPage"
                            id="error-meta-description"
                            label="Meta Description:">
                            <text-area
                                id="error-meta-description"
                                v-model="advanced.errorMetaDescription"
                                slot="field"
                                :charCounter="true"
                                :spellcheck="$store.state.currentSite.config.spellchecking"
                                :preferredCount="160" />
                        </field>

                        <field
                            v-if="!advanced.noIndexThisPage"
                            id="meta-robots-error"
                            label="Meta Robots:">
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
                            label="Search page" />

                        <field
                            v-if="!advanced.noIndexThisPage"
                            id="error-meta-title"
                            :withCharCounter="true"
                            label="Page Title:">
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
                                The following variables can be used in the Search Page Title: %sitename
                            </small>
                        </field>

                        <field
                            v-if="!advanced.noIndexThisPage"
                            id="search-meta-description"
                            label="Meta Description:">
                            <text-area
                                id="search-meta-description"
                                v-model="advanced.searchMetaDescription"
                                slot="field"
                                :charCounter="true"
                                :spellcheck="$store.state.currentSite.config.spellchecking"
                                :preferredCount="160" />
                        </field>

                        <field
                            v-if="!advanced.noIndexThisPage"
                            id="meta-robots-search"
                            label="Meta Robots:">
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
                            label="Use pretty URLs">
                            <switcher
                                slot="field"
                                v-model="advanced.urls.cleanUrls" />
                            <small
                                slot="note"
                                class="note">
                                If this option is enabled your post URLs won't contain the .html suffix e.g. it will change URLs from <strong>https://example.com/post.html</strong> to <strong>https://example.com/post/</strong>.
                            </small>
                        </field>

                        <field
                            id="add-index"
                            label="Always add index.html in URLs">
                            <switcher
                                slot="field"
                                v-model="advanced.urls.addIndex" />
                            <small
                                slot="note"
                                class="note">
                                Enable this option if you cannot enable loading index.html files by default when catalog on your server is opened.
                            </small>
                        </field>

                        <field
                            id="url-tags-prefix"
                            label="Tag prefix:">
                            <text-input
                                id="url-tags-prefix"
                                :class="{ 'is-invalid': errors.indexOf('tags-prefix') > -1 }"
                                @click.native="clearErrors('tags-prefix')"
                                v-model="advanced.urls.tagsPrefix"
                                :spellcheck="false"
                                slot="field" />
                            <small
                                slot="note"
                                class="note">
                                Prefixes entered here will be added before the tag slug in the URL e.g. <strong>https://example.com/TAG_PREFIX/tag-slug</strong>.<br>
                                You can leave this field blank if the use of pretty URLs is disabled.
                            </small>
                        </field>

                        <field
                            id="url-authors-prefix"
                            label="Author prefix:">
                            <text-input
                                id="url-authors-prefix"
                                :class="{ 'is-invalid': errors.indexOf('authors-prefix') > -1 }"
                                @click.native="clearErrors('authors-prefix')"
                                v-model="advanced.urls.authorsPrefix"
                                :spellcheck="false"
                                slot="field" />
                            <small
                                slot="note"
                                class="note">
                                Defines the prefix that appears before the author slug in a URL e.g. <strong>https://example.com/AUTHOR_PREFIX/author-slug</strong><br>
                            </small>
                        </field>

                        <field
                            id="url-pagination-phrase"
                            label="Pagination phrase:">
                            <text-input
                                id="url-pagination-phrase"
                                :class="{ 'is-invalid': errors.indexOf('pagination-phrase') > -1 }"
                                @click.native="clearErrors('pagination-phrase')"
                                v-model="advanced.urls.pageName"
                                :spellcheck="false"
                                slot="field" />
                            <small
                                slot="note"
                                class="note">
                                Defines the phrase used before the page number in a URL e.g. <strong>https://example.com/tags/tag-slug/page/2</strong>.<br>
                            </small>
                        </field>

                        <field
                            id="error-page-file"
                            label="Error page:">
                            <text-input
                                id="error-page-file"
                                :class="{ 'is-invalid': errors.indexOf('error-page') > -1 }"
                                @click.native="clearErrors('error-page')"
                                :readonly="!themeHasSupportForErrorPage"
                                v-model="advanced.urls.errorPage"
                                :spellcheck="false"
                                slot="field" />
                            <small
                                v-if="!themeHasSupportForErrorPage"
                                class="note"
                                slot="note">
                                Your theme does not support error pages
                            </small>
                        </field>

                        <field
                            id="search-page-file"
                            label="Search page:">
                            <text-input
                                id="search-page-file"
                                :class="{ 'is-invalid': errors.indexOf('search-page') > -1 }"
                                @click.native="clearErrors('search-page')"
                                :readonly="!themeHasSupportForSearchPage"
                                v-model="advanced.urls.searchPage"
                                :spellcheck="false"
                                slot="field" />
                            <small
                                v-if="!themeHasSupportForSearchPage"
                                class="note"
                                slot="note">
                                Your theme does not support search pages
                            </small>
                        </field>
                    </div>

                    <div slot="tab-2">
                        <field
                            v-if="advanced.noIndexThisPage"
                            label="To view sitemap settings please disable the 'Ask search engines to not index this website' option in the SEO Settings tab; the sitemap won't be generated for your website otherwise."
                            :labelFullWidth="true" />

                        <field
                            v-if="!advanced.noIndexThisPage"
                            id="sitemap-enabled"
                            label="Create XML Sitemap">
                            <switcher
                                slot="field"
                                v-model="advanced.sitemapEnabled" />
                            <small
                                v-if="sitemapLink"
                                slot="note"
                                class="note">
                                You can find the XML sitemap here: <a :href="sitemapLink" class="sitemap-external-link" target="_blank">sitemap.xml</a>
                            </small>
                        </field>

                        <field
                            class="multiple-checkboxes"
                            v-if="!advanced.noIndexThisPage && advanced.sitemapEnabled"
                            label="Content">
                            <label
                                v-if="advanced.sitemapEnabled"
                                slot="field">
                                <switcher v-model="advanced.sitemapAddTags" />
                                Tag pages
                            </label>

                            <label
                                v-if="advanced.sitemapEnabled"
                                slot="field">
                                <switcher v-model="advanced.sitemapAddAuthors" />
                                Author pages
                            </label>

                            <label
                                v-if="advanced.sitemapEnabled"
                                slot="field">
                                <switcher v-model="advanced.sitemapAddHomepage" />
                                Homepage pagination
                            </label>

                            <label
                                v-if="advanced.sitemapEnabled"
                                slot="field">
                                <switcher v-model="advanced.sitemapAddExternalImages" />
                                External images
                            </label>
                        </field>

                        <field
                            v-if="!advanced.noIndexThisPage && advanced.sitemapEnabled"
                            label="Excluded files">
                            <text-area
                                slot="field"
                                :spellcheck="false"
                                v-model="advanced.sitemapExcludedFiles" />
                            <small
                                slot="note"
                                class="note">
                                Type a comma-separated list of HTML files or catalogs to exclude from the sitemap.<br>
                                For example: <strong>avoid-this-file.html,avoid-this-catalog-too</strong>
                            </small>
                        </field>
                    </div>

                    <div slot="tab-3">
                        <field
                            id="open-graph-enabled"
                            label="Generate Open Graph tags">
                            <switcher
                                slot="field"
                                id="open-graph-enabled"
                                v-model="advanced.openGraphEnabled" />
                        </field>

                        <field
                            v-if="advanced.openGraphEnabled"
                            label="Fallback image">
                            <image-upload
                                slot="field"
                                v-model="advanced.openGraphImage" />
                        </field>

                        <field
                            v-if="advanced.openGraphEnabled"
                            id="use-page-title-instead-item-name"
                            label="Use as a title page title">
                            <switcher
                                slot="field"
                                id="use-page-title-instead-item-name"
                                v-model="advanced.usePageTitleInsteadItemName" />
                            <small
                                slot="note"
                                class="note">
                                When this option is enabled, og:title and twitter:title metatags will contain the page title instead of the post title, tag name or author name.
                                
                            </small>
                        </field>

                        <field
                            v-if="advanced.openGraphEnabled"
                            label="Facebook App ID">
                            <input
                                slot="field"
                                type="text"
                                spellcheck="false"
                                v-model="advanced.openGraphAppId" />
                            <small
                                slot="note"
                                class="note">
                                Read how to obtain <a href="https://developers.facebook.com/docs/apps/" target="_blank" rel="noopener">Facebook App ID</a>
                            </small>
                        </field>
                    </div>

                    <div slot="tab-4">
                        <field
                            id="twitter-cards-enabled"
                            label="Generate Twitter cards">
                            <switcher
                                slot="field"
                                id="twitter-cards-enabled"
                                v-model="advanced.twitterCardsEnabled" />
                        </field>

                        <field
                            v-if="advanced.twitterCardsEnabled"
                            id="twitter-username"
                            label="Twitter username">
                            <text-input
                                id="twitter-username"
                                v-model="advanced.twitterUsername"
                                :spellcheck="false"
                                slot="field" />
                        </field>

                        <field
                            v-if="advanced.twitterCardsEnabled"
                            id="twitter-cards-type"
                            label="Card types:">
                            <dropdown
                                slot="field"
                                id="twitter-cards-type"
                                v-model="advanced.twitterCardsType"
                                :items="twitterCardsTypes">
                            </dropdown>
                        </field>
                    </div>

                    <div slot="tab-5">
                        
                        <field
                            id="amp-is-enabled"
                            label="Enable AMP">
                            <switcher
                                slot="field"
                                id="amp-is-enabled"
                                v-model="advanced.ampIsEnabled" />
                            <small
                                slot="note"
                                class="note">
                                AMP (accelerated mobile pages) creates mobile-optimized pages for your static content that render fast. <br/><strong>Please note:</strong>  when this option is enabled your website will load third-party scripts provided by Google's AMP CDN. 

                            </small>
                        </field>

                        <separator
                            v-if="advanced.ampIsEnabled"
                            type="small"
                            :is-line="true" />

                        <field
                            v-if="advanced.ampIsEnabled"
                            id="amp-primary-color"
                            label="Theme primary color">
                            <color-picker
                                slot="field"
                                id="amp-primary-color"
                                v-model="advanced.ampPrimaryColor" />
                        </field>

                        <field
                            v-if="advanced.ampIsEnabled"
                            id="amp-image"
                            label="Fallback logo image">
                            <image-upload
                                slot="field"
                                v-model="advanced.ampImage" />
                            <small
                                slot="note"
                                class="note">
                                The logo must fit in a 60 &times; 600 pixel box.
                            </small>
                        </field>

                        <separator
                            v-if="advanced.ampIsEnabled"
                            type="small"
                            :is-line="true" />

                        <field
                            v-if="advanced.ampIsEnabled"
                            id="amp-ga-id"
                            label="Google Analytics Tracking ID">
                            <text-input
                                id="amp-ga-id"
                                v-model="advanced.ampGaId"
                                :spellcheck="false"
                                slot="field" />
                        </field>

                        <separator
                            v-if="advanced.ampIsEnabled"
                            type="small"
                            :is-line="true" />

                        <field
                            v-if="advanced.ampIsEnabled"
                            id="amp-share"
                            label="Enable sharing buttons">
                            <switcher
                                slot="field"
                                id="amp-share"
                                v-model="advanced.ampShare" />
                        </field>

                        <field
                            v-if="advanced.ampIsEnabled && advanced.ampShare"
                            id="amp-share-system"
                            label="System">
                            <switcher
                                slot="field"
                                id="amp-share-system"
                                v-model="advanced.ampShareSystem" />
                        </field>

                        <field
                            v-if="advanced.ampIsEnabled && advanced.ampShare"
                            id="amp-share-facebook"
                            label="Facebook">
                            <switcher
                                slot="field"
                                id="amp-share-facebook"
                                v-model="advanced.ampShareFacebook" />
                        </field>

                        <field
                            v-if="advanced.ampIsEnabled && advanced.ampShare && advanced.ampShareFacebook"
                            id="amp-share-facebook-id"
                            label=" ">
                            <text-input
                                id="amp-share-facebook-id"
                                v-model="advanced.ampShareFacebookId"
                                :spellcheck="false"
                                slot="field" />
                            <small
                                class="note"
                                slot="note">
                                Please provide <a href="https://developers.facebook.com/docs/apps/" target="_blank" rel="noopener">Facebook App ID</a>
                            </small>
                        </field>

                        <field
                            v-if="advanced.ampIsEnabled && advanced.ampShare"
                            id="amp-share-twitter"
                            label="Twitter">
                            <switcher
                                slot="field"
                                id="amp-share-twitter"
                                v-model="advanced.ampShareTwitter" />
                        </field>                       

                        <field
                            v-if="advanced.ampIsEnabled && advanced.ampShare"
                            id="amp-share-pinterest"
                            label="Pinterest">
                            <switcher
                                slot="field"
                                id="amp-share-pinterest"
                                v-model="advanced.ampSharePinterest" />
                        </field>

                        <field
                            v-if="advanced.ampIsEnabled && advanced.ampShare"
                            id="amp-share-linkedin"
                            label="LinkedIn">
                            <switcher
                                slot="field"
                                id="amp-share-linkedin"
                                v-model="advanced.ampShareLinkedIn" />
                        </field>

                        <field
                            v-if="advanced.ampIsEnabled && advanced.ampShare"
                            id="amp-share-tumblr"
                            label="Tumblr">
                            <switcher
                                slot="field"
                                id="amp-share-tumblr"
                                v-model="advanced.ampShareTumblr" />
                        </field>

                        <field
                            v-if="advanced.ampIsEnabled && advanced.ampShare"
                            id="amp-share-system"
                            label="WhatsApp">
                            <switcher
                                slot="field"
                                id="amp-share-whatsapp"
                                v-model="advanced.ampShareWhatsapp" />
                        </field>

                        <separator
                            v-if="advanced.ampIsEnabled"
                            type="small"
                            :is-line="true" />

                        <field
                            v-if="advanced.ampIsEnabled"
                            id="amp-footer-text"
                            label="Footer text">
                            <text-input
                                id="amp-footer-text"
                                v-model="advanced.ampFooterText"
                                :spellcheck="$store.state.currentSite.config.spellchecking"
                                slot="field" />
                        </field>
                    </div>

                    <div slot="tab-6">
                        <field
                            id="gdpr-enabled"
                            label="Add GDPR Cookie banner">
                            <label slot="field">
                                <switcher
                                    id="html-compression"
                                    v-model="advanced.gdpr.enabled" />
                            </label>

                            <small
                                slot="note"
                                class="note">
                                Enabling the GDPR Cookie Popup requires some additional changes in your theme, especially if you are using third-party scripts. <a href="https://getpublii.com/dev/prepare-theme-gdpr-compliant/" target="_blank">Read how to prepare your theme for GDPR</a>
                            </small>
                        </field>

                        <separator
                            v-if="advanced.gdpr.enabled"
                            type="small"
                            :is-line="true"
                            label="Cookie Popup" />

                        <field
                            v-if="advanced.gdpr.enabled"
                            id="gdpr-popup-title-primary"
                            label="Title">
                            <text-input
                                id="gdpr-popup-title-primary"
                                v-model="advanced.gdpr.popupTitlePrimary"
                                :spellcheck="$store.state.currentSite.config.spellchecking"
                                slot="field" />
                        </field>

                        <field
                            v-if="advanced.gdpr.enabled"
                            id="gdpr-popup-desc"
                            label="Description">
                            <text-area
                                id="gdpr-popup-desc"
                                v-model="advanced.gdpr.popupDesc"
                                :rows="6"
                                :spellcheck="$store.state.currentSite.config.spellchecking"
                                slot="field" />
                        </field>

                        <field
                            v-if="advanced.gdpr.enabled"
                            id="gdpr-readmore-link-label"
                            label="Link label">
                            <text-input
                                id="gdpr-readmore-link-label"
                                v-model="advanced.gdpr.readMoreLinkLabel"
                                :spellcheck="$store.state.currentSite.config.spellchecking"
                                slot="field" />
                        </field>

                        <field
                            v-if="advanced.gdpr.enabled"
                            id="gdpr-page-type"
                            label="Privacy policy URL">
                            <dropdown
                                slot="field"
                                id="gdpr-page-type"
                                key="gdpr-page-type"
                                v-model="advanced.gdpr.articleLinkType"
                                :items="{ 'internal': 'Internal page', 'external': 'External page' }"></dropdown>
                        </field>

                        <field
                            v-if="advanced.gdpr.enabled && advanced.gdpr.articleLinkType === 'internal'"
                            id="gdpr-page"
                            label="Privacy policy page">
                            <v-select
                                ref="gdprPagesSelect"
                                slot="field"
                                :options="postPages"
                                v-model="advanced.gdpr.articleId"
                                :custom-label="customPostLabels"
                                :close-on-select="true"
                                :show-labels="false"
                                @select="closeDropdown('gdprPagesSelect')"
                                placeholder="Select page"></v-select>
                        </field>

                        <field
                            v-if="advanced.gdpr.enabled && advanced.gdpr.articleLinkType === 'external'"
                            id="gdpr-page-url"
                            label="Privacy policy page URL">
                            <text-input
                                id="gdpr-page-url"
                                v-model="advanced.gdpr.articleExternalUrl"
                                :spellcheck="false"
                                slot="field" />
                        </field>

                        <field
                            v-if="advanced.gdpr.enabled"
                            id="gdpr-save-button-label"
                            label="Save button label">
                            <text-input
                                id="gdpr-save-button-label"
                                v-model="advanced.gdpr.saveButtonLabel"
                                :spellcheck="$store.state.currentSite.config.spellchecking"
                                slot="field" />
                        </field>

                        <field
                            v-if="advanced.gdpr.enabled"
                            id="gdpr-behaviour"
                            label="Open Popup window by">
                            <dropdown
                                slot="field"
                                id="posts-listing-order-by"
                                key="posts-listing-order-by"
                                v-model="advanced.gdpr.behaviour"
                                :items="{ 'badge': 'Badge', 'link': 'Custom link', 'badge-link': 'Badge + custom link' }"></dropdown>
                        </field>

                        <field
                            v-if="advanced.gdpr.enabled && advanced.gdpr.behaviour !== 'link'"
                            id="gdpr-popup-label"
                            label="Badge label">
                            <text-input
                                id="gdpr-popup-label"
                                v-model="advanced.gdpr.badgeLabel"
                                :spellcheck="$store.state.currentSite.config.spellchecking"
                                slot="field" />
                        </field>

                        <field
                            v-if="advanced.gdpr.enabled && advanced.gdpr.behaviour !== 'badge'"
                            id="gdpr-behaviour-link"
                            label="Anchor link">
                            <text-input
                                id="gdpr-behaviour-link"
                                v-model="advanced.gdpr.behaviourLink"
                                :spellcheck="false"
                                slot="field" />
                            <small
                                class="note"
                                slot="note">
                                Remember to place a link with the above anchor in your website navigation or the website content (e.g. &lt;a href="#cookie-settings"&gt;Cookie preferences&lt;/a&gt;). Otherwise, your website's users might not be able to change their individual cookie preferences.
                            </small>
                        </field>

                        <separator
                            v-if="advanced.gdpr.enabled"
                            type="big"
                            :is-line="true"
                            label="Cookie Groups" />

                        <field
                            v-if="advanced.gdpr.enabled"
                            id="gdpr-popup-groups"
                            label=""
                            :labelFullWidth="true">
                            <gdpr-groups
                                id="gdpr-popup-groups"
                                v-model="advanced.gdpr.groups"
                                slot="field" />
                        </field>
                    </div>

                    <div slot="tab-7">
                        <field
                            id="html-compression"
                            label="Enable HTML compression">
                            <label slot="field">
                                <switcher
                                    id="html-compression"
                                    v-model="advanced.htmlCompression" />
                            </label>
                        </field>

                        <field
                            id="css-compression"
                            label="Enable CSS compression">
                            <label slot="field">
                                <switcher
                                    id="css-compression"
                                    v-model="advanced.cssCompression" />
                            </label>
                        </field>

                        <field
                            id="html-compression-remove-comments"
                            label="Remove HTML comments">
                            <label slot="field">
                                <switcher
                                    id="html-compression-remove-comments"
                                    v-model="advanced.htmlCompressionRemoveComments" />
                            </label>
                        </field>

                        <field
                            id="media-lazyload"
                            label="Enable media lazy load">
                            <label slot="field">
                                <switcher
                                    id="media-lazyload"
                                    v-model="advanced.mediaLazyLoad" />
                            </label>
                            
                            <small
                                slot="note"
                                class="note">
                                Enable this option if you want to use native lazy loading that lazy loads images, videos and iframes.
                            </small>
                        </field>
                        
                        <field
                            id="responsive-images"
                            label="Enable responsive images">
                            <label slot="field">
                                <switcher
                                    id="responsive-images"
                                    v-model="advanced.responsiveImages" />
                            </label>
                            
                            <small
                                slot="note"
                                class="note">
                                Enable this option if you want to deliver different sized images at different screen resolutions depending on breakpoints defined through config.json file in a theme's folder.
                            </small>
                        </field>

                        <field
                            id="version-suffix"
                            label="Version parameter">
                            <label slot="field">
                                <switcher
                                    id="version-suffix"
                                    v-model="advanced.versionSuffix" />

                            </label>

                            <small
                                slot="note"
                                class="note">
                                Add version parameter in CSS/JS URLs to skip browser cache.
                                This option can cause that more files than usual will be required to sync during deployment
                            </small>
                        </field>

                        <field
                            id="images-quality"
                            label="Responsive Images quality">
                            <label slot="field">
                                <text-input
                                    id="images-quality"
                                    type="number"
                                    min="1"
                                    max="100"
                                    step="1"
                                    v-model="advanced.imagesQuality" />
                                %
                            </label>
                        </field>
                    </div>

                    <div slot="tab-8">
                        <field
                            id="feed-enable-rss"
                            label="Enable RSS feed">
                            <label slot="field">
                                <switcher
                                    id="feed-enable-rss"
                                    v-model="advanced.feed.enableRss" />
                            </label>
                        </field>

                        <field
                            id="feed-enable-json"
                            label="Enable JSON feed">
                            <label slot="field">
                                <switcher
                                    id="feed-enable-json"
                                    v-model="advanced.feed.enableJson" />
                            </label>
                        </field>
                        
                        <field
                            v-if="advanced.feed.enableRss || advanced.feed.enableJson"
                            id="feed-title"
                            label="Feed title:">
                            <dropdown
                                slot="field"
                                id="feed-title"
                                key="feed-title"
                                v-model="advanced.feed.title"
                                :items="{ 'displayName': 'Page name', 'customTitle': 'Custom feed title' }"></dropdown>
                        </field>

                        <field
                            v-if="(advanced.feed.enableRss || advanced.feed.enableJson) && advanced.feed.title === 'customTitle'"
                            id="feed-title-value"
                            label="Custom feed title">
                            <label slot="field">
                                <text-input
                                    id="feed-title-value"
                                    type="text"
                                    :spellcheck="$store.state.currentSite.config.spellchecking"
                                    v-model="advanced.feed.titleValue" />
                            </label>
                        </field>

                        <field
                            v-if="advanced.feed.enableRss || advanced.feed.enableJson"
                            id="feed-show-full-text"
                            label="Show full text">
                            <label slot="field">
                                <switcher
                                    id="feed-show-full-text"
                                    v-model="advanced.feed.showFullText" />
                            </label>

                            <small
                                slot="note"
                                class="note">
                                Display full text of the post in the feed
                            </small>
                        </field>

                        <field
                            v-if="advanced.feed.enableRss || advanced.feed.enableJson"
                            id="feed-number-of-posts"
                            label="Number of posts in feed">
                            <label slot="field">
                                <text-input
                                    id="feed-number-of-posts"
                                    type="number"
                                    min="0"
                                    max="10000000"
                                    step="1"
                                    v-model="advanced.feed.numberOfPosts" />
                            </label>
                        </field>

                        <field
                            v-if="advanced.feed.enableRss || advanced.feed.enableJson"
                            id="feed-show-featured-image"
                            label="Show Featured image">
                            <label slot="field">
                                <switcher
                                    id="feed-show-featured-image"
                                    v-model="advanced.feed.showFeaturedImage" />
                            </label>

                            <small
                                slot="note"
                                class="note">
                                 Display a post's featured image in the feed
                            </small>
                        </field>
                    </div>

                    <div slot="tab-9">
                        <field
                            id="posts-listing-order-by"
                            label="Posts order by:">
                            <dropdown
                                slot="field"
                                id="posts-listing-order-by"
                                key="posts-listing-order-by"
                                v-model="advanced.postsListingOrderBy"
                                :items="orderByOptions"></dropdown>
                        </field>

                        <field
                            id="posts-listing-order"
                            label="Posts ordering:">
                            <dropdown
                                slot="field"
                                id="posts-listing-order"
                                key="posts-listing-order"
                                v-model="advanced.postsListingOrder"
                                :items="orderOptions"></dropdown>
                        </field>

                        <field
                            id="featured-posts-listing-order-by"
                            label="Featured posts order by:">
                            <dropdown
                                slot="field"
                                id="featured-posts-listing-order-by"
                                key="featured-posts-listing-order-by"
                                v-model="advanced.featuredPostsListingOrderBy"
                                :items="orderByOptions"></dropdown>
                        </field>

                        <field
                            id="featured-posts-listing-order"
                            label="Featured posts ordering:">
                            <dropdown
                                slot="field"
                                id="featured-posts-listing-order"
                                key="featured-posts-listing-order"
                                v-model="advanced.featuredPostsListingOrder"
                                :items="orderOptions"></dropdown>
                        </field>

                        <field
                            id="hidden-posts-listing-order-by"
                            label="Hidden posts order by:">
                            <dropdown
                                slot="field"
                                id="hidden-posts-listing-order-by"
                                key="hidden-posts-listing-order-by"
                                v-model="advanced.hiddenPostsListingOrderBy"
                                :items="orderByOptions"></dropdown>
                        </field>

                        <field
                            id="hidden-posts-listing-order"
                            label="Hidden posts ordering:">
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
                            label="Related posts selection mechanism:">
                            <dropdown
                                slot="field"
                                id="related-posts-order-by"
                                key="related-posts-order-by"
                                v-model="advanced.relatedPostsCriteria"
                                :items="relatedPostsCriteriaOptions"></dropdown>
                        </field>

                        <field
                            id="related-posts-order-by"
                            label="Related posts ordering:">
                            <dropdown
                                slot="field"
                                id="related-posts-order-by"
                                key="related-posts-order-by"
                                v-model="advanced.relatedPostsOrder"
                                :items="relatedPostsOrderingOptions"></dropdown>
                        </field>

                         <field
                            id="related-posts-use-all-posts"
                            label="Related posts options">
                            <label slot="field">
                                <switcher
                                    id="related-posts-use-all-posts"
                                    v-model="advanced.relatedPostsIncludeAllPosts" />
                            </label>

                            <small
                                slot="note"
                                class="note">
                                When enabled, related posts will be taken from all tags. When disabled, related posts will only be generated from the same tags as the current post.
                            </small>
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
                    defaultValue="full-site" />

                <p-button
                    @click.native="save(false)"
                    slot="buttons"
                    type="secondary"
                    :disabled="buttonsLocked">
                    Save Settings
                </p-button>
            </p-footer>
        </div>
    </section>
</template>

<script>
import fs from 'fs';
import { ipcRenderer, remote } from 'electron';
import Utils from './../helpers/utils.js';
import AvailableLanguagesList from './../config/langs.js';
import GdprGroups from './basic-elements/GdprGroups';
import ThemesDropdown from './basic-elements/ThemesDropdown';

export default {
    name: 'site-settings',
    components: {
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
        currentThemeSupportsTagsList () {
            return this.$store.state.currentSite.themeSettings.supportedFeatures && this.$store.state.currentSite.themeSettings.supportedFeatures.tagsList;
        },
        advancedTabs () {
            return [
                'SEO',
                'URLs',
                'Sitemap',
                'Open Graph',
                'Twitter Cards',
                'AMP',
                'GDPR',
                'Website Speed',
                'RSS/JSON Feed',
                'Posts Listing'
            ];
        },
        seoOptions () {
            return {
                'index, follow': 'index, follow',
                'index, nofollow': 'index, nofollow',
                'noindex, follow': 'noindex, follow',
                'noindex, nofollow': 'noindex, nofollow'
            };
        },
        orderByOptions () {
            return {
                'created_at': 'Post creation date',
                'title': 'Post title',
                'modified_at': 'Post modification date',
                'id': 'Post ID'
            };
        },
        orderOptions () {
            return {
                'DESC': 'Descending',
                'ASC': 'Ascending'
            };
        },
        relatedPostsOrderingOptions () {
            return {
                'default': 'By ID descending',
                'id-asc': 'By ID ascending',
                'random': 'Random'
            };
        },
        relatedPostsCriteriaOptions () {
            return {
                'titles': 'Use only titles',
                'tags': 'Use only tags',
                'titles-and-tags': 'Use titles and tags'
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
                'summary': 'Summary card',
                'summary_large_image': 'Summary card with large image'
            };
        },
        themeHasSupportForErrorPage () {
            return this.$store.state.currentSite.themeSettings.renderer &&
                   this.$store.state.currentSite.themeSettings.renderer.create404page;
        },
        themeHasSupportForSearchPage () {
            return this.$store.state.currentSite.themeSettings.renderer &&
                   this.$store.state.currentSite.themeSettings.renderer.createSearchPage;
        },
        sitemapLink () {
            let sitemapLink = false;
            let syncDate = this.$store.state.currentSite.config.syncDate;

            if(this.$store.state.currentSite.config.domain && typeof syncDate !== 'undefined') {
                sitemapLink = this.$store.state.currentSite.config.domain + '/sitemap.xml';
            }

            return sitemapLink
        },
        postPages () {
            return this.$store.state.currentSite.posts.map(post => post.id);
        },
        dropdownItems () {
            return [
                {
                    label: 'Render full website',
                    activeLabel: 'Save & Preview',
                    value: 'full-site',
                    isVisible: () => true,
                    icon: 'full-preview-monitor',
                    onClick: this.saveAndPreview.bind(this, 'full-site')
                },
                {
                    label: 'Render front page only',
                    activeLabel: 'Save & Preview',
                    value: 'homepage',
                    icon: 'quick-preview',
                    isVisible: () => true,
                    onClick: this.saveAndPreview.bind(this, 'homepage')
                }
            ]
        },
        hasNonAutomaticSpellchecker () {
            return process.platform !== 'darwin';
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

        if (this.$store.state.currentSite.config.uuid) {
            this.uuid = this.$store.state.currentSite.config.uuid;
        }

        this.setCurrentTheme();
        this.advanced = Object.assign({}, this.advanced, this.$store.state.currentSite.config.advanced);
    },
    mounted () {
        setTimeout(() => {
            this.$refs['logo-creator'].changeIcon(this.logo.icon);
            this.$refs['logo-creator'].changeColor(this.logo.color);
        }, 0);

        this.$bus.$on('regenerate-thumbnails-close', this.savedFromPopup);
        this.spellcheckerLanguages = remote.getCurrentWebContents().session.availableSpellCheckerLanguages;
        
        if (this.spellcheckerLanguages.length) {
            this.spellcheckerLanguages = this.spellcheckerLanguages.map(lang => lang.toLocaleLowerCase());
        }
    },
    methods: {
        saveAndPreview (renderingType = false) {
            this.save(true, renderingType);
        },
        save (showPreview = false, renderingType = false) {
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
            newSettings.theme = this.theme;

            // Merge new settings with existing settings
            let currentSiteConfigCopy = JSON.parse(JSON.stringify(this.$store.state.currentSite.config));
            newSettings = Utils.deepMerge(currentSiteConfigCopy, newSettings);

            // Send request to the back-end
            ipcRenderer.send('app-site-config-save', {
                "site": siteName,
                "settings": newSettings
            });

            // Settings saved
            ipcRenderer.once('app-site-config-saved', (event, data) => {
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
                    window.localStorage.setItem('publii-last-opened-website', siteName);
                }

                if(data.status === true) {
                    if (
                        data.thumbnailsRegenerateRequired && 
                        this.$store.state.currentSite.posts && 
                        this.$store.state.currentSite.posts.length > 0
                    ) {
                        ipcRenderer.send('app-site-regenerate-thumbnails-required', {
                            name: this.$store.state.currentSite.config.name
                        });

                        ipcRenderer.once('app-site-regenerate-thumbnails-required-status', (event, data) => {
                            if (data.message) {
                                this.$bus.$emit('regenerate-thumbnails-display', { 
                                    qualityChanged: false,
                                    savedSettingsCallback: {
                                        newSettings, 
                                        siteName, 
                                        showPreview, 
                                        renderingType
                                    }
                                });
                            } else {
                                this.saved(newSettings, siteName, showPreview, renderingType);
                            }
                        });
                    } else {
                        this.saved(newSettings, siteName, showPreview, renderingType);
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
                        message: 'Site settings has been successfully saved.',
                        type: 'success',
                        lifeTime: 3
                    });

                    this.buttonsLocked = false;
                }

                if(data.message === 'empty-name') {
                    this.$bus.$emit('message-display', {
                        message: 'Site name cannot be empty. Please try other name.',
                        type: 'warning',
                        lifeTime: 3
                    });

                    this.buttonsLocked = false;
                }

                if(data.message === 'duplicated-name') {
                    this.$bus.$emit('message-display', {
                        message: 'Provided site name is in use. Please try other site name.',
                        type: 'warning',
                        lifeTime: 3
                    });

                    this.buttonsLocked = false;
                }

                if(data.message === 'site-not-exists') {
                    this.$bus.$emit('message-display', {
                        message: 'Site not exists. Please restart the application.',
                        type: 'warning',
                        lifeTime: 3
                    });

                    this.buttonsLocked = false;
                }

                ipcRenderer.send('app-site-reload', {
                    siteName: siteName
                });

                ipcRenderer.once('app-site-reloaded', (event, result) => {
                    this.$store.commit('setSiteConfig', result);
                    this.$store.commit('switchSite', result.data);
                });
            });
        },
        savedFromPopup (callbackData) {
            console.log('CD:', callbackData);
            this.saved(callbackData.newSettings, callbackData.siteName, callbackData.showPreview, callbackData.renderingType);
        },
        saved (newSettings, oldName, showPreview = false, renderingType = false) {
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

            setTimeout(() => {
                this.setCurrentTheme();

                // Remove old entry if user changed the site name
                if (oldName !== this.$store.state.currentSite.config.name) {
                    this.$store.commit('removeWebsite', oldName);
                }

                this.buttonsLocked = false;

                if (showPreview) {
                    if (this.$store.state.app.config.previewLocation !== '' && !fs.existsSync(this.$store.state.app.config.previewLocation)) {
                        this.$bus.$emit('confirm-display', {
                            message: 'The preview catalog does not exist. Please go to the App Settings and select the correct preview directory first.',
                            okLabel: 'Go to app settings',
                            okClick: () => {
                                this.$router.push(`/app-settings/`);
                            }
                        });
                        return;
                    }

                    if (renderingType === 'homepage') {
                        this.$bus.$emit('rendering-popup-display', {
                            homepageOnly: true
                        });
                    } else {
                        this.$bus.$emit('rendering-popup-display');
                    }
                }
            }, 1000);
        },
        validate () {
            if (this.advanced.urls.tagsPrefix.trim() === '' && !!this.advanced.urls.cleanUrls) {
                this.$bus.$emit('message-display', {
                    message: 'Tags prefix cannot be empty if pretty URLs are enabled.',
                    type: 'warning',
                    lifeTime: 3
                });

                this.errors.push('tags-prefix');
                this.$refs['advanced-tabs'].toggle('URLs');

                return false;
            }

            if (this.advanced.urls.authorsPrefix.trim() === '') {
                this.$bus.$emit('message-display', {
                    message: 'Authors prefix cannot be empty.',
                    type: 'warning',
                    lifeTime: 3
                });

                this.errors.push('authors-prefix');
                this.$refs['advanced-tabs'].toggle('URLs');

                return false;
            }

            if (this.advanced.urls.authorsPrefix.trim() === this.advanced.urls.tagsPrefix.trim()) {
                this.$bus.$emit('message-display', {
                    message: 'Authors prefix cannot be the same as tags prefix.',
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
                    message: 'Pagination phrase cannot be empty.',
                    type: 'warning',
                    lifeTime: 3
                });

                this.errors.push('pagination-phrase');
                this.$refs['advanced-tabs'].toggle('URLs');

                return false;
            }

            if (this.advanced.urls.errorPage.trim() === '') {
                this.$bus.$emit('message-display', {
                    message: 'Error page filename cannot be empty.',
                    type: 'warning',
                    lifeTime: 3
                });

                this.errors.push('error-page');
                this.$refs['advanced-tabs'].toggle('URLs');

                return false;
            }

            if (this.advanced.urls.searchPage.trim() === '') {
                this.$bus.$emit('message-display', {
                    message: 'Search page filename cannot be empty.',
                    type: 'warning',
                    lifeTime: 3
                });

                this.errors.push('search-page');
                this.$refs['advanced-tabs'].toggle('URLs');

                return false;
            }

            if (this.advanced.urls.errorPage.trim() === this.advanced.urls.searchPage.trim()) {
                this.$bus.$emit('message-display', {
                    message: 'Error page filename cannot be the same as search page filename.',
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
            return this.$store.state.currentSite.posts.filter(post => post.id === value).map(post => post.title)[0];
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
        }
    }
}
</style>
