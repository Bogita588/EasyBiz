"use client";

import { useMemo } from "react";
import styles from "./invoice-share-links.module.css";

type Props = {
  invoiceId: string;
  statusText?: string;
};

export function InvoiceShareLinks({ invoiceId, statusText }: Props) {
  const link = useMemo(() => `/invoice/${invoiceId}`, [invoiceId]);

  const whatsappText =
    statusText?.length && statusText
      ? `${statusText} - View: ${link}`
      : `Invoice ${invoiceId}: ${link}`;

  const mailSubject = `Invoice ${invoiceId}`;
  const mailBody =
    statusText?.length && statusText
      ? `${statusText}\n${link}`
      : `Here is your invoice:\n${link}`;

  return (
    <div className={styles.shareRow}>
      <a
        className={styles.shareButton}
        href={`https://wa.me/?text=${encodeURIComponent(whatsappText)}`}
        target="_blank"
        rel="noreferrer"
        suppressHydrationWarning
      >
        Share via WhatsApp
      </a>
      <a
        className={styles.shareButton}
        href={`mailto:?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBody)}`}
        suppressHydrationWarning
      >
        Share via Email
      </a>
    </div>
  );
}
