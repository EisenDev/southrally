import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  TrendingUp,
  Sparkles,
  Plus,
  ChevronRight,
  Calendar,
  CreditCard,
  Clock,
  QrCode,
  MapPin,
  Ticket,
  ChevronLeft,
  Users
} from 'lucide-react'

export const dynamic = 'force-dynamic'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return { text: 'Good morning', emoji: '☀️' }
  if (h < 18) return { text: 'Good afternoon', emoji: '🏓' }
  return { text: 'Good evening', emoji: '🌙' }
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.email) redirect('/')

  const user = await db.user.findUnique({
    where: { email: session.user.email },
    include: {
      bookings: {
        where: { startTime: { gte: new Date() }, status: { in: ['RESERVED', 'PAID', 'PENDING'] } },
        orderBy: { startTime: 'asc' },
        take: 1,
        include: { court: true }
      },
      transactions: {
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { user: { select: { name: true } } }
      },
      paddleStacks: {
        where: { status: { in: ['PENDING', 'WAITING', 'PLAYING', 'MATCHED'] } }
      }
    }
  })

  if (!user) redirect('/')

  if (user.role === 'ADMIN') {
    redirect('/dashboard/admin')
  }

  // Count total bookings
  const totalBookings = await db.booking.count({ where: { userId: user.id } })

  // Count open play sessions (paddle stack history)
  const openPlaySessions = await db.paddleStack.count({ where: { userId: user.id } })

  // Compute hours played from completed bookings
  const completedBookings = await db.booking.findMany({
    where: { userId: user.id, status: 'PAID' },
    select: { startTime: true, endTime: true }
  })
  const hoursPlayed = completedBookings.reduce((acc, b) => {
    return acc + (new Date(b.endTime).getTime() - new Date(b.startTime).getTime()) / 3600000
  }, 0)

  // Upcoming events
  const upcomingEvents = await db.clubEvent.findMany({
    where: { scheduledAt: { gte: new Date() } },
    orderBy: { scheduledAt: 'asc' },
    take: 1
  })

  // Last 7 days activity (bookings by day)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
  sevenDaysAgo.setHours(0, 0, 0, 0)

  const recentBookings = await db.booking.findMany({
    where: { userId: user.id, startTime: { gte: sevenDaysAgo } },
    select: { startTime: true, status: true }
  })

  const { text: greeting, emoji: greetingEmoji } = getGreeting()
  const firstName = user.name?.split(' ')[0] || 'Player'
  const nextBooking = user.bookings[0]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }} className="animate-fade-up">
      {/* ── Welcome Header Block (Avenor Style) ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.02em',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {greeting}, {firstName}! {greetingEmoji}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginTop: 4, margin: '4px 0 0' }}>
            Ready to start your pickleball journey? Let's go!
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Link href="/dashboard/openplay" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            height: '38px',
            padding: '0 16px',
            background: 'var(--color-accent)',
            color: 'white',
            borderRadius: 'var(--radius-md)',
            textDecoration: 'none',
            fontSize: '13px',
            fontWeight: 700,
            boxShadow: 'var(--shadow-primary-btn)'
          }}>
            ▶ Join Open Play
          </Link>
          <Link href="/dashboard/bookings" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            height: '38px',
            padding: '0 16px',
            background: 'var(--color-primary)',
            color: 'white',
            borderRadius: 'var(--radius-md)',
            textDecoration: 'none',
            fontSize: '13px',
            fontWeight: 700,
            boxShadow: 'var(--shadow-primary-btn)'
          }}>
            <Plus size={15} />
            <span>Book a Court</span>
          </Link>
        </div>
      </div>

      {/* ── Stat Cards Grid (Avenor Style) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }} className="stats-grid-row">
        {[
          {
            label: 'Credits Balance',
            value: `₱${Number(user.credits).toFixed(2)}`,
            deltaText: 'Verified Active Member',
            deltaClass: 'success',
            icon: CreditCard,
            href: '/dashboard/topup'
          },
          {
            label: 'Open Play Sessions',
            value: openPlaySessions,
            deltaText: 'Active Lobby Checked-in',
            deltaClass: 'success',
            icon: Users,
            href: '/dashboard/openplay'
          },
          {
            label: 'Court Bookings',
            value: totalBookings,
            deltaText: nextBooking ? 'Upcoming Reservation' : 'No upcoming bookings',
            deltaClass: nextBooking ? 'success' : 'neutral',
            icon: Calendar,
            href: '/dashboard/bookings'
          },
          {
            label: 'Hours Played',
            value: `${hoursPlayed.toFixed(0)}h`,
            deltaText: 'Rising Player Rating',
            deltaClass: 'success',
            icon: Clock,
            href: '/dashboard/transactions'
          },
        ].map(card => {
          const CardIcon = card.icon
          return (
            <Link
              key={card.label}
              href={card.href}
              style={{ textDecoration: 'none' }}
              className="stat-card"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span className="stat-label">{card.label}</span>
                <CardIcon size={16} color="var(--color-text-disabled)" />
              </div>
              <div className="stat-value-row">
                <span className="stat-number">{card.value}</span>
              </div>
              <div className={`stat-delta ${card.deltaClass}`}>
                <TrendingUp size={12} style={{ opacity: card.deltaClass === 'success' ? 1 : 0.4 }} />
                <span>{card.deltaText}</span>
              </div>
            </Link>
          )
        })}
      </div>

      {/* ── Two Column Content Grid (Avenor Style 3fr 2fr) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '24px' }} className="dashboard-content-layout">
        {/* Left Column (3fr) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Activity Chart Card */}
          <div className="content-card">
            <div className="card-header">
              <h3>Your Activity (Last 7 Days)</h3>
              <span style={{
                fontSize: '11px', fontWeight: 600,
                background: 'var(--color-surface)', color: 'var(--color-text-secondary)',
                padding: '4px 10px', borderRadius: 'var(--radius-full)',
                border: '1px solid var(--color-border)'
              }}>
                Activity Log
              </span>
            </div>

            {/* Simple bar chart */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', height: '110px', margin: '12px 0 8px' }}>
              {Array.from({ length: 7 }, (_, i) => {
                const day = new Date()
                day.setDate(day.getDate() - (6 - i))
                const dayStr = day.toDateString()
                const count = recentBookings.filter(b => new Date(b.startTime).toDateString() === dayStr).length
                const dayName = day.toLocaleDateString('en-US', { weekday: 'short' })
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <div style={{
                      width: '100%',
                      height: count > 0 ? `${Math.min(count * 50, 90)}px` : '4px',
                      background: count > 0 ? 'var(--color-primary)' : 'var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      transition: 'height var(--duration-normal)'
                    }} />
                    <span style={{ fontSize: '10px', color: 'var(--color-text-disabled)', fontWeight: 600 }}>{dayName}</span>
                  </div>
                )
              })}
            </div>

            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--color-primary)' }} />
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Court Bookings</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: '#6366f1' }} />
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Open Play</span>
              </div>
            </div>
          </div>

          {/* Recent Activity Ledger Card */}
          <div className="content-card">
            <div className="card-header">
              <h3>Recent Activity</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {user.transactions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>📋</div>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-disabled)' }}>
                    No activity yet. Start playing to see your history!
                  </p>
                </div>
              ) : (
                user.transactions.map((t, idx) => {
                  const isDebit = Number(t.amount) < 0
                  return (
                    <div key={t.id} className="list-item-row" style={{ padding: '12px 0' }}>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
                          {t.type.replace(/_/g, ' ')}
                        </h4>
                        <p style={{ fontSize: '11px', color: 'var(--color-text-disabled)', marginTop: 2, margin: '2px 0 0' }}>
                          {new Date(t.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <span style={{
                        fontSize: '14px', fontWeight: 800,
                        color: isDebit ? 'var(--color-danger)' : 'var(--color-success)'
                      }}>
                        {isDebit ? '-' : '+'}₱{Math.abs(Number(t.amount)).toFixed(2)}
                      </span>
                    </div>
                  )
                })
              )}
            </div>
            <div className="card-footer">
              <Link href="/dashboard/transactions" className="card-footer-link">
                <span>View statements history</span>
                <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column (2fr) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Lobby Check-in QR Card - Your Member QR */}
          <div className="content-card" style={{ borderLeft: '3px solid var(--color-primary)' }}>
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <QrCode size={16} color="var(--color-primary)" />
                <h3 style={{ fontSize: '14px', fontWeight: 750, margin: 0 }}>Your Member QR</h3>
              </div>
              <span
                style={{
                  background: 'var(--color-primary-subtle)',
                  color: 'var(--color-primary)',
                  fontSize: '9px',
                  fontWeight: 800,
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-xs)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                MEMBER PASS
              </span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.4, margin: 0 }}>
              Present this QR to counter staff or scan at the lobby camera scanner to verify check-in, top up balance, or view active bookings.
            </p>
            <div style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              position: 'relative'
            }}>
              <div style={{ position: 'relative', width: '120px', height: '120px' }}>
                <div style={{
                  width: '100%',
                  height: '100%',
                  background: 'white',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '8px',
                  boxSizing: 'border-box'
                }}>
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=MEMBER-PASS:userId=${user.id}`} 
                    alt="Member QR Pass" 
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                  />
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{user.name}</div>
                <div style={{ fontSize: '10px', color: 'var(--color-text-disabled)', fontFamily: 'var(--font-mono)' }}>
                  ID: {user.id.toUpperCase()}
                </div>
              </div>
            </div>
          </div>

          {/* Join an Event / Clinic promo card */}
          <div className="content-card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Ticket size={16} color="var(--color-accent)" />
                <h3 style={{ fontSize: '14px', fontWeight: 750, margin: 0 }}>Club Events & Clinics</h3>
              </div>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: 0 }}>
              Join upcoming tournaments, social mixer events, and clinic sessions to play with matching DUPR players.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '10px', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-accent)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-primary)' }}>South Rally Social Open</div>
                  <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>Clinics & Social Mixers</div>
                </div>
              </div>
            </div>
            <Link
              href="/dashboard/events"
              style={{
                width: '100%',
                height: '34px',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--color-text-primary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none',
                transition: 'background var(--duration-fast)'
              }}
              className="action-link-btn"
            >
              Browse Events
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        /* stat card styling matches Avenor style sheet */
        .stat-card {
          background: var(--color-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xl);
          padding: 20px 24px;
          display: flex;
          flex-direction: column;
          box-shadow: var(--shadow-sm);
          transition: box-shadow var(--duration-normal), transform var(--duration-normal);
          height: 120px;
        }
        .stat-card:hover {
          box-shadow: var(--shadow-hover);
          transform: translateY(-1px);
        }
        .stat-label {
          font-size: 12px;
          font-weight: 500;
          color: var(--color-text-secondary);
        }
        .stat-value-row {
          display: flex;
          align-items: baseline;
          margin-top: 4px;
        }
        .stat-number {
          font-size: 24px;
          font-weight: 700;
          color: var(--color-text-primary);
          font-feature-settings: "tnum";
        }
        .stat-delta {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 500;
          margin-top: 6px;
        }
        .stat-delta.success {
          color: var(--color-success);
        }
        .stat-delta.neutral {
          color: var(--color-text-secondary);
        }

        /* content card styling matches Avenor style sheet */
        .content-card {
          background: var(--color-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-sm);
          padding: var(--spacing-card-inner);
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .card-header h3 {
          font-size: 15px;
          font-weight: 750;
          color: var(--color-text-primary);
          margin: 0;
        }

        .list-item-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding-bottom: 14px;
          border-bottom: 1px solid var(--color-border-subtle);
        }
        .list-item-row:last-child {
          padding-bottom: 0;
          border-bottom: none;
        }

        .card-footer {
          border-top: 1px solid var(--color-border-subtle);
          padding-top: 12px;
          margin-top: 4px;
        }
        .card-footer-link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          text-decoration: none;
          font-size: 13px;
          font-weight: 600;
          color: var(--color-primary);
          transition: color var(--duration-fast);
        }
        .card-footer-link:hover {
          color: var(--color-primary-hover);
        }
        .action-link-btn:hover {
          background: var(--color-hover-bg) !important;
        }

        @media (max-width: 1024px) {
          .stats-grid-row {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .dashboard-content-layout {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 640px) {
          .stats-grid-row {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
