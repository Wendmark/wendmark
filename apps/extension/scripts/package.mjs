/**
 * Packs dist/ into the zip the Chrome Web Store takes:
 * release/wendmark-chrome-<version>.zip.
 *
 * The manifest in dist/ carries a `key`, which fixes the extension's id for
 * local development so the play page can find an unpacked copy. The store
 * refuses manifests with a key and gives the item an id of its own, so the
 * key comes out here, and nothing else changes.
 *
 *   pnpm --filter @wendmark/extension package    # builds first
 */
import { execFileSync } from 'node:child_process'
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** The manifest as the store takes it. Throws on anything it must not have. */
export function storeManifest(manifest, packageVersion) {
  if (manifest.version !== packageVersion) {
    throw new Error(
      `manifest.json says ${manifest.version} but package.json says ${packageVersion}`,
    )
  }
  if (manifest.host_permissions || manifest.content_scripts) {
    throw new Error('the manifest asks for sites at install; it must not')
  }
  const { key: _key, ...rest } = manifest
  return rest
}

function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const dist = path.join(root, 'dist')
  const stage = path.join(root, '.store')
  const release = path.join(root, 'release')

  const manifest = JSON.parse(readFileSync(path.join(dist, 'manifest.json'), 'utf8'))
  const { version } = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'))
  const packed = storeManifest(manifest, version)

  rmSync(stage, { recursive: true, force: true })
  cpSync(dist, stage, { recursive: true })
  writeFileSync(path.join(stage, 'manifest.json'), `${JSON.stringify(packed, null, 2)}\n`)

  mkdirSync(release, { recursive: true })
  const zip = path.join(release, `wendmark-chrome-${version}.zip`)
  rmSync(zip, { force: true })
  // -X leaves out file attributes, so the same build makes the same zip.
  execFileSync('zip', ['-r', '-X', '-q', zip, '.'], { cwd: stage })
  rmSync(stage, { recursive: true, force: true })
  console.log(`  ${path.relative(root, zip)}`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
