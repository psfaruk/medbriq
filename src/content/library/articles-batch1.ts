import type { Article } from "../types";
import { CONTENT_AUTHOR } from "../types";

/**
 * Health Library articles — batch 1 (demo dataset).
 *
 * Same honesty rules as articles.ts: items are marked PUBLISHED so the demo
 * portal shows a working library, but medicalReviewer is deliberately null —
 * the standing UI label is "Medical review: pending". Before any real public
 * launch, a qualified medical professional must review each item and the
 * reviewer fields must be filled in honestly.
 *
 * Content is educational only: no diagnosis, no prescriptions, no treatment
 * claims, no fear-based wording. Emergency guidance is limited to nationally
 * recognised routes (Bangladesh: 999 emergency, 16263 government health
 * helpline) and clearly framed danger-sign awareness.
 */

export const ARTICLES_BATCH1: Article[] = [
  {
    slug: "safe-drinking-water",
    title: "Safe Drinking Water at Home: Simple Habits That Protect Your Family",
    titleBn: "নিরাপদ খাবার পানি: বাড়িতে করণীয়",
    summary:
      "In Bangladesh, unsafe drinking water is a common cause of illness. Boiling water at a rolling boil for one minute and storing it in a covered, narrow-mouthed container are two simple habits that protect the whole family.",
    category: "general-health",
    keyPoints: [
      "Water that looks clear can still carry germs — boiling at a rolling boil for at least one minute makes it much safer.",
      "Store drinking water covered, in a narrow-mouthed container, pouring it out or using a dedicated clean ladle.",
      "Boiling matters most when the source is doubtful and during floods, when wells and ponds are easily contaminated.",
      "Home filters help only when cleaned and maintained on schedule; safely stored boiled water is a dependable alternative.",
    ],
    sections: [
      {
        heading: "Why water safety matters",
        body:
          "In Bangladesh, unsafe drinking water is one of the most common causes of waterborne illness. Water from ponds, open wells or old tube-wells can carry germs that cause diarrhoea, vomiting and typhoid fever — even when it looks clear and tastes normal. Young children and older family members are usually affected first.\n\nThe encouraging part is that a small number of household habits make drinking water much safer. Two habits do most of the work: boiling water properly, and storing it safely afterwards.",
      },
      {
        heading: "Boiling water the right way",
        body:
          "Boiling is one of the most reliable ways to make water safe at home. Bring the water to a rolling boil — large bubbles rising steadily from the bottom — and keep it boiling for at least one full minute. Water that has only been warmed until it steams, or shows small bubbles at the edges, has not been boiled long enough.\n\nAfter boiling, let the water cool with a cover on, then pour it into a clean storage container. Boiled water kept covered can be used for drinking and preparing food over the next day or so.",
      },
      {
        heading: "Storing water safely",
        body:
          "Safe storage protects boiled water from recontamination, which often happens through hands or cups dipped into the pot:\n\n• Store drinking water in a covered container.\n• A narrow-mouthed container is safer than a wide, open pot, because hands and dust find it harder to get in.\n• Pour water out, or use a clean cup or ladle kept only for that container — avoid dipping hands or used glasses.\n• Clean the container with soap and clean water regularly, and rinse well.",
      },
      {
        heading: "When boiling matters most",
        body:
          "Some households boil all drinking water as a routine; others boil only at certain times. Boiling matters most when the source is doubtful — pond water, an old or poorly maintained tube-well, or a supply that has been interrupted. Floods deserve particular care: flood water mixes with wells, latrines and ponds, so all drinking water should be boiled until the source is confirmed safe again. Families with a young baby, an elderly member or someone recovering from illness often choose to boil routinely.",
      },
      {
        heading: "A word on filters",
        body:
          "Home water filters are popular, and many work well — but a filter protects only when it is maintained. Candles and cartridges that are not cleaned or replaced on schedule can themselves grow germs, making water less safe rather than more. Follow the cleaning and replacement instructions exactly, and give filtered water the same safe storage as boiled water. If maintaining a filter is not realistic, properly boiled and safely stored water remains a dependable choice.",
      },
    ],
    whenToSeekHelp: [
      "If someone has diarrhoea with signs of dehydration — a very dry mouth, passing little urine, unusual drowsiness — seek care from a health professional promptly.",
      "Blood in the stool, or diarrhoea with high fever, should always be assessed by a doctor.",
    ],
    author: CONTENT_AUTHOR,
    medicalReviewer: null,
    status: "PUBLISHED",
    publishedAt: "2026-11-20",
    updatedAt: "2026-11-20",
    reviewedAt: null,
    sources: [
      {
        title: "Drinking-water",
        publisher: "World Health Organization",
        url: "https://www.who.int/news-room/fact-sheets/detail/drinking-water",
      },
      {
        title: "Water, Sanitation and Hygiene (WASH)",
        publisher: "UNICEF",
        url: "https://www.unicef.org/wash",
      },
    ],
    relatedSlugs: ["hand-hygiene-basics", "sun-and-heat-safety"],
    emergencyNote: null,
  },
  {
    slug: "sun-and-heat-safety",
    title: "Sun and Heat Safety: Staying Well Through the Hot Months",
    titleBn: "রোদ ও গরমে সুরক্ষা: গরম মৌসুমে সুস্থ থাকুন",
    summary:
      "Bangladesh summers bring long stretches of heat and humidity. Sensible timing, steady hydration and light clothing prevent most heat illness — and knowing the difference between heat exhaustion and heat stroke tells you exactly when to call for help.",
    category: "general-health",
    keyPoints: [
      "Plan outdoor work and travel for early morning or late afternoon, and rest in the shade during the hottest hours.",
      "Drink water regularly through the day — do not wait until you feel very thirsty.",
      "Light-coloured, loose clothing helps the body release heat.",
      "Heat exhaustion — heavy sweating, weakness, dizziness, nausea — calls for rest, shade and fluids.",
      "Hot dry skin with confusion or collapse is heat stroke: call 999 immediately. Never leave children in parked vehicles.",
    ],
    sections: [
      {
        heading: "Why heat is a health risk",
        body:
          "Your body cools itself mainly by sweating. In the hot, humid months of a Bangladesh summer, sweat evaporates more slowly, so the body has to work harder to stay cool. Long hours outdoors, physical work and not drinking enough water can then lead to heat illness. Young children, older adults and people with long-term health conditions feel the effects of heat sooner than others.",
      },
      {
        heading: "Planning your day around the heat",
        body:
          "Where possible, schedule outdoor work, travel and exercise for the early morning or late afternoon, and avoid the midday sun. Take breaks in the shade, wear a hat or use an umbrella, and choose light-coloured, loose-fitting clothing that lets air circulate. If a task cannot be moved, break it into shorter periods with rest and water in between.",
      },
      {
        heading: "Staying hydrated",
        body:
          "Drink water regularly through the day, in small amounts and often, rather than waiting until you feel very thirsty — by then the body is already short on water. Carry water when you go out, and offer children drinks frequently, as they may not ask. Outdoor workers need the most care, especially on days when both heat and humidity are high.",
      },
      {
        heading: "Heat exhaustion and heat stroke",
        body:
          "Heat exhaustion usually develops after long exposure to heat. Typical signs are heavy sweating, weakness, dizziness, nausea, headache and sometimes cramps. The right response is to stop the activity, move to a cool shaded place, loosen clothing, and sip water. Most people recover with rest.\n\nHeat stroke is different and is a medical emergency. Warning signs include skin that feels hot and dry (sweating may stop), confusion, slurred speech, unusual behaviour or collapse. If you see these signs, call 999 immediately, move the person to shade, and cool them with wet cloths or whatever is available while waiting for help.",
      },
      {
        heading: "Children and parked vehicles",
        body:
          "The inside of a parked vehicle heats up remarkably quickly, even on a mild day and even with a window slightly open. Never leave a child — or a pet — waiting in a parked car, even for a short errand. Make it a habit to check the back seat before locking the vehicle.",
      },
    ],
    whenToSeekHelp: [
      "If someone with heat exhaustion cannot keep fluids down or is not improving after resting in a cool place, have them assessed by a health professional.",
      "Older family members and people with long-term conditions who feel unwell in hot weather should be checked by a doctor.",
      "Confusion, hot dry skin or collapse in the heat is an emergency — call 999 at once.",
    ],
    author: CONTENT_AUTHOR,
    medicalReviewer: null,
    status: "PUBLISHED",
    publishedAt: "2026-11-20",
    updatedAt: "2026-11-20",
    reviewedAt: null,
    sources: [
      {
        title: "Climate change, heat and health",
        publisher: "World Health Organization",
        url: "https://www.who.int/news-room/fact-sheets/detail/climate-change-heat-and-health",
      },
      {
        title: "Heat exhaustion",
        publisher: "Mayo Clinic",
        url: "https://www.mayoclinic.org/diseases-conditions/heat-exhaustion/symptoms-causes/syc-20373250",
      },
    ],
    relatedSlugs: ["safe-drinking-water", "physical-activity-guidelines"],
    emergencyNote: null,
  },
  {
    slug: "balanced-diet-basics",
    title: "Balanced Diet Basics: Building a Healthy Everyday Plate",
    titleBn: "সুষম খাদ্য: দৈনন্দিন পাতে কী থাকা উচিত",
    summary:
      "A balanced plate does not need expensive foods. Vegetables, protein and staples in sensible proportions — with affordable options like eggs, lentils and seasonal vegetables — meet most families' needs.",
    category: "nutrition",
    keyPoints: [
      "At main meals, picture the plate: about half vegetables, a quarter protein, a quarter staples.",
      "WHO recommends at least 400 g of fruit and vegetables a day, whole grains, and varied protein sources.",
      "Eggs, lentils, seasonal vegetables and small fish are affordable, nutritious choices in Bangladesh.",
      "Portion awareness — eating slowly and stopping when satisfied — is part of balanced eating.",
      "Variety across the week matters more than any single perfect meal.",
    ],
    sections: [
      {
        heading: "What a balanced diet means",
        body:
          "No single food provides everything the body needs. A balanced diet combines different kinds of foods: staples such as rice or roti for energy, protein foods for growth and repair, vegetables and fruits for vitamins, minerals and fibre, and a small amount of fat. Traditional Bangladeshi meals can be perfectly balanced — the key is variety and proportion, not expensive or imported foods.",
      },
      {
        heading: "A practical plate",
        body:
          "Picture the plate at a main meal. Roughly half should be vegetables — bhaji, leafy greens, or plain cooked vegetables. A quarter should be protein — fish, eggs, dal, chicken or meat. The remaining quarter is the staple — rice or roti — in a moderate portion. Add a seasonal fruit when you can. You do not need to weigh anything; this simple plate picture guides most meals, and it works for breakfast too: pair the staple with a protein such as an egg or dal rather than eating it alone.",
      },
      {
        heading: "WHO's healthy diet principles",
        body:
          "The World Health Organization recommends at least 400 grams of fruit and vegetables a day (potatoes and other starchy roots do not count), whole grains such as brown rice or whole-wheat flour in place of refined grains where possible, protein from a variety of sources, and limits on salt, free sugars and heavily processed foods. You can read more about salt and sugar limits in our dedicated article on the topic.",
      },
      {
        heading: "Affordable nutrition in Bangladesh",
        body:
          "Good nutrition does not require costly foods. Eggs and lentils are inexpensive, widely available sources of protein; seasonal vegetables are cheapest and freshest at the time of year they are harvested; and small local fish add valuable nutrients to family meals. Dried pulses keep well, so stocking dal and beans during tighter weeks helps keep meals balanced.",
      },
      {
        heading: "Portions matter too",
        body:
          "How much we eat matters as much as what we eat. Eating slowly, stopping when satisfied rather than over-full, and keeping an eye on extra-large servings of rice all help. If a main meal is lighter than usual, balance it over the rest of the day rather than worrying about a single meal.",
      },
    ],
    whenToSeekHelp: [
      "If you are losing or gaining weight without trying, or feel unusually tired for weeks, discuss it with a doctor.",
      "People living with diabetes, kidney disease or other long-term conditions should ask their doctor how these general principles apply to them.",
    ],
    author: CONTENT_AUTHOR,
    medicalReviewer: null,
    status: "PUBLISHED",
    publishedAt: "2026-11-20",
    updatedAt: "2026-11-20",
    reviewedAt: null,
    sources: [
      {
        title: "Healthy diet",
        publisher: "World Health Organization",
        url: "https://www.who.int/news-room/fact-sheets/detail/healthy-diet",
      },
      {
        title: "Nutrition",
        publisher: "UNICEF",
        url: "https://www.unicef.org/nutrition",
      },
    ],
    relatedSlugs: ["salt-and-sugar-awareness", "physical-activity-guidelines", "antenatal-checkups-explained"],
    emergencyNote: null,
  },
  {
    slug: "salt-and-sugar-awareness",
    title: "Salt and Sugar: How Much Is Too Much?",
    titleBn: "লবণ ও চিনি: কতটুকু খাওয়া ঠিক?",
    summary:
      "WHO advises adults to stay under 5 grams of salt a day and to keep free sugars below 10% of daily energy. Knowing where salt and sugar hide — from chanachur to sweet drinks — makes the limits easier to reach.",
    category: "nutrition",
    keyPoints: [
      "WHO advises adults to keep salt under 5 grams a day — about one level teaspoon, from all sources.",
      "Keep free sugars below 10% of daily energy intake; below 5% is even better.",
      "Free sugars include sugar added to drinks and food, plus honey, syrups and fruit juice — not whole fruit.",
      "Big hidden sources: pickles, chanachur, dried fish, sauces, biscuits and sweet drinks.",
      "Taste before adding salt, swap sweet drinks for water, and check labels when buying packaged foods.",
    ],
    sections: [
      {
        heading: "Why the amounts matter",
        body:
          "The body needs only a little salt and sugar to function. The concern is the amounts most of us eat without noticing. Over years, a high-salt diet raises the risk of high blood pressure, which strains the heart, kidneys and blood vessels. Regularly consuming too much sugar adds extra energy the body does not need, contributing to weight gain and dental problems. The encouraging news is that small, steady reductions made now make a real difference over time.",
      },
      {
        heading: "WHO's recommended limits",
        body:
          "For adults, the World Health Organization recommends less than 5 grams of salt a day — about one level teaspoon, from all sources combined. Children need even less, in proportion to their energy needs. For free sugars — sugars added to food and drinks by the maker, the cook, or naturally present in honey, syrups and fruit juice — the advice is to stay below 10% of daily energy intake, and below 5% for additional benefit. Sugars inside whole fruit are not counted as free sugars.",
      },
      {
        heading: "Where salt and sugar hide",
        body:
          "Most dietary salt and sugar is already in food before it reaches the table:\n\n• Achar and pickles, and salty snacks such as chanachur\n• Dried fish (shutki), which is often heavily salted\n• Cooking sauces, stock cubes and instant-noodle seasoning packets\n• Biscuits, cakes and sweetened breakfast cereals\n• Sweet tea, soft drinks and packaged juice drinks",
      },
      {
        heading: "Simple swaps that work",
        body:
          "Taste food before adding extra salt at the table. Season with lemon, garlic, ginger and spices instead of reaching for the salt shaker. Soaking and rinsing salted dried fish removes some of the salt. Swap chanachur for fresh fruit or unsalted roasted chickpeas when you can. Reduce the sugar in tea gradually — taste buds adjust within a few weeks. Offer children water or whole fruit rather than sweet drinks.",
      },
      {
        heading: "Reading labels",
        body:
          "Packaged foods list their sodium and sugar content, usually per 100 grams, which makes comparing two products straightforward. As a rule of thumb, salt is roughly 2.5 times the sodium figure. A quick habit of checking labels — before putting a product in the basket — builds awareness of where the family's salt and sugar is really coming from.",
      },
    ],
    whenToSeekHelp: [
      "If you have high blood pressure, diabetes or kidney disease, ask your doctor how salt and sugar limits apply to your situation.",
      "Parents of young children can ask a health worker about age-appropriate foods, since small children need even less salt than adults.",
    ],
    author: CONTENT_AUTHOR,
    medicalReviewer: null,
    status: "PUBLISHED",
    publishedAt: "2026-11-20",
    updatedAt: "2026-11-20",
    reviewedAt: null,
    sources: [
      {
        title: "Salt reduction",
        publisher: "World Health Organization",
        url: "https://www.who.int/news-room/fact-sheets/detail/salt-reduction",
      },
      {
        title: "Healthy diet",
        publisher: "World Health Organization",
        url: "https://www.who.int/news-room/fact-sheets/detail/healthy-diet",
      },
      {
        title: "How Much Sodium Should I Eat per Day?",
        publisher: "American Heart Association",
        url: "https://www.heart.org/en/healthy-living/healthy-eating/eat-smart/sodium/how-much-sodium-should-i-eat-per-day",
      },
    ],
    relatedSlugs: ["balanced-diet-basics", "physical-activity-guidelines"],
    emergencyNote: null,
  },
  {
    slug: "physical-activity-guidelines",
    title: "Physical Activity Guidelines: How Much Movement Your Body Needs",
    titleBn: "শরীরচর্চার নির্দেশিকা: কতটুকু সক্রিয় থাকা দরকার",
    summary:
      "WHO's 2020 guidelines set clear targets: 150-300 minutes of moderate activity a week for adults, an hour a day for children, and balance work for older adults. Every movement counts, and it is never too late to start.",
    category: "fitness-exercise",
    keyPoints: [
      "Adults: 150-300 minutes of moderate activity per week, plus muscle-strengthening exercise on at least two days.",
      "Children and adolescents: an average of 60 minutes of moderate-to-vigorous activity every day.",
      "Older adults: add balance and strength activities on three or more days a week to help prevent falls.",
      "If you have been inactive, start with short walks — every movement counts, and consistency beats intensity.",
      "In hot climates, early morning and evening are the safest times for outdoor activity.",
    ],
    sections: [
      {
        heading: "What WHO's 2020 guidelines say",
        body:
          "In 2020 the World Health Organization published updated guidelines on physical activity and sedentary behaviour for all age groups. The headline message is reassuring: some activity is always better than none, more is better still, and every bit of movement throughout the day counts toward better health. The guidelines set clear weekly targets by age.",
      },
      {
        heading: "Adults (18-64 years)",
        body:
          "Adults should aim for 150 to 300 minutes of moderate-intensity aerobic activity per week — brisk walking, cycling, or active household work are all counted — or 75 to 150 minutes of vigorous activity. On top of this, muscle-strengthening exercise involving the major muscle groups is recommended on at least two days a week. This can be simple: push-ups, squats, carrying shopping or children, or exercises at home. Long periods of sitting should be broken up with brief movement.",
      },
      {
        heading: "Children and older adults",
        body:
          "Children and adolescents aged 5 to 17 should average at least 60 minutes of moderate-to-vigorous activity every day, with variety across the week, alongside limits on long stretches of sitting and recreational screen time. For older adults, the aerobic and strengthening targets are similar to adults, with an addition: activities that improve balance and strength — for example walking on varied surfaces, or standing exercises — are recommended on three or more days a week to help prevent falls.",
      },
      {
        heading: "Starting slowly if you have been inactive",
        body:
          "If you have not been active for a while, begin small. A ten-minute walk after a meal is a genuine start. Build up gradually over weeks, adding a little time or pace as it feels comfortable, and keep the schedule regular rather than intense. Consistency brings most of the health benefits — an active habit you can maintain beats an ambitious plan that lasts a week.",
      },
      {
        heading: "Being active in a hot climate",
        body:
          "In Bangladesh's heat and humidity, timing matters. Early morning and evening are the safest windows for outdoor activity. Wear light clothing, drink water before and after, and rest in shade whenever needed. If you feel dizzy, nauseated or overly tired, stop and cool down — and see our article on sun and heat safety for the warning signs of heat illness.",
      },
    ],
    whenToSeekHelp: [
      "If you have a heart condition, experience chest pain or dizziness with exertion, or have joint problems, discuss a safe activity plan with your doctor before starting.",
      "Anyone returning to exercise after major illness, surgery or a long hospital stay should ask their doctor how to rebuild activity gradually.",
    ],
    author: CONTENT_AUTHOR,
    medicalReviewer: null,
    status: "PUBLISHED",
    publishedAt: "2026-11-20",
    updatedAt: "2026-11-20",
    reviewedAt: null,
    sources: [
      {
        title: "Physical activity",
        publisher: "World Health Organization",
        url: "https://www.who.int/news-room/fact-sheets/detail/physical-activity",
      },
      {
        title: "WHO guidelines on physical activity and sedentary behaviour",
        publisher: "World Health Organization",
        url: "https://www.who.int/publications/i/item/9789240015128",
      },
    ],
    relatedSlugs: ["sun-and-heat-safety", "balanced-diet-basics", "sleep-hygiene-basics"],
    emergencyNote: null,
  },
  {
    slug: "sleep-hygiene-basics",
    title: "Sleep Hygiene Basics: Everyday Habits for Better Rest",
    titleBn: "ঘুমের স্বাস্থ্যকর অভ্যাস: ভালো বিশ্রামের সহজ উপায়",
    summary:
      "Most adults need 7-9 hours of sleep. A consistent schedule, a calm wind-down, and a cool dark room are the foundations of sleeping well — and knowing when to seek help for ongoing sleep trouble.",
    category: "sleep",
    keyPoints: [
      "Most adults need 7-9 hours of sleep a night; teenagers and children need more.",
      "Keep bed and wake times consistent, even on days off — rhythm is what the body adapts to.",
      "Build a 30-60 minute wind-down, and set aside screens, heavy meals and caffeine before bed.",
      "A dark, quiet, comfortably cool room — plus a mosquito net — supports deeper sleep.",
      "Keep naps short and before mid-afternoon; long or late naps push night sleep away.",
    ],
    sections: [
      {
        heading: "Why sleep matters",
        body:
          "Sleep is active recovery, not wasted time. While you sleep, the body repairs tissue, consolidates memory and rebalances hormones that influence mood, appetite and immunity. When sleep is regularly too short or broken, the effects show up in concentration, temper, work performance and appetite. Occasional poor nights are normal and recover quickly; the habits below help make good nights the rule rather than the exception.",
      },
      {
        heading: "How much sleep we need",
        body:
          "Most adults need 7 to 9 hours a night. Teenagers need 8 to 10 hours, and younger children more still. People differ slightly, but the range matters less than consistency: a regular rhythm of sleep and wake times, maintained daily, is what the body adapts to best.",
      },
      {
        heading: "Building a steady routine",
        body:
          "Go to bed and wake up at roughly the same times every day, including days off. Build a wind-down of 30 to 60 minutes before bed: dim the lights, set aside work, and choose calm activities such as reading, light stretching, prayer or a warm wash. Avoid heavy meals close to bedtime, and move caffeine — tea, coffee and cola — to the earlier part of the day, as its effects last for hours. Screens deserve a special mention: both their light and their content keep the mind alert, so it helps to set them aside before the wind-down begins.",
      },
      {
        heading: "Your sleep environment",
        body:
          "A dark, quiet and comfortably cool room supports deeper sleep. In Bangladesh, sleeping under a mosquito net has a second benefit: it prevents the disturbed nights caused by mosquito bites. Keep the phone silent and out of reach if late notifications tend to wake you, and make sure bedding suits the season.",
      },
      {
        heading: "Naps, and when to seek assessment",
        body:
          "Short naps of 20 to 30 minutes, taken before mid-afternoon, refresh most people without disturbing night sleep. Long or late-evening naps usually make it harder to fall asleep at night.\n\nIf you have had trouble sleeping for several weeks despite better habits, feel excessively sleepy during the day, or snore loudly with pauses or gasping, it is worth discussing with a doctor. These are common problems with practical solutions — seeking assessment is a sensible step, not a last resort.",
      },
    ],
    whenToSeekHelp: [
      "If trouble sleeping continues for more than a few weeks despite better habits, a doctor can help identify what is keeping you awake.",
      "Loud snoring with pauses or gasping, and daytime sleepiness that affects work or study, both deserve a professional assessment.",
      "If poor sleep goes together with persistent worry or low mood, talking to a health professional often helps both.",
    ],
    author: CONTENT_AUTHOR,
    medicalReviewer: null,
    status: "PUBLISHED",
    publishedAt: "2026-11-20",
    updatedAt: "2026-11-20",
    reviewedAt: null,
    sources: [
      {
        title: "Insomnia",
        publisher: "Mayo Clinic",
        url: "https://www.mayoclinic.org/diseases-conditions/insomnia/symptoms-causes/syc-20373060",
      },
      {
        title: "Sleep",
        publisher: "US Centers for Disease Control and Prevention",
        url: "https://www.cdc.gov/sleep/index.html",
      },
    ],
    relatedSlugs: ["managing-everyday-stress", "physical-activity-guidelines"],
    emergencyNote: null,
  },
  {
    slug: "managing-everyday-stress",
    title: "Managing Everyday Stress: Practical Habits That Help",
    titleBn: "দৈনন্দিন মানসিক চাপ সামলানোর ব্যবহারিক উপায়",
    summary:
      "Everyday stress is normal, and a handful of habits — routine, movement, connection and paced breathing — keep it manageable. These habits support wellbeing but are not a substitute for professional care when symptoms persist.",
    category: "mental-wellbeing",
    keyPoints: [
      "Stress is a normal response to pressure; it needs attention when it feels constant or starts affecting daily life.",
      "A steady routine, regular movement, enough sleep and social connection form the foundation.",
      "Paced breathing with a longer exhale calms the body within minutes and works anywhere.",
      "Break big tasks into small steps — progress restores a sense of control.",
      "Limit doom-scrolling; these habits support wellbeing but are not a treatment for anxiety or depression.",
    ],
    sections: [
      {
        heading: "Stress is a normal response",
        body:
          "Some stress is a normal, even useful, part of life — it is the body's way of rising to a challenge. Before an exam, a deadline or a difficult conversation, a degree of tension is expected and usually passes once the moment is over. Stress becomes harder to live with when it feels constant, intensifies over time, or starts to affect sleep, appetite, work or relationships for weeks on end. That is the point at which everyday self-care needs support.",
      },
      {
        heading: "The foundations",
        body:
          "A steady daily routine is surprisingly powerful: waking, eating and sleeping at regular times gives the day a frame. Movement helps most days — a brisk walk or any activity you enjoy. Adequate sleep and regular meals keep the body resilient. Social connection matters just as much: sharing the day's worries with family or a trusted friend lowers the load in a way that solitary coping cannot.",
      },
      {
        heading: "A technique you can use anywhere",
        body:
          "Paced breathing is a simple way to calm the body's stress response. Breathe in slowly through the nose for a count of three or four, then breathe out even more slowly, for a count of five or six. The longer exhale signals the nervous system to settle. Repeat for a few minutes — while waiting, before a meeting, or whenever tension builds. Short walks and quiet or prayer time work in a similar way for many people.",
      },
      {
        heading: "Breaking the load into steps",
        body:
          "When tasks pile up, the size of the pile itself becomes stressful. Write things down, choose the next small step, and do only that step. Prioritise what truly matters today, let some things wait, and ask for help when it is available. Progress in small steps is still progress — and it restores the feeling of control.",
      },
      {
        heading: "Protecting your attention",
        body:
          "Endless news feeds and social media scrolling can keep the mind in a state of low-grade alarm. Notice how you feel after twenty minutes of scrolling; if it is worse, set fixed times for news instead of checking continuously, and keep some hours of the day phone-free.\n\nOne honest caveat: these habits support everyday wellbeing, but they are not a treatment for anxiety or depression. If symptoms are persistent, professional support is the effective path — see our article on when to seek mental health support.",
      },
    ],
    whenToSeekHelp: [
      "If stress has felt constant for several weeks, or is affecting your sleep, work or relationships, talking to a health professional can help.",
      "Anyone who feels overwhelmed most days should know that effective support exists — reaching out early leads to better outcomes.",
    ],
    author: CONTENT_AUTHOR,
    medicalReviewer: null,
    status: "PUBLISHED",
    publishedAt: "2026-11-20",
    updatedAt: "2026-11-20",
    reviewedAt: null,
    sources: [
      {
        title: "Doing what matters in times of stress: an illustrated guide",
        publisher: "World Health Organization",
        url: "https://www.who.int/publications/i/item/9789240003927",
      },
      {
        title: "Mental health: strengthening our response",
        publisher: "World Health Organization",
        url: "https://www.who.int/news-room/fact-sheets/detail/mental-health-strengthening-our-response",
      },
    ],
    relatedSlugs: ["when-to-seek-mental-health-support", "sleep-hygiene-basics"],
    emergencyNote: null,
  },
  {
    slug: "when-to-seek-mental-health-support",
    title: "When to Seek Mental Health Support: Knowing the Signs",
    titleBn: "কখন মানসিক স্বাস্থ্য সহায়তা নেওয়া উচিত",
    summary:
      "Mental health is health. Persistent low mood, sleep and appetite changes, or being unable to function are signs that professional support may help — and in a crisis, 999 and the government health helpline 16263 are there.",
    category: "mental-wellbeing",
    keyPoints: [
      "Mental health conditions are common, treatable health conditions — seeking help is a sign of good sense, not weakness.",
      "Support may help if low mood or loss of interest lasts more than two weeks, or if sleep, appetite or daily functioning clearly change.",
      "You can start by telling a trusted person or your family doctor — being honest about what has changed helps them help you.",
      "In a crisis — thoughts of self-harm — call 999 or the government health helpline 16263 immediately.",
    ],
    sections: [
      {
        heading: "Mental health is health",
        body:
          "The mind is part of the body, and mental health conditions are health conditions — common in every country and community, and treatable. Seeking help for persistent low mood or worry is no different from seeing a doctor for a persistent fever. What usually delays people is not the condition itself but stigma — the idea that emotional struggle is a personal weakness. It is not. It is a health matter, and addressing it early leads to better outcomes.",
      },
      {
        heading: "Signs that support may help",
        body:
          "Everyone has difficult days. Support from a professional may be helpful when several of the following persist for more than two weeks:\n\n• Low mood, or loss of interest and pleasure in things you usually enjoy, most of the day, nearly every day\n• Sleeping far more or far less than usual, or a clear change in appetite\n• Withdrawing from family and friends\n• Struggling to keep up with work, studies or home responsibilities\n• Persistent worry or tension that feels hard to control",
      },
      {
        heading: "How to reach out",
        body:
          "Start wherever feels manageable. For many people that is a trusted person — a family member, a friend, a teacher or a community leader you respect. The next step is usually a doctor or health worker, who can listen, assess, and guide you to the right support. When you speak, be as honest as you can about what has changed and for how long — that honesty is what helps most. Mental health professionals include counsellors, psychologists and psychiatrists; all are valid routes depending on what is needed.",
      },
      {
        heading: "What support looks like",
        body:
          "Support is a conversation before it is anything else. A professional may discuss talking therapy, practical coping strategies, and — where appropriate — medicines, always together with you and with your agreement. Many people improve noticeably within weeks of the right support, and involving family in the process is possible if you wish. What support should never require is shame: it is ordinary health care.",
      },
      {
        heading: "If it is a crisis",
        body:
          "Some situations need help immediately. If you or someone close to you is having thoughts of self-harm, treat it as an emergency: call 999, or the government health helpline 16263, straight away. Stay with the person until help arrives, and take the thoughts seriously without panic. Such crises pass, and with support people come through them — reaching out in that moment is the right thing to do.",
      },
    ],
    whenToSeekHelp: [
      "If the signs above sound familiar, a conversation with your doctor or another trusted person is the natural first step.",
      "If you have been feeling low, worried or numb for more than two weeks, professional assessment is worth arranging.",
    ],
    author: CONTENT_AUTHOR,
    medicalReviewer: null,
    status: "PUBLISHED",
    publishedAt: "2026-11-20",
    updatedAt: "2026-11-20",
    reviewedAt: null,
    sources: [
      {
        title: "Mental disorders",
        publisher: "World Health Organization",
        url: "https://www.who.int/news-room/fact-sheets/detail/mental-disorders",
      },
      {
        title: "Depression",
        publisher: "World Health Organization",
        url: "https://www.who.int/news-room/fact-sheets/detail/depression",
      },
    ],
    relatedSlugs: ["managing-everyday-stress", "sleep-hygiene-basics"],
    emergencyNote:
      "If you or someone close to you is having thoughts of self-harm, seek help immediately: call 999 or the government health helpline 16263 (Shastho Batayon). Stay with the person until help arrives.",
  },
  {
    slug: "childhood-vaccination-basics",
    title: "Childhood Vaccination Basics: Protecting Children and Communities",
    titleBn: "শিশুদের টিকা: প্রত্যেক অভিভাবকের জানা উচিত",
    summary:
      "Vaccines train your child's immune system against serious diseases before they strike. Bangladesh's EPI provides key vaccines free of charge — keep the EPI card safe and complete the full series.",
    category: "childrens-health",
    keyPoints: [
      "Vaccines train a child's immune system to fight serious diseases before exposure.",
      "When most children are vaccinated, the whole community gains protection, including babies too young for some vaccines.",
      "Bangladesh's EPI provides key vaccines — including BCG, polio, pentavalent and measles — free at government centres.",
      "Keep the EPI card safe, bring it to every visit, and complete the full series.",
      "Mild fever or soreness after vaccination is common and usually settles within a day or two.",
    ],
    sections: [
      {
        heading: "How vaccines protect",
        body:
          "A vaccine teaches the immune system to recognise a disease without causing the illness itself. After vaccination, the body 'remembers' that germ, so if the child meets it later, the immune system can respond quickly. This is how vaccines protect children from diseases such as tuberculosis, polio, diphtheria, whooping cough, tetanus, hepatitis B and measles — illnesses that were once common and are now far rarer because of routine immunisation.",
      },
      {
        heading: "Protecting the community",
        body:
          "Vaccination protects more than the child receiving it. When most children in a community are vaccinated, diseases cannot spread easily from person to person. This quietly protects babies who are too young for some vaccines, and children who cannot be vaccinated for medical reasons. Every completed vaccination course helps the whole neighbourhood, not just one family.",
      },
      {
        heading: "Bangladesh's EPI programme",
        body:
          "Bangladesh's Expanded Programme on Immunization (EPI) provides childhood vaccines free of charge at government EPI centres and through outreach sessions in the community. The programme includes vaccines such as BCG, polio, pentavalent (which protects against several diseases in one injection) and measles. The health workers at your nearest EPI centre can tell you exactly which vaccines your child is due for and when.",
      },
      {
        heading: "The EPI card and completing the series",
        body:
          "The EPI card is your child's official vaccination record. Keep it safely — a plastic sleeve or a dedicated folder at home helps — and bring it to every visit so doses can be recorded. Schools sometimes ask for it later, so it is worth keeping for years. If the card is lost, the EPI centre can help reconstruct the record. Complete the full series: some vaccines need more than one dose, and protection is strongest when the series is finished. If a dose has been missed for any reason, visit the EPI centre — health workers arrange catch-up vaccinations routinely.",
      },
      {
        heading: "After vaccination: what is common",
        body:
          "Mild reactions after vaccination are common and usually settle within a day or two: slight fever, soreness where the injection was given, or a day of being fussier than usual. Offer extra fluids and comfort, and watch the child as normal. If there is a high fever, unusual drowsiness or crying, or anything else that worries you, contact the EPI centre or a health worker — they would rather hear from you than not.",
      },
    ],
    whenToSeekHelp: [
      "If your child has a high fever, unusual drowsiness or unusual behaviour after vaccination, contact the EPI centre or a health worker.",
      "If you think a dose has been missed, visit the nearest EPI centre — health workers will advise how to complete the series.",
    ],
    author: CONTENT_AUTHOR,
    medicalReviewer: null,
    status: "PUBLISHED",
    publishedAt: "2026-11-20",
    updatedAt: "2026-11-20",
    reviewedAt: null,
    sources: [
      {
        title: "Immunization",
        publisher: "World Health Organization",
        url: "https://www.who.int/news-room/fact-sheets/detail/immunization",
      },
      {
        title: "Immunization",
        publisher: "UNICEF",
        url: "https://www.unicef.org/immunization",
      },
    ],
    relatedSlugs: ["child-fever-basics", "hand-hygiene-basics"],
    emergencyNote: null,
  },
  {
    slug: "child-fever-basics",
    title: "Child Fever Basics: Home Care and Warning Signs",
    titleBn: "শিশুর জ্বর: বাড়িতে যত্ন ও কখন ডাক্তার দেখানো জরুরি",
    summary:
      "Fever is common in children and usually settles at home with fluids, light clothing and rest. Knowing how to measure temperature — and which warning signs need urgent care — helps parents respond calmly.",
    category: "childrens-health",
    keyPoints: [
      "Fever means a temperature of 38°C (100.4°F) or higher; most childhood fevers settle within a few days.",
      "Fluids, light clothing and rest are the mainstays of home care.",
      "Give fever medicine only as advised by a health professional, at the right dose for your child's weight.",
      "Any fever in a baby under 3 months old needs hospital care immediately.",
      "In dengue season, fever with joint or muscle pain, rash, or pain behind the eyes should be seen by a doctor promptly.",
    ],
    sections: [
      {
        heading: "What fever is and how to measure it",
        body:
          "Fever means a body temperature of 38°C (100.4°F) or higher. In itself, fever is not an enemy: it is a sign that the body is responding to an infection, and most childhood fevers settle within a few days. Normal body temperature sits around 36.5-37.5°C, and fevers often rise towards the late afternoon and evening, which is expected.\n\nA digital thermometer under the armpit, used following the device's instructions, is the practical choice for most homes. Measure a few times a day, note the readings, and watch how your child behaves in between — activity and drinking matter more than any single number.",
      },
      {
        heading: "Caring for a feverish child at home",
        body:
          "Most fevers can be managed gently at home. Offer fluids often — small sips count, and breastfed babies may simply want to feed more frequently. Dress the child in light clothing and keep the room comfortable; avoid bundling them in heavy layers. Let them rest, without insisting on full bed rest. Fever medicine should only be given as advised by a health professional, at the right dose for the child's weight — never estimate a dose by age alone. Keeping simple notes on temperatures, drinks and symptoms helps if you later speak to a doctor.",
      },
      {
        heading: "Warning signs that need urgent care",
        body:
          "Some situations should not wait for the fever to run its course:\n\n• Any fever in a baby under 3 months old — go to a hospital now\n• Unusual drowsiness, floppiness, or being difficult to wake\n• Refusing fluids, or far fewer wet nappies than usual\n• A rash that does not fade when pressed with a finger\n• A seizure or fit\n• Difficulty breathing\n• Fever lasting more than five days",
      },
      {
        heading: "Dengue season awareness",
        body:
          "Dengue illness is more common during and after the monsoon, roughly June to October. Most fevers in this season are still not dengue — but fever accompanied by joint or muscle pain, a rash, or pain behind the eyes should be assessed by a doctor promptly, because care in the first days matters. Keep a note of symptoms from the first day of the fever; it helps the doctor. Covering water containers around the house and removing standing water reduces mosquito breeding at the same time.",
      },
    ],
    whenToSeekHelp: [
      "If your child's fever lasts more than three days, or you are worried for any reason, having a doctor assess the child brings clarity and peace of mind.",
      "Trust your instincts: a child who seems much less active than usual, drinks very little, or simply is not right is always worth having assessed.",
    ],
    author: CONTENT_AUTHOR,
    medicalReviewer: null,
    status: "PUBLISHED",
    publishedAt: "2026-11-20",
    updatedAt: "2026-11-20",
    reviewedAt: null,
    sources: [
      {
        title: "Dengue and severe dengue",
        publisher: "World Health Organization",
        url: "https://www.who.int/news-room/fact-sheets/detail/dengue-and-severe-dengue",
      },
      {
        title: "Meningitis",
        publisher: "World Health Organization",
        url: "https://www.who.int/news-room/fact-sheets/detail/meningitis",
      },
    ],
    relatedSlugs: ["childhood-vaccination-basics", "safe-drinking-water"],
    emergencyNote:
      "Any fever in a baby under 3 months old needs hospital care now. Also press any rash gently with a finger — if it does not fade, seek urgent care. In doubt, call 999 or go to the nearest hospital.",
  },
  {
    slug: "antenatal-checkups-explained",
    title: "Antenatal Check-ups Explained: Why Every Visit Counts",
    titleBn: "প্রসবপূর্ব স্বাস্থ্যপরীক্ষা: কেন প্রতিটি সাক্ষাত গুরুত্বপূর্ণ",
    summary:
      "Regular antenatal check-ups protect mother and baby by catching problems early. WHO recommends at least eight contacts during pregnancy — here is what to expect, and which danger signs need immediate care.",
    category: "womens-health",
    keyPoints: [
      "Regular antenatal contacts protect both mother and baby by catching problems early, when they are easiest to manage.",
      "WHO recommends at least eight antenatal contacts across pregnancy, from the first trimester to delivery.",
      "Visits typically include blood pressure, weight, blood and urine tests, and counselling on danger signs and birth preparation.",
      "Danger signs — bleeding, severe headache with blurred vision, swelling of face and hands, fever, reduced fetal movement, water breaking early — need immediate care.",
      "Keep your antenatal records together and bring them to every visit.",
    ],
    sections: [
      {
        heading: "Why antenatal visits matter",
        body:
          "Pregnancy brings steady changes in the body, and most of them are healthy. The purpose of regular antenatal check-ups is to watch those changes, keep mother and baby safe, and catch any problem early — at the stage when it is easiest to manage. Conditions such as anaemia, rising blood pressure or infections often cause no symptoms at first, which is exactly why checking matters. Visits are also where practical questions about food, rest, birth preparation and the newborn are answered.",
      },
      {
        heading: "How many contacts — the WHO model",
        body:
          "The World Health Organization recommends at least eight antenatal contacts during pregnancy, spread from the first trimester to delivery — an increase from the older four-visit model, based on evidence that more regular contact improves outcomes for mothers and babies. Health services in Bangladesh schedule antenatal visits along similar lines. Some pregnancies need extra visits, and your provider will tell you when that applies. The key is attending all the contacts you are advised to, even when you feel perfectly well.",
      },
      {
        heading: "What usually happens at a visit",
        body:
          "Depending on the stage of pregnancy, a visit typically includes checking your blood pressure and weight, testing a urine sample, and blood tests for conditions such as anaemia. Later visits include feeling the baby's growth and position and listening to the heartbeat. Counselling is part of every visit: warning signs to watch for, nutrition, breastfeeding, and planning where to give birth. Bring your questions — no question is too small, and visits are the right place for them.",
      },
      {
        heading: "Danger signs that need immediate care",
        body:
          "Some signs should never wait for the next scheduled visit:\n\n• Bleeding at any time in pregnancy\n• Severe headache with blurred vision\n• Swelling of the face and hands\n• Fever\n• Reduced or stopped fetal movement\n• Water breaking before labour starts\n\nGo to a hospital immediately — call 999 if you cannot get there on your own.",
      },
      {
        heading: "Making the most of antenatal care",
        body:
          "Keep all your antenatal records together and carry them to every visit, so any provider can see the full picture. Note your questions between visits. Involve your family in the birth plan — knowing the chosen facility, the route there, and a plan for transport and costs removes stress at delivery time. Attending every scheduled contact, even when you feel well, is one of the most valuable investments in your baby's first months.",
      },
    ],
    whenToSeekHelp: [
      "Bring any question or worry to your next antenatal visit — concerns are part of antenatal care, not an interruption of it.",
      "Between visits, if you notice swelling, headache, or a change in your baby's movement, contact your provider or the health helpline 16263 for advice.",
    ],
    author: CONTENT_AUTHOR,
    medicalReviewer: null,
    status: "PUBLISHED",
    publishedAt: "2026-11-20",
    updatedAt: "2026-11-20",
    reviewedAt: null,
    sources: [
      {
        title: "WHO recommendations on antenatal care for a positive pregnancy experience",
        publisher: "World Health Organization",
        url: "https://www.who.int/publications/i/item/9789241549919",
      },
      {
        title: "Maternal health",
        publisher: "World Health Organization",
        url: "https://www.who.int/health-topics/maternal-health",
      },
    ],
    relatedSlugs: ["balanced-diet-basics", "childhood-vaccination-basics"],
    emergencyNote:
      "Seek hospital care immediately — call 999 if needed — for: bleeding, severe headache with blurred vision, swelling of the face and hands, fever, reduced fetal movement, or water breaking before labour.",
  },
];
