/*
 * Builds a Jimp instance with WebP (WASM) support.
 */

const fs = require('fs');
const path = require('path');

let customJimpPromise = null;

async function buildJimp() {
    const { createJimp } = await import('@jimp/core');
    const { defaultFormats, defaultPlugins } = await import('jimp');
    const { simd } = await import('wasm-feature-detect');
    const encoder = await import('@jsquash/webp/encode.js');
    const decoder = await import('@jsquash/webp/decode.js');
    const codecDir = path.join(path.dirname(require.resolve('@jsquash/webp/package.json')), 'codec');
    const encoderWasmPath = path.join(codecDir, 'enc', (await simd()) ? 'webp_enc_simd.wasm' : 'webp_enc.wasm');
    const decoderWasmPath = path.join(codecDir, 'dec', 'webp_dec.wasm');
    const [encoderModule, decoderModule] = await Promise.all([
        WebAssembly.compile(fs.readFileSync(encoderWasmPath)),
        WebAssembly.compile(fs.readFileSync(decoderWasmPath))
    ]);

    await encoder.init(encoderModule);
    await decoder.init(decoderModule);

    const webpFormat = () => ({
        mime: 'image/webp',
        extensions: ['webp'],
        hasAlpha: true,
        encode: async (bitmap, options = {}) => {
            const encodeOptions = {};

            if (options.quality != null) {
                encodeOptions.quality = options.quality;
            }

            if (options.alphaQuality != null) {
                encodeOptions.alpha_quality = options.alphaQuality;
            }

            if (options.lossless != null) {
                encodeOptions.lossless = options.lossless;
            }

            const arrayBuffer = await encoder.default({
                data: new Uint8ClampedArray(bitmap.data),
                width: bitmap.width,
                height: bitmap.height
            }, encodeOptions);

            return Buffer.from(arrayBuffer);
        },
        decode: async (data) => {
            const result = await decoder.default(new Uint8Array(data).buffer);

            return {
                data: Buffer.from(result.data.buffer, result.data.byteOffset, result.data.byteLength),
                width: result.width,
                height: result.height
            };
        }
    });

    return createJimp({
        formats: [...defaultFormats, webpFormat],
        plugins: defaultPlugins
    });
}

function getJimp() {
    if (!customJimpPromise) {
        customJimpPromise = buildJimp();
    }

    return customJimpPromise;
}

module.exports = getJimp;
