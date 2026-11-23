/**
 * Library image generator — background job.
 * Generates all education-library images (equipment, symptoms, children,
 * family/community galleries) sequentially with retry + resume support.
 * Run: bun scripts/generate-library-images.ts
 */
import ZAI from "z-ai-web-dev-sdk";
import fs from "fs";
import path from "path";

const OUT = "/home/z/my-project/public/images/library";

// The SDK's generation size literals (must match z-ai-web-dev-sdk typings).
type GenSize = Parameters<
  import("z-ai-web-dev-sdk").default["images"]["generations"]["create"]
>[0]["size"];
type Item = { slug: string; dir: string; prompt: string; size: GenSize };

const EQ =
  "Professional 3D render of a", EQ_TAIL =
  ", realistic modern medical equipment, accurate recognizable design, soft sky blue and white clean studio background, navy and teal accents, soft studio lighting, Blender 3D style, high detail, no text, no labels, no branding";
const SY =
  "Clean modern medical education illustration of", SY_TAIL =
  ", soft pastel sky blue background, teal and navy accents, flat design with soft gradients, calm respectful educational style, minimal composition, no text, no labels";
const CH =
  "Warm respectful 3D illustration of", CH_TAIL =
  ", Bangladeshi people, soft natural sunlight, clean modern style, sky blue teal and white palette, dignified friendly atmosphere, high detail, no text";

const equipment: Item[] = [
  { slug: "blood-pressure-monitor", prompt: "digital blood pressure monitor with arm cuff and display", },
  { slug: "manual-bp-apparatus", prompt: "aneroid sphygmomanometer blood pressure apparatus with arm cuff, bulb and round dial gauge" },
  { slug: "thermometer", prompt: "digital medical thermometer with probe tip" },
  { slug: "infrared-thermometer", prompt: "non-contact infrared forehead thermometer gun" },
  { slug: "pulse-oximeter", prompt: "fingertip pulse oximeter clip device" },
  { slug: "glucometer", prompt: "blood glucose meter with test strip and lancet" },
  { slug: "ecg-machine", prompt: "ECG electrocardiograph machine with lead cables and waveform paper" },
  { slug: "multiparameter-monitor", prompt: "hospital multiparameter patient monitor with screen showing colorful vital sign waveforms" },
  { slug: "weighing-scale", prompt: "digital medical weighing scale for adults" },
  { slug: "spirometer", prompt: "desktop spirometer lung function testing device with mouthpiece and tube" },
  { slug: "stethoscope", prompt: "professional stethoscope" },
  { slug: "medical-imaging", prompt: "medical imaging department concept with X-ray, CT and ultrasound machines together" },
  { slug: "ultrasound-machine", prompt: "modern ultrasound machine with monitor, keyboard and transducer probe" },
  { slug: "x-ray-machine", prompt: "medical X-ray machine with overhead tube arm and patient table" },
  { slug: "ct-scanner", prompt: "CT scanner machine with large circular gantry opening" },
  { slug: "mri-scanner", prompt: "MRI scanner machine with wide bore tunnel" },
  { slug: "mammography-machine", prompt: "mammography breast screening X-ray machine" },
  { slug: "dexa-scanner", prompt: "DEXA bone densitometry scanner with padded table and overhead arm" },
  { slug: "eeg-machine", prompt: "EEG electroencephalography machine with electrode cap and brain wave traces" },
  { slug: "emg-machine", prompt: "EMG nerve conduction study machine with electrodes and cables" },
  { slug: "endoscopy-system", prompt: "endoscopy tower system with monitor and flexible endoscope" },
  { slug: "echocardiography-machine", prompt: "echocardiography heart ultrasound machine with phased array probe" },
  { slug: "oxygen-concentrator", prompt: "home oxygen concentrator machine with flowmeter knob" },
  { slug: "oxygen-cylinder", prompt: "medical oxygen cylinder with pressure regulator valve" },
  { slug: "nebulizer", prompt: "nebulizer compressor machine with mask and medicine chamber" },
  { slug: "ventilator", prompt: "ICU ventilator machine with screen and breathing circuit" },
  { slug: "cpap-bipap", prompt: "CPAP BiPAP therapy device with face mask and tubing" },
  { slug: "defibrillator", prompt: "hospital defibrillator with ECG screen and paddles" },
  { slug: "infusion-pump", prompt: "IV infusion pump device with drip chamber and control panel" },
  { slug: "syringe-pump", prompt: "precision syringe infusion pump with syringe loaded" },
  { slug: "dialysis-machine", prompt: "hemodialysis machine with blood tubing lines" },
  { slug: "anesthesia-machine", prompt: "anesthesia workstation machine with vaporizers and breathing circuit" },
].map((x) => ({ ...x, dir: "equipment", prompt: `${EQ} ${x.prompt}${EQ_TAIL}`, size: "1152x864" }));

const symptoms: Item[] = [
  { slug: "fever", prompt: "fever concept, tired person under blanket with a thermometer" },
  { slug: "headache", prompt: "headache concept, gentle pressure around the head" },
  { slug: "dizziness", prompt: "dizziness concept, spinning sensation around a standing person" },
  { slug: "persistent-fatigue", prompt: "persistent fatigue concept, tired person resting head on a desk" },
  { slug: "weakness", prompt: "body weakness concept, low energy person sitting with little strength" },
  { slug: "unexplained-weight-loss", prompt: "unexplained weight loss concept, measuring tape hanging loosely" },
  { slug: "loss-of-appetite", prompt: "loss of appetite concept, an untouched plate of food" },
  { slug: "sleep-problems", prompt: "sleep problems concept, person lying awake in bed at night" },
  { slug: "dehydration", prompt: "dehydration concept, empty water glass and dry feeling under sun" },
  { slug: "body-swelling", prompt: "body swelling concept, puffy feet and ankles" },
  { slug: "cough", prompt: "cough concept, person gently covering mouth while coughing" },
  { slug: "shortness-of-breath", prompt: "shortness of breath concept, tight chest and effortful breathing" },
  { slug: "chest-discomfort", prompt: "chest discomfort concept, gentle pressure feeling in the chest" },
  { slug: "palpitations", prompt: "heart palpitations concept, racing heartbeat feeling" },
  { slug: "wheezing", prompt: "wheezing concept, narrowed airways with whistling airflow" },
  { slug: "sore-throat", prompt: "sore throat concept, irritated throat feeling while swallowing" },
  { slug: "abdominal-pain", prompt: "abdominal pain concept, person holding stomach gently" },
  { slug: "nausea-vomiting", prompt: "nausea concept, queasy unsettled feeling" },
  { slug: "diarrhea", prompt: "digestive upset concept, water balance in the body" },
  { slug: "constipation", prompt: "constipation concept, slow blocked digestion" },
  { slug: "heartburn", prompt: "heartburn concept, burning feeling rising toward the chest" },
  { slug: "skin-problems", prompt: "skin rash concept, patches on the arm" },
  { slug: "itching", prompt: "itching concept, hand scratching an arm" },
  { slug: "joint-pain", prompt: "joint pain concept, aching knee and hand joints" },
  { slug: "back-pain", prompt: "back pain concept, aching lower back while sitting" },
  { slug: "blurred-vision", prompt: "blurred vision concept, out of focus scene with glasses" },
  { slug: "hearing-problems", prompt: "hearing difficulty concept, muted sound waves near the ear" },
  { slug: "painful-urination", prompt: "urinary discomfort educational concept, gentle abstract" },
  { slug: "unusual-bleeding", prompt: "understanding unusual bleeding, gentle medical concept with a small bandage" },
  { slug: "numbness-tingling", prompt: "numbness and tingling concept, pins and needles in the hand" },
  { slug: "high-blood-pressure", prompt: "high blood pressure concept, heart with pressure gauge" },
  { slug: "diabetes-education", prompt: "diabetes education concept, glucose meter beside healthy food" },
].map((x) => ({ ...x, dir: "symptoms", prompt: `${SY} ${x.prompt}${SY_TAIL}`, size: "1152x864" }));

const children: Item[] = [
  { slug: "newborn-0-28-days", prompt: "a sleeping newborn baby aged 0 to 28 days wrapped in a soft cloth" },
  { slug: "infant-1-6-months", prompt: "a healthy infant aged 1 to 6 months lying and looking around" },
  { slug: "infant-6-12-months", prompt: "a cheerful infant aged 6 to 12 months sitting and playing" },
  { slug: "toddler-1-2-years", prompt: "a toddler aged 1 to 2 years taking first steps" },
  { slug: "preschool-3-5-years", prompt: "a preschool child aged 3 to 5 years playing with blocks" },
  { slug: "school-age-6-9-years", prompt: "a school-age child aged 6 to 9 years reading a book happily" },
  { slug: "older-child-10-12-years", prompt: "an older child aged 10 to 12 years riding a bicycle" },
  { slug: "adolescent-13-17-years", prompt: "a confident adolescent aged 13 to 17 years with a backpack" },
  { slug: "pediatric-doctor-exam", prompt: "a kind pediatric doctor examining a young child with a stethoscope" },
  { slug: "child-vaccination", prompt: "a nurse giving a gentle vaccine to a child held by a parent" },
  { slug: "child-growth-monitoring", prompt: "a health worker measuring a child's height on a growth chart" },
  { slug: "mother-newborn-care", prompt: "a mother tenderly caring for her newborn baby" },
  { slug: "father-child-care", prompt: "a father lovingly holding and caring for his young child" },
  { slug: "family-pediatric-visit", prompt: "parents visiting a pediatric clinic with their child" },
  { slug: "pediatric-hospital-env", prompt: "a bright friendly pediatric hospital room for children" },
].map((x) => ({ ...x, dir: "children", prompt: `${CH} ${x.prompt}${CH_TAIL}`, size: "864x1152" }));

const family: Item[] = [
  { slug: "nuclear-family", prompt: "a happy Bangladeshi nuclear family of parents and two children together at home" },
  { slug: "joint-family", prompt: "a Bangladeshi joint family with grandparents, parents and children" },
  { slug: "family-doctor-visit", prompt: "parents and children visiting a doctor together" },
  { slug: "grandparents-care", prompt: "grandparents receiving warm healthcare support from family" },
  { slug: "family-booking-phone", prompt: "a family using a smartphone to book a doctor appointment together" },
  { slug: "family-hospital-consultation", prompt: "a family attending a hospital consultation room" },
  { slug: "rural-health-center", prompt: "a rural healthcare center building in a Bangladeshi village" },
  { slug: "doctor-rural-visit", prompt: "a doctor visiting a rural community in Bangladesh" },
  { slug: "community-awareness", prompt: "a community health awareness program in a Bangladeshi village courtyard" },
  { slug: "health-camp", prompt: "medical professionals conducting a health camp in the community" },
  { slug: "mobile-medical-service", prompt: "a mobile medical service van bringing care to a village" },
  { slug: "village-health-education", prompt: "healthcare education session in a Bangladeshi village" },
  { slug: "respectful-care", prompt: "a patient receiving respectful, dignified medical care regardless of income" },
  { slug: "rural-maternal-care", prompt: "a rural mother receiving gentle maternal healthcare from a female doctor" },
  { slug: "elderly-assistance", prompt: "an elderly patient being kindly assisted at a clinic" },
  { slug: "community-clinic-exam", prompt: "a doctor examining a patient at a community clinic with care" },
  { slug: "affordable-diagnostics", prompt: "a patient receiving affordable diagnostic services at a center" },
  { slug: "health-volunteers", prompt: "healthcare volunteers supporting a community with smiles" },
].map((x) => ({ ...x, dir: "family", prompt: `${CH} ${x.prompt}${CH_TAIL}`, size: "1344x768" }));

const ALL = [...equipment, ...symptoms, ...children, ...family];

function log(msg: string) {
  fs.appendFileSync("/tmp/imggen-progress.log", msg + "\n");
  console.log(msg);
}

async function main() {
  for (const dir of ["equipment", "symptoms", "children", "family"]) {
    fs.mkdirSync(path.join(OUT, dir), { recursive: true });
  }
  const zai = await ZAI.create();
  let done = 0, failed = 0, skipped = 0;
  log(`START total=${ALL.length} at ${new Date().toISOString()}`);
  for (const item of ALL) {
    const file = path.join(OUT, item.dir, `${item.slug}.png`);
    if (fs.existsSync(file) && fs.statSync(file).size > 10000) {
      skipped++;
      continue;
    }
    let ok = false;
    for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
      try {
        const res = await zai.images.generations.create({ prompt: item.prompt, size: item.size });
        const b64 = res?.data?.[0]?.base64;
        if (!b64) throw new Error("empty base64");
        fs.writeFileSync(file, Buffer.from(b64, "base64"));
        ok = true;
      } catch (e: any) {
        log(`RETRY ${item.dir}/${item.slug} attempt ${attempt}: ${String(e?.message || e).slice(0, 120)}`);
        await new Promise((r) => setTimeout(r, 15000 * attempt));
      }
    }
    if (ok) { done++; log(`OK [${done + skipped}/${ALL.length}] ${item.dir}/${item.slug}`); }
    else { failed++; log(`FAIL ${item.dir}/${item.slug}`); }
    await new Promise((r) => setTimeout(r, 3000));
  }
  log(`END done=${done} skipped=${skipped} failed=${failed} at ${new Date().toISOString()}`);
}
main().catch((e) => { log("FATAL " + String(e?.message || e)); process.exit(1); });
