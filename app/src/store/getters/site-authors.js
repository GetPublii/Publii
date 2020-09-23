/**
 * Returns array of current site authors
 *
 * @param state
 * @param getters
 *
 * @returns {array}
 */

import Utils from '../../helpers/utils.js';

export default (state, getters) => (filterValue, orderBy = 'id', order = 'DESC') => {
    let deletedPostsIDs = state.currentSite.posts.filter(post => post.status.indexOf('trashed') > -1).map(post => post.id);
    
    let authors = state.currentSite.authors.map(author => {
        let indexingOptionsEnabled = true;
        let authorTemplates = [];
        let avatarUrlPrefix = 'file:///';
        let postsCounter = 0;
        let config = {
            description: '',
            metaTitle: '',
            metaDescription: '',
            template: '',
            email: '',
            website: '',
            avatar: '',
            useGravatar: false
        };

        if(typeof author.config === 'string' && author.config !== '') {
            config = Object.assign(config, JSON.parse(author.config));
        }

        if(
            state.currentSite.config.advanced &&
            state.currentSite.config.advanced.metaRobotsAuthors.indexOf('noindex') !== -1
        ) {
            indexingOptionsEnabled = false;
        }

        for(let i = 0; i < state.currentSite.authorTemplates.length; i++) {
            authorTemplates.push({
                value: state.currentSite.authorTemplates[i][0],
                name: state.currentSite.authorTemplates[i][1]
            });
        }

        postsCounter = state.currentSite.postsAuthors.filter(postAuthor => {
            return postAuthor.authorID === author.id && deletedPostsIDs.indexOf(postAuthor.postID) === -1;;
        }).length;

        return {
            id: author.id,
            name: author.name,
            username: author.username,
            email: config.email,
            website: config.website,
            avatar: config.avatar,
            useGravatar: config.useGravatar,
            description: config.description,
            postsCounter: postsCounter,
            metaTitle: config.metaTitle,
            metaDescription: config.metaDescription,
            template: config.template,
            authorTemplates: authorTemplates,
            additionalData: author.additionalData,
            visibleIndexingOptions: indexingOptionsEnabled
        };
    });

    authors.sort((authorA, authorB) => {
        if (orderBy === 'name') {
            if (order === 'DESC') {
                return -(authorA.name.localeCompare(authorB.name))
            }

            return authorA.name.localeCompare(authorB.name);
        }
        
        if (order === 'DESC') {
            return authorB[orderBy] - authorA[orderBy];
        }

        return authorA[orderBy] - authorB[orderBy];
    });

    authors = authors.filter(author => {
        if(!filterValue) {
            return true;
        }

        if(author.name.toLowerCase().indexOf(filterValue) > -1) {
            return true;
        }

        return false;
    });

    return authors;
};
