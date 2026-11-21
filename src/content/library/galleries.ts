import type { GalleryItem } from "../types";

/**
 * Children's health and family/community healthcare galleries.
 *
 * VISUAL ETHICS (enforced):
 * - Every image is an AI-generated illustrative scene — never a photograph of
 *   a real patient, family or hospital. The gallery UI states this clearly.
 * - Dignified, respectful portrayals — no pity-framing, no stereotypes.
 * - Captions and alt text describe the educational context, not people.
 */

const IMG = "/images/library";

/** Age-specific children's gallery (0–17 years) + care moments. */
export const CHILDREN_GALLERY: GalleryItem[] = [
  {
    slug: "newborn-0-28-days",
    category: "Age gallery",
    ageGroup: "0–28 days",
    caption: "Newborn (0–28 days)",
    captionBn: "নবজাতক (০–২৮ দিন)",
    description:
      "The first four weeks. Newborns feed every 2–3 hours, sleep most of the day, and need warmth, cleanliness and exclusive breastfeeding. Any fever in this age is a hospital emergency.",
    image: `${IMG}/children/newborn-0-28-days.png`,
    alt: "Illustration of a sleeping newborn baby wrapped in a soft cloth",
    related: { view: "article", slug: "antenatal-checkups-explained" },
  },
  {
    slug: "infant-1-6-months",
    category: "Age gallery",
    ageGroup: "1–6 months",
    caption: "Infant (1–6 months)",
    captionBn: "শিশু (১–৬ মাস)",
    description:
      "Head control develops, social smiles begin, and breast milk remains the only food needed. Vaccination visits (BCG, polio, pentavalent) follow the national schedule.",
    image: `${IMG}/children/infant-1-6-months.png`,
    alt: "Illustration of a healthy infant lying and looking around",
    related: { view: "article", slug: "childhood-vaccination-basics" },
  },
  {
    slug: "infant-6-12-months",
    category: "Age gallery",
    ageGroup: "6–12 months",
    caption: "Infant (6–12 months)",
    captionBn: "শিশু (৬–১২ মাস)",
    description:
      "Sitting, crawling and first teeth. Family foods begin alongside continued breastfeeding, one new taste at a time, while play and talking shape early learning.",
    image: `${IMG}/children/infant-6-12-months.png`,
    alt: "Illustration of a cheerful infant sitting and playing",
    related: { view: "article", slug: "balanced-diet-basics" },
  },
  {
    slug: "toddler-1-2-years",
    category: "Age gallery",
    ageGroup: "1–2 years",
    caption: "Toddler (1–2 years)",
    captionBn: "শিশু (১–২ বছর)",
    description:
      "First steps, first words and strong opinions. Toddlers need safe space to explore, small frequent meals, and patience as they test every boundary.",
    image: `${IMG}/children/toddler-1-2-years.png`,
    alt: "Illustration of a toddler taking first steps",
  },
  {
    slug: "preschool-3-5-years",
    category: "Age gallery",
    ageGroup: "3–5 years",
    caption: "Preschool child (3–5 years)",
    captionBn: "প্রি-স্কুল শিশু (৩–৫ বছর)",
    description:
      "Imagination blooms. Play is the work of this age — building, pretending and asking endless questions build language, focus and social skills.",
    image: `${IMG}/children/preschool-3-5-years.png`,
    alt: "Illustration of a preschool child playing with blocks",
  },
  {
    slug: "school-age-6-9-years",
    category: "Age gallery",
    ageGroup: "6–9 years",
    caption: "School-age child (6–9 years)",
    captionBn: "স্কুল-বয়সী শিশু (৬–৯ বছর)",
    description:
      "Reading, friendships and responsibility grow together. Regular sleep, breakfast, physical play and limits on screens support learning and mood.",
    image: `${IMG}/children/school-age-6-9-years.png`,
    alt: "Illustration of a school-age child reading a book happily",
  },
  {
    slug: "older-child-10-12-years",
    category: "Age gallery",
    ageGroup: "10–12 years",
    caption: "Older child (10–12 years)",
    captionBn: "কিশোর প্রাক্ শিশু (১০–১২ বছর)",
    description:
      "Independence rises and puberty begins for many. Open conversations about body changes, hygiene and emotions matter now more than lectures.",
    image: `${IMG}/children/older-child-10-12-years.png`,
    alt: "Illustration of an older child riding a bicycle",
  },
  {
    slug: "adolescent-13-17-years",
    category: "Age gallery",
    ageGroup: "13–17 years",
    caption: "Adolescent (13–17 years)",
    captionBn: "কিশোর/কিশোরী (১৩–১৭ বছর)",
    description:
      "Rapid growth, identity and peer influence. Adolescents need nutritious food, real sleep, respectful adults and honest health education — not fear tactics.",
    image: `${IMG}/children/adolescent-13-17-years.png`,
    alt: "Illustration of a confident adolescent with a backpack",
  },
  {
    slug: "pediatric-doctor-exam",
    category: "Care moments",
    caption: "A pediatric consultation",
    captionBn: "শিশু ডাক্তারের পরামর্শ",
    description:
      "Growth checks, feeding questions and vaccinations are regular reasons to visit a pediatrician. Bringing a written list of questions helps the visit cover everything.",
    image: `${IMG}/children/pediatric-doctor-exam.png`,
    alt: "Illustration of a pediatric doctor examining a young child with a stethoscope",
    related: { view: "symptom", slug: "fever" },
  },
  {
    slug: "child-vaccination",
    category: "Care moments",
    caption: "Vaccination day",
    captionBn: "টিকা দেওয়ার দিন",
    description:
      "Vaccines are among the safest and most effective protections a child can get. Bangladesh's EPI schedule is free at community clinics and health centres.",
    image: `${IMG}/children/child-vaccination.png`,
    alt: "Illustration of a nurse giving a vaccine to a child held by a parent",
    related: { view: "article", slug: "childhood-vaccination-basics" },
  },
  {
    slug: "child-growth-monitoring",
    category: "Care moments",
    caption: "Growth monitoring",
    captionBn: "শিশুর বৃদ্ধি পরিমাপ",
    description:
      "Regular weighing and height checks on growth charts catch undernutrition early — long before it becomes visible. A steady upward line is the goal.",
    image: `${IMG}/children/child-growth-monitoring.png`,
    alt: "Illustration of a health worker measuring a child's height",
  },
  {
    slug: "mother-newborn-care",
    category: "Care moments",
    caption: "Caring for a newborn",
    captionBn: "নবজাতকের যত্ন",
    description:
      "Warmth, exclusive breastfeeding, cord care and immunisation visits form the newborn's first shield. Mothers need rest, nutrition and family support too.",
    image: `${IMG}/children/mother-newborn-care.png`,
    alt: "Illustration of a mother tenderly caring for her newborn",
    related: { view: "article", slug: "antenatal-checkups-explained" },
  },
  {
    slug: "father-child-care",
    category: "Care moments",
    caption: "Fathers care too",
    captionBn: "বাবার যত্ন",
    description:
      "Fathers who feed, carry, play and take children to clinics raise healthier, more confident children — and share the load fairly.",
    image: `${IMG}/children/father-child-care.png`,
    alt: "Illustration of a father holding and caring for his young child",
  },
  {
    slug: "family-pediatric-visit",
    category: "Care moments",
    caption: "Visiting the clinic together",
    captionBn: "একসাথে ক্লিনিকে যাওয়া",
    description:
      "Bringing both parents or a grandparent to appointments means everyone hears the same advice — and follows it more consistently.",
    image: `${IMG}/children/family-pediatric-visit.png`,
    alt: "Illustration of parents visiting a pediatric clinic with their child",
  },
  {
    slug: "pediatric-hospital-env",
    category: "Care moments",
    caption: "A child-friendly hospital",
    captionBn: "শিশুবান্ধব হাসপাতাল",
    description:
      "Colour, play space and kind communication reduce children's fear of hospitals. Good paediatric care treats the child, not just the illness.",
    image: `${IMG}/children/pediatric-hospital-env.png`,
    alt: "Illustration of a bright, friendly pediatric hospital room",
  },
];

/** Family, community and accessible-care gallery. */
export const FAMILY_GALLERY: GalleryItem[] = [
  {
    slug: "nuclear-family",
    category: "Family health",
    caption: "A healthy family at home",
    captionBn: "সুস্থ পরিবার",
    description:
      "Shared meals, evening walks and open conversation protect a family's health more than any single medicine.",
    image: `${IMG}/family/nuclear-family.png`,
    alt: "Illustration of a happy Bangladeshi nuclear family at home",
    related: { view: "article", slug: "balanced-diet-basics" },
  },
  {
    slug: "joint-family",
    category: "Family health",
    caption: "The joint family",
    captionBn: "সংযুক্ত পরিবার",
    description:
      "Grandparents, parents and children under one roof share care — and health habits pass between generations in both directions.",
    image: `${IMG}/family/joint-family.png`,
    alt: "Illustration of a Bangladeshi joint family with grandparents and children",
  },
  {
    slug: "family-doctor-visit",
    category: "Family health",
    caption: "The family doctor visit",
    captionBn: "পারিবারিক ডাক্তার দেখানো",
    description:
      "One trusted doctor who knows the family's history catches patterns — allergies, blood pressure, diabetes — earlier than scattered emergency visits.",
    image: `${IMG}/family/family-doctor-visit.png`,
    alt: "Illustration of parents and children visiting a doctor together",
  },
  {
    slug: "grandparents-care",
    category: "Family health",
    caption: "Caring for grandparents",
    captionBn: "দাদা-দাদির যত্ন",
    description:
      "Regular medicine reviews, blood pressure checks and fall-proofing the home help elders stay independent longer.",
    image: `${IMG}/family/grandparents-care.png`,
    alt: "Illustration of grandparents receiving warm healthcare support from family",
    related: { view: "article", slug: "fall-prevention-at-home" },
  },
  {
    slug: "family-booking-phone",
    category: "Family health",
    caption: "Booking care together",
    captionBn: "একসাথে অ্যাপয়েন্টমেন্ট নেওয়া",
    description:
      "When one family member books for everyone, checkups actually happen — especially for parents and in-laws who postpone their own health.",
    image: `${IMG}/family/family-booking-phone.png`,
    alt: "Illustration of a family booking a doctor appointment on a smartphone",
  },
  {
    slug: "family-hospital-consultation",
    category: "Family health",
    caption: "At the consultation",
    captionBn: "ডাক্তারের পরামর্শে",
    description:
      "Notes, questions and a second pair of ears — bringing someone along to a consultation improves understanding and follow-through.",
    image: `${IMG}/family/family-hospital-consultation.png`,
    alt: "Illustration of a family attending a hospital consultation",
  },
  {
    slug: "rural-health-center",
    category: "Community health",
    caption: "The community clinic",
    captionBn: "কমিউনিটি ক্লিনিক",
    description:
      "Bangladesh's community clinics and union health centres bring free primary care, vaccines and maternal services within walking distance of villages.",
    image: `${IMG}/family/rural-health-center.png`,
    alt: "Illustration of a rural healthcare centre in a Bangladeshi village",
  },
  {
    slug: "doctor-rural-visit",
    category: "Community health",
    caption: "Doctors in the community",
    captionBn: "গ্রামে ডাক্তারের পরিদর্শন",
    description:
      "Outreach visits catch pregnancy risks, child malnutrition and chronic disease early — before they become emergencies.",
    image: `${IMG}/family/doctor-rural-visit.png`,
    alt: "Illustration of a doctor visiting a rural community",
  },
  {
    slug: "community-awareness",
    category: "Community health",
    caption: "Health awareness sessions",
    captionBn: "স্বাস্থ্য সচেতনতা সেশন",
    description:
      "Courtyard meetings on hygiene, nutrition and dengue prevention turn health knowledge into neighbourhood habits.",
    image: `${IMG}/family/community-awareness.png`,
    alt: "Illustration of a community health awareness session in a village courtyard",
  },
  {
    slug: "health-camp",
    category: "Community health",
    caption: "Health camps",
    captionBn: "স্বাস্থ্য শিবির",
    description:
      "Day camps with free checkups, diabetes and blood-pressure screening bring hospital-level attention to underserved areas.",
    image: `${IMG}/family/health-camp.png`,
    alt: "Illustration of medical professionals conducting a community health camp",
  },
  {
    slug: "mobile-medical-service",
    category: "Community health",
    caption: "Mobile medical services",
    captionBn: "মোবাইল মেডিকেল সার্ভিস",
    description:
      "Vans and boats carrying doctors and medicine reach chars, haor areas and remote hills where fixed clinics are far away.",
    image: `${IMG}/family/mobile-medical-service.png`,
    alt: "Illustration of a mobile medical service van in a village",
  },
  {
    slug: "village-health-education",
    category: "Community health",
    caption: "Learning together",
    captionBn: "একসাথে শেখা",
    description:
      "When mothers' groups learn together about feeding, fevers and danger signs, whole villages get healthier.",
    image: `${IMG}/family/village-health-education.png`,
    alt: "Illustration of a healthcare education session in a village",
  },
  {
    slug: "respectful-care",
    category: "Accessible care",
    caption: "Care with dignity",
    captionBn: "সম্মানজনক চিকিৎসা",
    description:
      "Good care listens before prescribing. Every patient — regardless of income — deserves explanation, privacy and respect.",
    image: `${IMG}/family/respectful-care.png`,
    alt: "Illustration of a patient receiving respectful, dignified medical care",
  },
  {
    slug: "rural-maternal-care",
    category: "Accessible care",
    caption: "Maternal care for every mother",
    captionBn: "প্রতিটি মায়ের প্রসূতি সেবা",
    description:
      "Antenatal checkups, safe delivery planning and postnatal visits protect two lives at once — wherever the mother lives.",
    image: `${IMG}/family/rural-maternal-care.png`,
    alt: "Illustration of a rural mother receiving maternal healthcare from a female doctor",
    related: { view: "article", slug: "antenatal-checkups-explained" },
  },
  {
    slug: "elderly-assistance",
    category: "Accessible care",
    caption: "Supporting elderly patients",
    captionBn: "প্রবীণ রোগীর পাশে",
    description:
      "A steady arm, clear instructions in Bangla and patience with repeated questions make care work for elderly patients.",
    image: `${IMG}/family/elderly-assistance.png`,
    alt: "Illustration of an elderly patient being kindly assisted at a clinic",
  },
  {
    slug: "community-clinic-exam",
    category: "Accessible care",
    caption: "At the community clinic",
    captionBn: "কমিউনিটি ক্লিনিকে",
    description:
      "Most everyday illness — fever, cough, stomach trouble, blood pressure — can be assessed close to home and referred when needed.",
    image: `${IMG}/family/community-clinic-exam.png`,
    alt: "Illustration of a doctor examining a patient at a community clinic",
  },
  {
    slug: "affordable-diagnostics",
    category: "Accessible care",
    caption: "Affordable diagnostics",
    captionBn: "সাশ্রয়ী ডায়াগনস্টিক সেবা",
    description:
      "Fair-priced, quality-checked lab tests and scans make diagnosis possible for every family — not a luxury.",
    image: `${IMG}/family/affordable-diagnostics.png`,
    alt: "Illustration of a patient receiving affordable diagnostic services",
  },
  {
    slug: "health-volunteers",
    category: "Accessible care",
    caption: "Health volunteers",
    captionBn: "স্বাস্থ্য স্বেচ্ছাসেবক",
    description:
      "From promoting immunisation to accompanying neighbours to hospital, volunteers are the connective tissue of community health.",
    image: `${IMG}/family/health-volunteers.png`,
    alt: "Illustration of healthcare volunteers supporting a community",
  },
];
