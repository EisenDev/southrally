import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, relative } from 'node:path'
import test from 'node:test'

const repositoryRoot = new URL('..', import.meta.url).pathname
const ignoredDirectories = new Set(['.git', '.next', 'node_modules'])
const ignoredFiles = new Set([
  'scripts/deploy_logs.txt',
  'tests/legacy-branding.test.mjs',
])
const textExtensions = new Set(['.css', '.js', '.json', '.md', '.mjs', '.prisma', '.ts', '.tsx', '.yml', '.yaml'])
const legacyTerms = [
  ['Paddle', 'Yard'].join(''),
  ['Pickle', 'Yard'].join(''),
  ['paddle', 'yrd'].join(''),
  ['paddle', 'yard'].join(''),
  ['pickle', 'yard'].join(''),
]

function collectTextFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    if (ignoredDirectories.has(entry)) return []
    const absolutePath = join(directory, entry)
    const repositoryPath = relative(repositoryRoot, absolutePath)
    if (ignoredFiles.has(repositoryPath)) return []
    if (statSync(absolutePath).isDirectory()) return collectTextFiles(absolutePath)
    return textExtensions.has(extname(entry)) ? [absolutePath] : []
  })
}

test('active repository files contain no legacy client branding', () => {
  const violations = collectTextFiles(repositoryRoot).flatMap((filePath) => {
    const content = readFileSync(filePath, 'utf8').toLowerCase()
    const matchesLegacyBrand = legacyTerms.some((term) => content.includes(term.toLowerCase()))
    return matchesLegacyBrand ? [relative(repositoryRoot, filePath)] : []
  })

  assert.deepEqual(violations, [])
})
