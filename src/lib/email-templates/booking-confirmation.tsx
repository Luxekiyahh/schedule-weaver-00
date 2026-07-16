import * as React from "react";
import { Hr, Section, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { BrandedEmail, styles, BRAND } from "./_layout";

interface Props {
  businessName?: string;
  firstName?: string;
  serviceName?: string;
  dateLabel?: string;
  timeLabel?: string;
  priceLabel?: string;
  addOns?: string;
  notes?: string;
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
  businessAddress = "",
  businessPhone = "",
  businessEmail = "",
  businessWebsite = "",
}: Props) => (
  <BrandedEmail preview={`Your appointment at ${businessName} is confirmed`}>
    <Text style={styles.eyebrow}>Appointment confirmed</Text>
    <Text style={styles.h1}>{businessName}</Text>
    <Text style={styles.p}>Hi {firstName},</Text>
    <Text style={styles.p}>
      Your appointment at <strong>{businessName}</strong> is confirmed. Here are the details:
    </Text>

    <Section style={styles.card}>
      <Row label="Service" value={serviceName} />
      {addOns ? <Row label="Add-ons" value={addOns} /> : null}
      {dateLabel ? <Row label="Date" value={dateLabel} /> : null}
      {timeLabel ? <Row label="Time" value={timeLabel} /> : null}
      {priceLabel ? <Row label="Total" value={priceLabel} /> : null}
    </Section>

    {notes ? (
      <Text style={styles.p}>
        <strong>Notes:</strong> {notes}
      </Text>
    ) : null}

    {businessAddress ? (
      <>
        <Hr style={styles.hr} />
        <Text style={sectionLabel}>Location</Text>
        <Text style={contactLine}>{businessAddress}</Text>
      </>
    ) : null}

    {businessPhone || businessEmail || businessWebsite ? (
      <>
        <Hr style={styles.hr} />
        <Text style={sectionLabel}>Contact</Text>
        {businessPhone ? <Text style={contactLine}>Phone: {businessPhone}</Text> : null}
        {businessEmail ? <Text style={contactLine}>Email: {businessEmail}</Text> : null}
        {businessWebsite ? <Text style={contactLine}>Web: {businessWebsite}</Text> : null}
      </>
    ) : null}
  </BrandedEmail>
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
    businessAddress: "123 Glam Ave, Suite 4, Atlanta, GA 30303",
    businessPhone: "(404) 555-0148",
    businessEmail: "hello@alluringdolls.com",
    businessWebsite: "www.alluringdolls.com",
  },
} satisfies TemplateEntry;

const rowStyle = { borderBottom: `1px solid ${BRAND.border}`, padding: "10px 0" };
const rowLabel = {
  margin: 0,
  fontSize: "11px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.06em",
  color: BRAND.muted,
};
const rowValue = { margin: "2px 0 0", fontSize: "15px", fontWeight: 600, color: BRAND.ink };
const sectionLabel = {
  margin: "0 0 6px",
  fontSize: "11px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.06em",
  color: BRAND.muted,
  fontWeight: 700,
};
const contactLine = { margin: "0 0 4px", fontSize: "14px", lineHeight: "1.5", color: BRAND.text };
