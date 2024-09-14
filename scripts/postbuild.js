const { readFile, writeFile } = require('fs/promises')
const { resolve } = require('path')

const HTML_FILE_PATH = resolve('web', 'build', 'index.html')
const HTML_OUT_FILE_PATH = resolve('src', 'decrypt-template.html')

async function main() {
    const htmlInput = await readFile(HTML_FILE_PATH, { encoding: 'utf-8' })

    const htmlOut = applyAllTransformations(
        [
            deleteViteModuleScript,
            preparePayloadTag,
            deleteStyleAssetComment,
            fixWhiteSpace,
        ],
        htmlInput,
    )

    return writeFile(HTML_OUT_FILE_PATH, htmlOut)
}

const preparePayloadTag = (html) =>
    html.replace(
        /\s*<!--DEV ONLY-->[\s\S]*<!--\/DEV ONLY-->/,
        '\n    <!--ENCRYPTED PAYLOAD-->',
    )

const deleteViteModuleScript = (html) => {
    const match = html.match(
        /(<script type="module">[\s\S]*)var [\s\S]*;(\!function\(\)\{[\s\S]*\}\(\);)/,
    )

    if (match) {
        // TODO no matches...
        return html
            .replace(match[1], '  <script type="module">')
            .replace(match[2], '')
    } else {
        return html
    }
}

const deleteStyleAssetComment = (html) =>
    html.replace(/<!-- assets[\s\S]*<style type="text\/css">\s+/, '<style>')

const fixWhiteSpace = (html) =>
    html
        .replace(/\s+<title>/, '\n    <title>')
        .replace(/\n\n<\/script>/, '</script>')
        .replace(/\n\s+<\/style>/, '</style>')
        .replace(/\n\s+<\/head>/, '\n</head>')

/**
 * Run all formatting functions, passing the result forward until we get a final result.
 */
const applyAllTransformations = (fns, initialValue) =>
    fns.reduce((prevResult, fn) => fn(prevResult), initialValue)

// Call start
;(async () => {
    await main()
})()
