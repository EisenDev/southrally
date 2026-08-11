'use client'

import { useState } from 'react'
import { User, Award, QrCode, Camera, Mail, Phone, CreditCard, Shield, KeyRound } from 'lucide-react'
import { ChangePasswordForm } from '../settings/change-password-form'

interface Props {
  user: {
    id: string
    name: string | null
    email: string
    duprRating: number
    credits: number
    membership: string
    createdAt: Date
  }
}

type Tab = 'info' | 'membership' | 'clubid' | 'password'

const MEMBERSHIP_COLORS: Record<string, { color: string; bg: string; border: string; gradient: string; label: string }> = {
  STANDARD: {
    color: 'var(--color-text-secondary)',
    bg: 'var(--color-surface)',
    border: 'var(--color-border)',
    gradient: 'linear-gradient(135deg, #2e4344 0%, #172425 100%)',
    label: 'Standard Member'
  },
  PRO: {
    color: '#00bcd4',
    bg: 'rgba(0, 188, 212, 0.08)',
    border: 'rgba(0, 188, 212, 0.3)',
    gradient: 'linear-gradient(135deg, #007A7E 0%, #003F42 100%)',
    label: 'Pro Member'
  },
  VIP: {
    color: '#ffc107',
    bg: 'rgba(255, 193, 7, 0.08)',
    border: 'rgba(255, 193, 7, 0.3)',
    gradient: 'linear-gradient(135deg, #8C6D00 0%, #403200 100%)',
    label: 'VIP Elite Member'
  },
}

export function ProfileClient({ user }: Props) {
  const [tab, setTab] = useState<Tab>('info')

  const badge = MEMBERSHIP_COLORS[user.membership] || MEMBERSHIP_COLORS.STANDARD
  const initials = (user.name || user.email).split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const displayDupr = user.duprRating && user.duprRating > 0 ? user.duprRating : 3.0
  const skillLabel = displayDupr >= 6.0 ? 'Elite' : displayDupr >= 4.5 ? 'Advanced' : displayDupr >= 3.5 ? 'Intermediate' : 'Novice'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', width: '100%' }} className="animate-fade-up">
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
          My Account Profile
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
          Manage your personal details, membership tier, and digital club pass.
        </p>
      </div>

      {/* Tabs */}
      <div 
        style={{ 
          display: 'flex', 
          borderBottom: '1px solid var(--color-border)', 
          gap: '8px',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none'
        }} 
        className="profile-tabs-scroll"
      >
        {([
          { id: 'info', label: 'Profile Information', icon: User },
          { id: 'membership', label: 'Membership Benefits', icon: Award },
          { id: 'clubid', label: 'Digital Club ID', icon: QrCode },
          { id: 'password', label: 'Change Password', icon: KeyRound },
        ] as { id: Tab; label: string; icon: any }[]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '12px 18px', fontSize: '13px', fontWeight: 700,
              border: 'none', background: 'transparent', cursor: 'pointer',
              color: tab === t.id ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              borderBottom: tab === t.id ? '2.5px solid var(--color-primary)' : '2.5px solid transparent',
              transition: 'all var(--duration-fast)',
              display: 'flex', alignItems: 'center', gap: '8px',
              flexShrink: 0,
              fontFamily: 'inherit'
            }}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Profile Information */}
      {tab === 'info' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '32px' }} className="profile-grid">
          {/* Left Column: Avatar Display */}
          <div style={{
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            padding: '32px 24px',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            height: 'fit-content'
          }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                width: '100px', height: '100px', borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--color-primary), #005F63)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '32px', fontWeight: 900, color: 'white',
                border: '3px solid var(--color-border)',
                boxShadow: 'var(--shadow-md)'
              }}>
                {initials}
              </div>
              <button style={{
                position: 'absolute', bottom: '2px', right: '2px',
                width: '30px', height: '30px', borderRadius: '50%',
                background: 'var(--color-primary)', border: '2.5px solid var(--color-card)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', boxShadow: 'var(--shadow-sm)'
              }}>
                <Camera size={13} color="white" />
              </button>
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-text-primary)', margin: '16px 0 4px', textAlign: 'center' }}>
              {user.name || 'Club Member'}
            </h3>
            <span style={{
              fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: 'var(--radius-full)',
              background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`,
              textTransform: 'uppercase', letterSpacing: '0.05em'
            }}>
              {badge.label}
            </span>

            <div style={{ width: '100%', height: '1px', background: 'var(--color-border-subtle)', margin: '24px 0' }} />

            {/* Balances */}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                <span style={{ color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CreditCard size={14} /> Available Balance
                </span>
                <strong style={{ color: 'var(--color-text-primary)', fontSize: '14px' }}>₱{user.credits.toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                <span style={{ color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Shield size={14} /> DUPR Rating
                </span>
                <strong style={{ color: 'var(--color-primary)', fontSize: '14px' }}>{displayDupr.toFixed(2)} ({skillLabel})</strong>
              </div>
            </div>
          </div>

          {/* Right Column: Information form fields */}
          <div style={{
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            padding: '32px',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
              Account Information
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }} className="profile-fields-grid">
              {[
                { label: 'First Name', value: user.name?.split(' ')[0] || '', icon: User },
                { label: 'Last Name', value: user.name?.split(' ').slice(1).join(' ') || '', icon: User },
                { label: 'Email Address', value: user.email, icon: Mail },
                { label: 'Phone Number', value: '', icon: Phone },
                { label: 'DUPR ID (optional)', value: '', placeholder: 'Add your DUPR player ID', fullWidth: true, icon: Award },
              ].map(field => (
                <div key={field.label} style={{ gridColumn: field.fullWidth ? '1 / -1' : undefined, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>
                    {field.label}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-disabled)' }}>
                      <field.icon size={15} />
                    </div>
                    <input
                      type="text"
                      defaultValue={field.value}
                      placeholder={field.placeholder}
                      style={{
                        width: '100%', height: '42px', padding: '0 12px 0 38px',
                        borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
                        background: 'var(--color-surface)', color: 'var(--color-text-primary)',
                        fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                        transition: 'border-color var(--duration-fast)'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              padding: '14px 16px', background: 'var(--color-surface)',
              border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)',
              fontSize: '12.5px', color: 'var(--color-text-secondary)', lineHeight: 1.5
            }}>
              ℹ️ <strong>Account details lock notice:</strong> To modify your registered name, email address, or verified phone number records, please coordinate with front desk staff or club administrators.
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Membership Benefits */}
      {tab === 'membership' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '32px' }} className="profile-grid">
          {/* Active Tier */}
          <div style={{
            background: badge.gradient,
            borderRadius: 'var(--radius-xl)', padding: '32px', color: 'white',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            boxShadow: 'var(--shadow-md)', minHeight: '240px'
          }}>
            <div>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>ACTIVE TIER</span>
              <h2 style={{ fontSize: '32px', fontWeight: 900, marginTop: '8px', margin: '8px 0 0', letterSpacing: '-0.02em' }}>{badge.label}</h2>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', marginTop: '8px' }}>
                Member since {new Date(user.createdAt).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '16px', marginTop: '24px' }}>
              <div>
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>Verified Rating</span>
                <div style={{ fontSize: '20px', fontWeight: 850 }}>{displayDupr.toFixed(2)} DUPR</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>Skill Assignment</span>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-accent)' }}>{skillLabel}</div>
              </div>
            </div>
          </div>

          {/* Benefits Grid */}
          <div style={{
            background: 'var(--color-card)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)', padding: '28px', boxShadow: 'var(--shadow-sm)',
            display: 'flex', flexDirection: 'column', gap: '20px'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
              Membership Tier Perks
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { label: 'Priority court bookings (Advanced scheduling window)', included: user.membership !== 'STANDARD' },
                { label: 'Discounted hourly session rates (Up to 15% off)', included: user.membership === 'VIP' },
                { label: 'Lobby Open Play matches access', included: true },
                { label: 'Lobby Paddle Stack board matches queueing', included: true },
                { label: 'Club tournament & events early registration priority', included: user.membership !== 'STANDARD' },
                { label: 'Monthly credits bonus & exclusive community events', included: user.membership === 'VIP' },
              ].map((b, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px 0', borderBottom: '1px solid var(--color-border-subtle)' }}>
                  <span style={{ fontSize: '13px', marginTop: '2px' }}>{b.included ? '🟢' : '⚪'}</span>
                  <span style={{
                    fontSize: '13px',
                    color: b.included ? 'var(--color-text-primary)' : 'var(--color-text-disabled)',
                    fontWeight: b.included ? 650 : 400
                  }}>
                    {b.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Digital Club ID Card */}
      {tab === 'clubid' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }} className="profile-grid">
          {/* Card Showcase */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              background: 'linear-gradient(135deg, var(--color-primary), #003F42)',
              borderRadius: 'var(--radius-xl)', padding: '28px',
              color: 'white', boxShadow: 'var(--shadow-md)',
              position: 'relative', overflow: 'hidden',
              minHeight: '200px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
            }}>
              {/* Subtle background overlay */}
              <div style={{ position: 'absolute', right: '-40px', bottom: '-40px', width: '180px', height: '180px', borderRadius: '50%', background: 'rgba(255,255,255,0.02)', pointerEvents: 'none' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <img src="/south-rally-logo.png" alt="South Rally crest" style={{ width: 28, height: 30, objectFit: 'contain' }} />
                  <span style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.04em' }}>South Rally Club</span>
                </div>
                <span style={{
                  fontSize: '9px', fontWeight: 850, padding: '2px 8px',
                  background: badge.bg, border: `1px solid ${badge.border}`,
                  borderRadius: 'var(--radius-full)', color: badge.color,
                  letterSpacing: '0.05em'
                }}>
                  {user.membership} MEMBER
                </span>
              </div>

              <div style={{ marginTop: '24px' }}>
                <h2 style={{ fontSize: '22px', fontWeight: 900, margin: 0, letterSpacing: '-0.01em' }}>{user.name || 'Member'}</h2>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginTop: '4px', fontFamily: 'monospace' }}>
                  ID: {user.id.toUpperCase()}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px', marginTop: '16px' }}>
                <div>
                  <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)' }}>DUPR RATING</span>
                  <div style={{ fontSize: '16px', fontWeight: 850 }}>{displayDupr.toFixed(2)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)' }}>SKILL LEVEL</span>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-accent)' }}>{skillLabel}</div>
                </div>
              </div>
            </div>

            <div style={{
              padding: '14px', background: 'var(--color-card)',
              border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)',
              textAlign: 'center', fontSize: '12px', color: 'var(--color-text-secondary)',
              fontWeight: 700
            }}>
              Short-code Pass ID: <span style={{ color: 'var(--color-primary)', fontFamily: 'monospace', fontWeight: 850 }}>BK-{user.id.slice(-6).toUpperCase()}</span>
            </div>
          </div>

          {/* QR Scan Pass */}
          <div style={{
            background: 'var(--color-card)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)', padding: '32px', boxShadow: 'var(--shadow-sm)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: '16px', textAlign: 'center'
          }}>
            <h4 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
              Check-In QR Pass
            </h4>
            
            {/* Live QR using qrserver API */}
            <div style={{
              background: 'white', padding: '12px', borderRadius: 'var(--radius-lg)',
              border: '1.5px solid var(--color-border)', boxShadow: 'var(--shadow-sm)'
            }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=MEMBER-PASS:userId=${user.id}`}
                alt="Member Club ID QR Card"
                style={{ width: '180px', height: '180px', display: 'block' }}
              />
            </div>

            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5, maxWidth: '280px' }}>
              Present this QR to counter staff or scan at the lobby camera scanner to verify check-in logs and open play matches.
            </p>
          </div>
        </div>
      )}

      {/* Tab 4: Change Password */}
      {tab === 'password' && (
        <div style={{
          background: 'var(--color-card)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)', padding: '32px', boxShadow: 'var(--shadow-sm)',
          maxWidth: '600px', width: '100%'
        }}>
          <ChangePasswordForm />
        </div>
      )}

      {/* Embedded CSS layout overrides */}
      <style>{`
        .profile-tabs-scroll::-webkit-scrollbar {
          display: none;
        }
        .profile-grid {
          width: 100%;
        }
        @media (max-width: 820px) {
          .profile-grid {
            grid-template-columns: 1fr !important;
            gap: 20px !important;
          }
        }
        @media (max-width: 640px) {
          .profile-fields-grid {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }
        }
      `}</style>
    </div>
  )
}
