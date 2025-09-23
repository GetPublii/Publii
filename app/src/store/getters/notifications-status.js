/**
 * Returns state of the notifcations
 *
 * @param state
 * @param getters
 *
 * @returns {boolean, string}
 */

export default (state, getters) => {
    return state.app.config.notificationsStatus;
};
