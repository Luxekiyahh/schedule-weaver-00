import * as React from "react";
import { Button, Link, Section, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { BrandedEmail, styles, BRAND } from "./_layout";

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
    desc: "Day, week, and month views with easy rescheduling and status tracking.",
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
];

const Email = ({
  firstName = "there",
  businessName = "your business",
  dashboardUrl = BRAND.dashboardUrl,
  supportEmail = BRAND.supportEmail,
}: Props) => (
  <BrandedEmail preview="Welcome to ProcSchedule — everything you need to take bookings">
    <Text style={styles.eyebrow}>Welcome aboard</Text>
    <Text style={styles.h1}>Welcome to ProcSchedule</Text>
    <Text style={styles.p}>Hi {firstName},</Text>
    <Text style={styles.p}>
      Thanks for creating your ProcSchedule account for <strong>{businessName}</strong>. Your
      booking business is ready to grow — here's everything you can do:
    </Text>

    <Section style={styles.card}>
      {FEATURES.map((f) => (
        <Section key={f.title} style={styles.rowBorder}>
          <Text style={styles.itemTitle}>{f.title}</Text>
          <Text style={styles.itemDesc}>{f.desc}</Text>
        </Section>
      ))}
    </Section>

    <Section style={styles.ctaWrap}>
      <Button href={dashboardUrl} style={styles.cta}>
        Go to your dashboard
      </Button>
    </Section>

    <Text style={styles.small}>
      Need help? Reach us anytime at{" "}
      <Link href={`mailto:${supportEmail}`} style={styles.link}>
        {supportEmail}
      </Link>
      .
    </Text>
  </BrandedEmail>
);

export const template = {
  component: Email,
  subject: "Welcome to ProcSchedule",
  displayName: "Welcome (new signup)",
  previewData: {
    firstName: "Melanie",
    businessName: "Dolliimarie Hair Studio",
    dashboardUrl: BRAND.dashboardUrl,
    supportEmail: BRAND.supportEmail,
  },
} satisfies TemplateEntry;
