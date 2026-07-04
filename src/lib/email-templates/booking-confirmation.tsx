import * as React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  businessName?: string;
  firstName?: string;
  serviceName?: string;
  dateLabel?: string;
  timeLabel?: string;
  priceLabel?: string;
  addOns?: string;
  notes?: string;
  primary?: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  businessWebsite?: string;
}

const Email = ({
  businessName = "Our Studio",
  firstName = "there",
  serviceName = "your appointment",
  dateLabel = "",
  timeLabel = "",
  priceLabel = "",
  addOns = "",
  notes = "",
  primary = "#4f46e5",
  businessAddress = "",
  businessPhone = "",
  businessEmail = "",
  businessWebsite = "",
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Your appointment at ${businessName} is confirmed`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={{ ...header, backgroundColor: primary }}>
          <Text style={eyebrow}>Appointment confirmed</Text>
          <Heading style={headerTitle}>{businessName}</Heading>
        </Section>
        <Section style={body}>
          <Text style={paragraph}>Hi {firstName},</Text>
          <Text style={paragraph}>
            Your appointment at <strong>{businessName}</strong> is confirmed. Here are the details:
          </Text>
          <Section style={card}>
            <Row label="Service" value={serviceName} />
            {addOns ? <Row label="Add-ons" value={addOns} /> : null}
            {dateLabel ? <Row label="Date" value={dateLabel} /> : null}
            {timeLabel ? <Row label="Time" value={timeLabel} /> : null}
            {priceLabel ? <Row label="Total" value={priceLabel} /> : null}
          </Section>
          {notes ? (
            <Text style={paragraph}>
              <strong>Notes:</strong> {notes}
            </Text>
          ) : null}

          {businessAddress ? (
            <>
              <Hr style={hr} />
              <Text style={sectionLabel}>Location</Text>
              <Text style={contactLine}>{businessAddress}</Text>
            </>
          ) : null}

          {businessPhone || businessEmail || businessWebsite ? (
            <>
              <Hr style={hr} />
              <Text style={sectionLabel}>Contact</Text>
              {businessPhone ? <Text style={contactLine}>Phone: {businessPhone}</Text> : null}
              {businessEmail ? <Text style={contactLine}>Email: {businessEmail}</Text> : null}
              {businessWebsite ? <Text style={contactLine}>Web: {businessWebsite}</Text> : null}
            </>
          ) : null}
        </Section>
      </Container>
    </Body>
  </Html>
);

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Section style={rowStyle}>
      <Text style={rowLabel}>{label}</Text>
      <Text style={rowValue}>{value}</Text>
    </Section>
  );
}

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    `Your appointment at ${d.businessName ?? "our studio"} is confirmed`,
  displayName: "Booking confirmation (customer)",
  previewData: {
    businessName: "Alluring Dolls",
    firstName: "Jasmine",
    serviceName: "Braids by Size: Medium",
    dateLabel: "Friday, July 3, 2026",
    timeLabel: "10:00 AM – 5:00 PM",
    priceLabel: "$175.00",
    addOns: "Extra Length (+$25)",
    notes: "Please arrive with hair blown out.",
    primary: "#cba35c",
    businessAddress: "123 Glam Ave, Suite 4, Atlanta, GA 30303",
    businessPhone: "(404) 555-0148",
    businessEmail: "hello@alluringdolls.com",
    businessWebsite: "www.alluringdolls.com",
  },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Arial, Helvetica, sans-serif" };
const container = { maxWidth: "560px", margin: "0 auto", padding: "24px 16px" };
const header = { borderRadius: "12px 12px 0 0", padding: "28px 32px" };
const eyebrow = {
  margin: "0",
  color: "#ffffff",
  opacity: 0.85,
  fontSize: "12px",
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
};
const headerTitle = { margin: "6px 0 0", color: "#ffffff", fontSize: "22px" };
const body = { border: "1px solid #e2e8f0", borderTop: "none", borderRadius: "0 0 12px 12px", padding: "28px 32px" };
const paragraph = { margin: "0 0 14px", fontSize: "15px", lineHeight: "1.55", color: "#334155" };
const card = { border: "1px solid #e2e8f0", borderRadius: "10px", padding: "6px 16px", margin: "8px 0 18px" };
const rowStyle = { borderBottom: "1px solid #eef2f6", padding: "10px 0" };
const rowLabel = { margin: 0, fontSize: "11px", textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "#64748b" };
const rowValue = { margin: "2px 0 0", fontSize: "15px", fontWeight: 600, color: "#0f172a" };
const hr = { borderColor: "#e2e8f0", margin: "18px 0" };
const sectionLabel = { margin: "0 0 6px", fontSize: "11px", textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "#64748b", fontWeight: 700 };
const contactLine = { margin: "0 0 4px", fontSize: "14px", lineHeight: "1.5", color: "#334155" };
