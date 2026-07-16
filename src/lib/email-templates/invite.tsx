import * as React from 'react'
import { Button, Text } from '@react-email/components'
import { BrandedEmail, styles, BRAND } from './_layout'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ confirmationUrl }: InviteEmailProps) => (
  <BrandedEmail preview={`You've been invited to ${BRAND.name}`}>
    <Text style={styles.eyebrow}>You're invited</Text>
    <Text style={styles.h1}>Join {BRAND.name}</Text>
    <Text style={styles.p}>
      You've been invited to join a team on {BRAND.name}. Accept the invitation to create your
      account and get started.
    </Text>
    <div style={styles.ctaWrap}>
      <Button href={confirmationUrl} style={styles.cta}>
        Accept invitation
      </Button>
    </div>
    <Text style={styles.small}>
      If you weren't expecting this invitation, you can safely ignore this email.
    </Text>
  </BrandedEmail>
)

export default InviteEmail
