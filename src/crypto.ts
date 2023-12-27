/**
 * Get a reference to the Web Crypto API in any modern JS environment
 *
 * @returns An object implementing the Web Crypto API.
 */

function loadCrypto(): Crypto {
    if (typeof window !== 'undefined' && window.crypto) {
        // Running in browsers released after 2017, and other
        return window.crypto
    } else if (globalThis && globalThis.crypto) {
        // runtimes with `globalThis` like Deno or CloudFlare Workers
        return globalThis.crypto
    } else {
        // Running in Node.js >= 15
        const nodeCrypto = require('crypto')
        return nodeCrypto.webcrypto as unknown as Crypto
    }
}

const crypto = loadCrypto()
export default crypto
