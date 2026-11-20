"use client";

import { useAppStore } from "@/lib/app-state";
import { searchPreset } from "./preset";
import HomeScreen from "./screens/home";
import DoctorsScreen from "./screens/doctors";
import DoctorProfileScreen from "./screens/doctor-profile";
import BookingFlowScreen from "./screens/booking-flow";
import BookingsScreen from "./screens/bookings";
import AppointmentDetailsScreen from "./screens/appointment-details";
import RecordsScreen from "./screens/records";
import ProfileScreen from "./screens/profile";
import {
  NotificationsScreen,
  SpecialtiesScreen,
  HospitalsScreen,
  HospitalDetailScreen,
} from "./screens/misc";

/**
 * PatientApp — the patient mobile-first application (master prompt §3).
 * Screen router driven by useAppStore().patientScreen; the PatientShell
 * provides the chrome (top bar, bottom tabs on phones).
 */

export default function PatientApp() {
  const screen = useAppStore((s) => s.patientScreen);

  switch (screen.name) {
    case "home":
      return <HomeScreen />;
    case "doctors":
      return <DoctorsScreen />;
    case "doctor":
      return <DoctorProfileScreen slug={screen.slug} />;
    case "booking":
      return <BookingFlowScreen slug={screen.slug} />;
    case "bookings":
      return <BookingsScreen />;
    case "appointment":
      return <AppointmentDetailsScreen id={screen.id} />;
    case "records":
      return <RecordsScreen />;
    case "profile":
      return <ProfileScreen />;
    case "notifications":
      return <NotificationsScreen />;
    case "specialties":
      return <SpecialtiesScreen />;
    case "hospitals":
      return <HospitalsScreen />;
    case "hospital":
      return <HospitalDetailScreen slug={screen.slug} />;
    default:
      return <HomeScreen />;
  }
}
