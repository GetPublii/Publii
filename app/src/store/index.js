// Modules
import Vuex from 'vuex';
import Vue from 'vue';
// Helpers
import defaultState from './default.state';
import mutations from './helpers/mutations';
// Getters
import siteNames from './getters/site-names';
import siteDisplayNames from './getters/site-display-names';
import siteTags from './getters/site-tags';
import siteAuthors from './getters/site-authors';
import sitePosts from './getters/site-posts';
import appVersion from './getters/app-version';
import languages from './getters/languages';
import themes from './getters/themes';
import themeSelect from './getters/theme-select';
import tagTemplates from './getters/tag-templates';
import authorTemplates from './getters/author-templates';
// Actions


Vue.use(Vuex);

export default new Vuex.Store({
    state: defaultState,
    getters: {
        languages,
        siteNames,
        siteDisplayNames,
        siteTags,
        siteAuthors,
        sitePosts,
        appVersion,
        themes,
        themeSelect,
        tagTemplates,
        authorTemplates
    },
    mutations,
    actions: {

    }
});
