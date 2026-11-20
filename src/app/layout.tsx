import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Bengali } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

// MedBricBD typography (master prompt §2): Inter for Latin, Noto Sans
// Bengali for বাংলা — one stack covers both scripts seamlessly.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const notoBengali = Noto_Sans_Bengali({
  variable: "--font-bengali",
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "MedBricBD — Find & Book Verified Doctors",
    template: "%s · MedBricBD",
  },
  description:
    "MedBricBD connects patients with verified doctors — search by specialty and city, book chamber appointments with transparent new/returning patient fees. Bangladesh-first, global-ready.",
  keywords: [
    "MedBricBD",
    "doctor appointment",
    "Bangladesh doctors",
    "healthcare platform",
    "verified doctors",
    "ডাক্তারের অ্যাপয়েন্টমেন্ট",
  ],
  applicationName: "MedBricBD",
};

export const viewport: Viewport = {
  themeColor: "#1769AA",
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
        className={`${inter.variable} ${notoBengali.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
