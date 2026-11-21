import { CONTENT_AUTHOR, type EquipmentGuide } from "../types";

/**
 * Equipment library batch 2 — completes the 30-machine education gallery.
 * Monitoring, diagnostic/imaging and treatment/life-support equipment.
 * Same honest rules as batch 1: no fabrication, clear limits, real sources,
 * medicalReviewer stays null until a qualified review actually happens.
 */

const D = "2026-11-21";

const WHO_DEVICES = {
  title: "Medical devices — topic overview",
  publisher: "World Health Organization",
  url: "https://www.who.int/health-topics/medical-devices",
};
const FDA_DEVICES = {
  title: "Medical devices — regulation and safety",
  publisher: "U.S. Food and Drug Administration",
  url: "https://www.fda.gov/medical-devices",
};

export const EQUIPMENT_GUIDES_BATCH2: EquipmentGuide[] = [
  {
    slug: "manual-bp-apparatus",
    name: "Manual Blood Pressure Apparatus (Aneroid)",
    nameBn: "ম্যানুয়াল (অ্যানেরয়েড) রক্তচাপ যন্ত্র",
    summary:
      "The cuff-and-dial device used by health workers to check blood pressure by listening with a stethoscope. Accurate in trained hands — but self-measurement without training often gives wrong numbers.",
    category: "Monitoring and Basic Equipment",
    image: "/images/library/equipment/manual-bp-apparatus.png",
    whatItIs:
      "An aneroid sphygmomanometer: an arm cuff connected to a small dial gauge and a hand bulb. The user inflates the cuff, then releases air slowly while listening to blood-flow sounds with a stethoscope to read systolic and diastolic pressure. Modern versions contain no mercury, unlike older hospital gauges.",
    whatItMeasures:
      "The pressure of blood against artery walls, reported as two numbers (for example 120/80 mmHg). The sounds heard through the stethoscope mark the moments the heart pushes blood (systolic) and rests between beats (diastolic).",
    howItWorks:
      "Inflating the cuff briefly stops blood flow in the arm. As air is released, the listener notes the gauge reading when blood first audibly flows back (systolic) and when the sound disappears (diastolic).",
    commonUses: [
      "Blood pressure checks during consultations and health camps",
      "Confirming readings when a digital monitor gives unusual results",
      "Community and field screening programmes",
    ],
    whoOperates:
      "Trained health workers, nurses and doctors. Listening-based measurement takes practice — untrained users frequently mis-hear the sounds.",
    safeUse: [
      "Use the correct cuff size for the arm — a small cuff on a large arm over-reads pressure.",
      "Sit rested for about 5 minutes before a reading; keep the arm at heart level, feet flat, and do not talk.",
      "Take two readings a minute apart and average them when possible.",
      "Have the device calibrated and checked at regular intervals.",
    ],
    limitations: [
      "Readings depend heavily on the user's hearing, technique and the cuff size.",
      "The dial can drift out of calibration after knocks or years of use.",
      "Not designed for unassisted self-measurement at home.",
    ],
    maintenance:
      "Periodic calibration against a reference gauge by a qualified technician; check tubing and cuff for cracks and leaks.",
    whenProfessionalHelp: [
      "Repeated readings of 140/90 mmHg or higher — discuss with a doctor.",
      "Any reading with chest pain, breathlessness, severe headache, blurred vision or weakness — seek urgent care.",
      "Very low readings with dizziness or fainting — urgent assessment.",
    ],
    relatedSpecialties: ["Medicine & Diabetology", "Cardiology"],
    icon: "Gauge",
    author: CONTENT_AUTHOR,
    medicalReviewer: null,
    status: "PUBLISHED",
    publishedAt: D,
    updatedAt: D,
    reviewedAt: null,
    sources: [WHO_DEVICES, FDA_DEVICES],
  },
  {
    slug: "infrared-thermometer",
    name: "Infrared (Non-Contact) Thermometer",
    nameBn: "ইনফ্রারেড (নন-কন্টাক্ট) থার্মোমিটার",
    summary:
      "A point-and-hold device that reads forehead temperature from a distance in seconds. Convenient for screening — but several factors can shift the number, so unusual readings should be re-checked.",
    category: "Monitoring and Basic Equipment",
    image: "/images/library/equipment/infrared-thermometer.png",
    whatItIs:
      "A handheld device that measures the infrared heat radiating from the skin, usually the forehead, without touching the person. It shows a temperature within one to three seconds.",
    whatItMeasures:
      "Skin surface temperature, which the device converts into an estimated body temperature. It does not measure internal (core) temperature directly.",
    howItWorks:
      "A sensor collects infrared radiation from the forehead and translates its intensity into a temperature reading using a built-in calculation.",
    commonUses: [
      "Quick fever screening at entrances, offices, schools and clinics",
      "Checking sleeping or uncooperative children without waking them",
      "Reducing contact during infectious-disease outbreaks",
    ],
    whoOperates: "Anyone can operate it, following the device instructions.",
    safeUse: [
      "Keep the recommended distance (often 3–5 cm) and aim at the centre of the forehead.",
      "The forehead should be dry and not just out of sun, wind or a fan.",
      "Clean the sensor lens gently as instructed; a smudged lens misreads.",
      "Confirm any fever reading with a regular thermometer before acting on it.",
    ],
    limitations: [
      "Sweat, cosmetics, room temperature and improper aiming can shift readings.",
      "Forehead readings usually run slightly different from oral readings.",
      "A 'normal' screening result does not mean a person is free of illness.",
    ],
    maintenance:
      "Keep the sensor clean and handle drops carefully — the sensor can lose accuracy after impact.",
    whenProfessionalHelp: [
      "Fever above 39.5°C, or fever with confusion, seizures, stiff neck or breathing difficulty — emergency care.",
      "Any infant under 3 months with fever — hospital immediately.",
      "Fever lasting more than 3 days — medical assessment.",
    ],
    relatedSpecialties: ["Medicine & Diabetology", "Pediatrics"],
    icon: "Thermometer",
    author: CONTENT_AUTHOR,
    medicalReviewer: null,
    status: "PUBLISHED",
    publishedAt: D,
    updatedAt: D,
    reviewedAt: null,
    sources: [WHO_DEVICES, FDA_DEVICES],
  },
  {
    slug: "multiparameter-monitor",
    name: "Multiparameter Patient Monitor",
    nameBn: "মাল্টিপ্যারামিটার পেশেন্ট মনিটর",
    summary:
      "The bedside screen seen in hospitals and ICUs that continuously shows heart rate, oxygen level, blood pressure and more. A hospital-grade device operated by trained staff — this page explains what the numbers mean.",
    category: "Monitoring and Basic Equipment",
    image: "/images/library/equipment/multiparameter-monitor.png",
    whatItIs:
      "A central monitor connected to a patient through several sensors: ECG electrodes, a pulse oximeter probe, a blood pressure cuff and sometimes breathing and temperature sensors. It displays live values and alerts staff when a value crosses a safe range.",
    whatItMeasures:
      "Typically heart rate and rhythm, blood oxygen saturation (SpO₂), non-invasive blood pressure, breathing rate and body temperature — all continuously.",
    howItWorks:
      "Each sensor picks up a body signal (electrical, optical or pressure) and the monitor converts it into numbers and waveforms, with alarms set by the clinical team.",
    commonUses: [
      "Continuous observation in ICUs, high-dependency units and operating theatres",
      "Monitoring during dialysis, anaesthesia and emergency care",
      "Tracking recovery after serious illness or surgery",
    ],
    whoOperates:
      "Nurses, doctors and trained technicians. Alarm settings and interpretation require clinical training.",
    safeUse: [
      "For patients and families: the moving numbers are for the care team — ask the nurse to explain what is being watched.",
      "Alarms sometimes sound for loose sensors, not only for real changes; staff check the patient, not just the screen.",
    ],
    limitations: [
      "Readings can be distorted by movement, poor sensor contact, nail polish or weak circulation.",
      "A monitor supports — never replaces — clinical judgement.",
    ],
    maintenance:
      "Hospital biomedical teams test and calibrate monitors on a schedule; sensors and cables are checked between patients.",
    whenProfessionalHelp: [
      "In hospital, the care team responds to monitor alarms directly.",
      "If you are visiting and a monitor alarms for a long time with no staff response, call a nurse immediately.",
    ],
    relatedSpecialties: ["Medicine & Diabetology", "Cardiology"],
    icon: "Monitor",
    author: CONTENT_AUTHOR,
    medicalReviewer: null,
    status: "PUBLISHED",
    publishedAt: D,
    updatedAt: D,
    reviewedAt: null,
    sources: [WHO_DEVICES],
  },
  {
    slug: "spirometer",
    name: "Spirometer",
    nameBn: "স্পাইরোমিটার",
    summary:
      "A lung-function device that measures how much air you can breathe out and how fast — the key test for asthma and COPD. Performed in clinics with coaching from a technician.",
    category: "Monitoring and Basic Equipment",
    image: "/images/library/equipment/spirometer.png",
    whatItIs:
      "A device with a mouthpiece, tube and sensor that records the volume and speed of air exhaled in a deep, forceful breath. The result is printed as a graph of lung performance.",
    whatItMeasures:
      "The amount of air pushed out in one second (FEV₁), the total air emptied from the lungs (FVC) and their ratio — numbers that show whether airways are narrowed or lungs are restricted.",
    howItWorks:
      "The patient takes the deepest breath possible and blasts it out through the sensor as hard and long as possible, usually repeating the attempt several times for a reliable result.",
    commonUses: [
      "Diagnosing and tracking asthma and COPD",
      "Assessing breathlessness and long-term cough",
      "Checking lung health before surgery or after exposure to dust and smoke",
    ],
    whoOperates:
      "Trained technicians or nurses coach every breath; a doctor interprets the results.",
    safeUse: [
      "Use a new or disinfected mouthpiece for each person.",
      "Follow the coaching — an incomplete effort gives misleading numbers.",
      "Some patients may be asked to avoid inhalers or heavy meals before the test, as instructed by the clinic.",
    ],
    limitations: [
      "Results depend almost entirely on proper effort and technique.",
      "Very young children and some elderly patients cannot perform the manoeuvre reliably.",
      "Normal results do not exclude every lung disease.",
    ],
    maintenance: "Clinic devices are calibrated regularly and disinfected between patients.",
    whenProfessionalHelp: [
      "Sudden severe breathlessness or blue lips — emergency care, not a lung test.",
      "Ongoing breathlessness, wheeze or a cough lasting weeks — book a consultation.",
    ],
    relatedSpecialties: ["Medicine & Diabetology", "Chest & Pulmonology"],
    icon: "Wind",
    author: CONTENT_AUTHOR,
    medicalReviewer: null,
    status: "PUBLISHED",
    publishedAt: D,
    updatedAt: D,
    reviewedAt: null,
    sources: [
      {
        title: "Spirometry — what to expect",
        publisher: "Mayo Clinic",
        url: "https://www.mayoclinic.org/tests-procedures/spirometry/about/pac-20394241",
      },
      WHO_DEVICES,
    ],
  },
  {
    slug: "ultrasound-machine",
    name: "Ultrasound Machine",
    nameBn: "আল্ট্রাসাউন্ড মেশিন",
    summary:
      "The imaging device that uses painless sound waves to see inside the body — pregnancies, abdomen, heart and more. Performed by trained sonographers or doctors; the images need professional interpretation.",
    category: "Diagnostic and Imaging Equipment",
    image: "/images/library/equipment/ultrasound-machine.png",
    whatItIs:
      "A machine with a monitor and a handheld probe (transducer) that is moved over the skin with gel. It sends high-frequency sound waves and builds a live picture from the echoes.",
    whatItMeasures:
      "Real-time images of soft tissues — organs, blood vessels, the uterus and unborn baby. Doppler modes can also show the direction and speed of blood flow.",
    howItWorks:
      "Sound waves travel into the body and bounce back differently from each tissue; the computer turns returning echoes into a moving image on screen. There is no radiation involved.",
    commonUses: [
      "Pregnancy monitoring — growth, position and wellbeing of the baby",
      "Examining the liver, gallbladder, kidneys, thyroid and other organs",
      "Guiding procedures such as biopsies and drain placements",
    ],
    whoOperates:
      "Sonographers, radiologists, obstetricians and other trained clinicians perform and interpret the scan.",
    safeUse: [
      "Diagnostic ultrasound performed by trained professionals is considered very safe.",
      "Follow preparation instructions — some scans require a full bladder or fasting.",
      "Keepsake or entertainment scanning without medical purpose is discouraged.",
    ],
    limitations: [
      "Sound waves struggle to pass through bone and gas, so some areas (behind bone, bowel gas) are hard to see.",
      "Image quality depends on the machine, the operator and the patient's body type.",
      "A scan report should always come from a qualified clinician — not from reading the screen yourself.",
    ],
    maintenance: "Hospital equipment maintained by biomedical engineering departments.",
    whenProfessionalHelp: [
      "Bring any scan report to a doctor for explanation and next steps — scans support diagnosis, they are not a diagnosis by themselves.",
    ],
    relatedSpecialties: ["Radiology & Imaging", "Gynecology & Infertility", "Medicine & Diabetology"],
    icon: "Scan",
    author: CONTENT_AUTHOR,
    medicalReviewer: null,
    status: "PUBLISHED",
    publishedAt: D,
    updatedAt: D,
    reviewedAt: null,
    sources: [WHO_DEVICES, FDA_DEVICES],
  },
  {
    slug: "x-ray-machine",
    name: "X-Ray Machine",
    nameBn: "এক্স-রে মেশিন",
    summary:
      "The classic imaging machine that looks through the body to show bones and some tissues using a small, carefully controlled dose of radiation. Operated by radiographers; reports come from radiologists.",
    category: "Diagnostic and Imaging Equipment",
    image: "/images/library/equipment/x-ray-machine.png",
    whatItIs:
      "An X-ray tube that sends a brief, controlled beam of radiation through the body onto a detector, producing images — most famously of bones, but also the chest and abdomen.",
    whatItMeasures:
      "Differences in how tissues absorb radiation: dense bone appears white, air appears black, and soft tissues show in shades of grey.",
    howItWorks:
      "Radiation passes through the body and is absorbed in different amounts by different tissues; the remaining radiation forms the image on the detector.",
    commonUses: [
      "Checking for fractures and dislocations after injury",
      "Chest X-rays for pneumonia, heart size and lung conditions",
      "Dental X-rays for teeth and jaw problems",
    ],
    whoOperates:
      "Radiographers position patients and take the images; radiologists (specialist doctors) write the reports.",
    safeUse: [
      "Modern X-rays use very small radiation doses, but staff must be told if you are — or might be — pregnant.",
      "Lead aprons or shields are used when appropriate.",
      "X-rays are taken only when the medical benefit justifies them.",
    ],
    limitations: [
      "X-rays give limited detail of soft tissues compared with CT or MRI.",
      "Some fractures and early diseases are invisible on plain X-rays.",
    ],
    maintenance: "Regulated machines are tested regularly for radiation output and safety.",
    whenProfessionalHelp: [
      "After an injury with deformity, inability to bear weight or severe pain — get assessed urgently; do not wait for an X-ray appointment yourself.",
    ],
    relatedSpecialties: ["Radiology & Imaging", "Orthopedics", "Medicine & Diabetology"],
    icon: "ScanLine",
    author: CONTENT_AUTHOR,
    medicalReviewer: null,
    status: "PUBLISHED",
    publishedAt: D,
    updatedAt: D,
    reviewedAt: null,
    sources: [WHO_DEVICES, FDA_DEVICES],
  },
  {
    slug: "ct-scanner",
    name: "CT Scanner",
    nameBn: "সিটি স্ক্যানার",
    summary:
      "A ring-shaped machine that takes rapid cross-sectional X-ray images of the body, giving far more detail than a plain X-ray. A hospital service ordered and interpreted by doctors.",
    category: "Diagnostic and Imaging Equipment",
    image: "/images/library/equipment/ct-scanner.png",
    whatItIs:
      "A CT (computed tomography) scanner rotates an X-ray source around the patient lying on a moving table, and a computer reconstructs detailed slice-by-slice pictures — or a full 3D view — of the inside of the body.",
    whatItMeasures:
      "Detailed anatomy of the brain, chest, abdomen, blood vessels and bones — including subtle bleeding, clots, tumours and injuries that plain X-rays cannot show.",
    howItWorks:
      "Many X-ray measurements from different angles are combined mathematically into cross-sectional images within seconds.",
    commonUses: [
      "Emergency assessment of head injury, stroke and internal bleeding",
      "Detailed examination of chest and abdominal problems",
      "Planning surgery, radiation therapy and biopsies",
    ],
    whoOperates:
      "Radiographers operate the scanner; radiologists interpret the results. Some scans require an injected contrast dye, handled by clinical teams.",
    safeUse: [
      "Tell staff about allergies, kidney problems, diabetes medicines and possible pregnancy before a contrast scan.",
      "The radiation dose is higher than a plain X-ray, so CT is used when the information genuinely matters.",
      "Follow fasting or medication instructions given for your scan.",
    ],
    limitations: [
      "Radiation exposure means CT is used thoughtfully, not as a routine check-up.",
      "Contrast dye can cause reactions in some people — staff monitor for this.",
    ],
    maintenance: "Hospital-based machines undergo strict quality and safety testing.",
    whenProfessionalHelp: [
      "CT is arranged by doctors. If you have had a CT scan, the report must be explained by your treating doctor.",
    ],
    relatedSpecialties: ["Radiology & Imaging", "Neurology", "Medicine & Diabetology"],
    icon: "Layers",
    author: CONTENT_AUTHOR,
    medicalReviewer: null,
    status: "PUBLISHED",
    publishedAt: D,
    updatedAt: D,
    reviewedAt: null,
    sources: [
      {
        title: "CT scan — what to expect",
        publisher: "Mayo Clinic",
        url: "https://www.mayoclinic.org/tests-procedures/ct-scan/about/pac-20395075",
      },
      WHO_DEVICES,
    ],
  },
  {
    slug: "mri-scanner",
    name: "MRI Scanner",
    nameBn: "এমআরআই স্ক্যানার",
    summary:
      "A tunnel-shaped machine that uses a strong magnetic field and radio waves — no radiation — to create the most detailed images of soft tissues like the brain, spine and joints.",
    category: "Diagnostic and Imaging Equipment",
    image: "/images/library/equipment/mri-scanner.png",
    whatItIs:
      "An MRI (magnetic resonance imaging) scanner surrounds the patient with a powerful magnet. Radio signals from the body's own water molecules are converted into highly detailed pictures of organs, nerves, joints and blood vessels.",
    whatItMeasures:
      "Exceptional detail of soft tissues — brain and spinal cord, ligaments, discs, muscles, heart and tumours — often with special sequences that plain X-rays and CT cannot provide.",
    howItWorks:
      "The magnetic field temporarily aligns water molecules in the body; radio pulses knock them out of line, and the faint signals they emit while realigning become the image.",
    commonUses: [
      "Investigating brain, spine and nerve conditions",
      "Detailed joint and ligament imaging (knee, shoulder)",
      "Characterising tumours and planning complex surgery",
    ],
    whoOperates:
      "Specially trained radiographers; a radiologist interpretes the images.",
    safeUse: [
      "The magnet is always on — all metal implants, pacemakers, cochlear implants, shrapnel and devices must be declared before entering the room.",
      "The machine is loud; patients wear hearing protection and may be offered sedation or an open scanner if claustrophobic.",
      "Follow all safety screening — this is a strictly no-metal zone.",
    ],
    limitations: [
      "Scans take longer and cost more than X-ray or CT.",
      "Some implants make MRI unsafe; alternatives exist in those cases.",
      "Claustrophobia and the need to lie very still can make it difficult for some patients.",
    ],
    maintenance: "Specialist engineers maintain the magnet and safety systems.",
    whenProfessionalHelp: [
      "MRI is ordered by doctors after considering your history — bring the report back to your doctor for explanation.",
    ],
    relatedSpecialties: ["Radiology & Imaging", "Neurology", "Orthopedics"],
    icon: "Layers",
    author: CONTENT_AUTHOR,
    medicalReviewer: null,
    status: "PUBLISHED",
    publishedAt: D,
    updatedAt: D,
    reviewedAt: null,
    sources: [
      {
        title: "MRI — what to expect",
        publisher: "Mayo Clinic",
        url: "https://www.mayoclinic.org/tests-procedures/mri-scan/about/pac-20384768",
      },
      WHO_DEVICES,
    ],
  },
  {
    slug: "mammography-machine",
    name: "Mammography Machine",
    nameBn: "ম্যামোগ্রাফি মেশিন",
    summary:
      "A specialised low-dose X-ray machine for breast screening that can find cancers before a lump is felt. Trained radiographers perform it; screening decisions belong with you and your doctor.",
    category: "Diagnostic and Imaging Equipment",
    image: "/images/library/equipment/mammography-machine.png",
    whatItIs:
      "A dedicated X-ray system designed exclusively for breast imaging. The breast is briefly compressed between two plates while a low-dose X-ray picture is taken from two angles.",
    whatItMeasures:
      "Detailed images of breast tissue that can reveal small lumps, calcifications and other changes years before they become palpable.",
    howItWorks:
      "Gentle compression spreads the breast tissue thinly so a clear picture is possible with the lowest practical radiation dose.",
    commonUses: [
      "Routine breast cancer screening in women of screening age",
      "Examining breast changes such as a lump, skin change or nipple discharge",
      "Guiding needle biopsies of suspicious areas",
    ],
    whoOperates:
      "Female radiographers usually perform the scan; radiologists read the images.",
    safeUse: [
      "Compression is brief but firm — it lasts only seconds per picture and greatly improves image quality.",
      "Avoid deodorants and talcum powder on scan day, as they can appear on the image.",
      "Tell staff if you are pregnant or breastfeeding.",
    ],
    limitations: [
      "No screening test finds every cancer — some cancers are invisible on mammograms.",
      "Dense breast tissue makes reading harder; extra imaging is sometimes recommended.",
      "An abnormal result usually leads to more tests, not an immediate diagnosis.",
    ],
    maintenance: "Machines are calibrated under national radiation-safety programmes.",
    whenProfessionalHelp: [
      "Any new breast lump, skin dimpling or nipple change — see a doctor promptly, whatever your last mammogram showed.",
    ],
    relatedSpecialties: ["Radiology & Imaging", "Gynecology & Infertility", "General & Laparoscopic Surgery"],
    icon: "Scan",
    author: CONTENT_AUTHOR,
    medicalReviewer: null,
    status: "PUBLISHED",
    publishedAt: D,
    updatedAt: D,
    reviewedAt: null,
    sources: [
      {
        title: "Mammogram — what to expect",
        publisher: "Mayo Clinic",
        url: "https://www.mayoclinic.org/tests-procedures/mammogram/about/pac-20394851",
      },
      WHO_DEVICES,
    ],
  },
  {
    slug: "dexa-scanner",
    name: "DEXA Bone Density Scanner",
    nameBn: "ডেক্সা (হাড়ের ঘনত্ব) স্ক্যানার",
    summary:
      "A gentle, low-radiation scan that measures bone strength and flags osteoporosis — the silent bone-thinning that makes fractures more likely, especially after menopause.",
    category: "Diagnostic and Imaging Equipment",
    image: "/images/library/equipment/dexa-scanner.png",
    whatItIs:
      "A DEXA (dual-energy X-ray absorptiometry) scanner: a padded table with an overhead arm that passes very low-dose X-rays through the hip and lower spine.",
    whatItMeasures:
      "Bone mineral density — reported as a T-score that compares your bones with those of a healthy young adult, and classifies normal, low bone mass (osteopenia) or osteoporosis.",
    howItWorks:
      "Two X-ray energy levels pass through bone and soft tissue; comparing how each is absorbed isolates the bone's mineral content.",
    commonUses: [
      "Checking for osteoporosis in women after menopause and adults over 65",
      "Assessing fracture risk after a fragility fracture",
      "Monitoring bone health during long-term steroid treatment",
    ],
    whoOperates: "Trained radiographers; results are interpreted and explained by doctors.",
    safeUse: [
      "The radiation dose is tiny — a fraction of a chest X-ray.",
      "Avoid calcium supplements for 24 hours before the scan, as instructed.",
      "Tell staff if you are pregnant or recently had a barium or contrast study.",
    ],
    limitations: [
      "Earlier fractures, arthritis and implants can distort spine readings.",
      "The scan shows bone density, not the cause of bone loss — that needs clinical assessment.",
    ],
    maintenance: "Calibrated routinely by hospital physics teams.",
    whenProfessionalHelp: [
      "A low T-score or a fracture from a minor fall — discuss treatment options with your doctor; effective medicines and exercise programmes exist.",
    ],
    relatedSpecialties: ["Orthopedics", "Medicine & Diabetology", "Radiology & Imaging"],
    icon: "Bone",
    author: CONTENT_AUTHOR,
    medicalReviewer: null,
    status: "PUBLISHED",
    publishedAt: D,
    updatedAt: D,
    reviewedAt: null,
    sources: [
      {
        title: "Bone density test (DEXA) — what to expect",
        publisher: "Mayo Clinic",
        url: "https://www.mayoclinic.org/tests-procedures/dexa-scan/about/pac-20385141",
      },
      WHO_DEVICES,
    ],
  },
  {
    slug: "eeg-machine",
    name: "EEG Machine",
    nameBn: "ইইজি মেশিন",
    summary:
      "A machine that records the brain's natural electrical activity through electrodes on the scalp — the key test for epilepsy and other brain conditions. Painless, and performed by trained technicians.",
    category: "Diagnostic and Imaging Equipment",
    image: "/images/library/equipment/eeg-machine.png",
    whatItIs:
      "An electroencephalography (EEG) system: small electrodes attached to the scalp with paste record the faint electrical signals the brain produces constantly, while the machine draws them as wavy lines.",
    whatItMeasures:
      "The brain's electrical rhythms, and — importantly — abnormal discharges such as those seen in seizure disorders.",
    howItWorks:
      "Neurons communicate electrically; electrodes on the scalp detect the summed signal, which is amplified and recorded, often for 20–40 minutes, sometimes during sleep or with flashing lights.",
    commonUses: [
      "Supporting diagnosis of epilepsy and seizure types",
      "Evaluating fainting spells, confusion and sleep disorders",
      "Monitoring brain activity in critically ill patients",
    ],
    whoOperates:
      "EEG technicians perform the recording; neurologists interpret the traces.",
    safeUse: [
      "The test is painless — electrodes sit on the skin and give no shocks.",
      "Wash hair beforehand; avoid oils and gels.",
      "Some tests require reduced sleep beforehand — follow the clinic's instructions.",
    ],
    limitations: [
      "A normal EEG does not rule out epilepsy — abnormalities can appear only during episodes.",
      "Movement, drowsiness and caffeine can blur the recording.",
    ],
    maintenance: "Hospital-maintained equipment, checked by biomedical staff.",
    whenProfessionalHelp: [
      "A first-ever seizure, or a seizure lasting over 5 minutes — emergency care.",
    ],
    relatedSpecialties: ["Neurology", "Medicine & Diabetology"],
    icon: "Brain",
    author: CONTENT_AUTHOR,
    medicalReviewer: null,
    status: "PUBLISHED",
    publishedAt: D,
    updatedAt: D,
    reviewedAt: null,
    sources: [
      {
        title: "Electroencephalogram (EEG) — what to expect",
        publisher: "Mayo Clinic",
        url: "https://www.mayoclinic.org/tests-procedures/eeg/about/pac-20393951",
      },
      WHO_DEVICES,
    ],
  },
  {
    slug: "emg-machine",
    name: "EMG / Nerve Conduction Machine",
    nameBn: "ইএমজি / নার্ভ কন্ডাকশন মেশিন",
    summary:
      "A diagnostic system that checks how well nerves and muscles carry electrical signals — used for numbness, tingling, weakness and conditions like carpal tunnel syndrome and neuropathy.",
    category: "Diagnostic and Imaging Equipment",
    image: "/images/library/equipment/emg-machine.png",
    whatItIs:
      "An electromyography and nerve conduction study system. Small electrodes on the skin deliver tiny pulses to nerves, and a fine needle electrode can record muscle electrical activity directly.",
    whatItMeasures:
      "The speed and strength of signals travelling along nerves, and the electrical behaviour of muscles at rest and during contraction.",
    howItWorks:
      "Mild electrical pulses stimulate a nerve, and the machine times how fast the resulting signal appears further along — slowed or weakened responses point to nerve damage or compression.",
    commonUses: [
      "Carpal tunnel syndrome and other nerve compression",
      "Diabetic and other peripheral neuropathies",
      "Muscle and nerve-root problems causing weakness or numbness",
    ],
    whoOperates:
      "Neurologists or specially trained clinical neurophysiologists perform and interpret these studies.",
    safeUse: [
      "The pulses feel like brief taps or tingling — uncomfortable at worst, not dangerous.",
      "Tell the doctor if you take blood thinners or have a pacemaker.",
      "Wear loose clothing; avoid lotions on the test day.",
    ],
    limitations: [
      "Results are one piece of the puzzle and are read alongside symptoms and other tests.",
      "Mild early disease can be missed; some findings are non-specific.",
    ],
    maintenance: "Hospital-maintained precision equipment.",
    whenProfessionalHelp: [
      "Sudden weakness, facial droop or loss of feeling — emergency care for possible stroke.",
      "Progressive numbness or weakness — book a neurological consultation.",
    ],
    relatedSpecialties: ["Neurology", "Orthopedics", "Medicine & Diabetology"],
    icon: "Activity",
    author: CONTENT_AUTHOR,
    medicalReviewer: null,
    status: "PUBLISHED",
    publishedAt: D,
    updatedAt: D,
    reviewedAt: null,
    sources: [
      {
        title: "EMG — what to expect",
        publisher: "Mayo Clinic",
        url: "https://www.mayoclinic.org/tests-procedures/emg/about/pac-20394913",
      },
      WHO_DEVICES,
    ],
  },
  {
    slug: "endoscopy-system",
    name: "Endoscopy System",
    nameBn: "এন্ডোস্কোপি সিস্টেম",
    summary:
      "A flexible camera instrument that lets doctors look directly inside the stomach, colon, lungs or joints — and take samples. A specialist procedure done with sedation in hospitals.",
    category: "Diagnostic and Imaging Equipment",
    image: "/images/library/equipment/endoscopy-system.png",
    whatItIs:
      "An endoscopy tower: a flexible tube with a camera and light at its tip, connected to a monitor. Depending on the type, it enters through the mouth (gastroscopy), anus (colonoscopy) or other routes.",
    whatItMeasures:
      "Direct, magnified views of internal surfaces — and through working channels, the ability to take biopsies, remove polyps or stop bleeding.",
    howItWorks:
      "Light travels down thousands of glass fibres; the camera sends video back to the screen while the doctor steers the scope and uses instruments through its channels.",
    commonUses: [
      "Investigating persistent indigestion, swallowing trouble or bleeding",
      "Colon cancer screening and polyp removal",
      "Treating bleeding ulcers and retrieving swallowed objects",
    ],
    whoOperates:
      "Gastroenterologists, surgeons and trained endoscopy teams, with nurses managing sedation and monitoring.",
    safeUse: [
      "Follow the fasting and bowel-preparation instructions exactly — poor prep can hide problems.",
      "Arrange someone to accompany you home after sedation.",
      "Declare all medicines, especially blood thinners, beforehand.",
    ],
    limitations: [
      "Small risks include bleeding and perforation, particularly when biopsies or polyps are removed — teams are trained to manage these.",
      "Some areas of the bowel and some conditions remain hard to see.",
    ],
    maintenance:
      "Scopes undergo rigorous high-level disinfection between every patient — a strict, monitored process.",
    whenProfessionalHelp: [
      "Vomiting blood, black stools or severe abdominal pain after a procedure — emergency care.",
    ],
    relatedSpecialties: ["Gastroenterology & Hepatology", "General & Laparoscopic Surgery"],
    icon: "Camera",
    author: CONTENT_AUTHOR,
    medicalReviewer: null,
    status: "PUBLISHED",
    publishedAt: D,
    updatedAt: D,
    reviewedAt: null,
    sources: [
      {
        title: "Endoscopy — what to expect",
        publisher: "Mayo Clinic",
        url: "https://www.mayoclinic.org/tests-procedures/endoscopy/about/pac-20394975",
      },
      WHO_DEVICES,
    ],
  },
  {
    slug: "echocardiography-machine",
    name: "Echocardiography Machine (Echo)",
    nameBn: "ইকোকার্ডিওগ্রাফি (ইকো) মেশিন",
    summary:
      "An ultrasound machine dedicated to the heart — a painless scan that shows its chambers, valves and pumping strength in real time. Performed by trained cardiac sonographers or cardiologists.",
    category: "Diagnostic and Imaging Equipment",
    image: "/images/library/equipment/echocardiography-machine.png",
    whatItIs:
      "An echocardiograph: a specialised ultrasound system whose probe is placed on the chest to show a live moving picture of the beating heart.",
    whatItMeasures:
      "Pumping strength (ejection fraction), valve function and leaks, chamber sizes, pressures, congenital defects, and fluid around the heart.",
    howItWorks:
      "Sound waves reflect off moving heart structures; Doppler signals measure blood flow direction and speed across valves.",
    commonUses: [
      "Assessing breathlessness and heart failure",
      "Checking heart murmurs and valve disease",
      "Screening and monitoring congenital heart disease, including in children",
    ],
    whoOperates:
      "Cardiac sonographers or cardiologists perform and interpret echocardiograms.",
    safeUse: [
      "No preparation is usually needed; the test is painless and radiation-free.",
      "Wear a front-opening shirt, as the probe is moved across the chest.",
    ],
    limitations: [
      "Lung disease, obesity and chest shape can reduce image quality.",
      "Some heart problems — coronary artery narrowing, for example — need other tests.",
    ],
    maintenance: "Maintained by hospital cardiology and biomedical teams.",
    whenProfessionalHelp: [
      "Chest pain, fainting or severe breathlessness — emergency assessment, not an outpatient echo.",
    ],
    relatedSpecialties: ["Cardiology", "Medicine & Diabetology"],
    icon: "HeartPulse",
    author: CONTENT_AUTHOR,
    medicalReviewer: null,
    status: "PUBLISHED",
    publishedAt: D,
    updatedAt: D,
    reviewedAt: null,
    sources: [
      {
        title: "Echocardiogram — what to expect",
        publisher: "Mayo Clinic",
        url: "https://www.mayoclinic.org/tests-procedures/echocardiogram/about/pac-20394606",
      },
      WHO_DEVICES,
    ],
  },
  {
    slug: "oxygen-concentrator",
    name: "Oxygen Concentrator",
    nameBn: "অক্সিজেন কনসেন্ট্রেটর",
    summary:
      "A machine that pulls oxygen from room air and delivers it through a tube — widely used for home oxygen therapy. It must be prescribed with a flow rate; using oxygen without medical advice can be harmful.",
    category: "Treatment and Life-Support Equipment",
    image: "/images/library/equipment/oxygen-concentrator.png",
    whatItIs:
      "A bedside machine that takes in ordinary air, removes nitrogen through filters (sieve beds), and delivers concentrated oxygen through nasal tubing or a mask. It runs on electricity and needs no refilling.",
    whatItMeasures:
      "It delivers rather than measures — a flowmeter sets how many litres per minute of oxygen are supplied, as prescribed by a doctor.",
    howItWorks:
      "Air is compressed and passed through material that traps nitrogen; the oxygen-enriched air is delivered continuously while the filters regenerate.",
    commonUses: [
      "Home oxygen for chronic lung disease, as prescribed",
      "Support during recovery from severe illness under medical guidance",
      "Facility-level oxygen supply in clinics and hospitals",
    ],
    whoOperates:
      "Patients and carers can run a prescribed concentrator after training; the prescription (flow rate and hours of use) comes from a doctor.",
    safeUse: [
      "Use only the flow rate a doctor prescribed — more is not better and can be harmful in some conditions.",
      "Keep the machine away from walls and curtains, in a ventilated space.",
      "Oxygen supports fire: no smoking, open flames or oil-based products near it.",
      "Keep nasal prongs clean and have a backup oxygen cylinder for power cuts.",
    ],
    limitations: [
      "It needs electricity; it cannot produce oxygen during a power failure.",
      "It is not a treatment for breathlessness in general — oxygen helps only when blood oxygen is genuinely low.",
      "Filters and sieve beds wear out and need servicing.",
    ],
    maintenance:
      "Regular filter cleaning by the user; professional servicing of sieve beds and compressors per manufacturer schedule.",
    whenProfessionalHelp: [
      "Worsening breathlessness, blue lips, confusion or drowsiness while on oxygen — emergency care; call 999.",
      "Never adjust oxygen flow yourself — speak to the prescribing doctor.",
    ],
    relatedSpecialties: ["Medicine & Diabetology", "Chest & Pulmonology"],
    icon: "Wind",
    author: CONTENT_AUTHOR,
    medicalReviewer: null,
    status: "PUBLISHED",
    publishedAt: D,
    updatedAt: D,
    reviewedAt: null,
    sources: [WHO_DEVICES, FDA_DEVICES],
  },
  {
    slug: "oxygen-cylinder",
    name: "Medical Oxygen Cylinder and Regulator",
    nameBn: "মেডিকেল অক্সিজেন সিলিন্ডার",
    summary:
      "A pressurised cylinder that stores oxygen for medical use — the backbone of emergency and home oxygen supply. Handling requires care: correct regulators, upright storage and fire safety.",
    category: "Treatment and Life-Support Equipment",
    image: "/images/library/equipment/oxygen-cylinder.png",
    whatItIs:
      "A steel or aluminium cylinder filled with oxygen under high pressure, fitted with a regulator that reduces and controls the flow to the patient.",
    whatItMeasures:
      "The regulator's gauge shows remaining pressure; the flow knob sets litres per minute as prescribed.",
    howItWorks:
      "The regulator steps the very high cylinder pressure down to a safe, steady flow through tubing to a mask or nasal prongs.",
    commonUses: [
      "Emergency and ambulance oxygen",
      "Home and hospice oxygen therapy when prescribed",
      "Backup supply during power cuts for concentrator users",
    ],
    whoOperates:
      "Trained staff, or patients and carers after proper instruction in handling, valve use and flow setting.",
    safeUse: [
      "Only use a regulator and tubing approved for medical oxygen.",
      "Keep the cylinder upright and secured so it cannot fall.",
      "No smoking or flames anywhere near oxygen equipment — fire risk is severe.",
      "Do not repair valves yourself; let suppliers handle refills and servicing.",
    ],
    limitations: [
      "Cylinders empty — the pressure gauge shows how much remains; plan refills ahead.",
      "High-pressure gas mishandled can cause serious injury.",
    ],
    maintenance:
      "Professional inspection, hydrostatic testing and refilling by licensed suppliers only.",
    whenProfessionalHelp: [
      "If someone on oxygen becomes drowsy, confused or more breathless — emergency care; call 999.",
    ],
    relatedSpecialties: ["Medicine & Diabetology", "Chest & Pulmonology"],
    icon: "Gauge",
    author: CONTENT_AUTHOR,
    medicalReviewer: null,
    status: "PUBLISHED",
    publishedAt: D,
    updatedAt: D,
    reviewedAt: null,
    sources: [WHO_DEVICES],
  },
  {
    slug: "ventilator",
    name: "Ventilator",
    nameBn: "ভেন্টিলেটর",
    summary:
      "The intensive-care machine that breathes for patients who cannot breathe adequately on their own. Operated exclusively by trained critical-care teams — this page only explains what it does.",
    category: "Treatment and Life-Support Equipment",
    image: "/images/library/equipment/ventilator.png",
    whatItIs:
      "A sophisticated machine that pushes controlled breaths of air (with or without extra oxygen) into a patient's lungs through a breathing tube, and monitors every phase of each breath.",
    whatItMeasures:
      "Continuously: airway pressures, delivered volumes, oxygen concentration and the patient's own breathing effort.",
    howItWorks:
      "Settings chosen by the intensive-care team (rate, volume, pressure, oxygen level) are delivered breath by breath, with alarms for any deviation; the team adjusts constantly as the patient's condition changes.",
    commonUses: [
      "Respiratory failure from severe pneumonia, asthma crises or sepsis",
      "Support during and after major surgery under anaesthesia",
      "Care of critically ill patients in ICUs and high-dependency units",
    ],
    whoOperates:
      "Intensivists, anaesthesiologists, and specially trained ICU nurses and respiratory therapists. Ventilators are never home devices.",
    safeUse: [
      "For families: the ICU team explains the machine and the plan — ask them anytime.",
      "For everyone: home-use 'BiPAP' devices for sleep apnoea are a different, gentler category, prescribed individually.",
    ],
    limitations: [
      "A ventilator supports breathing while treating the underlying illness — it is not a cure by itself.",
      "Being on a ventilator involves sedation, a breathing tube and ICU-level monitoring.",
    ],
    maintenance:
      "Strict protocols: daily safety checks, sterilised circuits between patients, alarm testing by biomedical engineers.",
    whenProfessionalHelp: [
      "Anyone with severe breathing difficulty needs emergency care (999) — do not wait or self-treat.",
    ],
    relatedSpecialties: ["Medicine & Diabetology", "Chest & Pulmonology", "Anesthesia"],
    icon: "Waves",
    author: CONTENT_AUTHOR,
    medicalReviewer: null,
    status: "PUBLISHED",
    publishedAt: D,
    updatedAt: D,
    reviewedAt: null,
    sources: [WHO_DEVICES, FDA_DEVICES],
  },
  {
    slug: "cpap-bipap",
    name: "CPAP / BiPAP Machine",
    nameBn: "সিপ্যাপ / বাইপ্যাপ মেশিন",
    summary:
      "A night-time breathing support device for sleep apnoea and some lung conditions, prescribed after a sleep study. The mask feels strange at first — most people adapt within weeks.",
    category: "Treatment and Life-Support Equipment",
    image: "/images/library/equipment/cpap-bipap.png",
    whatItIs:
      "A small bedside blower unit connected to a mask over the nose (or nose and mouth). CPAP holds one constant air pressure; BiPAP alternates between higher pressure on inhale and lower on exhale.",
    whatItMeasures:
      "Modern machines record usage hours, mask leak and remaining apnoea events — data your doctor reviews.",
    howItWorks:
      "The gentle air pressure acts like a splint keeping the upper airway open during sleep, preventing the collapses that cause snoring and oxygen dips.",
    commonUses: [
      "Obstructive sleep apnoea — heavy snoring with daytime sleepiness",
      "Selected chronic lung and neuromuscular conditions, as prescribed",
      "Sometimes short-term hospital use for breathing support",
    ],
    whoOperates:
      "The patient at home, after a doctor's prescription and pressure setting; sleep-medicine doctors review progress.",
    safeUse: [
      "Use it every night, all night — benefits depend on consistent use.",
      "Clean the mask, tubing and humidifier chamber on the recommended schedule.",
      "Report pressure settings to no one's discretion — only your doctor changes them.",
    ],
    limitations: [
      "Nasal congestion, mask leak and dryness are common early issues — fixable with mask refitting and humidification.",
      "It manages sleep apnoea; it does not cure it.",
    ],
    maintenance:
      "Regular filter changes, mask and circuit replacement on schedule, and periodic device checks.",
    whenProfessionalHelp: [
      "Severe daytime sleepiness despite treatment, or waking with gasping or chest pain — review with your doctor.",
    ],
    relatedSpecialties: ["Chest & Pulmonology", "Medicine & Diabetology", "Neurology"],
    icon: "Wind",
    author: CONTENT_AUTHOR,
    medicalReviewer: null,
    status: "PUBLISHED",
    publishedAt: D,
    updatedAt: D,
    reviewedAt: null,
    sources: [WHO_DEVICES, FDA_DEVICES],
  },
  {
    slug: "defibrillator",
    name: "Defibrillator",
    nameBn: "ডিফাইব্রিলেটর",
    summary:
      "The device that delivers a controlled electric shock to restart a heart in life-threatening rhythm arrest. Hospital and ambulance crews use manual units; public AEDs guide bystanders with voice prompts.",
    category: "Treatment and Life-Support Equipment",
    image: "/images/library/equipment/defibrillator.png",
    whatItIs:
      "A defibrillator (manual or automated AED) reads the heart's rhythm through pads on the chest and, when a shockable chaotic rhythm is detected, delivers a brief electric current to let the heart reset.",
    whatItMeasures:
      "The heart's electrical rhythm through the pads; manual units also display continuous ECG.",
    howItWorks:
      "During cardiac arrest the heart's chambers quiver chaotically (fibrillation); a timed shock briefly stops all electrical activity, giving the natural pacemaker a chance to resume an organised rhythm.",
    commonUses: [
      "Cardiac arrest — in hospitals, ambulances and public spaces with AEDs",
      "Planned cardioversion of certain abnormal rhythms in hospital",
    ],
    whoOperates:
      "Manual defibrillators: doctors, nurses and paramedics. Public AEDs: any bystander — the device decides whether a shock is needed and talks you through it.",
    safeUse: [
      "Call 999 first; start CPR; send someone for an AED if available.",
      "Ensure no one touches the patient when the shock is delivered — the AED says this clearly.",
      "AEDs are safe for lay users and will not shock a person who does not need it.",
    ],
    limitations: [
      "Defibrillation only helps shockable rhythms; CPR continues regardless.",
      "Survival falls with every minute — immediate CPR plus AED matters more than anything else.",
    ],
    maintenance:
      "Facility AEDs are checked on schedules (pads and battery expiry); hospital units are tested by biomedical staff.",
    whenProfessionalHelp: [
      "A person collapses and is unresponsive with no normal breathing — call 999, start CPR, use the AED immediately.",
    ],
    relatedSpecialties: ["Cardiology", "Medicine & Diabetology"],
    icon: "Zap",
    author: CONTENT_AUTHOR,
    medicalReviewer: null,
    status: "PUBLISHED",
    publishedAt: D,
    updatedAt: D,
    reviewedAt: null,
    sources: [WHO_DEVICES, FDA_DEVICES],
  },
  {
    slug: "infusion-pump",
    name: "Infusion Pump",
    nameBn: "ইনফিউশন পাম্প",
    summary:
      "A precision hospital pump that delivers fluids, medicines and nutrition into a vein at exactly the programmed rate. Nursing and pharmacy teams set and monitor it — accuracy is the whole point.",
    category: "Treatment and Life-Support Equipment",
    image: "/images/library/equipment/infusion-pump.png",
    whatItIs:
      "An electronic pump that pushes fluid from an IV bag through a drip set at a controlled rate — for example, millilitres per hour — with alarms for blockages, air and completion.",
    whatItMeasures:
      "Flow rate and delivered volume; modern pumps track the total infused and alert on any deviation.",
    howItWorks:
      "A mechanism (peristaltic fingers or piston) squeezes the tubing a precisely controlled amount per unit of time; safety software enforces dose limits.",
    commonUses: [
      "Continuous medication drips in ICUs and wards (for example, insulin, heart medicines)",
      "Chemotherapy and antibiotic courses requiring exact timing",
      "Fluid and nutrition support in patients who cannot drink",
    ],
    whoOperates:
      "Nurses program and monitor pumps based on doctors' orders; pharmacists check high-risk infusions.",
    safeUse: [
      "For patients and families: never press pump buttons — even 'silence'; call the nurse.",
      "Tell staff about redness, swelling or pain at the IV site.",
    ],
    limitations: [
      "Pumps are extremely reliable but depend on correct programming — hospitals use double-checks for high-risk drugs.",
    ],
    maintenance: "Scheduled calibration, software updates and alarm testing by biomedical teams.",
    whenProfessionalHelp: [
      "Any alarm you hear repeatedly, or a change in the patient's comfort — call the nurse immediately.",
    ],
    relatedSpecialties: ["Medicine & Diabetology", "Anesthesia"],
    icon: "Pill",
    author: CONTENT_AUTHOR,
    medicalReviewer: null,
    status: "PUBLISHED",
    publishedAt: D,
    updatedAt: D,
    reviewedAt: null,
    sources: [WHO_DEVICES, FDA_DEVICES],
  },
  {
    slug: "syringe-pump",
    name: "Syringe Pump",
    nameBn: "সিরিঞ্জ পাম্প",
    summary:
      "A small hospital pump that pushes a syringe very slowly and precisely — used for tiny, exact doses such as neonatal care, strong painkillers and ICU medicines.",
    category: "Treatment and Life-Support Equipment",
    image: "/images/library/equipment/syringe-pump.png",
    whatItIs:
      "A compact device that clamps a syringe and drives its plunger at a programmable, very low rate — often fractions of a millilitre per hour.",
    whatItMeasures:
      "Precise delivery rate and volume; displays show remaining time and syringe status.",
    howItWorks:
      "A stepper motor advances the plunger smoothly; because the syringe (not a drip set) is the reservoir, even minute flows stay accurate.",
    commonUses: [
      "Neonatal and paediatric intensive care, where doses are tiny",
      "Strong medicines requiring exact micro-rates in ICUs",
      "Labour analgesia and mobile transfer of critical patients",
    ],
    whoOperates:
      "ICU and neonatal nurses, anaesthesia teams — with dose double-checks for high-risk drugs.",
    safeUse: [
      "As with all pumps: families should not touch controls; call the nurse for anything.",
    ],
    limitations: [
      "Small volumes mean it must be watched closely — syringes empty faster than bags.",
    ],
    maintenance: "Biomedical calibration and alarm testing on schedule.",
    whenProfessionalHelp: [
      "In hospital settings the care team monitors these devices continuously.",
    ],
    relatedSpecialties: ["Medicine & Diabetology", "Pediatrics", "Anesthesia"],
    icon: "Syringe",
    author: CONTENT_AUTHOR,
    medicalReviewer: null,
    status: "PUBLISHED",
    publishedAt: D,
    updatedAt: D,
    reviewedAt: null,
    sources: [WHO_DEVICES, FDA_DEVICES],
  },
  {
    slug: "dialysis-machine",
    name: "Dialysis Machine",
    nameBn: "ডায়ালাইসিস মেশিন",
    summary:
      "The machine that filters waste and fluid from the blood when kidneys can no longer do it — a life-sustaining treatment given in dialysis centres, several hours at a time, on a fixed schedule.",
    category: "Treatment and Life-Support Equipment",
    image: "/images/library/equipment/dialysis-machine.png",
    whatItIs:
      "A haemodialysis machine that pumps blood out of the body through a filter (dialyser), cleans it of waste products and excess water, and returns it — typically 4 hours per session, 2–3 times a week.",
    whatItMeasures:
      "Blood flow rate, pressure across the filter, fluid removed, and dialysate composition — continuously checked by the machine.",
    howItWorks:
      "Blood flows on one side of the dialyser's membrane and a cleansing fluid on the other; wastes and excess water cross the membrane and are carried away, mimicking kidney filtration.",
    commonUses: [
      "Long-term treatment of kidney failure",
      "Emergency dialysis for poisoning or acute kidney injury",
      "Bridging patients waiting for kidney transplantation",
    ],
    whoOperates:
      "Dialysis nurses and technicians operate the machines; nephrologists prescribe each patient's dialysis plan.",
    safeUse: [
      "For patients: keep your dialysis schedule strictly — missed sessions are dangerous.",
      "Protect the fistula/graft arm: no blood pressure cuffs, tight bands or needles there.",
      "Follow the fluid and diet limits given by the care team.",
    ],
    limitations: [
      "Dialysis replaces filtration, not all kidney functions; medicines and diet remain essential.",
      "Session frequency and duration cannot be safely reduced without a doctor's decision.",
    ],
    maintenance:
      "Machines are disinfected between patients and maintained by biomedical engineering; water treatment is rigorously monitored.",
    whenProfessionalHelp: [
      "Missed dialysis with breathlessness, swelling or reduced urine — contact the dialysis centre urgently.",
      "Chest pain, severe breathlessness or bleeding from the access site — emergency care.",
    ],
    relatedSpecialties: ["Nephrology", "Medicine & Diabetology"],
    icon: "Droplets",
    author: CONTENT_AUTHOR,
    medicalReviewer: null,
    status: "PUBLISHED",
    publishedAt: D,
    updatedAt: D,
    reviewedAt: null,
    sources: [WHO_DEVICES],
  },
  {
    slug: "anesthesia-machine",
    name: "Anesthesia Machine",
    nameBn: "অ্যানেস্থেসিয়া মেশিন",
    summary:
      "The operating-theatre workstation that keeps anaesthetised patients breathing with precise gas mixtures. Operated solely by anaesthesia specialists — one of the most safety-critical devices in the hospital.",
    category: "Treatment and Life-Support Equipment",
    image: "/images/library/equipment/anesthesia-machine.png",
    whatItIs:
      "A system that blends medical gases (oxygen, air, nitrous oxide) with volatile anaesthetic agents, delivers them to the patient through a breathing circuit, and removes exhaled carbon dioxide.",
    whatItMeasures:
      "Continuously: gas concentrations, airway pressure, breathed oxygen and carbon dioxide levels, plus integrated patient monitors for heart, oxygen saturation and blood pressure.",
    howItWorks:
      "Vaporisers turn liquid anaesthetic into precise concentrations; ventilator bellows drive each breath; absorbers scrub carbon dioxide from rebreathed gas; exhaustive alarms watch every parameter.",
    commonUses: [
      "General anaesthesia for surgery",
      "Sedation for procedures in endoscopy, radiology and emergency rooms",
      "Support of critical airway and breathing management",
    ],
    whoOperates:
      "Anaesthesiologists and trained anaesthesia assistants — exclusively.",
    safeUse: [
      "For patients: answer the pre-anaesthesia questions fully (medicines, allergies, fasting, loose teeth) — they exist for safety.",
      "Fasting before anaesthesia is a hard rule: food in the stomach during anaesthesia can be life-threatening.",
    ],
    limitations: [
      "This is a hospital-only, specialist-operated device with no home or untrained use whatsoever.",
    ],
    maintenance:
      "Daily checks before every theatre list, scheduled servicing, gas-leak and calibration tests by specialist engineers.",
    whenProfessionalHelp: [
      "All anaesthesia is delivered in medical facilities — any questions before surgery should go to the anaesthetist.",
    ],
    relatedSpecialties: ["Anesthesia", "General & Laparoscopic Surgery"],
    icon: "Waves",
    author: CONTENT_AUTHOR,
    medicalReviewer: null,
    status: "PUBLISHED",
    publishedAt: D,
    updatedAt: D,
    reviewedAt: null,
    sources: [WHO_DEVICES, FDA_DEVICES],
  },
];
