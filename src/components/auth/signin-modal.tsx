'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { X, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { signInAction, sendPasswordResetAction } from '@/lib/actions/auth'
import { signIn } from 'next-auth/react'

interface SignInModalProps {
  isOpen: boolean
  onClose: () => void
  onSwitchToSignUp?: () => void
  initialError?: string | null
}

export function SignInModal({ isOpen, onClose, onSwitchToSignUp, initialError }: SignInModalProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(initialError ?? null)
  const [isPending, startTransition] = useTransition()
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [otpStep, setOtpStep] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [forgotStep, setForgotStep] = useState(false)
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null)
  const router = useRouter()

  const handleClose = () => {
    setOtpStep(false)
    setOtpCode('')
    setForgotStep(false)
    setForgotSuccess(null)
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }

    if (otpStep && !otpCode) {
      setError('Please enter the verification code')
      return
    }

    startTransition(async () => {
      const formData = new FormData()
      formData.append('email', email)
      formData.append('password', password)
      if (otpStep) {
        formData.append('otp', otpCode)
      }

      const result = await signInAction(formData)
      if (result && !result.success) {
        if (result.error === 'OTP_REQUIRED') {
          setOtpStep(true)
          setError(null)
        } else {
          setError(result.error || 'Login failed')
        }
      } else {
        handleClose()
        router.push('/dashboard')
        router.refresh()
      }
    })
  }

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setForgotSuccess(null)

    if (!email) {
      setError('Please enter your email address')
      return
    }

    startTransition(async () => {
      const res = await sendPasswordResetAction(email)
      if (res.success) {
        setForgotSuccess('A password reset link has been sent to your email address!')
      } else {
        setError(res.error || 'Failed to send password reset email.')
      }
    })
  }

  return (
    <div
      className="signin-backdrop animate-fade-in"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="Sign in"
    >
      <div
        className="signin-panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button onClick={handleClose} className="signin-close" aria-label="Close">
          <X size={16} />
        </button>

        {/* Header */}
        <div className="signin-header">
          <div className="signin-logo-mark" style={{ background: 'white', border: '1px solid hsl(63 24% 55% / 0.4)', width: 128, height: 128, borderRadius: '50%', boxShadow: '0 8px 24px hsl(158 67% 12% / 0.14)' }}>
            <Image src="/south-rally-logo.png" alt="South Rally logo" width={112} height={116} priority unoptimized style={{ objectFit: 'contain', borderRadius: '50%' }} />
          </div>
          <strong className="signin-brand">South Rally</strong>
          <h2 className="signin-title">{forgotStep ? 'Reset Password' : 'Welcome back'}</h2>
          <p className="signin-subtitle">
            {forgotStep ? 'Enter your email to receive a password reset link' : 'Sign in to check court stacks & book'}
          </p>
        </div>

        {forgotStep ? (
          forgotSuccess ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '16px' }}>
              <div style={{
                padding: '12px 16px',
                borderRadius: '10px',
                background: '#ecfdf5',
                color: '#047857',
                border: '1px solid #a7f3d0',
                fontWeight: 650,
                fontSize: '13.5px',
                textAlign: 'center',
                lineHeight: 1.5
              }}>
                {forgotSuccess}
              </div>
              <button
                type="button"
                onClick={() => { setForgotStep(false); setForgotSuccess(null); }}
                className="signin-submit-btn"
                style={{ width: '100%' }}
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleForgotSubmit} className="signin-form" style={{ marginTop: '16px' }}>
              {error && (
                <div className="signin-error" style={{ marginBottom: '16px' }}>
                  <AlertCircle size={14} />
                  <span>{error}</span>
                </div>
              )}
              <div className="signin-field">
                <label className="signin-label">Email address</label>
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="signin-input"
                  autoComplete="email"
                  disabled={isPending}
                />
              </div>
              <button type="submit" disabled={isPending} className="signin-submit-btn" style={{ marginTop: '8px' }}>
                {isPending ? 'Sending Link...' : 'Send Reset Link'}
              </button>
              <button
                type="button"
                onClick={() => { setForgotStep(false); setError(null); }}
                className="signin-submit-btn"
                style={{
                  marginTop: '10px',
                  background: 'transparent',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-secondary)',
                  boxShadow: 'none'
                }}
              >
                Cancel
              </button>
            </form>
          )
        ) : (
          <>
            {/* Google SSO */}
            <button
              type="button"
              disabled={isGoogleLoading || isPending}
              onClick={() => {
                setIsGoogleLoading(true)
                signIn('google', { callbackUrl: '/dashboard' })
              }}
              className="signin-google-btn"
              style={{ opacity: isGoogleLoading ? 0.7 : 1, cursor: isGoogleLoading ? 'not-allowed' : 'pointer' }}
            >
              {isGoogleLoading ? (
                <div className="spinner" />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              )}
              <span>{isGoogleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
            </button>

            {/* Divider */}
            <div className="signin-divider">
              <div className="signin-divider-line" />
              <span className="signin-divider-text">or</span>
              <div className="signin-divider-line" />
            </div>

            {/* Error */}
            {error && (
              <div className="signin-error">
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="signin-form">
              {!otpStep ? (
                <>
                  <div className="signin-field">
                    <label className="signin-label">Email address</label>
                    <input
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="signin-input"
                      autoComplete="email"
                      disabled={isPending}
                    />
                  </div>

                  <div className="signin-field">
                    <div className="signin-label-row">
                      <label className="signin-label">Password</label>
                      <button type="button" onClick={() => { setForgotStep(true); setError(null); setForgotSuccess(null); }} className="signin-forgot" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit', color: 'var(--color-primary)', fontWeight: 600 }}>Forgot password?</button>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="signin-input"
                        autoComplete="current-password"
                        style={{ paddingRight: 44 }}
                        disabled={isPending}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="signin-eye-btn"
                        tabIndex={-1}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="signin-field">
                  <div className="signin-label-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="signin-label">Verification Code</label>
                    <button
                      type="button"
                      onClick={() => { setOtpStep(false); setOtpCode(''); }}
                      style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '11px', fontWeight: 650, cursor: 'pointer', padding: 0 }}
                    >
                      Back to Password
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="Enter 6-digit code"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    className="signin-input"
                    style={{ textAlign: 'center', fontSize: '20px', letterSpacing: '4px', fontWeight: 'bold' }}
                    disabled={isPending}
                    autoComplete="one-time-code"
                  />
                  <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '8px', lineHeight: 1.4 }}>
                    We sent a 6-digit verification code to your email. Please enter it above to verify your Admin/Staff login.
                  </p>
                </div>
              )}

              <button type="submit" disabled={isPending} className="signin-submit-btn">
                {isPending ? (
                  <span>{otpStep ? 'Verifying...' : 'Signing in…'}</span>
                ) : (
                  <>
                    <span>{otpStep ? 'Verify & Sign in' : 'Sign in'}</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>
          </>
        )}

        {/* Footer */}
        <p className="signin-footer">
          Don&apos;t have an account?{' '}
          {onSwitchToSignUp ? (
            <button
              onClick={() => {
                handleClose()
                onSwitchToSignUp()
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-primary)',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 'inherit',
                padding: 0
              }}
            >
              Create one
            </button>
          ) : (
            <Link href="/signup" onClick={handleClose} className="signin-link">
              Create one
            </Link>
          )}
        </p>
      </div>

      <style>{`
        .signin-backdrop {
          position: fixed;
          inset: 0;
          background: linear-gradient(135deg, hsl(158 67% 8% / 0.84), hsl(263 45% 14% / 0.82));
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 600;
          padding: 20px;
        }

        .signin-panel {
          --color-primary: hsl(158 67% 12%);
          --color-primary-hover: hsl(158 67% 17%);
          --color-secondary: hsl(158 67% 12%);
          --shadow-focus: 0 0 0 3px hsl(69 35% 43% / 0.24);
          --shadow-primary-btn: 0 8px 22px hsl(158 67% 12% / 0.22);
          position: relative;
          width: 100%;
          max-width: 380px;
          background: hsl(43 42% 96%);
          border: 1px solid hsl(63 24% 55% / 0.48);
          border-radius: var(--radius-2xl);
          padding: 36px 32px 28px;
          box-shadow: var(--shadow-xl);
          display: flex;
          flex-direction: column;
          gap: 20px;
          animation: signin-slide-up 0.22s var(--ease-out);
        }

        @keyframes signin-slide-up {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        .signin-close {
          position: absolute;
          top: 14px;
          right: 14px;
          width: 28px;
          height: 28px;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          background: var(--color-surface);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--color-text-secondary);
          transition: background var(--duration-fast) var(--ease-out), color var(--duration-fast);
        }
        .signin-close:hover {
          background: var(--color-hover-bg);
          color: var(--color-text-primary);
        }

        .signin-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          text-align: center;
        }
        .signin-logo-mark {
          position: relative;
          width: 44px;
          height: 44px;
          border-radius: var(--radius-lg);
          background: var(--color-primary-subtle);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 4px;
          border: 1px solid var(--color-primary-muted);
        }
        .logo-dot {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 8px;
          height: 8px;
          border-radius: var(--radius-full);
          background: var(--color-accent);
        }
        .signin-title {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 22px;
          font-weight: 500;
          color: var(--color-text-primary);
          letter-spacing: -0.02em;
          margin: 0;
        }
        .signin-brand {
          margin-top: -8px;
          color: hsl(158 67% 12%);
          font: 500 13px Georgia, 'Times New Roman', serif;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .signin-subtitle {
          font-size: 13px;
          color: var(--color-text-secondary);
          margin: 0;
        }

        .signin-google-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          height: 42px;
          background: hsl(43 42% 98%);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          font-size: 13px;
          font-weight: 500;
          color: var(--color-text-primary);
          cursor: pointer;
          font-family: inherit;
          transition: background var(--duration-fast) var(--ease-out), border-color var(--duration-fast);
        }
        .signin-google-btn:hover {
          background: var(--color-surface);
          border-color: var(--color-border-hover);
        }

        .signin-divider {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .signin-divider-line {
          flex: 1;
          height: 1px;
          background: var(--color-border);
        }
        .signin-divider-text {
          font-size: 11px;
          color: var(--color-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .signin-error {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--color-danger-subtle);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: var(--radius-md);
          padding: 10px 12px;
          font-size: 12px;
          color: var(--color-danger);
          font-weight: 500;
        }

        .signin-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .signin-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .signin-label {
          font-size: 13px;
          font-weight: 500;
          color: var(--color-text-primary);
        }
        .signin-label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .signin-forgot {
          font-size: 12px;
          color: var(--color-secondary);
          text-decoration: none;
          font-weight: 500;
        }
        .signin-forgot:hover {
          text-decoration: underline;
        }

        .signin-input {
          width: 100%;
          height: 42px;
          padding: 0 14px;
          background: hsl(43 42% 98%);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          font-size: 14px;
          font-family: inherit;
          color: var(--color-text-primary);
          outline: none;
          transition: border-color var(--duration-fast), box-shadow var(--duration-fast);
        }
        .signin-input::placeholder {
          color: var(--color-text-disabled);
        }
        .signin-input:focus {
          border-color: var(--color-primary);
          box-shadow: var(--shadow-focus);
        }

        .signin-eye-btn {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: transparent;
          border: none;
          cursor: pointer;
          color: var(--color-text-secondary);
          padding: 0;
          display: flex;
          align-items: center;
          transition: color var(--duration-fast);
        }
        .signin-eye-btn:hover {
          color: var(--color-text-primary);
        }

        .signin-submit-btn {
          width: 100%;
          height: 44px;
          background: var(--color-primary);
          color: white;
          border: none;
          border-radius: var(--radius-lg);
          font-size: 14px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: var(--shadow-primary-btn);
          transition: background var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast);
          margin-top: 2px;
        }
        .signin-submit-btn:hover:not(:disabled) {
          background: var(--color-primary-hover);
        }
        .signin-submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .signin-footer {
          font-size: 13px;
          color: var(--color-text-secondary);
          text-align: center;
          margin: 0;
        }
        .signin-link {
          color: var(--color-primary);
          font-weight: 600;
          text-decoration: none;
        }
        .signin-link:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  )
}
