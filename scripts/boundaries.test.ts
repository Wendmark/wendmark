/**
 * Proves the dependency rules in eslint.config.js actually fire. Each case
 * lints a synthetic file placed inside a real package and asserts whether
 * boundaries/dependencies (or a core purity rule) reports it.
 * Also checks that package.json dependencies agree with the same table.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ESLint } from 'eslint'
import { beforeAll, describe, expect, it } from 'vitest'
import { ALLOWED_DEPENDENCIES } from '../eslint.config.js'

const root = join(import.meta.dirname, '..')

const PACKAGES = {
  core: 'packages/core',
  dom: 'packages/dom',
  snippet: 'packages/snippet',
  portal: 'apps/portal',
  playground: 'apps/playground',
  extension: 'apps/extension',
} as const
type Pkg = keyof typeof PACKAGES

const PACKAGE_NAMES: Record<Pkg, string> = {
  core: '@wendmark/core',
  dom: '@wendmark/dom',
  snippet: '@wendmark/snippet',
  portal: '@wendmark/portal',
  playground: '@wendmark/playground',
  extension: '@wendmark/extension',
}

let eslint: ESLint
beforeAll(() => {
  eslint = new ESLint({ cwd: root })
})

async function ruleIds(pkg: Pkg, code: string, file = 'src/__boundary_probe__.ts') {
  const [result] = await eslint.lintText(code, { filePath: join(root, PACKAGES[pkg], file) })
  const fatal = result?.messages.filter((m) => m.fatal) ?? []
  expect(fatal, JSON.stringify(fatal)).toEqual([])
  return result?.messages.map((m) => m.ruleId) ?? []
}

const pkgs = Object.keys(PACKAGES) as Pkg[]

describe('workspace imports follow the dependency table', () => {
  for (const from of pkgs) {
    for (const to of pkgs) {
      if (from === to) continue
      const allowed = (ALLOWED_DEPENDENCIES[from] as string[]).includes(to)
      it(`${from} -> ${to} is ${allowed ? 'allowed' : 'rejected'}`, async () => {
        // Relative path into the other package's source, which works for every
        // target (apps have no package exports) and resolves to a real file.
        const target =
          to === 'portal'
            ? 'app/page'
            : to === 'playground'
              ? 'src/App'
              : to === 'extension'
                ? 'src/background'
                : 'src/index'
        const rel = `../../../${PACKAGES[to]}/${target}`
        const ids = await ruleIds(from, `export * from '${rel}'\n`)
        if (allowed) expect(ids).not.toContain('boundaries/dependencies')
        else expect(ids).toContain('boundaries/dependencies')
      })
    }
  }

  it('package-name imports are checked too (portal -> @wendmark/dom is rejected)', async () => {
    const ids = await ruleIds('portal', `export * from '@wendmark/dom'\n`)
    expect(ids).toContain('boundaries/dependencies')
  })

  it('package-name imports are checked too (dom -> @wendmark/snippet is rejected)', async () => {
    const ids = await ruleIds('dom', `export * from '@wendmark/snippet'\n`)
    expect(ids).toContain('boundaries/dependencies')
  })

  it('package-name imports that follow the table pass (snippet -> @wendmark/dom)', async () => {
    const ids = await ruleIds('snippet', `export * from '@wendmark/dom'\n`)
    expect(ids).not.toContain('boundaries/dependencies')
  })
})

describe('core stays pure', () => {
  it('may import zod', async () => {
    expect(await ruleIds('core', `export { z } from 'zod'\n`)).toEqual([])
  })

  it('rejects other third-party packages', async () => {
    expect(await ruleIds('core', `export * from 'react'\n`)).toContain('boundaries/dependencies')
  })

  it('rejects Node built-ins', async () => {
    const ids = await ruleIds('core', `export { readFileSync } from 'node:fs'\n`)
    expect(ids).toContain('boundaries/dependencies')
  })

  it('rejects DOM and network globals', async () => {
    const ids = await ruleIds('core', `export const x = () => fetch(document.title)\n`)
    expect(ids.filter((id) => id === 'no-restricted-globals')).toHaveLength(2)
  })
})

describe('snippet stays framework-free', () => {
  it('rejects react', async () => {
    expect(await ruleIds('snippet', `export * from 'react'\n`)).toContain('no-restricted-imports')
  })
})

describe('package.json dependencies agree with the table', () => {
  for (const pkg of pkgs) {
    it(`${pkg} declares only allowed @wendmark/* dependencies`, () => {
      const manifest = JSON.parse(readFileSync(join(root, PACKAGES[pkg], 'package.json'), 'utf8'))
      const declared = Object.keys({
        ...manifest.dependencies,
        ...manifest.devDependencies,
        ...manifest.peerDependencies,
      }).filter((name) => name.startsWith('@wendmark/'))
      const allowed = (ALLOWED_DEPENDENCIES[pkg] as Pkg[]).map((p) => PACKAGE_NAMES[p])
      for (const name of declared) expect(allowed).toContain(name)
    })
  }
})

describe('core test files', () => {
  it('may import vitest', async () => {
    const ids = await ruleIds('core', `export { it } from 'vitest'\n`, 'src/probe.test.ts')
    expect(ids).not.toContain('boundaries/dependencies')
  })

  it('source files may not import vitest', async () => {
    const ids = await ruleIds('core', `export { it } from 'vitest'\n`)
    expect(ids).toContain('boundaries/dependencies')
  })
})
