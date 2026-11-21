import type { EquipmentGuide } from "../types";
import { CONTENT_AUTHOR } from "../types";

/**
 * Medical equipment education (demo dataset).
 *
 * FRAMING RULE (strict): these pages explain what common devices are and what
 * they measure, in general educational terms. No brand, no product
 * recommendations, no efficacy claims. Home readings never replace
 * professional assessment.
 */

export const EQUIPMENT_GUIDES: EquipmentGuide[] = [
  {
    slug: "blood-pressure-monitor",
    name: "Blood Pressure Monitor",
    nameBn: "রক্তচাপ মাপার যন্ত্র",
    summary:
      "A device that measures the pressure of blood in the arteries. Home monitoring can help track blood pressure over time when done correctly — but a single reading never makes a diagnosis.",
    whatItIs:
      "A blood pressure monitor (sphygmomanometer) measures how hard your blood pushes against artery walls when the heart beats (systolic) and rests between beats (diastolic). Digital upper-arm monitors are the most common type for home use; they display two numbers, for example '120/80 mmHg'.",
    whatItMeasures:
      "Two pressures in millimetres of mercury (mmHg): systolic (during heartbeats) and diastolic (between beats). Many devices also show pulse rate. Blood pressure naturally changes through the day with activity, stress, sleep and meals — which is why doctors rely on multiple readings over time rather than one number.",
    commonUses: [
      "Tracking blood pressure over weeks and months as advised by a doctor",
      "Supporting the management of known high blood pressure",
      "Checking how you feel during symptoms such as dizziness or headache (report readings to your doctor)",
      "Providing your doctor with home readings, which can complement clinic measurements",
    ],
    safeUse: [
      "Sit quietly for about 5 minutes before measuring; avoid caffeine, exercise and smoking for at least 30 minutes beforehand.",
      "Use an upper-arm cuff of the right size, placed on a bare arm at heart level, with your back supported and feet flat on the floor.",
      "Take two or three readings a minute apart and record them, ideally at consistent times of day.",
      "Validate the device: look for internationally validated models and have the technique checked by a health professional at least once.",
    ],
    limitations: [
      "A single high or low reading is not a diagnosis — blood pressure varies normally.",
      "Wrist and finger devices are generally less accurate than upper-arm monitors.",
      "Improper cuff size or posture can produce misleading numbers.",
      "Home devices can drift out of calibration over time.",
    ],
    whenProfessionalHelp: [
      "Very high readings (for example 180/120 mmHg or above) — seek urgent care, especially with chest pain, breathlessness, severe headache, vision change or weakness.",
      "Readings that are consistently high across many days — arrange a medical assessment.",
      "Symptoms such as fainting, chest discomfort or irregular heartbeat — do not wait to collect more readings.",
    ],
    icon: "HeartPulse",
    author: CONTENT_AUTHOR,
    medicalReviewer: null,
    status: "PUBLISHED",
    publishedAt: "2026-11-20",
    updatedAt: "2026-11-20",
    reviewedAt: null,
    sources: [
      {
        title: "Hypertension — fact sheet",
        publisher: "World Health Organization",
        url: "https://www.who.int/news-room/fact-sheets/detail/hypertension",
      },
      {
        title: "Home blood pressure monitoring",
        publisher: "American Heart Association",
        url: "https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings/monitoring-your-blood-pressure-at-home",
      },
    ],
  },
];
