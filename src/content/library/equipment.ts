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
    category: "Monitoring and Basic Equipment",
    image: "/images/library/equipment/blood-pressure-monitor.png",
    howItWorks:
      "An automated cuff inflates, then slowly deflates while sensors detect the vibrations of blood flowing back through the artery — the device calculates systolic and diastolic pressure from those signals.",
    whoOperates: "Anyone can use a home monitor after reading the instructions; clinics use professional-grade versions.",
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
  {
    slug: "glucometer",
    name: "Glucometer",
    nameBn: "রক্তে শর্করা মাপার যন্ত্র",
    category: "Monitoring and Basic Equipment",
    image: "/images/library/equipment/glucometer.png",
    howItWorks:
      "A tiny drop of blood is placed on a test strip; the strip's enzyme reacts with glucose and produces a small electrical current the meter converts into a reading.",
    whoOperates: "Patients and carers after basic training from a nurse or diabetes educator.",
    summary:
      "A small device that measures blood glucose from a tiny finger-prick drop of blood. It helps people with diabetes track their levels — readings guide decisions made together with a doctor.",
    whatItIs:
      "A glucometer is a pocket-sized electronic device that estimates the glucose (sugar) level in a small drop of blood, usually taken from a fingertip with a single-use lancet. A test strip absorbs the drop and the meter displays a number within seconds, typically in mmol/L or mg/dL.",
    whatItMeasures:
      "The approximate glucose concentration in the blood at the moment of testing — a 'snapshot', not an average. (HbA1c, a laboratory test, reflects the average over about three months.) Glucose changes naturally through the day with food, activity, stress and medicines.",
    commonUses: [
      "Checking glucose levels as part of diabetes self-management agreed with a doctor",
      "Understanding how meals, activity or timing affect your levels",
      "Checking glucose when symptoms of low or high sugar occur",
      "Recording readings to share at medical follow-ups",
    ],
    safeUse: [
      "Wash and dry hands before testing — food residue on fingers can distort readings.",
      "Use a new, unexpired test strip for every reading; match strip code to the meter if required.",
      "Never share lancets or meters used on multiple people; dispose of lancets safely in a hard container.",
      "Store strips in their closed container, away from heat and humidity — damaged strips give wrong numbers.",
      "Note whether your meter reads mmol/L or mg/dL, and which one your doctor uses.",
    ],
    limitations: [
      "Single readings never diagnose diabetes — diagnosis requires proper laboratory testing.",
      "Meters have a small margin of error even when used perfectly.",
      "Readings can be misleading with wet fingers, expired strips, or very low/high readings outside the meter's range.",
      "A home reading cannot replace the pattern review a doctor does with HbA1c and other tests.",
    ],
    whenProfessionalHelp: [
      "Very high readings, or readings with vomiting, deep breathing, confusion or drowsiness — urgent care (possible emergency).",
      "Low readings that do not improve after taking sugar, or repeated low readings — contact your doctor the same day.",
      "Readings consistently outside the target range your doctor set — arrange a review rather than changing medicines yourself.",
    ],
    icon: "Droplets",
    author: CONTENT_AUTHOR,
    medicalReviewer: null,
    status: "PUBLISHED",
    publishedAt: "2026-11-20",
    updatedAt: "2026-11-20",
    reviewedAt: null,
    sources: [
      {
        title: "Diabetes — fact sheet",
        publisher: "World Health Organization",
        url: "https://www.who.int/news-room/fact-sheets/detail/diabetes",
      },
      {
        title: "Blood glucose monitoring devices",
        publisher: "US Food and Drug Administration",
        url: "https://www.fda.gov/medical-devices/home-use-devices/blood-glucose-meters",
      },
    ],
  },
  {
    slug: "thermometer",
    name: "Thermometer",
    nameBn: "থার্মোমিটার",
    category: "Monitoring and Basic Equipment",
    image: "/images/library/equipment/thermometer.png",
    howItWorks:
      "An electronic sensor at the probe tip measures body heat and displays a stable temperature reading within seconds.",
    whoOperates: "Anyone — follow the device instructions for under-arm, oral or forehead use.",
    summary:
      "A thermometer measures body temperature. Digital thermometers are the safe household standard today — accurate technique matters more than the exact device type.",
    whatItIs:
      "A thermometer measures body temperature. Digital electronic thermometers (used under the tongue, in the armpit, or rectally for infants) have replaced older mercury thermometers, which should never be used at home because broken mercury is toxic. Non-contact infrared forehead thermometers are also common.",
    whatItMeasures:
      "Body temperature, usually reported in degrees Celsius (°C). Normal body temperature averages around 37°C but varies slightly by person, time of day and measurement site. Fever is generally defined as 38°C or above. Armpit readings run slightly lower than oral readings, and forehead strips are the least reliable method.",
    commonUses: [
      "Checking for fever during illness",
      "Monitoring a fever's course at home",
      "Checking an infant's or child's temperature during illness",
      "Confirming that a fever has settled after treatment or time",
    ],
    safeUse: [
      "Follow the device manual for placement and timing; digital thermometers beep when done.",
      "Clean the probe with soap and water or an alcohol wipe before and after use; do not share without cleaning.",
      "For infants under 3 months, any fever (38°C or above) means going to a hospital — the reading only confirms urgency.",
      "Do not take an oral reading right after hot or cold drinks; wait about 15 minutes.",
      "Keep spare batteries; replace them if readings become erratic.",
    ],
    limitations: [
      "Armpit and forehead measurements are less accurate than oral or rectal readings.",
      "A single normal reading during obvious illness does not rule out fever — recheck if the person feels hot.",
      "Normal temperature does not rule out serious illness, especially in infants and older adults, who can be seriously ill without fever.",
    ],
    whenProfessionalHelp: [
      "Infant under 3 months with 38°C or above — hospital immediately.",
      "Fever with any red-flag signs (confusion, breathing difficulty, rash that does not fade under pressure, seizure) — emergency (999).",
      "Fever lasting more than 3 days, or returning again and again — see a doctor.",
    ],
    icon: "Thermometer",
    author: CONTENT_AUTHOR,
    medicalReviewer: null,
    status: "PUBLISHED",
    publishedAt: "2026-11-20",
    updatedAt: "2026-11-20",
    reviewedAt: null,
    sources: [
      {
        title: "Fever in adults",
        publisher: "Mayo Clinic",
        url: "https://www.mayoclinic.org/diseases-conditions/fever/symptoms-causes/syc-20352723",
      },
      {
        title: "Mercury in health care — policy brief",
        publisher: "World Health Organization",
        url: "https://www.who.int/publications/i/item/9789241508336",
      },
    ],
  },
  {
    slug: "pulse-oximeter",
    name: "Pulse Oximeter",
    nameBn: "পালস অক্সিমিটার",
    category: "Monitoring and Basic Equipment",
    image: "/images/library/equipment/pulse-oximeter.png",
    howItWorks:
      "Two wavelengths of light pass through the fingertip; oxygen-carrying blood absorbs them differently, letting the device estimate oxygen saturation and pulse rate.",
    whoOperates: "Patients and carers can use it; readings are interpreted with clinical advice.",
    summary:
      "A clip-on device that estimates blood oxygen and pulse rate. Useful for monitoring breathing conditions — but it has real limits, and a normal reading never overrides struggling to breathe.",
    whatItIs:
      "A pulse oximeter is a small clip — usually placed on a fingertip — that shines light through the skin to estimate the percentage of oxygen-carrying hemoglobin in the blood (SpO₂) along with the pulse rate. It is painless and gives a reading within seconds.",
    whatItMeasures:
      "An estimate of blood oxygen saturation (SpO₂, normally around 95-100% in healthy people at low altitude) and pulse rate. It does not measure how well you are breathing overall, carbon dioxide levels, or anything about the lungs directly.",
    commonUses: [
      "Monitoring oxygen levels in people with breathing conditions, as advised by a doctor",
      "Tracking readings during respiratory illness, to share with a doctor",
      "Checking pulse rate at rest",
    ],
    safeUse: [
      "Warm hands give more reliable readings; cold fingers, nail polish, henna, and movement can distort results.",
      "Sit still and rest the hand at heart level; wait for a stable, repeating number.",
      "Take multiple readings at consistent times and record them.",
      "Use it as one piece of information alongside how the person actually looks and feels.",
    ],
    limitations: [
      "Readings can be inaccurate with poor circulation, cold hands, skin pigmentation, nail decoration, or tremor.",
      "A 'good' number does not rule out serious illness — someone can have pneumonia or other problems with a normal early reading.",
      "It says nothing about the cause of breathing difficulty.",
    ],
    whenProfessionalHelp: [
      "Struggling to breathe, blue lips or face, confusion, or severe drowsiness — call 999 regardless of what the oximeter says.",
      "Persistent readings of 92% or below — seek medical assessment promptly.",
      "Readings that keep falling, or a person who looks unwell with borderline readings — do not wait.",
    ],
    icon: "Activity",
    author: CONTENT_AUTHOR,
    medicalReviewer: null,
    status: "PUBLISHED",
    publishedAt: "2026-11-20",
    updatedAt: "2026-11-20",
    reviewedAt: null,
    sources: [
      {
        title: "Pulse oximetry — patient education",
        publisher: "American Lung Association",
        url: "https://www.lung.org/lung-health-diseases/lung-procedures-and-tests/pulse-oximetry",
      },
      {
        title: "Clinical use of pulse oximetry — pocket guide",
        publisher: "World Health Organization",
        url: "https://www.who.int/publications/i/item/9789241548246",
      },
    ],
  },
  {
    slug: "ecg-machine",
    name: "ECG Machine",
    nameBn: "ইসিজি মেশিন",
    category: "Monitoring and Basic Equipment",
    image: "/images/library/equipment/ecg-machine.png",
    howItWorks:
      "Electrodes on the chest, arms and legs pick up the heart's tiny electrical signals; the machine prints them as the familiar waveform tracing.",
    whoOperates: "Trained technicians or nurses record the ECG; doctors interpret the tracing.",
    summary:
      "An electrocardiogram records the heart's electrical activity. It is a professional diagnostic test — this guide explains what it does and does not show.",
    whatItIs:
      "An ECG (electrocardiogram) machine records the tiny electrical signals that make the heart beat, through electrodes placed on the chest, arms and legs. The result is a printed or digital tracing that doctors read to assess heart rhythm and other cardiac information. ECGs are performed in hospitals, clinics and diagnostic centers by trained staff.",
    whatItMeasures:
      "The heart's electrical rhythm and rate at the moment of recording: how fast the heart beats, how regularly, and the electrical pattern of each heartbeat. A standard ECG records for only about 10 seconds — it is a snapshot in time.",
    commonUses: [
      "Investigating chest pain, palpitations, breathlessness or fainting",
      "Checking heart rhythm (for example in suspected atrial fibrillation)",
      "Routine checks before surgery and in people with known heart conditions",
      "Screening contexts such as pre-employment or sports checks, when requested",
    ],
    safeUse: [
      "ECGs are painless and safe; the electrodes only record — they deliver no electricity.",
      "Follow staff instructions: stay still, relax, and avoid talking during the recording.",
      "Tell the technician about implanted devices (pacemaker) or if you cannot remove jewelry.",
    ],
    limitations: [
      "A single normal ECG does not rule out all heart problems — many conditions come and go, and some do not show on a resting ECG at all.",
      "ECG interpretation requires medical training; home 'ECG' gadgets and smartwatch traces are not diagnostic ECGs.",
      "Doctors often combine ECG findings with symptoms, blood tests and other investigations.",
    ],
    whenProfessionalHelp: [
      "Chest discomfort with sweating, breathlessness or pain spreading to arm/jaw — call 999 first; do not travel to a diagnostic center yourself for an ECG.",
      "Palpitations with dizziness or fainting — seek prompt assessment.",
      "An ECG report should always be explained by a doctor — never self-interpret or self-medicate based on a report.",
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
        title: "Cardiovascular diseases — fact sheet",
        publisher: "World Health Organization",
        url: "https://www.who.int/news-room/fact-sheets/detail/cardiovascular-diseases-(cvds)",
      },
      {
        title: "Electrocardiogram (ECG or EKG)",
        publisher: "Mayo Clinic",
        url: "https://www.mayoclinic.org/tests-procedures/ekg/about/pac-20384917",
      },
    ],
  },
  {
    slug: "nebulizer",
    name: "Nebulizer",
    nameBn: "নেবুলাইজার",
    category: "Treatment and Life-Support Equipment",
    image: "/images/library/equipment/nebulizer.png",
    howItWorks:
      "A compressor pushes air through liquid medicine, turning it into a fine mist that is inhaled through a mask or mouthpiece deep into the airways.",
    whoOperates: "Patients and parents after instruction; the medicine and dosage are always prescribed by a doctor.",
    summary:
      "A machine that turns liquid medicine into a fine mist to inhale through a mask or mouthpiece. It is a delivery device for prescribed medicines — this guide explains safe general use.",
    whatItIs:
      "A nebulizer is a device that converts a liquid medicine into a fine mist, which the person inhales through a mask or mouthpiece over several minutes. It is often used for asthma and other breathing conditions, especially in young children or during acute breathing difficulty, and sometimes for inhalation therapies prescribed by doctors.",
    whatItMeasures:
      "It measures nothing — it delivers. The medicine used in it (which must be prescribed by a doctor) does the work; the nebulizer simply turns it into breathable mist that reaches the airways.",
    commonUses: [
      "Delivering prescribed inhaled medicine during asthma flare-ups",
      "Giving inhaled medicine to young children who cannot use inhalers with spacers effectively",
      "Delivering respiratory therapy as advised during acute breathing difficulty, while arranging medical assessment",
    ],
    safeUse: [
      "Use only medicines prescribed for nebulization for the specific person — never borrow another person's medicine.",
      "Keep the mask/mouthpiece clean; wash per the manual and let parts air-dry; replace as recommended.",
      "Sit upright and breathe normally through the mouth until the mist stops.",
      "Do not share masks or mouthpieces between people.",
    ],
    limitations: [
      "A nebulizer is not a treatment by itself — the medicine matters, and using the wrong medicine can be harmful.",
      "It is not a substitute for emergency care during severe breathing difficulty.",
      "Dirty or poorly maintained machines can spread infection.",
    ],
    whenProfessionalHelp: [
      "Breathing difficulty that is severe, worsening, or not relieved by the prescribed plan — emergency (999).",
      "Bluish lips or confusion — emergency (999).",
      "Needing nebulization more and more often — arrange a medical review the same day.",
      "A child who cannot speak, feed, or is drawing in the chest wall with each breath — emergency (999).",
    ],
    icon: "Wind",
    author: CONTENT_AUTHOR,
    medicalReviewer: null,
    status: "PUBLISHED",
    publishedAt: "2026-11-20",
    updatedAt: "2026-11-20",
    reviewedAt: null,
    sources: [
      {
        title: "Asthma — fact sheet",
        publisher: "World Health Organization",
        url: "https://www.who.int/news-room/fact-sheets/detail/asthma",
      },
      {
        title: "Nebulizer — how to use",
        publisher: "MedlinePlus (US National Library of Medicine)",
        url: "https://medlineplus.gov/ency/patientinstructions/000451.htm",
      },
    ],
  },
  {
    slug: "stethoscope",
    name: "Stethoscope",
    nameBn: "স্টেথোস্কোপ",
    category: "Monitoring and Basic Equipment",
    image: "/images/library/equipment/stethoscope.png",
    relatedSpecialties: ["Medicine & Diabetology", "Cardiology", "Pediatrics"],
    summary:
      "The stethoscope lets health professionals listen to the heart, lungs and other internal sounds. It is a professional assessment tool — here is what it is actually for.",
    whatItIs:
      "A stethoscope is the classic medical instrument that clinicians use to listen to sounds inside the body — the heart and lungs most commonly, but also blood flow in vessels and sounds in the abdomen. The sounds heard through it are interpreted alongside everything else the clinician observes.",
    whatItMeasures:
      "It does not measure numbers — it transmits internal body sounds to trained ears. A clinician uses these sounds (heart rhythm and murmurs, breath sounds and crackles, bowel sounds) as clinical information, always combined with history, examination and often tests.",
    commonUses: [
      "Examining the heart, lungs and abdomen during medical consultations",
      "Checking blood pressure manually together with a cuff",
      "Assessing breathing during illness and recovery",
    ],
    safeUse: [
      "For the public: stethoscopes are assessment tools for trained clinicians — buying one for self-diagnosis is not meaningful.",
      "For context: clinicians clean the diaphragm between patients to prevent spreading germs.",
    ],
    limitations: [
      "Many serious conditions produce normal-sounding examinations, and sounds alone almost never make a diagnosis.",
      "Televised 'instant diagnoses' from a stethoscope are dramatized — real assessment integrates many inputs.",
    ],
    whenProfessionalHelp: [
      "If you have symptoms that concern you — breathlessness, chest discomfort, palpitations — book a medical consultation rather than trying to self-assess.",
      "Emergency symptoms (crushing chest pain, severe breathlessness) — call 999.",
    ],
    icon: "Stethoscope",
    author: CONTENT_AUTHOR,
    medicalReviewer: null,
    status: "PUBLISHED",
    publishedAt: "2026-11-20",
    updatedAt: "2026-11-20",
    reviewedAt: null,
    sources: [
      {
        title: "The stethoscope — historical perspective",
        publisher: "American Heart Association",
        url: "https://www.heart.org/en/news",
      },
    ],
  },
  {
    slug: "weighing-scale",
    name: "Weighing Scale",
    nameBn: "ওজন মাপার যন্ত্র",
    category: "Monitoring and Basic Equipment",
    image: "/images/library/equipment/weighing-scale.png",
    howItWorks:
      "A digital load sensor converts the force of body weight into a number; growth tracking over time matters more than any single reading.",
    whoOperates: "Anyone — used at home, in clinics and in child-growth programmes.",
    summary:
      "A weighing scale measures body weight. Simple, useful for tracking trends over time — and best interpreted as part of the bigger health picture.",
    whatItIs:
      "A scale measures body weight. Modern digital scales show weight precisely; some also estimate body composition (body fat percentage, etc.) by sending a tiny harmless electrical signal through the body — those extra estimates are rough and not medical measurements.",
    whatItMeasures:
      "Total body weight. Combined with height, it can be used to calculate BMI (body mass index), a rough screening classification. Weight naturally fluctuates day to day by a kilogram or more due to fluids, food and salt.",
    commonUses: [
      "Tracking weight trends over weeks and months",
      "Monitoring growth in children (with growth charts interpreted by health workers)",
      "Following weight goals agreed with a doctor",
      "Detecting unintended weight loss or gain early",
    ],
    safeUse: [
      "Weigh at a consistent time of day (morning, after using the toilet, before breakfast) with similar clothing.",
      "Place the scale on a hard, flat floor — carpet distorts readings.",
      "Track the trend, not single readings.",
      "Use the same scale when possible; different scales read differently.",
    ],
    limitations: [
      "Weight alone says nothing about nutrition, muscle, or health status.",
      "BMI is a rough population screening tool — it does not apply well to athletes, pregnant women, children (who need growth charts) or older adults with muscle loss.",
      "Body-fat estimates on consumer scales are imprecise.",
    ],
    whenProfessionalHelp: [
      "Unintentional weight loss (for example, 5% of body weight over 6-12 months without trying) — see a doctor.",
      "Rapid weight gain with swollen ankles or breathlessness — seek assessment.",
      "In children, any concern about growth — have it checked with proper growth charts.",
    ],
    icon: "Scale",
    author: CONTENT_AUTHOR,
    medicalReviewer: null,
    status: "PUBLISHED",
    publishedAt: "2026-11-20",
    updatedAt: "2026-11-20",
    reviewedAt: null,
    sources: [
      {
        title: "A healthy lifestyle — key facts",
        publisher: "World Health Organization",
        url: "https://www.who.int/news-room/fact-sheets/detail/healthy-lifestyle",
      },
      {
        title: "Assessing your weight — BMI",
        publisher: "Mayo Clinic",
        url: "https://www.mayoclinic.org/diseases-conditions/obesity/in-depth/bmi-calculator/itt-20084938",
      },
    ],
  },
  {
    slug: "medical-imaging",
    name: "Medical Imaging (X-ray, Ultrasound, CT)",
    nameBn: "মেডিকেল ইমেজিং (এক্স-রে, আল্ট্রাসাউন্ড, সিটি)",
    category: "Diagnostic and Imaging Equipment",
    image: "/images/library/equipment/medical-imaging.png",
    relatedSpecialties: ["Radiology & Imaging", "Medicine & Diabetology"],
    summary:
      "X-rays, ultrasound and CT scans let doctors see inside the body in different ways. Ordered by clinicians for specific questions — here is what each one does in plain language.",
    whatItIs:
      "Medical imaging machines create pictures of the inside of the body: X-rays (radiation images of bones and some tissues), ultrasound (sound-wave images, live and radiation-free), and CT scans (detailed layered X-ray images). MRI uses magnetic fields; it is another common form of imaging. Each answers different clinical questions.",
    whatItMeasures:
      "Different machines show different things: X-rays excel at bones and the chest; ultrasound at soft organs, pregnancy and blood flow; CT at detailed cross-sections of the head, chest, abdomen and injuries. The images must be interpreted by radiologists and treating doctors.",
    commonUses: [
      "Chest X-rays for pneumonia or other lung problems",
      "X-rays for suspected fractures",
      "Ultrasound in pregnancy and for abdominal organs",
      "CT for head injuries, strokes and complex internal problems",
    ],
    safeUse: [
      "Imaging is ordered by clinicians for a reason — bring previous images and reports for comparison.",
      "Tell staff about pregnancy or possible pregnancy before X-ray or CT.",
      "Follow instructions (holding still, breathing holds, fasting for some scans).",
    ],
    limitations: [
      "Scans answer specific questions — a 'clear' scan does not mean nothing is wrong.",
      "CT involves a higher radiation dose than plain X-rays; doctors weigh benefit against risk when ordering.",
      "Many conditions are diagnosed without any imaging at all.",
      "Reports are interpreted in clinical context — never self-interpret or start treatment based on your own reading of a report.",
    ],
    whenProfessionalHelp: [
      "If a doctor advised imaging based on symptoms, complete it and review results with a doctor.",
      "Seek emergency care (999) first for major injuries, or sudden severe headache, chest pain or breathlessness — imaging comes after stabilization.",
    ],
    icon: "ScanLine",
    author: CONTENT_AUTHOR,
    medicalReviewer: null,
    status: "PUBLISHED",
    publishedAt: "2026-11-20",
    updatedAt: "2026-11-20",
    reviewedAt: null,
    sources: [
      {
        title: "Ionizing radiation, health effects and protective measures",
        publisher: "World Health Organization",
        url: "https://www.who.int/news-room/fact-sheets/detail/ionizing-radiation-health-effects-and-protective-measures",
      },
      {
        title: "Diagnostic imaging — overview",
        publisher: "Mayo Clinic",
        url: "https://www.mayoclinic.org/tests-procedures/ct-scan/about/pac-20393691",
      },
    ],
  },
];
