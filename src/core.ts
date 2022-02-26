import { base64 } from 'rfc4648'

import crypto from './crypto'

// @ts-expect-error 2307 - Using esbuild to inline this HTML file as a string
import decryptTemplate from './decrypt-template.html'

/**
 * Encrypt a string and turn it into an encrypted payload.
 *
 * @param {string} content The data to encrypt
 * @param {string} password The password which will be used to encrypt + decrypt the content.
 * @param {Uint8Array} customSalt Optional custom salt value for encoding multiple files with the same key. Less secure!*
 * @returns an encrypted payload
 */
async function getEncryptedPayload(
    content: string,
    password: string,
    customSalt?: Uint8Array,
) {
    const encoder = new TextEncoder()

    // Validate custom salt, or generate
    const salt =
        typeof customSalt !== 'undefined' && customSalt.length >= 32
            ? customSalt
            : generateRandomSalt()

    const baseKey = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveKey'],
    )
    const key = await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: 2e6, hash: 'SHA-256' },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt'],
    )

    const iv = crypto.getRandomValues(new Uint8Array(16))
    const ciphertext = new Uint8Array(
        await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            key,
            encoder.encode(content),
        ),
    )
    const totalLength = salt.length + iv.length + ciphertext.length
    const mergedData = new Uint8Array(totalLength)
    mergedData.set(salt)
    mergedData.set(iv, salt.length)
    mergedData.set(ciphertext, salt.length + iv.length)

    return base64.stringify(mergedData)
}

/**
 * Encrypt an HTML string with a given password.
 * The resulting page can be viewed and decrypted by opening the output HTML file in a browser, and entering the correct password.
 *
 * @param {string} inputHTML The HTML string to encrypt.
 * @param {string} password The password which will be used to encrypt + decrypt the content.
 * @param {Uint8Array} customSalt Optional custom salt value for encoding multiple files with the same key. Less secure!*
 * @returns A promise that will resolve with the encrypted HTML content
 */
export async function encryptHTML(
    inputHTML: string,
    password: string,
    customSalt?: Uint8Array,
) {
    return (decryptTemplate as string).replace(
        /<!--ENCRYPTED PAYLOAD-->/,
        `<pre class="hidden">${await getEncryptedPayload(
            inputHTML,
            password,
            customSalt,
        )}</pre>`,
    )
}

/**
 * Generate a random password of a given length.
 *
 * @param {number} length The password length.
 * @param {string} characters The set of characters to pick from.
 * @returns A random password.
 */
export function generatePassword(
    length = 80,
    characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
) {
    return Array.from({ length }, (_) => getRandomCharacter(characters)).join(
        '',
    )
}

/**
 * Get a random character from a given set of characters.
 *
 * @param {string} characters The set of characters to pick from.
 * @returns A random character.
 */
function getRandomCharacter(characters: string) {
    let randomNumber
    // Due to the repeating nature of results from the remainder
    // operator, we potentially need to regenerate the random number
    // several times. This is required to ensure all characters have
    // the same probability to get picked. Otherwise, the first
    // characters would appear more often, resulting in a weaker
    // password security.
    // Learn more: https://samuelplumppu.se/blog/generate-password-in-browser-web-crypto-api
    do {
        randomNumber = crypto.getRandomValues(new Uint8Array(1))[0]
    } while (randomNumber >= 256 - (256 % characters.length))

    return characters[randomNumber % characters.length]
}

/**
 * Generate a random salt.
 *
 * @returns {Uint8Array} A random salt.
 */
export function generateRandomSalt(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(32))
}
