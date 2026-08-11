import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const templateSource = readFileSync(
  new URL('../src/lib/email/south-rally-email.ts', import.meta.url),
  'utf8',
)
const authActionsSource = readFileSync(
  new URL('../src/lib/actions/auth.ts', import.meta.url),
  'utf8',
)

test('shared authentication email template carries the South Rally visual system', () => {
  assert.match(templateSource, /South Rally crest/)
  assert.match(templateSource, /SOUTH RALLY/)
  assert.match(templateSource, /#063F32/i)
  assert.match(templateSource, /#2D183F/i)
  assert.match(templateSource, /#F8F3E8/i)
  assert.match(templateSource, /#B49A48/i)
  assert.match(templateSource, /role="presentation"/)
})

test('email template supports OTP and password-reset variants', () => {
  assert.match(templateSource, /buildSouthRallyOtpEmail/)
  assert.match(templateSource, /buildSouthRallyPasswordResetEmail/)
  assert.match(templateSource, /15 minutes/)
  assert.match(templateSource, /1 hour/)
  assert.match(templateSource, /escapeHtml/)
})

test('all authentication emails use the shared template', () => {
  assert.match(authActionsSource, /buildSouthRallyOtpEmail/)
  assert.match(authActionsSource, /buildSouthRallyPasswordResetEmail/)
  assert.doesNotMatch(authActionsSource, /background-color: #007C80/)
})
