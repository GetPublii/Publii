const assert = require('assert');
const path = require('path');
const avatarHelper = require('../avatar.js');

describe('Avatar Helper', function() {
    it('should detect if avatar uses local file', function() {
        assert.strictEqual(false, avatarHelper.isLocalAvatar(''));
        assert.strictEqual(false, avatarHelper.isLocalAvatar('http://gravatar.com'));
        assert.strictEqual(false, avatarHelper.isLocalAvatar('https://gravatar.com'));
        assert.strictEqual(false, avatarHelper.isLocalAvatar('http://domain.com/media/website/img.jpg'));
    });

    it('should detect if avatar uses Gravatar', function() {
        assert.strictEqual(true, avatarHelper.isGravatar(''));
        assert.strictEqual(true, avatarHelper.isGravatar('http://gravatar.com'));
        assert.strictEqual(true, avatarHelper.isGravatar('https://gravatar.com'));
        assert.strictEqual(true, avatarHelper.isGravatar('http://domain.com/media/website/img.jpg'));
    });

    it('should return avatar object: alt, dimensions, url', function() {
        const avatarTestPath = path.join(__dirname, 'mock-data', 'avatar.png');
        const authorObject = {
            name: "Test Author",
            avatar: "http://domain.com/media/website/avatar.png"
        };

        assert.strictEqual(false, avatarHelper.getAvatarData(authorObject, ''));

        assert.deepEqual({
            alt: "Test Author",
            url: "http://domain.com/media/website/avatar.png",
            width: 240,
            height: 127
        }, avatarHelper.getAvatarData(authorObject, avatarTestPath));

        assert.deepEqual({
            alt: "Test Author",
            url: "http://domain.com/media/website/avatar.png",
            width: 240,
            height: 240
        }, avatarHelper.getAvatarData(authorObject));
    });
});
