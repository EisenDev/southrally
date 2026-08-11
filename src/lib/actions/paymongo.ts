'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export type PaymongoSessionResult =
  | { success: true; checkoutUrl: string }
  | { success: false; error: string }

export async function createPaymongoSessionAction(
  amount: number,
  method: 'instapay' | 'gcash' | 'maya' | 'bank'
): Promise<PaymongoSessionResult> {
  const session = await auth()
  if (!session?.user?.email) {
    return { success: false, error: 'Unauthorized.' }
  }

  if (!amount || amount < 50) {
    return { success: false, error: 'Minimum top up amount is ₱50.00.' }
  }

  // Find user
  const user = await db.user.findUnique({
    where: { email: session.user.email }
  })
  if (!user) {
    return { success: false, error: 'User not found.' }
  }

  // Map client method to PayMongo payment method types
  let paymentMethodTypes: string[] = ['gcash']
  if (method === 'gcash') {
    paymentMethodTypes = ['gcash']
  } else if (method === 'maya') {
    paymentMethodTypes = ['paymaya']
  } else if (method === 'instapay') {
    paymentMethodTypes = ['qrph']
  } else if (method === 'bank') {
    paymentMethodTypes = ['dob', 'dob_ubp', 'card']
  }

  const amountInCentavos = Math.round(amount * 100)
  const paymongoSecretKey = process.env.PAYMONGO_SECRET_KEY || ''
  
  try {
    const response = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(paymongoSecretKey + ':').toString('base64')
      },
      body: JSON.stringify({
        data: {
          attributes: {
            show_description: true,
            show_line_items: true,
            payment_method_types: paymentMethodTypes,
            line_items: [
              {
                amount: amountInCentavos,
                currency: 'PHP',
                name: 'South Rally Credits Top-Up',
                quantity: 1
              }
            ],
            success_url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard/topup?success=true`,
            cancel_url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard/topup?cancel=true`,
            description: `Top-up ₱${amount.toFixed(2)} for ${user.name}`,
            metadata: {
              userId: user.id,
              amount: amount.toString()
            }
          }
        }
      })
    })

    const json = await response.json()
    if (!response.ok) {
      const errorMsg = json.errors?.[0]?.detail || 'Failed to create checkout session.'
      return { success: false, error: errorMsg }
    }

    const checkoutUrl = json.data?.attributes?.checkout_url
    if (!checkoutUrl) {
      return { success: false, error: 'Checkout URL not found in response.' }
    }

    return { success: true, checkoutUrl }
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error creating PayMongo session.' }
  }
}
