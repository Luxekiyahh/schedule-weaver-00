import * as React from 'react'
import { Text } from '@react-email/components'
import { BrandedEmail, styles, BRAND } from './_layout'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <BrandedEmail preview={`Your ${BRAND.name} verification code`}>
    <Text style={styles.eyebrow}>Verify identity</Text>
    <Text style={styles.h1}>Confirm reauthentication</Text>
    <Text style={styles.p}>Use the code below to confirm your identity:</Text>
    <Text style={codeStyle}>{token}</Text>
    <Text style={styles.small}>
      This code will expire shortly. If you didn't request it, you can safely ignore this email.
    </Text>
  </BrandedEmail>
)

export default ReauthenticationEmail

const codeStyle = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  fontSize: '28px',
  fontWeight: 'bold' as const,
  letterSpacing: '0.24em',
  color: BRAND.ink,
  textAlign: 'center' as const,
  padding: '14px 20px',
  border: `1px solid ${BRAND.border}`,
  borderRadius: '10px',
  backgroundColor: BRAND.parchment,
  margin: '0 auto 24px',
}
