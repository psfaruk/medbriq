import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

// Find Medi Doctor typography (master prompt §2): Inter for Latin, Noto Sans
// Bengali for বাংলা — one stack covers both scripts seamlessly.
//
// SELF-HOSTED (next/font/local): fetching Google Fonts at dev/build time made
// every compile depend on fonts.googleapis.com being reachable — in offline
// and proxied environments (e.g. cloud sandboxes) that turned into a hard
// 500 on "/" ("next/font/google queries have exactly one entry"). The woff2
// files in ./fonts are the same Google Fonts builds (latin / bengali subsets,
// variable weight axis), served from the app itself: zero network dependency,
// same rendering, still statically optimized.
const inter = localFont({
  src: "./fonts/Inter-Variable.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});

const notoBengali = localFont({
  src: "./fonts/NotoSansBengali-Variable.woff2",
  variable: "--font-bengali",
  weight: "100 900",
  display: "swap",
});

const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "Find Medi Doctor — Verified Doctors & Easy Appointments in Bangladesh",
    template: "%s · Find Medi Doctor",
  },
  description:
    "Search verified doctors and hospitals across Bangladesh, read free plain-language health education, and book chamber appointments with transparent new/returning patient fees. Browsing is free — no account needed.",
  keywords: [
    "Find Medi Doctor",
    "doctor appointment Bangladesh",
    "find doctors Dhaka",
    "verified doctors",
    "hospital directory Bangladesh",
    "health education",
    "doctor appointment",
    "Bangladesh doctors",
    "healthcare platform",
    "ডাক্তারের অ্যাপয়েন্টমেন্ট",
    "ভেরিফায়েড ডাক্তার",
  ],
  applicationName: "Find Medi Doctor",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "Find Medi Doctor",
    title: "Find Medi Doctor — Verified Doctors & Easy Appointments in Bangladesh",
    description:
      "Verified doctors, hospital directory, free health education and transparent appointment fees. Browse without an account.",
    url: baseUrl,
    locale: "en_US",
    alternateLocale: ["bn_BD"],
    images: [
      {
        url: "/images/hero-doctor.png",
        width: 864,
        height: 1152,
        alt: "Find Medi Doctor — verified doctor consultations",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Find Medi Doctor — Verified Doctors & Easy Appointments",
    description:
      "Verified doctors, hospitals and honest health education — browse free, sign in only to book.",
    images: ["/images/hero-doctor.png"],
  },
  robots: {
    index: true,
    follow: true,
    // Private dashboards render client-side behind session-scoped APIs;
    // no private data is ever present in server-rendered HTML.
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export const viewport: Viewport = {
  themeColor: "#1769AA",
  width: "device-width",
  initialScale: 1,
};

/** Organization + WebSite structured data (spec §14).
 *  Only verifiable claims — no invented ratings or credentials. */
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${baseUrl}/#organization`,
      name: "Find Medi Doctor",
      url: baseUrl,
      description:
        "Healthcare discovery platform for finding and booking verified doctors in Bangladesh.",
      areaServed: { "@type": "Country", name: "Bangladesh" },
    },
    {
      "@type": "WebSite",
      "@id": `${baseUrl}/#website`,
      url: baseUrl,
      name: "Find Medi Doctor",
      inLanguage: ["en", "bn"],
      publisher: { "@id": `${baseUrl}/#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${baseUrl}/?view=doctors&q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
  ],
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
        <script
          type="application/ld+json"
          // Static, developer-authored JSON-LD (no user input).
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
