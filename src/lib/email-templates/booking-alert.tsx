import * as React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  ownerName?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  serviceName?: string;
  dateLabel?: string;
  timeLabel?: string;
  priceLabel?: string;
  addOns?: string;
  primary?: string;
}

const Email = ({
  ownerName = "there",
  customerName = "A customer",
  customerEmail = "",
  customerPhone = "",
  serviceName = "a service",
  dateLabel = "",
  timeLabel = "",
  priceLabel = "",
  addOns = "",
  primary = "#4f46e5",
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`New booking: ${customerName} — ${serviceName}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={{ ...header, borderBottom: `3px solid ${primary}` }}>
          <Text style={eyebrow}>New booking alert</Text>
          <Heading style={headerTitle}>
            {customerName} booked {serviceName}
          </Heading>
        </Section>
        <Section style={body}>
          <Text style={paragraph}>Hi {ownerName}, a new appointment was just scheduled.</Text>
          <Text style={line}>
            <strong>When:</strong> {dateLabel} · {timeLabel}
          </Text>
          <Text style={line}>
            <strong>Service:</strong> {serviceName}
            {priceLabel ? ` (${priceLabel})` : ""}
          </Text>
          {addOns ? (
            <Text style={line}>
              <strong>Add-ons:</strong> {addOns}
            </Text>
          ) : null}
          <Text style={line}>
            <strong>Client:</strong> {customerName}
            {customerEmail ? ` · ${customerEmail}` : ""}
            {customerPhone ? ` · ${customerPhone}` : ""}
          </Text>
          <Text style={muted}>Open your dashboard to view or reschedule.</Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    `New booking: ${d.customerName ?? "A customer"} — ${d.serviceName ?? "service"}`,
  displayName: "New booking alert (owner)",
  previewData: {
    ownerName: "Court",
    customerName: "Jasmine Lee",
    customerEmail: "jasmine@example.com",
    customerPhone: "(561) 555-0100",
    serviceName: "Braids by Size: Medium",
    dateLabel: "Friday, July 3, 2026",
    timeLabel: "10:00 AM – 5:00 PM",
    priceLabel: "$175.00",
    addOns: "Extra Length (+$25)",
    primary: "#cba35c",
  },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Arial, Helvetica, sans-serif" };
const container = { maxWidth: "520px", margin: "0 auto", padding: "24px 16px" };
const header = { padding: "22px 26px" };
const eyebrow = {
  margin: 0,
  fontSize: "12px",
  letterSpacing: "0.06em",
  textTransform: "uppercase" as const,
  color: "#64748b",
};
const headerTitle = { margin: "4px 0 0", fontSize: "18px", color: "#0f172a" };
const body = { border: "1px solid #e2e8f0", borderTop: "none", borderRadius: "0 0 12px 12px", padding: "20px 26px" };
const paragraph = { margin: "0 0 14px", fontSize: "14px", lineHeight: "1.55", color: "#334155" };
const line = { margin: "0 0 8px", fontSize: "14px", lineHeight: "1.55", color: "#334155" };
const muted = { margin: "12px 0 0", fontSize: "13px", color: "#64748b" };
