'use client'

import { useState, useTransition, useEffect, Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, Check, Eye, EyeOff, ArrowRight, Info, User, Mail, Lock, Calendar, Users, Layers, Trophy, Heart, Zap, RefreshCw } from 'lucide-react'
import { SignInModal } from '@/components/auth/signin-modal'
import { signIn } from 'next-auth/react'

// Inner component uses useSearchParams — must be wrapped in Suspense by the parent
function SignUpPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Detect Google OAuth redirect hints
  const oauthEmail = searchParams.get('email') || ''
  const oauthReason = searchParams.get('reason') || ''

  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (data && Object.keys(data).length > 0 && data.user) {
          router.push('/dashboard')
        }
      })
      .catch(err => console.error(err))
  }, [router])

  const [name, setName] = useState('')
  const [email, setEmail] = useState(oauthEmail) // pre-fill if redirected from Google OAuth
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isSignInOpen, setIsSignInOpen] = useState(false)
  const [otpStep, setOtpStep] = useState(false)
  const [otpCode, setOtpCode] = useState('')

  const rules = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
  }

  const allRulesMet = rules.length && rules.uppercase && rules.number

  const handleRequestOtp = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!allRulesMet) {
      setError('Please fulfill all password requirements')
      return
    }

    startTransition(async () => {
      const { sendOtpAction } = await import('@/lib/actions/auth')
      const result = await sendOtpAction(email)
      if (result.success) {
        setOtpStep(true)
      } else {
        setError(result.error)
      }
    })
  }

  const handleVerifyAndSignUp = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (otpCode.length !== 6) {
      setError('Please enter a valid 6-digit code')
      return
    }

    startTransition(async () => {
      const { signUpWithOtpAction } = await import('@/lib/actions/auth')
      const formData = new FormData()
      formData.append('name', name)
      formData.append('email', email)
      formData.append('password', password)

      const result = await signUpWithOtpAction(formData, otpCode)
      if (result.success) {
        router.push('/dashboard')
        router.refresh()
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <div className="signup-root">
      {/* Left branding panel */}
      <div className="signup-left animate-fade-in">
        <div className="signup-left-inner">
          {/* Logo & Premium pill */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <Link href="/" className="signup-logo-link" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'white', padding: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(0,0,0,0.18)' }}>
                <Image src="/south-rally-logo.png" alt="South Rally logo" width={54} height={56} unoptimized style={{ objectFit: 'contain', borderRadius: '50%' }} />
              </div>
              <span className="signup-logo-text" style={{ fontSize: '20px', fontWeight: 800, color: 'white', letterSpacing: '0.06em' }}>South Rally</span>
            </Link>
            
            <div className="signup-badge">
              ★ PREMIUM PICKLEBALL CLUB
            </div>
          </div>

          {/* Main copy */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', margin: '48px 0 32px' }}>
            <h1 className="signup-left-title">
              Join the rally.<br />
              <span className="signup-left-title-accent">Belong here.</span>
            </h1>
            <p className="signup-left-desc">
              Your all-in-one platform for court bookings, open play, and the ultimate pickleball experience.
            </p>
          </div>

          {/* Feature Grid */}
          <div className="signup-feature-grid">
            {[
              {
                title: 'Real-time Court Scheduler',
                desc: 'Courts 1–14 at your fingertips',
                icon: <Calendar size={18} color="hsl(69 35% 52%)" />
              },
              {
                title: 'Live Check-in',
                desc: 'QR scan at the lobby',
                icon: <Users size={18} color="hsl(69 35% 52%)" />
              },
              {
                title: 'Paddle Stack',
                desc: 'Collaborative queue boards',
                icon: <Layers size={18} color="hsl(69 35% 52%)" />
              },
              {
                title: 'Rewards System',
                desc: 'Play more. Earn more.',
                icon: <Trophy size={18} color="hsl(69 35% 52%)" />
              }
            ].map((item, idx) => (
              <div key={idx} className="signup-feature-card">
                <div className="signup-feature-icon-wrapper">
                  {item.icon}
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'white' }}>{item.title}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginTop: '4px', lineHeight: '1.4' }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom stats bar */}
          <div className="signup-left-bottom-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={16} color="hsl(69 35% 52%)" />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'white' }}>Faster</span>
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>Game Time</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={16} color="hsl(69 35% 52%)" />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'white' }}>Bigger</span>
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>Community</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Heart size={16} color="hsl(69 35% 52%)" />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'white' }}>Healthier</span>
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>Lifestyle</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="signup-right">
        <div className="signup-form-wrap">
          {/* Mobile-only logo */}
          <Link href="/" className="signup-logo-link signup-logo-mobile" style={{ alignSelf: 'center', marginBottom: '8px' }}>
            <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'white', padding: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--color-border)' }}>
                <Image src="/south-rally-logo.png" alt="South Rally logo" width={58} height={60} unoptimized style={{ objectFit: 'contain', borderRadius: '50%' }} />
            </div>
            <span className="signup-logo-text" style={{ color: 'var(--color-text-primary)', fontSize: '20px', fontWeight: 800 }}>South Rally</span>
          </Link>

          {/* Centered logo for desktop */}
          <div className="signup-logo-desktop-center">
            <div style={{ width: 108, height: 108, borderRadius: '50%', background: 'white', border: '1px solid var(--color-border)', padding: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(3, 48, 38, 0.15)', marginBottom: '8px' }}>
              <Image src="/south-rally-logo.png" alt="South Rally logo" width={94} height={98} priority unoptimized style={{ objectFit: 'contain', borderRadius: '50%' }} />
            </div>
            <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-primary)', fontFamily: 'Georgia, serif', letterSpacing: '0.08em', textTransform: 'uppercase' }}>South Rally</span>
          </div>

          {/* Heading */}
          <div className="signup-form-header">
            <h2 className="signup-form-title">{otpStep ? 'Verify your email' : 'Create your account'}</h2>
            <p className="signup-form-subtitle">{otpStep ? 'Verification code sent to Gmail.' : 'Book your court and start playing in seconds.'}</p>
          </div>

          {/* Social auth */}
          <div className="signup-social-row">
            <button
              type="button"
              disabled={isGoogleLoading || isPending}
              onClick={() => {
                setIsGoogleLoading(true)
                signIn('google', { callbackUrl: '/dashboard?google_signup=1' })
              }}
              className="signup-social-btn"
              style={{ opacity: isGoogleLoading ? 0.7 : 1, cursor: isGoogleLoading ? 'not-allowed' : 'pointer' }}
            >
              {isGoogleLoading ? (
                <RefreshCw size={14} className="animate-spin" />
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
          </div>

          {/* Divider */}
          <div className="signup-divider">
            <div className="signup-divider-line" />
            <span className="signup-divider-text">or</span>
            <div className="signup-divider-line" />
          </div>

          {/* OAuth hint banners */}
          {oauthReason === 'not_registered' && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: '10px',
              background: 'rgba(59,130,246,0.08)',
              border: '1px solid rgba(59,130,246,0.25)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
              fontSize: '13px',
              color: '#3b82f6',
              fontWeight: 500,
              marginBottom: '4px'
            }}>
              <Info size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>
                <strong>{oauthEmail}</strong> is not registered yet.
                {' '}Sign up below or use a different Google account.
              </span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="signup-error animate-fade-in">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          {otpStep ? (
            <form onSubmit={handleVerifyAndSignUp} className="signup-form">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.4 }}>
                  We sent a 6-digit verification code to <strong>{email}</strong>. Please enter the code below to complete signup.
                </p>
                <div style={{ fontSize: '12px', background: 'rgba(245,158,11,0.08)', color: '#d97706', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(245,158,11,0.25)', marginTop: '6px', fontWeight: 500 }}>
                  ✉️ <strong>Important:</strong> If you don&apos;t see the email, please check your <strong>SPAM</strong> or <strong>Promotions</strong> folder!
                </div>
              </div>

              <div className="signup-field">
                <label className="signup-label">Verification Code</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="123456"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="signup-input"
                  style={{ textAlign: 'center', fontSize: '18px', fontWeight: 800, letterSpacing: '4px' }}
                />
              </div>

              <button
                type="submit"
                disabled={isPending || otpCode.length !== 6}
                className={`signup-submit-btn ${otpCode.length === 6 && !isPending ? 'signup-submit-btn-active' : ''}`}
                style={{
                  width: '100%',
                  height: '42px',
                  background: 'var(--color-primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: (isPending || otpCode.length !== 6) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: 'var(--shadow-primary-btn)',
                  transition: 'background var(--duration-fast), opacity var(--duration-fast)',
                  marginTop: '12px',
                  opacity: (otpCode.length === 6 && !isPending) ? 1 : 0.6
                }}
              >
                {isPending ? <span>Verifying...</span> : <span>Verify & Complete Sign Up</span>}
              </button>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', fontSize: '12px' }}>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    setOtpStep(false)
                    setOtpCode('')
                    setError(null)
                  }}
                  style={{ background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', fontWeight: 600 }}
                >
                  ← Go Back
                </button>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    startTransition(async () => {
                      const { sendOtpAction } = await import('@/lib/actions/auth')
                      const result = await sendOtpAction(email)
                      if (result.success) {
                        setError('A new verification code has been generated and sent.')
                      } else {
                        setError(result.error)
                      }
                    })
                  }}
                  style={{ background: 'transparent', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 700 }}
                >
                  Resend Code
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRequestOtp} className="signup-form">
              <div className="signup-field">
                <label className="signup-label">Full name</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} className="signup-field-icon" />
                  <input
                    type="text"
                    required
                    placeholder="Arjay Escabas"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="signup-input signup-input-with-icon"
                  />
                </div>
              </div>

              <div className="signup-field">
                <label className="signup-label">Email address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} className="signup-field-icon" />
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="signup-input signup-input-with-icon"
                  />
                </div>
              </div>

              <div className="signup-field">
                <label className="signup-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} className="signup-field-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="signup-input signup-input-with-icon"
                    style={{ paddingRight: 44 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="signup-eye-btn"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>

                {/* Password strength indicators */}
                {password.length > 0 && (
                  <div className="signup-rules">
                    {[
                      { ok: rules.length, label: '8+ characters' },
                      { ok: rules.uppercase, label: 'Uppercase letter' },
                      { ok: rules.number, label: 'Number' },
                    ].map(({ ok, label }) => (
                      <div key={label} className={`signup-rule ${ok ? 'signup-rule-ok' : ''}`}>
                        <Check size={11} strokeWidth={ok ? 3 : 2} />
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="signup-submit-btn"
                style={{
                  width: '100%',
                  height: '42px',
                  background: 'var(--color-primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: isPending ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: 'var(--shadow-primary-btn)',
                  transition: 'background var(--duration-fast), opacity var(--duration-fast)',
                  marginTop: '8px',
                  opacity: (allRulesMet && !isPending) ? 1 : 0.85
                }}
              >
                {isPending ? (
                  <span>Creating account…</span>
                ) : (
                  <>
                    <span>Create account</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Footer */}
          <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '8px' }}>
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => setIsSignInOpen(true)}
              style={{ background: 'transparent', border: 'none', color: 'var(--color-primary)', fontWeight: 800, cursor: 'pointer', padding: 0, fontSize: '13px', fontFamily: 'inherit' }}
            >
              Sign In
            </button>
          </div>

          <div style={{ fontSize: '11px', color: 'var(--color-text-disabled)', textAlign: 'center', lineHeight: '1.5', marginTop: '16px' }}>
            By creating an account, you agree to our{' '}
            <a href="#" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 650 }}>Terms of Service</a>
            {' '}and{' '}
            <a href="#" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 650 }}>Privacy Policy</a>.
          </div>
        </div>
      </div>

      <SignInModal
        isOpen={isSignInOpen}
        onClose={() => setIsSignInOpen(false)}
      />

      <style>{`
        .signup-root {
          --color-primary: hsl(158 67% 12%);
          --color-primary-hover: hsl(158 67% 17%);
          --color-border-focus: hsl(158 67% 12%);
          --color-focus-ring: hsl(158 67% 12%);
          --shadow-focus: 0 0 0 3px hsl(69 35% 43% / 0.24);
          --shadow-primary-btn: 0 8px 22px hsl(158 67% 12% / 0.22);
          min-height: 100vh;
          display: flex;
          background: hsl(43 42% 94%);
        }

        /* ── Left panel ── */
        .signup-left {
          position: relative;
          width: 50%;
          background:
            radial-gradient(circle at 92% 18%, hsl(267 45% 23% / 0.9), transparent 38%),
            repeating-linear-gradient(104deg, transparent 0 230px, hsl(69 35% 43% / 0.18) 231px 233px, transparent 234px 460px),
            hsl(158 67% 12%);
          background-size: cover;
          background-position: center;
          display: flex;
          align-items: stretch;
          overflow: hidden;
          flex-shrink: 0;
        }

        .signup-left-inner {
          position: relative;
          z-index: 5;
          padding: 48px 52px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          width: 100%;
        }

        .signup-logo-link {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
        }
        .signup-logo-text {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 18px;
          font-weight: 500;
          color: white;
          letter-spacing: -0.02em;
        }

        /* Left copy */
        .signup-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.2);
          padding: 5px 12px;
          border-radius: var(--radius-full);
          color: white;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .signup-left-title {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 52px;
          font-weight: 500;
          color: white;
          line-height: 1.05;
          letter-spacing: -0.03em;
          margin: 0;
        }
        .signup-left-title-accent {
          color: hsl(43 42% 94%);
          border-bottom: 3.5px solid hsl(69 35% 43%);
          padding-bottom: 2px;
        }

        .signup-left-desc {
          font-size: 15px;
          color: rgba(255, 255, 255, 0.75);
          line-height: 1.6;
          margin: 0;
          max-width: 420px;
        }

        /* Feature Cards Grid */
        .signup-feature-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin: 24px 0 48px;
          width: 100%;
        }
        .signup-feature-card {
          display: flex;
          gap: 12px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 16px;
          borderRadius: 12px;
          backdrop-filter: blur(8px);
          transition: transform var(--duration-fast);
        }
        .signup-feature-icon-wrapper {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .signup-left-bottom-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid rgba(255, 255, 255, 0.15);
          padding-top: 24px;
          width: 100%;
          gap: 12px;
        }

        /* ── Right panel ── */
        .signup-right {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 40px;
          overflow-y: auto;
          background: hsl(43 42% 96%);
        }

        .signup-logo-desktop-center {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .signup-form-wrap {
          width: 100%;
          max-width: 380px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        /* Mobile-only logo */
        .signup-logo-mobile {
          display: none;
        }

        /* Form header */
        .signup-form-header {
          display: flex;
          flex-direction: column;
          gap: 6px;
          text-align: center;
        }
        .signup-form-title {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 24px;
          font-weight: 500;
          color: var(--color-text-primary);
          letter-spacing: -0.02em;
          margin: 0;
        }
        .signup-form-subtitle {
          font-size: 13px;
          color: var(--color-text-secondary);
          margin: 0;
        }

        /* Social buttons */
        .signup-social-row {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .signup-social-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          width: 100%;
          height: 42px;
          background: white;
          border: 1.5px solid var(--color-border);
          border-radius: var(--radius-md);
          font-size: 13px;
          fontWeight: 700;
          color: var(--color-text-primary);
          cursor: pointer;
          transition: background var(--duration-fast), border-color var(--duration-fast);
          font-family: inherit;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .signup-social-btn:hover {
          background: var(--color-surface);
          border-color: var(--color-border-hover);
        }

        /* Divider */
        .signup-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 4px 0;
        }
        .signup-divider-line {
          flex: 1;
          height: 1px;
          background: var(--color-border);
        }
        .signup-divider-text {
          font-size: 10px;
          color: var(--color-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          flex-shrink: 0;
        }

        /* Error */
        .signup-error {
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

        /* Form */
        .signup-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .signup-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .signup-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--color-text-primary);
        }
        .signup-field-icon {
          position: absolute;
          left: 14px;
          top: 13px;
          color: var(--color-text-disabled);
          pointer-events: none;
        }
        .signup-input {
          width: 100%;
          height: 42px;
          padding: 0 14px;
          background: var(--color-card);
          border: 1.5px solid var(--color-border);
          border-radius: var(--radius-md);
          font-size: 14px;
          font-family: inherit;
          color: var(--color-text-primary);
          transition: border-color var(--duration-fast), box-shadow var(--duration-fast);
          outline: none;
        }
        .signup-input-with-icon {
          padding-left: 42px;
        }
        .signup-input::placeholder {
          color: var(--color-text-disabled);
        }
        .signup-input:focus {
          border-color: var(--color-primary);
          box-shadow: var(--shadow-focus);
        }

        /* Password eye toggle */
        .signup-eye-btn {
          position: absolute;
          right: 14px;
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
        .signup-eye-btn:hover {
          color: var(--color-text-primary);
        }

        /* Password rules */
        .signup-rules {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 6px;
        }
        .signup-rule {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          color: var(--color-text-disabled);
          transition: color var(--duration-fast);
        }
        .signup-rule-ok {
          color: var(--color-success);
        }

        /* Submit button */
        .signup-submit-btn:hover:not(:disabled) {
          filter: brightness(1.05);
        }
        .signup-submit-btn:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        /* ── Responsive ── */
        @media (max-width: 960px) {
          .signup-root {
            flex-direction: column;
          }
          .signup-left {
            display: none;
          }
          .signup-logo-desktop-center {
            display: none;
          }
          .signup-logo-mobile {
            display: flex;
          }
          .signup-right {
            padding: 40px 24px;
            align-items: flex-start;
          }
          .signup-form-wrap {
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  )
}

// Outer wrapper: Suspense is required because SignUpPageInner uses useSearchParams
export default function SignUpPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--color-bg)' }} />}>
      <SignUpPageInner />
    </Suspense>
  )
}
