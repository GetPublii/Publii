const { AsyncEntry } = require('@napi-rs/keyring');

/*
 * Wrapper for @napi-rs/keyring which exposes the password storage API used across the app
 */

async function getPassword (service, account) {
    return new AsyncEntry(service, account).getPassword();
}

async function setPassword (service, account, password) {
    return new AsyncEntry(service, account).setPassword(password);
}

async function deletePassword (service, account) {
    return new AsyncEntry(service, account).deletePassword();
}

module.exports = {
    getPassword,
    setPassword,
    deletePassword
};
