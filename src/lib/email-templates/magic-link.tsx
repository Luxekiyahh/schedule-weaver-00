import * as React from 'react'
import { Button, Text } from '@react-email/components'
import { BrandedEmail, styles, BRAND } from './_layout'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ confirmationUrl }: MagicLinkEmailProps) => (
  <BrandedEmail preview={`Your ${BRAND.name} login link`}>
    <Text style={styles.eyebrow}>One-time login</Text>
    <Text style={styles.h1}>Sign in to {BRAND.name}</Text>
    <Text style={styles.p}>
      Tap the button below to sign in. This link expires shortly and can only be used once.
    </Text>
    <div style={styles.ctaWrap}>
      <Button href={confirmationUrl} style={styles.cta}>
        Sign in
      </Button>
    </div>
    <Text style={styles.small}>
      If you didn't request this link, you can safely ignore this email.
    </Text>
  </BrandedEmail>
)

export default MagicLinkEmail
