'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { redeemShopProductAction, claimDailyLoginAction } from '@/lib/actions/yardpoints'
import { Star, Gift, Droplets, Zap, Clock, ShoppingBag, CheckCircle, XCircle, AlertCircle, ChevronRight, Trophy, Flame, Shield, Crown, Sparkles } from 'lucide-react'

// ── Tier Configuration ──────────────────────────────────────────────────────
const TIERS = [
  { name: 'Rookie',     minPoints: 0,      emoji: '🟢', color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
  { name: 'Challenger', minPoints: 7500,   emoji: '🔵', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)'  },
  { name: 'Competitor', minPoints: 15000,  emoji: '🟣', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)'  },
  { name: 'Elite',      minPoints: 30000,  emoji: '🟡', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  { name: 'Legend',     minPoints: 60000,  emoji: '🔴', color: '#ef4444', bg: 'rgba(239,68,68,0.1)'   },
]

function getTier(lifetimePoints: number) {
  let tier = TIERS[0]
  for (const t of TIERS) {
    if (lifetimePoints >= t.minPoints) tier = t
  }
  return tier
}

function getNextTier(lifetimePoints: number) {
  return TIERS.find(t => t.minPoints > lifetimePoints) || null
}

// ── Category Icons / Labels ──────────────────────────────────────────────────
const CATEGORY_ICONS: Record<string, { icon: any; label: string; color: string; bg: string }> = {
  DRINK:       { icon: Droplets, label: 'Drinks',      color: '#3b82f6', bg: 'rgba(59,130,246,0.1)'  },
  VOUCHER:     { icon: Gift,     label: 'Vouchers',    color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
  COURT_TIME:  { icon: Clock,    label: 'Court Time',  color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)'  },
  MERCHANDISE: { icon: Star,     label: 'Merch',       color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  OTHER:       { icon: ShoppingBag, label: 'Other',    color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
}

const REASON_LABELS: Record<string, { label: string; color: string }> = {
  OPEN_PLAY_WIN:           { label: '🏆 Match Win',        color: '#f59e0b' },
  OPEN_PLAY_PARTICIPATION: { label: '🎯 Played a Match',   color: '#10b981' },
  TOPUP:                   { label: '💳 Top-up Reward',     color: '#3b82f6' },
  DAILY_LOGIN:             { label: '📅 Daily Check-in',    color: '#8b5cf6' },
  REDEMPTION:              { label: '🛒 Redemption',        color: '#ef4444' },
  REDEMPTION_REFUND:       { label: '↩ Refund',             color: '#6b7280' },
  SPECIAL_EVENT:           { label: '🎉 Special Event',     color: '#ec4899' },
}

interface Props {
  userName: string
  yardPoints: number
  lifetimeYardPoints: number
  logs: { id: string; amount: number; reason: string; details: string; createdAt: string }[]
  products: { id: string; name: string; description: string; category: string; pointsCost: number; stock: number }[]
  redemptions: { id: string; productName: string; productCategory: string; pointsDeducted: number; status: string; createdAt: string }[]
  dailyClaimedToday: boolean
}

export function YardPointsClient({ userName, yardPoints, lifetimeYardPoints, logs, products, redemptions, dailyClaimedToday }: Props) {
  const [isPending, setIsPending] = useState(false)
  const [activeLoadingId, setActiveLoadingId] = useState<string | null>(null)
  const router = useRouter()
  const [notice, setNotice] = useState<{ success: boolean; text: string } | null>(null)
  const [redeemingId, setRedeemingId] = useState<string | null>(null)
  const [confirmRedeem, setConfirmRedeem] = useState<string | null>(null)
  const [claimedToday, setClaimedToday] = useState(dailyClaimedToday)
  const [activeTab, setActiveTab] = useState<'shop' | 'history' | 'redemptions'>('shop')
  const [shopFilter, setShopFilter] = useState<string>('ALL')

  // ── Real-Time Polling ───────────────────────────────────────────────
  // Refresh server data every 15 seconds so Yard Points balance updates
  // automatically (e.g. after admin records a match winner).
  // Polling pauses when an action is in flight so buttons remain clickable.
  useEffect(() => {
    if (activeLoadingId) return
    const interval = setInterval(() => {
      router.refresh()
    }, 15000)
    return () => clearInterval(interval)
  }, [router, activeLoadingId])

  const currentTier = getTier(lifetimeYardPoints)
  const nextTier = getNextTier(lifetimeYardPoints)
  const progress = nextTier
    ? ((lifetimeYardPoints - currentTier.minPoints) / (nextTier.minPoints - currentTier.minPoints)) * 100
    : 100

  const showNotice = (success: boolean, text: string) => {
    setNotice({ success, text })
    setTimeout(() => setNotice(null), 5000)
  }

  const handleClaimDaily = async () => {
    if (activeLoadingId) return
    setActiveLoadingId('daily')
    setIsPending(true)
    const res = await claimDailyLoginAction()
    setIsPending(false)
    setActiveLoadingId(null)
    if (res.success) {
      setClaimedToday(true)
      showNotice(true, '🎉 Daily check-in claimed! +2 Rally Points added.')
      router.refresh()
    } else {
      showNotice(false, res.error || 'Could not claim daily reward.')
    }
  }

  const handleRedeem = async (productId: string) => {
    if (activeLoadingId) return
    setActiveLoadingId('redeem-' + productId)
    setIsPending(true)
    setRedeemingId(productId)
    const res = await redeemShopProductAction(productId)
    setIsPending(false)
    setRedeemingId(null)
    setConfirmRedeem(null)
    setActiveLoadingId(null)
    if (res.success) {
      showNotice(true, '✅ Redemption submitted! A staff member will hand it over shortly.')
      router.refresh()
    } else {
      showNotice(false, res.error || 'Redemption failed.')
    }
  }

  const shopCategories = ['ALL', ...Array.from(new Set(products.map(p => p.category)))]
  const filteredProducts = shopFilter === 'ALL' ? products : products.filter(p => p.category === shopFilter)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '4px 0 32px' }}>
      {/* Notice Banner */}
      {notice && (
        <div style={{
          padding: '12px 16px', borderRadius: 'var(--radius-lg)', fontSize: '13px', fontWeight: 650,
          display: 'flex', alignItems: 'center', gap: '8px',
          background: notice.success ? 'var(--color-success-subtle)' : 'var(--color-danger-subtle)',
          color: notice.success ? 'var(--color-success)' : 'var(--color-danger)',
          border: `1.5px solid ${notice.success ? '#bbf7d0' : '#fecaca'}`,
        }}>
          {notice.success ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <span>{notice.text}</span>
        </div>
      )}

      {/* ── Hero Balance Card ────────────────────────────────────────────── */}
      <div style={{
        background: `linear-gradient(135deg, ${currentTier.color}22, ${currentTier.color}08)`,
        border: `1.5px solid ${currentTier.color}40`,
        borderRadius: 'var(--radius-xl)', padding: '28px', position: 'relative', overflow: 'hidden'
      }}>
        {/* Decorative glow */}
        <div style={{
          position: 'absolute', top: -40, right: -40, width: 140, height: 140,
          borderRadius: '50%', background: `radial-gradient(circle, ${currentTier.color}30, transparent 70%)`
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span style={{ fontSize: '24px' }}>{currentTier.emoji}</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: currentTier.color, background: currentTier.bg, padding: '3px 10px', borderRadius: 'var(--radius-full)', border: `1px solid ${currentTier.color}40` }}>
                {currentTier.name}
              </span>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Hi {userName} 👋 Your balance</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '52px', fontWeight: 900, color: currentTier.color, letterSpacing: '-0.03em', lineHeight: 1 }}>
                {yardPoints.toLocaleString()}
              </span>
              <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>YP</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '6px' }}>
              {lifetimeYardPoints.toLocaleString()} lifetime Rally Points earned
            </div>
          </div>

          {/* Daily Check-in Button */}
          <button
            onClick={handleClaimDaily}
            disabled={claimedToday || isPending}
            style={{
              padding: '12px 20px', borderRadius: 'var(--radius-lg)',
              background: claimedToday ? 'var(--color-surface)' : 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
              color: claimedToday ? 'var(--color-text-disabled)' : 'white',
              fontSize: '13px', fontWeight: 700, cursor: claimedToday ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px',
              boxShadow: claimedToday ? 'none' : '0 4px 14px rgba(139,92,246,0.4)',
              border: claimedToday ? '1px solid var(--color-border)' : 'none',
              opacity: claimedToday ? 0.7 : 1,
              minWidth: '160px', justifyContent: 'center'
            }}
          >
            <Sparkles size={15} />
            {claimedToday ? '✅ Claimed Today' : 'Daily Check-in (+2 YP)'}
          </button>
        </div>

        {/* Tier Progress Bar */}
        {nextTier && (
          <div style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                Progress to {nextTier.emoji} {nextTier.name}
              </span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: currentTier.color }}>
                {lifetimeYardPoints.toLocaleString()} / {nextTier.minPoints.toLocaleString()} YP
              </span>
            </div>
            <div style={{ height: '8px', background: 'rgba(0,0,0,0.1)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${Math.min(progress, 100)}%`,
                background: `linear-gradient(90deg, ${currentTier.color}, ${nextTier.color})`,
                borderRadius: 'var(--radius-full)', transition: 'width 0.8s ease'
              }} />
            </div>
          </div>
        )}
      </div>

      {/* ── Tier Roadmap ─────────────────────────────────────────────────── */}
      <div style={{ background: 'var(--color-card)', borderRadius: 'var(--radius-xl)', padding: '20px 24px', border: '1px solid var(--color-border)' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-text-primary)', margin: '0 0 16px' }}>Membership Tiers</h3>
        <div style={{ display: 'flex', gap: '0', overflowX: 'auto', paddingBottom: '4px' }}>
          {TIERS.map((tier, i) => {
            const isActive = tier.name === currentTier.name
            const isUnlocked = lifetimeYardPoints >= tier.minPoints
            return (
              <div key={tier.name} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: '80px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flex: 1 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isActive ? tier.color : isUnlocked ? tier.bg : 'var(--color-surface)',
                    border: `2px solid ${isActive ? tier.color : isUnlocked ? tier.color + '60' : 'var(--color-border)'}`,
                    boxShadow: isActive ? `0 0 12px ${tier.color}60` : 'none',
                    transition: 'all 0.3s', flexShrink: 0
                  }}>
                    <span style={{ fontSize: '16px' }}>{tier.emoji}</span>
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: isActive ? 800 : 600, color: isActive ? tier.color : isUnlocked ? 'var(--color-text-primary)' : 'var(--color-text-disabled)', textAlign: 'center', lineHeight: 1.2 }}>
                    {tier.name}
                  </span>
                  <span style={{ fontSize: '9px', color: 'var(--color-text-disabled)', textAlign: 'center' }}>
                    {tier.minPoints === 0 ? 'Start' : `${(tier.minPoints / 1000).toFixed(0)}K YP`}
                  </span>
                </div>
                {i < TIERS.length - 1 && (
                  <div style={{ height: '2px', flex: 0.5, background: isUnlocked && lifetimeYardPoints >= TIERS[i+1].minPoints ? tier.color : 'var(--color-border)', transition: 'background 0.3s' }} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Tab Navigation ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '4px', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', padding: '4px', border: '1px solid var(--color-border)' }}>
        {([['shop', '🛒 Shop'], ['history', '📊 Points History'], ['redemptions', '📦 My Orders']] as const).map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            flex: 1, height: '36px', border: 'none', borderRadius: 'var(--radius-md)',
            background: activeTab === tab ? 'var(--color-card)' : 'transparent',
            color: activeTab === tab ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            fontSize: '13px', fontWeight: activeTab === tab ? 700 : 500, cursor: 'pointer',
            boxShadow: activeTab === tab ? 'var(--shadow-sm)' : 'none',
            transition: 'all 120ms', whiteSpace: 'nowrap'
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Shop Tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'shop' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Category Filter */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            {shopCategories.map(cat => {
              const info = cat === 'ALL' ? null : CATEGORY_ICONS[cat]
              return (
                <button key={cat} onClick={() => setShopFilter(cat)} style={{
                  padding: '6px 14px', borderRadius: 'var(--radius-full)', border: '1px solid',
                  borderColor: shopFilter === cat ? 'var(--color-primary)' : 'var(--color-border)',
                  background: shopFilter === cat ? 'var(--color-primary-subtle)' : 'var(--color-card)',
                  color: shopFilter === cat ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap'
                }}>
                  {cat === 'ALL' ? 'All Items' : info?.label || cat}
                </button>
              )
            })}
          </div>

          {/* Product Grid */}
          <div className="products-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {filteredProducts.map(product => {
              const catInfo = CATEGORY_ICONS[product.category] || CATEGORY_ICONS.OTHER
              const CatIcon = catInfo.icon
              const canAfford = yardPoints >= product.pointsCost
              const isConfirming = confirmRedeem === product.id
              const isRedeeming = redeemingId === product.id

              return (
                <div key={product.id} className="product-card" style={{
                  background: 'var(--color-card)', border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-xl)', overflow: 'hidden', display: 'flex', flexDirection: 'column',
                  boxShadow: 'var(--shadow-sm)', opacity: canAfford ? 1 : 0.65
                }}>
                  {/* Product Color Band */}
                  <div style={{ height: '4px', background: `linear-gradient(90deg, ${catInfo.color}, ${catInfo.color}80)` }} />

                  <div className="product-card-body" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div className="product-card-cat-icon" style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: catInfo.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CatIcon size={20} color={catInfo.color} className="cat-icon-svg" />
                      </div>
                      <span className="product-card-cat-badge" style={{
                        fontSize: '10px', fontWeight: 800, textTransform: 'uppercase',
                        color: catInfo.color, background: catInfo.bg, padding: '3px 8px',
                        borderRadius: 'var(--radius-full)', border: `1px solid ${catInfo.color}30`
                      }}>
                        {catInfo.label}
                      </span>
                    </div>

                    <div>
                      <h4 className="product-card-title" style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-primary)', margin: '0 0 4px' }}>{product.name}</h4>
                      {product.description && (
                        <p className="product-card-desc" style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>{product.description}</p>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Star size={16} color="#f59e0b" fill="#f59e0b" className="star-icon-svg" />
                        <span className="product-card-points" style={{ fontSize: '18px', fontWeight: 900, color: '#f59e0b' }}>
                          {product.pointsCost.toLocaleString()}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>YP</span>
                      </div>
                      {product.stock !== -1 && (
                        <span className="product-card-stock" style={{ fontSize: '11px', color: product.stock > 0 ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 600 }}>
                          {product.stock > 0 ? `${product.stock} left` : 'Out of stock'}
                        </span>
                      )}
                    </div>

                    {!canAfford && (
                      <p className="product-card-needed" style={{ fontSize: '11px', color: 'var(--color-text-disabled)', margin: 0 }}>
                        Need {(product.pointsCost - yardPoints).toLocaleString()} more YP
                      </p>
                    )}

                    {/* Redeem Action */}
                    {!isConfirming ? (
                      <button
                        onClick={() => setConfirmRedeem(product.id)}
                        disabled={!canAfford || (product.stock === 0) || isPending}
                        className="product-card-btn"
                        style={{
                          width: '100%', height: '38px', borderRadius: 'var(--radius-md)',
                          background: canAfford && product.stock !== 0 ? 'var(--color-primary)' : 'var(--color-surface)',
                          color: canAfford && product.stock !== 0 ? 'white' : 'var(--color-text-disabled)',
                          fontSize: '13px', fontWeight: 700, cursor: canAfford && product.stock !== 0 ? 'pointer' : 'not-allowed',
                          border: canAfford && product.stock !== 0 ? 'none' : '1px solid var(--color-border)',
                          boxShadow: canAfford && product.stock !== 0 ? 'var(--shadow-primary-btn)' : 'none',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                        }}
                      >
                        <Gift size={14} className="gift-icon-svg" />
                        <span>{product.stock === 0 ? 'Out of Stock' : !canAfford ? 'Not Enough YP' : 'Redeem'}</span>
                      </button>
                    ) : (
                      <div className="product-card-confirm" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <p style={{ fontSize: '11px', fontWeight: 600, color: '#92400e', background: 'rgba(245,158,11,0.08)', borderRadius: 'var(--radius-sm)', padding: '8px', margin: 0, textAlign: 'center' }}>
                          Spend {product.pointsCost.toLocaleString()} YP?
                        </p>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => setConfirmRedeem(null)} className="product-card-confirm-cancel" style={{ flex: 1, height: '32px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'white', fontSize: '11px', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
                            Cancel
                          </button>
                          <button onClick={() => handleRedeem(product.id)} disabled={isRedeeming} className="product-card-confirm-ok" style={{ flex: 1.5, height: '32px', border: 'none', borderRadius: 'var(--radius-md)', background: 'var(--color-success)', color: 'white', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
                            {isRedeeming ? '...' : 'Confirm'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-secondary)' }}>
              <ShoppingBag size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
              <p style={{ margin: 0, fontWeight: 600 }}>No products in this category yet.</p>
            </div>
          )}
        </div>
      )}

      {/* ── History Tab ──────────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div style={{ background: 'var(--color-card)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--color-border)' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--color-text-primary)' }}>Points History</h3>
          </div>
          {logs.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-disabled)' }}>
              <p style={{ margin: 0 }}>No points activity yet. Play a match or top up to earn your first Rally Points!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {logs.map((log, i) => {
                const reasonInfo = REASON_LABELS[log.reason] || { label: log.reason, color: 'var(--color-text-secondary)' }
                const isEarning = log.amount > 0
                return (
                  <div key={log.id} style={{
                    display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 20px',
                    borderBottom: i < logs.length - 1 ? '1px solid var(--color-border)' : 'none'
                  }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isEarning ? 'var(--color-success-subtle)' : 'var(--color-danger-subtle)', flexShrink: 0 }}>
                      <span style={{ fontSize: '16px' }}>{isEarning ? '↑' : '↓'}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: reasonInfo.color }}>{reasonInfo.label}</div>
                      {log.details && <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.details}</div>}
                      <div style={{ fontSize: '11px', color: 'var(--color-text-disabled)', marginTop: '2px' }}>
                        {new Date(log.createdAt).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: isEarning ? 'var(--color-success)' : 'var(--color-danger)', flexShrink: 0 }}>
                      {isEarning ? '+' : ''}{log.amount.toLocaleString()} YP
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Redemptions Tab ──────────────────────────────────────────────── */}
      {activeTab === 'redemptions' && (
        <div style={{ background: 'var(--color-card)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--color-border)' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--color-text-primary)' }}>My Redemption Orders</h3>
          </div>
          {redemptions.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-disabled)' }}>
              <Gift size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
              <p style={{ margin: 0 }}>No redemptions yet. Head to the Shop tab to use your Rally Points!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {redemptions.map((r, i) => {
                const statusConfig = {
                  PENDING:  { label: '⏳ Pending',  color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
                  APPROVED: { label: '✅ Approved', color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
                  REJECTED: { label: '❌ Rejected', color: '#ef4444', bg: 'rgba(239,68,68,0.1)'   },
                }[r.status] || { label: r.status, color: 'var(--color-text-secondary)', bg: 'var(--color-surface)' }

                const catInfo = CATEGORY_ICONS[r.productCategory] || CATEGORY_ICONS.OTHER
                return (
                  <div key={r.id} style={{
                    display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 20px',
                    borderBottom: i < redemptions.length - 1 ? '1px solid var(--color-border)' : 'none'
                  }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: catInfo.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Gift size={18} color={catInfo.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{r.productName}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-disabled)', marginTop: '2px' }}>
                        {new Date(r.createdAt).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#ef4444' }}>-{r.pointsDeducted.toLocaleString()} YP</span>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: statusConfig.color, background: statusConfig.bg, padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
                        {statusConfig.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <style>{`
        @media (max-width: 640px) {
          .yp-tier-row { flex-direction: column !important; gap: 8px !important; }
          .products-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 12px !important;
          }
          .product-card-body {
            padding: 12px !important;
            gap: 8px !important;
          }
          .product-card-cat-icon {
            width: 32px !important;
            height: 32px !important;
          }
          .cat-icon-svg {
            width: 16px !important;
            height: 16px !important;
          }
          .product-card-cat-badge {
            font-size: 8px !important;
            padding: 2px 6px !important;
          }
          .product-card-title {
            font-size: 13px !important;
            font-weight: 800 !important;
            line-height: 1.25 !important;
            margin-bottom: 2px !important;
          }
          .product-card-desc {
            font-size: 10px !important;
            line-height: 1.35 !important;
            display: -webkit-box !important;
            -webkit-line-clamp: 2 !important;
            -webkit-box-orient: vertical !important;
            overflow: hidden !important;
            height: 2.7em !important;
          }
          .star-icon-svg {
            width: 13px !important;
            height: 13px !important;
          }
          .product-card-points {
            font-size: 14px !important;
          }
          .product-card-stock {
            font-size: 9px !important;
          }
          .product-card-needed {
            font-size: 9px !important;
          }
          .product-card-btn {
            height: 32px !important;
            font-size: 11px !important;
          }
          .gift-icon-svg {
            width: 12px !important;
            height: 12px !important;
          }
        }
      `}</style>
    </div>
  )
}
