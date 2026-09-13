import * as React from 'react'
import { Button, Link, Text } from '@react-email/components'
import { BrandedEmail, styles, BRAND } from './_layout'

interface EmailChangeEmailProps {
  siteName: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <BrandedEmail preview={`Confirm your email change for ${BRAND.name}`}>
    <Text style={styles.eyebrow}>Confirm change</Text>
    <Text style={styles.h1}>Confirm your new email</Text>
    <Text style={styles.p}>
      You requested to change your {BRAND.name} email from{' '}
      <Link href={`mailto:${oldEmail}`} style={styles.link}>{oldEmail}</Link>{' '}
      to{' '}
      <Link href={`mailto:${newEmail}`} style={styles.link}>{newEmail}</Link>.
    </Text>
    <div style={styles.ctaWrap}>
      <Button href={confirmationUrl} style={styles.cta}>
        Confirm email change
      </Button>
    </div>
    <Text style={styles.small}>
      If you didn't request this change, please secure your account immediately by resetting your
      password.
    </Text>
  </BrandedEmail>
)

export default EmailChangeEmail
