/**
 * @file Handler file for choosing the correct version of ONNX Runtime, based on the environment.
 * Ideally, we could import the `onnxruntime-web` and `onnxruntime-node` packages only when needed,
 * but dynamic imports don't seem to work with the current webpack version and/or configuration.
 * This is possibly due to the experimental nature of top-level await statements.
 * So, we just import both packages, and use the appropriate one based on the environment:
 *   - When running in node, we use `onnxruntime-node`.
 *   - When running in the browser, we use `onnxruntime-web` (`onnxruntime-node` is not bundled).
 *
 * This module is not directly exported, but can be accessed through the environment variables:
 * ```javascript
 * import { env } from '@xenova/transformers';
 * console.log(env.backends.onnx);
 * ```
 *
 * @module backends/onnx
 */

// NOTE: Import order matters here. We need to import `onnxruntime-node` before `onnxruntime-web`.
import * as ONNX_NODE from 'onnxruntime-node-gpu';
import * as ONNX_WEB from 'onnxruntime-web';

export let ONNX;

export let executionProviders = [
    // 'webgpu',
    'wasm'
];

if (typeof process !== 'undefined' && process?.release?.name === 'node') {
    // Running in a node-like environment.
    ONNX = ONNX_NODE;

    // Add `cpu` and os-specific execution provider
    switch (process.platform) {
        case 'darwin':
            executionProviders = ['coreml', 'cpu'];
            break;
        case 'linux':
            executionProviders = ['cuda', 'cpu']
            break;
        case 'win32':
            executionProviders = ['directml', 'cpu']
            break
        default:
            executionProviders = ['cpu']
    }

} else {
    // Running in a browser-environment
    ONNX = ONNX_WEB;

    // SIMD for WebAssembly does not operate correctly in recent versions of iOS (>= 16.4).
    // As a temporary fix, we disable it for now.
    // For more information, see: https://github.com/microsoft/onnxruntime/issues/15644
    const isIOS = typeof navigator !== 'undefined' && /iP(hone|od|ad)/.test(navigator.userAgent);
    if (isIOS) {
        ONNX.env.wasm.simd = false;
    }
}

// We select the default export if it exists, otherwise we use the named export.
// This allows us to run in both node and browser environments.
ONNX = ONNX.default ?? ONNX;
