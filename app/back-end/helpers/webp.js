const fs = require('fs');
const path = require('path');

let encoderPromise = null;
let decoderPromise = null;

function getWebpPackageDir() {
    return path.dirname(require.resolve('@jsquash/webp/package.json'));
}

function loadWasm(relativePath) {
    let wasmPath = path.join(getWebpPackageDir(), relativePath);
    let wasmBuffer = fs.readFileSync(wasmPath);

    return WebAssembly.compile(wasmBuffer);
}

async function getEncoder() {
    if (!encoderPromise) {
        encoderPromise = (async () => {
            let encoder = await import('@jsquash/webp/encode.js');
            let encoderDir = path.join('codec', 'enc');
            let simdWasmPath = path.join(encoderDir, 'webp_enc_simd.wasm');
            let simdWasm = fs.readFileSync(path.join(getWebpPackageDir(), simdWasmPath));
            let wasmPath = WebAssembly.validate(simdWasm)
                ? simdWasmPath
                : path.join(encoderDir, 'webp_enc.wasm');

            await encoder.init(await loadWasm(wasmPath));

            return encoder.default;
        })();
    }

    return encoderPromise;
}

async function getDecoder() {
    if (!decoderPromise) {
        decoderPromise = (async () => {
            let decoder = await import('@jsquash/webp/decode.js');
            let wasmPath = path.join('codec', 'dec', 'webp_dec.wasm');

            await decoder.init(await loadWasm(wasmPath));

            return decoder.default;
        })();
    }

    return decoderPromise;
}

async function encode(bitmap, options) {
    let encoder = await getEncoder();
    let data = {
        ...bitmap,
        data: new Uint8ClampedArray(bitmap.data)
    };
    let result = await encoder(data, options);

    return Buffer.from(result);
}

async function decode(buffer) {
    let decoder = await getDecoder();
    let data = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    let result = await decoder(data);

    return {
        data: Buffer.from(result.data),
        width: result.width,
        height: result.height
    };
}

module.exports = {
    encode,
    decode
};
