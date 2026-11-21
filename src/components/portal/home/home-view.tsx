"use client";

/**
 * Public portal homepage (spec §2, 18 sections in order).
 */

import { PortalHero } from "./hero";
import {
  ServiceCategories,
  FeaturedDoctors,
  HospitalsPreview,
  Specializations,
  HealthArticles,
  SymptomsSlider,
  EquipmentGallery,
  HowBookingWorks,
  OnlineConsultation,
  ForDoctorsBand,
  ForHospitalsBand,
  PatientBenefits,
  TrustSection,
  HomeFaq,
} from "./sections";

export default function HomeView() {
  return (
    <main id="main">
      {/* 1. Header lives in the portal shell */}
      {/* 2 + 3. Hero with global search */}
      <PortalHero />
      {/* 4. Service categories */}
      <ServiceCategories />
      {/* 5. Featured verified doctors */}
      <FeaturedDoctors />
      {/* 6. Hospital directory */}
      <HospitalsPreview />
      {/* 7. Medical specializations */}
      <Specializations />
      {/* 8. Health articles + awareness days */}
      <HealthArticles />
      {/* 9. Symptoms education slider */}
      <SymptomsSlider />
      {/* 10. Equipment education gallery */}
      <EquipmentGallery />
      {/* 11. How booking works */}
      <HowBookingWorks />
      {/* 12. Online consultation (honest) */}
      <OnlineConsultation />
      {/* 13. For doctors */}
      <ForDoctorsBand />
      {/* 14. For hospitals */}
      <ForHospitalsBand />
      {/* 15. Patient benefits */}
      <PatientBenefits />
      {/* 16. Trust & verification */}
      <TrustSection />
      {/* 17. FAQ */}
      <HomeFaq />
      {/* 18. Footer lives in the portal shell */}
    </main>
  );
}
