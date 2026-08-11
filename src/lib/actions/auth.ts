'use server'

import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { auth, signIn } from '@/lib/auth'
import { AuthError } from 'next-auth'

const SignUpSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
})

const SignInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string }

function getPublicAppUrl() {
  return (process.env.NEXTAUTH_URL || process.env.AUTH_URL || 'http://localhost:3000')
    .replace(/\/api\/auth\/?$/, '')
    .replace(/\/$/, '')
}

export async function signUpAction(
  formData: FormData,
): Promise<ActionResult> {
  const rawInput = {
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  }

  const parsed = SignUpSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid input',
    }
  }

  const { name, email, password } = parsed.data
  const emailNormalized = email.toLowerCase().trim()

  const existingUser = await db.user.findUnique({ where: { email: emailNormalized } })
  if (existingUser) {
    return { success: false, error: 'An account with this email already exists' }
  }

  const hashedPassword = await bcrypt.hash(password, 12)

  await db.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: { name, email: emailNormalized, hashedPassword },
    })
    await checkAndApplySignupPromo(tx, newUser.id)
  })

  // Auto sign-in after registration
  try {
    await signIn('credentials', { email, password, redirectTo: '/dashboard' })
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: 'Account created. Please sign in.' }
    }
    throw error
  }

  return { success: true }
}

async function sendEmailViaResend(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not defined')
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: fromEmail,
      to,
      subject,
      html,
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Resend API error: ${res.status} - ${errText}`)
  }

  const data = await res.json()
  return data
}

async function sendLoginOtpEmail(email: string, code: string) {
  const brandLogoUrl = `${getPublicAppUrl()}/south-rally-logo.png`
  console.log('\n=============================================')
  console.log(`[SOUTH RALLY LOGIN OTP] Code: ${code} for ${email}`)
  console.log('=============================================\n')

  const html = `
    <div style="font-family: sans-serif; padding: 24px; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${brandLogoUrl}" alt="South Rally crest" style="width: 72px; height: 72px; border-radius: 50%; object-fit: contain; background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 4px;" />
      </div>
      <h2 style="color: #007C80; margin-top: 0; margin-bottom: 16px; font-size: 20px; font-weight: 700; text-align: center;">Admin/Staff Verification</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.5; margin-bottom: 20px; text-align: center;">Please use the following 6-digit verification code to complete your login:</p>
      <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; padding: 16px; background: #f0fdfa; color: #007C80; text-align: center; border-radius: 8px; margin: 24px 0; border: 1px solid #ccfbf1; font-family: monospace;">
        ${code}
      </div>
      <p style="color: #94a3b8; font-size: 12px; line-height: 1.4; margin-top: 24px; margin-bottom: 0; text-align: center;">This code is valid for 15 minutes. If you did not request this code, you can safely ignore this email.</p>
    </div>
  `

  if (process.env.RESEND_API_KEY) {
    try {
      await sendEmailViaResend(email, `Your South Rally Login Verification Code: ${code}`, html)
      console.log(`[RESEND] Login OTP email successfully dispatched to ${email}`)
      return
    } catch (err) {
      console.error('Failed to send login OTP via Resend:', err)
    }
  }

  console.warn('RESEND_API_KEY is missing. Login OTP delivery is unavailable.')
}

export async function signInAction(
  formData: FormData,
): Promise<ActionResult> {
  const rawInput = {
    email: formData.get('email'),
    password: formData.get('password'),
  }

  const parsed = SignInSchema.safeParse(rawInput)
  if (!parsed.success) {
    return { success: false, error: 'Invalid email or password' }
  }

  const { email, password } = parsed.data
  const emailNormalized = email.toLowerCase().trim()

  const user = await db.user.findUnique({ where: { email: emailNormalized } })
  if (!user || !user.hashedPassword) {
    return { success: false, error: 'Invalid email or password' }
  }

  const passwordMatch = await bcrypt.compare(password, user.hashedPassword)
  if (!passwordMatch) {
    return { success: false, error: 'Invalid email or password' }
  }

  const otp = formData.get('otp') as string || undefined

  if ((user.role === 'ADMIN' || user.role === 'STAFF') && !otp) {
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expires = new Date(Date.now() + 15 * 60 * 1000)

    await db.verificationToken.deleteMany({
      where: { identifier: emailNormalized }
    })

    await db.verificationToken.create({
      data: {
        identifier: emailNormalized,
        token: code,
        expires
      }
    })

    // Send email in the background without holding up the user response!
    sendLoginOtpEmail(emailNormalized, code).catch(err => {
      console.error('Background login OTP send failed:', err)
    })

    return { success: false, error: 'OTP_REQUIRED' }
  }

  try {
    await signIn('credentials', {
      email: emailNormalized,
      password,
      otp,
      redirectTo: '/dashboard',
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: 'Invalid email, password, or verification code' }
    }
    throw error
  }

  return { success: true }
}

export async function sendOtpAction(email: string): Promise<ActionResult> {
  if (!email || !email.includes('@')) {
    return { success: false, error: 'Invalid email address' }
  }

  const emailNormalized = email.toLowerCase().trim()

  const existingUser = await db.user.findUnique({ where: { email: emailNormalized } })
  if (existingUser) {
    return { success: false, error: 'An account with this email already exists' }
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString()
  const expires = new Date(Date.now() + 15 * 60 * 1000)

  try {
    await db.verificationToken.deleteMany({
      where: { identifier: emailNormalized }
    })

    await db.verificationToken.create({
      data: {
        identifier: emailNormalized,
        token: code,
        expires
      }
    })

    console.log('\n=============================================')
    console.log(`[SOUTH RALLY SIGNUP OTP] Code: ${code} for ${emailNormalized}`)
    console.log('=============================================\n')

    const htmlContent = `
      <div style="font-family: sans-serif; padding: 24px; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="${getPublicAppUrl()}/south-rally-logo.png" alt="South Rally crest" style="width: 72px; height: 72px; border-radius: 50%; object-fit: contain; background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 4px;" />
        </div>
        <h2 style="color: #007C80; margin-top: 0; margin-bottom: 16px; font-size: 20px; font-weight: 700; text-align: center;">Verify your email address</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.5; margin-bottom: 20px; text-align: center;">Welcome to South Rally! Please verify your email by entering the 6-digit code below on the signup page:</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; padding: 16px; background: #f0fdfa; color: #007C80; text-align: center; border-radius: 8px; margin: 24px 0; border: 1px solid #ccfbf1; font-family: monospace;">
          ${code}
        </div>
        <p style="color: #94a3b8; font-size: 12px; line-height: 1.4; margin-top: 24px; margin-bottom: 0; text-align: center;">This code is valid for 15 minutes. If you did not request this code, you can safely ignore this email.</p>
      </div>
    `

    if (process.env.RESEND_API_KEY) {
      // Send email in the background without holding up the user response!
      sendEmailViaResend(emailNormalized, `Your South Rally Verification Code: ${code}`, htmlContent).then(() => {
        console.log(`[RESEND] Signup OTP email sent successfully to ${emailNormalized}`)
      }).catch(err => {
        console.warn('Background signup OTP send failed via Resend:', err)
      })
    } else {
      console.warn('RESEND_API_KEY is missing. Signup OTP delivery is unavailable.')
    }

    return { success: true }
  } catch (error: any) {
    if (error instanceof Error && (error.message === 'NEXT_REDIRECT' || error.message?.includes('NEXT_REDIRECT') || (error as any).digest?.startsWith('NEXT_REDIRECT'))) {
      throw error
    }
    console.error('Error in sendOtpAction:', error)
    return { success: false, error: `Failed to send email: ${error.message || error}` }
  }
}

export async function signUpWithOtpAction(
  formData: FormData,
  code: string
): Promise<ActionResult> {
  const rawInput = {
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  }

  const parsed = SignUpSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid input',
    }
  }

  const { name, email, password } = parsed.data
  const emailNormalized = email.toLowerCase().trim()
  const codeNormalized = code.trim()

  try {
    const tokenRecord = await db.verificationToken.findFirst({
      where: { identifier: emailNormalized, token: codeNormalized }
    })

    if (!tokenRecord) {
      return { success: false, error: 'Invalid verification code.' }
    }

    if (new Date() > tokenRecord.expires) {
      return { success: false, error: 'Verification code has expired. Please request a new one.' }
    }

    await db.$transaction(async (tx) => {
      await tx.verificationToken.deleteMany({
        where: { identifier: emailNormalized, token: codeNormalized }
      })

      const existingUser = await tx.user.findUnique({ where: { email: emailNormalized } })
      if (existingUser) {
        throw new Error('An account with this email already exists.')
      }

      const hashedPassword = await bcrypt.hash(password, 12)

      const newUser = await tx.user.create({
        data: { name, email: emailNormalized, hashedPassword }
      })

      await checkAndApplySignupPromo(tx, newUser.id)
    })

    try {
      await signIn('credentials', { email: emailNormalized, password, redirectTo: '/dashboard' })
    } catch (err) {
      if (err instanceof AuthError) {
        return { success: false, error: 'Account created. Please sign in.' }
      }
      throw err
    }

    return { success: true }
  } catch (err: any) {
    if (err instanceof Error && (err.message === 'NEXT_REDIRECT' || err.message?.includes('NEXT_REDIRECT') || (err as any).digest?.startsWith('NEXT_REDIRECT'))) {
      throw err
    }
    console.error('Error in signUpWithOtpAction:', err)
    return { success: false, error: err.message || 'Error occurred during registration.' }
  }
}

async function checkAndApplySignupPromo(tx: any, userId: string) {
  try {
    const settings = await tx.systemSetting.findMany({
      where: {
        key: {
          in: [
            'promo_signup_active',
            'promo_signup_start',
            'promo_signup_end',
            'promo_signup_limit',
            'promo_signup_amount',
            'promo_signup_count'
          ]
        }
      }
    })

    const getVal = (key: string, def: string) => {
      const match = settings.find((s: any) => s.key === key)
      return match ? match.value : def
    }

    const active = getVal('promo_signup_active', 'false') === 'true'
    if (!active) return

    const startStr = getVal('promo_signup_start', '')
    const endStr = getVal('promo_signup_end', '')
    const now = new Date()

    if (startStr) {
      const startDate = new Date(startStr)
      if (now < startDate) return
    }
    if (endStr) {
      const endDate = new Date(endStr)
      if (now > endDate) return
    }

    const limit = parseInt(getVal('promo_signup_limit', '20'))
    const count = parseInt(getVal('promo_signup_count', '0'))
    if (count >= limit) return

    const amount = parseFloat(getVal('promo_signup_amount', '100.00'))

    // Apply promo settings
    await tx.systemSetting.upsert({
      where: { key: 'promo_signup_count' },
      update: { value: (count + 1).toString() },
      create: { key: 'promo_signup_count', value: (count + 1).toString() }
    })

    await tx.user.update({
      where: { id: userId },
      data: {
        credits: { increment: amount }
      }
    })

    await tx.transaction.create({
      data: {
        userId,
        amount,
        type: 'TOPUP',
        reference: `Auto Sign-up Promo Credit (${count + 1}/${limit})`
      }
    })

    const topUpPointsRatio = 10
    const pointsAwarded = Math.floor(amount / topUpPointsRatio)
    if (pointsAwarded > 0) {
      await tx.user.update({
        where: { id: userId },
        data: {
          yardPoints: { increment: pointsAwarded },
          lifetimeYardPoints: { increment: pointsAwarded }
        }
      })

      await tx.yardPointLog.create({
        data: {
          userId,
          amount: pointsAwarded,
          reason: 'TOPUP',
          details: `Earned from Auto Sign-up Promo Credit of ₱${amount.toFixed(2)}`
        }
      })
    }
  } catch (error) {
    console.error('Error applying signup promo:', error)
  }
}

export async function changePasswordAction(
  formData: FormData
): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.email) {
    return { success: false, error: 'Unauthorized.' }
  }

  const currentPassword = formData.get('currentPassword') as string
  const newPassword = formData.get('newPassword') as string
  const confirmNewPassword = formData.get('confirmNewPassword') as string

  if (!currentPassword || !newPassword || !confirmNewPassword) {
    return { success: false, error: 'All fields are required.' }
  }

  if (newPassword !== confirmNewPassword) {
    return { success: false, error: 'New passwords do not match.' }
  }

  if (newPassword.length < 8) {
    return { success: false, error: 'New password must be at least 8 characters long.' }
  }
  if (!/[A-Z]/.test(newPassword)) {
    return { success: false, error: 'New password must contain at least one uppercase letter.' }
  }
  if (!/[0-9]/.test(newPassword)) {
    return { success: false, error: 'New password must contain at least one number.' }
  }

  try {
    const user = await db.user.findUnique({
      where: { email: session.user.email }
    })
    if (!user || !user.hashedPassword) {
      return { success: false, error: 'User not found.' }
    }

    const currentMatch = await bcrypt.compare(currentPassword, user.hashedPassword)
    if (!currentMatch) {
      return { success: false, error: 'Incorrect current password.' }
    }

    const hashed = await bcrypt.hash(newPassword, 12)
    await db.user.update({
      where: { id: user.id },
      data: { hashedPassword: hashed }
    })

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update password.' }
  }
}

export async function sendPasswordResetAction(email: string): Promise<ActionResult> {
  if (!email || !email.includes('@')) {
    return { success: false, error: 'Invalid email address' }
  }

  const emailNormalized = email.toLowerCase().trim()

  try {
    const user = await db.user.findUnique({ where: { email: emailNormalized } })
    if (!user) {
      return { success: true }
    }

    const { randomBytes } = await import('crypto')
    const token = randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 1 * 60 * 60 * 1000)

    await db.verificationToken.deleteMany({
      where: { identifier: emailNormalized }
    })

    await db.verificationToken.create({
      data: {
        identifier: emailNormalized,
        token,
        expires
      }
    })

    const origin = getPublicAppUrl()
    const resetLink = `${origin}/reset-password?token=${token}`

    const htmlContent = `
      <div style="font-family: sans-serif; padding: 24px; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="${origin}/south-rally-logo.png" alt="South Rally crest" style="width: 72px; height: 72px; border-radius: 50%; object-fit: contain; background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 4px;" />
        </div>
        <h2 style="color: #007C80; margin-top: 0; margin-bottom: 16px; font-size: 20px; font-weight: 700; text-align: center;">Reset your password</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.5; margin-bottom: 20px; text-align: center;">You requested a password reset for your South Rally account. Please click the button below to choose a new password:</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${resetLink}" style="background-color: #007C80; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 4px 6px rgba(0, 124, 128, 0.25);">
            Reset Password
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 12px; line-height: 1.4; margin-top: 24px; margin-bottom: 0; text-align: center;">If you did not request a password reset, you can safely ignore this email. This link will expire in 1 hour.</p>
      </div>
    `

    if (process.env.RESEND_API_KEY) {
      await sendEmailViaResend(emailNormalized, 'Reset your South Rally password', htmlContent)
      console.log(`[RESEND] Password reset link sent to ${emailNormalized}`)
    } else {
      console.warn('RESEND_API_KEY missing. Password reset link could not be sent.')
      return { success: false, error: 'Email service is currently unavailable. Please contact support.' }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error in sendPasswordResetAction:', error)
    return { success: false, error: error.message || 'Failed to send password reset email.' }
  }
}

export async function resetPasswordWithTokenAction(
  token: string,
  formData: FormData
): Promise<ActionResult> {
  const newPassword = formData.get('newPassword') as string
  const confirmNewPassword = formData.get('confirmNewPassword') as string

  if (!token) {
    return { success: false, error: 'Token is required.' }
  }

  if (!newPassword || !confirmNewPassword) {
    return { success: false, error: 'Please fill in all fields.' }
  }

  if (newPassword !== confirmNewPassword) {
    return { success: false, error: 'Passwords do not match.' }
  }

  if (newPassword.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters long.' }
  }
  if (!/[A-Z]/.test(newPassword)) {
    return { success: false, error: 'Password must contain at least one uppercase letter.' }
  }
  if (!/[0-9]/.test(newPassword)) {
    return { success: false, error: 'Password must contain at least one number.' }
  }

  try {
    const tokenRecord = await db.verificationToken.findUnique({
      where: { token }
    })

    if (!tokenRecord) {
      return { success: false, error: 'Invalid or expired reset link.' }
    }

    if (new Date() > tokenRecord.expires) {
      await db.verificationToken.delete({ where: { token } })
      return { success: false, error: 'Reset link has expired.' }
    }

    const email = tokenRecord.identifier
    const user = await db.user.findUnique({ where: { email } })
    if (!user) {
      return { success: false, error: 'User account not found.' }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12)

    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { hashedPassword }
      })
      await tx.verificationToken.delete({ where: { token } })
    })

    return { success: true }
  } catch (error: any) {
    console.error('Error in resetPasswordWithTokenAction:', error)
    return { success: false, error: error.message || 'Failed to reset password.' }
  }
}
