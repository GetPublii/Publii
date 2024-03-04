const assert = require('assert');
const slug = require('../slug.js');

describe('Slug creation', function() {
    it('should empty string when there is no chars', function() {
        assert.strictEqual('', slug('       '));
        assert.strictEqual('', slug("  \t \n  \r "));
    });

    it('should remove white spaces', function() {
        assert.strictEqual('lorem-ipsum', slug('lorem ipsum'));
        assert.strictEqual('lorem-ipsum', slug('lorem\nipsum'));
        assert.strictEqual('lorem-ipsum', slug('lorem\tipsum'));
        assert.strictEqual('lorem-ipsum', slug('lorem\ripsum'));
    });

    it('should change capital letters to lower case', function() {
        assert.strictEqual('lorem-ipsum', slug('Lorem Ipsum'));
    });

    it('should remove dots from the slug', function() {
        assert.strictEqual('loremipsum', slug('lorem.ipsum'));
        assert.strictEqual('loremipsum', slug('lorem.Ipsum'));
        assert.strictEqual('loremipsum', slug('Lorem.Ipsum'));
    });

    it('should remove special chars from the slug', function() {
        assert.strictEqual('loremipsum', slug('lorem?!ipsum'));
        assert.strictEqual('lorem-ipsum', slug('lorem? Ipsum!'));
        assert.strictEqual('loremipsum', slug('Lorem;Ipsum:+'));
    });

    it('should support japanese chars', function() {
        assert.strictEqual('konnitihashi-jie', slug('こんにちは世界'));
        assert.strictEqual('yaa-jin-ri-hayuan-qi-desuka', slug('やあ！ 今日は元気ですか？'));
        assert.strictEqual('yaa-si-noliang-i-sorehazututochang-i-jin-ri-hayuan-qi-desuka', slug('やあ！ 私の良い。 それはずっと長い。 今日は元気ですか？'));
    });

    it('should support korean chars', function() {
        assert.strictEqual('annyeonghaseyo-segye', slug('안녕하세요 세계'));
        assert.strictEqual('annyeong-cingu-oneul-eoddeoni', slug('안녕 친구! 오늘 어떠니?'));
        assert.strictEqual('annyeong-cingu-nae-iig-neomu-gilda-oneul-eoddeoni', slug('안녕 친구! 내 이익. 너무 길다. 오늘 어떠니?'));
    });

    it('should support chinese chars', function() {
        assert.strictEqual('ni-haoshi-jie', slug('你好，世界'));
        assert.strictEqual('ni-zen-mo-jiao-pei', slug('你怎麼交配'));
        assert.strictEqual('ni-zen-mo-jiao-pei-wo-hen-hao', slug('你怎麼交配 我很好！'));
    });

    it('should not remove dots in the filename mode', function() {
        assert.strictEqual('indexhtml', slug('index.html', false));
        assert.strictEqual('index.html', slug('index.html', true));
    });

    it('should remove some special characters', function() {
        assert.strictEqual('title-with-and-arrows', slug('Title with « and » arrows'));
        assert.strictEqual('title-with-typoraphical-quotes-and-normal-quotes', slug('Title with „typoraphical quotes“ and "normal quotes"'));
        assert.strictEqual('title-with-brackets-in-different-forms', slug('Title (with) [brackets] {in} ⟨different forms⟩'));
        assert.strictEqual('title-with-different-types-of-dashes', slug('Title with different - types – of — dashes'));
        assert.strictEqual('title-with-many-apostrophes-many-many', slug('Title with many \' apostrophes \‘ many \’ many'));
        assert.strictEqual('title-with-dots-and-commas', slug('Title with dots . and commas,'));
        assert.strictEqual('and-another-characters', slug('And another characters ; : ? !'));
        assert.strictEqual('also-ellipsis', slug('Also ellipsis…'));
        assert.strictEqual('and-slashes', slug('And slashes \/ \\'));
        assert.strictEqual('and-other-chars', slug('And other chars * # $ @ ^ % ♥ ☆'));
    });
});
