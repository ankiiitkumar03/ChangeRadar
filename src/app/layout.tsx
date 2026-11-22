import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL;
const metadataBase = appUrl ? new URL(appUrl) : undefined;

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: "ChangeRadar — Never miss a change on the web",
    template: "%s · ChangeRadar",
  },
  description:
    "Monitor any public website, detect meaningful changes, review before-and-after comparisons, and get email alerts.",
  applicationName: "ChangeRadar",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "ChangeRadar",
    title: "ChangeRadar — Never miss a change on the web",
    description:
      "Monitor public websites, detect meaningful changes, compare versions, and get alerts.",
    url: "/",
    images: [
      {
        url: "/brand/changeradar-social.webp",
        width: 1200,
        height: 630,
        alt: "ChangeRadar — website change monitoring",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ChangeRadar — Never miss a change on the web",
    description:
      "Monitor public websites, detect meaningful changes, compare versions, and get alerts.",
    images: ["/brand/changeradar-social.webp"],
  },
  keywords: [
    "website monitoring",
    "change detection",
    "competitor monitoring",
    "price tracking",
    "website alerts",
  ],
};

export const viewport: Viewport = {
  themeColor: "#080a14",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-dvh antialiased`}
      >
        <TooltipProvider delayDuration={200}>
          <Toaster position="top-right" theme="dark" richColors />
          {children}
        </TooltipProvider>
      </body>
    </html>
  );
}
