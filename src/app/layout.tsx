import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Noto_Sans_Bengali } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Bengali script support (initial market: Bangladesh)
const notoBengali = Noto_Sans_Bengali({
  variable: "--font-bengali",
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Medbriq — Find & Book Verified Doctors",
    template: "%s · Medbriq",
  },
  description:
    "Medbriq connects patients with verified doctors — search by specialty and city, book appointments instantly or by doctor approval. Demo MVP, initial market: Bangladesh.",
  keywords: [
    "Medbriq",
    "doctor appointment",
    "Bangladesh doctors",
    "healthcare platform",
    "verified doctors",
    "ডাক্তারের অ্যাপয়েন্টমেন্ট",
  ],
  applicationName: "Medbriq",
};

export const viewport: Viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoBengali.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
