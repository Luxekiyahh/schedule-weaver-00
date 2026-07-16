import * as React from "react";
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { BRAND } from "./brand";

interface Props {
  preview: string;
  children: React.ReactNode;
}

export function BrandedEmail({ preview, children }: Props) {
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Img
              src={BRAND.logoLightUrl}
              alt="ProcSchedule"
              width="180"
              height="36"
              style={logoImg}
            />
          </Section>
          <div style={goldRule} />
          <Section style={body}>{children}</Section>
          <Section style={footer}>
            <Hr style={hr} />
            <Text style={footerText}>
              <strong style={{ color: BRAND.ink }}>ProcSchedule</strong> — {BRAND.tagline}
            </Text>
            <Text style={footerMeta}>
              Questions? Email{" "}
              <Link href={`mailto:${BRAND.supportEmail}`} style={footerLink}>
                {BRAND.supportEmail}
              </Link>
              .
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#ffffff",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
  margin: 0,
  padding: 0,
};
const container = { maxWidth: "580px", margin: "0 auto", padding: "24px 16px" };
const header = {
  borderRadius: "14px 14px 0 0",
  padding: "28px 32px",
  backgroundColor: BRAND.ink,
  textAlign: "center" as const,
};
const logoImg = { display: "inline-block", margin: "0 auto" };
const goldRule = {
  height: "3px",
  background: `linear-gradient(to right, ${BRAND.goldSoft}, ${BRAND.gold}, #9C7A3C)`,
};
const body = {
  border: `1px solid ${BRAND.border}`,
  borderTop: "none",
  borderBottom: "none",
  padding: "28px 32px",
  backgroundColor: BRAND.paper,
};
const footer = {
  border: `1px solid ${BRAND.border}`,
  borderTop: "none",
  borderRadius: "0 0 14px 14px",
  padding: "18px 32px 24px",
  backgroundColor: BRAND.parchment,
  textAlign: "center" as const,
};
const hr = { borderColor: BRAND.border, margin: "0 0 14px" };
const footerText = {
  margin: "0 0 6px",
  fontSize: "13px",
  color: BRAND.text,
};
const footerMeta = { margin: 0, fontSize: "12px", color: BRAND.muted };
const footerLink = { color: BRAND.ink, fontWeight: 600 };

// Shared inline styles for template bodies.
export const styles = {
  h1: {
    margin: "0 0 8px",
    fontSize: "22px",
    lineHeight: "1.25",
    color: BRAND.ink,
    fontWeight: 700,
  },
  eyebrow: {
    margin: "0 0 4px",
    color: BRAND.gold,
    fontSize: "12px",
    letterSpacing: "0.12em",
    textTransform: "uppercase" as const,
    fontWeight: 700,
  },
  p: { margin: "0 0 14px", fontSize: "15px", lineHeight: "1.55", color: BRAND.text },
  small: { margin: "0 0 10px", fontSize: "13px", lineHeight: "1.5", color: BRAND.muted },
  cta: {
    display: "inline-block",
    backgroundColor: BRAND.ink,
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: 600,
    padding: "12px 28px",
    borderRadius: "8px",
    textDecoration: "none",
    borderBottom: `2px solid ${BRAND.gold}`,
  },
  ctaWrap: { textAlign: "center" as const, margin: "20px 0 8px" },
  card: {
    border: `1px solid ${BRAND.border}`,
    borderRadius: "10px",
    padding: "6px 16px",
    margin: "8px 0 18px",
    backgroundColor: BRAND.parchment,
  },
  rowBorder: { borderBottom: `1px solid ${BRAND.border}`, padding: "12px 0" },
  itemTitle: {
    margin: 0,
    fontSize: "15px",
    fontWeight: 600,
    color: BRAND.ink,
  },
  itemDesc: { margin: "3px 0 0", fontSize: "13px", lineHeight: "1.5", color: BRAND.muted },
  hr: { borderColor: BRAND.border, margin: "18px 0" },
  link: { color: BRAND.ink, fontWeight: 600 },
} as const;

export { BRAND };
