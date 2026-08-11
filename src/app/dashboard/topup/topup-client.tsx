'use client'

import { useState, useTransition, useEffect } from 'react'
import { createPaymongoSessionAction } from '@/lib/actions/paymongo'
import { redeemVoucherAction } from '@/lib/actions/admin'
import { useSearchParams } from 'next/navigation'
import { ShieldCheck, ShieldAlert, CreditCard, Smartphone, Building2, QrCode, Wallet, Tag, ChevronRight } from 'lucide-react'

interface Props {
  userBalance: number
  userId: string
}

type PaymentMethod = 'instapay' | 'gcash' | 'maya' | 'cash' | 'voucher'

const PAYMENT_METHODS = [
  {
    id: 'instapay' as PaymentMethod,
    label: 'InstaPay (Coming Soon)',
    description: 'Real-time transfer via InstaPay network',
    icon: QrCode,
    color: 'var(--color-text-disabled)',
    bg: 'var(--color-surface)',
    disabled: true
  },
  {
    id: 'gcash' as PaymentMethod,
    label: 'GCash (Coming Soon)',
    description: 'Pay using your GCash e-wallet',
    icon: Smartphone,
    color: 'var(--color-text-disabled)',
    bg: 'var(--color-surface)',
    disabled: true
  },
  {
    id: 'maya' as PaymentMethod,
    label: 'Maya (PayMaya) (Coming Soon)',
    description: 'Pay using Maya digital wallet',
    icon: Wallet,
    color: 'var(--color-text-disabled)',
    bg: 'var(--color-surface)',
    disabled: true
  },
  {
    id: 'cash' as PaymentMethod,
    label: 'Pay with Cash',
    description: 'Pay at the front desk counter',
    icon: CreditCard,
    color: 'var(--color-accent)',
    bg: 'var(--color-accent-subtle)'
  },
  {
    id: 'voucher' as PaymentMethod,
    label: 'Redeem Voucher',
    description: 'Enter a promotional code',
    icon: Tag,
    color: '#059669',
    bg: 'rgba(5,150,105,0.08)'
  },
]

const PRESET_AMOUNTS = [100, 200, 300, 500, 1000, 1500]

function getTopUpPoints(amount: number): number {
  if (amount >= 5000) return 1350
  if (amount >= 2000) return 450
  if (amount >= 1000) return 180
  if (amount >= 500) return 75
  return 0
}

export function TopUpClient({ userBalance, userId }: Props) {
  const searchParams = useSearchParams()
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null)
  const [selectedAmount, setSelectedAmount] = useState<number>(300)
  const [customAmount, setCustomAmount] = useState('')
  const [voucherCode, setVoucherCode] = useState('')
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ success: boolean; text: string } | null>(null)

  const finalAmount = customAmount ? parseFloat(customAmount) : selectedAmount

  useEffect(() => {
    const success = searchParams.get('success')
    const cancel = searchParams.get('cancel')
    if (success) {
      setMessage({ success: true, text: 'Payment completed successfully! Your credits have been updated.' })
      const timer = setTimeout(() => setMessage(null), 15000)
      return () => clearTimeout(timer)
    } else if (cancel) {
      setMessage({ success: false, text: 'Payment checkout was cancelled or failed.' })
      const timer = setTimeout(() => setMessage(null), 15000)
      return () => clearTimeout(timer)
    }
  }, [searchParams])

  const handleTopUp = () => {
    if (!selectedMethod) return
    if (selectedMethod === 'voucher') {
      return
    }
    if (selectedMethod === 'cash') {
      return
    }
    setMessage(null)
    startTransition(async () => {
      const result = await createPaymongoSessionAction(finalAmount, selectedMethod)
      if (result.success) {
        window.location.href = result.checkoutUrl
      } else {
        setMessage({ success: false, text: result.error })
      }
    })
  }

  const handleRedeemVoucher = () => {
    if (!voucherCode.trim()) return
    setMessage(null)
    startTransition(async () => {
      const result = await redeemVoucherAction(voucherCode)
      if (result.success) {
        setMessage({ success: true, text: result.message || 'Voucher redeemed successfully!' })
        setVoucherCode('')
        setTimeout(() => {
          window.location.reload()
        }, 1200)
      } else {
        setMessage({ success: false, text: result.error || 'Failed to redeem voucher.' })
      }
    })
  }

  const renderAmountSection = () => {
    return (
      <div 
        className={`topup-amount-section-container ${selectedMethod ? 'open' : ''}`} 
        style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {selectedMethod && (
          <div className="topup-amount-modal-close-btn" style={{ display: 'none', justifyContent: 'flex-end', width: '100%' }}>
            <button
              type="button"
              onClick={() => setSelectedMethod(null)}
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                padding: '6px 12px',
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--color-text-secondary)'
              }}
            >
              ✕ Close
            </button>
          </div>
        )}
        {selectedMethod && selectedMethod !== 'voucher' && (
          <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: '16px', margin: '0 0 16px' }}>
              Select Top-Up Amount
            </h3>

            {/* Preset amounts */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
              {PRESET_AMOUNTS.map(amt => {
                const points = getTopUpPoints(amt)
                return (
                  <button
                    key={amt}
                    onClick={() => { setSelectedAmount(amt); setCustomAmount('') }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '52px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                      border: selectedAmount === amt && !customAmount ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                      background: selectedAmount === amt && !customAmount ? 'var(--color-primary-subtle)' : 'var(--color-card)',
                      color: selectedAmount === amt && !customAmount ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                      transition: 'all var(--duration-fast)'
                    }}
                  >
                    <span style={{ fontSize: '13px', fontWeight: 700 }}>₱{amt}</span>
                    {points > 0 && (
                      <span style={{ fontSize: '10px', fontWeight: 600, color: '#d97706', marginTop: '2px' }}>
                        +{points} YP
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Custom amount */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px' }}>
                Or enter custom amount (₱)
              </label>
              <input
                type="number"
                placeholder="e.g. 750"
                value={customAmount}
                onChange={e => setCustomAmount(e.target.value)}
                style={{
                  width: '100%', height: '40px', padding: '0 12px',
                  borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
                  background: 'var(--color-surface)', color: 'var(--color-text-primary)',
                  fontSize: '14px', outline: 'none'
                }}
              />
            </div>

            {/* Yard Points promo note */}
            <div style={{
              fontSize: '11px',
              color: 'var(--color-text-secondary)',
              lineHeight: '1.4',
              background: 'rgba(217, 119, 6, 0.05)',
              border: '1px dashed rgba(217, 119, 6, 0.25)',
              borderRadius: 'var(--radius-md)',
              padding: '8px 12px',
              marginBottom: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px'
            }}>
              <span style={{ fontWeight: 800, color: '#d97706', display: 'flex', alignItems: 'center', gap: '4px' }}>
                🎁 Rally Points Bonus Schedule:
              </span>
              <span>₱500+ top-up gets <strong>75 YP</strong></span>
              <span>₱1000+ top-up gets <strong>180 YP</strong></span>
              <span>₱2000+ top-up gets <strong>450 YP</strong></span>
              <span>₱5000+ top-up gets <strong>1350 YP</strong></span>
            </div>

            {/* Summary */}
            <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                <span>Top-up amount</span>
                <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>₱{(finalAmount || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                <span>Current balance</span>
                <span style={{ fontWeight: 700 }}>₱{userBalance.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                <span>Rally Points Reward</span>
                <span style={{ fontWeight: 700, color: '#d97706' }}>
                  {getTopUpPoints(finalAmount) > 0 ? `+${getTopUpPoints(finalAmount)} YP` : 'None (min. ₱500)'}
                </span>
              </div>
              <div style={{ height: 1, background: 'var(--color-border)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                <span>New balance</span>
                <span style={{ color: 'var(--color-primary)' }}>₱{(userBalance + (finalAmount || 0)).toFixed(2)}</span>
              </div>
            </div>

            {selectedMethod !== 'cash' ? (
              <button
                onClick={handleTopUp}
                disabled={isPending || !finalAmount || finalAmount <= 0}
                style={{
                  width: '100%', height: '42px',
                  background: 'var(--color-primary)', color: 'white',
                  border: 'none', borderRadius: 'var(--radius-md)',
                  fontSize: '13px', fontWeight: 800, cursor: 'pointer',
                  boxShadow: 'var(--shadow-primary-btn)',
                  opacity: isPending ? 0.7 : 1
                }}
              >
                {isPending ? 'Processing...' : `Top Up ₱${(finalAmount || 0).toFixed(2)} via ${PAYMENT_METHODS.find(m => m.id === selectedMethod)?.label}`}
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginTop: '12px', borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
                <div style={{ padding: '8px', background: 'white', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=CASH-TOPUP:userId=${userId}%26amount=${finalAmount}`} 
                    alt="Cash Top Up QR Pass" 
                    style={{ width: '150px', height: '150px', display: 'block', objectFit: 'contain' }} 
                  />
                </div>
                <div style={{ fontSize: '11px', fontFamily: 'monospace', background: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '5px 10px', borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)' }}>
                  Pass ID: <strong>{`TU-${userId.slice(-6).toUpperCase()}-${finalAmount}`}</strong>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Cash Payment QR Pass
                </span>
                <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: '1.5', textAlign: 'center' }}>
                  Present this QR to the front desk staff. They will scan it or input the Pass ID above to credit <strong>₱{(finalAmount || 0).toFixed(2)}</strong> to your account.
                </p>
              </div>
            )}
          </div>
        )}

        {selectedMethod === 'voucher' && (
          <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: '16px', margin: '0 0 16px' }}>
              Redeem Voucher Code
            </h3>
            <input
              type="text"
              placeholder="Enter voucher/promo code..."
              value={voucherCode}
              onChange={e => setVoucherCode(e.target.value.toUpperCase())}
              style={{
                width: '100%', height: '42px', padding: '0 12px', marginBottom: '12px',
                borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
                background: 'var(--color-surface)', color: 'var(--color-text-primary)',
                fontSize: '14px', fontWeight: 700, letterSpacing: '0.05em', outline: 'none'
              }}
            />
            <button
              onClick={handleRedeemVoucher}
              disabled={isPending || !voucherCode.trim()}
              style={{
                width: '100%', height: '42px', background: 'var(--color-primary)', color: 'white',
                border: 'none', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                opacity: isPending ? 0.7 : 1
              }}
            >
              {isPending ? 'Redeeming...' : 'Redeem Code'}
            </button>
          </div>
        )}

        {!selectedMethod && (
          <div style={{ background: 'var(--color-card)', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-xl)', padding: '48px 24px', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
            <Wallet size={36} color="var(--color-text-disabled)" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0 }}>
              Select a payment method to continue
            </p>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }} className="animate-fade-up">
        {/* Header */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
                Top Up Credits
              </h1>
              <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '4px', margin: '4px 0 0' }}>
                Add credits securely to your South Rally account.
              </p>
            </div>
          </div>
        </div>

        {message && (
          <div style={{
            padding: '12px 16px', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '13px',
            display: 'flex', alignItems: 'center', gap: '8px',
            background: message.success ? 'var(--color-success-subtle)' : 'var(--color-danger-subtle)',
            color: message.success ? 'var(--color-success)' : 'var(--color-danger)',
            border: `1px solid ${message.success ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`
          }}>
            {message.success ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
            <span>{message.text}</span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '24px' }} className="topup-main-grid">
          {/* Left: Payment Methods */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Current Balance */}
            <div style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, #005F63 100%)', borderRadius: 'var(--radius-xl)', padding: '28px', color: 'white', boxShadow: 'var(--shadow-md)' }}>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>CURRENT BALANCE</div>
              <div style={{ fontSize: '36px', fontWeight: 800, marginTop: '6px', letterSpacing: '-0.02em' }}>
                ₱{userBalance.toFixed(2)}
              </div>
            </div>

            {/* Payment Method Selection */}
            <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: '16px', margin: '0 0 16px' }}>
                Choose Payment Method
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {PAYMENT_METHODS.map(method => {
                  const Icon = method.icon
                  const isSelected = selectedMethod === method.id
                  const isDisabled = (method as any).disabled
                  return (
                    <button
                      key={method.id}
                      disabled={isDisabled}
                      onClick={() => {
                        if (isDisabled) return
                        setSelectedMethod(method.id)
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        padding: '12px 16px',
                        borderRadius: 'var(--radius-md)',
                        border: isSelected 
                          ? `1px solid ${method.color}` 
                          : '1px solid var(--color-border)',
                        background: isSelected 
                          ? method.bg 
                          : isDisabled 
                            ? 'var(--color-surface)' 
                            : 'var(--color-card)',
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                        textAlign: 'left',
                        transition: 'all var(--duration-fast)',
                        width: '100%',
                        opacity: isDisabled ? 0.6 : 1
                      }}
                    >
                      <div style={{
                        width: 40, height: 40, borderRadius: 'var(--radius-md)',
                        background: isSelected 
                          ? method.bg 
                          : isDisabled 
                            ? 'var(--color-surface)' 
                            : 'var(--color-surface)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        border: `1px solid ${isSelected ? method.color : 'var(--color-border)'}`
                      }}>
                        <Icon size={18} color={isDisabled ? 'var(--color-text-disabled)' : method.color} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ 
                          fontSize: '14px', 
                          fontWeight: 700, 
                          color: isDisabled ? 'var(--color-text-disabled)' : 'var(--color-text-primary)' 
                        }}>
                          {method.label}
                        </div>
                        <div style={{ 
                          fontSize: '11px', 
                          color: isDisabled ? 'var(--color-text-disabled)' : 'var(--color-text-secondary)', 
                          marginTop: '1px' 
                        }}>
                          {method.description}
                        </div>
                      </div>
                      <ChevronRight size={16} color={isSelected ? method.color : 'var(--color-text-disabled)'} />
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Desktop View Right Column */}
          <div className="topup-desktop-amount-container">
            {renderAmountSection()}
          </div>
        </div>
      </div>

      {/* Mobile View Modal Wrapper (Rendered outside animated viewport parent container to prevent coordinate bounding) */}
      <div 
        className={`topup-mobile-modal-wrapper ${selectedMethod ? 'open' : ''}`}
        onClick={() => setSelectedMethod(null)}
      >
        {renderAmountSection()}
      </div>

      <style>{`
        /* Desktop defaults */
        .topup-desktop-amount-container {
          display: block;
        }
        .topup-mobile-modal-wrapper {
          display: none;
        }

        @media (max-width: 900px) {
          .topup-main-grid { 
            grid-template-columns: 1fr !important; 
          }
          
          .topup-desktop-amount-container {
            display: none !important;
          }

          .topup-mobile-modal-wrapper.open {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            background: rgba(0, 0, 0, 0.40) !important;
            backdrop-filter: blur(4px) !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            z-index: 10000 !important;
          }

          .topup-mobile-modal-wrapper:not(.open) {
            display: none !important;
          }

          .topup-amount-section-container.open {
            background: var(--color-card) !important;
            border: 1px solid var(--color-border) !important;
            border-radius: var(--radius-xl) !important;
            padding: 24px !important;
            max-width: 420px !important;
            width: 90% !important;
            box-shadow: var(--shadow-lg) !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 20px !important;
            position: relative !important;
            max-height: 85vh !important;
            overflow-y: auto !important;
            box-sizing: border-box !important;
          }

          .topup-amount-modal-close-btn {
            display: flex !important;
            justify-content: flex-end !important;
            margin-bottom: -10px !important;
          }
        }
      `}</style>
    </>
  )
}
