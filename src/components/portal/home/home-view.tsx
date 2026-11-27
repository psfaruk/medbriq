"use client";

/**
 * Public portal homepage — focused discovery journey.
 * Dedicated education, provider and information pages remain available from
 * the navigation; the homepage prioritizes finding care and booking it.
 */

import { PortalHero } from "./hero";
import {
  ServiceCategories,
  FeaturedDoctors,
  HospitalsPreview,
  HowBookingWorks,
  PatientBenefits,
  TrustSection,
  HomeFaq,
} from "./sections";

export default function HomeView() {
  return (
    <main id="main">
      {/* 1. Clear intent: search for a doctor, specialty or hospital. */}
      <PortalHero />
      {/* 2. Quick entry points to clinical specialties and health education. */}
      <ServiceCategories />
      {/* 3. Trust-led doctor discovery. */}
      <FeaturedDoctors />
      {/* 4. Local hospital and clinic discovery. */}
      <HospitalsPreview />
      {/* 5. Explain the booking sequence before the user commits. */}
      <HowBookingWorks />
      {/* 6. Patient value proposition and practical next steps. */}
      <PatientBenefits />
      {/* 7. Verification and platform trust. */}
      <TrustSection />
      {/* 8. Resolve common questions; emergency guidance remains in the footer/nav. */}
      <HomeFaq />
    </main>
  );
}
