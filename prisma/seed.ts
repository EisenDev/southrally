import { PrismaClient, BookingStatus, SkillLevel } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database with production settings...')

  // Clean existing tables to start fresh
  await prisma.transaction.deleteMany()
  await prisma.paddleStack.deleteMany()
  await prisma.booking.deleteMany()
  await prisma.clubEvent.deleteMany()
  await prisma.court.deleteMany()
  await prisma.systemSetting.deleteMany()
  await prisma.user.deleteMany()

  // Seed default settings
  await prisma.systemSetting.createMany({
    data: [
      { key: 'booking_duration_minutes', value: '60' },
      { key: 'booking_price_per_hour', value: '250' },
      { key: 'openplay_match_duration_seconds', value: '900' },
      { key: 'openplay_expiry_hours', value: '3' },
      { key: 'openplay_entry_fee', value: '150' }
    ]
  })

  // Create the official Admin account with pre-hashed password "Pickleball1234"
  const hashedPassword = '$2b$12$2g9iwDDcpiXuP8L09CHRzugEz4R8rFMx6saAK7bYXoJpTohVbMCGm'
  await prisma.user.create({
    data: {
      name: 'South Rally Admin',
      email: 'pickleballsulop@gmail.com',
      hashedPassword,
      duprRating: 3.5,
      credits: 0.00,
      membership: 'VIP',
      role: 'ADMIN'
    }
  })

  console.log('Admin user created')

  // Create 10 Indoor Courts. All playable (AVAILABLE status)
  const courts = []
  for (let i = 1; i <= 10; i++) {
    const court = await prisma.court.create({
      data: {
        number: i,
        name: `Court ${i}`,
        type: 'INDOOR',
        status: 'AVAILABLE',
        gameDurationSecond: 900
      }
    })
    courts.push(court)
  }
  console.log('10 Indoor courts created (All 10 Available, 15-min duration)')

  console.log('Production seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
