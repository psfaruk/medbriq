/**
 * Emergency information for Bangladesh (public, factual).
 *
 * Sources are well-known national services. Kept deliberately short: in an
 * emergency the guidance is "call 999 / go to the nearest emergency department"
 * — never complex self-treatment advice.
 */

export type EmergencyNumber = {
  label: string;
  number: string;
  note: string;
};

export type EmergencyGuidance = {
  title: string;
  steps: string[];
};

export const BD_EMERGENCY_NUMBERS: EmergencyNumber[] = [
  {
    label: "National Emergency Service",
    number: "999",
    note: "Free 24/7 emergency service for ambulance, police and fire — from any mobile or landline.",
  },
  {
    label: "Shastho Batayon (Health Call Center)",
    number: "16263",
    note: "Government health helpline for medical advice and directory information (24/7).",
  },
  {
    label: "Government Information & Services",
    number: "333",
    note: "National government information and citizen services helpline.",
  },
];

export const EMERGENCY_GUIDANCE: EmergencyGuidance[] = [
  {
    title: "When to call 999 immediately",
    steps: [
      "Chest pain, pressure or discomfort that does not settle — especially with sweating, nausea or breathlessness",
      "Difficulty breathing, or blue lips/face",
      "Signs of stroke: sudden face drooping, arm weakness, slurred speech or sudden confusion — note the time symptoms started",
      "Heavy bleeding that does not stop with firm pressure",
      "Loss of consciousness, seizure that does not stop, or a serious injury",
      "Any situation that feels immediately life-threatening",
    ],
  },
  {
    title: "While waiting for help",
    steps: [
      "Keep the person still, warm and reassured; do not give food or drink if they are drowsy or vomiting",
      "Unlock the door so responders can enter; gather any medicines or medical papers to show them",
      "For heavy bleeding: press firmly on the wound with a clean cloth and keep pressing",
      "Do not move someone with a possible spine or neck injury unless there is danger",
      "Stay on the line with the emergency operator and follow their instructions",
    ],
  },
  {
    title: "If you are not sure it is an emergency",
    steps: [
      "Call Shastho Batayon 16263 for guidance from a health professional",
      "If symptoms are mild but persist for days, book a consultation with an appropriate doctor instead of waiting",
      "When in doubt, going to the nearest emergency department is always the safer choice",
    ],
  },
];
