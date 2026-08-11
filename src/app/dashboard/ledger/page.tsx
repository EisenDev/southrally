import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { LedgerClient } from './ledger-client'
import { getSignupPromoCreditUsersAction } from '@/lib/actions/admin'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{
    tab?: string
    range?: string
  }>
}

export default async function LedgerPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session?.user?.email) return null

  const resolvedParams = await searchParams
  const activeTab = resolvedParams.tab || 'bookings'
  const range = resolvedParams.range || '48h'

  // Fetch current user details
  const user = await db.user.findUnique({
    where: { email: session.user.email }
  })
  if (!user) return null

  const isAdminOrStaff = user.role === 'ADMIN' || user.role === 'STAFF'

  // Calculate range filter date threshold
  let dateFilter = undefined
  const now = new Date()
  if (range === '48h') {
    dateFilter = new Date(now.getTime() - 48 * 3600 * 1000)
  } else if (range === '1m') {
    dateFilter = new Date(now.getTime() - 30 * 24 * 3600 * 1000)
  } else if (range === '3m') {
    dateFilter = new Date(now.getTime() - 90 * 24 * 3600 * 1000)
  } else if (range === '1y') {
    dateFilter = new Date(now.getTime() - 365 * 24 * 3600 * 1000)
  }

  // Fetch transactions based on role
  let transactions = []
  if (isAdminOrStaff) {
    transactions = await db.transaction.findMany({
      where: dateFilter ? { createdAt: { gte: dateFilter } } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } }
      }
    })
  } else {
    transactions = await db.transaction.findMany({
      where: {
        userId: user.id,
        ...(dateFilter ? { createdAt: { gte: dateFilter } } : {})
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  // Calculate income stats (from cash TOPUPs, CASH_TOPUPs, and guest REFUNDs) for admin dashboard
  let stats = { day: 0, week: 0, month: 0, year: 0 }
  if (isAdminOrStaff) {
    const allStatsTransactions = await db.transaction.findMany({
      where: { type: { in: ['TOPUP', 'CASH_TOPUP', 'REFUND'] } },
      include: {
        user: { select: { email: true } }
      }
    })

    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const startOfWeek = now.getTime() - 7 * 24 * 60 * 60 * 1000
    const startOfMonth = now.getTime() - 30 * 24 * 60 * 60 * 1000
    const startOfYear = now.getTime() - 365 * 24 * 60 * 60 * 1000

    let dSum = 0
    let wSum = 0
    let mSum = 0
    let ySum = 0

    for (const t of allStatsTransactions) {
      const tTime = t.createdAt.getTime()
      const isGuestRefund = t.type === 'REFUND' && (t.user?.email?.endsWith('@southrally.guest') ?? false)
      if (t.type === 'REFUND' && !isGuestRefund) continue

      const amt = isGuestRefund ? -Number(t.amount) : Number(t.amount)
      if (tTime >= startOfToday) dSum += amt
      if (tTime >= startOfWeek) wSum += amt
      if (tTime >= startOfMonth) mSum += amt
      if (tTime >= startOfYear) ySum += amt
    }

    stats = { day: dSum, week: wSum, month: mSum, year: ySum }
  }

  // Query Bookings Ledger
  const bookingsFilter: any = {}
  if (!isAdminOrStaff) {
    bookingsFilter.userId = user.id
  }
  if (dateFilter) {
    bookingsFilter.startTime = { gte: dateFilter }
  }

  const bookings = await db.booking.findMany({
    where: bookingsFilter,
    include: {
      court: { select: { id: true, name: true, number: true } },
      user: { select: { id: true, name: true, email: true } }
    },
    orderBy: { startTime: 'desc' }
  })

  // Format database types to frontend schema
  const formattedTransactions = transactions.map((t: any) => ({
    id: t.id,
    amount: Number(t.amount),
    type: t.type,
    reference: t.reference,
    createdAt: t.createdAt,
    userName: t.user?.name || undefined,
    userEmail: t.user?.email || undefined
  }))

  const formattedBookings = bookings.map((b: any) => ({
    id: b.id,
    courtName: b.court.name,
    courtNumber: b.court.number,
    startTime: b.startTime,
    endTime: b.endTime,
    status: b.status,
    price: Number(b.price),
    userName: b.user.name || 'Member',
    userEmail: b.user.email
  }))

  // Fetch online payment receipts (transactions of type TOPUP starting with ONLINE_PAYMENT_RECEIPT|)
  let onlineReceipts: any[] = []
  if (isAdminOrStaff) {
    const receipts = await db.transaction.findMany({
      where: {
        type: 'TOPUP',
        reference: { startsWith: 'ONLINE_PAYMENT_RECEIPT|' }
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    onlineReceipts = receipts.map(r => {
      const parts = (r.reference || '').split('|')
      const receiptImage = parts[1] || ''
      return {
        id: r.id,
        amount: Number(r.amount),
        createdAt: r.createdAt.toISOString(),
        userName: r.user?.name || 'Player',
        userEmail: r.user?.email || '',
        paymentFor: 'Credit Top-Up',
        receiptImage
      }
    })
  }

  // Fetch launch/signup promo credit data (admin only)
  let launchCreditUsers: any[] = []
  if (isAdminOrStaff) {
    const promoRes = await getSignupPromoCreditUsersAction()
    if (promoRes.success && promoRes.users) {
      launchCreditUsers = promoRes.users
    }
  }

  return (
    <LedgerClient
      transactions={formattedTransactions}
      bookings={formattedBookings}
      onlineReceipts={onlineReceipts}
      launchCreditUsers={launchCreditUsers}
      userBalance={Number(user.credits)}
      userRole={user.role}
      stats={stats}
      initialTab={activeTab}
      initialRange={range}
    />
  )
}
