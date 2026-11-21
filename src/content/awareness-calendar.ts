import type { AwarenessEvent } from "./types";

/**
 * Health awareness calendar — well-established global health observances.
 * Educational only; dates follow widely recognized UN/WHO observance days.
 */
export const AWARENESS_EVENTS: AwarenessEvent[] = [
  { month: 2, day: 4, title: "World Cancer Day", description: "A global day to raise awareness about cancer prevention, early detection and treatment." },
  { month: 3, day: 24, title: "World Tuberculosis Day", description: "Marks the discovery of the TB bacillus and focuses on TB awareness and care — highly relevant for Bangladesh." },
  { month: 4, day: 7, title: "World Health Day", description: "The WHO's founding anniversary — each year highlights a priority global health theme." },
  { month: 5, day: 5, title: "World Hand Hygiene Day", description: "Promotes hand hygiene as the simplest, most effective way to prevent infection." },
  { month: 5, day: 12, title: "International Nurses Day", description: "Celebrates the contribution of nurses to health systems worldwide." },
  { month: 5, day: 31, title: "World No Tobacco Day", description: "Highlights the health risks of tobacco use and encourages quitting." },
  { month: 6, day: 14, title: "World Blood Donor Day", description: "Thanks voluntary blood donors and raises awareness of the constant need for safe blood." },
  { month: 7, day: 28, title: "World Hepatitis Day", description: "Raises awareness of viral hepatitis prevention, testing and care." },
  { month: 9, day: 10, title: "World Suicide Prevention Day", description: "Promotes understanding that suicide is preventable and that support exists." },
  { month: 9, day: 21, title: "World Alzheimer's Day", description: "Raises awareness of dementia and the care needs of older adults and families." },
  { month: 9, day: 29, title: "World Heart Day", description: "Focuses on cardiovascular health: blood pressure, exercise, diet and tobacco cessation." },
  { month: 10, day: null, title: "Breast Cancer Awareness Month", description: "A month dedicated to breast cancer awareness and the importance of early detection." },
  { month: 10, day: 10, title: "World Mental Health Day", description: "Raises awareness of mental health and mobilizes support for mental wellbeing." },
  { month: 11, day: null, title: "Movember — Men's Health Month", description: "Focuses on men's health issues including mental health and cancer screening." },
  { month: 11, day: 14, title: "World Diabetes Day", description: "The world's largest diabetes awareness campaign, marking the discovery of insulin." },
  { month: 12, day: 1, title: "World AIDS Day", description: "Unites people worldwide in the response to HIV, remembering those lost and supporting those living with HIV." },
];
