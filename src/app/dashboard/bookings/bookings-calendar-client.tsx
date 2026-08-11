'use client'

import { useState, useEffect, useTransition } from 'react'
import { createBookingAction, createBookingsAction } from '@/lib/actions/booking'
import { adminReserveCourtForOpenPlayAction, adminCancelBookingAction, adminBookOnBehalfOfPlayerAction, adminNoAccountBookingAction } from '@/lib/actions/admin'
import { ShieldCheck, AlertTriangle, Calendar, List, Plus, Clock, MapPin, ChevronLeft, ChevronRight, ArrowLeft, X, Search, QrCode, Gift, User, Users } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Court {
  id: string
  number: number
  name: string
  type: string
  status: string
}

interface BookingItem {
  id: string
  courtId: string
  courtNumber: number
  courtName: string
  startTime: Date
  endTime: Date
  status: string
  userName: string
  userEmail: string
  userRole: string
  isOwn: boolean
}

interface MyBooking {
  id: string
  courtId: string
  courtName: string
  startTime: Date
  endTime: Date
  status: string
  price: number
}

interface CourtVoucher {
  id: string
  name: string
  durationHours: number
}

interface PlayerItem {
  id: string
  name: string
  email: string
  credits: number
  role: string
}

interface Props {
  bookingPricePerHour: number   // legacy fallback
  daytimePrice: number
  daytimeStartHour: number
  daytimeEndHour: number
  nighttimePrice: number
  courts: Court[]
  allBookings: BookingItem[]
  myBookings: MyBooking[]
  userBalance: number
  userId: string
  userRole: string
  startHour: number
  endHour: number
  courtVouchers?: CourtVoucher[]
  players?: PlayerItem[]
}

function formatHour(h: number) {
  const suffix = h >= 12 ? 'PM' : 'AM'
  const display = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${display}:00 ${suffix}`
}

function formatDateToYYYYMMDD(d: Date) {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function BookingsCalendarClient({ bookingPricePerHour, daytimePrice, daytimeStartHour, daytimeEndHour, nighttimePrice, courts, allBookings, myBookings, userBalance, userId, userRole, startHour, endHour, courtVouchers = [], players = [] }: Props) {
  const HOURS = Array.from({ length: Math.max(1, endHour - startHour) }, (_, i) => i + startHour)

  // Returns the price for a given hour of day (0-23), respecting daytime/nighttime windows
  const getHourlyRate = (hour: number, courtType?: string): number => {
    if (courtType === 'ROOFTOP') return 300
    return (hour >= daytimeStartHour && hour < daytimeEndHour) ? daytimePrice : nighttimePrice
  }
  const [activeTab, setActiveTab] = useState<'calendar' | 'list' | 'passes'>('calendar')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'credits' | 'cash'>('credits')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedCourt, setSelectedCourt] = useState<string>('all')
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ success: boolean; text: string } | null>(null)
  const [bookingSearch, setBookingSearch] = useState('')
  const router = useRouter()
  const [selectedDetailBooking, setSelectedDetailBooking] = useState<any | null>(null)
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false)
  
  // Real-time bookings state and polling
  const [bookings, setBookings] = useState<BookingItem[]>(allBookings)
  const [myBookingsList, setMyBookingsList] = useState<MyBooking[]>(myBookings)

  useEffect(() => {
    setBookings(allBookings)
  }, [allBookings])

  useEffect(() => {
    setMyBookingsList(myBookings)
  }, [myBookings])

  useEffect(() => {
    let active = true
    const fetchLatestBookings = async () => {
      try {
        const res = await fetch('/api/realtime?type=bookings')
        if (!res.ok) return
        const data = await res.json()
        if (data.success && data.bookings && active) {
          const mapped = data.bookings.map((b: any) => ({
            id: b.id,
            courtId: b.courtId,
            courtNumber: b.courtNumber,
            courtName: b.courtName,
            startTime: new Date(b.startTime),
            endTime: new Date(b.endTime),
            status: b.status,
            userName: b.userName,
            userEmail: b.userEmail,
            userRole: b.userRole,
            isOwn: b.userId === userId,
            price: b.price
          }))
          setBookings(mapped)

          // Sync status updates for myBookingsList state
          setMyBookingsList(prev => {
            return prev.map(oldBooking => {
              const latest = mapped.find((m: any) => m.id === oldBooking.id)
              if (latest) {
                return { ...oldBooking, status: latest.status }
              }
              return oldBooking
            })
          })
        }
      } catch (err) {
        console.error('Failed to poll real-time bookings:', err)
      }
    }

    fetchLatestBookings()
    const interval = setInterval(fetchLatestBookings, 3000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [userId])

  // Booking Modal States
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalCourtId, setModalCourtId] = useState<string>('')
  const [modalCourtIds, setModalCourtIds] = useState<string[]>([]) // support multiple courts for admins
  const [modalDate, setModalDate] = useState<string>('')
  const [modalHours, setModalHours] = useState<number[]>([])
  const [selectedVouchers, setSelectedVouchers] = useState<Record<number, string>>({})

  // Admin booking mode: 'openplay' | 'player_booking' | 'no_account'
  const [adminBookingMode, setAdminBookingMode] = useState<'openplay' | 'player_booking' | 'no_account'>('openplay')
  const [playerSearch, setPlayerSearch] = useState('')
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerItem | null>(null)
  const [guestName, setGuestName] = useState('')

  const filteredCourts = selectedCourt === 'all' ? courts : courts.filter(c => c.id === selectedCourt)

  const getBookingsForCourtAndHour = (courtId: string, hour: number) => {
    return bookings.filter(b => {
      const d = selectedDate
      const slotHourStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour, 0, 0).getTime()
      const slotHourEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour + 1, 0, 0).getTime()
      
      const bStart = new Date(b.startTime).getTime()
      const bEnd = new Date(b.endTime).getTime()
      
      return (
        b.courtId === courtId &&
        bStart < slotHourEnd &&
        bEnd > slotHourStart &&
        b.status !== 'EXPIRED' &&
        b.status !== 'CANCELLED'
      )
    })
  }

  // Open modal for a specific grid cell click
  const handleOpenBookingModalForSlot = (courtId: string, hour: number) => {
    setModalCourtId(courtId)
    setModalCourtIds([courtId])
    setModalDate(formatDateToYYYYMMDD(selectedDate))
    setModalHours([hour])
    setSelectedVouchers({})
    
    // Auto check balance
    const court = courts.find(c => c.id === courtId)
    const hourlyRate = getHourlyRate(hour, court?.type)
    if (userBalance >= hourlyRate) {
      setSelectedPaymentMethod('credits')
    } else {
      setSelectedPaymentMethod('cash')
    }
    
    setIsModalOpen(true)
  }

  // Open modal generally from header button
  const handleOpenBookingModalGeneral = () => {
    const firstId = courts[0]?.id || ''
    setModalCourtId(firstId)
    setModalCourtIds([])
    setModalDate(formatDateToYYYYMMDD(selectedDate))
    setModalHours([])
    setSelectedVouchers({})
    setSelectedPaymentMethod(userBalance >= daytimePrice ? 'credits' : 'cash')
    // Reset admin mode
    setAdminBookingMode('openplay')
    setPlayerSearch('')
    setSelectedPlayer(null)
    setGuestName('')
    setIsModalOpen(true)
  }

  // Open modal from a calendar cell click for admin — also pre-fill court+hour
  const handleOpenBookingModalForSlotAdmin = (courtId: string, hour: number) => {
    setModalCourtId(courtId)
    setModalCourtIds([courtId])
    setModalDate(formatDateToYYYYMMDD(selectedDate))
    setModalHours([hour])
    setSelectedVouchers({})
    setAdminBookingMode('openplay')
    setPlayerSearch('')
    setSelectedPlayer(null)
    setGuestName('')
    setIsModalOpen(true)
  }

  // Check if a time slot is already booked on the selected court & date inside the modal
  const isSlotBookedInModal = (hour: number) => {
    if (!modalDate) return false
    const parsedDate = new Date(modalDate + 'T00:00:00')
    const isAdminOrStaff = userRole === 'ADMIN' || userRole === 'STAFF'
    const targetIds = isAdminOrStaff ? modalCourtIds : [modalCourtId]

    if (targetIds.length === 0) return false

    return bookings.some(b => {
      const bStart = new Date(b.startTime)
      return (
        targetIds.includes(b.courtId) &&
        bStart.getFullYear() === parsedDate.getFullYear() &&
        bStart.getMonth() === parsedDate.getMonth() &&
        bStart.getDate() === parsedDate.getDate() &&
        bStart.getHours() === hour
      )
    })
  }

  // Check if a time slot inside the modal is in the past
  const isSlotInPastInModal = (hour: number) => {
    if (!modalDate) return false
    const slotTime = new Date(modalDate + 'T00:00:00')
    slotTime.setHours(hour, 0, 0, 0)
    return slotTime < new Date()
  }

  // Re-check balance when modal settings change
  useEffect(() => {
    if (!isModalOpen) return
    const court = courts.find(c => c.id === modalCourtId)
    const voucherCount = modalHours.filter(h => !!selectedVouchers[h]).length
    const paidHours = modalHours.filter(h => !selectedVouchers[h])
    const totalCost = paidHours.reduce((sum, h) => sum + getHourlyRate(h, court?.type), 0)
    if (userBalance >= totalCost) {
      setSelectedPaymentMethod('credits')
    } else {
      setSelectedPaymentMethod('cash')
    }
  }, [modalHours.length, modalCourtId, isModalOpen, userBalance, courts, selectedVouchers])

  const toggleHourSelection = (hour: number) => {
    setModalHours(prev => {
      if (prev.includes(hour)) {
        return prev.filter(h => h !== hour)
      } else {
        return [...prev, hour].sort((a, b) => a - b)
      }
    })
  }

  const handleConfirmBooking = () => {
    const isAdminOrStaff = userRole === 'ADMIN' || userRole === 'STAFF'

    if (isAdminOrStaff && adminBookingMode === 'player_booking') {
      if (!selectedPlayer || !modalCourtId || modalHours.length === 0) return
    } else if (isAdminOrStaff && adminBookingMode === 'no_account') {
      if (!guestName.trim() || !modalCourtId || modalHours.length === 0) return
    } else if (isAdminOrStaff) {
      if (modalCourtIds.length === 0 || modalHours.length === 0) return
    } else {
      if (!modalCourtId || modalHours.length === 0) return
    }

    const startTimesISO = modalHours.map(hour => {
      const slotTime = new Date(modalDate + 'T00:00:00')
      slotTime.setHours(hour, 0, 0, 0)
      return slotTime.toISOString()
    })

    const hasPastSlot = modalHours.some(hour => {
      const slotTime = new Date(modalDate + 'T00:00:00')
      slotTime.setHours(hour, 0, 0, 0)
      return slotTime < new Date()
    })

    if (hasPastSlot) {
      alert('Cannot book slots in the past.')
      return
    }

    setMessage(null)
    setIsModalOpen(false)
    startTransition(async () => {
      if (isAdminOrStaff && adminBookingMode === 'no_account') {
        // No-account walk-in guest booking
        const result = await adminNoAccountBookingAction({
          guestName: guestName.trim(),
          courtId: modalCourtId,
          startTimes: startTimesISO
        })
        if (result.success) {
          setMessage({ success: true, text: `Booking recorded for walk-in guest "${guestName.trim()}"!` })
          setSelectedDate(new Date(modalDate + 'T00:00:00'))
          setGuestName('')
        } else {
          setMessage({ success: false, text: result.error || 'Failed to record guest booking.' })
        }
      } else if (isAdminOrStaff && adminBookingMode === 'player_booking') {
        // Admin booking on behalf of player
        const result = await adminBookOnBehalfOfPlayerAction({
          targetUserId: selectedPlayer!.id,
          courtId: modalCourtId,
          startTimes: startTimesISO
        })
        if (result.success) {
          setMessage({ success: true, text: `Court booked for ${selectedPlayer!.name}!` })
          setSelectedDate(new Date(modalDate + 'T00:00:00'))
        } else {
          setMessage({ success: false, text: result.error || 'Failed to book court for player.' })
        }
      } else if (isAdminOrStaff) {
        // Admin Open Play Block Reservation (Free ₱0 across multiple courts)
        const result = await adminReserveCourtForOpenPlayAction({
          courtIds: modalCourtIds,
          startTimes: startTimesISO,
          label: 'Open Play Block'
        })
        if (result.success) {
          setMessage({ success: true, text: 'Court successfully reserved for Open Play block(s)!' })
          setSelectedDate(new Date(modalDate + 'T00:00:00'))
        } else {
          setMessage({ success: false, text: result.error || 'Failed to reserve court slots.' })
        }
      } else {
        // Regular Player Court Booking
        const voucherSelections: Record<string, string> = {}
        modalHours.forEach(hour => {
          const vId = selectedVouchers[hour]
          if (vId) {
            const slotTime = new Date(modalDate + 'T00:00:00')
            slotTime.setHours(hour, 0, 0, 0)
            voucherSelections[slotTime.toISOString()] = vId
          }
        })
        const result = await createBookingsAction(modalCourtId, startTimesISO, selectedPaymentMethod, voucherSelections)
        if (result.success) {
          setMessage({ success: true, text: 'Court booked successfully!' })
          setSelectedDate(new Date(modalDate + 'T00:00:00'))
        } else {
          setMessage({ success: false, text: result.error })
        }
      }
    })
  }

  const shiftDate = (days: number) => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + days)
    setSelectedDate(d)
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }} className="animate-fade-up">
        {/* Header */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
                {userRole === 'ADMIN' || userRole === 'STAFF' ? 'Court Schedule Monitor' : 'My Bookings'}
              </h1>
              <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '4px', margin: '4px 0 0' }}>
                {userRole === 'ADMIN' || userRole === 'STAFF' ? 'Monitor active court reservations and scheduling.' : 'Book active courts and view your scheduled reservations.'}
              </p>
            </div>

            {(userRole === 'ADMIN' || userRole === 'STAFF') ? (
              <button
                onClick={handleOpenBookingModalGeneral}
                style={{
                  height: '38px',
                  padding: '0 16px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: 'var(--color-primary)',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: 'var(--shadow-primary-btn)'
                }}
              >
                <Plus size={15} />
                <span>Book | Reserve Open Play Court</span>
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Balance: <strong style={{ color: 'var(--color-primary)' }}>₱{userBalance.toFixed(2)}</strong></span>
                <button
                  onClick={handleOpenBookingModalGeneral}
                  style={{
                    height: '38px',
                    padding: '0 16px',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    background: 'var(--color-primary)',
                    color: 'white',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: 'var(--shadow-primary-btn)'
                  }}
                >
                  <Plus size={15} />
                  <span>Book a Court</span>
                </button>
              </div>
            )}
          </div>

          {/* Vouchers notice banner */}
          {userRole !== 'ADMIN' && userRole !== 'STAFF' && courtVouchers.length > 0 && (
            <div style={{
              background: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: 'var(--radius-lg)',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: 'var(--shadow-sm)',
              marginTop: '16px'
            }}>
              <Gift size={20} color="var(--color-primary)" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: '14px', color: 'var(--color-text-primary)', display: 'block' }}>Available Court Time Vouchers</strong>
                <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', display: 'block', marginTop: '2px' }}>
                  You have {courtVouchers.length} active court time voucher(s) available. You can select and apply them to pay for your slots when checking out a court reservation!
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Alert Message */}
        {message && (
          <div style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: message.success ? 'var(--color-success-subtle)' : 'var(--color-danger-subtle)',
            color: message.success ? 'var(--color-success)' : 'var(--color-danger)',
            border: `1px solid ${message.success ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
            fontWeight: 650, fontSize: '13px',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            {message.success ? <ShieldCheck size={16} /> : <AlertTriangle size={16} />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Tab switcher */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', gap: '0' }}>
          {(['calendar', 'list', 'passes'] as const).map(tab => {
            if (tab === 'passes' && (userRole === 'ADMIN' || userRole === 'STAFF')) return null

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '10px 20px',
                  fontSize: '13px',
                  fontWeight: 600,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: activeTab === tab ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  borderBottom: activeTab === tab ? '2px solid var(--color-primary)' : '2px solid transparent',
                  transition: 'all var(--duration-fast)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {tab === 'calendar' ? <Calendar size={15} /> : tab === 'list' ? <List size={15} /> : <QrCode size={15} />}
                <span>{tab === 'calendar' ? 'Calendar View' : tab === 'list' ? 'List View' : '🎟️ Play & Cash Passes'}</span>
              </button>
            )
          })}
        </div>

        {activeTab === 'calendar' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Calendar controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {/* Court filter */}
                <select
                  value={selectedCourt}
                  onChange={e => setSelectedCourt(e.target.value)}
                  style={{
                    height: '36px', padding: '0 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-card)',
                    color: 'var(--color-text-primary)',
                    fontSize: '13px', fontWeight: 600,
                    cursor: 'pointer', outline: 'none'
                  }}
                >
                  <option value="all">All Courts</option>
                  {courts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>

                {/* Date jump picker */}
                <input
                  type="date"
                  value={formatDateToYYYYMMDD(selectedDate)}
                  onChange={e => {
                    if (e.target.value) {
                      setSelectedDate(new Date(e.target.value + 'T00:00:00'))
                    }
                  }}
                  style={{
                    height: '36px', padding: '0 10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-card)',
                    color: 'var(--color-text-primary)',
                    fontSize: '13px', fontWeight: 600,
                    cursor: 'pointer', outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Date navigator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button onClick={() => shiftDate(-1)} style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ChevronLeft size={16} color="var(--color-text-secondary)" />
                </button>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)', minWidth: 160, textAlign: 'center' }}>
                  {selectedDate.toLocaleDateString('en-PH', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <button onClick={() => shiftDate(1)} style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ChevronRight size={16} color="var(--color-text-secondary)" />
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: `${100 + filteredCourts.length * 140}px` }}>
                  <thead>
                    <tr style={{ background: 'var(--color-surface)' }}>
                      <th style={{ width: 80, padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', textAlign: 'left', borderBottom: '1px solid var(--color-border)', borderRight: '1px solid var(--color-border)' }}>
                        Time
                      </th>
                      {filteredCourts.map(court => (
                        <th key={court.id} style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--color-text-primary)', textAlign: 'center', borderBottom: '1px solid var(--color-border)', borderRight: '1px solid var(--color-border)', minWidth: 140 }}>
                          {court.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {HOURS.map(hour => {
                      const isCurrentHour = new Date().getHours() === hour && selectedDate.toDateString() === new Date().toDateString()
                      return (
                        <tr key={hour} style={{ background: isCurrentHour ? 'rgba(0,124,128,0.03)' : 'transparent' }}>
                          <td style={{
                            padding: '8px 16px',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: isCurrentHour ? 'var(--color-primary)' : 'var(--color-text-disabled)',
                            borderBottom: '1px solid var(--color-border)',
                            borderRight: '1px solid var(--color-border)',
                            verticalAlign: 'top',
                            whiteSpace: 'nowrap'
                          }}>
                            {isCurrentHour && <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--color-danger)', marginRight: 4 }} />}
                            {formatHour(hour)}
                          </td>
                          {filteredCourts.map(court => {
                            const bookingsHere = getBookingsForCourtAndHour(court.id, hour)
                            const isBooked = bookingsHere.length > 0
                            const booking = bookingsHere[0]
                            const isClosed = court.status === 'MAINTENANCE'

                            return (
                              <td key={court.id} style={{ borderBottom: '1px solid var(--color-border)', borderRight: '1px solid var(--color-border)', verticalAlign: 'middle', padding: 0, height: 48 }}>
                                {isClosed ? (
                                  <div style={{
                                    background: '#f3f4f6',
                                    color: '#9ca3af',
                                    padding: '8px 12px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    height: '100%',
                                    width: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    boxSizing: 'border-box'
                                  }}>
                                    <span>Closed</span>
                                  </div>
                                ) : isBooked ? (
                                  <div 
                                    onClick={() => {
                                      if (userRole === 'ADMIN' || userRole === 'STAFF') {
                                        setSelectedDetailBooking(booking)
                                      }
                                    }}
                                    style={{
                                      background: (booking.userRole === 'ADMIN' || booking.userRole === 'STAFF')
                                        ? '#10b981' // Success Green for Open Play block
                                        : booking.isOwn 
                                          ? '#007C80' // Brand Teal for My Booking
                                          : '#475569', // Slate Gray for other Player Bookings
                                      color: 'white',
                                      padding: '6px 12px',
                                      fontSize: '11px',
                                      fontWeight: 700,
                                      height: '100%',
                                      width: '100%',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      justifyContent: 'center',
                                      alignItems: 'center',
                                      textAlign: 'center',
                                      boxSizing: 'border-box',
                                      cursor: (userRole === 'ADMIN' || userRole === 'STAFF') ? 'pointer' : 'default'
                                    }}
                                  >
                                    <span>
                                      {booking.userRole === 'ADMIN' || booking.userRole === 'STAFF'
                                        ? 'Open Play'
                                        : (userRole === 'ADMIN' || userRole === 'STAFF') 
                                          ? booking.userName 
                                          : booking.isOwn 
                                            ? 'My Booking' 
                                            : 'Booked'}
                                    </span>
                                    {((userRole === 'ADMIN' || userRole === 'STAFF') || booking.isOwn) && (
                                      <span style={{ fontWeight: 400, opacity: 0.85, fontSize: 10, marginTop: '2px' }}>
                                        {booking.userRole === 'ADMIN' || booking.userRole === 'STAFF' ? 'RESERVED' : booking.status}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleOpenBookingModalForSlot(court.id, hour)}
                                    disabled={isPending}
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      background: 'transparent',
                                      border: 'none',
                                      cursor: 'pointer',
                                      color: 'var(--color-text-disabled)',
                                      fontSize: '11px',
                                      borderRadius: 0,
                                      transition: 'all var(--duration-fast)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      boxSizing: 'border-box'
                                    }}
                                    className="slot-open"
                                  >
                                    —
                                  </button>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: '12px 16px', borderTop: '1px solid var(--color-border)', background: 'var(--color-surface)', display: 'flex', gap: '20px', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Legend:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: '#10b981' }} />
                  <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Open Play</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: '#007C80' }} />
                  <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>My Booking</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'list' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {(() => {
              const isAdminOrStaff = userRole === 'ADMIN' || userRole === 'STAFF'
              const listToRender = isAdminOrStaff ? bookings : myBookingsList

              // Filter bookings based on bookingSearch state
              const filteredList = listToRender.filter(b => {
                if (!bookingSearch.trim()) return true
                const searchLower = bookingSearch.toLowerCase()
                
                const userName = 'userName' in b ? String(b.userName).toLowerCase() : ''
                const userEmail = 'userEmail' in b ? String(b.userEmail).toLowerCase() : ''
                const courtName = 'courtName' in b ? String(b.courtName).toLowerCase() : ''
                
                return (
                  userName.includes(searchLower) ||
                  userEmail.includes(searchLower) ||
                  courtName.includes(searchLower)
                )
              })

              // Sort the list based on time priority:
              // 1. Bookings for today always come first.
              // 2. Active bookings right now come first within today.
              // 3. Upcoming bookings today are sorted chronologically.
              // 4. Past bookings today are sorted descending.
              // 5. Future days bookings are sorted chronologically, then past days descending.
              const sortedList = [...filteredList].sort((a, b) => {
                const now = new Date()
                const todayDateStr = now.toLocaleDateString('en-US')

                const isTodayA = new Date(a.startTime).toLocaleDateString('en-US') === todayDateStr
                const isTodayB = new Date(b.startTime).toLocaleDateString('en-US') === todayDateStr

                // Today vs Other Days
                if (isTodayA && !isTodayB) return -1
                if (!isTodayA && isTodayB) return 1

                const timeA = new Date(a.startTime).getTime()
                const endA = new Date(a.endTime).getTime()
                const timeB = new Date(b.startTime).getTime()
                const endB = new Date(b.endTime).getTime()
                const nowMs = now.getTime()

                if (isTodayA && isTodayB) {
                  const isActiveA = nowMs >= timeA && nowMs <= endA
                  const isActiveB = nowMs >= timeB && nowMs <= endB

                  // Active first
                  if (isActiveA && !isActiveB) return -1
                  if (!isActiveA && isActiveB) return 1

                  // Upcoming vs Past
                  const isUpcomingA = endA >= nowMs
                  const isUpcomingB = endB >= nowMs

                  if (isUpcomingA && !isUpcomingB) return -1
                  if (!isUpcomingA && isUpcomingB) return 1

                  if (isUpcomingA && isUpcomingB) {
                    return timeA - timeB // upcoming chronological
                  } else {
                    return timeB - timeA // past descending
                  }
                } else {
                  const isFutureA = timeA >= nowMs
                  const isFutureB = timeB >= nowMs

                  if (isFutureA && !isFutureB) return -1
                  if (!isFutureA && isFutureB) return 1

                  if (isFutureA && isFutureB) {
                    return timeA - timeB // future chronological
                  } else {
                    return timeB - timeA // past descending
                  }
                }
              })

              return (
                <>
                  {isAdminOrStaff && (
                    <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
                      <input
                        type="text"
                        placeholder="Search bookings by name, email or court..."
                        value={bookingSearch}
                        onChange={e => setBookingSearch(e.target.value)}
                        style={{
                          width: '100%',
                          height: '38px',
                          padding: '0 16px 0 38px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--color-border)',
                          background: 'var(--color-surface)',
                          color: 'var(--color-text-primary)',
                          fontSize: '13px',
                          fontWeight: 500,
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                      <Search size={14} style={{ position: 'absolute', left: 14, top: 12, color: 'var(--color-text-disabled)' }} />
                    </div>
                  )}

                  {sortedList.length === 0 ? (
                    <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: '60px 24px', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
                      <Calendar size={40} color="var(--color-text-disabled)" style={{ margin: '0 auto 16px' }} />
                      <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                        {bookingSearch ? 'No matching bookings found' : 'No bookings scheduled'}
                      </h3>
                      <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '8px' }}>
                        {bookingSearch ? 'Try checking your search spelling or searching for a different user.' : 'No court reservations found on this date range.'}
                      </p>
                    </div>
                  ) : (
                    <div style={{ 
                      background: 'var(--color-card)', 
                      border: '1px solid var(--color-border)', 
                      borderRadius: 'var(--radius-xl)', 
                      overflowX: 'hidden',
                      overflowY: 'auto', 
                      maxHeight: '720px', 
                      boxShadow: 'var(--shadow-sm)' 
                    }}>
                      {sortedList.map((b, i) => {
                        const isOP = 'userRole' in b && (b.userRole === 'ADMIN' || b.userRole === 'STAFF')
                        const priceVal = isOP ? 0.00 : ('price' in b ? b.price : bookingPricePerHour)
                        const userNameStr = isOP ? 'Open Play' : ('userName' in b ? b.userName : 'Member')

                        return (
                          <div key={b.id} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '16px 24px',
                            borderBottom: i < sortedList.length - 1 ? '1px solid var(--color-border)' : 'none',
                            flexWrap: 'wrap', gap: '12px'
                          }}>
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                              <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'var(--color-primary-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <MapPin size={18} color="var(--color-primary)" />
                              </div>
                              <div>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{b.courtName}</div>
                                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Clock size={11} />
                                    {new Date(b.startTime).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', timeZone: 'Asia/Manila' })} •{' '}
                                    {new Date(b.startTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' })} – {new Date(b.endTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  {isAdminOrStaff && (
                                    <span style={{ fontWeight: 650, color: 'var(--color-text-primary)', fontSize: '11px', marginTop: '2px' }}>
                                      👤 Booked by: <span style={{ color: 'var(--color-primary)' }}>{userNameStr}</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                              <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-primary)' }}>₱{priceVal.toFixed(2)}</span>
                              <span style={{
                                fontSize: '10px', fontWeight: 800, padding: '3px 10px',
                                borderRadius: 'var(--radius-full)',
                                background: b.status === 'PAID' ? 'var(--color-success-subtle)' : b.status === 'PENDING' ? 'var(--color-warning-subtle)' : b.status === 'RESERVED' ? 'var(--color-info-subtle)' : 'var(--color-danger-subtle)',
                                color: b.status === 'PAID' ? 'var(--color-success)' : b.status === 'PENDING' ? 'var(--color-warning)' : b.status === 'RESERVED' ? 'var(--color-info)' : 'var(--color-danger)',
                                textTransform: 'uppercase', letterSpacing: '0.05em'
                              }}>
                                {b.status === 'PENDING' ? 'Unpaid' : b.status === 'RESERVED' ? 'Checked In' : b.status}
                              </span>
                              {(userRole === 'ADMIN' || userRole === 'STAFF') && b.status !== 'CANCELLED' && b.status !== 'EXPIRED' && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedDetailBooking(b)}
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 750,
                                    color: 'var(--color-danger)',
                                    background: 'var(--color-danger-subtle)',
                                    border: '1px solid rgba(239, 68, 68, 0.2)',
                                    padding: '5px 12px',
                                    borderRadius: 'var(--radius-md)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                >
                                  Cancel
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        )}

        {activeTab === 'passes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-fade-up">
            {(() => {
              const allPasses = myBookingsList.filter(b => 
                b.status === 'PENDING' || b.status === 'PAID' || b.status === 'RESERVED'
              )

              if (allPasses.length === 0) {
                return (
                  <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: '60px 24px', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
                    <QrCode size={40} color="var(--color-text-disabled)" style={{ margin: '0 auto 16px' }} />
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      No passes found
                    </h3>
                    <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '8px' }}>
                      You have no court reservations that require counter check-in.
                    </p>
                  </div>
                )
              }

              // Group consecutive passes on the same court, day, and status
              const groupedPasses = (() => {
                const sorted = [...allPasses].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                const grouped: any[] = []

                // Separate pending from others
                const pendingPasses = sorted.filter(p => p.status === 'PENDING')
                const otherPasses = sorted.filter(p => p.status !== 'PENDING')

                if (pendingPasses.length > 0) {
                  grouped.push({
                    ids: pendingPasses.map(p => p.id),
                    courtId: 'BULK',
                    courtName: 'Bulk Booking',
                    status: 'PENDING',
                    day: 'Multiple Days',
                    startTime: pendingPasses[0].startTime,
                    endTime: pendingPasses[pendingPasses.length - 1].endTime,
                    price: pendingPasses.reduce((sum, p) => sum + Number(p.price), 0),
                    isBulk: true,
                    bookingsList: pendingPasses.map(p => ({
                      id: p.id,
                      courtName: p.courtName,
                      startTime: p.startTime,
                      endTime: p.endTime,
                      price: Number(p.price)
                    }))
                  })
                }

                for (const pass of otherPasses) {
                  const passStart = new Date(pass.startTime).getTime()
                  const passDay = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(pass.startTime))

                  const matchingGroup = grouped.find(g => 
                    g.courtId === pass.courtId &&
                    g.status === pass.status &&
                    g.day === passDay &&
                    new Date(g.endTime).getTime() === passStart
                  )

                  if (matchingGroup) {
                    matchingGroup.ids.push(pass.id)
                    matchingGroup.endTime = pass.endTime
                    matchingGroup.price = Number(matchingGroup.price) + Number(pass.price)
                  } else {
                    grouped.push({
                      ids: [pass.id],
                      courtId: pass.courtId,
                      courtName: pass.courtName,
                      status: pass.status,
                      day: passDay,
                      startTime: pass.startTime,
                      endTime: pass.endTime,
                      price: Number(pass.price)
                    })
                  }
                }

                return grouped.map(g => ({
                  id: g.ids.join(','),
                  courtId: g.courtId,
                  courtName: g.courtName,
                  status: g.status,
                  startTime: g.startTime,
                  endTime: g.endTime,
                  price: g.price,
                  isBulk: g.isBulk || false,
                  bookingsList: g.bookingsList || null
                }))
              })()

              const sortedPasses = [...groupedPasses].sort((a, b) => {
                const now = Date.now()
                const aEnd = new Date(a.endTime).getTime()
                const bEnd = new Date(b.endTime).getTime()
                const aPast = aEnd < now
                const bPast = bEnd < now

                if (aPast && !bPast) return 1    // a is past, b is active -> a goes after b
                if (!aPast && bPast) return -1   // a is active, b is past -> a goes before b

                const aStart = new Date(a.startTime).getTime()
                const bStart = new Date(b.startTime).getTime()

                if (!aPast) {
                  // Both active: sort ascending (earlier/closer first, i.e. TODAY first)
                  return aStart - bStart
                } else {
                  // Both past: sort descending (most recent past first)
                  return bStart - aStart
                }
              })

              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                  {sortedPasses.map(pass => {
                    const isPending = pass.status === 'PENDING'
                    const isPaid = pass.status === 'PAID'
                    const isPast = new Date(pass.endTime).getTime() < Date.now()
                    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=BOOKING-PASS:bookingIds=${pass.id}`
                    
                    return (
                      <div key={pass.id} style={{
                        background: 'var(--color-card)',
                        border: `1.5px solid ${isPast ? 'var(--color-border)' : isPending ? 'var(--color-warning)' : 'var(--color-border)'}`,
                        borderRadius: 'var(--radius-xl)',
                        padding: '24px',
                        boxShadow: 'var(--shadow-md)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '16px',
                        position: 'relative',
                        opacity: isPast ? 0.55 : 1,
                        transition: 'opacity 0.2s ease'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                          <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                            {pass.courtName}
                          </span>
                          <span style={{
                            fontSize: '9px', fontWeight: 800, padding: '3px 8px',
                            borderRadius: 'var(--radius-full)',
                            background: isPast ? 'var(--color-surface-hover)' : isPending ? 'var(--color-warning-subtle)' : isPaid ? 'var(--color-success-subtle)' : 'var(--color-primary-subtle)',
                            color: isPast ? 'var(--color-text-secondary)' : isPending ? 'var(--color-warning)' : isPaid ? 'var(--color-success)' : 'var(--color-primary)',
                            textTransform: 'uppercase'
                          }}>
                            {isPast ? 'Past Session' : isPending ? 'Pay cash' : isPaid ? 'Paid' : 'Checked In'}
                          </span>
                        </div>

                        <div style={{
                          background: 'white',
                          padding: '12px',
                          borderRadius: 'var(--radius-lg)',
                          border: '1px solid var(--color-border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <img src={qrUrl} alt="Booking QR Pass" style={{ width: '150px', height: '150px', display: 'block', filter: isPast ? 'grayscale(1) contrast(0.8)' : 'none' }} />
                        </div>

                        <div style={{ fontSize: '11px', fontFamily: 'monospace', background: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '4px 8px', borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)' }}>
                          Pass ID: <strong>BK-{pass.id.split(',')[0].slice(-6).toUpperCase()}</strong>
                        </div>

                        {pass.isBulk && pass.bookingsList ? (
                          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>
                              Included Sessions ({pass.bookingsList.length})
                            </div>
                            <div style={{
                              maxHeight: '120px',
                              overflowY: 'auto',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px',
                              paddingRight: '2px',
                              border: '1px solid var(--color-border)',
                              borderRadius: 'var(--radius-md)',
                              background: 'var(--color-surface)',
                              padding: '6px'
                            }} className="custom-scrollbar">
                              {pass.bookingsList.map((b: any, idx: number) => (
                                <div key={b.id || idx} style={{
                                  padding: '6px',
                                  borderRadius: 'var(--radius-sm)',
                                  background: 'var(--color-card)',
                                  border: '1px solid var(--color-border)',
                                  fontSize: '11px',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center'
                                }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', textAlign: 'left' }}>
                                    <span style={{ fontWeight: 750, color: 'var(--color-text-primary)' }}>
                                      {b.courtName}
                                    </span>
                                    <span style={{ color: 'var(--color-text-secondary)', fontSize: '9.5px' }}>
                                      {new Date(b.startTime).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'Asia/Manila' })} • {new Date(b.startTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' })} – {new Date(b.endTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <span style={{ fontWeight: 800, color: 'var(--color-primary)' }}>
                                    ₱{b.price.toFixed(2)}
                                  </span>
                                </div>
                              ))}
                            </div>
                            <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-primary)', marginTop: '4px', textAlign: 'center' }}>
                              Total Fee: ₱{pass.price.toFixed(2)}
                            </div>
                          </div>
                        ) : (
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                              {new Date(pass.startTime).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'Asia/Manila' })}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                              {new Date(pass.startTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' })} – {new Date(pass.endTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div style={{ fontSize: '13px', fontWeight: 800, color: isPast ? 'var(--color-text-secondary)' : 'var(--color-primary)', marginTop: '8px' }}>
                              Fee: ₱{pass.price.toFixed(2)}
                            </div>
                          </div>
                        )}

                        <div style={{
                          width: '100%',
                          background: 'var(--color-surface)',
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '11px',
                          color: 'var(--color-text-secondary)',
                          lineHeight: '1.4',
                          textAlign: 'center',
                          boxSizing: 'border-box'
                        }}>
                          {isPast ? (
                            <span>This session has ended.</span>
                          ) : isPending ? (
                            <span>⚠️ Show this QR pass at the front counter to pay <strong>₱{pass.price.toFixed(2)}</strong>. You must pay within 5 mins of play time.</span>
                          ) : isPaid ? (
                            <span>🟢 Fully paid via credits. Scan this QR pass at the counter to verify your arrival and check in.</span>
                          ) : (
                            <span>✅ Checked in! Enjoy your game.</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>
        )}
      </div>
      {isModalOpen && (() => {
        const isAdminOrStaff = userRole === 'ADMIN' || userRole === 'STAFF'
        const court = courts.find(c => c.id === modalCourtId)
        const paidHours = modalHours.filter(h => !selectedVouchers[h])
        const totalCost = paidHours.reduce((sum, h) => sum + getHourlyRate(h, court?.type), 0)
        const hasInsufficientBalance = !isAdminOrStaff && userBalance < totalCost

        return (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.40)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10000
          }}>
            <div style={{
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-xl)',
              padding: '28px',
              maxWidth: '520px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxSizing: 'border-box',
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              position: 'relative'
            }} className="animate-fade-up">
              {/* Close button */}
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  position: 'absolute', top: 20, right: 20,
                  border: 'none', background: 'transparent',
                  cursor: 'pointer', color: 'var(--color-text-secondary)'
                }}
              >
                <X size={18} />
              </button>

              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
                  {isAdminOrStaff ? 'Book | Reserve Open Play Court' : 'Book a Court'}
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px', margin: '4px 0 0' }}>
                  {isAdminOrStaff
                    ? 'Choose booking type: reserve for Open Play or book on behalf of a player.'
                    : 'Select court, date, and hourly slots to complete your reservation.'}
                </p>
              </div>

              {/* Admin: Mode selector */}
              {isAdminOrStaff && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {/* Row 1: Open Play Reserve + Player Booking */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => { setAdminBookingMode('openplay'); setSelectedPlayer(null); setPlayerSearch(''); setGuestName(''); }}
                      style={{
                        flex: 1, height: '38px', borderRadius: 'var(--radius-md)',
                        border: adminBookingMode === 'openplay' ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
                        background: adminBookingMode === 'openplay' ? 'var(--color-primary-subtle)' : 'var(--color-card)',
                        color: adminBookingMode === 'openplay' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                        fontWeight: 700, fontSize: '12px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                        transition: 'all 0.15s'
                      }}
                    >
                      <Users size={14} /> Open Play Reserve
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAdminBookingMode('player_booking'); setModalCourtIds([]); setGuestName(''); }}
                      style={{
                        flex: 1, height: '38px', borderRadius: 'var(--radius-md)',
                        border: adminBookingMode === 'player_booking' ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
                        background: adminBookingMode === 'player_booking' ? 'var(--color-primary-subtle)' : 'var(--color-card)',
                        color: adminBookingMode === 'player_booking' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                        fontWeight: 700, fontSize: '12px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                        transition: 'all 0.15s'
                      }}
                    >
                      <User size={14} /> Player Booking
                    </button>
                  </div>
                  {/* Row 2: No Account Player Booking (full width) */}
                  <button
                    type="button"
                    onClick={() => { setAdminBookingMode('no_account'); setModalCourtIds([]); setSelectedPlayer(null); setPlayerSearch(''); }}
                    style={{
                      width: '100%', height: '38px', borderRadius: 'var(--radius-md)',
                      border: adminBookingMode === 'no_account' ? '1.5px solid #f59e0b' : '1px solid var(--color-border)',
                      background: adminBookingMode === 'no_account' ? '#fffbeb' : 'var(--color-card)',
                      color: adminBookingMode === 'no_account' ? '#d97706' : 'var(--color-text-secondary)',
                      fontWeight: 700, fontSize: '12px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      transition: 'all 0.15s'
                    }}
                  >
                    <Users size={14} /> No Account Player Booking
                  </button>
                </div>
              )}

              {/* Inputs */}
              {isAdminOrStaff && adminBookingMode === 'no_account' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Info strip */}
                  <div style={{
                    background: '#fffbeb', border: '1px solid #fcd34d',
                    borderRadius: 'var(--radius-md)', padding: '10px 14px',
                    fontSize: '12px', color: '#92400e', display: 'flex', gap: '8px', alignItems: 'center'
                  }}>
                    <Users size={14} color="#d97706" style={{ flexShrink: 0 }} />
                    <span>Walk-in guest with <strong>no South Rally account</strong>. This booking will be recorded for tracking only.</span>
                  </div>

                  {/* Player Full Name (full width) */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Player Full Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Juan dela Cruz"
                        value={guestName}
                        onChange={e => setGuestName(e.target.value)}
                        style={{
                          width: '100%', height: '38px', padding: '0 12px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--color-border)',
                          background: 'var(--color-surface)', color: 'var(--color-text-primary)',
                          fontSize: '13px', fontWeight: 500, outline: 'none', boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  {/* Court + Date */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Court</label>
                      <select
                        value={modalCourtId}
                        onChange={e => { setModalCourtId(e.target.value); setModalHours([]); }}
                        style={{
                          width: '100%', height: '38px', padding: '0 10px',
                          borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
                          background: 'var(--color-surface)', color: 'var(--color-text-primary)',
                          fontSize: '13px', fontWeight: 600, outline: 'none'
                        }}
                      >
                        {courts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Date</label>
                      <input
                        type="date"
                        value={modalDate}
                        min={formatDateToYYYYMMDD(new Date())}
                        onChange={e => { setModalDate(e.target.value); setModalHours([]); }}
                        style={{
                          width: '100%', height: '38px', padding: '0 10px',
                          borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
                          background: 'var(--color-surface)', color: 'var(--color-text-primary)',
                          fontSize: '13px', fontWeight: 600, outline: 'none', boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>
                </div>
              ) : isAdminOrStaff && adminBookingMode === 'player_booking' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Player Search */}
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Search Player (Name, Email, or ID)</label>
                    <div style={{ position: 'relative' }}>
                      <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-disabled)' }} />
                      <input
                        type="text"
                        placeholder="Type name, email, or ID..."
                        value={playerSearch}
                        onChange={e => { setPlayerSearch(e.target.value); setSelectedPlayer(null); }}
                        style={{
                          width: '100%', height: '38px', paddingLeft: '32px', paddingRight: '10px',
                          borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
                          background: 'var(--color-surface)', color: 'var(--color-text-primary)',
                          fontSize: '13px', fontWeight: 500, outline: 'none', boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    {/* Search results */}
                    {playerSearch.trim().length >= 2 && !selectedPlayer && (() => {
                      const query = playerSearch.toLowerCase()
                      const filtered = players.filter(p =>
                        p.name.toLowerCase().includes(query) ||
                        p.email.toLowerCase().includes(query) ||
                        p.id.toLowerCase().includes(query)
                      ).slice(0, 6)
                      return filtered.length > 0 ? (
                        <div style={{
                          marginTop: '6px',
                          background: 'var(--color-card)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-md)',
                          overflow: 'hidden',
                          overflowY: 'auto',
                          maxHeight: '180px',
                          boxShadow: 'var(--shadow-md)'
                        }}>
                          {filtered.map(p => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => { setSelectedPlayer(p); setPlayerSearch(p.name); }}
                              style={{
                                width: '100%', padding: '10px 14px',
                                background: 'none', border: 'none', borderBottom: '1px solid var(--color-border-subtle)',
                                cursor: 'pointer', textAlign: 'left',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                              }}
                            >
                              <div>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{p.name}</div>
                                <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{p.email}</div>
                              </div>
                              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary)' }}>₱{p.credits.toFixed(2)}</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--color-text-secondary)', padding: '8px 0' }}>No players found.</div>
                      )
                    })()}
                  </div>

                  {/* Selected Player Card */}
                  {selectedPlayer && (
                    <div style={{
                      padding: '12px 14px',
                      background: 'var(--color-primary-subtle)',
                      border: '1.5px solid var(--color-primary)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-primary)' }}>{selectedPlayer.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{selectedPlayer.email}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                          Balance: <strong style={{ color: 'var(--color-primary)' }}>₱{selectedPlayer.credits.toFixed(2)}</strong>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setSelectedPlayer(null); setPlayerSearch(''); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}

                  {/* Court Selector (single court) */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Court</label>
                      <select
                        value={modalCourtId}
                        onChange={e => { setModalCourtId(e.target.value); setModalHours([]); }}
                        style={{
                          width: '100%', height: '38px', padding: '0 10px',
                          borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
                          background: 'var(--color-surface)', color: 'var(--color-text-primary)',
                          fontSize: '13px', fontWeight: 600, outline: 'none'
                        }}
                      >
                        {courts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Date</label>
                      <input
                        type="date"
                        value={modalDate}
                        min={formatDateToYYYYMMDD(new Date())}
                        onChange={e => { setModalDate(e.target.value); setModalHours([]); }}
                        style={{
                          width: '100%', height: '38px', padding: '0 10px',
                          borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
                          background: 'var(--color-surface)', color: 'var(--color-text-primary)',
                          fontSize: '13px', fontWeight: 600, outline: 'none', boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>
                </div>
              ) : isAdminOrStaff ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Date Input */}
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Date</label>
                    <input
                      type="date"
                      value={modalDate}
                      min={formatDateToYYYYMMDD(new Date())}
                      onChange={e => { setModalDate(e.target.value); setModalHours([]); }}
                      style={{
                        width: '100%', height: '38px', padding: '0 10px',
                        borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
                        background: 'var(--color-surface)', color: 'var(--color-text-primary)',
                        fontSize: '13px', fontWeight: 600, outline: 'none', boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Multi-court select checkbox tags */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                        Select Court(s)
                      </label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => setModalCourtIds(courts.map(c => c.id))}
                          style={{ fontSize: '10px', color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}
                        >
                          Select All
                        </button>
                        <span style={{ fontSize: '10px', color: 'var(--color-text-disabled)' }}>|</span>
                        <button
                          type="button"
                          onClick={() => setModalCourtIds([])}
                          style={{ fontSize: '10px', color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}
                        >
                          Clear All
                        </button>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                      {courts.map(court => {
                        const isSelected = modalCourtIds.includes(court.id)
                        return (
                          <button
                            key={court.id}
                            type="button"
                            onClick={() => {
                              setModalCourtIds(prev => 
                                prev.includes(court.id)
                                  ? prev.filter(id => id !== court.id)
                                  : [...prev, court.id]
                              )
                            }}
                            style={{
                              height: '34px',
                              borderRadius: 'var(--radius-md)',
                              border: isSelected ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
                              background: isSelected ? 'var(--color-primary-subtle)' : 'var(--color-card)',
                              color: isSelected ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all var(--duration-fast)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            {court.name}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Court</label>
                    <select
                      value={modalCourtId}
                      onChange={e => { setModalCourtId(e.target.value); setModalHours([]); }}
                      style={{
                        width: '100%', height: '38px', padding: '0 10px',
                        borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
                        background: 'var(--color-surface)', color: 'var(--color-text-primary)',
                        fontSize: '13px', fontWeight: 600, outline: 'none'
                      }}
                    >
                      {courts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Date</label>
                    <input
                      type="date"
                      value={modalDate}
                      min={formatDateToYYYYMMDD(new Date())}
                      onChange={e => { setModalDate(e.target.value); setModalHours([]); }}
                      style={{
                        width: '100%', height: '38px', padding: '0 10px',
                        borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
                        background: 'var(--color-surface)', color: 'var(--color-text-primary)',
                        fontSize: '13px', fontWeight: 600, outline: 'none', boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Hour slot selection grid */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Select Time Slot</label>
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px',
                  maxHeight: '200px', overflowY: 'auto', paddingRight: '4px'
                }}>
                  {HOURS.map(hour => {
                    const isBooked = isSlotBookedInModal(hour)
                    const isPast = isSlotInPastInModal(hour)
                    const isSelected = modalHours.includes(hour)

                    let btnBg = 'var(--color-card)'
                    let btnColor = 'var(--color-text-primary)'
                    let btnBorder = '1px solid var(--color-border)'
                    let cursorType = 'pointer'

                    if (isBooked) {
                      btnBg = 'rgba(239, 68, 68, 0.08)'
                      btnColor = 'var(--color-danger)'
                      btnBorder = '1px solid rgba(239, 68, 68, 0.25)'
                      cursorType = 'not-allowed'
                    } else if (isPast) {
                      btnBg = 'var(--color-surface)'
                      btnColor = 'var(--color-text-disabled)'
                      btnBorder = '1px solid var(--color-border-subtle)'
                      cursorType = 'not-allowed'
                    } else if (isSelected) {
                      btnBg = 'var(--color-primary)'
                      btnColor = 'white'
                      btnBorder = '1px solid var(--color-primary)'
                    }

                    return (
                      <button
                        key={hour}
                        disabled={isBooked || isPast}
                        onClick={() => toggleHourSelection(hour)}
                        style={{
                          height: '36px',
                          borderRadius: 'var(--radius-md)',
                          border: btnBorder,
                          background: btnBg,
                          color: btnColor,
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: cursorType,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all var(--duration-fast)',
                          boxSizing: 'border-box'
                        }}
                      >
                        <span>{formatHour(hour).split(' ')[0]}</span>
                        <span style={{ fontSize: '8px', opacity: 0.8 }}>{formatHour(hour).split(' ')[1]}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Voucher Application Section (Player booking only) */}
              {!isAdminOrStaff && courtVouchers.length > 0 && modalHours.length > 0 && (
                <div style={{
                  display: 'flex', flexDirection: 'column', gap: '8px',
                  background: 'var(--color-surface)', padding: '12px',
                  borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)'
                }}>
                  <label style={{
                    fontSize: '11px', fontWeight: 700, color: 'var(--color-primary)',
                    textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px'
                  }}>
                    <Gift size={12} />
                    Apply Court Time Vouchers
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                    {modalHours.map(hour => {
                      const appliedVoucherId = selectedVouchers[hour] || ''
                      const availableVouchers = courtVouchers.filter(v => {
                        const boundHour = Object.keys(selectedVouchers).find(h => selectedVouchers[parseInt(h)] === v.id)
                        return !boundHour || parseInt(boundHour) === hour
                      })

                      return (
                        <div key={hour} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          gap: '12px', background: 'var(--color-card)', padding: '6px 10px',
                          borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-subtle)'
                        }}>
                          <span style={{ fontSize: '12px', fontWeight: 650, color: 'var(--color-text-primary)' }}>
                            {formatHour(hour)} slot:
                          </span>
                          <select
                            value={appliedVoucherId}
                            onChange={e => {
                              const val = e.target.value
                              setSelectedVouchers(prev => {
                                const copy = { ...prev }
                                if (val) {
                                  copy[hour] = val
                                } else {
                                  delete copy[hour]
                                }
                                return copy
                              })
                            }}
                            style={{
                              padding: '4px 8px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--color-border)',
                              background: 'var(--color-surface)',
                              color: 'var(--color-text-primary)',
                              fontSize: '12px',
                              fontWeight: 600,
                              outline: 'none'
                            }}
                          >
                            <option value="">No Voucher (Credits/Cash)</option>
                            {availableVouchers.map(v => (
                              <option key={v.id} value={v.id}>
                                {v.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Payment Method - Enforce Credits payment only for players */}
              {!isAdminOrStaff && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                    Payment Method
                  </label>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1.5px solid var(--color-primary)',
                    background: 'var(--color-primary-subtle)',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary)' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                        Pay with Credits (Wallet)
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                        Payment will be deducted instantly from your credits balance.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Info Summary */}
              {(() => {
                const isPlayerBookingMode = isAdminOrStaff && adminBookingMode === 'player_booking'
                const isNoAccountMode = isAdminOrStaff && adminBookingMode === 'no_account'
                const playerHourlyRate = isPlayerBookingMode ? (() => {
                  const c = courts.find(c => c.id === modalCourtId)
                  // For player booking mode, use average of selected slots for simplicity
                  const paidSlots = modalHours.filter(h => !selectedVouchers[h])
                  const avg = paidSlots.length > 0
                    ? paidSlots.reduce((s, h) => s + getHourlyRate(h, c?.type), 0) / paidSlots.length
                    : getHourlyRate(modalHours[0] ?? 8, c?.type)
                  return avg
                })() : (paidHours.length > 0 ? totalCost / paidHours.length : getHourlyRate(modalHours[0] ?? 8, court?.type))
                const playerTotalCost = isPlayerBookingMode ? (() => {
                  const c = courts.find(c => c.id === modalCourtId)
                  return modalHours.filter(h => !selectedVouchers[h]).reduce((s, h) => s + getHourlyRate(h, c?.type), 0)
                })() : totalCost
                const playerInsufficientBalance = isPlayerBookingMode && selectedPlayer ? selectedPlayer.credits < playerTotalCost : false
                const isConfirmDisabled = isPending ||
                  modalHours.length === 0 ||
                  (isNoAccountMode ? (!guestName.trim() || !modalCourtId) :
                  isPlayerBookingMode ? (!selectedPlayer || !modalCourtId || playerInsufficientBalance) :
                    isAdminOrStaff ? modalCourtIds.length === 0 :
                    (!modalCourtId || (selectedPaymentMethod === 'credits' && hasInsufficientBalance)))

                return (
                  <>
                    <div style={{
                      background: 'var(--color-surface)', borderRadius: 'var(--radius-md)',
                      padding: '12px 14px', border: '1px solid var(--color-border)',
                      display: 'flex', flexDirection: 'column', gap: '6px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                        <span>Court Fee</span>
                        <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>
                          {isNoAccountMode
                            ? `₱${modalHours.reduce((s, h) => s + getHourlyRate(h, court?.type), 0).toFixed(2)} (${modalHours.length} slot${modalHours.length > 1 ? 's' : ''}, guest)`
                            : isPlayerBookingMode
                            ? `₱${playerTotalCost.toFixed(2)} (${modalHours.length} slot${modalHours.length > 1 ? 's' : ''})`
                            : isAdminOrStaff
                              ? `₱0.00 (Open Play block on ${modalCourtIds.length} court${modalCourtIds.length > 1 ? 's' : ''})`
                              : `₱${totalCost.toFixed(2)}`}
                        </span>
                      </div>
                      {isNoAccountMode && guestName.trim() && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                          <span>Guest Name</span>
                          <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{guestName.trim()}</span>
                        </div>
                      )}

                      {isPlayerBookingMode && selectedPlayer && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                          <span>Player Balance</span>
                          <span style={{ fontWeight: 700, color: selectedPlayer.credits >= playerTotalCost ? 'var(--color-success)' : 'var(--color-danger)' }}>
                            ₱{selectedPlayer.credits.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {isPlayerBookingMode && playerInsufficientBalance && (
                        <div style={{
                          color: 'var(--color-danger)', fontSize: '11px', fontWeight: 700,
                          marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px',
                          background: 'rgba(239, 68, 68, 0.05)', padding: '8px 12px', borderRadius: '6px',
                          border: '1px solid rgba(239, 68, 68, 0.2)', width: '100%', boxSizing: 'border-box'
                        }}>
                          <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                          <span>Insufficient credits. Required: ₱{playerTotalCost.toFixed(2)}, Available: ₱{selectedPlayer?.credits.toFixed(2)}.</span>
                        </div>
                      )}
                      {!isAdminOrStaff && (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                            <span>Account Balance</span>
                            <span style={{ fontWeight: 700 }}>₱{userBalance.toFixed(2)}</span>
                          </div>
                          {hasInsufficientBalance && (
                            <div style={{
                              color: 'var(--color-danger)', fontSize: '11px', fontWeight: 700,
                              marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px',
                              background: 'rgba(239, 68, 68, 0.05)', padding: '8px 12px', borderRadius: '6px',
                              border: '1px solid rgba(239, 68, 68, 0.2)', width: '100%', boxSizing: 'border-box'
                            }}>
                              <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                              <span>Insufficient Credits. Required: ₱{totalCost.toFixed(2)}, Available: ₱{userBalance.toFixed(2)}.</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                      <button
                        onClick={() => setIsModalOpen(false)}
                        style={{
                          height: '38px', padding: '0 16px', borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--color-border)', background: 'var(--color-card)',
                          color: 'var(--color-text-primary)', fontSize: '13px', fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        disabled={isConfirmDisabled}
                        onClick={handleConfirmBooking}
                        style={{
                          height: '38px', padding: '0 16px', borderRadius: 'var(--radius-md)',
                          border: 'none', background: 'var(--color-primary)',
                          color: 'white', fontSize: '13px', fontWeight: 700,
                          cursor: isConfirmDisabled ? 'not-allowed' : 'pointer',
                          boxShadow: 'var(--shadow-primary-btn)',
                          opacity: isConfirmDisabled ? 0.6 : 1
                        }}
                      >
                        {isPending
                          ? (isNoAccountMode ? 'Recording...' : isPlayerBookingMode ? 'Booking...' : isAdminOrStaff ? 'Reserving...' : 'Booking...')
                          : (isNoAccountMode ? `Record Guest Booking` : isPlayerBookingMode ? `Book for ${selectedPlayer?.name || 'Player'}` : isAdminOrStaff ? 'Confirm Reservation' : 'Confirm Booking')}
                      </button>
                    </div>
                  </>
                )
              })()}
            </div>
          </div>
        )
      })()}

      {selectedDetailBooking && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.40)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '20px'
        }}>
          <div style={{
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            width: '100%',
            maxWidth: '440px',
            padding: '24px',
            boxShadow: 'var(--shadow-xl)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            position: 'relative'
          }} className="animate-fade-up">
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                Reservation Details
              </h3>
              <button 
                type="button"
                onClick={() => {
                  setSelectedDetailBooking(null)
                  setIsCancelConfirmOpen(false)
                }}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Info Container */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: 'var(--color-surface)', padding: '12px 14px', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>Pass ID:</span>
                  <strong style={{ color: 'var(--color-text-primary)' }}>
                    BK-{selectedDetailBooking.id.split(',')[0].slice(-6).toUpperCase()}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>Court:</span>
                  <strong style={{ color: 'var(--color-text-primary)' }}>
                    {selectedDetailBooking.courtName}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>Player Name:</span>
                  <strong style={{ color: 'var(--color-primary)' }}>
                    {selectedDetailBooking.userName || 'Member'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>Email:</span>
                  <strong style={{ color: 'var(--color-text-primary)', wordBreak: 'break-all' }}>
                    {selectedDetailBooking.userEmail || 'N/A'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>Schedule:</span>
                  <strong style={{ color: 'var(--color-text-primary)' }}>
                    {new Date(selectedDetailBooking.startTime).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'Asia/Manila' })} • {new Date(selectedDetailBooking.startTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' })}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>Status:</span>
                  <span style={{
                    fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px',
                    background: selectedDetailBooking.status === 'PAID' ? 'var(--color-success-subtle)' : selectedDetailBooking.status === 'PENDING' ? 'var(--color-warning-subtle)' : selectedDetailBooking.status === 'RESERVED' ? 'var(--color-info-subtle)' : 'var(--color-danger-subtle)',
                    color: selectedDetailBooking.status === 'PAID' ? 'var(--color-success)' : selectedDetailBooking.status === 'PENDING' ? 'var(--color-warning)' : selectedDetailBooking.status === 'RESERVED' ? 'var(--color-info)' : 'var(--color-danger)',
                    textTransform: 'uppercase'
                  }}>
                    {selectedDetailBooking.status === 'PENDING' ? 'Unpaid' : selectedDetailBooking.status === 'RESERVED' ? 'Checked In' : selectedDetailBooking.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Confirmation Area vs Regular Action Area */}
            {!isCancelConfirmOpen ? (
              <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDetailBooking(null)
                  }}
                  style={{
                    flex: 1, height: '38px', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)', background: 'var(--color-surface)',
                    color: 'var(--color-text-primary)', fontSize: '13px', fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  Close Details
                </button>
                {selectedDetailBooking.status !== 'CANCELLED' && selectedDetailBooking.status !== 'EXPIRED' && (
                  <button
                    type="button"
                    onClick={() => setIsCancelConfirmOpen(true)}
                    style={{
                      flex: 1, height: '38px', borderRadius: 'var(--radius-md)',
                      border: 'none', background: '#ef4444',
                      color: 'white', fontSize: '13px', fontWeight: 700, cursor: 'pointer'
                    }}
                  >
                    Cancel Booking
                  </button>
                )}
              </div>
            ) : (
              <div style={{
                display: 'flex', flexDirection: 'column', gap: '12px',
                background: 'rgba(239, 68, 68, 0.03)', border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: 'var(--radius-lg)', padding: '14px', marginTop: '4px'
              }}>
                <div style={{ display: 'flex', gap: '8px', color: '#ef4444' }}>
                  <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ fontSize: '12px', fontWeight: 650, lineHeight: 1.4, textAlign: 'left' }}>
                    Are you sure you want to cancel this booking? This action is irreversible.
                    {selectedDetailBooking.status === 'PAID' && (
                      <span style={{ display: 'block', marginTop: '4px', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                        • Credits paid will be refunded to the player's account.
                        <br />• If a voucher was used, it will be reactivated automatically.
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => setIsCancelConfirmOpen(false)}
                    style={{
                      flex: 1, height: '32px', borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)', background: 'var(--color-card)',
                      color: 'var(--color-text-secondary)', fontSize: '12px', fontWeight: 700, cursor: 'pointer'
                    }}
                  >
                    No, Go Back
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      startTransition(async () => {
                        const res = await adminCancelBookingAction(selectedDetailBooking.id)
                        if (res.success) {
                          setMessage({ success: true, text: res.message || 'Booking cancelled successfully.' })
                          setSelectedDetailBooking(null)
                          setIsCancelConfirmOpen(false)
                          router.refresh()
                        } else {
                          setMessage({ success: false, text: res.error || 'Failed to cancel booking.' })
                          setIsCancelConfirmOpen(false)
                        }
                      })
                    }}
                    style={{
                      flex: 1, height: '32px', borderRadius: 'var(--radius-md)',
                      border: 'none', background: '#ef4444',
                      color: 'white', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}
                  >
                    {isPending ? 'Cancelling...' : 'Yes, Cancel'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .slot-open:hover {
          background: var(--color-primary-subtle) !important;
          color: var(--color-primary) !important;
        }
      `}</style>
    </>
  )
}
