/*
 * Lazy AVIF codec for Jimp, independent of the native Sharp module.
 */

const fs = require('fs');
const path = require('path');

let codecPromise = null;

async function loadCodec() {
    const encoder = await import('@jsquash/avif/encode.js');
    const decoder = await import('@jsquash/avif/decode.js');
    const codecDirectory = path.join(path.dirname(require.resolve('@jsquash/avif/package.json')), 'codec');
    const [encoderModule, decoderModule] = await Promise.all([
        WebAssembly.compile(fs.readFileSync(path.join(codecDirectory, 'enc', 'avif_enc.wasm'))),
        WebAssembly.compile(fs.readFileSync(path.join(codecDirectory, 'dec', 'avif_dec.wasm')))
    ]);

    await encoder.init(encoderModule);
    await decoder.init(decoderModule);

    return { encoder, decoder };
}

function getCodec() {
    if (!codecPromise) {
        codecPromise = loadCodec().catch((error) => {
            codecPromise = null;
            throw error;
        });
    }

    return codecPromise;
}

module.exports = () => ({
    mime: 'image/avif',
    extensions: ['avif'],
    hasAlpha: true,
    async encode(bitmap, options = {}) {
        const { encoder } = await getCodec();
        const encodeOptions = {};

        if (options.quality != null) {
            encodeOptions.quality = options.quality;
        }

        if (options.alphaQuality != null) {
            encodeOptions.qualityAlpha = options.alphaQuality;
        }

        const encoded = await encoder.default({
            data: new Uint8ClampedArray(bitmap.data),
            width: bitmap.width,
            height: bitmap.height
        }, encodeOptions);

        return Buffer.from(encoded);
    },
    async decode(data) {
        const { decoder } = await getCodec();
        const decoded = await decoder.default(new Uint8Array(data).buffer);

        return {
            data: Buffer.from(decoded.data.buffer, decoded.data.byteOffset, decoded.data.byteLength),
            width: decoded.width,
            height: decoded.height
        };
    }
});
