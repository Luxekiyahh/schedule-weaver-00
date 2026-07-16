import * as React from 'react'
import { Button, Link, Text } from '@react-email/components'
import { BrandedEmail, styles, BRAND } from './_layout'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <BrandedEmail preview={`Confirm your email for ${BRAND.name}`}>
    <Text style={styles.eyebrow}>Confirm your email</Text>
    <Text style={styles.h1}>Welcome to {BRAND.name}</Text>
    <Text style={styles.p}>
      Thanks for signing up. Confirm your email address
      {recipient ? (
        <>
          {' '}(
          <Link href={`mailto:${recipient}`} style={styles.link}>
            {recipient}
          </Link>
          )
        </>
      ) : null}{' '}
      to activate your account.
    </Text>
    <div style={styles.ctaWrap}>
      <Button href={confirmationUrl} style={styles.cta}>
        Verify email
      </Button>
    </div>
    <Text style={styles.small}>
      If you didn't create a {BRAND.name} account, you can safely ignore this email.
    </Text>
  </BrandedEmail>
)

export default SignupEmail
