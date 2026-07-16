import * as React from "react";
import { Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { BrandedEmail, styles } from "./_layout";

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
}: Props) => (
  <BrandedEmail preview={`New booking: ${customerName} — ${serviceName}`}>
    <Text style={styles.eyebrow}>New booking alert</Text>
    <Text style={styles.h1}>
      {customerName} booked {serviceName}
    </Text>
    <Text style={styles.p}>Hi {ownerName}, a new appointment was just scheduled.</Text>
    <Text style={styles.p}>
      <strong>When:</strong> {dateLabel} · {timeLabel}
    </Text>
    <Text style={styles.p}>
      <strong>Service:</strong> {serviceName}
      {priceLabel ? ` (${priceLabel})` : ""}
    </Text>
    {addOns ? (
      <Text style={styles.p}>
        <strong>Add-ons:</strong> {addOns}
      </Text>
    ) : null}
    <Text style={styles.p}>
      <strong>Client:</strong> {customerName}
      {customerEmail ? ` · ${customerEmail}` : ""}
      {customerPhone ? ` · ${customerPhone}` : ""}
    </Text>
    <Text style={styles.small}>Open your dashboard to view or reschedule.</Text>
  </BrandedEmail>
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
  },
} satisfies TemplateEntry;
