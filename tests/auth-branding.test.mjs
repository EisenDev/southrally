import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const signupSource = readFileSync(new URL('../src/app/signup/page.tsx', import.meta.url), 'utf8')
const signinSource = readFileSync(new URL('../src/components/auth/signin-modal.tsx', import.meta.url), 'utf8')
const authActionsSource = readFileSync(new URL('../src/lib/actions/auth.ts', import.meta.url), 'utf8')
const localEnvironment = readFileSync(new URL('../.env', import.meta.url), 'utf8')
const authBaseUrlSettings = localEnvironment
  .split('\n')
  .filter((line) => /^(NEXTAUTH_URL|AUTH_URL)=/.test(line))
  .join('\n')
const dashboardLayoutSource = readFileSync(new URL('../src/components/shared/dashboard-layout-client.tsx', import.meta.url), 'utf8')
const sidebarSource = readFileSync(new URL('../src/components/shared/sidebar.tsx', import.meta.url), 'utf8')
const legacyBrandPattern = new RegExp(`(?:Paddle|Pickle)${'Yard'}|paddle${'yrd'}-logo`, 'i')
const rootLayoutSource = readFileSync(new URL('../src/app/layout.tsx', import.meta.url), 'utf8')
const favicon = readFileSync(new URL('../src/app/favicon.ico', import.meta.url))

test('signup uses only South Rally branding', () => {
  assert.match(signupSource, /\/south-rally-logo\.png/)
  assert.match(signupSource, /South Rally/)
  assert.doesNotMatch(signupSource, legacyBrandPattern)
})

test('browser metadata and favicon use the South Rally crest', () => {
  assert.match(rootLayoutSource, /icon: '\/south-rally-logo\.png'/)
  assert.match(rootLayoutSource, /apple: '\/south-rally-logo\.png'/)
  assert.notEqual(
    createHash('sha256').update(favicon).digest('hex'),
    '2b8ad2d33455a8f736fc3a8ebf8f0bdea8848ad4c0db48a2833bd0f9cd775932',
  )
})

test('sign-in modal uses only South Rally branding', () => {
  assert.match(signinSource, /\/south-rally-logo\.png/)
  assert.match(signinSource, /South Rally/)
  assert.doesNotMatch(signinSource, legacyBrandPattern)
})

test('authentication handlers and accessible form controls are preserved', () => {
  assert.match(signupSource, /signUpWithOtpAction/)
  assert.match(signupSource, /Continue with Google/)
  assert.match(signinSource, /signInAction/)
  assert.match(signinSource, /sendPasswordResetAction/)
  assert.match(signinSource, /aria-modal="true"/)
  assert.match(signinSource, /aria-label=\{showPassword \? 'Hide password' : 'Show password'\}/)
})

test('signup OTP verification uses the same normalized email as OTP creation', () => {
  const verificationAction = authActionsSource.slice(
    authActionsSource.indexOf('export async function signUpWithOtpAction'),
    authActionsSource.indexOf('async function checkAndApplySignupPromo'),
  )

  assert.match(verificationAction, /const emailNormalized = email\.toLowerCase\(\)\.trim\(\)/)
  assert.match(verificationAction, /identifier: emailNormalized, token: codeNormalized/)
  assert.match(verificationAction, /data: \{ name, email: emailNormalized, hashedPassword \}/)
})

test('local authentication redirects stay on the South Rally development origin', () => {
  assert.match(authBaseUrlSettings, /^NEXTAUTH_URL="http:\/\/localhost:3000"$/m)
  assert.match(authBaseUrlSettings, /^AUTH_URL="http:\/\/localhost:3000"$/m)
  assert.doesNotMatch(authBaseUrlSettings, legacyBrandPattern)
})

test('player dashboard shell uses South Rally branding without changing admin styling', () => {
  assert.match(dashboardLayoutSource, /pathname\.startsWith\('\/dashboard\/admin'\)/)
  assert.match(dashboardLayoutSource, /player-dashboard-theme/)
  assert.match(dashboardLayoutSource, /admin-dashboard-theme/)
  assert.match(sidebarSource, /\/south-rally-logo\.png/)
  assert.match(sidebarSource, /South Rally/)
  assert.doesNotMatch(sidebarSource, legacyBrandPattern)
})

test('Google authentication controls remain visible but disabled', () => {
  assert.match(signupSource, /disabled=\{true\}/)
  assert.match(signupSource, /Google signup is coming soon/)
  assert.match(signinSource, /disabled=\{true\}/)
  assert.match(signinSource, /Google sign-in is coming soon/)
})
