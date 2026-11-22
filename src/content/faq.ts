import type { FaqItem } from "./types";

/**
 * Platform FAQ. Honesty rules: anything not actually implemented is stated
 * as "coming" or "not yet" — no fake features, no invented phone numbers or
 * offices. Answers describe the CURRENT demo product accurately.
 */
export const FAQ_ITEMS: FaqItem[] = [
  // ── General ────────────────────────────────────────────────────────
  {
    audience: "general",
    q: "What is Find Medi Doctor?",
    a: "Find Medi Doctor is a healthcare discovery platform for finding and booking appointments with doctors in Bangladesh. You can browse verified doctor profiles, hospital listings, and free health education — without creating an account. Signing in is only needed to book and manage appointments.",
  },
  {
    audience: "general",
    q: "Do I need an account to browse?",
    a: "No. Searching doctors and hospitals, viewing public profiles, reading the Health Library, symptom guides and equipment guides are all open to every visitor. An account is required only to book appointments, see your records and manage bookings.",
  },
  {
    audience: "general",
    q: "Are the doctors on Find Medi Doctor verified?",
    a: "Doctors who complete our credential review receive a 'Verified' badge, which is shown on their profile. Profiles that have not yet completed verification are clearly marked 'Pending' instead. You can filter searches to show verified doctors only, and our verification process is explained openly on the Verification Center page.",
  },
  {
    audience: "general",
    q: "How are consultation fees shown?",
    a: "Each verified doctor can configure their own fees for new and returning patients. When you book, the platform automatically calculates which fee applies to you and shows the exact amount before you confirm — the price is re-checked on the server at confirmation time.",
  },
  {
    audience: "general",
    q: "Is this a real medical service?",
    a: "This deployment is a demonstration MVP. The doctor, hospital and review data you see is fictional demo data, clearly labeled as such. The health education articles are general educational content and are not a substitute for professional medical advice, diagnosis or treatment.",
  },
  {
    audience: "general",
    q: "Which areas of Bangladesh are covered?",
    a: "Search covers all of Bangladesh: every division and all 64 districts can be selected. The demo dataset currently lists doctors and hospitals in Dhaka, Chattogram, Cumilla, Sylhet, Rajshahi, Rangpur and Khulna — locations without listings yet are shown honestly as empty rather than being filled with irrelevant results.",
  },
  // ── Patients ───────────────────────────────────────────────────────
  {
    audience: "patients",
    q: "How do I book an appointment?",
    a: "Search for a doctor, open their profile, review their chambers and schedule, and press 'Book appointment'. If you are not signed in you will be asked to sign in or register — your selected doctor is kept for you and the booking resumes right after. Pick a chamber, date and free time slot, confirm the displayed fee, and you will receive a booking reference code.",
  },
  {
    audience: "patients",
    q: "Why did my fee change between doctors' visits?",
    a: "Doctors can set separate fees for new and returning patients. The platform checks your visit history with that doctor and automatically applies the correct fee — new patient fee, returning patient fee, or follow-up fee if the doctor offers one and you are within the follow-up window.",
  },
  {
    audience: "patients",
    q: "Can I cancel or reschedule a booking?",
    a: "Yes. Open your bookings, select the appointment, and choose cancel or reschedule. Cancellation and rescheduling are free in this demo; a real deployment would show any applicable policy before you confirm.",
  },
  {
    audience: "patients",
    q: "Do you send appointment reminders?",
    a: "Signed-in patients receive in-app notifications about booking changes. Browser push notifications and SMS reminders are being introduced gradually — this demo shows the in-app notification centre today.",
  },
  {
    audience: "patients",
    q: "Are video consultations available?",
    a: "Not yet. Video consultation is a regulated service in Bangladesh, so Find Medi Doctor keeps it disabled until the required compliance review is complete. All bookings in this demo are in-person chamber visits.",
  },
  // ── Doctors ────────────────────────────────────────────────────────
  {
    audience: "doctors",
    q: "How do I join as a doctor?",
    a: "Register with the 'Doctor' role from the For Doctors page, submit your professional details including your registration number and qualifications, and complete verification. After verification you can configure your profile, chambers, weekly schedule, and your new/returning patient fees.",
  },
  {
    audience: "doctors",
    q: "What does verification check?",
    a: "The review team checks your submitted professional credentials, including your medical registration number and qualifications, before awarding the 'Verified' badge. Until then your profile is listed as 'Pending' and clearly labeled. The process is described in detail on the Verification Center page.",
  },
  {
    audience: "doctors",
    q: "How long does verification take?",
    a: "In this demonstration environment verification is processed by the platform admin, usually quickly. In a live deployment, verification timing depends on credential-checking workflows and will be shown transparently in your dashboard.",
  },
  {
    audience: "doctors",
    q: "What does it cost to be listed?",
    a: "Listing and profile management are free in the current demo. Any future commission or subscription model will be published openly and agreed with doctors before it takes effect — nothing will be charged silently.",
  },
  {
    audience: "doctors",
    q: "How does the new/returning patient fee work?",
    a: "You configure a fee for new patients, a (usually lower) fee for returning patients, and optionally a follow-up fee with a validity window. The platform classifies each booking automatically using the patient's visit history with you, prices the appointment server-side, and stores the fee version used for every booking.",
  },
  // ── Hospitals ──────────────────────────────────────────────────────
  {
    audience: "hospitals",
    q: "How can our hospital or clinic join?",
    a: "Register with the 'Hospital' role from the For Hospitals page and submit your institution's details for verification. After verification, hospital managers can maintain the public profile, branches and departments, and manage the doctors associated with the institution.",
  },
  {
    audience: "hospitals",
    q: "What appears on our public hospital page?",
    a: "Your verified name, city, address, contact details and description, the number of associated doctors, and links to the public profiles of doctors practising at your institution. Unverified institutions are clearly labeled as pending.",
  },
  {
    audience: "hospitals",
    q: "Can we manage multiple branches?",
    a: "Yes. Verified hospital accounts can create and manage branches and departments from the hospital dashboard, and each branch keeps its own details.",
  },
  {
    audience: "hospitals",
    q: "How do we connect our doctors?",
    a: "Doctors list the hospital as their practice location on their profile. In this demo, hospital accounts are provisioned by the platform admin after registration; self-serve organization onboarding with document upload is on the roadmap.",
  },
];
