import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const seedSource = readFileSync(new URL('../prisma/seed.mjs', import.meta.url), 'utf8')

test('production seed requires runtime admin credentials', () => {
  assert.equal(packageJson.prisma.seed, 'node prisma/seed.mjs')
  assert.match(seedSource, /process\.env\.ADMIN_EMAIL/)
  assert.match(seedSource, /process\.env\.ADMIN_PASSWORD/)
  assert.doesNotMatch(seedSource, /pickleballsulop/i)
  assert.doesNotMatch(seedSource, /Pickleball1234/)
})

test('production seed creates one verified VIP administrator', () => {
  assert.match(seedSource, /role: 'ADMIN'/)
  assert.match(seedSource, /membership: 'VIP'/)
  assert.match(seedSource, /emailVerified: new Date\(\)/)
  assert.match(seedSource, /await prisma\.user\.create\(/)
  assert.doesNotMatch(seedSource, /await prisma\.user\.createMany\(/)
})
