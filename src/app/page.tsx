'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  Gift,
  Menu,
  QrCode,
  Star,
  Trophy,
  Users,
  X,
} from 'lucide-react'
import { SignInModal } from '@/components/auth/signin-modal'
import styles from './landing.module.css'

type LandingSession = {
  user?: {
    name?: string | null
    email?: string | null
  }
}

const experienceCards = [
  {
    title: 'Book in Seconds',
    description: 'See live schedules and reserve without back-and-forth.',
    icon: CalendarDays,
    tone: 'purple',
  },
  {
    title: 'Find Your Match',
    description: 'Join Open Play based on your level and availability.',
    icon: Users,
    tone: 'green',
  },
  {
    title: 'Check In Fast',
    description: 'Use your player QR for smooth court arrivals.',
    icon: QrCode,
    tone: 'ivory',
  },
  {
    title: 'Earn Every Rally',
    description: 'Collect rewards each time you play.',
    icon: Trophy,
    tone: 'ivory',
  },
] as const

const events = [
  { category: 'Social Play', title: 'Friday Night Rally', month: 'Aug', day: '21', time: '6:00 PM', tone: 'purple' },
  { category: 'Learn & Play', title: "Beginner's Mixer", month: 'Aug', day: '24', time: '4:00 PM', tone: 'green' },
  { category: 'Club Tournament', title: 'South Rally Cup', month: 'Sep', day: '06', time: '8:00 AM', tone: 'ivory' },
] as const

function OAuthErrorHandler({ onError }: { onError: (message: string) => void }) {
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('error') === 'OAuthAccountNotLinked') {
      onError('This email is already registered with a different sign-in method. Please use email and password to sign in.')
    }
  }, [onError, searchParams])

  return null
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className={styles.brand}>
      <Image
        src="/south-rally-logo.png"
        alt="South Rally crossed pickleball paddles crest"
        width={compact ? 64 : 88}
        height={compact ? 64 : 88}
        className={styles.brandLogo}
        priority={compact}
      />
      <span className={styles.brandLockup}>
        <span className={styles.brandName}>South Rally</span>
        <span className={styles.brandRule} aria-hidden="true"><i /></span>
      </span>
    </span>
  )
}

export default function LandingPage() {
  const [session, setSession] = useState<LandingSession | null>(null)
  const [isSignInOpen, setIsSignInOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    fetch('/api/auth/session', { signal: controller.signal })
      .then((response) => response.json() as Promise<LandingSession>)
      .then((activeSession) => {
        if (activeSession.user) setSession(activeSession)
      })
      .catch(() => undefined)

    return () => controller.abort()
  }, [])

  useEffect(() => {
    const updateHeader = () => setScrolled(window.scrollY > 24)
    updateHeader()
    window.addEventListener('scroll', updateHeader, { passive: true })
    return () => window.removeEventListener('scroll', updateHeader)
  }, [])

  const publicSignupHref = '/signup'
  const closeMobileMenu = () => setMobileMenuOpen(false)
  const handleOAuthError = useCallback((message: string) => {
    setAuthError(message)
    setIsSignInOpen(true)
  }, [])

  return (
    <div className={styles.page}>
      <header className={`${styles.header} ${scrolled ? styles.headerScrolled : ''}`}>
        <div className={styles.headerInner}>
          <Link href="#top" className={styles.brandLink} aria-label="South Rally home">
            <Brand compact />
          </Link>

          <nav className={styles.desktopNav} aria-label="Primary navigation">
            <Link href="#top">Home</Link>
            <Link href="#courts">Courts</Link>
            <Link href="#open-play">Open Play</Link>
            <Link href="#events">Events</Link>
            <Link href="#experience">About</Link>
          </nav>

          <div className={styles.headerActions}>
            {session ? (
              <Link href="/dashboard" className={styles.lightButton}>Go to Dashboard</Link>
            ) : (
              <>
                <button type="button" className={styles.textButton} onClick={() => setIsSignInOpen(true)}>Login</button>
                <Link href="/signup" className={styles.lightButton}>Book a Court</Link>
              </>
            )}
          </div>

          <button
            type="button"
            className={styles.menuButton}
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
          >
            {mobileMenuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <nav id="mobile-navigation" className={styles.mobileNav} aria-label="Mobile navigation">
            <Link href="#top" onClick={closeMobileMenu}>Home</Link>
            <Link href="#courts" onClick={closeMobileMenu}>Courts</Link>
            <Link href="#open-play" onClick={closeMobileMenu}>Open Play</Link>
            <Link href="#events" onClick={closeMobileMenu}>Events</Link>
            <Link href="#experience" onClick={closeMobileMenu}>About</Link>
            {session ? (
              <Link href="/dashboard" className={styles.mobileBookButton} onClick={closeMobileMenu}>Go to Dashboard</Link>
            ) : (
              <>
                <button type="button" onClick={() => { closeMobileMenu(); setIsSignInOpen(true) }}>Login</button>
                <Link href="/signup" className={styles.mobileBookButton} onClick={closeMobileMenu}>Book a Court</Link>
              </>
            )}
          </nav>
        )}
      </header>

      <main>
        <section id="top" className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroGlow} aria-hidden="true" />
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}><span>✦</span> Your court. Your community.</p>
              <h1 id="hero-title">Rally More.<br />Belong Here.</h1>
              <p className={styles.heroLead}>Book a court, find your next match, and become part of a pickleball community built for everyone.</p>
              <div className={styles.heroButtons}>
                <Link href={publicSignupHref} className={styles.lightButton}>Book a Court</Link>
                <Link href={publicSignupHref} className={styles.outlineButton}>Explore Open Play</Link>
              </div>
              <div className={styles.heroBenefits} aria-label="South Rally benefits">
                <span><CalendarDays aria-hidden="true" />Easy Booking</span>
                <span><Users aria-hidden="true" />Open Play</span>
                <span><Trophy aria-hidden="true" />Member Rewards</span>
              </div>
            </div>

            <div className={styles.heroVisual} aria-label="South Rally court finder preview">
              <div className={`${styles.paddle} ${styles.paddleLeft}`} aria-hidden="true"><i /></div>
              <div className={`${styles.paddle} ${styles.paddleRight}`} aria-hidden="true"><i /></div>
              <div className={styles.pickleball} aria-hidden="true">••<br />•••</div>
              <div className={styles.finderCard}>
                <div className={styles.cardHeading}><h2>Find a Court</h2><span>✦</span></div>
                <label>Date <span><CalendarDays aria-hidden="true" />Today</span></label>
                <label>Time <span><Clock3 aria-hidden="true" />6:00 PM</span></label>
                <label>Court <span>▦ Any Court</span></label>
                <Link href={publicSignupHref} className={styles.purpleButton}>Check Availability</Link>
              </div>
            </div>
          </div>
        </section>

        <section id="experience" className={`${styles.section} ${styles.experience}`} aria-labelledby="experience-title">
          <div className={styles.sectionInner}>
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}>The South Rally experience</p>
              <h2 id="experience-title">More than a court.<br />It’s where the rally begins.</h2>
              <p>Everything you need to play more often, meet the right people, and enjoy every match—without the usual hassle.</p>
            </div>
            <div className={styles.experienceGrid}>
              {experienceCards.map(({ title, description, icon: Icon, tone }) => (
                <article key={title} className={`${styles.experienceCard} ${styles[tone]}`}>
                  <Icon aria-hidden="true" />
                  <span className={styles.cardOrnament} aria-hidden="true">— ◆ —</span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </article>
              ))}
            </div>
            <blockquote>“Built for casual games, competitive rallies, and everyone in between.”</blockquote>
          </div>
        </section>

        <section id="courts" className={`${styles.section} ${styles.bookingSection}`} aria-labelledby="courts-title">
          <div className={`${styles.sectionInner} ${styles.splitSection}`}>
            <div className={styles.splitCopy}>
              <p className={styles.eyebrow}>Court booking</p>
              <h2 id="courts-title">Your next game is only a few taps away.</h2>
              <p>See real-time availability, choose your schedule, and secure your court instantly.</p>
              <ul>
                <li><Check aria-hidden="true" />Live court availability</li>
                <li><Check aria-hidden="true" />Flexible time slots</li>
                <li><Check aria-hidden="true" />Instant booking confirmation</li>
              </ul>
              <Link href={publicSignupHref} className={styles.outlineButton}>▦ View All Courts</Link>
            </div>
            <div className={styles.bookingPreview}>
              <Image src="/south-rally-logo.png" alt="" width={58} height={58} />
              <h3>Reserve a Court</h3>
              <div className={styles.previewTabs}><strong>Today</strong><span>Tomorrow</span><span>This Week</span></div>
              <div className={styles.previewRow}><span><CalendarDays aria-hidden="true" />Date</span><strong>Aug 14</strong></div>
              <div className={styles.previewRow}><span><Clock3 aria-hidden="true" />Time</span><strong>6:00 PM</strong></div>
              <div className={`${styles.previewRow} ${styles.selectedRow}`}><span>▦ Court 1</span><strong>Available ✓</strong></div>
              <div className={styles.previewRow}><span>▦ Court 2</span><strong>7:00 PM →</strong></div>
              <Link href={publicSignupHref} className={styles.greenButton}>Continue Booking</Link>
              <small><Check aria-hidden="true" /> Instant confirmation</small>
            </div>
          </div>
        </section>

        <section id="open-play" className={`${styles.section} ${styles.openPlay}`} aria-labelledby="open-play-title">
          <div className={`${styles.sectionInner} ${styles.splitSection}`}>
            <div className={styles.splitCopy}>
              <p className={styles.eyebrow}>⚜ Open play</p>
              <h2 id="open-play-title">Show up solo.<br />Leave with a game.</h2>
              <p>Choose your level and schedule. We’ll place you with players ready to rally.</p>
              <Link href={publicSignupHref} className={styles.purpleButton}>Join Open Play</Link>
              <small>No group chat. No awkward waiting. Just play.</small>
            </div>
            <div className={styles.matchCard}>
              <Image src="/south-rally-logo.png" alt="" width={54} height={54} />
              <h3>Find My Match</h3>
              <div className={styles.skillTabs}><span>Beginner</span><strong>Intermediate</strong><span>Advanced</span></div>
              <div className={styles.matchInfo}><Clock3 aria-hidden="true" /><span>Preferred Time<strong>Tonight, 6:00 PM</strong></span></div>
              <div className={styles.matchInfo}><Users aria-hidden="true" /><span>Players Needed<strong>2 more</strong></span></div>
              <div className={styles.playerDots} aria-label="Four player places"><i /><i /><i /><i /></div>
              <Link href={publicSignupHref} className={styles.greenButton}>Join the Queue</Link>
              <small>● Matching players near your level</small>
            </div>
          </div>
        </section>

        <section id="membership" className={`${styles.section} ${styles.membership}`} aria-labelledby="membership-title">
          <div className={styles.sectionInner}>
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}>Membership & rewards</p>
              <h2 id="membership-title">Every rally counts.</h2>
              <p>Check in with one player QR, earn points whenever you play, and unlock club rewards along the way.</p>
            </div>
            <div className={styles.membershipGrid}>
              <div className={styles.memberPass}>
                <div className={styles.passTop}><Image src="/south-rally-logo.png" alt="South Rally member crest" width={132} height={132} /><div><strong>Alex Rivera</strong><span>Rally Member</span></div></div>
                <div className={styles.passBottom}><span>South Rally</span><div className={styles.fakeQr} aria-label="Member QR code preview">▦<br />▤</div><small>Member no.<br /><strong>SR-0248</strong></small></div>
              </div>
              <div className={styles.progressCard}>
                <h3><Trophy aria-hidden="true" /> Your Rally Progress</h3>
                <p>Court Regular</p>
                <strong className={styles.points}>1,240 <small>points</small></strong>
                <div className={styles.progressTrack}><i /></div>
                <span>760 pts to Club Ace</span>
                <div className={styles.rewardGrid}>
                  <div><Clock3 aria-hidden="true" /><strong>Free Court Hour</strong><span>2,000 pts</span></div>
                  <div><Users aria-hidden="true" /><strong>Guest Pass</strong><span>3,500 pts</span></div>
                  <div><CalendarDays aria-hidden="true" /><strong>Priority Booking</strong><span>5,000 pts</span></div>
                </div>
                <Link href={publicSignupHref} className={styles.outlineDarkButton}>View Rewards <ArrowRight aria-hidden="true" /></Link>
              </div>
            </div>
            <div className={styles.rewardBenefits}>
              <span><QrCode aria-hidden="true" /><strong>One QR Check-In</strong><small>Fast, simple, one scan to play.</small></span>
              <span><Star aria-hidden="true" /><strong>Points Every Game</strong><small>Earn every time you step on court.</small></span>
              <span><Gift aria-hidden="true" /><strong>Member-Only Perks</strong><small>Exclusive rewards just for you.</small></span>
            </div>
          </div>
        </section>

        <section id="events" className={`${styles.section} ${styles.events}`} aria-labelledby="events-title">
          <div className={styles.sectionInner}>
            <div className={styles.eventsHeading}>
              <div><p className={styles.eyebrow}>✦ Events & community</p><h2 id="events-title">There’s always another rally.</h2><p>From relaxed social games to competitive club nights, there’s a place for every kind of player.</p></div>
              <Link href={publicSignupHref} className={styles.outlineDarkButton}>View All Events <ArrowRight aria-hidden="true" /></Link>
            </div>
            <div className={styles.eventGrid}>
              {events.map((event) => (
                <article key={event.title} className={`${styles.eventCard} ${styles[event.tone]}`}>
                  <span>{event.category}</span>
                  <div className={styles.eventBall} aria-hidden="true">•••</div>
                  <h3>{event.title}</h3>
                  <div className={styles.eventMeta}><strong>{event.month}<b>{event.day}</b></strong><i /><strong>{event.time}</strong></div>
                  <div className={styles.courtLines} aria-hidden="true" />
                  <Link href={publicSignupHref}>Reserve Spot <ArrowRight aria-hidden="true" /></Link>
                </article>
              ))}
            </div>
            <div className={styles.communityNote}><span>✦ Good games bring people together.</span><span>Join 100+ local players ✦</span></div>
          </div>
        </section>

        <section id="join" className={styles.joinSection} aria-labelledby="join-title">
          <div className={styles.joinInner}>
            <h2 id="join-title">Ready to join the rally?</h2>
            <div className={styles.joinOrnament} aria-hidden="true">—— ⚜ ——</div>
            <p>Your next court, match, and community are waiting.</p>
            <div className={styles.heroButtons}>
              <Link href={publicSignupHref} className={styles.lightButton}>Book a Court <ArrowRight aria-hidden="true" /></Link>
              <Link href={publicSignupHref} className={styles.outlineButton}>Create an Account <ArrowRight aria-hidden="true" /></Link>
            </div>
            <div className={styles.joinFeatures}><span>Real-Time Booking</span><i /> <span>Open Play Matching</span><i /> <span>Member Rewards</span><i /> <span>QR Check-In</span></div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerGrid}>
          <div className={styles.footerBrand}><Brand /><p>Play often. <strong>Rally together.</strong></p></div>
          <nav aria-label="Play links"><h2>Play</h2><Link href="#courts">Courts</Link><Link href="#open-play">Open Play</Link><Link href="#events">Events</Link></nav>
          <nav aria-label="Club links"><h2>Club</h2><Link href="#experience">About</Link><Link href="#membership">Membership</Link><a href="mailto:hello@southrally.example">Contact</a></nav>
          <nav aria-label="Support links"><h2>Support</h2><a href="#">Help Center</a><a href="#">Terms</a><a href="#">Privacy</a></nav>
          <div className={styles.socials}><a href="#" aria-label="South Rally on Instagram">◎</a><a href="#" aria-label="South Rally on Facebook">f</a><a href="#" aria-label="South Rally on TikTok">♪</a></div>
        </div>
        <div className={styles.copyright}>© 2026 South Rally Pickleball Club. All rights reserved.</div>
      </footer>

      <Suspense fallback={null}>
        <OAuthErrorHandler onError={handleOAuthError} />
      </Suspense>
      <SignInModal isOpen={isSignInOpen} onClose={() => { setIsSignInOpen(false); setAuthError(null) }} initialError={authError} />
    </div>
  )
}
