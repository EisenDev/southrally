import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { AnalyticsClient } from './analytics-client'

export const dynamic = 'force-dynamic'

export default async function AnalyticsPage() {
  const session = await auth()
  if (!session?.user?.email) {
    redirect('/')
  }

  // Load user details
  const user = await db.user.findUnique({
    where: { email: session.user.email }
  })

  // Security: Only ADMIN can access
  if (!user || user.role !== 'ADMIN') {
    redirect('/dashboard')
  }

  // 1. Fetch raw datasets
  const allUsers = await db.user.findMany({
    select: {
      id: true,
      membership: true,
      credits: true,
      createdAt: true,
      role: true
    }
  })

  const allTransactions = await db.transaction.findMany({
    select: {
      type: true,
      amount: true,
      createdAt: true,
      user: {
        select: {
          email: true
        }
      }
    }
  })

  const allBookings = await db.booking.findMany({
    select: {
      id: true,
      status: true,
      price: true,
      startTime: true,
      endTime: true,
      courtId: true,
      court: {
        select: {
          name: true,
          number: true
        }
      }
    }
  })

  const courts = await db.court.findMany({
    select: {
      id: true,
      name: true,
      number: true
    }
  })

  // 2. Member KPIs
  const totalPlayers = allUsers.filter(u => u.role !== 'ADMIN').length
  const membershipDistribution = {
    STANDARD: allUsers.filter(u => u.membership === 'STANDARD' && u.role !== 'ADMIN').length,
    VIP: allUsers.filter(u => u.membership === 'VIP' && u.role !== 'ADMIN').length,
    PRO: allUsers.filter(u => u.membership === 'PRO' && u.role !== 'ADMIN').length,
  }
  const totalWalletCredits = allUsers.reduce((sum, u) => sum + Number(u.credits), 0)

  // 3. Financial KPIs (Dynamic date calculations)
  const now = new Date()
  
  // Date boundaries
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOf7DaysAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000)
  const startOf30DaysAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000)
  const startOf365DaysAgo = new Date(now.getTime() - 365 * 24 * 3600 * 1000)

  let revenueToday = 0
  let revenue7Days = 0
  let revenue30Days = 0
  let revenue365Days = 0
  let revenueLifetime = 0

  for (const tx of allTransactions) {
    const isTopup = tx.type === 'TOPUP' || tx.type === 'CASH_TOPUP'
    const isGuestRefund = tx.type === 'REFUND' && (tx.user?.email?.endsWith('@southrally.guest') ?? false)
    if (!isTopup && !isGuestRefund) continue

    const txTime = tx.createdAt.getTime()
    const amt = isGuestRefund ? -Number(tx.amount) : Number(tx.amount)

    revenueLifetime += amt
    if (txTime >= startOfToday.getTime()) revenueToday += amt
    if (txTime >= startOf7DaysAgo.getTime()) revenue7Days += amt
    if (txTime >= startOf30DaysAgo.getTime()) revenue30Days += amt
    if (txTime >= startOf365DaysAgo.getTime()) revenue365Days += amt
  }

  // 4. 7-Day Daily Revenue Trend
  const dailyRevenueTrend: { date: string; amount: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 3600 * 1000)
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
    const dayEnd = dayStart + 24 * 3600 * 1000

    const dayAmount = allTransactions
      .filter(tx => {
        const isTopup = tx.type === 'TOPUP' || tx.type === 'CASH_TOPUP'
        const isGuestRefund = tx.type === 'REFUND' && (tx.user?.email?.endsWith('@southrally.guest') ?? false)
        const txTime = tx.createdAt.getTime()
        return (isTopup || isGuestRefund) && txTime >= dayStart && txTime < dayEnd
      })
      .reduce((sum, tx) => {
        const amt = tx.type === 'REFUND' ? -Number(tx.amount) : Number(tx.amount)
        return sum + amt
      }, 0)

    const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    dailyRevenueTrend.push({ date: label, amount: dayAmount })
  }

  // 5. Booking & Conversion KPIs
  const totalBookingsCount = allBookings.length
  const statusCounts = {
    PAID: allBookings.filter(b => b.status === 'PAID').length,
    RESERVED: allBookings.filter(b => b.status === 'RESERVED').length,
    PENDING: allBookings.filter(b => b.status === 'PENDING').length,
    EXPIRED: allBookings.filter(b => b.status === 'EXPIRED').length,
    CANCELLED: allBookings.filter(b => b.status === 'CANCELLED').length,
  }

  const successBookingsCount = statusCounts.PAID + statusCounts.RESERVED
  const noShowCount = statusCounts.EXPIRED
  const cancelledCount = statusCounts.CANCELLED

  const expirationRate = totalBookingsCount > 0 ? (noShowCount / totalBookingsCount) * 100 : 0
  const cancellationRate = totalBookingsCount > 0 ? (cancelledCount / totalBookingsCount) * 100 : 0

  // 6. Court Utilization & popular metrics
  const courtUsage = courts.map(c => {
    const courtBookings = allBookings.filter(b => b.courtId === c.id && (b.status === 'PAID' || b.status === 'RESERVED'))
    const totalHours = courtBookings.reduce((sum, b) => {
      const hours = (b.endTime.getTime() - b.startTime.getTime()) / (3600 * 1000)
      return sum + hours;
    }, 0)

    return {
      courtId: c.id,
      courtName: c.name,
      courtNumber: c.number,
      bookingsCount: courtBookings.length,
      totalHoursPlayed: totalHours
    }
  })

  // 7. Hourly Peak Times
  const hourlyOccupancy = Array.from({ length: 24 }, (_, hour) => {
    const count = allBookings.filter(b => {
      const isBooked = b.status === 'PAID' || b.status === 'RESERVED'
      const startHour = b.startTime.getHours()
      return isBooked && startHour === hour
    }).length

    return {
      hour,
      label: `${hour % 12 === 0 ? 12 : hour % 12} ${hour >= 12 ? 'PM' : 'AM'}`,
      count
    }
  }).filter(h => h.hour >= 7 && h.hour <= 22) // operational window filter

  return (
    <AnalyticsClient
      kpis={{
        totalPlayers,
        membershipDistribution,
        totalWalletCredits,
        revenueToday,
        revenue7Days,
        revenue30Days,
        revenue365Days,
        revenueLifetime,
        totalBookingsCount,
        successBookingsCount,
        noShowCount,
        cancelledCount,
        expirationRate,
        cancellationRate
      }}
      courtUsage={courtUsage}
      hourlyOccupancy={hourlyOccupancy}
      dailyRevenueTrend={dailyRevenueTrend}
    />
  )
}
