import type { Metadata } from "next";
import { Anek_Bangla, Hind_Siliguri, Archivo, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

// next/font self-hosts these at build time; nothing is fetched from Google at runtime.
// Only the display + body faces are preloaded.
const anek = Anek_Bangla({
  subsets: ["bengali", "latin"],
  weight: "variable",
  display: "swap",
  preload: true,
  variable: "--font-anek",
});

const hind = Hind_Siliguri({
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: true,
  variable: "--font-hind",
});

const archivo = Archivo({
  subsets: ["latin"],
  weight: "variable",
  axes: ["wdth"],
  display: "swap",
  preload: false,
  variable: "--font-archivo",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: "500",
  display: "swap",
  preload: false,
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: "Prochar Studio — প্রচার স্টুডিও",
  description: "ছবি দিন, নাম লিখুন — ছাপার উপযোগী পোস্টার পান কয়েক মিনিটে।",
};

const FONT_VARS = [anek.variable, hind.variable, archivo.variable, plexMono.variable].join(" ");

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn" className={FONT_VARS}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
