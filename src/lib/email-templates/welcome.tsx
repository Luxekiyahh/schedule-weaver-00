import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  firstName?: string;
  businessName?: string;
  dashboardUrl?: string;
  supportEmail?: string;
}

const FEATURES: { title: string; desc: string }[] = [
  {
    title: "Custom-branded booking storefront",
    desc: "Your own page at procschedule.com/your-name, styled to match your brand.",
  },
  {
    title: "Smart calendar & appointment management",
    desc: "Day, week, and month views with easy rescheduling, cancellations, and status tracking.",
  },
  {
    title: "Online deposits & payment collection",
    desc: "Take deposits and payments up front to protect your time and reduce no-shows.",
  },
  {
    title: "Automated reminders & confirmations",
    desc: "SMS and email confirmations and reminders sent to your clients automatically.",
  },
  {
    title: "Client management & profiles",
    desc: "Keep client history, contact details, and notes organized in one place.",
  },
  {
    title: "Services, availability & staff",
    desc: "Build your service catalog, set your hours, and manage your team.",
  },
  {
    title: "Growth & protection tools",
    desc: "Review redirects, VIP tiering, waitlists, and no-show protection on higher plans.",
  },
];

const Email = ({
  firstName = "there",
  businessName = "your business",
  dashboardUrl = "https://procschedule.com/dashboard/home",
  supportEmail = "admin@procschedule.com",
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to Procschedule — everything you need to take bookings</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={eyebrow}>Welcome aboard</Text>
          <Heading style={headerTitle}>Welcome to Procschedule 🎉</Heading>
        </Section>
        <Section style={body}>
          <Text style={paragraph}>Hi {firstName},</Text>
          <Text style={paragraph}>
            Thanks for creating your Procschedule account for <strong>{businessName}</strong>! Your
            booking business is ready to grow. Here's everything you can do:
          </Text>

          <Section style={card}>
            {FEATURES.map((f) => (
              <Section key={f.title} style={featureRow}>
                <Text style={featureTitle}>{f.title}</Text>
                <Text style={featureDesc}>{f.desc}</Text>
              </Section>
            ))}
          </Section>

          <Section style={{ textAlign: "center" as const, margin: "24px 0 8px" }}>
            <Button href={dashboardUrl} style={cta}>
              Go to your dashboard
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={sectionLabel}>Need help?</Text>
          <Text style={paragraph}>
            Our support team is here for you. Reach us anytime at{" "}
            <Link href={`mailto:${supportEmail}`} style={emailLink}>
              {supportEmail}
            </Link>
            .
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: "Welcome to Procschedule 🎉",
  displayName: "Welcome (new signup)",
  previewData: {
    firstName: "Melanie",
    businessName: "Dolliimarie Hair Studio",
    dashboardUrl: "https://procschedule.com/dashboard/home",
    supportEmail: "admin@procschedule.com",
  },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Arial, Helvetica, sans-serif" };
const container = { maxWidth: "560px", margin: "0 auto", padding: "24px 16px" };
const header = { borderRadius: "12px 12px 0 0", padding: "28px 32px", backgroundColor: "#141414" };
const eyebrow = {
  margin: "0",
  color: "#ffffff",
  opacity: 0.85,
  fontSize: "12px",
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
};
const headerTitle = { margin: "6px 0 0", color: "#ffffff", fontSize: "22px" };
const body = {
  border: "1px solid #e2e8f0",
  borderTop: "none",
  borderRadius: "0 0 12px 12px",
  padding: "28px 32px",
};
const paragraph = { margin: "0 0 14px", fontSize: "15px", lineHeight: "1.55", color: "#334155" };
const card = { border: "1px solid #e2e8f0", borderRadius: "10px", padding: "6px 16px", margin: "8px 0 18px" };
const featureRow = { borderBottom: "1px solid #eef2f6", padding: "12px 0" };
const featureTitle = { margin: 0, fontSize: "15px", fontWeight: 600, color: "#0f172a" };
const featureDesc = { margin: "3px 0 0", fontSize: "13px", lineHeight: "1.5", color: "#64748b" };
const cta = {
  backgroundColor: "#141414",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: 600,
  padding: "12px 26px",
  borderRadius: "8px",
  textDecoration: "none",
};
const hr = { borderColor: "#e2e8f0", margin: "18px 0" };
const sectionLabel = {
  margin: "0 0 6px",
  fontSize: "11px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.06em",
  color: "#64748b",
  fontWeight: 700,
};
const emailLink = { color: "#141414", fontWeight: 600 };
