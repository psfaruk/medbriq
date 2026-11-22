/**
 * Legal & policy content registry (bilingual EN/BN).
 *
 * Single source of truth for the Legal Center (?view=legal), the footer
 * "Legal & policies" column and the inline policy links on the auth wall.
 * Pure data — no React — so both client views and future API surfaces can
 * consume it. Text intentionally reflects what the platform ACTUALLY does
 * today (demo status, Bangladesh-only, no payment custody, BMDC
 * verification, patient-first accounts, telehealth disabled).
 */

export type LegalDocSlug =
  | "terms"
  | "privacy"
  | "confidentiality"
  | "roles"
  | "safety"
  | "trust"
  | "cookies"
  | "cancellation"
  | "grievance";

export type LegalLocale = "en" | "bn";

export type LegalSection = {
  heading: string;
  body?: string[];
  bullets?: string[];
};

export type LegalDoc = {
  slug: LegalDocSlug;
  /** Icon key — mapped to a Lucide icon inside the legal view. */
  icon:
    | "scale"
    | "shield"
    | "lock"
    | "users"
    | "alert"
    | "badge"
    | "cookie"
    | "calendar-x"
    | "message";
  title: Record<LegalLocale, string>;
  short: Record<LegalLocale, string>;
  updated: string;
  intro: Record<LegalLocale, string>;
  sections: Record<LegalLocale, LegalSection[]>;
};

export const LEGAL_UPDATED = "2026-11-22";

export const LEGAL_DOCS: LegalDoc[] = [
  // ── 1. Terms of Service ────────────────────────────────────────────
  {
    slug: "terms",
    icon: "scale",
    updated: LEGAL_UPDATED,
    title: { en: "Terms of Service", bn: "সেবার শর্তাবলী" },
    short: {
      en: "The rules for using Find Medi Doctor",
      bn: "মেডব্রিকবিডি ব্যবহারের নিয়মাবলী",
    },
    intro: {
      en: "These Terms govern your use of Find Medi Doctor — a doctor-discovery and chamber-appointment platform operating in Bangladesh. By browsing while signed in, creating an account or booking an appointment you accept them.",
      bn: "এই শর্তাবলী মেডব্রিকবিডি — বাংলাদেশে পরিচালিত একটি ডাক্তার-অনুসন্ধান ও চেম্বার-অ্যাপয়েন্টমেন্ট প্ল্যাটফর্ম — ব্যবহারের নিয়ম নির্ধারণ করে। সাইন ইন করে ব্রাউজ করলে, অ্যাকাউন্ট খুললে বা অ্যাপয়েন্টমেন্ট নিলে আপনি এতে সম্মত হচ্ছেন।",
    },
    sections: {
      en: [
        {
          heading: "1. What Find Medi Doctor is",
          body: [
            "Find Medi Doctor connects patients with independent, BMDC-registered doctors who practice at their own chambers, and lists verified hospitals and clinics across Bangladesh. We help you discover, compare and book — we do not practice medicine ourselves.",
          ],
          bullets: [
            "A searchable directory of doctors with specialties, chambers, schedules and transparent new/returning patient fees.",
            "Real-time chamber appointment booking — instant or with doctor approval.",
            "A health-education library (articles, symptom guides, equipment guides, awareness calendar).",
            "This deployment is a demonstration environment: doctor, hospital and payment data shown is fictional sandbox data.",
          ],
        },
        {
          heading: "2. Your account",
          body: [
            "Every account starts as a standard user (patient) account. Doctors and hospitals apply for provider roles from the dashboard after signing in. You agree to provide accurate information — real name, date of birth, contact details and addresses — and to keep your password confidential.",
          ],
          bullets: [
            "One account per person; sharing accounts is not allowed.",
            "You must be at least 13 years old. Users under 18 need a guardian's consent.",
            "You are responsible for activity that happens under your account.",
          ],
        },
        {
          heading: "3. Doctor and hospital partners",
          body: [
            "Providers using the platform commit to truthful credentials, accurate schedules and honouring the fees displayed at booking time. A doctor's Verified badge means the platform has checked their BMDC registration — clinical responsibility for your care always remains with the treating doctor and institution, not with Find Medi Doctor.",
          ],
        },
        {
          heading: "4. Acceptable use",
          bullets: [
            "No fake identities, impersonation of doctors or institutions, or misrepresentation of qualifications.",
            "No scraping, mass-automated booking, reselling of appointment slots or interference with the service.",
            "No harassment of doctors, hospital staff, or other patients.",
            "No unlawful, abusive or harmful content in any free-text field (notes, applications, reviews).",
          ],
        },
        {
          heading: "5. Fees and payments",
          body: [
            "Each doctor sets their own chamber fees — including separate new and returning patient pricing — and displays them on their profile. Find Medi Doctor charges no booking fee and never holds patient money: chamber fees are settled directly at the chamber, and any refund of a chamber fee follows the doctor's or institution's own policy. Online payments remain disabled in this deployment.",
          ],
        },
        {
          heading: "6. Changes to the service and these terms",
          body: [
            "We may improve or change the service, and occasionally update these Terms. Material changes are announced inside the app; continuing to use the service after an update means you accept the revised Terms.",
          ],
        },
        {
          heading: "7. Suspension and termination",
          body: [
            "You can delete your account at any time from your profile. We may suspend or remove accounts that violate these Terms — especially fake provider credentials, abuse or fraud — and, where required, report such activity to the relevant authorities.",
          ],
        },
        {
          heading: "8. Governing law",
          body: [
            "These Terms are governed by the laws of Bangladesh, and any dispute is subject to the jurisdiction of the courts of Dhaka.",
          ],
        },
      ],
      bn: [
        {
          heading: "১. মেডব্রিকবিডি কী",
          body: [
            "মেডব্রিকবিডি রোগীদের স্বাধীন, বিএমডিসি-নিবন্ধিত চিকিৎসকদের সাথে সংযুক্ত করে — যাঁরা নিজেদের চেম্বারে চিকিৎসা দেন — এবং বাংলাদেশজুড়ে ভেরিফায়েড হাসপাতাল ও ক্লিনিকের তালিকা দেখায়। আমরা খুঁজতে, তুলনা করতে ও বুক করতে সাহায্য করি — নিজেরা চিকিৎসা দিই না।",
          ],
          bullets: [
            "বিশেষত্ব, চেম্বার, সময়সূচি ও স্বচ্ছ নতুন/পুরাতন রোগীর ফিসহীন ডাক্তার-ডিরেক্টরি।",
            "রিয়েল-টাইম চেম্বার অ্যাপয়েন্টমেন্ট — ইনস্ট্যান্ট বা ডাক্তারের অনুমোদনে।",
            "স্বাস্থ্যশিক্ষা লাইব্রেরি (আর্টিকেল, লক্ষণ গাইড, যন্ত্রপাতি গাইড, সচেতনতা ক্যালেন্ডার)।",
            "এই ডিপ্লয়মেন্ট একটি ডেমনস্ট্রেশন পরিবেশ: দেখানো ডাক্তার, হাসপাতাল ও পেমেন্ট তথ্য কাল্পনিক ডেমো ডেটা।",
          ],
        },
        {
          heading: "২. আপনার অ্যাকাউন্ট",
          body: [
            "প্রতিটি অ্যাকাউন্ট প্রথমে একটি সাধারণ ইউজার (রোগী) অ্যাকাউন্ট হিসেবে শুরু হয়। চিকিৎসক ও হাসপাতালরা সাইন ইন করার পর ড্যাশবোর্ড থেকে প্রোভাইডার ভূমিকার জন্য আবেদন করেন। আপনি সঠিক তথ্য দিতে সম্মত হচ্ছেন — আসল নাম, জন্মতারিখ, যোগাযোগের তথ্য ও ঠিকানা — এবং আপনার পাসওয়ার্ড গোপন রাখবেন।",
          ],
          bullets: [
            "একজন ব্যক্তির জন্য একটি অ্যাকাউন্ট; অ্যাকাউন্ট শেয়ার করা নিষিদ্ধ।",
            "বয়স কমপক্ষে ১৩ বছর হতে হবে। ১৮ বছরের নিচে হলে অভিভাবকের সম্মতি দরকার।",
            "আপনার অ্যাকাউন্টে ঘটে যাওয়া সব কার্যকলাপের দায় আপনার।",
          ],
        },
        {
          heading: "৩. চিকিৎসক ও হাসপাতাল পার্টনার",
          body: [
            "প্ল্যাটফর্ম ব্যবহারকারী প্রোভাইডাররা সত্যিকারের প্রমাণপত্র, সঠিক সময়সূচি এবং বুকিংয়ের সময় প্রদর্শিত ফি মেনে চলার অঙ্গীকার করেন। ডাক্তারের ভেরিফায়েড ব্যাজ মানে প্ল্যাটফর্ম তাঁর বিএমডিসি নিবন্ধন যাচাই করেছে — আপনার চিকিৎসার ক্লিনিকাল দায়িত্ব সবসময় চিকিৎসক ও প্রতিষ্ঠানের, মেডব্রিকবিডির নয়।",
          ],
        },
        {
          heading: "৪. গ্রহণযোগ্য ব্যবহার",
          bullets: [
            "ভুয়া পরিচয়, ডাক্তার বা প্রতিষ্ঠানের ছদ্মবেশ ধারণ, বা যোগ্যতা সম্পর্কে মিথ্যা বলা নিষিদ্ধ।",
            "স্ক্র্যাপিং, বট দিয়ে গণ-বুকিং, অ্যাপয়েন্টমেন্ট স্লট পুনর্বিক্রয় বা সেবায় বিঘ্ন ঘটানো নিষিদ্ধ।",
            "ডাক্তার, হাসপাতালের কর্মী বা অন্য রোগীদের উত্যক্ত করা নিষিদ্ধ।",
            "যেকোনো লেখার ঘরে (নোট, আবেদন, রিভিউ) অবৈধ, আপত্তিকর বা ক্ষতিকর বিষয়বস্তু দেওয়া নিষিদ্ধ।",
          ],
        },
        {
          heading: "৫. ফি ও পেমেন্ট",
          body: [
            "প্রত্যেক ডাক্তার নিজের চেম্বারের ফি নির্ধারণ করেন — নতুন ও পুরাতন রোগীর জন্য আলাদা মূল্যসহ — এবং প্রোফাইলে তা প্রদর্শন করেন। মেডব্রিকবিডি কোনো বুকিং ফি নেয় না এবং কখনোই রোগীর টাকা গচ্ছিত রাখে না: চেম্বারের ফি সরাসরি চেম্বারেই পরিশোধ হয়, আর ফি ফেরত দিলে তা ডাক্তার বা প্রতিষ্ঠানের নিজস্ব নীতি অনুসারে হয়ে থাকে। এই ডিপ্লয়মেন্টে অনলাইন পেমেন্ট নিষ্ক্রিয় রয়েছে।",
          ],
        },
        {
          heading: "৬. সেবা ও শর্তাবলীর পরিবর্তন",
          body: [
            "আমরা সেবা উন্নত বা পরিবর্তন করতে পারি, এবং মাঝেমধ্যে এই শর্তাবলী হালনাগাদ করি। গুরুত্বপূর্ণ পরিবর্তন অ্যাপের ভেতরে ঘোষণা করা হয়; হালনাগাদের পর সেবা ব্যবহার চালিয়ে গেলে আপনি সংশোধিত শর্তাবলী মেনে নিচ্ছেন।",
          ],
        },
        {
          heading: "৭. স্থগিত ও সমাপ্তি",
          body: [
            "আপনি যেকোনো সময় প্রোফাইল থেকে অ্যাকাউন্ট ডিলিট করতে পারেন। শর্তাবলী ভঙ্গ করলে — বিশেষত ভুয়া প্রোভাইডার প্রমাণপত্র, হয়রানি বা প্রতারণা — আমরা অ্যাকাউন্ট স্থগিত বা বাতিল করতে পারি এবং প্রয়োজনে সংশ্লিষ্ট কর্তৃপক্ষকে জানাতে পারি।",
          ],
        },
        {
          heading: "৮. প্রযোজ্য আইন",
          body: [
            "এই শর্তাবলী বাংলাদেশের আইন দ্বারা পরিচালিত, এবং যেকোনো বিরোধ ঢাকার আদালতের এখ্তিয়ারভুক্ত।",
          ],
        },
      ],
    },
  },

  // ── 2. Privacy Policy ──────────────────────────────────────────────
  {
    slug: "privacy",
    icon: "shield",
    updated: LEGAL_UPDATED,
    title: { en: "Privacy Policy", bn: "গোপনীয়তা নীতি" },
    short: {
      en: "What we collect and how we protect it",
      bn: "আমরা কী সংগ্রহ করি ও কীভাবে রক্ষা করি",
    },
    intro: {
      en: "This policy explains what personal data Find Medi Doctor collects, why, who can see it, and the choices you control. Plain language, no fine print.",
      bn: "এই নীতিতে ব্যাখ্যা করা হয়েছে মেডব্রিকবিডি কী ব্যক্তিগত তথ্য সংগ্রহ করে, কেন করে, কারা দেখতে পায় এবং আপনার নিয়ন্ত্রণে কী কী আছে। সহজ ভাষায়, কোনো সূক্ষ্ম অক্ষর ছাড়াই।",
    },
    sections: {
      en: [
        {
          heading: "1. Data we collect",
          bullets: [
            "Account details: your name, email, mobile number, date of birth, present address and permanent address.",
            "Booking data: appointments you make, their status, and the reference codes issued.",
            "Visit records: appointment history and doctor notes generated by the Verified Visit System.",
            "Security data: one-time passwords (OTP) sent to your mobile for sign-in and password reset.",
            "Anonymous usage events: which pages and search features are used, counted without personal identifiers.",
          ],
        },
        {
          heading: "2. Why we collect it",
          bullets: [
            "To create and verify your account and keep it secure.",
            "To book, coordinate and manage your chamber appointments.",
            "To show you the correct fees (new vs returning patient) at booking time.",
            "To understand which features help people, so we can improve them.",
          ],
        },
        {
          heading: "3. What we never do",
          bullets: [
            "We never sell your personal data — to anyone, for any reason.",
            "We do not run third-party advertising trackers or cross-site profiling.",
            "We do not use your health data for marketing.",
          ],
        },
        {
          heading: "4. Who can see your data",
          bullets: [
            "You — everything in your own profile, bookings and records.",
            "Doctors you actually book — a limited view (name, basic details, visit history with that doctor).",
            "Platform admins — strictly for verification, moderation and safety, with every access audit-logged.",
            "Law enforcement only where legally compelled (see Confidentiality).",
          ],
        },
        {
          heading: "5. Retention and your choices",
          body: [
            "We keep your data while your account is active. You can correct profile details yourself at any time, and you can request account deletion — we remove your personal data, keeping only what the law requires us to retain (for example, records of fraudulent activity).",
          ],
        },
        {
          heading: "6. How we protect data",
          body: [
            "All traffic travels over encrypted connections. Sign-in sessions use random tokens, passwords are stored only as strong hashes, and administrative access is restricted and logged. No system is perfectly secure, but we treat health-related data with the seriousness it deserves.",
          ],
        },
        {
          heading: "7. Children",
          body: [
            "The service is not directed at children under 13, and we do not knowingly collect their data. Parents who believe a child has created an account can contact us for immediate removal.",
          ],
        },
      ],
      bn: [
        {
          heading: "১. আমরা যে তথ্য সংগ্রহ করি",
          bullets: [
            "অ্যাকাউন্টের তথ্য: আপনার নাম, ইমেইল, মোবাইল নম্বর, জন্মতারিখ, বর্তমান ঠিকানা ও স্থায়ী ঠিকানা।",
            "বুকিংয়ের তথ্য: আপনার নেওয়া অ্যাপয়েন্টমেন্ট, সেগুলোর অবস্থা এবং জারি করা রেফারেন্স কোড।",
            "ভিজিট রেকর্ড: অ্যাপয়েন্টমেন্টের ইতিহাস ও ভেরিফায়েড ভিজিট সিস্টেমে তৈরি ডাক্তারের নোট।",
            "নিরাপত্তা তথ্য: সাইন ইন ও পাসওয়ার্ড রিসেটের জন্য আপনার মোবাইলে পাঠানো ওয়ান-টাইম পাসওয়ার্ড (ওটিপি)।",
            "নামহীন ব্যবহার-ইভেন্ট: কোন কোন পেজ ও সার্চ ফিচার ব্যবহৃত হয় — ব্যক্তিগত আইডেন্টিফায়ার ছাড়া গণনা করা হয়।",
          ],
        },
        {
          heading: "২. কেন সংগ্রহ করি",
          bullets: [
            "আপনার অ্যাকাউন্ট তৈরি, যাচাই ও নিরাপদ রাখার জন্য।",
            "চেম্বার অ্যাপয়েন্টমেন্ট বুক, সমন্বয় ও পরিচালনার জন্য।",
            "বুকিংয়ের সময় আপনার জন্য সঠিক ফি (নতুন বনাম পুরাতন রোগী) দেখানোর জন্য।",
            "কোন ফিচারগুলো মানুষের কাজে আসে তা বুঝে সেগুলো উন্নত করার জন্য।",
          ],
        },
        {
          heading: "৩. আমরা যা কখনোই করি না",
          bullets: [
            "আমরা কখনোই আপনার ব্যক্তিগত তথ্য বিক্রি করি না — কাউকে, কোনো কারণেই না।",
            "আমরা কোনো থার্ড-পার্টি বিজ্ঞাপন ট্র্যাকার বা ক্রস-সাইট প্রোফাইলিং চালাই না।",
            "আপনার স্বাস্থ্য তথ্য মার্কেটিংয়ে ব্যবহার করি না।",
          ],
        },
        {
          heading: "৪. আপনার তথ্য কারা দেখতে পায়",
          bullets: [
            "আপনি — আপনার নিজের প্রোফাইল, বুকিং ও রেকর্ডের সবকিছু।",
            "যে ডাক্তারের কাছে আপনি সত্যিই বুকিং করেছেন — সীমিত দৃশ্য (নাম, প্রাথমিক তথ্য, সেই ডাক্তারের সাথে ভিজিটের ইতিহাস)।",
            "প্ল্যাটফর্ম অ্যাডমিন — শুধুই যাচাই, মডারেশন ও নিরাপত্তার জন্য, প্রতিটি প্রবেশ অডিট-লগড।",
            "আইন প্রযোজ্য হলে তদন্ত সংস্থা — শুধুমাত্র আইনগতভাবে বাধ্য হলে (গোপনীয়তা দলিল দেখুন)।",
          ],
        },
        {
          heading: "৫. সংরক্ষণ ও আপনার নিয়ন্ত্রণ",
          body: [
            "আপনার অ্যাকাউন্ট সক্রিয় থাকা পর্যন্ত আমরা তথ্য রাখি। আপনি যেকোনো সময় নিজেই প্রোফাইলের তথ্য সংশোধন করতে পারেন, এবং অ্যাকাউন্ট ডিলিটের অনুরোধ করতে পারেন — আমরা আপনার ব্যক্তিগত তথ্য মুছে দিই, শুধু আইনে যা রাখতে বাধ্য করা হয়েছে তা ছাড়া (যেমন প্রতারণামূলক কার্যকলাপের রেকর্ড)।",
          ],
        },
        {
          heading: "৬. তথ্য কীভাবে রক্ষা করি",
          body: [
            "সব ট্রাফিক এনক্রিপ্টেড সংযোগে চলে। সাইন-ইন সেশনে ব্যবহৃত হয় এলোমেলো টোকেন, পাসওয়ার্ড শুধুই শক্তিশালী হ্যাশ হিসেবে সংরক্ষিত থাকে, এবং অ্যাডমিন প্রবেশাধিকার সীমিত ও লগড। কোনো সিস্টেমই শতভাগ নিরাপদ নয় — তবু স্বাস্থ্য-সংক্রান্ত তথ্য আমরা যথাযথ গুরুত্ব দিয়েই রক্ষণাবেক্ষণ করি।",
          ],
        },
        {
          heading: "৭. শিশুরা",
          body: [
            "এই সেবা ১৩ বছরের নিচের শিশুদের জন্য নয়, এবং জেনেশুনে আমরা তাদের তথ্য সংগ্রহ করি না। কোনো অভিভাবক মনে করলেন তাঁর সন্তান অ্যাকাউন্ট খুলেছে, তিনি যোগাযোগ করলেই আমরা তা সঙ্গে সঙ্গে সরিয়ে দেব।",
          ],
        },
      ],
    },
  },

  // ── 3. Health Data & Confidentiality ───────────────────────────────
  {
    slug: "confidentiality",
    icon: "lock",
    updated: LEGAL_UPDATED,
    title: { en: "Health Data & Confidentiality", bn: "স্বাস্থ্য তথ্য ও গোপনীয়তা" },
    short: {
      en: "Who can see your medical records",
      bn: "আপনার চিকিৎসা রেকর্ড কারা দেখতে পায়",
    },
    intro: {
      en: "Medical information deserves a higher bar than ordinary data. This document explains exactly how visit records, doctor notes and Verified Visit data are protected on Find Medi Doctor.",
      bn: "চিকিৎসা-সংক্রান্ত তথ্য সাধারণ তথ্যের চেয়ে বেশি সুরক্ষা পাওয়ার যোগ্য। এই দলিলে ব্যাখ্যা করা হয়েছে মেডব্রিকবিডিতে ভিজিট রেকর্ড, ডাক্তারের নোট ও ভেরিফায়েড ভিজিটের তথ্য ঠিক কীভাবে সুরক্ষিত থাকে।",
    },
    sections: {
      en: [
        {
          heading: "1. Your visit records",
          body: [
            "Your appointment history and any doctor notes attached to a visit are visible only to you and to the treating doctor. They are never shown on public profiles, never included in directory listings, and never shared with other providers.",
          ],
        },
        {
          heading: "2. The Verified Visit System (VVS)",
          body: [
            "When a doctor completes your visit, the platform can issue a two-part A4 visit form with a QR verification code. Part 1 stays with you (the patient copy); Part 2 stays in the doctor's records. Anyone you choose can scan the QR code and confirm the visit happened — the verification page shows only the visit date, doctor name and completion status. It never reveals your diagnosis, notes or personal details.",
          ],
        },
        {
          heading: "3. Provider confidentiality",
          body: [
            "Doctors practising in Bangladesh are bound by BMDC professional ethics to keep patient information confidential. The platform reinforces this: a doctor sees a patient's history only for visits with that specific doctor, not across the platform.",
          ],
        },
        {
          heading: "4. Admin access",
          body: [
            "Platform administrators can access records only for verification, fraud prevention and safety moderation — for example, to check a doctor's BMDC credentials. Every administrative access is recorded in an audit log, and accessing records without a safety reason is a violation of our internal policy.",
          ],
        },
        {
          heading: "5. Disclosure when the law requires it",
          body: [
            "We disclose health data only when legally compelled — a court order, or a notifiable public-health emergency where reporting is required by Bangladeshi law. When that happens, we disclose the minimum necessary information.",
          ],
        },
        {
          heading: "6. Demonstration data notice",
          body: [
            "In this demo deployment, doctors, hospitals and visit records are fictional sandbox data created to demonstrate the flow. No real patient records exist on this system.",
          ],
        },
      ],
      bn: [
        {
          heading: "১. আপনার ভিজিট রেকর্ড",
          body: [
            "আপনার অ্যাপয়েন্টমেন্টের ইতিহাস এবং ভিজিটের সাথে যুক্ত ডাক্তারের নোট শুধুই আপনি এবং চিকিৎসাধীন ডাক্তার দেখতে পারেন। এগুলো কখনোই পাবলিক প্রোফাইলে দেখানো হয় না, ডিরেক্টরি তালিকায় আসে না, এবং অন্য প্রোভাইডারদের সাথে শেয়ার করা হয় না।",
          ],
        },
        {
          heading: "২. ভেরিফায়েড ভিজিট সিস্টেম (ভিভিএস)",
          body: [
            "ডাক্তার আপনার ভিজিট সম্পন্ন করলে প্ল্যাটফর্ম একটি QR যাচাই-কোডসহ দুই-অংশের A4 ভিজিট ফর্ম জারি করতে পারে। প্রথম অংশ থাকে আপনার কাছে (রোগীর কপি); দ্বিতীয় অংশ থাকে ডাক্তারের রেকর্ডে। আপনি যাকে চান তিনি QR কোড স্ক্যান করে নিশ্চিত করতে পারবেন ভিজিটটি হয়েছিল — ভেরিফিকেশন পেজে শুধু ভিজিটের তারিখ, ডাক্তারের নাম ও সম্পন্ন হওয়ার অবস্থা দেখা যায়। আপনার রোগনির্ণয়, নোট বা ব্যক্তিগত তথ্য কখনোই প্রকাশ পায় না।",
          ],
        },
        {
          heading: "৩. প্রোভাইডারের গোপনীয়তা",
          body: [
            "বাংলাদেশে চর্চারত চিকিৎসকরা বিএমডিসির পেশাদার নৈতিকতা বিধি মেনে রোগীর তথ্য গোপন রাখতে বাধ্য। প্ল্যাটফর্ম এটি আরও জোরদার করে: একজন ডাক্তার একজন রোগীর ইতিহাস দেখতে পান শুধু নিজের সাথে হওয়া ভিজিটগুলোর ক্ষেত্রেই, পুরো প্ল্যাটফর্ম জুড়ে নয়।",
          ],
        },
        {
          heading: "৪. অ্যাডমিন প্রবেশাধিকার",
          body: [
            "প্ল্যাটফর্ম অ্যাডমিনরা রেকর্ডে প্রবেশ করতে পারেন শুধু যাচাই, প্রতারণা-প্রতিরোধ ও নিরাপত্তা মডারেশনের জন্য — যেমন কোনো ডাক্তারের বিএমডিসি প্রমাণপত্র যাচাই করতে। প্রতিটি অ্যাডমিনিস্ট্রেটিভ প্রবেশ অডিট লগে লেখা হয়, এবং নিরাপত্তাজনিত কারণ ছাড়া রেকর্ড দেখা আমাদের অভ্যন্তরীণ নীতির লঙ্ঘন।",
          ],
        },
        {
          heading: "৫. আইন চাইলে প্রকাশ",
          body: [
            "শুধুমাত্র আইনগতভাবে বাধ্য হলে আমরা স্বাস্থ্য তথ্য প্রকাশ করি — আদালতের আদেশ, অথবা বাংলাদেশের আইনে রিপোর্ট বাধ্যতামূলক এমন জনস্বাস্থ্য জরুরি পরিস্থিতি। সেক্ষেত্রেও আমরা ন্যূনতম প্রয়োজনীয় তথ্যই দিই।",
          ],
        },
        {
          heading: "৬. ডেমো ডেটা বিজ্ঞপ্তি",
          body: [
            "এই ডেমো ডিপ্লয়মেন্টে ডাক্তার, হাসপাতাল ও ভিজিট রেকর্ড প্রবাহ প্রদর্শনের জন্য তৈরি কাল্পনিক ডেটা। এই সিস্টেমে কোনো প্রকৃত রোগীর রেকর্ড নেই।",
          ],
        },
      ],
    },
  },

  // ── 4. Roles & Access ──────────────────────────────────────────────
  {
    slug: "roles",
    icon: "users",
    updated: LEGAL_UPDATED,
    title: { en: "Roles & Access Levels", bn: "ভূমিকা ও প্রবেশাধিকার" },
    short: {
      en: "Patients, doctors, hospitals and admins",
      bn: "রোগী, চিকিৎসক, হাসপাতাল ও অ্যাডমিন",
    },
    intro: {
      en: "Find Medi Doctor uses a patient-first account model: everyone registers the same way, and provider roles are granted only after an in-dashboard application and verification. Here is exactly what each role can and cannot do.",
      bn: "মেডব্রিকবিডি রোগী-প্রথম অ্যাকাউন্ট মডেল ব্যবহার করে: সবাই একইভাবে নিবন্ধন করেন, এবং প্রোভাইডার ভূমিকা দেওয়া হয় শুধু ড্যাশবোর্ড-আবেদন ও যাচাইয়ের পর। প্রতিটি ভূমিকা ঠিক কী পারে আর কী পারে না, তা এখানে।",
    },
    sections: {
      en: [
        {
          heading: "1. Everyone starts as a user (patient)",
          body: [
            "There is one signup form — no role choice at registration. This keeps the barrier low for patients and makes sure no one can present themselves as a doctor or hospital just by ticking a box.",
          ],
        },
        {
          heading: "2. Patient role",
          bullets: [
            "Search doctors and hospitals, view profiles, fees and schedules.",
            "Book, reschedule and cancel chamber appointments.",
            "View visit records and download Verified Visit forms.",
            "Maintain a family profile for records you manage for dependants.",
            "Apply to become a doctor or hospital from the dashboard.",
          ],
        },
        {
          heading: "3. Doctor role (by application)",
          body: [
            "After signing in, a user can apply for the doctor role by submitting their BMDC registration number, qualifications, specialty, chamber details, weekly schedule and fee structure. Admins verify the credentials; only then does the doctor profile go live with the Verified badge and bookable slots.",
          ],
          bullets: [
            "Manage schedules, slots and appointment approvals.",
            "Classify patients (new / returning / follow-up) with server-validated fees.",
            "Complete visits and issue Verified Visit forms.",
          ],
        },
        {
          heading: "4. Hospital / clinic role (by application)",
          body: [
            "Institutions apply from the dashboard with their licence and contact details. After verification they can maintain branches, departments and the institution's public profile, and doctors can list the hospital as a practice location.",
          ],
        },
        {
          heading: "5. Platform admin role",
          body: [
            "Admins are platform staff. They review applications, verify BMDC and institution credentials, moderate content, and monitor safety analytics. Admins never practise medicine, never edit a doctor's clinical notes, and every sensitive action they take is audit-logged.",
          ],
        },
        {
          heading: "6. Changing or losing a role",
          body: [
            "Rejected applications always come with the reason. You may fix the submission and re-apply; if you believe a decision was wrong, the Grievance channel reviews it independently. Verified providers who submit false information lose the role immediately.",
          ],
        },
      ],
      bn: [
        {
          heading: "১. সবাই শুরু করেন ইউজার (রোগী) হিসেবে",
          body: [
            "নিবন্ধনের একটিই ফর্ম — ভূমিকা বাছাই করার কোনো অপশন নেই। এতে রোগীদের জন্য প্রক্রিয়া সহজ থাকে, আর কেউ শুধু একটি বাক্সে টিক দিয়ে নিজেকে ডাক্তার বা হাসপাতাল বলে দাবি করতে পারে না।",
          ],
        },
        {
          heading: "২. রোগীর ভূমিকা",
          bullets: [
            "ডাক্তার ও হাসপাতাল খোঁজা, প্রোফাইল, ফি ও সময়সূচি দেখা।",
            "চেম্বার অ্যাপয়েন্টমেন্ট বুক, রিশিডিউল ও বাতিল করা।",
            "ভিজিট রেকর্ড দেখা এবং ভেরিফায়েড ভিজিট ফর্ম ডাউনলোড করা।",
            "নির্ভরশীলদের (পরিবারের সদস্যদের) রেকর্ড পরিচালনার জন্য ফ্যামিলি প্রোফাইল রাখা।",
            "ড্যাশবোর্ড থেকে ডাক্তার বা হাসপাতাল হওয়ার আবেদন করা।",
          ],
        },
        {
          heading: "৩. চিকিৎসকের ভূমিকা (আবেদনের মাধ্যমে)",
          body: [
            "সাইন ইন করার পর একজন ইউজার বিএমডিসি নিবন্ধন নম্বর, যোগ্যতা, বিশেষত্ব, চেম্বারের তথ্য, সাপ্তাহিক সময়সূচি ও ফি কাঠামো জমা দিয়ে চিকিৎসকের ভূমিকার জন্য আবেদন করতে পারেন। অ্যাডমিনরা প্রমাণপত্র যাচাই করেন; এর পরেই ডাক্তারের প্রোফাইল ভেরিফায়েড ব্যাজ ও বুকিংযোগ্য স্লটসহ লাইভ হয়।",
          ],
          bullets: [
            "সময়সূচি, স্লট ও অ্যাপয়েন্টমেন্ট অনুমোদন পরিচালনা।",
            "রোগী শ্রেণিবিন্যাস (নতুন / পুরাতন / ফলো-আপ) সার্ভার-যাচাইকৃত ফিসহীন।",
            "ভিজিট সম্পন্ন করা ও ভেরিফায়েড ভিজিট ফর্ম জারি করা।",
          ],
        },
        {
          heading: "৪. হাসপাতাল / ক্লিনিকের ভূমিকা (আবেদনের মাধ্যমে)",
          body: [
            "প্রতিষ্ঠানগুলো লাইসেন্স ও যোগাযোগের তথ্যসহ ড্যাশবোর্ড থেকে আবেদন করে। যাচাইয়ের পর তারা শাখা, বিভাগ ও প্রতিষ্ঠানের পাবলিক প্রোফাইল রক্ষণাবেক্ষণ করতে পারে, আর ডাক্তাররা হাসপাতালটিকে চর্চার স্থান হিসেবে তালিকাভুক্ত করতে পারেন।",
          ],
        },
        {
          heading: "৫. প্ল্যাটফর্ম অ্যাডমিনের ভূমিকা",
          body: [
            "অ্যাডমিনরা প্ল্যাটফর্মের কর্মী। তারা আবেদন পর্যালোচনা, বিএমডিসি ও প্রতিষ্ঠানের প্রমাণপত্র যাচাই, কনটেন্ট মডারেশন ও নিরাপত্তা অ্যানালিটিক্স দেখেন। অ্যাডমিনরা কখনোই চিকিৎসা চর্চা করেন না, কোনো ডাক্তারের ক্লিনিকাল নোট সম্পাদনা করেন না, এবং তাদের প্রতিটি সংবেদনশীল কাজ অডিট-লগে লেখা হয়।",
          ],
        },
        {
          heading: "৬. ভূমিকা পরিবর্তন বা হারানো",
          body: [
            "বাতিল আবেদনের সাথে সবসময় কারণ উল্লেখ থাকে। সংশোধন করে আবার আবেদন করা যায়; সিদ্ধান্ত ভুল মনে হলে অভিযোগ চ্যানেল স্বাধীনভাবে পুনর্বিবেচনা করে। মিথ্যা তথ্য জমা দেওয়া ভেরিফায়েড প্রোভাইডার তাৎক্ষণিকভাবে ভূমিকা হারান।",
          ],
        },
      ],
    },
  },

  // ── 5. Medical Safety & Warnings ───────────────────────────────────
  {
    slug: "safety",
    icon: "alert",
    updated: LEGAL_UPDATED,
    title: { en: "Medical Safety & Warnings", bn: "চিকিৎসা সতর্কতা" },
    short: {
      en: "Read this before relying on the platform",
      bn: "প্ল্যাটফর্মের ওপর নির্ভর করার আগে পড়ুন",
    },
    intro: {
      en: "Your safety comes first. These warnings exist because a booking platform is a tool — never a substitute for professional medical judgement.",
      bn: "আপনার নিরাপত্তাই প্রথম। এই সতর্কবার্তাগুলো এ কারণে যে বুকিং প্ল্যাটফর্ম একটি হাতিয়ার মাত্র — পেশাদার চিকিৎসা বিচারবোধের বিকল্প কখনোই নয়।",
    },
    sections: {
      en: [
        {
          heading: "1. In an emergency, do not use this app",
          body: [
            "If you or someone near you has a medical emergency — chest pain, difficulty breathing, heavy bleeding, loss of consciousness, poisoning, accident — call the national emergency number 999 immediately (free, 24/7, anywhere in Bangladesh) or go straight to the nearest hospital emergency department. Booking an appointment here is never the right response to an emergency.",
          ],
        },
        {
          heading: "2. Health content is educational, not advice",
          body: [
            "Articles, symptom guides, equipment guides and the awareness calendar exist to help you understand health topics and decide when to seek care. They are general information, not a diagnosis, and never a prescription for your specific situation.",
          ],
        },
        {
          heading: "3. No self-diagnosis or self-treatment",
          bullets: [
            "Never start, stop or change medication based on online content.",
            "Symptom guides help you judge urgency — they cannot confirm what illness you have.",
            "If symptoms are severe, worsening or persistent, see a doctor in person.",
          ],
        },
        {
          heading: "4. Video consultations are disabled",
          body: [
            "Telehealth features are deliberately switched off in this deployment until DGHS/BMDC telemedicine compliance is confirmed. All appointments on Find Medi Doctor are physical chamber visits.",
          ],
        },
        {
          heading: "5. Verify before you trust",
          body: [
            "Only book doctors who carry the Verified badge, and check the BMDC registration number shown on their profile. If a profile looks suspicious — mismatched photos, impossible qualifications, pressure to pay outside the chamber — report it immediately.",
          ],
        },
        {
          heading: "6. Report harmful or incorrect content",
          body: [
            "Found a medically wrong article, an offensive comment or a suspicious profile? Use the Grievance & Support channel. Safety reports are treated with the highest priority and reviewed by administrators.",
          ],
        },
      ],
      bn: [
        {
          heading: "১. জরুরি পরিস্থিতিতে এই অ্যাপ ব্যবহার করবেন না",
          body: [
            "আপনার বা কাছের কারো জরুরি চিকিৎসা প্রয়োজন হলে — বুকে ব্যথা, শ্বাসকষ্ট, ভারী রক্তক্ষরণ, জ্ঞান হারানো, বিষক্রিয়া, দুর্ঘটনা — সঙ্গে সঙ্গে জাতীয় জরুরি নম্বর ৯৯৯-এ কল করুন (বিনামূল্যে, সারাদিন, বাংলাদেশের যেকোনো জায়গা থেকে) অথবা সোজা নিকটস্থ হাসপাতালের ইমার্জেন্সি বিভাগে যান। জরুরি পরিস্থিতিতে এখানে অ্যাপয়েন্টমেন্ট বুক করা কখনোই সঠিক ব্যবস্থা নয়।",
          ],
        },
        {
          heading: "২. স্বাস্থ্যকথা শিক্ষামূলক, পরামর্শ নয়",
          body: [
            "আর্টিকেল, লক্ষণ গাইড, যন্ত্রপাতি গাইড ও সচেতনতা ক্যালেন্ডার আছে আপনাকে বিষয়গুলো বুঝতে ও কখন চিকিৎসা নিতে হবে তা ঠিক করতে সাহায্য করতে। এগুলো সাধারণ তথ্য — কোনো রোগনির্ণয় নয়, এবং আপনার নির্দিষ্ট অবস্থার জন্য কোনো নির্দেশনাও নয়।",
          ],
        },
        {
          heading: "৩. নিজে নিজে রোগনির্ণয় বা চিকিৎসা নয়",
          bullets: [
            "অনলাইন কনটেন্ট দেখে কখনোই ওষুধ শুরু, বন্ধ বা পরিবর্তন করবেন না।",
            "লক্ষণ গাইড জরুরি মাত্রা বুঝতে সাহায্য করে — আপনার ঠিক কী অসুখ হয়েছে তা নিশ্চিত করতে পারে না।",
            "লক্ষণ তীব্র, বাড়ছে বা দীর্ঘস্থায়ী হলে সরাসরি ডাক্তার দেখান।",
          ],
        },
        {
          heading: "৪. ভিডিও পরামর্শ নিষ্ক্রিয়",
          body: [
            "ডিজিএইচএস/বিএমডিসির টেলিমেডিসিন সামঞ্জস্য নিশ্চিত না হওয়া পর্যন্ত এই ডিপ্লয়মেন্টে টেলিহেলথ সুবিধা ইচ্ছাকৃতভাবে বন্ধ আছে। মেডব্রিকবিডির সব অ্যাপয়েন্টমেন্টই প্রকৃত চেম্বার ভিজিট।",
          ],
        },
        {
          heading: "৫. বিশ্বাস করার আগে যাচাই করুন",
          body: [
            "শুধু ভেরিফায়েড ব্যাজধারী ডাক্তারদের কাছে বুকিং করুন, এবং প্রোফাইলে দেখানো বিএমডিসি নিবন্ধন নম্বরটি মিলিয়ে নিন। কোনো প্রোফাইল সন্দেহজনক লাগলে — ছবি না মেলা, অসম্ভব যোগ্যতা, চেম্বারের বাইরে টাকা দিতে চাপানো — সঙ্গে সঙ্গে রিপোর্ট করুন।",
          ],
        },
        {
          heading: "৬. ক্ষতিকর বা ভুল কনটেন্ট রিপোর্ট করুন",
          body: [
            "কোনো আর্টিকেলে চিকিৎসা-ভুল, আপত্তিকর মন্তব্য বা সন্দেহজনক প্রোফাইল পেয়েছেন? অভিযোগ ও সহায়তা চ্যানেল ব্যবহার করুন। নিরাপত্তা রিপোর্ট সর্বোচ্চ অগ্রাধিকার পায় এবং অ্যাডমিনরা তা পর্যালোচনা করেন।",
          ],
        },
      ],
    },
  },

  // ── 6. Trust & Verification ────────────────────────────────────────
  {
    slug: "trust",
    icon: "badge",
    updated: LEGAL_UPDATED,
    title: { en: "Trust & Verification Policy", bn: "বিশ্বাস ও যাচাই নীতি" },
    short: {
      en: "How the Verified badge is earned",
      bn: "ভেরিফায়েড ব্যাজ কীভাবে অর্জিত হয়",
    },
    intro: {
      en: "The Verified badge is not decoration — it means a human administrator checked the provider's credentials before their profile went live. This document explains the standard.",
      bn: "ভেরিফায়েড ব্যাজ কোনো সাজসজ্জা নয় — এর অর্থ হলো প্রোফাইল লাইভ হওয়ার আগে একজন মানব অ্যাডমিনিস্ট্রেটর প্রোভাইডারের প্রমাণপত্র যাচাই করেছেন। এই দলিলে সেই মানদণ্ড ব্যাখ্যা করা হয়েছে।",
    },
    sections: {
      en: [
        {
          heading: "1. Doctor verification",
          body: [
            "No doctor profile becomes publicly visible or bookable until verification succeeds. Applications submitted from a doctor's dashboard enter a review queue; an administrator checks each submission before approving.",
          ],
        },
        {
          heading: "2. What we check",
          bullets: [
            "BMDC registration number — validated against the registration the doctor provides.",
            "Qualifications and specialty claimed in the application.",
            "Chamber address and weekly schedule plausibility.",
            "Identity and photo consistency.",
          ],
        },
        {
          heading: "3. Hospital and clinic verification",
          body: [
            "Institutions are reviewed on licence details, contact information and the operational reality of listed branches and departments. Unverified institutions never appear in the public hospital directory.",
          ],
        },
        {
          heading: "4. Fee transparency rules",
          body: [
            "Doctors set their own fees, including separate new and returning patient pricing, and must honour what the platform displays at booking time. Fees are snapshotted server-side when an appointment is confirmed, so a later price change never rewrites an existing booking.",
          ],
        },
        {
          heading: "5. Zero tolerance for fakes",
          body: [
            "Fabricated credentials mean immediate removal of the provider role, permanent loss of the Verified badge, and — for forged BMDC registration — a report to the appropriate authority. This is non-negotiable.",
          ],
        },
        {
          heading: "6. The public Verification Center",
          body: [
            "Anyone can inspect the verification standard on the public Verification Center page, including the current platform-wide verification statistics.",
          ],
        },
      ],
      bn: [
        {
          heading: "১. চিকিৎসক যাচাই",
          body: [
            "যাচাই সফল না হওয়া পর্যন্ত কোনো ডাক্তারের প্রোফাইল প্রকাশ্যে আসে না বা বুকিংযোগ্য হয় না। ডাক্তারের ড্যাশবোর্ড থেকে জমা দেওয়া আবেদন পর্যালোচনা কিউতে যায়; একজন অ্যাডমিনিস্ট্রেটর অনুমোদনের আগে প্রতিটি আবেদন পরীক্ষা করেন।",
          ],
        },
        {
          heading: "২. আমরা যা যাচাই করি",
          bullets: [
            "বিএমডিসি নিবন্ধন নম্বর — ডাক্তার প্রদত্ত নিবন্ধনের সাথে মিলিয়ে।",
            "আবেদনে দাবি করা যোগ্যতা ও বিশেষত্ব।",
            "চেম্বারের ঠিকানা ও সাপ্তাহিক সময়সূচির যৌক্তিকতা।",
            "পরিচয় ও ছবির সঙ্গতি।",
          ],
        },
        {
          heading: "৩. হাসপাতাল ও ক্লিনিক যাচাই",
          body: [
            "প্রতিষ্ঠানের ক্ষেত্রে লাইসেন্সের বিবরণ, যোগাযোগের তথ্য এবং তালিকাভুক্ত শাখা ও বিভাগের বাস্তবতা পর্যালোচনা করা হয়। অযাচাইকৃত প্রতিষ্ঠান কখনোই পাবলিক হাসপাতাল ডিরেক্টরিতে আসে না।",
          ],
        },
        {
          heading: "৪. ফি স্বচ্ছতার নিয়ম",
          body: [
            "ডাক্তাররা নিজেদের ফি নির্ধারণ করেন — নতুন ও পুরাতন রোগীর আলাদা মূল্যসহ — এবং বুকিংয়ের সময় প্ল্যাটফর্ম যা দেখায় তাই মানতে হয়। অ্যাপয়েন্টমেন্ট নিশ্চিত হওয়ার সময় ফি সার্ভারে স্ন্যাপশট হিসেবে জমা হয়, তাই পরে দাম বদলালেও পুরনো বুকিং বদলায় না।",
          ],
        },
        {
          heading: "৫. ভুয়ার প্রতি শূন্য সহনশীলতা",
          body: [
            "বানানো প্রমাণপত্র মানে তাৎক্ষণিকভাবে প্রোভাইডার ভূমিকা বাতিল, ভেরিফায়েড ব্যাজ স্থায়ীভাবে হারানো, এবং বিএমডিসি নিবন্ধন জাল করলে সংশ্লিষ্ট কর্তৃপক্ষকে রিপোর্ট। এতে কোনো আপস নেই।",
          ],
        },
        {
          heading: "৬. পাবলিক ভেরিফিকেশন সেন্টার",
          body: [
            "যে কেউ পাবলিক ভেরিফিকেশন সেন্টার পেজে যাচাইয়ের মানদণ্ড দেখতে পারেন — প্ল্যাটফর্মজুড়ে বর্তমান ভেরিফিকেশন পরিসংখ্যানসহ।",
          ],
        },
      ],
    },
  },

  // ── 7. Cookie & Session Policy ─────────────────────────────────────
  {
    slug: "cookies",
    icon: "cookie",
    updated: LEGAL_UPDATED,
    title: { en: "Cookie & Session Policy", bn: "কুকি ও সেশন নীতি" },
    short: {
      en: "What we store in your browser",
      bn: "আপনার ব্রাউজারে আমরা কী রাখি",
    },
    intro: {
      en: "Short version: we store a sign-in token, your language choice and a temporary booking intent. No advertising cookies, no cross-site trackers, no data brokers.",
      bn: "সংক্ষেপে: আমরা রাখি একটি সাইন-ইন টোকেন, আপনার ভাষার পছন্দ এবং একটি সাময়িক বুকিং-অভিপ্রায়। কোনো বিজ্ঞাপন কুকি নেই, ক্রস-সাইট ট্র্যাকার নেই, ডেটা ব্রোকার নেই।",
    },
    sections: {
      en: [
        {
          heading: "1. What we store",
          bullets: [
            "Session token — a random value that keeps you signed in; cleared when you sign out.",
            "Language preference — so the app opens in English or Bangla next time.",
            "Pending booking intent — when you choose a slot before signing in, it is held briefly (session storage) so it can resume right after authentication.",
          ],
        },
        {
          heading: "2. What we deliberately do not use",
          bullets: [
            "No third-party advertising or retargeting cookies.",
            "No cross-site trackers or fingerprinting.",
            "No selling of behavioural data — there is none to sell.",
          ],
        },
        {
          heading: "3. Anonymous analytics",
          body: [
            "We count feature usage — page views, searches, booking funnels — as aggregate numbers without personal identifiers. These counts help us fix what is broken and build what is missing.",
          ],
        },
        {
          heading: "4. Your controls",
          body: [
            "Clearing your browser storage signs you out and removes the language preference — nothing else remains. Because there are no tracking cookies, there is nothing to opt out of.",
          ],
        },
      ],
      bn: [
        {
          heading: "১. আমরা যা সংরক্ষণ করি",
          bullets: [
            "সেশন টোকেন — একটি এলোমেলো মান যা আপনাকে সাইন-ইন অবস্থায় রাখে; সাইন আউট করলেই মুছে যায়।",
            "ভাষার পছন্দ — যাতে পরেরবার অ্যাপ ইংরেজি বা বাংলায় খোলে।",
            "অপেক্ষমাণ বুকিং-অভিপ্রায় — সাইন ইনের আগে স্লট বেছে নিলে তা সাময়িকভাবে (সেশন স্টোরেজে) রাখা হয়, যাতে প্রমাণীকরণের পরপরই আবার শুরু করা যায়।",
          ],
        },
        {
          heading: "২. আমরা যা ইচ্ছাকৃতভাবে ব্যবহার করি না",
          bullets: [
            "কোনো থার্ড-পার্টি বিজ্ঞাপন বা রিটার্গেটিং কুকি নয়।",
            "কোনো ক্রস-সাইট ট্র্যাকার বা ফিঙ্গারপ্রিন্টিং নয়।",
            "আচরণ-সংক্রান্ত তথ্য বিক্রি নয় — বিক্রি করার মতো কিছুই নেই।",
          ],
        },
        {
          heading: "৩. নামহীন অ্যানালিটিক্স",
          body: [
            "আমরা ফিচার ব্যবহারের সংখ্যা গণনা করি — পেজ ভিউ, সার্চ, বুকিং ধাপ — ব্যক্তিগত আইডেন্টিফায়ার ছাড়া সমষ্টিগত সংখ্যা হিসেবে। এই হিসাব আমাদের ভাঙা জিনিস ঠিক করতে ও অনুপস্থিত জিনিস তৈরি করতে সাহায্য করে।",
          ],
        },
        {
          heading: "৪. আপনার নিয়ন্ত্রণ",
          body: [
            "ব্রাউজারের স্টোরেজ পরিষ্কার করলে আপনি সাইন আউট হয়ে যাবেন ও ভাষার পছন্দ মুছে যাবে — আর কিছুই থাকে না। ট্র্যাকিং কুকি না থাকায় অপ্ট-আউট করারও কিছু নেই।",
          ],
        },
      ],
    },
  },

  // ── 8. Cancellation & Refunds ──────────────────────────────────────
  {
    slug: "cancellation",
    icon: "calendar-x",
    updated: LEGAL_UPDATED,
    title: { en: "Cancellation, No-show & Refunds", bn: "বাতিলকরণ ও ফেরত নীতি" },
    short: {
      en: "Cancelling bookings and how fees work",
      bn: "বুকিং বাতিল ও ফি কীভাবে কাজ করে",
    },
    intro: {
      en: "Life happens — appointments get missed. Here is exactly how cancellation, doctor-side changes, no-shows and fee refunds work on Find Medi Doctor.",
      bn: "জীবনে সব পরিকল্পনা ঠিক থাকে না — অ্যাপয়েন্টমেন্ট মিস হয়। মেডব্রিকবিডিতে বাতিলকরণ, ডাক্তার-পক্ষের পরিবর্তন, নো-শো ও ফি ফেরত ঠিক কীভাবে কাজ করে, তা-ই এখানে।",
    },
    sections: {
      en: [
        {
          heading: "1. Cancelling as a patient",
          body: [
            "You can cancel any upcoming appointment from your bookings list, free of charge, until the slot's start time. Cancelling early frees the slot for another patient — it is the courteous thing to do.",
          ],
        },
        {
          heading: "2. When a doctor cancels or reschedules",
          body: [
            "If a doctor cancels or needs to move your appointment, you are notified with your booking reference and can rebook any open slot free of charge. Repeated doctor-side cancellations of your bookings are tracked and surfaced to platform administrators.",
          ],
        },
        {
          heading: "3. No-shows",
          body: [
            "Missing appointments without cancelling harms every other patient waiting for that slot. Accounts that repeatedly no-show may lose access to instant booking and be limited to approval-based booking.",
          ],
        },
        {
          heading: "4. Chamber fee refunds",
          body: [
            "Find Medi Doctor never holds your money — chamber fees are paid directly at the chamber. If a fee was already paid at the chamber and the visit did not happen for reasons within the doctor's control, the refund follows that doctor's or institution's own published policy; our support channel will help you reach the right person.",
          ],
        },
        {
          heading: "5. Demo deployment note",
          body: [
            "In this demonstration environment, payments run in a sandbox — no real money moves and no financial data is stored.",
          ],
        },
      ],
      bn: [
        {
          heading: "১. রোগী হিসেবে বাতিল করা",
          body: [
            "আপনি আপনার বুকিং তালিকা থেকে যেকোনো আসন্ন অ্যাপয়েন্টমেন্ট বিনামূল্যে বাতিল করতে পারেন — স্লটের শুরুর সময় পর্যন্ত। আগে বাতিল করলে অন্য কোনো রোগী সেই স্লট পান — এটাই সৌজন্যপূর্ণ কাজ।",
          ],
        },
        {
          heading: "২. ডাক্তার বাতিল বা রিশিডিউল করলে",
          body: [
            "ডাক্তার আপনার অ্যাপয়েন্টমেন্ট বাতিল করলে বা সরাতে চাইলে, আপনাকে বুকিং রেফারেন্টসহ জানানো হয় এবং আপনি যেকোনো খালি স্লটে বিনামূল্যে পুনরায় বুক করতে পারেন। আপনার বুকিং বারবার ডাক্তার-পক্ষের কারণে বাতিল হলে তা ট্র্যাক করা হয় ও প্ল্যাটফর্ম অ্যাডমিনদের কাছে পৌঁছায়।",
          ],
        },
        {
          heading: "৩. নো-শো",
          body: [
            "বাতিল না করে অ্যাপয়েন্টমেন্ট মিস করা সেই স্লটের জন্য অপেক্ষারত প্রতিটি রোগীর ক্ষতি করে। বারবার নো-শো করা অ্যাকাউন্ট ইনস্ট্যান্ট বুকিং থেকে বঞ্চিত হয়ে শুধু অনুমোদন-ভিত্তিক বুকিংয়ে সীমাবদ্ধ হতে পারে।",
          ],
        },
        {
          heading: "৪. চেম্বার ফি ফেরত",
          body: [
            "মেডব্রিকবিডি কখনোই আপনার টাকা গচ্ছিত রাখে না — চেম্বারের ফি সরাসরি চেম্বারেই দেওয়া হয়। চেম্বারে ফি দেওয়ার পর ডাক্তারের নিয়ন্ত্রণের কারণে ভিজিট না হলে, ফেরত সেই ডাক্তার বা প্রতিষ্ঠানের নিজস্ব প্রকাশিত নীতি অনুসারে হয়; সঠিক ঠিকানায় পৌঁছাতে আমাদের সাপোর্ট চ্যানেল সাহায্য করবে।",
          ],
        },
        {
          heading: "৫. ডেমো পরিবেশ বিজ্ঞপ্তি",
          body: [
            "এই ডেমনস্ট্রেশন পরিবেশে পেমেন্ট স্যান্ডবক্সে চলে — কোনো প্রকৃত টাকার লেনদেন হয় না এবং কোনো আর্থিক তথ্য সংরক্ষিত হয় না।",
          ],
        },
      ],
    },
  },

  // ── 9. Grievance & Support ─────────────────────────────────────────
  {
    slug: "grievance",
    icon: "message",
    updated: LEGAL_UPDATED,
    title: { en: "Grievance & Support", bn: "অভিযোগ ও সহায়তা" },
    short: {
      en: "How to complain, report and get help",
      bn: "অভিযোগ, রিপোর্ট ও সহায়তা পাওয়ার উপায়",
    },
    intro: {
      en: "Something wrong? Tell us. This channel covers complaints, safety reports, provider disputes and privacy requests — with published response commitments.",
      bn: "কিছু ভুল হয়েছে? আমাদের জানান। অভিযোগ, নিরাপত্তা রিপোর্ট, প্রোভাইডার বিরোধ ও গোপনীয়তা-সংক্রান্ত অনুরোধ — সবই এই চ্যানেলে, প্রতিক্রিয়ার প্রতিশ্রুতিসহ।",
    },
    sections: {
      en: [
        {
          heading: "1. How to reach us",
          bullets: [
            "In-app: the Grievance & Support page (this page) explains the channels available in your dashboard.",
            "Include your booking reference code whenever the issue involves an appointment.",
            "For privacy requests (data access, correction, deletion), mention the email or mobile number on the account.",
          ],
        },
        {
          heading: "2. Response commitments",
          bullets: [
            "Acknowledgement within 3 working days.",
            "Target resolution within 14 working days.",
            "Safety and fraud reports are prioritised above everything else.",
          ],
        },
        {
          heading: "3. Report a doctor, hospital or content",
          body: [
            "Suspect a fake credential, wrong fee, suspicious profile or harmful content? Report it with the profile link or booking reference. Reports can be submitted without an account where the channel allows it, and good-faith reporters are never penalised.",
          ],
        },
        {
          heading: "4. Escalation",
          body: [
            "If you are not satisfied with the outcome, ask for escalation — the case is reviewed by a senior administrator who was not part of the original decision.",
          ],
        },
        {
          heading: "5. Before you go",
          body: [
            "Remember: for medical emergencies call 999 or go to the nearest hospital. The grievance channel is for platform issues, never for urgent medical help.",
          ],
        },
      ],
      bn: [
        {
          heading: "১. আমাদের সাথে যোগাযোগ",
          bullets: [
            "অ্যাপের ভেতরে: অভিযোগ ও সহায়তা পেজ (এই পেজ) আপনার ড্যাশবোর্ডে উপলব্ধ চ্যানেলগুলো ব্যাখ্যা করে।",
            "অ্যাপয়েন্টমেন্ট-সংক্রান্ত সমস্যায় অবশ্যই আপনার বুকিং রেফারেন্স কোড উল্লেখ করুন।",
            "গোপনীয়তা-সংক্রান্ত অনুরোধে (তথ্য দেখা, সংশোধন, মুছে ফেলা) অ্যাকাউন্টের ইমেইল বা মোবাইল নম্বর লিখুন।",
          ],
        },
        {
          heading: "২. প্রতিক্রিয়ার প্রতিশ্রুতি",
          bullets: [
            "৩ কর্মদিবসের মধ্যে গ্রহণের স্বীকৃতি।",
            "১৪ কর্মদিবসের মধ্যে সমাধানের লক্ষ্য।",
            "নিরাপত্তা ও প্রতারণা-সংক্রান্ত রিপোর্ট সবার আগে দেখা হয়।",
          ],
        },
        {
          heading: "৩. ডাক্তার, হাসপাতাল বা কনটেন্ট রিপোর্ট",
          body: [
            "ভুয়া প্রমাণপত্র, ভুল ফি, সন্দেহজনক প্রোফাইল বা ক্ষতিকর কনটেন্টের সন্দেহ? প্রোফাইল লিঙ্ক বা বুকিং রেফারেন্সসহ রিপোর্ট করুন। চ্যানেল অনুমোদন করলে অ্যাকাউন্ট ছাড়াও রিপোর্ট করা যায়, এবং সৎ উদ্দেশ্যে রিপোর্টকারী কখনোই শাস্তি পান না।",
          ],
        },
        {
          heading: "৪. এসকালেশন",
          body: [
            "ফলাফলে সন্তুষ্ট না হলে এসকালেশন চান — মামলাটি পুনরায় দেখেন একজন ঊর্ধ্বতন অ্যাডমিনিস্ট্রেটর, যিনি মূল সিদ্ধান্তে ছিলেন না।",
          ],
        },
        {
          heading: "৫. শেষ কথা",
          body: [
            "মনে রাখুন: চিকিৎসা জরুরি পরিস্থিতিতে ৯৯৯-এ কল করুন বা নিকটস্থ হাসপাতালে যান। অভিযোগ চ্যানেল প্ল্যাটফর্মের সমস্যার জন্য — জরুরি চিকিৎসার জন্য কখনোই নয়।",
          ],
        },
      ],
    },
  },
];

// ── Helpers ──────────────────────────────────────────────────────────

export function isLegalDocSlug(v: string): v is LegalDocSlug {
  return LEGAL_DOCS.some((d) => d.slug === v);
}

export function legalDocBySlug(slug: string): LegalDoc | undefined {
  return LEGAL_DOCS.find((d) => d.slug === slug);
}

/** Bilingual doc title lookup (used by inline links on the auth wall). */
export function legalDocTitle(slug: string, lang: LegalLocale): string {
  return legalDocBySlug(slug)?.title[lang] ?? slug;
}
