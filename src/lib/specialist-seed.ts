// ---------------------------------------------------------------------------
// specialist-seed.ts  —  DRAFT symptom → specialist mapping (FOR CLINICIAN REVIEW)
//
// Purpose: extend DocFriends' "find a specialist" finder to cover the missing
// specialties (dental, mental health, etc.) without disturbing the existing ~50
// symptoms. symptoms.ts imports this and merges it ADDITIVELY into its own shapes.
//
// SAFETY / REVIEW NOTES — read before shipping:
//   • This is patient-facing health guidance. A licensed clinician MUST review the
//     red-flag lines, causes, and routing before this goes live.
//   • Causes are QUALITATIVE on purpose (common | less-common | serious-rare).
//     We are NOT showing invented "62%"-style numbers to patients.
//   • Red-flag / "seek urgent care" text is deliberately conservative. Over-cautious
//     is the safe failure mode — do not water these down.
//   • MENTAL HEALTH: any option marked `crisis: true` must trigger the CRISIS branch
//     (support resources + "reach out now"), NEVER the paid booking funnel.
//   • CRISIS_RESOURCES.lines is a PLACEHOLDER. Do not invent hotline numbers — the
//     team must insert verified, current crisis lines for every region served.
//   • NUTRITION: never emit calorie/diet specifics or weight-loss targets. Route to
//     a dietitian / professional support. If a symptom hints at disordered eating,
//     respond compassionately and point to professional help — no numbers.
// ---------------------------------------------------------------------------

export type CauseTone = 'common' | 'less-common' | 'serious-rare';

export interface SeedOption {
  label: string;
  redFlag?: boolean;   // selecting this escalates the result to urgent
  crisis?: boolean;    // selecting this triggers the mental-health CRISIS branch
}
export interface SeedQuestion {
  id: string;
  q: string;
  options: SeedOption[];
}
export interface SeedCause {
  name: string;
  tone: CauseTone;
}
export interface SeedAlternative {
  specialist: string;       // display label, e.g. "Cardiologist"
  specialtySlug: string;    // routing slug if they switch
  when: string;             // "if the pain spreads to your chest or arm"
}
export interface SeedSymptom {
  name: string;             // shown to the patient, e.g. "Toothache"
  group: string;            // symptom group heading
  specialtySlug: string;    // primary routing target (must exist as a specialty)
  specialistLabel: string;  // "Dentist"
  blurb: string;            // one line: why this specialist
  questions: SeedQuestion[];// include at least one red-flag/safety question
  causes: SeedCause[];      // conservative, qualitative
  alternatives?: SeedAlternative[];
  redFlag: string;          // conservative "seek urgent/emergency care if…" line
  mentalHealth?: boolean;   // routes through psychiatry + carries the safety question
}

// New routing targets to add to the `specialties` table (active).
export const NEW_SPECIALTIES: { slug: string; name: string; description: string }[] = [
  { slug: 'dentistry',          name: 'Dentistry',                  description: 'Teeth, gums, jaw and oral health.' },
  { slug: 'psychiatry',         name: 'Psychiatry & mental health', description: 'Mood, anxiety, sleep and emotional wellbeing.' },
  { slug: 'rheumatology',       name: 'Rheumatology',               description: 'Joints, inflammation and autoimmune conditions.' },
  { slug: 'nephrology',         name: 'Nephrology',                 description: 'Kidney function and related conditions.' },
  { slug: 'hematology',         name: 'Hematology',                 description: 'Blood, clotting and lymph nodes.' },
  { slug: 'allergy_immunology', name: 'Allergy & immunology',       description: 'Allergies, hives and immune-related illness.' },
  { slug: 'infectious_disease', name: 'Infectious disease',         description: 'Persistent infections and travel-related illness.' },
  { slug: 'vascular',           name: 'Vascular',                   description: 'Veins, arteries and circulation.' },
  { slug: 'pain_medicine',      name: 'Pain medicine',              description: 'Chronic and nerve-related pain.' },
  { slug: 'physical_med_rehab', name: 'Physical medicine & rehab',  description: 'Recovery, mobility and physiotherapy.' },
  { slug: 'sleep_medicine',     name: 'Sleep medicine',             description: 'Sleep disorders, snoring and apnea.' },
  { slug: 'podiatry',           name: 'Podiatry',                   description: 'Foot and ankle conditions.' },
  { slug: 'sexual_health',      name: 'Sexual health',              description: 'STIs and sexual function, handled discreetly.' },
  { slug: 'pediatrics',         name: 'Pediatrics',                 description: 'Health concerns in children.' },
  { slug: 'obstetrics',         name: 'Obstetrics',                 description: 'Pregnancy-related care.' },
  { slug: 'geriatrics',         name: 'Geriatrics',                 description: 'Health and medication in older adults.' },
  { slug: 'nutrition_dietetics',name: 'Nutrition & dietetics',      description: 'Diet, nutrition and related symptoms.' },
];

// Shown by the CRISIS branch. NUMBERS ARE PLACEHOLDERS — set verified, current
// crisis lines per region before launch. Do not invent these.
export const CRISIS_RESOURCES = {
  heading: "Please reach out — you don't have to face this alone.",
  body:
    "What you're describing is something to take seriously, and the kindest next step " +
    "is to talk to someone now rather than book something for later. If you can, reach " +
    "out to a person you trust, or a doctor or mental-health professional today.",
  immediate:
    'If you feel you might act on thoughts of harming yourself, or you are in immediate ' +
    'danger, contact your local emergency services right now.',
  // Verified Government of India national lines (re-check periodically — helplines change).
  // To serve other regions, add their verified lines here alongside these.
  lines: [
    { region: 'India', name: 'Tele-MANAS — national mental health helpline (24/7, Govt of India)', contact: '14416 or 1-800-891-4416' },
    { region: 'India', name: 'KIRAN mental health helpline (24/7)', contact: '1800-599-0019' },
    { region: 'India', name: 'Emergency services', contact: '112' },
  ],
  closing: 'A trusted person, your GP, or a crisis line can help you through the next few hours.',
};

export const SEED_SYMPTOMS: SeedSymptom[] = [
  // ───────────── DENTISTRY ─────────────
  {
    name: 'Toothache', group: 'Mouth & teeth',
    specialtySlug: 'dentistry', specialistLabel: 'Dentist',
    blurb: 'Tooth pain is best assessed by a dentist, who can find and treat the source.',
    questions: [
      { id: 'q_dur', q: 'How long has it been hurting?', options: [{ label: 'A day or two' }, { label: 'About a week' }, { label: 'Longer than a week' }] },
      { id: 'q_trig', q: 'What sets it off?', options: [{ label: 'Hot, cold or sweet things' }, { label: 'Biting or chewing' }, { label: 'It throbs on its own' }] },
      { id: 'q_swell', q: 'Any facial swelling, fever, or trouble swallowing?', options: [{ label: 'No' }, { label: 'Some swelling near the tooth', redFlag: true }, { label: 'Swelling with fever or trouble swallowing/breathing', redFlag: true }] },
    ],
    causes: [
      { name: 'Tooth decay (cavity)', tone: 'common' },
      { name: 'Sensitive / exposed dentin', tone: 'common' },
      { name: 'Tooth infection or abscess', tone: 'less-common' },
      { name: 'Cracked tooth', tone: 'less-common' },
    ],
    redFlag: 'Facial swelling with fever, or any trouble swallowing or breathing, can mean a spreading dental infection — seek urgent or emergency care.',
  },
  {
    name: 'Bleeding or swollen gums', group: 'Mouth & teeth',
    specialtySlug: 'dentistry', specialistLabel: 'Dentist',
    blurb: 'A dentist can assess gum health and rule out gum disease.',
    questions: [
      { id: 'q_when', q: 'When do they bleed?', options: [{ label: 'When I brush or floss' }, { label: 'On their own, without touching them', redFlag: true }] },
      { id: 'q_other', q: 'Any easy bruising or bleeding elsewhere on your body?', options: [{ label: 'No' }, { label: 'Yes — bruises or bleeding elsewhere too', redFlag: true }] },
    ],
    causes: [
      { name: 'Gum inflammation (gingivitis)', tone: 'common' },
      { name: 'Gum disease (periodontitis)', tone: 'less-common' },
      { name: 'A bleeding or clotting problem', tone: 'serious-rare' },
    ],
    alternatives: [{ specialist: 'Hematologist', specialtySlug: 'hematology', when: 'if you also bruise or bleed easily elsewhere' }],
    redFlag: 'Gums bleeding on their own, alongside easy bruising or bleeding elsewhere, should be checked by a doctor promptly.',
  },
  {
    name: 'Jaw pain or clicking', group: 'Mouth & teeth',
    specialtySlug: 'dentistry', specialistLabel: 'Dentist',
    blurb: 'Jaw joint and bite problems are usually assessed by a dentist.',
    questions: [
      { id: 'q_chest', q: 'Any chest pain, breathlessness, or arm/neck pain with it?', options: [{ label: 'No' }, { label: 'Yes — chest pain, breathlessness or arm pain too', redFlag: true }] },
      { id: 'q_pattern', q: 'When is it worst?', options: [{ label: 'Chewing or opening wide' }, { label: 'On waking (clenching/grinding)' }, { label: 'All the time' }] },
    ],
    causes: [
      { name: 'Jaw joint strain (TMJ)', tone: 'common' },
      { name: 'Teeth grinding / clenching', tone: 'common' },
      { name: 'A bite or dental problem', tone: 'less-common' },
    ],
    alternatives: [{ specialist: 'Cardiologist', specialtySlug: 'cardiology', when: 'if jaw pain comes with chest pain or breathlessness — treat that as an emergency' }],
    redFlag: 'Jaw pain together with chest pain, breathlessness, or arm/neck pain can be a heart problem — call emergency services.',
  },
  {
    name: "Mouth sore that won't heal", group: 'Mouth & teeth',
    specialtySlug: 'dentistry', specialistLabel: 'Dentist',
    blurb: 'A dentist can examine a persistent sore and arrange further checks if needed.',
    questions: [
      { id: 'q_dur', q: 'How long has it been there?', options: [{ label: 'Under two weeks' }, { label: 'More than two to three weeks', redFlag: true }] },
      { id: 'q_look', q: 'Is there a lump, or a white or red patch?', options: [{ label: 'No, just a sore' }, { label: 'Yes — a lump or colored patch', redFlag: true }] },
    ],
    causes: [
      { name: 'Common mouth ulcer', tone: 'common' },
      { name: 'Irritation or minor infection', tone: 'less-common' },
      { name: 'A lesion needing specialist evaluation', tone: 'serious-rare' },
    ],
    alternatives: [{ specialist: 'ENT / oncology', specialtySlug: 'otolaryngology', when: 'for a sore lasting over 2–3 weeks or a persistent lump/patch' }],
    redFlag: 'Any mouth sore lasting more than two to three weeks, or a lump or white/red patch, should be checked promptly.',
  },

  // ───────────── PSYCHIATRY / MENTAL HEALTH (carry the safety question) ─────────────
  {
    name: 'Persistent low mood', group: 'Mood & mind', mentalHealth: true,
    specialtySlug: 'psychiatry', specialistLabel: 'Mental-health professional',
    blurb: 'A mental-health professional can help you understand and work through this.',
    questions: [
      { id: 'q_safe', q: 'Have you had thoughts of harming yourself, or that you might be better off not here?', options: [{ label: 'No, never' }, { label: 'Fleeting thoughts, but no plan', crisis: true }, { label: 'Yes — and it feels hard to stay safe', crisis: true }] },
      { id: 'q_dur', q: 'How long have you felt this way?', options: [{ label: 'A couple of weeks' }, { label: 'A month or more' }, { label: 'As long as I can remember' }] },
      { id: 'q_fn', q: 'Is it affecting sleep, appetite, or daily life?', options: [{ label: 'A little' }, { label: 'A lot' }] },
    ],
    causes: [
      { name: 'Depression', tone: 'common' },
      { name: 'Stress or adjustment to a life event', tone: 'common' },
      { name: 'An underlying medical cause (e.g. thyroid)', tone: 'less-common' },
    ],
    alternatives: [{ specialist: 'Endocrinologist', specialtySlug: 'endocrinology', when: 'if a doctor suspects a thyroid or hormonal cause' }],
    redFlag: 'If you ever feel unable to keep yourself safe, please treat it as an emergency and reach out for help right away.',
  },
  {
    name: 'Anxiety or panic', group: 'Mood & mind', mentalHealth: true,
    specialtySlug: 'psychiatry', specialistLabel: 'Mental-health professional',
    blurb: 'A mental-health professional can help with anxiety and panic.',
    questions: [
      { id: 'q_safe', q: 'Have you had thoughts of harming yourself?', options: [{ label: 'No' }, { label: 'Yes — and it feels hard to stay safe', crisis: true }] },
      { id: 'q_phys', q: 'During an episode, any chest pain or fainting?', options: [{ label: 'No' }, { label: 'Yes — chest pain or fainting', redFlag: true }] },
    ],
    causes: [
      { name: 'Anxiety or panic disorder', tone: 'common' },
      { name: 'Stress', tone: 'common' },
      { name: 'A thyroid or heart cause that can mimic anxiety', tone: 'less-common' },
    ],
    alternatives: [{ specialist: 'Cardiologist', specialtySlug: 'cardiology', when: 'if episodes come with chest pain or fainting — get that checked urgently' }],
    redFlag: 'Chest pain or fainting during an episode should be assessed urgently to rule out a heart cause.',
  },

  // ───────────── RHEUMATOLOGY ─────────────
  {
    name: 'Joint pain and swelling', group: 'Bones, joints & muscles',
    specialtySlug: 'rheumatology', specialistLabel: 'Rheumatologist',
    blurb: 'A rheumatologist assesses inflammatory and autoimmune joint conditions.',
    questions: [
      { id: 'q_hot', q: 'Is one joint hot, very swollen, and you feel feverish?', options: [{ label: 'No' }, { label: 'Yes — a hot, swollen joint with fever', redFlag: true }] },
      { id: 'q_stiff', q: 'Are your joints stiff in the morning, and for how long?', options: [{ label: 'Not really' }, { label: 'Stiff for under 30 minutes' }, { label: 'Stiff for an hour or more' }] },
      { id: 'q_count', q: 'How many joints are involved?', options: [{ label: 'One' }, { label: 'A few' }, { label: 'Many, on both sides' }] },
    ],
    causes: [
      { name: 'Wear-and-tear (osteoarthritis)', tone: 'common' },
      { name: 'Inflammatory arthritis (e.g. rheumatoid)', tone: 'less-common' },
      { name: 'Gout', tone: 'less-common' },
      { name: 'An autoimmune condition (e.g. lupus)', tone: 'serious-rare' },
    ],
    alternatives: [{ specialist: 'Orthopedic surgeon', specialtySlug: 'orthopedics', when: 'if it follows an injury or is mechanical' }],
    redFlag: 'A single hot, very swollen joint with fever can be a joint infection — seek urgent care.',
  },
  {
    name: 'Widespread aches and fatigue', group: 'Bones, joints & muscles',
    specialtySlug: 'rheumatology', specialistLabel: 'Rheumatologist',
    blurb: 'Persistent body-wide pain with fatigue is worth a rheumatology assessment.',
    questions: [
      { id: 'q_dur', q: 'How long has this been going on?', options: [{ label: 'A few weeks' }, { label: 'Three months or more' }] },
      { id: 'q_wt', q: 'Any unexplained weight loss, fevers, or night sweats?', options: [{ label: 'No' }, { label: 'Yes', redFlag: true }] },
    ],
    causes: [
      { name: 'Fibromyalgia', tone: 'common' },
      { name: 'An inflammatory or autoimmune condition', tone: 'less-common' },
      { name: 'A thyroid cause', tone: 'less-common' },
    ],
    alternatives: [{ specialist: 'Endocrinologist', specialtySlug: 'endocrinology', when: 'if a thyroid cause is suspected' }],
    redFlag: 'Body-wide pain with unexplained weight loss, fevers, or night sweats should be checked promptly.',
  },

  // ───────────── NEPHROLOGY ─────────────
  {
    name: 'Swelling with foamy urine', group: 'Kidneys & urine',
    specialtySlug: 'nephrology', specialistLabel: 'Nephrologist',
    blurb: 'Swelling with frothy urine can point to the kidneys — a nephrologist can assess.',
    questions: [
      { id: 'q_breath', q: 'Any breathlessness with the swelling?', options: [{ label: 'No' }, { label: 'Yes — short of breath', redFlag: true }] },
      { id: 'q_where', q: 'Where is the swelling?', options: [{ label: 'Ankles or legs' }, { label: 'Face / around the eyes' }, { label: 'Both' }] },
    ],
    causes: [
      { name: 'A kidney filtering problem', tone: 'less-common' },
      { name: 'High blood pressure affecting the kidneys', tone: 'common' },
      { name: 'Heart or liver causes of swelling', tone: 'less-common' },
    ],
    alternatives: [{ specialist: 'Cardiologist', specialtySlug: 'cardiology', when: 'if swelling comes with breathlessness' }],
    redFlag: 'Swelling together with breathlessness needs urgent assessment.',
  },
  {
    name: 'Blood in the urine', group: 'Kidneys & urine',
    specialtySlug: 'nephrology', specialistLabel: 'Nephrologist',
    blurb: 'Visible blood in urine always needs evaluation.',
    questions: [
      { id: 'q_pain', q: 'Any pain with it?', options: [{ label: 'No pain' }, { label: 'Burning when passing urine' }, { label: 'Severe one-sided back/flank pain', redFlag: true }] },
    ],
    causes: [
      { name: 'Urine infection', tone: 'common' },
      { name: 'Kidney stones', tone: 'less-common' },
      { name: 'A kidney or bladder condition needing evaluation', tone: 'serious-rare' },
    ],
    alternatives: [{ specialist: 'Urologist', specialtySlug: 'urology', when: 'for bladder/prostate causes or stones' }],
    redFlag: 'Visible blood in the urine should always be evaluated promptly; severe one-sided back pain needs urgent care.',
  },

  // ───────────── HEMATOLOGY ─────────────
  {
    name: 'Easy bruising or bleeding', group: 'Blood & glands',
    specialtySlug: 'hematology', specialistLabel: 'Hematologist',
    blurb: 'A hematologist assesses unexplained bruising and bleeding.',
    questions: [
      { id: 'q_spont', q: "Any bleeding that won't stop, or tiny red/purple spots on the skin?", options: [{ label: 'No' }, { label: 'Yes', redFlag: true }] },
    ],
    causes: [
      { name: 'A minor or medication-related cause', tone: 'common' },
      { name: 'Low platelets or a clotting problem', tone: 'less-common' },
      { name: 'A blood condition needing evaluation', tone: 'serious-rare' },
    ],
    redFlag: "Bleeding that won't stop, or a rash of tiny red/purple spots, needs urgent assessment.",
  },
  {
    name: 'Swollen lymph nodes', group: 'Blood & glands',
    specialtySlug: 'hematology', specialistLabel: 'Hematologist',
    blurb: 'Persistent swollen glands are worth checking.',
    questions: [
      { id: 'q_dur', q: 'How long have they been up?', options: [{ label: 'A week or two with a cold/illness' }, { label: 'More than 3–4 weeks', redFlag: true }] },
      { id: 'q_feel', q: 'How do they feel?', options: [{ label: 'Tender and soft' }, { label: 'Hard and painless', redFlag: true }] },
    ],
    causes: [
      { name: 'Response to an infection', tone: 'common' },
      { name: 'A condition needing evaluation', tone: 'serious-rare' },
    ],
    alternatives: [{ specialist: 'Oncology', specialtySlug: 'oncology', when: 'for persistent, hard, painless nodes' }],
    redFlag: 'Glands that stay swollen beyond 3–4 weeks, or are hard and painless, should be evaluated.',
  },

  // ───────────── ALLERGY & IMMUNOLOGY ─────────────
  {
    name: 'Hives or allergic reaction', group: 'Allergy & immune',
    specialtySlug: 'allergy_immunology', specialistLabel: 'Allergist / immunologist',
    blurb: 'An allergist can identify triggers and manage reactions.',
    questions: [
      { id: 'q_throat', q: 'Any swelling of the lips, tongue, or throat, or trouble breathing?', options: [{ label: 'No' }, { label: 'Yes — swelling or trouble breathing', redFlag: true }] },
    ],
    causes: [
      { name: 'Allergic reaction (food, medicine, contact)', tone: 'common' },
      { name: 'Chronic hives (often no single trigger)', tone: 'common' },
      { name: 'Severe allergic reaction (anaphylaxis)', tone: 'serious-rare' },
    ],
    redFlag: 'Swelling of the lips, tongue or throat, or any trouble breathing, is a medical emergency — call emergency services now.',
  },
  {
    name: 'Frequent or recurring infections', group: 'Allergy & immune',
    specialtySlug: 'allergy_immunology', specialistLabel: 'Immunologist',
    blurb: 'Repeated unusual infections can warrant an immune assessment.',
    questions: [
      { id: 'q_freq', q: 'How often?', options: [{ label: 'A few colds a year' }, { label: 'Frequent or severe infections needing antibiotics' }] },
    ],
    causes: [
      { name: 'Normal frequency of common infections', tone: 'common' },
      { name: 'An immune-system cause', tone: 'less-common' },
    ],
    alternatives: [{ specialist: 'Infectious disease', specialtySlug: 'infectious_disease', when: 'for persistent or unusual infections' }],
    redFlag: "High fever with confusion, a stiff neck, or a rash that doesn't fade under pressure needs emergency care.",
  },

  // ───────────── INFECTIOUS DISEASE ─────────────
  {
    name: 'Persistent or recurring fever', group: 'Infections & fever',
    specialtySlug: 'infectious_disease', specialistLabel: 'Infectious-disease specialist',
    blurb: 'A fever that lingers or recurs may need specialist work-up.',
    questions: [
      { id: 'q_danger', q: "Any stiff neck, confusion, or a rash that doesn't fade when pressed?", options: [{ label: 'No' }, { label: 'Yes', redFlag: true }] },
      { id: 'q_travel', q: 'Recent travel abroad?', options: [{ label: 'No' }, { label: 'Yes, in the last few weeks' }] },
    ],
    causes: [
      { name: 'A lingering common infection', tone: 'common' },
      { name: 'A travel-related infection', tone: 'less-common' },
      { name: 'An infection needing specialist evaluation', tone: 'serious-rare' },
    ],
    redFlag: 'Fever with a stiff neck, confusion, or a non-fading rash is an emergency — seek care immediately.',
  },

  // ───────────── VASCULAR ─────────────
  {
    name: 'Leg swelling or pain (one leg)', group: 'Veins & circulation',
    specialtySlug: 'vascular', specialistLabel: 'Vascular specialist',
    blurb: 'One-sided leg swelling needs prompt assessment.',
    questions: [
      { id: 'q_sudden', q: 'Is one calf suddenly swollen, painful, warm or red?', options: [{ label: 'No' }, { label: 'Yes', redFlag: true }] },
    ],
    causes: [
      { name: 'Varicose veins / venous issues', tone: 'common' },
      { name: 'A blood clot in the leg (DVT)', tone: 'serious-rare' },
    ],
    redFlag: 'A suddenly swollen, painful, warm calf can be a blood clot — seek urgent care, especially with any breathlessness or chest pain.',
  },
  {
    name: 'Leg pain when walking', group: 'Veins & circulation',
    specialtySlug: 'vascular', specialistLabel: 'Vascular specialist',
    blurb: 'Calf pain that comes on with walking can signal circulation problems.',
    questions: [
      { id: 'q_rest', q: 'Is a leg cold, pale, and painful even at rest?', options: [{ label: 'No' }, { label: 'Yes', redFlag: true }] },
    ],
    causes: [
      { name: 'Reduced circulation (peripheral arterial disease)', tone: 'less-common' },
      { name: 'Muscle or nerve causes', tone: 'common' },
    ],
    redFlag: 'A cold, pale, painful leg can mean a sudden loss of blood supply — that is an emergency.',
  },

  // ───────────── PAIN MEDICINE ─────────────
  {
    name: 'Long-standing pain', group: 'Pain',
    specialtySlug: 'pain_medicine', specialistLabel: 'Pain specialist',
    blurb: 'Pain lasting months can be managed by a pain specialist.',
    questions: [
      { id: 'q_dur', q: 'How long?', options: [{ label: 'Weeks' }, { label: 'Three months or more' }] },
      { id: 'q_red', q: 'Any new weakness, numbness, or loss of bladder/bowel control?', options: [{ label: 'No' }, { label: 'Yes', redFlag: true }] },
    ],
    causes: [
      { name: 'Persistent (chronic) pain', tone: 'common' },
      { name: 'Nerve-related pain', tone: 'less-common' },
    ],
    alternatives: [{ specialist: 'Neurologist', specialtySlug: 'neurology', when: 'for burning/tingling nerve pain or new weakness' }],
    redFlag: 'New weakness, numbness, or loss of bladder/bowel control needs emergency assessment.',
  },

  // ───────────── PHYSICAL MEDICINE & REHAB ─────────────
  {
    name: 'Recovering from injury or surgery', group: 'Recovery & mobility',
    specialtySlug: 'physical_med_rehab', specialistLabel: 'Physiotherapist / rehab specialist',
    blurb: 'Rehab and physiotherapy support recovery of strength and movement.',
    questions: [
      { id: 'q_red', q: 'Any new severe pain, fever, or sudden loss of movement?', options: [{ label: 'No' }, { label: 'Yes', redFlag: true }] },
    ],
    causes: [
      { name: 'Normal post-injury or post-op recovery', tone: 'common' },
      { name: 'A complication needing review', tone: 'less-common' },
    ],
    redFlag: 'New severe pain, fever, or sudden loss of movement should be reviewed promptly.',
  },

  // ───────────── SLEEP MEDICINE ─────────────
  {
    name: 'Snoring with daytime sleepiness', group: 'Sleep',
    specialtySlug: 'sleep_medicine', specialistLabel: 'Sleep specialist',
    blurb: 'Loud snoring with daytime sleepiness can point to sleep apnea.',
    questions: [
      { id: 'q_pause', q: 'Has anyone noticed you stop breathing or gasp in your sleep?', options: [{ label: 'No' }, { label: 'Yes' }] },
      { id: 'q_drive', q: 'Do you doze off during the day, e.g. while driving?', options: [{ label: 'No' }, { label: 'Yes — including while driving', redFlag: true }] },
    ],
    causes: [
      { name: 'Sleep apnea', tone: 'common' },
      { name: 'Other sleep disruption', tone: 'common' },
    ],
    redFlag: 'Falling asleep while driving is dangerous — stop driving and get assessed urgently.',
  },
  {
    name: 'Trouble sleeping (insomnia)', group: 'Sleep',
    specialtySlug: 'sleep_medicine', specialistLabel: 'Sleep specialist',
    blurb: 'Persistent insomnia can be assessed and treated.',
    questions: [
      { id: 'q_mood', q: 'Is low mood or anxiety part of it?', options: [{ label: 'No' }, { label: 'Yes' }] },
    ],
    causes: [
      { name: 'Insomnia / sleep-habit related', tone: 'common' },
      { name: 'Mood or anxiety related', tone: 'common' },
    ],
    alternatives: [{ specialist: 'Mental-health professional', specialtySlug: 'psychiatry', when: 'if low mood or anxiety is driving it' }],
    redFlag: 'If sleeplessness comes with thoughts of self-harm, please reach out for support right away.',
  },

  // ───────────── PODIATRY ─────────────
  {
    name: 'Foot or heel pain', group: 'Feet',
    specialtySlug: 'podiatry', specialistLabel: 'Podiatrist',
    blurb: 'A podiatrist assesses foot and ankle problems.',
    questions: [
      { id: 'q_diab', q: "Do you have diabetes, and is there a wound or ulcer that won't heal?", options: [{ label: 'No' }, { label: 'Yes — a non-healing foot wound', redFlag: true }] },
    ],
    causes: [
      { name: 'Heel/arch strain (e.g. plantar fasciitis)', tone: 'common' },
      { name: 'Tendon or joint problem', tone: 'less-common' },
    ],
    alternatives: [{ specialist: 'Orthopedic surgeon', specialtySlug: 'orthopedics', when: 'for fractures or structural problems' }],
    redFlag: "A foot wound or ulcer that won't heal — especially with diabetes — needs prompt medical care.",
  },

  // ───────────── SEXUAL HEALTH ─────────────
  {
    name: 'Genital symptoms or STI concern', group: 'Sexual health',
    specialtySlug: 'sexual_health', specialistLabel: 'Sexual-health clinician',
    blurb: 'Sexual-health concerns are handled discreetly and without judgment.',
    questions: [
      { id: 'q_testes', q: 'For men: sudden, severe pain in a testicle?', options: [{ label: 'Not applicable / no' }, { label: 'Yes — sudden severe testicle pain', redFlag: true }] },
    ],
    causes: [
      { name: 'A sexually transmitted infection', tone: 'common' },
      { name: 'A non-STI skin or urinary cause', tone: 'common' },
    ],
    alternatives: [
      { specialist: 'Urologist', specialtySlug: 'urology', when: 'for testicular or urinary problems' },
      { specialist: 'Gynecologist', specialtySlug: 'gynecology', when: 'for pelvic pain or discharge in women' },
    ],
    redFlag: 'Sudden, severe pain in a testicle can be an emergency (torsion) — seek care immediately.',
  },

  // ───────────── PEDIATRICS ─────────────
  {
    name: 'A health concern in a child', group: 'Children',
    specialtySlug: 'pediatrics', specialistLabel: 'Pediatrician',
    blurb: 'Children are best assessed by a pediatrician.',
    questions: [
      { id: 'q_red', q: "Any trouble breathing, a rash that doesn't fade when pressed, a stiff neck, or unusual drowsiness?", options: [{ label: 'No' }, { label: 'Yes', redFlag: true }] },
      { id: 'q_fluids', q: 'Is the child drinking and passing urine normally?', options: [{ label: 'Yes' }, { label: 'No — very little', redFlag: true }] },
    ],
    causes: [
      { name: 'A common childhood illness', tone: 'common' },
      { name: 'A condition needing prompt review', tone: 'less-common' },
    ],
    redFlag: 'In a child, trouble breathing, a non-fading rash, a stiff neck, unusual drowsiness, or signs of dehydration are emergencies — seek care now.',
  },

  // ───────────── OBSTETRICS ─────────────
  {
    name: 'A symptom during pregnancy', group: 'Pregnancy',
    specialtySlug: 'obstetrics', specialistLabel: 'Obstetrician',
    blurb: 'Pregnancy symptoms are assessed by an obstetrician or your maternity team.',
    questions: [
      { id: 'q_red', q: 'Any vaginal bleeding, severe abdominal pain, or reduced baby movements?', options: [{ label: 'No' }, { label: 'Yes', redFlag: true }] },
    ],
    causes: [
      { name: 'A common pregnancy symptom', tone: 'common' },
      { name: 'A concern needing prompt review', tone: 'less-common' },
    ],
    alternatives: [{ specialist: 'Gynecologist', specialtySlug: 'gynecology', when: 'for non-pregnancy gynecological concerns' }],
    redFlag: 'Bleeding, severe abdominal pain, or reduced baby movements in pregnancy need urgent assessment by your maternity team.',
  },

  // ───────────── GERIATRICS ─────────────
  {
    name: 'Falls or unsteadiness (older adult)', group: 'Older-adult health',
    specialtySlug: 'geriatrics', specialistLabel: 'Geriatrician',
    blurb: 'A geriatrician can assess falls, balance, and medications together.',
    questions: [
      { id: 'q_head', q: 'Any recent head injury, blackout, or new confusion?', options: [{ label: 'No' }, { label: 'Yes', redFlag: true }] },
      { id: 'q_meds', q: 'On several regular medications?', options: [{ label: 'No' }, { label: 'Yes' }] },
    ],
    causes: [
      { name: 'Balance, strength, or medication-related causes', tone: 'common' },
      { name: 'An underlying condition needing review', tone: 'less-common' },
    ],
    alternatives: [{ specialist: 'Neurologist', specialtySlug: 'neurology', when: 'for new confusion or neurological signs' }],
    redFlag: 'A fall with a head injury, blackout, or new confusion needs urgent assessment.',
  },

  // ───────────── NUTRITION & DIETETICS (no diet/calorie specifics) ─────────────
  {
    name: 'Unintentional weight loss', group: 'Nutrition',
    specialtySlug: 'nutrition_dietetics', specialistLabel: 'Doctor / dietitian',
    blurb: "Weight loss you didn't intend should be checked by a doctor first.",
    questions: [
      { id: 'q_amt', q: 'Have you lost weight without trying?', options: [{ label: 'A little' }, { label: 'A noticeable amount over weeks/months', redFlag: true }] },
    ],
    causes: [
      { name: 'Diet, appetite, or stress related', tone: 'common' },
      { name: 'A medical cause needing evaluation', tone: 'serious-rare' },
    ],
    alternatives: [
      { specialist: 'Internal medicine', specialtySlug: 'internal_med', when: 'to investigate an underlying cause' },
      { specialist: 'Endocrinologist', specialtySlug: 'endocrinology', when: 'if a thyroid/hormonal cause is suspected' },
    ],
    redFlag: 'Significant unintentional weight loss should be evaluated by a doctor to rule out a serious cause.',
  },
];
