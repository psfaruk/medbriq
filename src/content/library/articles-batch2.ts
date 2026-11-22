import type { Article } from "../types";
import { CONTENT_AUTHOR } from "../types";

/**
 * Find Medi Doctor Health Library — articles, batch 2 (demo dataset).
 *
 * Same honesty rules as articles.ts: items are marked PUBLISHED so the demo
 * portal shows a working library, but medicalReviewer is deliberately null —
 * the standing UI label is "Medical review: pending". Before any real public
 * launch, a qualified medical professional must review each item and the
 * reviewer fields must be filled in honestly.
 */

export const ARTICLES_BATCH2: Article[] = [
  {
    slug: "menstrual-health-basics",
    title: "Menstrual Health Basics: Understanding Your Cycle",
    titleBn: "মাসিক স্বাস্থ্যের মূল কথা",
    summary:
      "A plain-language guide to normal cycles, hygiene during periods, managing mild cramps, and the signs that deserve a check-up. Periods are a normal part of health — nothing to hide.",
    category: "womens-health",
    keyPoints: [
      "A normal cycle lasts anywhere from 21 to 35 days, with bleeding for 2 to 7 days. Some variation from month to month is common and usually normal.",
      "Changing a clean pad or clean, dry cloth regularly and washing with plain water keeps the genital area healthy during periods.",
      "Mild cramps often ease with warmth, gentle movement and rest. A pharmacist can advise on simple pain relief if needed.",
      "A check-up is worthwhile if cycles are very irregular or stop, pain disrupts daily life, bleeding soaks a pad every hour, or bleeding occurs between periods.",
      "No girl should miss school because of her period — menstruation is normal health, and supplies and support should be normal too.",
    ],
    sections: [
      {
        heading: "What a normal cycle looks like",
        body:
          "A menstrual cycle is counted from the first day of one period to the first day of the next. For most adults this is somewhere between 21 and 35 days, and the bleeding itself usually lasts 2 to 7 days.\n\nIt is normal for a cycle to vary by a few days from month to month, especially in the first few years after periods begin. Stress, illness, weight change and travel can also shift the timing slightly. Cycles that are consistently very short, very long, or completely unpredictable are worth discussing with a doctor.",
      },
      {
        heading: "Hygiene during your period",
        body:
          "Whether you use disposable pads, reusable cloth or other products, the same principles apply:\n\n• Change the pad or cloth regularly — roughly every 4 to 6 hours, and more often when the flow is heavy\n• Wash the genital area with plain water; harsh internal soaps are unnecessary and can cause irritation\n• Wash reusable cloth with soap and water, and dry it fully in sunlight before reuse\n• Wash hands before and after changing\n\nBathing daily during a period is healthy, and helps with comfort and freshness.",
      },
      {
        heading: "Managing mild cramps",
        body:
          "Mild cramps in the lower belly or back are common in the first day or two of a period. Simple measures often help:\n\n• A hot water bottle or warm compress on the lower belly\n• A warm drink, and gentle movement such as a short walk\n• Rest and enough sleep\n\nIf cramps are troublesome, a pharmacist can advise on simple pain relief. Pain that regularly stops a girl from studying, working or sleeping is not something to simply endure — it deserves a proper check.",
      },
      {
        heading: "When a check-up may help",
        body:
          "A doctor's assessment may help if any of the following apply:\n\n• Periods have become very irregular, or have stopped for two to three months\n• Pain disrupts daily life despite basic care and simple pain relief\n• Bleeding is very heavy — soaking through a pad or cloth every hour for several hours\n• Bleeding happens between periods or after intimacy\n\nThese patterns have many possible causes, and most are treatable once the reason is found.",
      },
      {
        heading: "Periods are normal health",
        body:
          "Menstruation is a normal bodily function, not something impure or shameful. No girl should miss school, exams or daily life because of her period, a lack of supplies, or fear of teasing. Keeping affordable supplies ready at home, talking openly, and schools that support menstruating students all make a difference. If periods feel like a burden, that is a practical problem with practical solutions — starting with supplies, knowledge and a health system ready to help.",
      },
    ],
    whenToSeekHelp: [
      "If your cycle is very irregular, has stopped for two to three months, or your bleeding pattern has changed noticeably, a doctor's assessment can identify the reason.",
      "If period pain regularly stops you from studying, working or sleeping despite basic care, discuss it with a doctor.",
      "If you soak through a pad or cloth every hour for several hours, or bleed between periods, arrange a check-up.",
    ],
    author: CONTENT_AUTHOR,
    medicalReviewer: null,
    status: "PUBLISHED",
    publishedAt: "2026-11-20",
    updatedAt: "2026-11-20",
    reviewedAt: null,
    sources: [
      {
        title: "Periods",
        publisher: "National Health Service (UK)",
        url: "https://www.nhs.uk/conditions/periods/",
      },
      {
        title: "Period pain",
        publisher: "National Health Service (UK)",
        url: "https://www.nhs.uk/conditions/period-pain/",
      },
      {
        title: "Heavy periods",
        publisher: "National Health Service (UK)",
        url: "https://www.nhs.uk/conditions/heavy-periods/",
      },
    ],
    relatedSlugs: ["balanced-diet-basics", "understanding-cbc-report", "hand-hygiene-basics"],
    emergencyNote: null,
  },
  {
    slug: "routine-health-checks-for-men",
    title: "Routine Health Checks for Men: Why Prevention Matters",
    titleBn: "পুরুষের নিয়মিত স্বাস্থ্য পরীক্ষা: কেন ও কীভাবে",
    summary:
      "Many conditions that affect men — high blood pressure, diabetes, heart disease — develop silently. Here is what a basic check-up usually covers, and how to decide when to book one.",
    category: "mens-health",
    keyPoints: [
      "High blood pressure, high blood sugar and cholesterol problems often cause no symptoms until damage is done — which is exactly why check-ups exist.",
      "A basic check-up usually covers blood pressure, weight, and an honest conversation about diet, tobacco, alcohol, activity and sleep.",
      "There is no single right age to start screening — decide the timing and the tests with a doctor, based on your age, family history and habits.",
      "Mental health is health. A check-up is a good moment to mention stress, low mood or poor sleep.",
      "Make it easy: attach the check-up to another errand, and keep a simple record of your numbers.",
    ],
    sections: [
      {
        heading: "Why check-ups matter",
        body:
          "Many of the conditions that most affect men — high blood pressure, type 2 diabetes, heart disease — develop quietly. Blood pressure and blood sugar can be abnormal for years without causing any obvious symptom, and by the time symptoms appear, the condition may already be affecting the heart, kidneys or eyes.\n\nA check-up catches these problems while they are still easy to manage. It also builds a relationship with a doctor who knows your normal — which makes future problems easier to spot.",
      },
      {
        heading: "What a basic check-up usually covers",
        body:
          "A routine check does not need to be complicated:\n\n• Blood pressure measurement\n• Weight (and sometimes waist measurement)\n• Questions about eating, tobacco, alcohol, physical activity and sleep\n• A chance to raise anything you have noticed — a lingering symptom, a worry, a family history\n\nDepending on your age and risk factors, a doctor may also suggest simple blood or urine tests. The conversation matters as much as the measurements.",
      },
      {
        heading: "Deciding when to screen — with a doctor",
        body:
          "There is no universal timetable that fits every man. A sensible approach is to discuss with a doctor what to check and how often, based on:\n\n• Your age\n• Family history — diabetes, heart disease, stroke or cancer in close relatives\n• Your habits — tobacco, alcohol, diet, activity\n• Any existing conditions or medicines\n\nIf you are healthy and young, this conversation may happen only once every year or two. If risk factors are present, the doctor may recommend specific tests earlier or more often.",
      },
      {
        heading: "Mental health counts too",
        body:
          "Stress, low mood, irritability, poor sleep and heavy alcohol use are common and treatable — but rarely raised. A check-up is a natural, private moment to mention them. Asking for help with mental health is not weakness; it is the same practical step as checking blood pressure. If it has been hard to cope for more than a couple of weeks, say so.",
      },
      {
        heading: "Making it easy",
        body:
          "Check-ups get skipped mostly because they are inconvenient, not because they are difficult:\n\n• Combine the visit with another errand in the same area\n• Keep a simple note — on paper or your phone — of the date, your blood pressure, weight and any test results\n• Carry a list of any medicines you take\n\nA short review once a year is a small investment against problems that take far longer to treat.",
      },
    ],
    whenToSeekHelp: [
      "If new symptoms appear between check-ups — chest discomfort, breathlessness, unexplained weight change, or persistent fatigue — arrange a doctor's visit rather than waiting.",
      "If low mood, stress or sleep problems persist beyond two weeks, mention them to a doctor; effective support exists.",
    ],
    author: CONTENT_AUTHOR,
    medicalReviewer: null,
    status: "PUBLISHED",
    publishedAt: "2026-11-20",
    updatedAt: "2026-11-20",
    reviewedAt: null,
    sources: [
      {
        title: "NHS Health Check",
        publisher: "National Health Service (UK)",
        url: "https://www.nhs.uk/conditions/nhs-health-check/",
      },
      {
        title: "Noncommunicable diseases",
        publisher: "World Health Organization",
        url: "https://www.who.int/news-room/fact-sheets/detail/noncommunicable-diseases",
      },
      {
        title: "Mental disorders",
        publisher: "World Health Organization",
        url: "https://www.who.int/news-room/fact-sheets/detail/mental-disorders",
      },
    ],
    relatedSlugs: ["blood-pressure-screening", "diabetes-screening-basics", "understanding-high-blood-pressure"],
    emergencyNote: null,
  },
  {
    slug: "fall-prevention-at-home",
    title: "Fall Prevention at Home: A Practical Guide for Older Adults",
    titleBn: "বাড়িতে পতন প্রতিরোধ: প্রবীণদের জন্য ব্যবহারিক নির্দেশনা",
    summary:
      "Falls are a leading cause of injury in older adults — but most of them can be prevented with simple changes at home, the right footwear, and a few healthy habits.",
    category: "elderly-care",
    keyPoints: [
      "Falls in older adults often cause fractures and a lasting fear of falling — but most falls are preventable.",
      "The main home hazards are poor lighting, loose rugs, slippery floors, cluttered walkways and unstable furniture.",
      "Effective changes include night lights, grab rails near the toilet and bath, non-slip mats, stair handrails, and keeping everyday items within easy reach.",
      "Well-fitting non-slip footwear, regular vision checks and staying active all protect balance.",
      "If a medicine causes dizziness, ask a doctor to review it — never stop or change doses on your own.",
    ],
    sections: [
      {
        heading: "Why falls matter",
        body:
          "For older adults, a fall is not just a bruise. Falls are among the leading causes of injury in people over 60, commonly breaking the hip, wrist or upper arm — and recovery is slower when bones and muscles are already weaker.\n\nFalls also damage confidence. Many older people cut back on walking and daily activity after a fall, which weakens muscles further and quietly raises the risk of the next fall. The good news is that most falls can be prevented.",
      },
      {
        heading: "Common hazards at home",
        body:
          "Most falls happen at home, in familiar rooms. Look for:\n\n• Poor lighting, especially on stairs and the route to the toilet at night\n• Loose rugs or mats that slide\n• Wet or slippery bathroom and kitchen floors\n• Cluttered walkways, trailing wires, clothes left on the floor\n• Unstable furniture that gets leaned on for support\n\nA family member walking through the house with fresh eyes often spots risks that have become invisible.",
      },
      {
        heading: "Changes that work",
        body:
          "Small, inexpensive changes prevent a large share of falls:\n\n• A night light or a torch kept by the bed, and a lit path to the toilet\n• Grab rails near the toilet and in the bath or shower area\n• A non-slip mat inside the bath or shower\n• A secure handrail on stairs\n• Everyday items — glasses, water, medicines, phone — kept within easy reach so there is less climbing and stretching",
      },
      {
        heading: "Footwear, eyesight and staying active",
        body:
          "Footwear matters more than most families realise:\n\n• Wear well-fitting, flat shoes with non-slip soles; loose backless slippers are a common cause of falls\n• Avoid walking in socks on smooth floors\n\nVision changes quietly with age, so regular eye checks matter. And staying active — daily walking, gentle strength and balance exercises — keeps legs steady. Rest may feel safer after a fall, but activity, not rest, is what preserves independence.",
      },
      {
        heading: "Medicines that cause dizziness",
        body:
          "Some medicines — including certain blood pressure treatments, sleep aids and nerve medicines — can cause dizziness or light-headedness on standing. This is a common and often fixable fall risk.\n\nIf a medicine makes you dizzy or drowsy, do not stop it yourself; ask the doctor to review it. And tell the doctor about every fall, even one without injury — it is useful information, not an embarrassment.",
      },
    ],
    whenToSeekHelp: [
      "If you have fallen more than once, or feel unsteady during ordinary daily activity, ask a doctor to review your balance, vision and medicines.",
      "Any fall with a head injury, severe pain, heavy bleeding or inability to get up needs medical attention promptly.",
      "If a medicine causes dizziness, ask for a review rather than stopping it yourself.",
    ],
    author: CONTENT_AUTHOR,
    medicalReviewer: null,
    status: "PUBLISHED",
    publishedAt: "2026-11-20",
    updatedAt: "2026-11-20",
    reviewedAt: null,
    sources: [
      {
        title: "Falls",
        publisher: "World Health Organization",
        url: "https://www.who.int/news-room/fact-sheets/detail/falls",
      },
      {
        title: "Older Adult Falls",
        publisher: "US Centers for Disease Control and Prevention",
        url: "https://www.cdc.gov/falls/index.html",
      },
    ],
    relatedSlugs: ["managing-medications-safely", "physical-activity-guidelines"],
    emergencyNote: null,
  },
  {
    slug: "managing-medications-safely",
    title: "Managing Medicines Safely: A Guide for Older Adults and Families",
    titleBn: "ঔষধ নিরাপদে ব্যবহারের নির্দেশনা: প্রবীণদের ও পরিবারের জন্য",
    summary:
      "Taking several medicines each day is part of life for many older adults. A few simple habits prevent the common mistakes — doubled doses, leftover medicines and dangerous sharing.",
    category: "elderly-care",
    keyPoints: [
      "The most common medicine problems are doubling a forgotten dose, taking leftovers from an old illness, and sharing medicines — which should never happen.",
      "Keep one up-to-date list of every medicine, supplement and herbal product, and show it at every doctor's visit.",
      "Use a single pill organizer and fixed times linked to daily habits, and read the label each time.",
      "Store medicines according to their instructions — some need the refrigerator, all need to be away from children.",
      "If a dose is missed, ask a pharmacist or doctor what to do — never simply double the next dose.",
    ],
    sections: [
      {
        heading: "Why safe habits matter with age",
        body:
          "Many older adults take medicines for blood pressure, diabetes, joint pain or heart conditions — often several at once, prescribed at different times by different doctors. Every added medicine raises the chance of a mix-up.\n\nMistakes are usually ordinary: a forgotten dose taken late along with the next one, two similar strips confused in the drawer, or an old medicine resumed without advice. Simple habits prevent nearly all of these.",
      },
      {
        heading: "Risks to avoid",
        body:
          "• Never share your medicines with anyone else — not even family with 'the same' problem. Age, weight, kidney function and other medicines change what is safe.\n• Do not keep using leftovers from a previous illness, and do not restart a stopped medicine without advice.\n• Never start or stop a prescribed medicine on your own, even if you feel better.\n• Tell the doctor about every supplement, herbal or homeopathic product you take — these can interact with medicines too.",
      },
      {
        heading: "A simple system that works",
        body:
          "One list, one box, one routine:\n\n• Keep an up-to-date written list: medicine name, strength, what it is for, and when to take it. A photo of it on your phone helps at every visit.\n• Use one weekly pill organizer rather than many strips — filled on the same day each week.\n• Link doses to fixed daily habits — for example 'after breakfast' and 'after the evening meal' — rather than to clock times that shift.\n• Read the label every single time, and check expiry dates now and then.\n• If memory is a concern, one family member can help fill and check the box.",
      },
      {
        heading: "Storing and reviewing",
        body:
          "Store medicines as the label instructs: most need a cool, dry place away from sunlight, and a few need refrigeration. Keep all of them out of children's reach, and throw away expired medicines rather than keeping them 'just in case'.\n\nAt every doctor's visit, bring the full list — or better, the actual packets — including supplements and herbal products. A review takes minutes and regularly finds a duplicate, an unnecessary medicine, or a safer timing.",
      },
      {
        heading: "If a dose is missed",
        body:
          "The safe response depends on the medicine and the timing, so the right answer is to ask the pharmacist or doctor — not to double the next dose. As a general habit, continuing with the next scheduled dose normally is safer than making up a missed one, but each medicine differs.\n\nWhen in doubt, ask. Answering exactly this kind of question is the pharmacist's job.",
      },
    ],
    whenToSeekHelp: [
      "If you suspect a double dose or the wrong medicine has been taken, contact a doctor or pharmacist straight away rather than waiting to see what happens.",
      "If any medicine causes new dizziness, rash, swelling or confusion, seek advice before taking the next dose.",
      "Bring all your medicines — including supplements and herbal products — to your doctor for review at every visit.",
    ],
    author: CONTENT_AUTHOR,
    medicalReviewer: null,
    status: "PUBLISHED",
    publishedAt: "2026-11-20",
    updatedAt: "2026-11-20",
    reviewedAt: null,
    sources: [
      {
        title: "Medication Without Harm",
        publisher: "World Health Organization",
        url: "https://www.who.int/initiatives/medication-without-harm",
      },
      {
        title: "Patient safety",
        publisher: "World Health Organization",
        url: "https://www.who.int/news-room/fact-sheets/detail/patient-safety",
      },
    ],
    relatedSlugs: ["fall-prevention-at-home", "understanding-high-blood-pressure"],
    emergencyNote: null,
  },
  {
    slug: "blood-pressure-screening",
    title: "Blood Pressure Screening: A Simple Check That Protects You",
    titleBn: "রক্তচাপ পরীক্ষা: সহজ এক ধাপে দেহের সুরক্ষা",
    summary:
      "High blood pressure usually causes no symptoms at all — the only way to know your numbers is to have them measured. Here is what screening involves and how often it makes sense.",
    category: "preventive-health",
    keyPoints: [
      "High blood pressure typically has no symptoms until complications develop — measurement is the only way to detect it.",
      "Around 120/80 mmHg is typical for a healthy adult; hypertension is confirmed over multiple readings, never one.",
      "If you are healthy, checking at least every one to two years is a sensible baseline — more often with risk factors.",
      "Salt, excess weight, tobacco, inactivity and family history all raise blood pressure — and most are modifiable.",
      "Home monitors make regular checking easy — see our equipment guide for choosing and using one correctly.",
    ],
    sections: [
      {
        heading: "Why screening matters",
        body:
          "High blood pressure is often called the 'silent' condition — and the name is accurate. It usually causes no symptoms whatsoever, even while it quietly strains the heart, kidneys, brain and eyes over the years. Many people first learn their pressure is high only after a complication, which is precisely what screening is designed to prevent.\n\nThe measurement itself is simple, quick and inexpensive: a cuff on the upper arm, available at most clinics and pharmacies. Caught early, high blood pressure is very manageable — with everyday habit changes and, when needed, medicines a doctor prescribes.",
      },
      {
        heading: "What the numbers mean",
        body:
          "A reading is written as two numbers, for example 120/80 mmHg. The first (systolic) is the pressure while the heart beats; the second (diastolic) is the pressure while it rests between beats. Around 120/80 is typical for a healthy adult.\n\nOne high reading does not mean hypertension. Stress, rushing, caffeine, a full bladder, pain or even the worry of being measured can push numbers up temporarily. Doctors generally confirm high blood pressure over multiple readings on different occasions before making a diagnosis.",
      },
      {
        heading: "How often to check, and where",
        body:
          "There is no single rule, but a sensible pattern is:\n\n• Discuss a screening plan with your doctor\n• If you are healthy, at least every one to two years\n• More often — or as advised — if you have risk factors, previous raised readings, or you take blood pressure medicines\n\nChecks can be done at a clinic or pharmacy, and increasingly at home with an automatic monitor. If you plan to check at home, see our equipment guide on choosing an appropriate monitor and using it correctly; home readings then become useful information for your doctor.",
      },
      {
        heading: "What raises blood pressure",
        body:
          "Several factors push blood pressure up, and most can be improved:\n\n• Eating too much salt\n• Carrying extra weight\n• Tobacco use\n• Physical inactivity\n• Too much alcohol\n• A family history of high blood pressure\n• Increasing age\n\nThe same list, read in reverse, is a prevention plan. Even small reductions in salt and weight, plus regular walking, measurably lower risk.",
      },
    ],
    whenToSeekHelp: [
      "If several readings on different days are raised, arrange a doctor's visit — hypertension is diagnosed by a doctor over time, not from one measurement.",
      "If a reading comes with severe headache, chest pain, breathlessness, vision change or weakness, seek emergency care rather than waiting.",
      "If you already take blood pressure medicines, ask your doctor how often to recheck — and never adjust doses on your own.",
    ],
    author: CONTENT_AUTHOR,
    medicalReviewer: null,
    status: "PUBLISHED",
    publishedAt: "2026-11-20",
    updatedAt: "2026-11-20",
    reviewedAt: null,
    sources: [
      {
        title: "Hypertension",
        publisher: "World Health Organization",
        url: "https://www.who.int/news-room/fact-sheets/detail/hypertension",
      },
      {
        title: "High Blood Pressure",
        publisher: "American Heart Association",
        url: "https://www.heart.org/en/health-topics/high-blood-pressure",
      },
    ],
    relatedSlugs: ["understanding-high-blood-pressure", "routine-health-checks-for-men", "balanced-diet-basics"],
    emergencyNote: null,
  },
  {
    slug: "diabetes-screening-basics",
    title: "Diabetes Screening: Why and When to Get Checked",
    titleBn: "ডায়াবেটিস পরীক্ষা: কেন ও কখন করানো উচিত",
    summary:
      "Type 2 diabetes often develops silently, with no symptoms for years. A simple blood test can find it early — and early detection makes all the difference to how well it can be managed.",
    category: "preventive-health",
    keyPoints: [
      "Type 2 diabetes can be present for years without symptoms — many people feel completely well while blood sugar runs high.",
      "Symptoms that deserve a check include frequent urination, excess thirst, unexplained weight change, persistent fatigue and slow-healing wounds.",
      "Earlier screening is worth discussing with a doctor if there is a family history, extra body weight, high blood pressure, or diabetes during a past pregnancy.",
      "Screening is usually a fasting glucose test or an HbA1c test, which reflects average blood sugar over about three months.",
      "Never self-diagnose from a single reading — results are interpreted by a doctor alongside symptoms.",
    ],
    sections: [
      {
        heading: "Easy to miss, simple to find",
        body:
          "Type 2 diabetes develops slowly. The body gradually becomes resistant to insulin, and blood sugar creeps up over months and years — often without any symptom at all. Many people only discover it by chance, or after it has already begun to affect other organs. In Bangladesh, where diabetes is increasingly common, this silence is one reason many cases are found late.\n\nThe test itself, by contrast, is easy: a small blood sample at a laboratory. That mismatch — a silent condition with a simple test — is exactly why screening matters.",
      },
      {
        heading: "Symptoms that deserve a check",
        body:
          "When type 2 diabetes does cause symptoms, the classic ones are:\n\n• Passing urine frequently, especially at night\n• Unusual, persistent thirst\n• Unexplained weight change — loss or gain\n• Persistent tiredness\n• Cuts and wounds that heal slowly\n• Repeated infections, or blurred vision\n\nAny of these, particularly two or more together, is a good reason for a simple check with a doctor.",
      },
      {
        heading: "Who should discuss screening earlier",
        body:
          "Anyone can develop type 2 diabetes, but some situations make earlier screening worthwhile:\n\n• A parent or sibling with diabetes\n• Carrying extra weight, especially around the waist\n• High blood pressure\n• Diabetes during a previous pregnancy\n• Older age and physical inactivity\n\nIf any of these apply — even without symptoms — ask a doctor when to test and how often. The doctor can suggest the right test and interval for your situation.",
      },
      {
        heading: "What screening involves",
        body:
          "Two tests are most common:\n\n• Fasting blood glucose — a blood sample after at least eight hours without food (water is fine)\n• HbA1c — no fasting needed; it reflects average blood sugar over roughly the past three months\n\nResults are interpreted by a doctor alongside symptoms, not in isolation. A single reading — especially a borderline one — is never a diagnosis: illness, stress, medicines and lab variation can all move a result, so doctors often repeat a borderline test before drawing conclusions.\n\nFinding diabetes early matters because good management, started early, prevents most of the damage to eyes, kidneys, nerves and heart that uncontrolled diabetes can cause over the years.",
      },
    ],
    whenToSeekHelp: [
      "If you notice one or more of the classic symptoms — especially frequent urination together with thirst — arrange a simple check.",
      "If you have risk factors such as family history or excess weight, ask a doctor when and how often to screen, even if you feel well.",
      "If a wound is slow to heal or you have repeated infections, seek assessment — these can be features of raised blood sugar.",
    ],
    author: CONTENT_AUTHOR,
    medicalReviewer: null,
    status: "PUBLISHED",
    publishedAt: "2026-11-20",
    updatedAt: "2026-11-20",
    reviewedAt: null,
    sources: [
      {
        title: "Diabetes",
        publisher: "World Health Organization",
        url: "https://www.who.int/news-room/fact-sheets/detail/diabetes",
      },
      {
        title: "Diabetes",
        publisher: "National Health Service (UK)",
        url: "https://www.nhs.uk/conditions/diabetes/",
      },
    ],
    relatedSlugs: ["understanding-type-2-diabetes", "blood-pressure-screening", "balanced-diet-basics"],
    emergencyNote: null,
  },
  {
    slug: "understanding-type-2-diabetes",
    title: "Understanding Type 2 Diabetes",
    titleBn: "টাইপ ২ ডায়াবেটিস: সহজ ভাষায় ধারণা",
    summary:
      "A plain-language explanation of what type 2 diabetes is, how it differs from type 1, why long-term control matters, and how it is managed day to day.",
    category: "medical-conditions",
    keyPoints: [
      "In type 2 diabetes, the body stops responding properly to insulin, and over time makes too little of it — so glucose builds up in the blood.",
      "It differs from type 1, where the body produces almost no insulin; type 2 is by far the most common form and usually develops in adulthood.",
      "Over years, high blood glucose can quietly affect the eyes, kidneys, nerves and heart — which is why good control matters.",
      "Management combines healthy eating, regular activity, weight loss where advised, medicines exactly as prescribed, and regular check-ups.",
      "With a steady routine, people with type 2 diabetes live full, active lives.",
    ],
    sections: [
      {
        heading: "What is happening in the body",
        body:
          "Every meal releases glucose (sugar) into the blood. Insulin, a hormone made by the pancreas, acts like a key — it lets glucose move out of the blood and into cells, where it is used for energy.\n\nIn type 2 diabetes, the locks become stiff: cells respond poorly to insulin. At first the pancreas makes extra insulin to compensate, but over the years it cannot keep up. With too little effective insulin, glucose stays in the blood instead of entering cells — and blood sugar rises.",
      },
      {
        heading: "Type 2 and type 1 are different",
        body:
          "In type 1 diabetes, the body produces little or no insulin, usually because the immune system destroys the insulin-producing cells. It often starts in childhood or the teenage years and needs insulin treatment from the beginning.\n\nType 2 is different and far more common — the large majority of all diabetes cases. It develops gradually, usually in adulthood, and is closely linked with family history, body weight and inactivity.",
      },
      {
        heading: "Why control matters",
        body:
          "High blood glucose rarely feels dramatic day to day — which is what makes it easy to ignore. But over the years, high glucose can quietly damage small and large blood vessels, affecting the eyes (a leading cause of preventable vision loss), the kidneys, the nerves (commonly causing numbness or tingling in the feet), and the heart.\n\nThis sounds alarming, but the practical message is the opposite: these problems are mostly preventable when diabetes is well controlled. That is exactly why regular check-ups, which catch early signs long before symptoms appear, are part of good care.",
      },
      {
        heading: "How type 2 diabetes is managed",
        body:
          "Management is built on a few pillars, adjusted for each person by their doctor:\n\n• A healthy eating pattern — regular meals, controlled portions, less sugar and fewer refined snacks\n• Regular physical activity, most days of the week\n• Weight reduction where the doctor advises it\n• Medicines exactly as prescribed — never skipped or stopped because you feel well\n• Regular monitoring of blood sugar, plus scheduled checks of the eyes, feet and kidneys\n\nWhich medicines suit a particular person — and when to start, change or combine them — is a decision for the doctor, reviewed at follow-up visits.",
      },
      {
        heading: "Living well with diabetes",
        body:
          "A diagnosis of type 2 diabetes is a routine, manageable part of life for millions of people. Most continue full working lives, travel, sports and family life unchanged once a steady routine is in place. Support from family helps — shared healthy meals and evening walks benefit everyone in the house, not only the person with diabetes.",
      },
    ],
    whenToSeekHelp: [
      "If you have symptoms such as frequent urination, excess thirst, unexplained weight change or slow-healing wounds, arrange a check for diabetes.",
      "If you already have diabetes, mention any new vision change, foot numbness, or a sore on the foot promptly — early attention keeps problems small.",
      "If you feel suddenly shaky, sweaty, weak or confused while on diabetes treatment, take a sugary drink or snack and mention the episode to your doctor.",
    ],
    author: CONTENT_AUTHOR,
    medicalReviewer: null,
    status: "PUBLISHED",
    publishedAt: "2026-11-20",
    updatedAt: "2026-11-20",
    reviewedAt: null,
    sources: [
      {
        title: "Diabetes",
        publisher: "World Health Organization",
        url: "https://www.who.int/news-room/fact-sheets/detail/diabetes",
      },
      {
        title: "Type 2 diabetes",
        publisher: "Mayo Clinic",
        url: "https://www.mayoclinic.org/diseases-conditions/type-2-diabetes/symptoms-causes/syc-20351193",
      },
    ],
    relatedSlugs: ["diabetes-screening-basics", "balanced-diet-basics", "physical-activity-guidelines"],
    emergencyNote: null,
  },
  {
    slug: "understanding-high-blood-pressure",
    title: "Understanding High Blood Pressure",
    titleBn: "উচ্চ রক্তচাপ: নীরব কিন্তু নিয়ন্ত্রণযোগ্য",
    summary:
      "High blood pressure usually causes no symptoms while it quietly strains the heart, kidneys, brain and eyes. Understanding the numbers — and the habits that move them — is the first step to staying in control.",
    category: "medical-conditions",
    keyPoints: [
      "Blood pressure is two numbers — systolic (as the heart beats) over diastolic (as it rests) — measured in mmHg.",
      "It usually causes no symptoms even when high; damage to the heart, kidneys, brain and eyes builds silently over the years.",
      "Salt, excess weight, tobacco, alcohol, inactivity, ongoing stress, family history and age all raise the risk.",
      "Management combines lifestyle changes with medicines only as prescribed, plus regular monitoring and follow-up.",
      "Very high pressure with severe headache, chest pain, breathlessness, vision change or weakness is an emergency — call 999.",
    ],
    sections: [
      {
        heading: "What the numbers mean",
        body:
          "A blood pressure reading has two numbers, for example 120/80 mmHg. The first is the systolic pressure — the force in the arteries as the heart beats. The second is the diastolic pressure — the force as the heart rests between beats. A reading around 120/80 is typical for a healthy adult; doctors set individual targets based on age and other conditions.",
      },
      {
        heading: "Why it is called the 'silent' condition",
        body:
          "High blood pressure almost never causes symptoms by itself. People often assume they would feel 'tension' or headaches — in truth, most people with high blood pressure feel completely normal, and many discover it only at a routine check.\n\nMeanwhile, the extra pressure works on the body quietly: the heart thickens and tires, blood vessels stiffen, and the kidneys, brain and eyes accumulate damage over the years. This is the central fact about high blood pressure — you cannot rely on how you feel. It is exactly why regular screening matters (see our article on blood pressure screening).",
      },
      {
        heading: "What raises blood pressure",
        body:
          "• Eating too much salt\n• Carrying extra weight\n• Tobacco use\n• Regular heavy alcohol use\n• Physical inactivity\n• Long-standing stress\n• Family history of high blood pressure\n• Increasing age\n\nSeveral of these work together. Age and family history cannot be changed — which makes the everyday factors, like salt, weight and activity, all the more valuable.",
      },
      {
        heading: "How high blood pressure is managed",
        body:
          "Management has two parts, used together.\n\nLifestyle foundations: reducing salt, more vegetables and fruit, regular activity such as brisk walking, a healthy weight, avoiding tobacco, limiting alcohol, and attention to sleep and stress.\n\nMedicines: many people need one or more medicines to reach their target. These work only when taken exactly as prescribed — every day, whether or not you feel anything (remember: feeling normal is expected, because the condition itself is silent). Never stop or adjust a medicine because readings improve; improvement usually means the medicine is working.\n\nRegular monitoring and follow-up keep the plan on track and let the doctor adjust it over time.",
      },
      {
        heading: "When it becomes an emergency",
        body:
          "Occasionally blood pressure rises to a level needing immediate care. Seek emergency help (call 999 in Bangladesh) if any of these occur:\n\n• Severe headache\n• Chest pain\n• Breathlessness\n• Sudden change in vision\n• Weakness of the face, arm or leg, or slurred speech\n\nDo not wait to see whether it settles.",
      },
    ],
    whenToSeekHelp: [
      "If several readings on different days are raised, arrange a doctor's assessment — diagnosis is made over multiple readings, not one.",
      "If you take blood pressure medicines, mention new dizziness, swelling or a persistent cough at your next visit; dose changes are decisions for your doctor.",
      "Keep regular follow-ups even when you feel well — feeling well is expected, since high blood pressure itself rarely causes symptoms.",
    ],
    author: CONTENT_AUTHOR,
    medicalReviewer: null,
    status: "PUBLISHED",
    publishedAt: "2026-11-20",
    updatedAt: "2026-11-20",
    reviewedAt: null,
    sources: [
      {
        title: "Hypertension",
        publisher: "World Health Organization",
        url: "https://www.who.int/news-room/fact-sheets/detail/hypertension",
      },
      {
        title: "High blood pressure (hypertension)",
        publisher: "National Health Service (UK)",
        url: "https://www.nhs.uk/conditions/high-blood-pressure-hypertension/",
      },
      {
        title: "High Blood Pressure",
        publisher: "American Heart Association",
        url: "https://www.heart.org/en/health-topics/high-blood-pressure",
      },
    ],
    relatedSlugs: ["blood-pressure-screening", "understanding-type-2-diabetes", "routine-health-checks-for-men"],
    emergencyNote:
      "If a severe headache, chest pain, breathlessness, sudden vision change, or weakness of the face, arm or leg occurs — whether or not high blood pressure is already known — seek emergency care immediately (call 999 in Bangladesh). Do not wait to see if it settles.",
  },
  {
    slug: "first-aid-for-minor-burns",
    title: "First Aid for Minor Burns",
    titleBn: "হালকা পোড়ার প্রাথমিক চিকিৎসা",
    summary:
      "What to do in the first minutes after a minor burn — cooling, covering, and what to avoid — plus how to recognise the burns that are not minor at all.",
    category: "first-aid",
    keyPoints: [
      "Cool the burn under gently running cool water for 10 to 20 minutes — the single most useful step in burn first aid.",
      "Remove rings, watches or bangles near the burn before swelling starts.",
      "Cover loosely with clean, non-fluffy cloth or cling film. Never use ice, toothpaste, oil or lotion, and never pop blisters.",
      "A pharmacist can advise on simple pain relief and suitable dressings for a minor burn.",
      "Burns larger than the person's palm, or on the face, hands, feet, genitals or joints — and all electrical and chemical burns — are not minor: seek care.",
    ],
    sections: [
      {
        heading: "First step: cool the burn",
        body:
          "Run cool water gently over the burn for 10 to 20 minutes. This one step limits damage more than anything done afterwards: it carries heat out of the skin and stops it from burning deeper.\n\nUse cool — not ice-cold — water, and keep the rest of the person warm. Cooling still helps even if some time has passed since the injury, so start anyway. If running water is unavailable, soak a clean cloth in cool water and replace it as it warms.",
      },
      {
        heading: "Then: ease swelling, cover gently",
        body:
          "While cooling, or immediately after:\n\n• Remove rings, watches, bangles and tight clothing near the burn before the area starts to swell\n• After cooling, cover the burn loosely with clean, non-fluffy cloth — or cling film laid lightly over it, never wrapped tightly\n• Keep the person warm in cold weather; cool only the burned area\n\nA pharmacist can advise on simple pain relief, taken as directed on the label, and on suitable dressings.",
      },
      {
        heading: "What not to do",
        body:
          "Common home remedies make burns worse:\n\n• No ice or ice water — it can deepen the injury\n• No toothpaste, oil, ghee, butter, lotion or spice pastes — they trap heat and contaminate the skin\n• No cotton wool directly on the burn — the fibres stick to the wound\n• Never break or pop blisters; the skin is protecting new tissue underneath\n• If clothing is stuck to the burn, do not pull it off — cut around it and seek care",
      },
      {
        heading: "When a burn is not minor",
        body:
          "Some burns always need professional assessment, whatever their size:\n\n• Any burn larger than the person's own palm (roughly one hand including fingers)\n• Burns on the face, hands, feet, genitals, or over joints\n• Deep burns — white, leathery or charred skin, or burns that look pale and feel little\n• Electrical burns — the visible mark can look small while deeper damage is larger\n• Chemical burns — rinse with large amounts of running water while arranging care, and bring the container or a photo of it\n• Any fire with smoke inhalation — coughing, soot, or breathlessness",
      },
      {
        heading: "While it heals",
        body:
          "A minor burn kept clean usually heals within one to two weeks. Keep the dressing clean and dry, change it daily, and protect the healed area from sun. Watch for the infection signs below — caught early, infection of a minor burn is straightforward to treat.",
      },
    ],
    whenToSeekHelp: [
      "If the burn is larger than the person's palm, on the face, hands, feet, genitals or a joint, or deep, white or charred, it needs professional care rather than home first aid.",
      "Electrical and chemical burns always need medical assessment — rinse chemicals with plenty of running water while arranging care.",
      "If a healing burn shows increasing pain, spreading redness, warmth, pus or fever, have it assessed promptly; these can signal infection.",
    ],
    author: CONTENT_AUTHOR,
    medicalReviewer: null,
    status: "PUBLISHED",
    publishedAt: "2026-11-20",
    updatedAt: "2026-11-20",
    reviewedAt: null,
    sources: [
      {
        title: "Burns and scalds",
        publisher: "National Health Service (UK)",
        url: "https://www.nhs.uk/conditions/burns-and-scalds/",
      },
      {
        title: "Burns",
        publisher: "World Health Organization",
        url: "https://www.who.int/news-room/fact-sheets/detail/burns",
      },
    ],
    relatedSlugs: ["first-aid-for-cuts-and-bleeding", "hand-hygiene-basics", "safe-drinking-water"],
    emergencyNote:
      "This article covers minor burns only. Call 999 or go to the nearest emergency department for: burns larger than the person's palm; burns on the face, hands, feet, genitals or over joints; deep, white or charred burns; all electrical and chemical burns; and any fire with smoke inhalation.",
  },
  {
    slug: "first-aid-for-cuts-and-bleeding",
    title: "First Aid for Cuts and Bleeding",
    titleBn: "কাটা ঘা ও রক্তপাতের প্রাথমিক চিকিৎসা",
    summary:
      "Most cuts stop bleeding with firm pressure and a little patience. Here is the correct technique, how to care for the wound afterwards, and the signs that a cut needs professional care.",
    category: "first-aid",
    keyPoints: [
      "Press firmly and continuously on the wound with a clean cloth for at least ten minutes — without lifting to peek.",
      "If blood soaks through, add another layer on top; raising the limb above heart level also helps.",
      "Once bleeding has stopped, clean gently with clean water, cover, and change the dressing daily.",
      "Spurting blood, bleeding that will not stop after 10 to 15 minutes of firm pressure, deep or gaping edges, or an embedded object all mean: seek care.",
      "Never remove an embedded object — stabilise it and get help.",
    ],
    sections: [
      {
        heading: "Stop the bleeding first",
        body:
          "Press on the wound firmly and continuously with a clean cloth or pad. Keep pressing for at least ten minutes without lifting to look — every peek disturbs the clot that is forming and restarts the clock.\n\nIf blood soaks through the cloth, do not remove it; add a second layer on top. Raising the injured arm or leg above the level of the heart reduces blood flow and helps clotting. If you are helping someone else, wash your hands before and afterwards, and wear gloves if available. If blood spurts or pools quickly despite firm pressure, this is a wound for emergency care, not home care.",
      },
      {
        heading: "Once the bleeding has stopped",
        body:
          "When bleeding has clearly stopped:\n\n• Rinse the cut gently with clean running water, or boiled-and-cooled water, to remove dirt\n• Pat the area dry with something clean\n• Cover with a clean dressing or plaster\n• Change the dressing daily, and keep the wound clean and dry\n\nIf a dressing sticks, moisten it with clean water before lifting it rather than tearing it off. Small clean cuts usually heal within a week or so.",
      },
      {
        heading: "Cuts that need professional care",
        body:
          "Go for assessment if any of the following apply:\n\n• Blood spurts from the wound, or soaks through repeated dressings\n• Bleeding does not stop after 10 to 15 minutes of firm pressure and elevation\n• The cut is deep, gaping, or its edges sit apart — it may need proper closure\n• There is an embedded object — do NOT pull it out; pad around it to keep it still and seek care\n• The cut is on the face, or anywhere appearance and function matter\n• There is numbness beyond the cut\n• The wound is dirty — soil, rust, or an animal bite — or you are unsure when you last had a tetanus booster\n\nFor dirty wounds, doctors often recommend a tetanus booster; this is decided at the assessment, so raise the question there.",
      },
      {
        heading: "Watching for infection as it heals",
        body:
          "A healing wound can still become infected. Over the following days, look out for:\n\n• Spreading redness from the wound\n• Increasing warmth, swelling or pain\n• Pus or cloudy discharge\n• Fever, or red streaks running up the limb\n\nThese signs mean the wound needs assessment — infection of a small cut is usually simple to treat when caught early, and much simpler than a late one.",
      },
    ],
    whenToSeekHelp: [
      "If blood spurts, soaks through dressings, or has not stopped after 10 to 15 minutes of firm pressure and elevation, seek emergency care.",
      "Deep, gaping, dirty or facial cuts — and any wound with an embedded object — should be assessed promptly; mention your tetanus booster status.",
      "If a healing cut shows spreading redness, warmth, pus, red streaks or fever, arrange an assessment.",
    ],
    author: CONTENT_AUTHOR,
    medicalReviewer: null,
    status: "PUBLISHED",
    publishedAt: "2026-11-20",
    updatedAt: "2026-11-20",
    reviewedAt: null,
    sources: [
      {
        title: "Cuts and scrapes: First aid",
        publisher: "Mayo Clinic",
        url: "https://www.mayoclinic.org/first-aid/first-aid-cuts/basics/art-20056711",
      },
      {
        title: "Severe bleeding: First aid",
        publisher: "Mayo Clinic",
        url: "https://www.mayoclinic.org/first-aid/first-aid-severe-bleeding/basics/art-20056661",
      },
      {
        title: "Injuries and violence",
        publisher: "World Health Organization",
        url: "https://www.who.int/news-room/fact-sheets/detail/injuries-and-violence",
      },
    ],
    relatedSlugs: ["first-aid-for-minor-burns", "hand-hygiene-basics"],
    emergencyNote: null,
  },
  {
    slug: "understanding-cbc-report",
    title: "Understanding Your CBC Report",
    titleBn: "সিবিসি রিপোর্ট বোঝা: সম্পূর্ণ রক্ত পরীক্ষার ব্যাখ্যা",
    summary:
      "The complete blood count is the world's most common blood test. Here is what it actually measures, what the three cell lines mean, and why a doctor — not the report alone — interprets it.",
    category: "medical-tests",
    keyPoints: [
      "A CBC (complete blood count) measures red cells, white cells, haemoglobin and platelets from a small blood sample.",
      "Low haemoglobin points to anaemia — very common in Bangladesh, especially among women and children.",
      "White cell counts hint at infection or inflammation, but are never a diagnosis on their own.",
      "Platelets help clotting; they commonly fall in dengue, which is why doctors repeat the test during dengue season.",
      "Borderline results are common and usually mean little alone — values are always read against the lab's own reference range, your age, sex and symptoms.",
    ],
    sections: [
      {
        heading: "What a CBC is",
        body:
          "A complete blood count — CBC, sometimes called a 'full blood count' — is the most frequently ordered blood test in the world. It is quick, needs only a small sample, and gives a broad snapshot of the cells circulating in blood.\n\nDoctors order it for many everyday reasons: unexplained fatigue, fever, unusual bleeding or bruising, routine checks in pregnancy, or before a procedure. It is a screening test that points directions — it does not diagnose anything by itself.",
      },
      {
        heading: "Red cells and haemoglobin",
        body:
          "Red blood cells carry oxygen, and haemoglobin is the protein inside them that holds it. Low haemoglobin means anaemia: too few red cells, or too little haemoglobin, to carry oxygen comfortably. Typical feelings are tiredness, breathlessness on effort, and pallor.\n\nAnaemia is very common in Bangladesh — particularly among women (for example with heavy periods or low dietary iron), children and pregnant women. Because anaemia has several possible causes, the right response depends on the cause — which is why a doctor interprets the result before anything is started.",
      },
      {
        heading: "White cells",
        body:
          "White blood cells are the immune system's workers. A raised count often accompanies bacterial infection; a low count can accompany some viral infections. But the numbers overlap enormously between conditions — a slightly high or slightly low white count occurs in many ordinary situations, including stress and recent exercise.\n\nA white cell count is a clue, never a diagnosis. Doctors read it together with symptoms, examination findings and often other tests.",
      },
      {
        heading: "Platelets",
        body:
          "Platelets stop bleeding by clumping at the site of injuries. A very low platelet count can show up as easy bruising, pinpoint skin spots, or bleeding gums.\n\nIn Bangladesh the best-known reason for falling platelets is dengue, where the count commonly drops during the illness. This is exactly why doctors often repeat the CBC every day or two in suspected dengue — the trend matters more than any single value. Platelets can also fall with other viral infections or certain medicines.",
      },
      {
        heading: "Reading the report sensibly",
        body:
          "Reference ranges differ from laboratory to laboratory, and depend on age, sex and pregnancy — so the same number can be 'normal' on one report and 'low' on another.\n\nBorderline results are extremely common and usually mean little on their own. Single readings also move with hydration, recent illness and normal lab variation. For all these reasons:\n\n• Never self-diagnose from a CBC report\n• Never start or stop medicines, vitamins or supplements based on a home reading of the report\n• Bring the report to a doctor, who interprets it alongside your symptoms and history\n\nA CBC answers questions doctors ask — it does not replace the doctor asking them.",
      },
    ],
    whenToSeekHelp: [
      "If your report shows values well outside the printed reference range, discuss it with a doctor rather than acting on the numbers alone.",
      "If you have unexplained persistent fatigue, repeated infections, easy bruising or bleeding, a doctor may arrange a CBC as a first step.",
      "During dengue season, if fever comes with severe body aches, rash or bleeding gums, seek assessment — doctors often repeat the CBC to follow platelets.",
    ],
    author: CONTENT_AUTHOR,
    medicalReviewer: null,
    status: "PUBLISHED",
    publishedAt: "2026-11-20",
    updatedAt: "2026-11-20",
    reviewedAt: null,
    sources: [
      {
        title: "Complete Blood Count (CBC)",
        publisher: "MedlinePlus (US National Library of Medicine)",
        url: "https://medlineplus.gov/lab-tests/complete-blood-count-cbc/",
      },
      {
        title: "Anaemia",
        publisher: "World Health Organization",
        url: "https://www.who.int/news-room/fact-sheets/detail/anaemia",
      },
      {
        title: "Dengue and severe dengue",
        publisher: "World Health Organization",
        url: "https://www.who.int/news-room/fact-sheets/detail/dengue-and-severe-dengue",
      },
    ],
    relatedSlugs: ["menstrual-health-basics", "diabetes-screening-basics", "understanding-type-2-diabetes"],
    emergencyNote: null,
  },
];
