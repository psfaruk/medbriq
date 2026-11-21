import type { Article } from "../types";
import { CONTENT_AUTHOR } from "../types";

/**
 * Health Library articles (demo dataset).
 *
 * STATUS HONESTY: items below are marked PUBLISHED so the demo portal shows a
 * working library, but medicalReviewer is deliberately null — the standing UI
 * label is "Medical review: pending". Before any real public launch, a
 * qualified medical professional must review each item and the reviewer
 * fields must be filled in honestly.
 */

export const ARTICLES: Article[] = [
  {
    slug: "hand-hygiene-basics",
    title: "Hand Hygiene: Why Washing Your Hands Still Matters",
    titleBn: "হাত ধোয়া: কেন এটি এখনও সবচেয়ে গুরুত্বপূর্ণ",
    summary:
      "Clean hands are one of the simplest and most effective ways to reduce the spread of common infections like colds, flu and diarrhoeal illness. Here is what works and what does not.",
    category: "general-health",
    keyPoints: [
      "Wash hands with soap and water for about 20 seconds, especially before eating and after using the toilet.",
      "Alcohol-based hand sanitiser (at least 60% alcohol) is a good alternative when soap and water are unavailable.",
      "Hand hygiene matters most before eating, after using the toilet, after coughing or sneezing, and after touching shared surfaces.",
      "Antibacterial soap is not necessary — plain soap used properly is effective for everyday life.",
    ],
    sections: [
      {
        heading: "Why hand hygiene works",
        body:
          "Many infections spread through hands. A person with a cold who touches their nose can leave viruses on shared surfaces — door handles, railings, phones, money. The next person to touch the same surface can pick the germs up and transfer them to their own eyes, nose or mouth. Washing with soap does not just remove visible dirt: soap breaks down the oily layer that helps many viruses and bacteria stick to skin, and the rinsing action carries them away.\n\nThis is why hand washing is consistently highlighted by the World Health Organization and national health services as a first-line defence against common infections, from seasonal flu to diarrhoeal disease.",
      },
      {
        heading: "When to wash",
        body:
          "• Before preparing or eating food\n• After using the toilet or changing a child's nappy\n• After coughing, sneezing or blowing your nose\n• After touching shared surfaces in public places (handles, rails, buttons)\n• After handling animals or animal waste\n• Before and after caring for someone who is unwell\n• After returning home from outside",
      },
      {
        heading: "The right technique",
        body:
          "Wet your hands with clean running water, apply soap, and rub for about 20 seconds — long enough to hum a short song. Cover all surfaces: palms, the backs of hands, between fingers, thumbs, fingertips and nails. Rinse thoroughly and dry with a clean towel or air-dry.\n\nIf soap and water are not available, use an alcohol-based hand rub with at least 60% alcohol, applying enough to cover all hand surfaces and rubbing until dry. Hand rubs are not equally effective when hands are visibly dirty or greasy — wash first when you can.",
      },
      {
        heading: "Common misconceptions",
        body:
          "Hot water is not required — comfortable lukewarm or cold water works with soap. 'Antibacterial' soaps offer little extra benefit for everyday home use. And a quick rinse without soap removes far fewer germs than a proper 20-second wash, which is why technique and timing matter more than the product label.",
      },
    ],
    whenToSeekHelp: [
      "If you have signs of a skin infection on your hands — spreading redness, swelling, warmth, pus or pain — have it assessed by a health professional.",
      "Frequent hand washing can dry or crack skin; if your hands become painful, cracked or inflamed, a pharmacist or doctor can advise on skin care that keeps hygiene up without damaging skin.",
    ],
    author: CONTENT_AUTHOR,
    medicalReviewer: null,
    status: "PUBLISHED",
    publishedAt: "2026-11-20",
    updatedAt: "2026-11-20",
    reviewedAt: null,
    sources: [
      {
        title: "Hand hygiene: Why, how, when?",
        publisher: "World Health Organization",
        url: "https://www.who.int/team/integrated-health-services/patient-safety/policy/hand-hygiene",
      },
      {
        title: "When and How to Wash Your Hands",
        publisher: "US Centers for Disease Control and Prevention",
        url: "https://www.cdc.gov/hygiene/about/handwashing.html",
      },
    ],
    relatedSlugs: ["safe-drinking-water", "understanding-cbc-report"],
    emergencyNote: null,
  },
  {
    slug: "sample-draft-article",
    title: "SAMPLE — Admin workflow demo (not publicly listed)",
    titleBn: null,
    summary:
      "This item exists to demonstrate the DRAFT stage of the content workflow in the admin console. It is never served to the public site.",
    category: "general-health",
    keyPoints: [],
    sections: [],
    whenToSeekHelp: [],
    author: CONTENT_AUTHOR,
    medicalReviewer: null,
    status: "DRAFT",
    publishedAt: "2026-11-21",
    updatedAt: "2026-11-21",
    reviewedAt: null,
    sources: [],
    relatedSlugs: [],
    emergencyNote: null,
  },
];
