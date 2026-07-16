import * as React from 'react'
import { Button, Text } from '@react-email/components'
import { BrandedEmail, styles, BRAND } from './_layout'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ confirmationUrl }: RecoveryEmailProps) => (
  <BrandedEmail preview={`Reset your ${BRAND.name} password`}>
    <Text style={styles.eyebrow}>Password reset</Text>
    <Text style={styles.h1}>Reset your password</Text>
    <Text style={styles.p}>
      We received a request to reset the password for your {BRAND.name} account. Click below to
      choose a new one.
    </Text>
    <div style={styles.ctaWrap}>
      <Button href={confirmationUrl} style={styles.cta}>
        Reset password
      </Button>
    </div>
    <Text style={styles.small}>
      If you didn't request a password reset, you can safely ignore this email — your password will
      not change.
    </Text>
  </BrandedEmail>
)

export default RecoveryEmail
