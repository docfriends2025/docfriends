// ~/lib/symptoms.ts — symptom checker → specialist finder.
// Pure data + logic (no DB, no framework) so it runs server-side for the initial
// render AND in the browser for interactivity. Guidance only — never a diagnosis.

export interface Specialist {
  key: string;
  label: string;            // "Neurologist"
  blurb: string;            // organ/scope
  specialtySlug: string | null; // maps to our specialties table where one exists
}

export interface Cause { name: string; base: number; }
export interface QOption {
  label: string;
  boost?: Record<string, number>; // cause name → score delta
  redFlag?: boolean;
}
export interface Question { id: string; q: string; options: QOption[]; }
export interface Alternative { specialist: string; when: string; }

export interface SymptomData {
  specialist: string;         // primary specialist key
  rationale: string;
  causes?: Cause[];
  questions?: Question[];
  alternatives?: Alternative[];
  redFlag?: string | null;
}

// ─── specialists ─────────────────────────────────────────────────────
export const SPECIALISTS: Record<string, Specialist> = {
  neurologist:        { key: 'neurologist',        label: 'Neurologist',        blurb: 'Brain, nerves & headache disorders',     specialtySlug: 'neurology' },
  cardiologist:       { key: 'cardiologist',       label: 'Cardiologist',       blurb: 'Heart & vascular conditions',            specialtySlug: 'cardiology' },
  gastroenterologist: { key: 'gastroenterologist', label: 'Gastroenterologist', blurb: 'Digestive system & gut',                 specialtySlug: 'gastroenterology' },
  orthopedist:        { key: 'orthopedist',        label: 'Orthopedic surgeon', blurb: 'Bones, joints & spine',                  specialtySlug: 'orthopedics' },
  pulmonologist:      { key: 'pulmonologist',      label: 'Pulmonologist',      blurb: 'Lungs & breathing',                      specialtySlug: 'pulmonology' },
  endocrinologist:    { key: 'endocrinologist',    label: 'Endocrinologist',    blurb: 'Hormones, thyroid & metabolism',         specialtySlug: 'endocrinology' },
  dermatologist:      { key: 'dermatologist',      label: 'Dermatologist',      blurb: 'Skin, hair & nails',                     specialtySlug: 'dermatology' },
  ent:                { key: 'ent',                label: 'ENT specialist',     blurb: 'Ear, nose & throat',                     specialtySlug: 'otolaryngology' },
  urologist:          { key: 'urologist',          label: 'Urologist',          blurb: 'Urinary tract & male repro',             specialtySlug: 'urology' },
  gynecologist:       { key: 'gynecologist',       label: 'Gynecologist',       blurb: "Women's reproductive health",            specialtySlug: 'gynecology' },
  ophthalmologist:    { key: 'ophthalmologist',    label: 'Ophthalmologist',    blurb: 'Eyes & vision',                          specialtySlug: 'ophthalmology' },
  general:            { key: 'general',            label: 'General physician',  blurb: 'Internal medicine & first assessment',   specialtySlug: 'internal_med' },
};

// ─── the 50 symptoms, grouped (matches the wireframe) ────────────────
export const SYMPTOM_GROUPS: [string, string[]][] = [
  ['Head & neuro',     ['Headache', 'Migraine', 'Dizziness', 'Vertigo', 'Memory loss', 'Numbness / tingling', 'Tremor', 'Fainting', 'Seizures']],
  ['Chest & heart',    ['Chest pain', 'Palpitations', 'Shortness of breath', 'Irregular heartbeat', 'Swelling in legs']],
  ['Abdomen & gut',    ['Abdominal pain', 'Nausea', 'Vomiting', 'Diarrhea', 'Constipation', 'Heartburn', 'Blood in stool', 'Bloating']],
  ['Bones & joints',   ['Back pain', 'Knee pain', 'Joint stiffness', 'Neck pain', 'Shoulder pain', 'Muscle weakness']],
  ['Skin',             ['Rash', 'Itching', 'Hair loss', 'Acne', 'Mole changes']],
  ['Respiratory',      ['Cough', 'Wheezing', 'Sore throat', 'Nasal congestion']],
  ['Urinary & repro',  ['Painful urination', 'Frequent urination', 'Pelvic pain', 'Irregular periods']],
  ['General',          ['Fatigue', 'Fever', 'Weight loss', 'Weight gain', 'Night sweats', 'Anxiety', 'Low mood', 'Sleep trouble', 'Swollen glands', 'Loss of appetite']],
];

// Shared follow-ups used when a symptom has no bespoke question set.
export const SHARED_QUESTIONS: Question[] = [
  { id: 'duration', q: 'How long have you had this?', options: [
    { label: 'A few days' }, { label: '1–4 weeks' }, { label: '1–3 months' }, { label: 'More than 3 months' },
  ]},
  { id: 'pattern', q: 'Is it constant or does it come and go?', options: [
    { label: 'Constant' }, { label: 'Comes and goes' },
  ]},
  { id: 'severity', q: 'How much does it affect your day?', options: [
    { label: 'Barely' }, { label: 'Somewhat' }, { label: 'A lot' },
  ]},
  { id: 'redflag', q: 'Any of these right now — high fever, confusion, severe sudden pain, trouble breathing, or fainting?', options: [
    { label: 'No' }, { label: 'Yes', redFlag: true },
  ]},
];

const GENERIC_CAUSES: Cause[] = [
  { name: 'A common, manageable cause', base: 60 },
  { name: 'Something needing a closer look', base: 28 },
  { name: 'A less common cause', base: 12 },
];

// Build a simple entry for symptoms that don't need a bespoke tree.
const simple = (specialist: string, rationale: string, redFlag: string | null = null): SymptomData =>
  ({ specialist, rationale, redFlag });

// ─── per-symptom data ────────────────────────────────────────────────
export const SYMPTOMS: Record<string, SymptomData> = {
  // richly authored
  'Headache': {
    specialist: 'neurologist',
    rationale: 'Recurring or one-sided headaches with visual aura point most strongly to migraine, which a neurologist is best placed to confirm and treat.',
    causes: [{ name: 'Migraine', base: 50 }, { name: 'Tension headache', base: 30 }, { name: 'Cluster headache', base: 12 }, { name: 'Sinus-related', base: 8 }],
    questions: [
      { id: 'location', q: 'Where is the pain?', options: [
        { label: 'One side / behind an eye', boost: { Migraine: 25, 'Cluster headache': 20 } },
        { label: 'Both sides / band-like', boost: { 'Tension headache': 25 } },
        { label: 'Around cheeks / forehead', boost: { 'Sinus-related': 25 } },
      ]},
      { id: 'aura', q: 'Any visual aura or nausea before it starts?', options: [
        { label: 'Yes — flashing lights or nausea', boost: { Migraine: 30 } },
        { label: 'No', boost: { 'Tension headache': 10 } },
      ]},
      { id: 'howlong', q: 'How long have you had this pattern?', options: [
        { label: 'Just started (days)' }, { label: 'Weeks' }, { label: 'Months, comes and goes', boost: { Migraine: 10 } },
      ]},
      { id: 'redflag', q: '"Worst headache of your life", with fever, confusion, or weakness?', options: [
        { label: 'No' }, { label: 'Yes', redFlag: true },
      ]},
    ],
    alternatives: [
      { specialist: 'ent', when: 'If pain centers around the sinuses or follows congestion' },
      { specialist: 'ophthalmologist', when: 'If it tracks with eye strain or vision changes' },
    ],
    redFlag: 'A sudden "worst headache of your life" with fever, confusion, or weakness can be an emergency — seek care now, don\'t wait for an opinion.',
  },
  'Chest pain': {
    specialist: 'cardiologist',
    rationale: 'Chest pain that comes with exertion or radiates needs a cardiologist to rule out heart involvement first.',
    causes: [{ name: 'Angina / cardiac', base: 40 }, { name: 'Acid reflux (GERD)', base: 32 }, { name: 'Musculoskeletal', base: 28 }],
    questions: [
      { id: 'trigger', q: 'When does it happen?', options: [
        { label: 'On exertion / stress', boost: { 'Angina / cardiac': 30 } },
        { label: 'After meals / lying down', boost: { 'Acid reflux (GERD)': 30 } },
        { label: 'With movement or pressing on it', boost: { Musculoskeletal: 30 } },
      ]},
      { id: 'radiate', q: 'Does it spread to your arm, jaw, or back?', options: [
        { label: 'Yes', boost: { 'Angina / cardiac': 25 } }, { label: 'No' },
      ]},
      { id: 'redflag', q: 'Crushing pain now, with sweating, breathlessness, or nausea?', options: [
        { label: 'No' }, { label: 'Yes', redFlag: true },
      ]},
    ],
    alternatives: [
      { specialist: 'gastroenterologist', when: 'If it is clearly tied to meals or reflux' },
      { specialist: 'pulmonologist', when: 'If it is sharp and worse on breathing in' },
    ],
    redFlag: 'Crushing chest pain with sweating, breathlessness, or pain spreading to the arm/jaw may be a heart attack — call emergency services now.',
  },
  'Back pain': {
    specialist: 'orthopedist',
    rationale: 'Most back pain is mechanical and best assessed by an orthopedic specialist; nerve symptoms may add a neurology referral.',
    causes: [{ name: 'Mechanical / muscular', base: 55 }, { name: 'Disc / nerve compression', base: 30 }, { name: 'Inflammatory', base: 15 }],
    questions: [
      { id: 'radiate', q: 'Does pain shoot down a leg or cause numbness?', options: [
        { label: 'Yes', boost: { 'Disc / nerve compression': 30 } }, { label: 'No', boost: { 'Mechanical / muscular': 15 } },
      ]},
      { id: 'onset', q: 'How did it start?', options: [
        { label: 'After lifting / a movement', boost: { 'Mechanical / muscular': 20 } },
        { label: 'Gradually, worse in the morning', boost: { Inflammatory: 20 } },
      ]},
      { id: 'redflag', q: 'Any loss of bladder/bowel control, or numbness around the groin?', options: [
        { label: 'No' }, { label: 'Yes', redFlag: true },
      ]},
    ],
    alternatives: [{ specialist: 'neurologist', when: 'If there is leg weakness, numbness, or shooting nerve pain' }],
    redFlag: 'Back pain with loss of bladder/bowel control or groin numbness is an emergency — seek care immediately.',
  },
  'Abdominal pain': {
    specialist: 'gastroenterologist',
    rationale: 'Persistent or recurring abdominal pain is best worked up by a gastroenterologist.',
    causes: [{ name: 'Acid / gastritis', base: 35 }, { name: 'IBS / functional', base: 30 }, { name: 'Gallbladder', base: 20 }, { name: 'Other', base: 15 }],
    questions: [
      { id: 'where', q: 'Where is it mostly?', options: [
        { label: 'Upper abdomen', boost: { 'Acid / gastritis': 25, Gallbladder: 15 } },
        { label: 'Lower abdomen', boost: { 'IBS / functional': 25 } },
        { label: 'All over / shifts', boost: { 'IBS / functional': 15 } },
      ]},
      { id: 'meals', q: 'Is it linked to meals?', options: [
        { label: 'Worse after eating', boost: { 'Acid / gastritis': 15, Gallbladder: 15 } },
        { label: 'Relieved by passing stool', boost: { 'IBS / functional': 20 } },
        { label: 'No clear link' },
      ]},
      { id: 'redflag', q: 'Severe sudden pain, vomiting blood, or black stools?', options: [
        { label: 'No' }, { label: 'Yes', redFlag: true },
      ]},
    ],
    redFlag: 'Severe sudden abdominal pain, vomiting blood, or black/tarry stools needs urgent care now.',
  },
  'Cough': {
    specialist: 'pulmonologist',
    rationale: 'A cough lasting more than a few weeks is best assessed by a pulmonologist.',
    causes: [{ name: 'Post-viral / airway', base: 45 }, { name: 'Asthma', base: 25 }, { name: 'Reflux-related', base: 18 }, { name: 'Other', base: 12 }],
    questions: [
      { id: 'duration', q: 'How long has it lasted?', options: [
        { label: 'Under 3 weeks', boost: { 'Post-viral / airway': 20 } },
        { label: '3–8 weeks' }, { label: 'Over 8 weeks', boost: { Asthma: 15, 'Reflux-related': 10 } },
      ]},
      { id: 'wheeze', q: 'Any wheezing or breathlessness?', options: [
        { label: 'Yes', boost: { Asthma: 25 } }, { label: 'No' },
      ]},
      { id: 'redflag', q: 'Coughing up blood, or severe breathlessness?', options: [
        { label: 'No' }, { label: 'Yes', redFlag: true },
      ]},
    ],
    alternatives: [{ specialist: 'ent', when: 'If it follows a sore throat or post-nasal drip' }],
    redFlag: 'Coughing up blood or sudden severe breathlessness needs urgent assessment now.',
  },

  // sensible defaults for the rest (specialist + rationale + safety where useful)
  'Migraine':            simple('neurologist', 'Migraine is managed by neurologists, who can confirm it and tailor prevention.'),
  'Dizziness':           simple('neurologist', 'Persistent dizziness is assessed by a neurologist; inner-ear causes may go to ENT.'),
  'Vertigo':             simple('ent', 'Spinning vertigo is most often an inner-ear issue an ENT specialist handles.'),
  'Memory loss':         simple('neurologist', 'New or progressive memory problems should be reviewed by a neurologist.'),
  'Numbness / tingling': simple('neurologist', 'Numbness or tingling points to the nervous system — a neurologist is the right start.', 'Sudden one-sided numbness, face droop, or slurred speech can be a stroke — seek emergency care now.'),
  'Tremor':              simple('neurologist', 'Tremor is evaluated by a neurologist.'),
  'Fainting':            simple('cardiologist', 'Fainting episodes are screened by a cardiologist to rule out heart causes.', 'Fainting with chest pain or palpitations needs urgent assessment.'),
  'Seizures':            simple('neurologist', 'Seizures are managed by neurologists.', 'A first-ever or prolonged seizure is an emergency — call for help now.'),
  'Palpitations':        { specialist: 'cardiologist', rationale: 'A cardiologist can capture and interpret an irregular or racing heartbeat.', causes: [{ name: 'Benign extra beats', base: 50 }, { name: 'Arrhythmia', base: 30 }, { name: 'Thyroid / anxiety', base: 20 }], alternatives: [{ specialist: 'endocrinologist', when: 'If paired with weight loss, heat intolerance, or tremor' }], redFlag: 'Palpitations with fainting, chest pain, or severe breathlessness — seek urgent care.' },
  'Shortness of breath': simple('pulmonologist', 'Breathlessness is assessed by a pulmonologist; a cardiologist if heart-related.', 'Sudden severe breathlessness or with chest pain is an emergency now.'),
  'Irregular heartbeat': simple('cardiologist', 'An irregular heartbeat is a cardiologist’s domain.', 'With fainting or chest pain, seek urgent care.'),
  'Swelling in legs':    simple('cardiologist', 'Leg swelling can reflect heart or vascular issues a cardiologist evaluates.'),
  'Nausea':              simple('gastroenterologist', 'Ongoing nausea is worked up by a gastroenterologist.'),
  'Vomiting':            simple('gastroenterologist', 'Persistent vomiting is assessed by a gastroenterologist.', 'Vomiting blood or unable to keep fluids down — urgent care now.'),
  'Diarrhea':            simple('gastroenterologist', 'Lasting diarrhea is a gastroenterology assessment.', 'Blood in stool with fever or dehydration — seek care promptly.'),
  'Constipation':        simple('gastroenterologist', 'Stubborn constipation is reviewed by a gastroenterologist.'),
  'Heartburn':           simple('gastroenterologist', 'Frequent heartburn / reflux is a gastroenterology matter.'),
  'Blood in stool':      simple('gastroenterologist', 'Blood in the stool should be assessed by a gastroenterologist.', 'Heavy bleeding or faintness — urgent care now.'),
  'Bloating':            simple('gastroenterologist', 'Persistent bloating is a gastroenterology assessment.'),
  'Knee pain':           { specialist: 'orthopedist', rationale: 'Knee pain is an orthopedic assessment, especially after injury.', causes: [{ name: 'Ligament / meniscus', base: 45 }, { name: 'Osteoarthritis', base: 35 }, { name: 'Tendon / overuse', base: 20 }] },
  'Joint stiffness':     simple('orthopedist', 'Joint stiffness is assessed by orthopedics; inflammatory cases may need rheumatology.'),
  'Neck pain':           simple('orthopedist', 'Neck pain is an orthopedic assessment; nerve symptoms add neurology.'),
  'Shoulder pain':       simple('orthopedist', 'Shoulder pain is an orthopedic assessment.'),
  'Muscle weakness':     simple('neurologist', 'True muscle weakness is reviewed by a neurologist.', 'Sudden one-sided weakness can be a stroke — emergency now.'),
  'Rash':                { specialist: 'dermatologist', rationale: 'Skin rashes are a dermatologist’s specialty.', causes: [{ name: 'Eczema / dermatitis', base: 45 }, { name: 'Allergic reaction', base: 30 }, { name: 'Infection', base: 25 }], redFlag: 'A rash with fever, blistering, or swelling of lips/face — urgent care now.' },
  'Itching':             simple('dermatologist', 'Persistent itching is assessed by a dermatologist.'),
  'Hair loss':           simple('dermatologist', 'Hair loss is reviewed by a dermatologist.'),
  'Acne':                simple('dermatologist', 'Acne is treated by a dermatologist.'),
  'Mole changes':        simple('dermatologist', 'A changing mole should be checked promptly by a dermatologist.'),
  'Wheezing':            simple('pulmonologist', 'Wheezing is assessed by a pulmonologist.'),
  'Sore throat':         simple('ent', 'A lasting sore throat is an ENT assessment.'),
  'Nasal congestion':    simple('ent', 'Chronic congestion is an ENT matter.'),
  'Painful urination':   simple('urologist', 'Painful urination is assessed by a urologist (or gynecologist).'),
  'Frequent urination':  simple('urologist', 'Frequent urination is reviewed by a urologist; if with thirst, endocrinology.'),
  'Pelvic pain':         simple('gynecologist', 'Pelvic pain is assessed by a gynecologist.'),
  'Irregular periods':   simple('gynecologist', 'Irregular periods are a gynecology assessment.'),
  'Fatigue':             { specialist: 'general', rationale: 'Ongoing fatigue is best triaged by a general physician who can order the right screen.', causes: [{ name: 'Sleep / lifestyle', base: 40 }, { name: 'Thyroid / anemia', base: 35 }, { name: 'Mood-related', base: 25 }], alternatives: [{ specialist: 'endocrinologist', when: 'If paired with weight change, cold/heat intolerance' }] },
  'Fever':               simple('general', 'Persistent fever is triaged by a general physician.', 'Very high fever with confusion, stiff neck, or rash — urgent care now.'),
  'Weight loss':         simple('general', 'Unexplained weight loss should be triaged by a general physician.'),
  'Weight gain':         simple('endocrinologist', 'Unexplained weight gain may be hormonal — an endocrinologist can assess.'),
  'Night sweats':        simple('general', 'Night sweats are triaged by a general physician.'),
  'Anxiety':             simple('general', 'A general physician can assess anxiety and refer for support.'),
  'Low mood':            simple('general', 'Low mood is triaged by a general physician who can guide next steps.'),
  'Sleep trouble':       simple('general', 'Ongoing sleep trouble is triaged by a general physician.'),
  'Swollen glands':      simple('general', 'Persistently swollen glands should be reviewed by a general physician.'),
  'Loss of appetite':    simple('general', 'Lasting loss of appetite is triaged by a general physician.'),
};

// ─── recommendation engine ───────────────────────────────────────────
export interface Recommendation {
  primarySymptom: string;
  specialist: Specialist;
  causes: { name: string; pct: number; tone: 'green' | 'yellow' | 'gray' }[];
  alternatives: { specialist: Specialist; when: string }[];
  redFlag: string | null;
  urgent: boolean;
}

export function questionsFor(symptom: string): Question[] {
  return SYMPTOMS[symptom]?.questions ?? SHARED_QUESTIONS;
}

export function recommend(selected: string[], answers: Record<string, string>): Recommendation | null {
  const primarySymptom = selected.find((s) => SYMPTOMS[s]) ?? selected[0];
  if (!primarySymptom) return null;
  const data = SYMPTOMS[primarySymptom];
  const questions = data.questions ?? SHARED_QUESTIONS;

  const causeList = (data.causes ?? GENERIC_CAUSES).map((c) => ({ name: c.name, score: c.base }));
  let urgent = false;
  for (const q of questions) {
    const chosen = answers[q.id];
    const opt = q.options.find((o) => o.label === chosen);
    if (!opt) continue;
    if (opt.redFlag) urgent = true;
    if (opt.boost) for (const [name, delta] of Object.entries(opt.boost)) {
      const c = causeList.find((x) => x.name === name);
      if (c) c.score += delta;
    }
  }
  const total = causeList.reduce((s, c) => s + Math.max(0, c.score), 0) || 1;
  const causes = causeList
    .map((c) => ({ name: c.name, raw: Math.max(0, c.score) }))
    .sort((a, b) => b.raw - a.raw)
    .map((c, i) => ({ name: c.name, pct: Math.round((c.raw / total) * 100), tone: (i === 0 ? 'green' : i === 1 ? 'yellow' : 'gray') as 'green' | 'yellow' | 'gray' }));

  const specialist = SPECIALISTS[data.specialist] ?? SPECIALISTS.general;
  const alternatives = (data.alternatives ?? [])
    .map((a) => ({ specialist: SPECIALISTS[a.specialist], when: a.when }))
    .filter((a) => a.specialist);

  return { primarySymptom, specialist, causes, alternatives, redFlag: data.redFlag ?? null, urgent };
}
