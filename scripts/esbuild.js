const esbuild = require('esbuild')
const fse = require('fs-extra')
const { execSync } = require('child_process')
const { resolve } = require('path')
const { performance } = require('perf_hooks')
const { rename } = require('fs')

const { emptyDir, copy, remove, readJson, writeJson } = fse

;(async () => {
    const startTime = performance.now()
    const pkg = await readJson('./package.json')

    console.log(`⚡ Building pagecrypt v${pkg.version}...`)

    const outDir = './dist'
    const distDir = resolve(outDir)

    await emptyDir(distDir)

    esbuild
        .build({
            entryPoints: ['src/index.ts', 'src/core.ts', 'src/cli.ts'],
            outdir: outDir,
            bundle: true,
            sourcemap: false,
            minify: false,
            splitting: false,
            format: 'cjs',
            target: ['esnext'],
            platform: 'node',
            loader: { '.html': 'text' },
            external: ['rfc4648', 'sade'],
        })
        .then(async () => {
            /*
            // TODO broken...
            // Build declaration files with TSC since they aren't built by esbuild.
            execSync('npx tsc')

            const declarationsDir = resolve(distDir, 'src')

            // Move all declaration files to the root dist folder. Also remove unwanted files and folder.
            await remove(resolve(declarationsDir, 'cli.d.ts'))
            await copy(declarationsDir, distDir)
            await remove(declarationsDir)
            */

            await Promise.all([
                copy('./LICENSE.md', resolve(distDir, 'LICENSE.md')),
                copy('./CHANGELOG.md', resolve(distDir, 'CHANGELOG.md')),
                copy('./README.md', resolve(distDir, 'README.md')),
                copy('./web/build/assets/', resolve(distDir, 'client')),
            ])

            // For CSP reasons it is sometimes simpler to host a script instead of inlining it
            // So we are pulling out the web script as part of the distribution
            // This is not good and makes a lot of assumptions...
            // Better to generate a nonce...
            const webDir = await fse.readdir(resolve(distDir, 'client'))
            for await (const file of webDir) {
                console.log(file)
                fse.rename(
                    resolve(distDir, 'client', file),
                    resolve(
                        distDir,
                        'client',
                        'pagecrypt' + '.' + file.split('.').pop(),
                    ),
                )
            }

            // Prepare package.json for publishing.
            const distPackage = {
                ...pkg,
                private: undefined,
                devDependencies: undefined,
                scripts: undefined,
                main: './index.js',
                bin: {
                    pagecrypt: './cli.js',
                },
                types: './index.d.ts',
                exports: {
                    '.': {
                        node: './index.js',
                    },
                    './core': {
                        import: './core.js',
                    },
                },
            }

            await writeJson(resolve(distDir, 'package.json'), distPackage, {
                spaces: 4,
            })

            const buildTime = (
                (performance.now() - startTime) /
                1000
            ).toLocaleString('en-US', {
                minimumFractionDigits: 3,
                maximumFractionDigits: 3,
            })
            console.log(`✅ Finished in ${buildTime} s\n`)
        })
        .catch((e) => {
            console.error(e)
            process.exit(1)
        })
})()
