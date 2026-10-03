import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prochar Studio — প্রচার স্টুডিও",
  description: "ছবি দিন, নাম লিখুন — ছাপার উপযোগী পোস্টার পান কয়েক মিনিটে।",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn">
      <body>{children}</body>
    </html>
  );
}
