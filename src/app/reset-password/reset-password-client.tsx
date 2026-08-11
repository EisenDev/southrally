'use client'

import { useState, useTransition } from 'react'
import { resetPasswordWithTokenAction } from '@/lib/actions/auth'
import { ShieldCheck, ShieldAlert, KeyRound } from 'lucide-react'
import Link from 'next/link'

interface ResetPasswordClientProps {
  token: string
  isValid: boolean
}

export function ResetPasswordClient({ token, isValid }: ResetPasswordClientProps) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ success: boolean; text: string } | null>(null)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setMessage(null)
    const formData = new FormData(e.currentTarget)

    const newPass = formData.get('newPassword') as string
    const confirmPass = formData.get('confirmNewPassword') as string

    if (newPass !== confirmPass) {
      setMessage({ success: false, text: 'Passwords do not match.' })
      return
    }

    startTransition(async () => {
      const res = await resetPasswordWithTokenAction(token, formData)
      if (res.success) {
        setMessage({ success: true, text: 'Your password has been reset successfully! You can now sign in.' })
        const form = e.target as HTMLFormElement
        form.reset()
      } else {
        setMessage({ success: false, text: res.error })
      }
    })
  }

  const wrapperStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '24px',
    background: '#f8fafc',
    fontFamily: 'sans-serif'
  }

  const cardStyle: React.CSSProperties = {
    background: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: '40px 32px',
    maxWidth: '420px',
    width: '100%',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
    boxSizing: 'border-box'
  }

  const logoContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '28px'
  }

  const inputStyle: React.CSSProperties = {
    height: '42px',
    padding: '0 14px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    color: '#0f172a',
    fontSize: '14px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    transition: 'border-color 120ms'
  }

  const buttonStyle: React.CSSProperties = {
    height: '44px',
    width: '100%',
    padding: '0 24px',
    borderRadius: '10px',
    border: 'none',
    background: '#007C80',
    color: 'white',
    fontSize: '14px',
    fontWeight: 700,
    cursor: isPending ? 'not-allowed' : 'pointer',
    boxShadow: '0 4px 12px rgba(0, 124, 128, 0.15)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: isPending ? 0.7 : 1,
    transition: 'all 120ms',
    marginTop: '8px'
  }

  if (!isValid) {
    return (
      <div style={wrapperStyle}>
        <div style={cardStyle}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%', background: '#fee2e2',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'
          }}>
            <span style={{ fontSize: '28px' }}>⚠️</span>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 10px', textAlign: 'center' }}>Link Expired or Invalid</h2>
          <p style={{ fontSize: '14px', color: '#475569', margin: '0 0 24px', lineHeight: 1.6, textAlign: 'center' }}>
            This password reset link is invalid or has already expired. Reset links expire 1 hour after request.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Link href="/" style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: '42px',
              padding: '0 24px', background: '#007C80', color: 'white', borderRadius: '10px',
              fontSize: '14px', fontWeight: 700, textDecoration: 'none', transition: 'all 150ms'
            }}>
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={wrapperStyle}>
      <div style={cardStyle}>
        <div style={logoContainerStyle}>
          <img src="/south-rally-logo.png" alt="South Rally crest" style={{ width: '64px', height: '66px', borderRadius: '50%', objectFit: 'contain' }} />
          <h1 style={{ fontSize: '22px', fontWeight: 850, color: '#073f31', margin: '8px 0 0', letterSpacing: '0.04em' }}>South Rally</h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Create a new password for your account</p>
        </div>

        {message && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '10px',
            background: message.success ? '#ecfdf5' : '#fef2f2',
            color: message.success ? '#047857' : '#b91c1c',
            border: `1px solid ${message.success ? '#a7f3d0' : '#fecaca'}`,
            fontWeight: 600,
            fontSize: '13.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '20px'
          }}>
            {message.success ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
            <span style={{ flex: 1 }}>{message.text}</span>
          </div>
        )}

        {message?.success ? (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
            <Link href="/" style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: '42px',
              width: '100%', background: '#007C80', color: 'white', borderRadius: '10px',
              fontSize: '14px', fontWeight: 700, textDecoration: 'none', transition: 'all 150ms',
              textAlign: 'center'
            }}>
              Return to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                New Password
              </label>
              <input type="password" name="newPassword" required style={inputStyle} placeholder="Minimum 8 chars, 1 uppercase, 1 number" />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Confirm Password
              </label>
              <input type="password" name="confirmNewPassword" required style={inputStyle} placeholder="Confirm your new password" />
            </div>

            <button type="submit" disabled={isPending} style={buttonStyle}>
              {isPending ? 'Saving...' : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
