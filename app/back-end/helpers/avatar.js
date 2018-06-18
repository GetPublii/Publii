const sizeOf = require('image-size');

class AvatarHelper {
    /*
     * Check if the provided path is a local avatar file
     *
     * @param pathToCheck - avatar path
     *
     * @return bool
     */
    static isLocalAvatar(pathToCheck) {
        return  typeof pathToCheck === 'string' &&
                pathToCheck !== '' &&
                pathToCheck.indexOf('http://') === -1 &&
                pathToCheck.indexOf('https://') === -1 &&
                pathToCheck.indexOf('media/website/') === -1;
    }

    /*
     * Check if the provided path is a gravatar remote file
     *
     * @param pathToCheck - avatar path
     *
     * @return bool
     */
    static isGravatar(pathToCheck) {
        return !AvatarHelper.isLocalAvatar(pathToCheck);
    }

    /*
     * Returns avatar data object with:
     * - alt - alternative text (author name)
     * - url - URL to the avatar image
     * - width - width of the avatar image
     * - height - height of the avatar image
     *
     * @param authorObject - object with the author data
     * @param avatarPath - (optional) path to the local avatar image
     *
     * @return object - object with the avatar data
     */
    static getAvatarData(authorObject, avatarPath) {
        let avatarDimensions = {
            height: 240,
            width: 240
        };

        if(avatarPath === '') {
            return false;
        }

        if(avatarPath) {
            try {
                avatarDimensions = sizeOf(avatarPath);
            } catch(e) {
                console.log('helpers/avatar.js - missing avatar image');

                avatarDimensions = {
                    height: false,
                    width: false
                };
            }
        }

        return {
            alt: authorObject.name,
            height: avatarDimensions.height,
            url: authorObject.avatar,
            width: avatarDimensions.width
        }
    }
}

module.exports = AvatarHelper;
