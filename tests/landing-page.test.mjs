import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

const pageSource = readFileSync(new URL('../src/app/page.tsx', import.meta.url), 'utf8')
const legacyBrandPattern = new RegExp(`(?:Paddle|Pickle)${'Yard'}`, 'i')

test('uses South Rally branding and the supplied logo', () => {
  assert.match(pageSource, /South Rally/)
  assert.match(pageSource, /\/south-rally-logo\.png/)
  assert.doesNotMatch(pageSource, legacyBrandPattern)
  assert.equal(existsSync(new URL('../public/south-rally-logo.png', import.meta.url)), true)
})

test('renders the required landing sections in the approved order', () => {
  const sectionIds = [
    'experience',
    'courts',
    'open-play',
    'membership',
    'events',
    'join',
  ]

  let previousIndex = -1
  for (const sectionId of sectionIds) {
    const sectionIndex = pageSource.indexOf(`id="${sectionId}"`)
    assert.ok(sectionIndex > previousIndex, `${sectionId} must follow the previous section`)
    previousIndex = sectionIndex
  }
})

test('preserves auth and accessible mobile navigation behavior', () => {
  assert.match(pageSource, /\/api\/auth\/session/)
  assert.match(pageSource, /<SignInModal/)
  assert.match(pageSource, /aria-expanded=/)
  assert.match(pageSource, /aria-controls="mobile-navigation"/)
  assert.match(pageSource, /<main/)
  assert.match(pageSource, /<footer/)
})

test('keeps public calls to action out of client and admin routes', () => {
  assert.doesNotMatch(pageSource, /\/dashboard\/(?:admin|bookings|events|openplay|paddlestack|yard-points)/)
  assert.equal(pageSource.match(/href="\/dashboard"/g)?.length, 2)
  assert.match(pageSource, /onClick=\{\(\) => setIsSignInOpen\(true\)\}>Login<\/button>/)
  assert.match(pageSource, /<Link href="\/signup" className=\{styles\.lightButton\}>Book a Court<\/Link>/)
})

test('credits Novaryn in the footer with a safe external link', () => {
  assert.match(pageSource, /Crafted and built by/)
  assert.match(pageSource, /href="https:\/\/novaryn\.tech\/"/)
  assert.match(pageSource, /target="_blank"/)
  assert.match(pageSource, /rel="noopener noreferrer"/)
})
