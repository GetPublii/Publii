const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sharp = require('sharp');
const ContentHelper = require('../content');
const PostPreview = require('../../contexts/post-preview');
const PagePreview = require('../../contexts/page-preview');
const FeaturedImage = require('../../items/featured-image');
const { returnSrcSetAttribute } = require('../../handlebars/helpers/responsive-srcset');

function createContext(forceWebp = false) {
    const siteConfig = {
        domain: 'https://example.com',
        responsiveImages: true,
        advanced: {
            responsiveImages: true,
            forceWebp,
            mediaLazyLoad: false,
            gdpr: { enabled: false }
        }
    };
    const imageConfig = {
        dimensions: {
            small: { width: 60, height: 'auto', crop: false }
        },
        sizes: '100vw'
    };
    const themeConfig = {
        files: {
            responsiveImages: {
                contentImages: imageConfig,
                featuredImages: imageConfig,
                authorImages: imageConfig,
                tagImages: imageConfig,
                optionImages: imageConfig
            }
        }
    };

    return {
        siteConfig,
        themeConfig,
        renderer: { siteConfig },
        editor: 'tinymce'
    };
}

const renderers = {
    generation(context, html) {
        return ContentHelper.prepareContent(1, html, context.siteConfig.domain, context.themeConfig, context.renderer);
    },
    postPreview(context, html) {
        return PostPreview.prototype.prepareContent.call(context, html, 1);
    },
    pagePreview(context, html) {
        return PagePreview.prototype.prepareContent.call(context, html, 1);
    }
};

describe('AVIF responsive image URLs', function () {
    for (const [name, render] of Object.entries(renderers)) {
        for (const forceWebp of [false, true]) {
            it(`${name}: includes AVIF srcset and keeps the original format (forceWebp=${forceWebp})`, function () {
                const context = createContext(forceWebp);

                for (const extension of ['avif', 'AVIF']) {
                    const html = `<img src="#DOMAIN_NAME#photo.${extension}" width="120" height="80">`;
                    const output = render(context, html);
                    assert.ok(output.includes(`responsive/photo-small.${extension} 60w`));
                    assert.match(output, /srcset="/);
                    assert.match(output, /sizes="100vw"/);
                    assert.doesNotMatch(output, /\.webp/);
                }
            });
        }
    }

    it('preserves responsive opt-out and excludes external and gallery AVIF from content srcset', function () {
        const context = createContext();

        for (const html of [
            '<img data-responsive="false" src="#DOMAIN_NAME#photo.avif">',
            '<img src="https://external.example/photo.avif">',
            '<img src="#DOMAIN_NAME#gallery/photo-thumbnail.avif">'
        ]) {
            assert.doesNotMatch(renderers.generation(context, html), /srcset=/);
        }
    });

    it('keeps AVIF URLs in template helpers for posts, tags, authors and theme options', function () {
        const context = createContext(true);

        for (const [directory, type] of [
            ['posts/1', 'contentImages'],
            ['tags/1', 'tagImages'],
            ['authors/1', 'authorImages'],
            ['website', 'optionImages']
        ]) {
            const url = `${context.siteConfig.domain}/media/${directory}/photo.avif`;
            const result = returnSrcSetAttribute.call(context, url, type).toString();
            assert.ok(result.includes(`media/${directory}/responsive/photo-small.avif 60w`));
            assert.doesNotMatch(result, /\.webp/);
        }

        const jpeg = returnSrcSetAttribute.call(
            context,
            `${context.siteConfig.domain}/media/posts/1/photo.jpg`,
            'contentImages'
        ).toString();
        assert.match(jpeg, /photo-small\.webp 60w/);
    });

    it('keeps AVIF dimensions, srcset and named thumbnail URLs for featured images', async function () {
        const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'publii-avif-rendering-'));

        try {
            const sourceDirectory = path.join(directory, 'media/posts/1');
            fs.mkdirSync(sourceDirectory, { recursive: true });
            await sharp({
                create: {
                    width: 120,
                    height: 80,
                    channels: 3,
                    background: '#336699'
                }
            }).avif().toFile(path.join(sourceDirectory, 'photo.avif'));
            const context = createContext(true);
            const renderer = {
                siteConfig: context.siteConfig,
                themeConfig: context.themeConfig,
                inputDir: directory,
                plugins: { hasModifiers: () => false },
                cachedItems: { featuredImages: { posts: {} } }
            };
            const image = new FeaturedImage({
                id: 1,
                item_id: 1,
                url: 'photo.avif',
                additional_data: '{}'
            }, renderer);

            assert.equal(image.imageData.width, 120);
            assert.equal(image.imageData.height, 80);
            assert.match(image.imageData.srcset, /photo-small\.avif 60w/);
            assert.match(image.imageData.urlSmall, /responsive\/photo-small\.avif$/);
            assert.equal(renderer.cachedItems.featuredImages.posts[1].urlSmall, image.imageData.urlSmall);
        } finally {
            fs.rmSync(directory, { recursive: true, force: true });
        }
    });

    for (const [name, render] of Object.entries(renderers)) {
        it(`${name}: uses AVIF URLs for converted content and gallery thumbnails`, function () {
            const context = createContext();
            context.siteConfig.advanced.forceAvif = true;

            for (const extension of ['jpg', 'JPEG', 'png', 'webp', 'avif']) {
                const html = `<img src="#DOMAIN_NAME#photo.${extension}" width="120" height="80">`;
                const output = render(context, html);
                assert.ok(output.includes('responsive/photo-small.avif 60w'));
                assert.ok(output.includes(`/photo.${extension}"`));

                const gallery = `<figure class="gallery__item"><a href="#DOMAIN_NAME#gallery/photo.${extension}"><img src="#DOMAIN_NAME#gallery/photo-thumbnail.webp"></a></figure>`;
                assert.match(render(context, gallery), /photo-thumbnail\.avif/);
            }
        });

        it(`${name}: restores gallery thumbnail extensions when switching away from AVIF`, function () {
            for (const forceWebp of [false, true]) {
                const context = createContext(forceWebp);
                const html = '<figure class="gallery__item"><a href="#DOMAIN_NAME#gallery/photo.jpg"><img src="#DOMAIN_NAME#gallery/photo-thumbnail.avif"></a></figure>';
                const output = render(context, html);
                assert.ok(output.includes('photo-thumbnail.' + (forceWebp ? 'webp' : 'jpg')));
                assert.ok(output.includes('href="https://example.com/media/posts/1/gallery/photo.jpg"'));
            }
        });
    }

    it('uses AVIF srcset in theme helpers for posts, authors, tags and website images', function () {
        const context = createContext();
        context.siteConfig.advanced.forceAvif = true;

        for (const [directory, type] of [
            ['posts/1', 'contentImages'],
            ['tags/1', 'tagImages'],
            ['authors/1', 'authorImages'],
            ['website', 'optionImages']
        ]) {
            for (const extension of ['jpg', 'png', 'webp']) {
                const url = `${context.siteConfig.domain}/media/${directory}/photo.${extension}`;
                const result = returnSrcSetAttribute.call(context, url, type).toString();
                assert.ok(result.includes(`media/${directory}/responsive/photo-small.avif 60w`));
            }
        }
    });

});
