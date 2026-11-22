"use client";

/**
 * PublicPortal — the guest experience on "/" (spec §1A).
 *
 * Single-route SPA (sandbox constraint): the view router below maps
 * portalView state to view components and syncs the URL (?view=…&slug=…)
 * so public pages are deep-linkable and the browser Back button works.
 * Every view component is written to lift into its own app/ route later.
 *
 * Logged-in users never see this shell — app.tsx renders dashboards.
 */

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useAppStore, urlToView } from "@/lib/app-state";
import PortalHeader from "./header/portal-header";
import PortalFooter from "./footer/portal-footer";

// Views are code-split: a guest opening the homepage never compiles the
// doctor dashboard, library, or auth code paths.
const HomeView = dynamic(() => import("./home/home-view"), { loading: () => <ViewFallback /> });
const DoctorDirectoryView = dynamic(() => import("./doctors/doctor-directory"), { loading: () => <ViewFallback /> });
const DoctorProfileView = dynamic(() => import("./doctors/doctor-profile"), { loading: () => <ViewFallback /> });
const HospitalDirectoryView = dynamic(() => import("./hospitals/hospital-directory"), { loading: () => <ViewFallback /> });
const HospitalProfileView = dynamic(() => import("./hospitals/hospital-profile"), { loading: () => <ViewFallback /> });
const SpecialtiesView = dynamic(() => import("./library/specialties-view"), { loading: () => <ViewFallback /> });
const LibraryView = dynamic(() => import("./library/library-view"), { loading: () => <ViewFallback /> });
const ArticleView = dynamic(() => import("./library/article-view"), { loading: () => <ViewFallback /> });
const SymptomsHomeView = dynamic(() => import("./education/symptom-views").then((m) => ({ default: m.SymptomsHomeView })), { loading: () => <ViewFallback /> });
const SymptomDetailView = dynamic(() => import("./education/symptom-views").then((m) => ({ default: m.SymptomDetailView })), { loading: () => <ViewFallback /> });
const EquipmentHomeView = dynamic(() => import("./education/equipment-views").then((m) => ({ default: m.EquipmentHomeView })), { loading: () => <ViewFallback /> });
const EquipmentDetailView = dynamic(() => import("./education/equipment-views").then((m) => ({ default: m.EquipmentDetailView })), { loading: () => <ViewFallback /> });
const ChildrensHealthView = dynamic(() => import("./education/gallery-views").then((m) => ({ default: m.ChildrensHealthView })), { loading: () => <ViewFallback /> });
const FamilyHealthView = dynamic(() => import("./education/gallery-views").then((m) => ({ default: m.FamilyHealthView })), { loading: () => <ViewFallback /> });
const ForPatientsView = dynamic(() => import("./landing/landing-views").then((m) => ({ default: m.ForPatientsView })), { loading: () => <ViewFallback /> });
const ForDoctorsView = dynamic(() => import("./landing/landing-views").then((m) => ({ default: m.ForDoctorsView })), { loading: () => <ViewFallback /> });
const ForHospitalsView = dynamic(() => import("./landing/landing-views").then((m) => ({ default: m.ForHospitalsView })), { loading: () => <ViewFallback /> });
const ForProvidersView = dynamic(() => import("./landing/landing-views").then((m) => ({ default: m.ForProvidersView })), { loading: () => <ViewFallback /> });
const HowItWorksView = dynamic(() => import("./info/info-views").then((m) => ({ default: m.HowItWorksView })), { loading: () => <ViewFallback /> });
const VerificationCenterView = dynamic(() => import("./info/info-views").then((m) => ({ default: m.VerificationCenterView })), { loading: () => <ViewFallback /> });
const EmergencyView = dynamic(() => import("./info/info-views").then((m) => ({ default: m.EmergencyView })), { loading: () => <ViewFallback /> });
const FaqView = dynamic(() => import("./info/info-views").then((m) => ({ default: m.FaqView })), { loading: () => <ViewFallback /> });
const CalendarView = dynamic(() => import("./info/info-views").then((m) => ({ default: m.CalendarView })), { loading: () => <ViewFallback /> });
const ToolsView = dynamic(() => import("./tools/tools-view").then((m) => ({ default: m.ToolsView })), { loading: () => <ViewFallback /> });
const PortalVerifyView = dynamic(() => import("./vvs/verify-view"), { loading: () => <ViewFallback /> });
const LegalCenterView = dynamic(() => import("./legal/legal-view"), { loading: () => <ViewFallback /> });
const AuthFrameView = dynamic(() => import("./auth/auth-frame"), { loading: () => <ViewFallback /> });

function ViewFallback() {
  return (
    <div
      className="mx-auto flex min-h-[50vh] w-full max-w-6xl items-center justify-center px-4"
      role="status"
      aria-live="polite"
    >
      <span className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
    </div>
  );
}

export default function PublicPortal() {
  const portalView = useAppStore((s) => s.portalView);

  // URL → view on first mount + browser back/forward support.
  useEffect(() => {
    useAppStore.setState({ portalView: urlToView(window.location.search) });
    const onPopState = () => {
      useAppStore.setState({ portalView: urlToView(window.location.search) });
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
     
  }, []);

  // Per-view document.title (SEO/UX: the SPA shares one route, but the tab
  // title at least reflects the current page; real per-route metadata comes
  // when views lift into app/ routes).
  useEffect(() => {
    const suffix = "MedBricBD";
    const view = portalView.name;
    const titles: Record<string, string> = {
      home: `${suffix} — Find & Book Verified Doctors in Bangladesh`,
      doctors: `Find Doctors · ${suffix}`,
      doctor: `Doctor Profile · ${suffix}`,
      hospitals: `Hospitals & Clinics · ${suffix}`,
      hospital: `Hospital Profile · ${suffix}`,
      specialties: `Medical Specialties · ${suffix}`,
      library: `Health Library · ${suffix}`,
      article: `Health Article · ${suffix}`,
      symptoms: `Symptoms Guide · ${suffix}`,
      symptom: `Symptom Guide · ${suffix}`,
      equipment: `Medical Equipment Guide · ${suffix}`,
      "equipment-item": `Equipment Guide · ${suffix}`,
      "childrens-health": `Children's Health · ${suffix}`,
      "family-health": `Family Healthcare · ${suffix}`,
      "community-health": `Community Health · ${suffix}`,
      "how-it-works": `How Booking Works · ${suffix}`,
      verification: `Trust & Verification · ${suffix}`,
      emergency: `Emergency Guidance · ${suffix}`,
      faq: `FAQ · ${suffix}`,
      tools: `Health Tools · ${suffix}`,
      calendar: `Health Awareness Calendar · ${suffix}`,
      legal: `Legal & Policies · ${suffix}`,
    };
    document.title = titles[view] ?? suffix;
  }, [portalView]);

  // The auth view renders its own minimal chrome (AuthScreen is full-page).
  if (portalView.name === "auth") {
    return <AuthFrameView mode={portalView.mode} />;
  }

  let content: React.ReactNode;
  switch (portalView.name) {
    case "doctors":
      // Keyed remount: changing filters via URL (e.g. a specialty chip)
      // reinitializes the view state from the new deep-link params.
      content = (
        <DoctorDirectoryView
          key={`${portalView.q ?? ""}|${portalView.specialty ?? ""}|${portalView.city ?? ""}|${portalView.district ?? ""}|${portalView.division ?? ""}`}
          initial={portalView}
        />
      );
      break;
    case "doctor":
      content = <DoctorProfileView slug={portalView.slug} />;
      break;
    case "hospitals":
      content = <HospitalDirectoryView key={portalView.city ?? ""} initial={portalView} />;
      break;
    case "hospital":
      content = <HospitalProfileView slug={portalView.slug} />;
      break;
    case "specialties":
      content = <SpecialtiesView />;
      break;
    case "library":
      content = <LibraryView key={portalView.category ?? ""} initial={portalView} />;
      break;
    case "article":
      content = <ArticleView slug={portalView.slug} />;
      break;
    case "symptoms":
      content = <SymptomsHomeView />;
      break;
    case "symptom":
      content = <SymptomDetailView slug={portalView.slug} />;
      break;
    case "equipment":
      content = <EquipmentHomeView />;
      break;
    case "equipment-item":
      content = <EquipmentDetailView slug={portalView.slug} />;
      break;
    case "childrens-health":
      content = <ChildrensHealthView />;
      break;
    case "family-health":
      content = <FamilyHealthView />;
      break;
    case "community-health":
      content = <FamilyHealthView community />;
      break;
    case "for-patients":
      content = <ForPatientsView />;
      break;
    case "for-doctors":
      content = <ForDoctorsView />;
      break;
    case "for-hospitals":
      content = <ForHospitalsView />;
      break;
    case "for-providers":
      content = <ForProvidersView />;
      break;
    case "how-it-works":
      content = <HowItWorksView />;
      break;
    case "verification":
      content = <VerificationCenterView />;
      break;
    case "emergency":
      content = <EmergencyView />;
      break;
    case "faq":
      content = <FaqView />;
      break;
    case "calendar":
      content = <CalendarView />;
      break;
    case "tools":
      content = <ToolsView />;
      break;
    case "verify":
      content = <PortalVerifyView payload={portalView.d} />;
      break;
    case "legal":
      content = <LegalCenterView doc={portalView.doc} />;
      break;
    case "home":
    default:
      content = <HomeView />;
      break;
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <PortalHeader />
      <div className="flex-1">{content}</div>
      <PortalFooter />
    </div>
  );
}
