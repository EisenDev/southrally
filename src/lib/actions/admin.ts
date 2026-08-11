'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { BookingStatus, SkillLevel } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'
import { awardTopUpPoints } from './yardpoints'

// Helper check for admin role
async function checkAdmin() {
  const session = await auth()
  if (!session?.user?.email) return null
  const user = await db.user.findUnique({ where: { email: session.user.email } })
  return user?.role === 'ADMIN' ? user : null
}

export type ActionState = { success: boolean; error?: string; [key: string]: any }

// 1. Scan / Deduct Open Play fee and place user in Stack Queue
export async function scanCheckinAction(
  userId: string,
  skillLevel: 'NOVICE' | 'INTERMEDIATE' | 'ADVANCED',
  overridePaymentMethod?: 'CREDITS' | 'CASH'
): Promise<ActionState> {
  const admin = await checkAdmin()
  if (!admin) return { success: false, error: 'Unauthorized. Staff permissions required.' }

  const fee = 150.00

  try {
    const result = await db.$transaction(async (tx) => {
      // Fetch user
      const user = await tx.user.findUnique({ where: { id: userId } })
      if (!user) throw new Error('User not found.')

      // Check if already in active stack queue (including PENDING)
      const existingQueue = await tx.paddleStack.findFirst({
        where: {
          userId: user.id,
          status: { in: ['PENDING', 'WAITING', 'MATCHED', 'PLAYING'] }
        }
      })

      const method = overridePaymentMethod || existingQueue?.paymentMethod || 'CREDITS'
      const isCashPayment = method === 'CASH'

      if (isCashPayment) {
        // Counter cash payment: record as CASH_TOPUP (like booking cash checks)
        await tx.transaction.create({
          data: {
            userId: user.id,
            amount: fee,
            type: 'CASH_TOPUP',
            reference: `CASH-OPEN-PLAY`
          }
        })
        await tx.transaction.create({
          data: {
            userId: user.id,
            amount: -fee,
            type: 'EVENT_DEBIT',
            reference: `OPEN-PLAY-${new Date().toLocaleDateString([], { month: '2-digit', day: '2-digit' })}-CASH`
          }
        })
      } else {
        // Credits payment check and deduction
        if (Number(user.credits) < fee) {
          throw new Error(`Insufficient balance. Cost: ₱${fee.toFixed(2)}, Balance: ₱${Number(user.credits).toFixed(2)}`)
        }

        // Deduct fee
        await tx.user.update({
          where: { id: user.id },
          data: { credits: Number(user.credits) - fee }
        })

        // Create ledger entry
        await tx.transaction.create({
          data: {
            userId: user.id,
            amount: -fee,
            type: 'EVENT_DEBIT',
            reference: `OPEN-PLAY-${new Date().toLocaleDateString([], { month: '2-digit', day: '2-digit' })}`
          }
        })
      }

      const expirySetting = await tx.systemSetting.findUnique({
        where: { key: 'openplay_expiry_hours' }
      })
      const expiryHours = expirySetting ? parseFloat(expirySetting.value) : 3.0
      const sessionExpiresAt = new Date(Date.now() + expiryHours * 3600 * 1000)

      if (existingQueue) {
        if (existingQueue.status === 'PENDING') {
          // Update the PENDING entry to WAITING (paid/checked in!)
          await tx.paddleStack.update({
            where: { id: existingQueue.id },
            data: {
              status: 'WAITING',
              skillLevel,
              joinedAt: new Date(),
              checkedInAt: new Date(),
              sessionExpiresAt,
              paymentMethod: method
            }
          })
        } else {
          throw new Error('User is already checked-in and active in the lobby queue.')
        }
      } else {
        // Create new active lobby queue entry
        const { randomBytes } = await import('crypto')
        const qrId = 'OPQ-' + randomBytes(4).toString('hex').toUpperCase()
        await tx.paddleStack.create({
          data: {
            userId: user.id,
            skillLevel,
            status: 'WAITING',
            joinedAt: new Date(),
            checkedInAt: new Date(),
            sessionExpiresAt,
            qrId,
            paymentMethod: method
          }
        })
      }

      return true
    })

    revalidatePath('/dashboard/admin')
    revalidatePath('/dashboard/paddlestack')
    revalidatePath('/dashboard/openplay')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Check-in failed.' }
  }
}

// 2. Force enter queue manually (no fee deduction, e.g. paid cash/voucher already checked)
export async function forceEnterQueueAction(
  userId: string,
  skillLevel: 'NOVICE' | 'INTERMEDIATE' | 'ADVANCED'
): Promise<ActionState> {
  const admin = await checkAdmin()
  if (!admin) return { success: false, error: 'Unauthorized.' }

  try {
    const expirySetting = await db.systemSetting.findUnique({
      where: { key: 'openplay_expiry_hours' }
    })
    const expiryHours = expirySetting ? parseFloat(expirySetting.value) : 3.0
    const sessionExpiresAt = new Date(Date.now() + expiryHours * 3600 * 1000)

    const existing = await db.paddleStack.findFirst({
      where: { userId, status: { in: ['PENDING', 'WAITING', 'MATCHED', 'PLAYING'] } }
    })

    if (existing) {
      if (existing.status === 'PENDING') {
        await db.paddleStack.update({
          where: { id: existing.id },
          data: {
            status: 'WAITING',
            skillLevel,
            joinedAt: new Date(),
            checkedInAt: new Date(),
            sessionExpiresAt
          }
        })
      } else {
        return { success: false, error: 'User is already in active queue.' }
      }
    } else {
      const { randomBytes } = await import('crypto')
      const qrId = 'OPQ-' + randomBytes(4).toString('hex').toUpperCase()
      await db.paddleStack.create({
        data: {
          userId,
          skillLevel,
          status: 'WAITING',
          joinedAt: new Date(),
          checkedInAt: new Date(),
          sessionExpiresAt,
          qrId
        }
      })
    }

    revalidatePath('/dashboard/admin')
    revalidatePath('/dashboard/paddlestack')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Queue entry failed.' }
  }
}

// 3. Remove player from queue entirely
export async function removePlayerFromQueueAction(userId: string): Promise<ActionState> {
  const admin = await checkAdmin()
  if (!admin) return { success: false, error: 'Unauthorized.' }

  try {
    const active = await db.paddleStack.findFirst({
      where: { userId, status: { in: ['PENDING', 'WAITING', 'MATCHED', 'PLAYING'] } }
    })
    if (!active) return { success: false, error: 'Player is not in stack queue.' }

    await db.paddleStack.update({
      where: { id: active.id },
      data: { status: 'COMPLETED', courtId: null }
    })

    // If court was occupied or ready, verify if we need to release court
    if (active.courtId) {
      const remainingPlayers = await db.paddleStack.count({
        where: { courtId: active.courtId, status: { in: ['MATCHED', 'PLAYING'] } }
      })
      if (remainingPlayers === 0) {
        await db.court.update({
          where: { id: active.courtId },
          data: { status: 'AVAILABLE', gameStartedAt: null }
        })
      }
    }

    // Attempt to fill court vacancies created by removal
    await checkAndCreateReadyMatches()

    revalidatePath('/dashboard/admin')
    revalidatePath('/dashboard/paddlestack')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// 4. Match 4 players of a skill level and assign to a Court in READY state (Wait for Staff to Start Timer)
export async function assignMatchToCourtAction(
  courtId: string,
  skillLevel: 'NOVICE' | 'INTERMEDIATE' | 'ADVANCED'
): Promise<ActionState> {
  const admin = await checkAdmin()
  if (!admin) return { success: false, error: 'Unauthorized.' }

  try {
    // 1. Fetch top 4 waiting players in this queue lane
    const waitingPlayers = await db.paddleStack.findMany({
      where: { skillLevel, status: 'WAITING' },
      orderBy: { joinedAt: 'asc' },
      take: 4
    })

    if (waitingPlayers.length < 4) {
      return { success: false, error: `Need at least 4 waiting players in ${skillLevel} queue. (Current: ${waitingPlayers.length})` }
    }

    // 2. Transactionally assign players to court in READY status
    await db.$transaction(async (tx) => {
      const court = await tx.court.findUnique({ where: { id: courtId } })
      if (!court || court.status !== 'AVAILABLE') {
        throw new Error('Court is not vacant or already matched.')
      }

      // Check reservation lookahead: block if booking starts within 15 minutes (900 seconds)
      const now = new Date()
      const limitTime = new Date(now.getTime() + 15 * 60 * 1000)
      const nextBooking = await tx.booking.findFirst({
        where: {
          courtId,
          status: { in: ['RESERVED', 'PAID', 'PENDING'] },
          startTime: { lte: limitTime },
          endTime: { gte: now },
          user: {
            role: { notIn: ['ADMIN', 'STAFF'] }
          }
        }
      })

      if (nextBooking) {
        throw new Error('Court is blocked due to an upcoming private reservation starting in less than 15 minutes.')
      }

      // Update Court Status to READY
      await tx.court.update({
        where: { id: courtId },
        data: {
          status: 'READY',
          gameStartedAt: null
        }
      })

      // Update Player Statuses to MATCHED
      const ids = waitingPlayers.map(p => p.id)
      await tx.paddleStack.updateMany({
        where: { id: { in: ids } },
        data: {
          status: 'MATCHED',
          courtId
        }
      })
    })

    revalidatePath('/dashboard/admin')
    revalidatePath('/dashboard/paddlestack')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Match assignment failed.' }
  }
}

// 5. Staff starts the match timer (Transitions court to OCCUPIED and players to PLAYING, starting timer)
export async function startMatchTimerAction(courtId: string): Promise<ActionState> {
  const admin = await checkAdmin()
  if (!admin) return { success: false, error: 'Unauthorized.' }

  try {
    await db.$transaction(async (tx) => {
      const matchDurationSetting = await tx.systemSetting.findUnique({
        where: { key: 'openplay_match_duration_seconds' }
      })
      const durationSeconds = matchDurationSetting ? parseInt(matchDurationSetting.value) : 900

      // Update Court Status
      await tx.court.update({
        where: { id: courtId },
        data: {
          status: 'OCCUPIED',
          gameStartedAt: new Date(),
          gameDurationSecond: durationSeconds
        }
      })

      // Update matched players to PLAYING
      await tx.paddleStack.updateMany({
        where: { courtId, status: 'MATCHED' },
        data: {
          status: 'PLAYING'
        }
      })
    })

    revalidatePath('/dashboard/admin')
    revalidatePath('/dashboard/paddlestack')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Timer start failed.' }
  }
}

// 6. Force end a match early (re-stacks players to WAITING status at the end of the queue)
export async function endMatchEarlyAction(courtId: string): Promise<ActionState> {
  const admin = await checkAdmin()
  if (!admin) return { success: false, error: 'Unauthorized.' }

  try {
    await db.$transaction(async (tx) => {
      // Find players currently playing or matched on this court
      const activePlayers = await tx.paddleStack.findMany({
        where: { courtId, status: { in: ['MATCHED', 'PLAYING'] } }
      })

      // Update their status back to WAITING, with joinedAt updated to now (FIFO re-queue)
      if (activePlayers.length > 0) {
        const ids = activePlayers.map(p => p.id)
        await tx.paddleStack.updateMany({
          where: { id: { in: ids } },
          data: {
            status: 'WAITING',
            courtId: null,
            joinedAt: new Date() // Appends to the back of the queue
          }
        })
      }

      // Reset Court Status
      await tx.court.update({
        where: { id: courtId },
        data: {
          status: 'AVAILABLE',
          gameStartedAt: null
        }
      })
    })

    // Check if we can automatically group next waiting players
    await checkAndCreateReadyMatches()

    revalidatePath('/dashboard/admin')
    revalidatePath('/dashboard/paddlestack')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Match termination failed.' }
  }
}

// 6b. Record match result and award Yard Points to players
export async function recordMatchResultAction(
  courtId: string,
  winnerUserIds: string[] // exactly 2 user IDs (the winners)
): Promise<ActionState> {
  const admin = await checkAdmin()
  if (!admin) return { success: false, error: 'Unauthorized.' }

  if (!winnerUserIds || winnerUserIds.length !== 2) {
    return { success: false, error: 'Exactly 2 winners must be selected.' }
  }

  try {
    await db.$transaction(async (tx) => {
      // 1. Find all 4 players currently on this court (MATCHED or PLAYING)
      const activePlayers = await tx.paddleStack.findMany({
        where: {
          courtId,
          status: { in: ['MATCHED', 'PLAYING'] }
        },
        include: { user: true }
      })

      if (activePlayers.length === 0) {
        throw new Error('No active players found on this court. The match may have already been processed.')
      }

      // 2. Compute DUPR rating adjustments using Individual-vs-Team Average ELO math
      const winners = activePlayers.filter(p => winnerUserIds.includes(p.userId))
      const losers = activePlayers.filter(p => !winnerUserIds.includes(p.userId))
      
      const duprUpdates: Record<string, { oldRating: number; newRating: number }> = {}

      if (winners.length === 2 && losers.length === 2) {
        const w1 = winners[0]
        const w2 = winners[1]
        const l1 = losers[0]
        const l2 = losers[1]

        const ratingW1 = w1.user?.duprRating && w1.user.duprRating > 0 ? Number(w1.user.duprRating) : 3.0
        const ratingW2 = w2.user?.duprRating && w2.user.duprRating > 0 ? Number(w2.user.duprRating) : 3.0
        const ratingL1 = l1.user?.duprRating && l1.user.duprRating > 0 ? Number(l1.user.duprRating) : 3.0
        const ratingL2 = l2.user?.duprRating && l2.user.duprRating > 0 ? Number(l2.user.duprRating) : 3.0

        const avgWinners = (ratingW1 + ratingW2) / 2
        const avgLosers = (ratingL1 + ratingL2) / 2

        const K = 0.10 // Caps rating volatility so skill tiers change realistically

        const getNewRating = (oldRating: number, opponentAvg: number, actualScore: number) => {
          const exponent = (opponentAvg - oldRating) / 2.0
          const expected = 1.0 / (1.0 + Math.pow(10, exponent))
          const updated = oldRating + K * (actualScore - expected)
          return Math.max(2.00, Math.min(8.00, parseFloat(updated.toFixed(4))))
        }

        duprUpdates[w1.userId] = { oldRating: ratingW1, newRating: getNewRating(ratingW1, avgLosers, 1) }
        duprUpdates[w2.userId] = { oldRating: ratingW2, newRating: getNewRating(ratingW2, avgLosers, 1) }
        duprUpdates[l1.userId] = { oldRating: ratingL1, newRating: getNewRating(ratingL1, avgWinners, 0) }
        duprUpdates[l2.userId] = { oldRating: ratingL2, newRating: getNewRating(ratingL2, avgWinners, 0) }
      }

      // 3. Get points settings
      const settings = await tx.systemSetting.findMany()
      const getSetting = (key: string, def: number) => {
        const s = settings.find((x: any) => x.key === key)
        return s ? parseInt(s.value) : def
      }

      const noviceWinner = getSetting('yp_novice_winner', 35)
      const intermediateWinner = getSetting('yp_intermediate_winner', 50)
      const advancedWinner = getSetting('yp_advanced_winner', 65)
      const loserPercentage = getSetting('yp_loser_percentage', 15)

      // 4. Award points & update DUPR ratings to all players
      for (const entry of activePlayers) {
        const skillLevel = entry.skillLevel
        const isWinner = winnerUserIds.includes(entry.userId)

        let winnerPoints = 35
        if (skillLevel === 'ADVANCED') {
          winnerPoints = advancedWinner
        } else if (skillLevel === 'INTERMEDIATE') {
          winnerPoints = intermediateWinner
        } else {
          winnerPoints = noviceWinner
        }
        
        // Winners get full winnerPoints, losers get percentage
        const totalPoints = isWinner ? winnerPoints : Math.round(winnerPoints * (loserPercentage / 100))

        const duprData = duprUpdates[entry.userId]
        const oldDupr = duprData?.oldRating ?? (entry.user?.duprRating && entry.user.duprRating > 0 ? Number(entry.user.duprRating) : 3.0)
        const newDupr = duprData?.newRating ?? oldDupr

        // Update user yard points & DUPR rating
        await tx.user.update({
          where: { id: entry.userId },
          data: {
            yardPoints: { increment: totalPoints },
            lifetimeYardPoints: { increment: totalPoints },
            duprRating: newDupr
          }
        })

        // Log the points & DUPR updates
        await tx.yardPointLog.create({
          data: {
            userId: entry.userId,
            amount: totalPoints,
            reason: isWinner ? 'OPEN_PLAY_WIN' : 'OPEN_PLAY_PARTICIPATION',
            details: `${skillLevel} match – ${isWinner ? `Winner (earned ${totalPoints} YP)` : `Participation / Loser (earned ${loserPercentage}% of winners' points: ${totalPoints} YP)`} | DUPR: ${oldDupr.toFixed(2)} → ${newDupr.toFixed(2)} (Court ${courtId.slice(-4)})`
          }
        })
      }

      // 4. Re-queue all players (move back to WAITING at the back of the queue)
      const ids = activePlayers.map(p => p.id)
      await tx.paddleStack.updateMany({
        where: { id: { in: ids } },
        data: {
          status: 'WAITING',
          courtId: null,
          joinedAt: new Date() // Back of the queue
        }
      })

      // 5. Free the court
      await tx.court.update({
        where: { id: courtId },
        data: { status: 'AVAILABLE', gameStartedAt: null }
      })
    })

    revalidatePath('/dashboard/admin')
    revalidatePath('/dashboard/paddlestack')
    revalidatePath('/dashboard/yard-points')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to record match result.' }
  }
}

// 7. Auto check and rotate expired matches automatically + auto queue next match in READY state
export async function checkAndRotateExpiredMatchesAction(): Promise<ActionState> {
  try {
    const now = new Date()
    let rotationsPerformed = 0

    // 0.0. Auto-expire unpaid cash bookings that are more than 5 minutes late
    const fiveMinsAgo = new Date(now.getTime() - 5 * 60 * 1000)
    const latePendingBookings = await db.booking.findMany({
      where: {
        status: 'PENDING',
        startTime: { lte: fiveMinsAgo }
      }
    })

    if (latePendingBookings.length > 0) {
      for (const booking of latePendingBookings) {
        await db.booking.update({
          where: { id: booking.id },
          data: { status: 'EXPIRED' }
        })
        rotationsPerformed++
      }
    }

    // 0.1. Activate any early checked-in bookings (RESERVED status) whose time slot has started
    const activeCheckedInBookings = await db.booking.findMany({
      where: {
        status: 'RESERVED',
        startTime: { lte: now },
        endTime: { gte: now }
      },
      include: { court: true }
    })

    for (const b of activeCheckedInBookings) {
      if (b.court.status !== 'OCCUPIED' || !b.court.gameStartedAt) {
        await db.court.update({
          where: { id: b.courtId },
          data: {
            status: 'OCCUPIED',
            gameStartedAt: b.startTime,
            gameDurationSecond: Math.max(900, Math.floor((b.endTime.getTime() - now.getTime()) / 1000))
          }
        })
        rotationsPerformed++
      }
    }

    // 0. Auto-release any courts closed by bookings if the booking has ended
    const allCourts = await db.court.findMany()
    for (const c of allCourts) {
      // If court status is OCCUPIED but has no stack players assigned, check if booking is still active
      if (c.status === 'OCCUPIED') {
        const stackPlayersCount = await db.paddleStack.count({
          where: { courtId: c.id, status: { in: ['MATCHED', 'PLAYING'] } }
        })

        if (stackPlayersCount === 0) {
          const activeBooking = await db.booking.findFirst({
            where: {
              courtId: c.id,
              status: { in: ['RESERVED', 'PAID'] },
              startTime: { lte: now },
              endTime: { gte: now },
              user: {
                role: { notIn: ['ADMIN', 'STAFF'] }
              }
            }
          })
          if (!activeBooking) {
            // No active booking and no active stack players -> Free the court!
            await db.court.update({
              where: { id: c.id },
              data: { status: 'AVAILABLE', gameStartedAt: null }
            })
          }
        }
      }
    }

    const occupiedCourts = await db.court.findMany({
      where: {
        status: 'OCCUPIED',
        gameStartedAt: { not: null }
      }
    })

    // accumulate rotationsPerformed

    // 1. Expire any lobby player sessions after their stored sessionExpiresAt timestamp
    const expiredSessions = await db.paddleStack.findMany({
      where: {
        status: { in: ['WAITING', 'MATCHED', 'PLAYING'] },
        sessionExpiresAt: { lte: now }
      }
    })

    if (expiredSessions.length > 0) {
      for (const sess of expiredSessions) {
        await db.$transaction(async (tx) => {
          await tx.paddleStack.update({
            where: { id: sess.id },
            data: { status: 'COMPLETED', courtId: null }
          })

          if (sess.courtId) {
            // Check if court is now vacant of active players
            const remainingCount = await tx.paddleStack.count({
              where: { courtId: sess.courtId, status: { in: ['MATCHED', 'PLAYING'] } }
            })
            if (remainingCount === 0) {
              await tx.court.update({
                where: { id: sess.courtId },
                data: { status: 'AVAILABLE', gameStartedAt: null }
              })
            }
          }
        })
        rotationsPerformed++
      }
    }

    // 2. Court match timer expiry — intentionally NOT auto-rotating here.
    //    When a match timer expires the admin page shows a "Record Winner & Award Points" button.
    //    The court and players are ONLY cleared when staff records the winner (recordMatchResultAction)
    //    or explicitly force-ends the match (endMatchEarlyAction).
    //    Auto-rotating here would cause players to disappear from courts before the winner is recorded.

    if (rotationsPerformed > 0) {
      revalidatePath('/dashboard/admin')
      revalidatePath('/dashboard/paddlestack')
      revalidatePath('/dashboard/openplay')
      return { success: true }
    }

    return { success: false }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// 8. Auto match and queue next group of 4 waiting players on any AVAILABLE court
// 8. Auto match is disabled, staff matches players manually.
export async function checkAndCreateReadyMatches(): Promise<boolean> {
  return false
}

// 9. Fetch all configuration settings
export async function getSystemSettingsAction() {
  const admin = await checkAdmin()
  if (!admin) return { success: false, error: 'Unauthorized.' }

  try {
    const list = await db.systemSetting.findMany()
    const settings: Record<string, string> = {
      booking_duration_minutes: '60',
      booking_price_per_hour: '250',      // legacy flat rate (fallback)
      booking_daytime_price: '250',        // daytime slot price
      booking_daytime_start_hour: '8',     // daytime starts at 8 AM
      booking_daytime_end_hour: '17',      // daytime ends at 5 PM (exclusive: 5PM slot = nighttime)
      booking_nighttime_price: '300',      // nighttime slot price
      openplay_match_duration_seconds: '900',
      openplay_expiry_hours: '3',
      openplay_entry_fee: '150',
      openplay_start_hour: '8',
      openplay_end_hour: '22'
    }
    for (const item of list) {
      settings[item.key] = item.value
    }
    return { success: true, settings }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// 10. Update configuration settings
export async function updateSystemSettingsAction(settings: {
  booking_duration_minutes: string
  booking_price_per_hour: string
  booking_daytime_price: string
  booking_daytime_start_hour: string
  booking_daytime_end_hour: string
  booking_nighttime_price: string
  openplay_match_duration_seconds: string
  openplay_expiry_hours: string
  openplay_entry_fee: string
  openplay_start_hour: string
  openplay_end_hour: string
}) {
  const admin = await checkAdmin()
  if (!admin) return { success: false, error: 'Unauthorized.' }

  try {
    await db.$transaction(async (tx) => {
      for (const [key, val] of Object.entries(settings)) {
        await tx.systemSetting.upsert({
          where: { key },
          update: { value: val },
          create: { key, value: val }
        })
      }

      // Automatically sync court play times if openplay_match_duration_seconds is updated (only for available/maintenance courts so as not to disrupt active games)
      const matchSeconds = parseInt(settings.openplay_match_duration_seconds)
      if (!isNaN(matchSeconds)) {
        await tx.court.updateMany({
          where: { status: { in: ['AVAILABLE', 'MAINTENANCE'] } },
          data: { gameDurationSecond: matchSeconds }
        })
      }
    })

    revalidatePath('/dashboard/admin')
    revalidatePath('/dashboard/paddlestack')
    revalidatePath('/dashboard/openplay')
    revalidatePath('/dashboard/bookings')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// 12. Toggle court open/closed status (AVAILABLE vs MAINTENANCE/CLOSED)
export async function toggleCourtOpenStatusAction(courtId: string): Promise<ActionState> {
  const admin = await checkAdmin()
  if (!admin) return { success: false, error: 'Unauthorized. Only admins can toggle court status.' }

  try {
    const court = await db.court.findUnique({ where: { id: courtId } })
    if (!court) return { success: false, error: 'Court not found.' }

    const newStatus = court.status === 'MAINTENANCE' ? 'AVAILABLE' : 'MAINTENANCE'
    await db.court.update({
      where: { id: courtId },
      data: { status: newStatus }
    })

    revalidatePath('/dashboard/admin')
    revalidatePath('/dashboard/paddlestack')
    revalidatePath('/dashboard/openplay')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// 11. Register member or staff by Admin
export async function registerUserByAdminAction(data: {
  name: string
  email: string
  password: string
  role: string
  membership?: string
  duprRating?: number
  credits?: number
}) {
  const admin = await checkAdmin()
  if (!admin) return { success: false, error: 'Unauthorized. Only admins can register new users.' }

  if (!data.name || !data.email || !data.password || !data.role) {
    return { success: false, error: 'All fields are required.' }
  }

  try {
    const existing = await db.user.findUnique({ where: { email: data.email } })
    if (existing) {
      return { success: false, error: 'A user with this email address already exists.' }
    }

    const hashedPassword = await bcrypt.hash(data.password, 12)
    const isPlayer = data.role === 'PLAYER'

    await db.user.create({
      data: {
        name: data.name,
        email: data.email,
        hashedPassword,
        role: data.role,
        membership: isPlayer ? (data.membership || 'STANDARD') : 'STANDARD',
        duprRating: isPlayer ? (data.duprRating || 3.0) : 3.0,
        credits: isPlayer ? (data.credits || 0) : 0
      }
    })

    revalidatePath('/dashboard/admin/users')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// 12. Top up player credits manually via Cash at the front desk
export async function creditUserCashAction(
  userId: string,
  amount: number
): Promise<ActionState> {
  const admin = await checkAdmin()
  if (!admin) return { success: false, error: 'Unauthorized. Staff permissions required.' }

  if (!amount || amount <= 0) {
    return { success: false, error: 'Invalid top up amount.' }
  }

  try {
    await db.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } })
      if (!user) throw new Error('User not found.')

      // Update user credits
      await tx.user.update({
        where: { id: user.id },
        data: { credits: Number(user.credits) + amount }
      })

      // Create ledger entry
      await tx.transaction.create({
        data: {
          userId: user.id,
          amount,
          type: 'TOPUP',
          reference: `CASH-${new Date().getTime()}`
        }
      })

      // Award loyalty points
      await awardTopUpPoints(tx, user.id, amount)
    })

    revalidatePath('/dashboard/admin')
    revalidatePath('/dashboard/admin/users')
    revalidatePath('/dashboard/yard-points')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to top up balance.' }
  }
}

export async function getLatestUserCreditsAction(userId: string): Promise<{ success: boolean; credits?: number; error?: string }> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { credits: true }
    })
    if (!user) return { success: false, error: 'User not found' }
    return { success: true, credits: Number(user.credits) }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch credits' }
  }
}

// 13. Admin: Reserve a court for an Open Play session block (date + time)
//     This is NOT a regular player booking — it's an admin-reserved block for open play.
//     It creates a booking entry with the admin as the owner and a special OPEN_PLAY reference.
export async function adminReserveCourtForOpenPlayAction(data: {
  courtId?: string
  courtIds?: string[]   // support multiple courts selection
  startTime?: string    // ISO string
  durationHours?: number
  startTimes?: string[] // array of ISO strings
  label?: string        // optional display label
}): Promise<ActionState> {
  const admin = await checkAdmin()
  if (!admin) return { success: false, error: 'Unauthorized. Only admins can reserve courts.' }

  const targetCourtIds = data.courtIds && data.courtIds.length > 0 
    ? data.courtIds 
    : data.courtId 
      ? [data.courtId] 
      : []

  if (targetCourtIds.length === 0) {
    return { success: false, error: 'No court selected.' }
  }

  try {
    let resolvedTimes: Date[] = []

    if (data.startTimes && data.startTimes.length > 0) {
      resolvedTimes = data.startTimes.map(t => new Date(t))
    } else if (data.startTime && data.durationHours) {
      const start = new Date(data.startTime)
      for (let h = 0; h < data.durationHours; h++) {
        const t = new Date(start)
        t.setHours(start.getHours() + h)
        resolvedTimes.push(t)
      }
    } else {
      return { success: false, error: 'No time slot selected.' }
    }

    // Check past time
    for (const time of resolvedTimes) {
      if (time < new Date(Date.now() - 60000)) {
        return { success: false, error: 'Cannot reserve a court slot in the past.' }
      }
    }

    // Process all slots to check conflicts first across all selected courts
    for (const courtId of targetCourtIds) {
      const court = await db.court.findUnique({ where: { id: courtId } })
      const courtName = court ? court.name : `Court ${courtId.slice(-4)}`

      for (const startTime of resolvedTimes) {
        const endTime = new Date(startTime.getTime() + 3600000)

        // Check for conflicts
        const conflict = await db.booking.findFirst({
          where: {
            courtId,
            status: { in: ['RESERVED', 'PAID', 'PENDING'] },
            OR: [
              { startTime: { lte: startTime }, endTime: { gt: startTime } },
              { startTime: { lt: endTime }, endTime: { gte: endTime } }
            ]
          }
        })

        if (conflict) {
          return {
            success: false,
            error: `${courtName} already has a reservation at ${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`
          }
        }
      }
    }

    // Create reservation for each court and time slot
    for (const courtId of targetCourtIds) {
      for (const startTime of resolvedTimes) {
        const endTime = new Date(startTime.getTime() + 3600000)

        await db.booking.create({
          data: {
            userId: admin.id,
            courtId,
            startTime,
            endTime,
            status: 'PAID',
            price: 0, // no charge for admin-reserved open play
          }
        })

        // Log a transaction record for transparency (₱0 since this is admin-reserved open play)
        await db.transaction.create({
          data: {
            userId: admin.id,
            amount: 0,
            type: 'EVENT_DEBIT',
            reference: `OPENPLAY-RESERVE-${courtId.slice(-4).toUpperCase()}-${startTime.toLocaleDateString('en-US', { timeZone: 'Asia/Manila', month: '2-digit', day: '2-digit' })}`
          }
        })
      }
    }

    revalidatePath('/dashboard/admin')
    revalidatePath('/dashboard/bookings')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to reserve court.' }
  }
}

export async function adminBookOnBehalfOfPlayerAction(data: {
  targetUserId: string
  courtId: string
  startTimes: string[] // ISO strings
}): Promise<ActionState> {
  const session = await auth()
  if (!session?.user?.email) return { success: false, error: 'Unauthorized.' }
  const admin = await db.user.findUnique({ where: { email: session.user.email } })
  if (!admin || (admin.role !== 'ADMIN' && admin.role !== 'STAFF')) {
    return { success: false, error: 'Unauthorized. Staff permissions required.' }
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const targetUser = await tx.user.findUnique({ where: { id: data.targetUserId } })
      if (!targetUser) throw new Error('Player not found.')

      const court = await tx.court.findUnique({ where: { id: data.courtId } })
      if (!court) throw new Error('Court not found.')
      if (court.status === 'MAINTENANCE') throw new Error('This court is under maintenance.')

      const priceSetting = await tx.systemSetting.findUnique({ where: { key: 'booking_price_per_hour' } })
      const baseRate = priceSetting ? parseFloat(priceSetting.value) : 250
      const hourlyRate = court.type === 'ROOFTOP' ? 300 : baseRate
      const totalCost = hourlyRate * data.startTimes.length

      if (Number(targetUser.credits) < totalCost) {
        throw new Error(`Insufficient credits. Required: ₱${totalCost.toFixed(2)}, Available: ₱${Number(targetUser.credits).toFixed(2)}.`)
      }

      const startHourSetting = await tx.systemSetting.findUnique({ where: { key: 'openplay_start_hour' } })
      const endHourSetting = await tx.systemSetting.findUnique({ where: { key: 'openplay_end_hour' } })
      const startHour = startHourSetting ? parseInt(startHourSetting.value) : 8
      const endHour = endHourSetting ? parseInt(endHourSetting.value) : 22

      for (const timeStr of data.startTimes) {
        const startTime = new Date(timeStr)
        const endTime = new Date(startTime.getTime() + 3600000)

        const bookingHour = parseInt(
          new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', hour12: false }).format(startTime)
        )
        if (bookingHour < startHour || bookingHour >= endHour) {
          throw new Error(`Slot at ${bookingHour}:00 is outside operating hours (${startHour}:00–${endHour}:00).`)
        }

        const conflict = await tx.booking.findFirst({
          where: {
            courtId: data.courtId,
            status: { in: [BookingStatus.RESERVED, BookingStatus.PAID, BookingStatus.PENDING] },
            OR: [
              { startTime: { lte: startTime }, endTime: { gt: startTime } },
              { startTime: { lt: endTime }, endTime: { gte: endTime } }
            ]
          }
        })
        if (conflict) {
          throw new Error(`${court.name} already has a booking at ${new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', hour12: true }).format(startTime)}.`)
        }
      }

      // Deduct credits from player
      await tx.user.update({
        where: { id: targetUser.id },
        data: { credits: Number(targetUser.credits) - totalCost }
      })

      // Create bookings and transaction records
      for (const timeStr of data.startTimes) {
        const startTime = new Date(timeStr)
        const endTime = new Date(startTime.getTime() + 3600000)

        await tx.booking.create({
          data: {
            userId: targetUser.id,
            courtId: data.courtId,
            startTime,
            endTime,
            status: BookingStatus.PAID,
            price: hourlyRate
          }
        })

        await tx.transaction.create({
          data: {
            userId: targetUser.id,
            amount: -hourlyRate,
            type: 'BOOKING_DEBIT',
            reference: `ADMIN-BOOK-${court.name.replace(/\s+/g, '-').toUpperCase()}-BY-${admin.name || admin.email}`
          }
        })
      }

      return { success: true }
    })

    revalidatePath('/dashboard/bookings')
    revalidatePath('/dashboard/admin')
    return result
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to book court for player.' }
  }
}

export async function getBookingDetailsForScanAction(bookingId: string) {
  const admin = await checkAdmin()
  if (!admin) return { success: false, error: 'Unauthorized. Staff permissions required.' }

  try {
    let targetId = bookingId.trim()
    
    // Parse QR payload formats
    let targetIds: string[] = []
    if (targetId.startsWith('BOOKING-PASS:bookingIds=')) {
      targetIds = targetId.replace('BOOKING-PASS:bookingIds=', '').split(',')
    } else if (targetId.startsWith('BOOKING-PASS:bookingId=')) {
      targetIds = [targetId.replace('BOOKING-PASS:bookingId=', '')]
    } else if (targetId.includes(',')) {
      targetIds = targetId.split(',')
    } else {
      targetIds = [targetId]
    }
    targetIds = targetIds.map(id => id.trim()).filter(Boolean)

    // Handle manual short-codes (e.g. BK-XXXXXX or BK-PASS:XXXXXX or XXXXXX)
    let suffix = ''
    if (targetIds.length === 1) {
      const singleId = targetIds[0]
      if (singleId.toUpperCase().startsWith('BK-PASS:')) {
        suffix = singleId.slice(8).toUpperCase()
      } else if (singleId.toUpperCase().startsWith('BK-')) {
        suffix = singleId.slice(3).toUpperCase()
      } else if (singleId.length === 6 && /^[a-zA-Z0-9]+$/.test(singleId)) {
        suffix = singleId.toUpperCase()
      }
    }

    let bookings = []
    if (suffix) {
      const matches = await db.booking.findMany({
        where: {
          id: { endsWith: suffix.toLowerCase() },
          status: { in: ['RESERVED', 'PAID', 'PENDING'] }
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          court: { select: { id: true, name: true, number: true } }
        }
      })
      if (matches.length === 1) {
        bookings = [matches[0]]
      } else if (matches.length > 1) {
        return { success: false, error: 'Multiple bookings match this code. Please enter full ID.' }
      } else {
        return { success: false, error: 'No booking found matching this code suffix.' }
      }
    } else {
      bookings = await db.booking.findMany({
        where: { id: { in: targetIds } },
        include: {
          user: { select: { id: true, name: true, email: true } },
          court: { select: { id: true, name: true, number: true } }
        }
      })
    }

    if (bookings.length === 0) {
      return { success: false, error: 'Booking(s) not found.' }
    }

    // Sort bookings by startTime so we can construct a coherent display
    bookings.sort((a, b) => a.startTime.getTime() - b.startTime.getTime())

    const firstBooking = bookings[0]
    const lastBooking = bookings[bookings.length - 1]
    const totalPrice = bookings.reduce((sum, b) => sum + Number(b.price), 0)

    // Determine status: if any is PENDING, overall status is PENDING (cash collect).
    // If all are RESERVED, overall is RESERVED. Otherwise PAID.
    let overallStatus = 'PAID'
    if (bookings.some(b => b.status === 'PENDING')) {
      overallStatus = 'PENDING'
    } else if (bookings.every(b => b.status === 'RESERVED')) {
      overallStatus = 'RESERVED'
    }

    return {
      success: true,
      booking: {
        id: bookings.map(b => b.id).join(','), // comma separated ids
        courtId: firstBooking.courtId,
        courtName: firstBooking.court.name,
        courtNumber: firstBooking.court.number,
        startTime: firstBooking.startTime.toISOString(),
        endTime: lastBooking.endTime.toISOString(),
        status: overallStatus,
        price: totalPrice,
        userId: firstBooking.user.id,
        userName: firstBooking.user.name || 'Member',
        userEmail: firstBooking.user.email,
        isBulk: bookings.length > 1,
        bookingsList: bookings.map(b => ({
          id: b.id,
          courtName: b.court.name,
          courtNumber: b.court.number,
          startTime: b.startTime.toISOString(),
          endTime: b.endTime.toISOString(),
          price: Number(b.price),
          status: b.status
        }))
      }
    }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to load booking details.' }
  }
}

export async function adminConfirmBookingCheckinAction(bookingId: string): Promise<ActionState> {
  const admin = await checkAdmin()
  if (!admin) return { success: false, error: 'Unauthorized. Staff permissions required.' }

  const bookingIds = bookingId.split(',')

  try {
    const result = await db.$transaction(async (tx) => {
      let totalAmountToCollect = 0
      const bookingsToUpdate = []
      let userId = ''
      let firstBooking = null
      let lastBooking = null
      let isAnyCheckinActive = false
      let isAnyUnpaid = false
      
      const now = new Date()

      for (const id of bookingIds) {
        const booking = await tx.booking.findUnique({
          where: { id },
          include: { court: true, user: true }
        })

        if (!booking) throw new Error(`Booking ${id} not found.`)
        if (booking.status === 'RESERVED') continue // skip if already checked-in
        if (booking.status === 'CANCELLED' || booking.status === 'EXPIRED') {
          throw new Error('Booking has been cancelled or has expired.')
        }

        userId = booking.userId
        bookingsToUpdate.push(booking)
        
        if (booking.status === 'PENDING') {
          isAnyUnpaid = true
          totalAmountToCollect += Number(booking.price)
        }

        const startTime = new Date(booking.startTime)
        const endTime = new Date(booking.endTime)
        const isToday = startTime.getFullYear() === now.getFullYear() &&
                        startTime.getMonth() === now.getMonth() &&
                        startTime.getDate() === now.getDate()
        const isTimeMatch = now.getTime() >= (startTime.getTime() - 30 * 60 * 1000) &&
                            now.getTime() <= endTime.getTime()
        
        if (isToday && isTimeMatch) {
          isAnyCheckinActive = true
        }

        if (!firstBooking || startTime.getTime() < new Date(firstBooking.startTime).getTime()) {
          firstBooking = booking
        }
        if (!lastBooking || endTime.getTime() > new Date(lastBooking.endTime).getTime()) {
          lastBooking = booking
        }
      }

      if (bookingsToUpdate.length === 0) {
        throw new Error('All bookings are already checked-in.')
      }

      const activeBooking = firstBooking || bookingsToUpdate[0]
      const finalEndTime = lastBooking ? new Date(lastBooking.endTime) : new Date(activeBooking.endTime)
      const finalStartTime = new Date(activeBooking.startTime)

      if (isAnyCheckinActive) {
        // Perform check-in for all eligible bookings (set status to RESERVED)
        await tx.booking.updateMany({
          where: { id: { in: bookingsToUpdate.map(b => b.id) } },
          data: { status: 'RESERVED' }
        })

        if (totalAmountToCollect > 0) {
          await tx.transaction.create({
            data: {
              userId,
              amount: totalAmountToCollect,
              type: 'CASH_TOPUP',
              reference: `CASH-GROUP-RESRV`
            }
          })
          await tx.transaction.create({
            data: {
              userId,
              amount: -totalAmountToCollect,
              type: 'BOOKING_DEBIT',
              reference: `RESRV-GROUP-CASH`
            }
          })
        }

        const hasStarted = now.getTime() >= finalStartTime.getTime()
        if (hasStarted) {
          // Occupy court immediately if the booked start time has already arrived
          await tx.court.update({
            where: { id: activeBooking.courtId },
            data: {
              status: 'OCCUPIED',
              gameStartedAt: now,
              gameDurationSecond: Math.max(900, Math.floor((finalEndTime.getTime() - now.getTime()) / 1000))
            }
          })
        }

        return { checkedIn: true, message: totalAmountToCollect > 0 ? 'Cash payment confirmed & checked in successfully!' : 'Arrival confirmed & checked in!' }
      } else {
        // Booking group is for a future date, or not time yet today!
        if (isAnyUnpaid) {
          // Confirm cash payment only (mark as PAID, record cash, but do NOT occupy court or set to RESERVED!)
          await tx.booking.updateMany({
            where: { id: { in: bookingsToUpdate.filter(b => b.status === 'PENDING').map(b => b.id) } },
            data: { status: 'PAID' }
          })

          await tx.transaction.create({
            data: {
              userId,
              amount: totalAmountToCollect,
              type: 'CASH_TOPUP',
              reference: `CASH-GROUP-PAID`
            }
          })
          await tx.transaction.create({
            data: {
              userId,
              amount: -totalAmountToCollect,
              type: 'BOOKING_DEBIT',
              reference: `RESRV-GROUP-CASH`
            }
          })

          return { checkedIn: false, message: 'Cash payment confirmed! Bookings marked as Paid.' }
        } else {
          // If already paid, staff shouldn't be checking them in early
          throw new Error('This booking block is already Paid. Check-in is only available on the day and time of play.')
        }
      }
    })

    revalidatePath('/dashboard/admin')
    revalidatePath('/dashboard/bookings')
    revalidatePath('/dashboard/paddlestack')
    return { success: true, checkedIn: result.checkedIn, message: result.message }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to confirm booking.' }
  }
}

// 12. Staff/Admin action to override player DUPR ratings manually
export async function updateUserDuprRatingAction(
  userId: string,
  newRating: number
): Promise<ActionState> {
  const admin = await checkAdmin()
  if (!admin) return { success: false, error: 'Unauthorized.' }

  if (newRating < 2.0 || newRating > 8.0) {
    return { success: false, error: 'DUPR rating must be between 2.0 and 8.0.' }
  }

  try {
    await db.user.update({
      where: { id: userId },
      data: { duprRating: newRating }
    })
    revalidatePath('/dashboard/admin/users')
    revalidatePath('/dashboard/profile')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update rating.' }
  }
}

// 13. Get Voucher settings (ADMIN ONLY)
export async function getVoucherSettingsAction(): Promise<ActionState> {
  const admin = await checkAdmin()
  if (!admin) return { success: false, error: 'Unauthorized.' }

  try {
    const settings = await db.systemSetting.findMany({
      where: {
        key: {
          in: [
            'promo_signup_active',
            'promo_signup_start',
            'promo_signup_end',
            'promo_signup_limit',
            'promo_signup_amount',
            'promo_signup_count'
          ]
        }
      }
    })

    const getVal = (key: string, def: string) => {
      const match = settings.find(s => s.key === key)
      return match ? match.value : def
    }

    return {
      success: true,
      settings: {
        active: getVal('promo_signup_active', 'false') === 'true',
        start: getVal('promo_signup_start', ''),
        end: getVal('promo_signup_end', ''),
        limit: parseInt(getVal('promo_signup_limit', '20')),
        amount: parseFloat(getVal('promo_signup_amount', '100.00')),
        count: parseInt(getVal('promo_signup_count', '0'))
      }
    }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch settings.' }
  }
}

// 14. Update Voucher settings (ADMIN ONLY)
export async function updateVoucherSettingsAction(data: {
  active: boolean
  start: string
  end: string
  limit: number
  amount: number
}): Promise<ActionState> {
  const admin = await checkAdmin()
  if (!admin) return { success: false, error: 'Unauthorized.' }

  try {
    const updates = [
      { key: 'promo_signup_active', value: data.active ? 'true' : 'false' },
      { key: 'promo_signup_start', value: data.start },
      { key: 'promo_signup_end', value: data.end },
      { key: 'promo_signup_limit', value: data.limit.toString() },
      { key: 'promo_signup_amount', value: data.amount.toFixed(2) }
    ]

    for (const update of updates) {
      await db.systemSetting.upsert({
        where: { key: update.key },
        update: { value: update.value },
        create: { key: update.key, value: update.value }
      })
    }

    revalidatePath('/dashboard/admin/vouchers')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update settings.' }
  }
}

// 15. Generate vouchers (ADMIN ONLY)
export async function generateVouchersAction(count: number, amount: number): Promise<ActionState> {
  const admin = await checkAdmin()
  if (!admin) return { success: false, error: 'Unauthorized.' }

  if (count <= 0 || count > 100) return { success: false, error: 'Please enter a count between 1 and 100.' }
  if (amount <= 0) return { success: false, error: 'Voucher amount must be positive.' }

  try {
    const batchId = 'batch_' + Math.random().toString(36).substring(2, 11)
    const generatedVouchers = []

    for (let i = 0; i < count; i++) {
      let code = ''
      let isUnique = false
      while (!isUnique) {
        const part1 = Math.random().toString(36).substring(2, 6).toUpperCase()
        const part2 = Math.random().toString(36).substring(2, 6).toUpperCase()
        code = `PY-${part1}-${part2}`
        const existing = await db.voucher.findUnique({ where: { code } })
        if (!existing) isUnique = true
      }

      const voucher = await db.voucher.create({
        data: {
          code,
          amount,
          batchId
        }
      })
      generatedVouchers.push(voucher)
    }

    revalidatePath('/dashboard/admin/vouchers')
    return { success: true, count: generatedVouchers.length }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to generate vouchers.' }
  }
}

// 16. Get list of generated vouchers (ADMIN ONLY)
export async function getRedeemableVouchersAction(): Promise<ActionState> {
  const admin = await checkAdmin()
  if (!admin) return { success: false, error: 'Unauthorized.' }

  try {
    const vouchers = await db.voucher.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })
    const formatted = vouchers.map(v => ({
      id: v.id,
      code: v.code,
      amount: Number(v.amount),
      isUsed: v.isUsed,
      usedAt: v.usedAt ? v.usedAt.toISOString() : null,
      claimedBy: v.user ? `${v.user.name || 'Anonymous'} (${v.user.email})` : null,
      createdAt: v.createdAt.toISOString()
    }))

    return { success: true, vouchers: formatted }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch vouchers.' }
  }
}

// 17. Redeem a voucher (PLAYER ACCESS)
export async function redeemVoucherAction(code: string): Promise<ActionState> {
  const session = await auth()
  if (!session?.user?.email) return { success: false, error: 'Unauthorized.' }

  const cleanCode = code.trim().toUpperCase()
  if (!cleanCode) return { success: false, error: 'Voucher code is required.' }

  try {
    const result = await db.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { email: session.user.email! } })
      if (!user) throw new Error('User not found.')

      const voucher = await tx.voucher.findUnique({ where: { code: cleanCode } })
      if (!voucher) throw new Error('Invalid voucher code.')

      if (voucher.isUsed) throw new Error('This voucher code has already been redeemed.')

      if (voucher.expiresAt && new Date() > voucher.expiresAt) {
        throw new Error('This voucher has expired.')
      }

      const amount = Number(voucher.amount)

      await tx.voucher.update({
        where: { id: voucher.id },
        data: {
          isUsed: true,
          usedById: user.id,
          usedAt: new Date()
        }
      })

      await tx.user.update({
        where: { id: user.id },
        data: {
          credits: { increment: amount }
        }
      })

      await tx.transaction.create({
        data: {
          userId: user.id,
          amount,
          type: 'TOPUP',
          reference: `Voucher Redeem: ${voucher.code}`
        }
      })

      await awardTopUpPoints(tx, user.id, amount)

      return { amount }
    })

    revalidatePath('/dashboard/topup')
    revalidatePath('/dashboard/ledger')
    revalidatePath('/dashboard/admin/vouchers')
    return { success: true, amount: result.amount, message: `Successfully redeemed voucher for ₱${result.amount.toFixed(2)}!` }
  } catch (error: any) {
    return { success: false, error: error.message || 'Voucher redemption failed.' }
  }
}

export async function adminCancelBookingAction(bookingId: string): Promise<ActionState> {
  const admin = await checkAdmin()
  if (!admin) return { success: false, error: 'Unauthorized. Staff permissions required.' }

  try {
    const result = await db.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { court: true, user: true }
      })

      if (!booking) {
        throw new Error('Booking not found.')
      }

      if (booking.status === 'CANCELLED') {
        throw new Error('Booking is already cancelled.')
      }

      const voucherUse = await tx.redemptionRequest.findFirst({
        where: { bookingId: booking.id }
      })

      if (voucherUse) {
        await tx.redemptionRequest.update({
          where: { id: voucherUse.id },
          data: {
            isUsed: false,
            usedAt: null,
            bookingId: null
          }
        })
      } else if (booking.status === 'PAID' && Number(booking.price) > 0) {
        // Guest/no-account players (identified by @southrally.guest email) paid cash at the
        // counter. Do NOT refund to their wallet — the admin handles cash refund manually.
        const isGuestAccount = booking.user.email?.endsWith('@southrally.guest') ?? false

        if (!isGuestAccount) {
          await tx.user.update({
            where: { id: booking.userId },
            data: {
              credits: { increment: Number(booking.price) }
            }
          })
        }

        // We still record the REFUND transaction for guest players so there's a ledger trail
        // and we can deduct it from day income calculations since physical cash is returned.
        await tx.transaction.create({
          data: {
            userId: booking.userId,
            amount: Number(booking.price),
            type: 'REFUND',
            reference: `REFUND-C${booking.court.number}-${booking.startTime.toLocaleDateString([], { month: '2-digit', day: '2-digit' })}`
          }
        })
      }

      await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'CANCELLED' }
      })

      return { userName: booking.user.name || 'Member' }
    })

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/bookings')
    revalidatePath('/dashboard/ledger')
    return { success: true, message: `Successfully cancelled reservation for ${result.userName}.` }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to cancel booking.' }
  }
}

// Get member details and active bookings when scanning their membership card
export async function getMemberDetailsForScanAction(searchKey: string) {
  const admin = await checkAdmin()
  if (!admin) return { success: false, error: 'Unauthorized. Staff permissions required.' }

  try {
    const cleanSearchKey = searchKey.trim()
    let user = await db.user.findUnique({
      where: { id: cleanSearchKey },
      select: {
        id: true,
        name: true,
        email: true,
        credits: true
      }
    })

    if (!user) {
      user = await db.user.findUnique({
        where: { email: cleanSearchKey.toLowerCase() },
        select: {
          id: true,
          name: true,
          email: true,
          credits: true
        }
      })
    }

    if (!user) {
      return { success: false, error: 'Member not found.' }
    }

    // Fetch active bookings (RESERVED, PAID, PENDING)
    const bookings = await db.booking.findMany({
      where: {
        userId: user.id,
        status: { in: ['RESERVED', 'PAID', 'PENDING'] }
      },
      include: {
        court: { select: { name: true } }
      },
      orderBy: { startTime: 'asc' }
    })

    return {
      success: true,
      member: {
        id: user.id,
        name: user.name || 'Member',
        email: user.email,
        credits: Number(user.credits),
        activeBookings: bookings.map(b => ({
          id: b.id,
          courtName: b.court.name,
          startTime: b.startTime.toISOString(),
          endTime: b.endTime.toISOString(),
          price: Number(b.price),
          status: b.status
        }))
      }
    }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to load member details.' }
  }
}

// Complete manual top-up (CASH or ONLINE with base64 receipt)
export async function adminConfirmTopupAction(
  userId: string,
  amount: number,
  paymentMethod: 'CASH' | 'ONLINE',
  receiptImage?: string | null
): Promise<ActionState> {
  const admin = await checkAdmin()
  if (!admin) return { success: false, error: 'Unauthorized. Staff permissions required.' }

  if (!amount || amount <= 0) {
    return { success: false, error: 'Invalid top up amount.' }
  }

  try {
    await db.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } })
      if (!user) throw new Error('User not found.')

      // Update user credits
      await tx.user.update({
        where: { id: user.id },
        data: { credits: Number(user.credits) + amount }
      })

      // Create ledger entry using reference field to store base64 image if ONLINE
      let refStr = `CASH-${new Date().getTime()}`
      if (paymentMethod === 'ONLINE' && receiptImage) {
        refStr = `ONLINE_PAYMENT_RECEIPT|${receiptImage}`
      }

      await tx.transaction.create({
        data: {
          userId: user.id,
          amount,
          type: 'TOPUP',
          reference: refStr
        }
      })

      // Award loyalty points
      await awardTopUpPoints(tx, user.id, amount)
    })

    revalidatePath('/dashboard/admin')
    revalidatePath('/dashboard/admin/users')
    revalidatePath('/dashboard/yard-points')
    revalidatePath('/dashboard/ledger')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to top up balance.' }
  }
}

// ── Launch Credits / Signup Promo Tracker ──────────────────────────────────────
// Groups by userId so that users with multiple promo entries are not double-counted.
// Correct "unused promo" formula: spending is assumed to consume promo first (FIFO).
//   promoUsed   = min(totalPromoReceived, totalSpent)
//   unusedPromo = max(0, totalPromoReceived - promoUsed)
//
// NOTE: This is READ-ONLY. No data is modified here.
export async function getSignupPromoCreditUsersAction(): Promise<ActionState> {
  const admin = await checkAdmin()
  if (!admin) return { success: false, error: 'Unauthorized.' }

  try {
    // Fetch every promo credit transaction (could be multiple per user in edge cases)
    const promoTransactions = await db.transaction.findMany({
      where: {
        type: 'TOPUP',
        reference: { startsWith: 'Auto Sign-up Promo Credit' }
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, credits: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    // --- GROUP BY userId so each player appears exactly once ---
    const userMap = new Map<string, {
      userId: string
      user: any
      totalPromoReceived: number
      firstReceivedAt: Date
    }>()

    for (const tx of promoTransactions) {
      const uid = tx.userId
      if (!userMap.has(uid)) {
        userMap.set(uid, {
          userId: uid,
          user: tx.user,
          totalPromoReceived: 0,
          firstReceivedAt: tx.createdAt
        })
      }
      userMap.get(uid)!.totalPromoReceived += Number(tx.amount)
    }

    // --- For each unique user compute all stats ---
    const results = await Promise.all(
      [...userMap.values()].map(async (entry) => {
        const { userId, user, totalPromoReceived, firstReceivedAt } = entry

        // Sum of all debit (spending) transactions
        const debits = await db.transaction.aggregate({
          where: {
            userId,
            type: { in: ['BOOKING_DEBIT', 'EVENT_DEBIT'] }
          },
          _sum: { amount: true }
        })
        const totalSpent = Number(debits._sum.amount ?? 0)

        // Promo is consumed first (FIFO): promoUsed can't exceed promoReceived
        const promoUsed = Math.min(totalPromoReceived, totalSpent)
        const unusedPromo = Math.max(0, totalPromoReceived - promoUsed)

        // Sum all NON-promo top-ups (real cash deposits)
        const ownTopups = await db.transaction.aggregate({
          where: {
            userId,
            type: { in: ['TOPUP', 'CASH_TOPUP'] },
            NOT: { reference: { startsWith: 'Auto Sign-up Promo Credit' } }
          },
          _sum: { amount: true }
        })
        const regularTopupTotal = Number(ownTopups._sum.amount ?? 0)

        return {
          userId,
          userName: user?.name || 'Unknown',
          userEmail: user?.email || '',
          promoAmount: totalPromoReceived,
          totalSpent,
          promoUsed,
          unusedPromo,
          regularTopupTotal,
          currentBalance: Number(user?.credits ?? 0),
          receivedAt: firstReceivedAt.toISOString()
        }
      })
    )

    // Sort: players with most unused promo first
    results.sort((a, b) => b.unusedPromo - a.unusedPromo)

    return { success: true, users: results }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch promo credit data.' }
  }
}

// ── Expire Unused Promo Credits ─────────────────────────────────────────────────
// Deducts a player's unused promo balance and logs it as a PROMO_EXPIRY transaction.
// Only the exact unused promo amount is deducted — own top-up credits are untouched.
// No schema changes required: uses existing Transaction model with type 'PROMO_EXPIRY'.
export async function expirePromoCreditsAction(params: {
  userId: string
  amount: number
  userName: string
}): Promise<ActionState> {
  const admin = await checkAdmin()
  if (!admin) return { success: false, error: 'Unauthorized.' }

  const { userId, amount, userName } = params

  if (!userId) return { success: false, error: 'User ID is required.' }
  if (amount <= 0) return { success: false, error: 'Amount must be greater than zero.' }

  try {
    await db.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } })
      if (!user) throw new Error('User not found.')

      const currentBalance = Number(user.credits)
      if (currentBalance < amount) {
        throw new Error(
          `Cannot expire ₱${amount.toFixed(2)} — ${userName} only has ₱${currentBalance.toFixed(2)} in their wallet.`
        )
      }

      // Deduct the unused promo from the user's wallet
      await tx.user.update({
        where: { id: userId },
        data: { credits: { decrement: amount } }
      })

      // Log as a PROMO_EXPIRY transaction so it shows on the player's ledger
      await tx.transaction.create({
        data: {
          userId,
          amount,
          type: 'PROMO_EXPIRY',
          reference: `Launch promo credit expired — ₱${amount.toFixed(2)} unused promo removed by admin`
        }
      })
    })

    revalidatePath('/dashboard/ledger')
    revalidatePath('/dashboard/admin/users')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to expire promo credits.' }
  }
}

// ── No-Account Player Booking ───────────────────────────────────────────────────
// Books a court slot for a walk-in player who has no South Rally account.
// Creates a placeholder user record, marks the booking PAID, and records a CASH_TOPUP.
export async function adminNoAccountBookingAction(params: {
  guestName: string
  amountPaid?: number
  courtId: string
  startTimes: string[]
}): Promise<ActionState> {
  const admin = await checkAdmin()
  if (!admin) return { success: false, error: 'Unauthorized.' }

  const { guestName, courtId, startTimes } = params

  if (!guestName.trim()) return { success: false, error: 'Player name is required.' }
  if (!courtId) return { success: false, error: 'Court is required.' }
  if (startTimes.length === 0) return { success: false, error: 'At least one time slot is required.' }

  try {
    const court = await db.court.findUnique({ where: { id: courtId } })
    if (!court) return { success: false, error: 'Court not found.' }

    // Fetch daytime/nighttime pricing settings
    const priceSettings = await db.systemSetting.findMany({
      where: { key: { in: ['booking_price_per_hour', 'booking_daytime_price', 'booking_daytime_start_hour', 'booking_daytime_end_hour', 'booking_nighttime_price'] } }
    })
    const psMap: Record<string, string> = {}
    for (const s of priceSettings) psMap[s.key] = s.value

    const daytimeStart = parseInt(psMap.booking_daytime_start_hour ?? '8')
    const daytimeEnd = parseInt(psMap.booking_daytime_end_hour ?? '17')
    const daytimePrice = parseFloat(psMap.booking_daytime_price ?? psMap.booking_price_per_hour ?? '250')
    const nighttimePrice = parseFloat(psMap.booking_nighttime_price ?? psMap.booking_price_per_hour ?? '300')

    const getRateForHour = (hour: number): number => {
      const base = (hour >= daytimeStart && hour < daytimeEnd) ? daytimePrice : nighttimePrice
      return court.type === 'ROOFTOP' ? 300.00 : base
    }

    const cleanName = guestName.trim().replace(/[^a-zA-Z0-9 ]/g, '')
    const emailSlug = cleanName.toLowerCase().replace(/\s+/g, '-')
    const guestEmail = `guest-${emailSlug}-${Math.random().toString(36).substring(2, 7)}@southrally.guest`

    await db.$transaction(async (tx) => {
      // 1. Create the placeholder guest User record (with PLAYER role so it displays as standard Player booking)
      const guestUser = await tx.user.create({
        data: {
          name: guestName.trim(),
          email: guestEmail,
          role: 'PLAYER',
          credits: 0
        }
      })

      let computedTotal = 0

      // 2. Create bookings
      for (const startTimeISO of startTimes) {
        const startTime = new Date(startTimeISO)
        const endTime = new Date(startTime.getTime() + 60 * 60 * 1000)
        const slotHour = startTime.getHours()
        const priceForSlot = getRateForHour(slotHour)
        computedTotal += priceForSlot

        await tx.booking.create({
          data: {
            userId: guestUser.id,
            courtId,
            startTime,
            endTime,
            status: 'PAID',
            price: priceForSlot,
          }
        })
      }

      // 3. Record a CASH transaction for tracking, associated with the guest user
      await tx.transaction.create({
        data: {
          userId: guestUser.id,
          amount: computedTotal,
          type: 'CASH_TOPUP',
          reference: `NO-ACCOUNT|GUEST:${guestName.trim()}|SLOTS:${startTimes.length}|COURT:${court.name}`
        }
      })
    })

    revalidatePath('/dashboard/bookings')
    revalidatePath('/dashboard/ledger')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create no-account booking.' }
  }
}
