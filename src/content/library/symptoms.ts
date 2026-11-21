import type { SymptomGuide } from "../types";
import { CONTENT_AUTHOR } from "../types";

/**
 * Educational symptom guides (demo dataset).
 *
 * FRAMING RULE (strict): a symptom guide explains what a symptom is, lists
 * common non-diagnostic possibilities, and points to professional assessment.
 * It must never suggest that reading it identifies the visitor's disease.
 * medicalReviewer stays null until a real review happens.
 */

export const SYMPTOM_GUIDES: SymptomGuide[] = [
  {
    slug: "fever",
    title: "Understanding Fever",
    titleBn: "জ্বর কী এবং কখন চিন্তা করা দরকার",
    summary:
      "Fever is a rise in body temperature, usually a sign that the body is responding to an infection. Most fevers settle on their own — but certain signs mean urgent medical care is needed.",
    whatItMeans:
      "Fever means the body temperature is higher than normal (typically 38°C / 100.4°F or above when measured properly). It is not an illness itself — it is a common response, most often to infections such as colds, flu, throat infections, or gut infections. In Bangladesh, fevers during and after the monsoon can also be caused by mosquito-borne illnesses like dengue, which is one reason unusual or persistent fever deserves attention.",
    commonCauses: [
      "Common viral infections — colds, flu and other respiratory viruses",
      "Throat and ear infections",
      "Gastrointestinal infections (often with vomiting or diarrhoea)",
      "Mosquito-borne infections such as dengue (seasonal in Bangladesh)",
      "Urinary tract infections",
      "Heat-related illness after sun exposure or heavy exercise",
    ],
    whenToSeekAssessment: [
      "Fever lasting more than 3 days without improving",
      "Fever that keeps returning over several days",
      "Fever with rash, severe body ache, vomiting, or pain behind the eyes (possible dengue — common in Bangladesh during monsoon)",
      "Fever in pregnancy, or in anyone with a long-term condition such as diabetes",
      "Fever that improves and then returns with worse cough or breathlessness",
    ],
    redFlags: [
      "Difficulty breathing or rapid breathing",
      "Confusion, extreme drowsiness, or difficulty waking",
      "Seizures (fits)",
      "Persistent vomiting with signs of dehydration (little or no urine, dry mouth, sunken eyes)",
      "Bleeding gums or nose, or small red spots on the skin, with fever",
      "Severe abdominal pain or a stiff neck with headache",
      "An infant under 3 months with any fever — go to a hospital immediately",
    ],
    relevantSpecialties: ["Medicine & Diabetology", "Pediatrics"],
    author: CONTENT_AUTHOR,
    medicalReviewer: null,
    status: "PUBLISHED",
    publishedAt: "2026-11-20",
    updatedAt: "2026-11-20",
    reviewedAt: null,
    sources: [
      {
        title: "Dengue and severe dengue — fact sheet",
        publisher: "World Health Organization",
        url: "https://www.who.int/news-room/fact-sheets/detail/dengue-and-severe-dengue",
      },
      {
        title: "Fever in adults",
        publisher: "Mayo Clinic",
        url: "https://www.mayoclinic.org/diseases-conditions/fever/symptoms-causes/syc-20352723",
      },
    ],
  },
  {
    slug: "sample-medical-review-symptom",
    title: "SAMPLE — Medical review stage demo (not publicly listed)",
    titleBn: null,
    summary:
      "Demonstrates the MEDICAL_REVIEW workflow stage in the admin content console. Never served publicly.",
    whatItMeans: "",
    commonCauses: [],
    whenToSeekAssessment: [],
    redFlags: [],
    relevantSpecialties: [],
    author: CONTENT_AUTHOR,
    medicalReviewer: null,
    status: "MEDICAL_REVIEW",
    publishedAt: "2026-11-21",
    updatedAt: "2026-11-21",
    reviewedAt: null,
    sources: [],
  },
];
