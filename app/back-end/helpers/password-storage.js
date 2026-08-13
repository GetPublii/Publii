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

const SECRET_TYPES = [
    'publii',
    'publii-passphrase',
    'publii-git-password',
    'publii-gh-token',
    'publii-gl-token',
    'publii-netlify-id',
    'publii-netlify-token',
    'publii-s3-id',
    'publii-s3-key'
];

async function deleteAllPasswords (account) {
    for (let type of SECRET_TYPES) {
        try {
            await deletePassword(type, account);
        } catch (e) {
            console.log('(!) Cannot remove keychain entry: ' + type);
        }
    }
}

module.exports = {
    getPassword,
    setPassword,
    deletePassword,
    deleteAllPasswords,
    SECRET_TYPES
};
