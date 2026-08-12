import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

function getAdminCredentials() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.ADMIN_PASSWORD

  if (!email || !email.includes('@')) {
    throw new Error('ADMIN_EMAIL must be a valid email address')
  }

  if (!password || password.length < 8) {
    throw new Error('ADMIN_PASSWORD must contain at least 8 characters')
  }

  return { email, password }
}

async function clearApplicationData() {
  await prisma.$transaction([
    prisma.redemptionRequest.deleteMany(),
    prisma.yardPointLog.deleteMany(),
    prisma.transaction.deleteMany(),
    prisma.paddleStack.deleteMany(),
    prisma.booking.deleteMany(),
    prisma.voucher.deleteMany(),
    prisma.session.deleteMany(),
    prisma.account.deleteMany(),
    prisma.verificationToken.deleteMany(),
    prisma.clubEvent.deleteMany(),
    prisma.shopProduct.deleteMany(),
    prisma.court.deleteMany(),
    prisma.systemSetting.deleteMany(),
    prisma.user.deleteMany(),
  ])
}

async function main() {
  const { email, password } = getAdminCredentials()
  const hashedPassword = await bcrypt.hash(password, 12)

  console.log('Seeding a fresh South Rally database...')
  await clearApplicationData()

  await prisma.systemSetting.createMany({
    data: [
      { key: 'booking_duration_minutes', value: '60' },
      { key: 'booking_price_per_hour', value: '250' },
      { key: 'openplay_match_duration_seconds', value: '900' },
      { key: 'openplay_expiry_hours', value: '3' },
      { key: 'openplay_entry_fee', value: '150' },
    ],
  })

  await prisma.user.create({
    data: {
      name: 'South Rally Admin',
      email,
      emailVerified: new Date(),
      hashedPassword,
      duprRating: 3.5,
      credits: 0,
      membership: 'VIP',
      role: 'ADMIN',
    },
  })

  await prisma.court.createMany({
    data: Array.from({ length: 10 }, (_, index) => ({
      number: index + 1,
      name: `Court ${index + 1}`,
      type: 'INDOOR',
      status: 'AVAILABLE',
      gameDurationSecond: 900,
    })),
  })

  console.log('South Rally database seeded with one administrator and ten courts.')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
