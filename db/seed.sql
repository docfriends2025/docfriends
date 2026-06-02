-- DocFriends — seed.sql  (run with `npm run db:seed`)
-- Idempotent via INSERT OR IGNORE / OR REPLACE. Demo data so every surface renders.

-- ─── Packages (USD, per wireframe screen 8) ──────────────────────────
INSERT OR REPLACE INTO packages (slug, name, opinion_count, price_cents, blurb, featured, position) VALUES
  ('single',  'Single',  1, 14900, 'A sanity check',         0, 10),
  ('council', 'Council', 3, 34900, 'Compare three perspectives', 1, 20),
  ('board',   'Board',   5, 54900, 'A full panel',           0, 30);

-- ─── Specialties ─────────────────────────────────────────────────────
INSERT OR IGNORE INTO specialties (slug, name, description, position, active) VALUES
  ('cardiology',       'Cardiology',       'Heart & vascular conditions',     10, 1),
  ('oncology',         'Oncology',         'Cancer diagnosis & treatment',    20, 1),
  ('neurology',        'Neurology',        'Brain, spine, nerves',            30, 1),
  ('orthopedics',      'Orthopedics',      'Bones, joints, sports injuries',  40, 1),
  ('endocrinology',    'Endocrinology',    'Hormones, thyroid, diabetes',     50, 1),
  ('pulmonology',      'Pulmonology',      'Lungs & respiratory',             60, 1),
  ('gastroenterology', 'Gastroenterology', 'Digestive system',                70, 1),
  ('internal_med',     'Internal Medicine','General internal medicine',       80, 1),
  ('dermatology',      'Dermatology',        'Skin, hair & nails',             90, 1),
  ('otolaryngology',   'Otolaryngology (ENT)','Ear, nose & throat',           100, 1),
  ('urology',          'Urology',            'Urinary tract & male reproductive',110, 1),
  ('gynecology',       'Gynecology',         'Women''s reproductive health',   120, 1),
  ('ophthalmology',    'Ophthalmology',      'Eyes & vision',                  130, 1);

-- ─── FAQs (wireframe screen 4) ───────────────────────────────────────
INSERT OR REPLACE INTO faqs (id, category, question, answer, position) VALUES
  ('faq_01', 'getting_started',   'How fast do I get my opinion?', 'All packages deliver within 24 hours from confirmed submission. If we miss it, full refund — no questions.', 10),
  ('faq_02', 'getting_started',   'What can I submit?', 'Reports, scans (PDF, JPG, DICOM), your symptoms in your own words, an existing diagnosis if you have one, and up to three questions for the doctors.', 20),
  ('faq_03', 'getting_started',   'Do I need a diagnosis already?', 'No. Many clients come to us precisely because they are unsure. Describe what is going on and our doctors take it from there.', 30),
  ('faq_04', 'doctors_matching',  'Who reads my case?', 'Board-certified specialists with a minimum eight years post-residency. We vet every doctor before they join our network.', 10),
  ('faq_05', 'doctors_matching',  'Can I pick my doctor?', 'You can state a preference and our case managers honour it where possible. Otherwise our algorithm matches you on specialty fit, availability, and philosophy.', 20),
  ('faq_06', 'doctors_matching',  'What if a doctor declines?', 'We re-match immediately from your panel''s waitlist, so your 24-hour clock is never at risk.', 30),
  ('faq_07', 'billing',           'When am I charged?', 'You only pay when you choose a panel. Telling us what is going on and uploading reports is free.', 10),
  ('faq_08', 'billing',           'Is a teleconsult included?', 'Written opinions are included in every package. A follow-up video teleconsult with any doctor who reviewed you can be booked separately.', 20);

-- ─── Journal posts (wireframe screen 5) ──────────────────────────────
INSERT OR REPLACE INTO journal_posts (slug, title, category, excerpt, author_name, author_initials, read_minutes, featured, published, published_at, created_at) VALUES
  ('second-opinion-before-surgery', 'Should you get a second opinion before surgery?', 'decisions', 'The 30-second version: it costs less than you think, and saves you more than you would guess. Here is the long version.', 'Dr. Devika Mehta', 'DM', 8, 1, 1, 1747526520000, 1747526520000),
  ('what-good-doctors-do', 'What good doctors do when they don''t know', 'inside', 'Uncertainty is part of medicine. The best specialists are the ones who say so — and tell you what to do next.', 'Editorial', 'ED', 5, 0, 1, 1747440000000, 1747440000000),
  ('how-we-vet-specialists', 'How we vet our 500+ specialists', 'inside', 'Board certification is the floor, not the ceiling. A look at what it takes to join the DocFriends network.', 'Anya P., Head of Network', 'AP', 6, 0, 1, 1747353600000, 1747353600000),
  ('reading-your-lab-report', 'Reading your own lab report — the basics', 'patient_guides', 'Reference ranges, flagged values, and what actually warrants a call to your doctor.', 'Dr. S. Khurana', 'SK', 4, 0, 1, 1747267200000, 1747267200000),
  ('avoided-surgery-story', 'The surgery I almost had', 'stories', 'A reader shares how a three-doctor panel changed her mind — and her year.', 'As told to DocFriends', 'DF', 7, 0, 1, 1747180800000, 1747180800000),
  ('preparing-for-teleconsult', 'Getting the most from a teleconsult', 'patient_guides', 'Fifteen minutes goes fast. Here is how to come prepared so it counts.', 'Dr. A. Lim', 'AL', 4, 0, 1, 1747094400000, 1747094400000);

-- ─── Doctors ─────────────────────────────────────────────────────────
INSERT OR REPLACE INTO doctors (id, user_id, name, initials, specialty_slug, subspecialty, hospital, location, years_practice, rating, review_count, verified, active, bio, created_at) VALUES
  ('doc_mehta',   'usr_doctor', 'Dr. Devika Mehta', 'DM', 'cardiology',   'Interventional',    'NYU Langone',     'New York',   22, 4.98, 62, 1, 1, 'Interventional cardiologist focused on conservative-first care.', 1735689600000),
  ('doc_khurana', NULL,         'Dr. S. Khurana',   'SK', 'cardiology',   'Imaging',           'Mayo Clinic',     'Rochester',  18, 4.93, 41, 1, 1, 'Cardiac imaging and prevention.', 1735689600000),
  ('doc_lim',     NULL,         'Dr. A. Lim',       'AL', 'internal_med', 'General',           'Stanford',        'Palo Alto',  14, 4.95, 28, 1, 1, 'Internal medicine; loves a good differential.', 1735689600000),
  ('doc_patel',   NULL,         'Dr. R. Patel',     'RP', 'oncology',     'Active surveillance','MSKCC',          'New York',   16, 4.89, 33, 1, 1, 'Research-active in prostate active surveillance.', 1735689600000),
  ('doc_tanaka',  NULL,         'Dr. C. Tanaka',    'CT', 'oncology',     'Surgical',          'UCSF',            'San Francisco', 15, 4.81, 24, 1, 1, 'Surgical oncology with a measured hand.', 1735689600000),
  ('doc_nair',    NULL,         'Dr. J. Nair',      'JN', 'neurology',    'Headache',          'Cleveland Clinic','Cleveland',  19, 4.91, 37, 1, 1, 'Headache and migraine specialist.', 1735689600000);

-- ─── Demo users (sign in with these emails; magic link verifies) ─────
INSERT OR IGNORE INTO users (id, email, name, phone, role, email_verified_at, created_at, last_seen_at) VALUES
  ('usr_client', 'maya@example.com',  'Maya Rao',    '+1 212 555 0143', 'client', 1747000000000, 1740000000000, 1747526520000),
  ('usr_doctor', 'mehta@example.com', 'Dr. Devika Mehta', NULL,         'doctor', 1747000000000, 1735689600000, 1747526520000),
  ('usr_admin',  'sarah@example.com', 'Sarah K.',    NULL,              'admin',  1747000000000, 1735689600000, 1747526520000);

-- ─── Sample cases for Maya (wireframe screens 10/11) ─────────────────
INSERT OR REPLACE INTO cases (id, ref, user_id, title, status, package_slug, specialty_slug, symptoms, diagnosis, medications, questions_json, demographics_json, family_history, lifestyle, doctor_pref, price_cents, payment_status, consensus, delivered_at, source, created_at, updated_at) VALUES
  ('case_4821', '4821', 'usr_client', 'Persistent chest pain', 'delivered', 'council', 'cardiology',
   'Chest tightness when climbing stairs, started three months ago. Worse in cold weather. Mostly resolves with rest. Sometimes feels like a fist squeezing. Wakes me up occasionally.',
   'Stable angina · March 2026', 'Atorvastatin 20 mg, Aspirin 75 mg, Metoprolol 25 mg',
   '["Do I actually need an angiogram now?","Is there a less aggressive path I''m not seeing?","How worried should I be about my father''s history?"]',
   '{"name":"Maya R.","age":34,"sex":"female"}', 'Father · CAD at 58', 'Non-smoker · cyclist · stressful job',
   'Someone with a conservative philosophy', 34900, 'paid',
   'conservative-first', 1747526520000, 'web', 1747440000000, 1747526520000),
  ('case_4728', '4728', 'usr_client', 'Knee · meniscus repair?', 'closed', 'single', 'orthopedics',
   'Knee pain after a fall. MRI shows medial meniscus tear.', 'Medial meniscus tear', 'Ibuprofen as needed',
   '["Surgery or physio first?"]', '{"name":"Maya R.","age":34,"sex":"female"}', NULL, 'Cyclist',
   NULL, 14900, 'paid', NULL, 1743724800000, 'web', 1743638400000, 1743724800000),
  ('case_4612', '4612', 'usr_client', 'Recurring migraines', 'closed', 'board', 'neurology',
   'Migraines 3–4x a month, light sensitivity, occasional aura.', NULL, 'Sumatriptan',
   '["What preventives are worth trying?"]', '{"name":"Maya R.","age":34,"sex":"female"}', NULL, NULL,
   NULL, 54900, 'paid', NULL, 1739750400000, 'web', 1739664000000, 1739750400000);

-- panel for #4821
INSERT OR REPLACE INTO case_doctors (id, case_id, doctor_id, status, fit_score, commission_cents, offered_at, responded_at, submitted_at) VALUES
  ('cd_4821_1', 'case_4821', 'doc_mehta',   'submitted', 97, 8000, 1747443600000, 1747444000000, 1747520000000),
  ('cd_4821_2', 'case_4821', 'doc_khurana', 'submitted', 92, 8000, 1747443600000, 1747445000000, 1747521000000),
  ('cd_4821_3', 'case_4821', 'doc_lim',     'submitted', 84, 8000, 1747443600000, 1747446000000, 1747522000000);

-- opinions for #4821 (2 vs 1: conservative-first)
INSERT OR REPLACE INTO opinions (id, case_id, doctor_id, verdict, diagnosis_review, next_steps, answers_json, red_flags, available_teleconsult, status, created_at, updated_at, submitted_at) VALUES
  ('op_4821_1', 'case_4821', 'doc_mehta', 'Surgery / angiogram not indicated at this stage.',
   'Findings consistent with stable angina. CT does not show flow-limiting lesions.',
   'Begin a 6-week trial of beta-blocker dose adjustment plus statin optimization. Lifestyle: cardiac rehab program. Re-evaluate symptoms in 6 weeks.',
   '["Angiogram is not urgently needed; conservative management has strong evidence here.","Yes — symptom-guided medical therapy is reasonable.","Family history is a factor but not destiny; modifiable risk dominates."]',
   'Sudden pain at rest, pain > 20 minutes, syncope, dyspnea — present to ED immediately.', 1, 'submitted', 1747510000000, 1747520000000, 1747520000000),
  ('op_4821_2', 'case_4821', 'doc_khurana', 'Surgery not indicated.',
   'Agree with conservative approach. Imaging in three months is reasonable.',
   'Re-image in three months and add a nitrate as needed. No reason to rush an angiogram given current presentation.',
   '["No urgent angiogram.","A measured medical path is appropriate.","Monitor, do not panic."]',
   'Escalate for rest pain or new ECG changes.', 1, 'submitted', 1747511000000, 1747521000000, 1747521000000),
  ('op_4821_3', 'case_4821', 'doc_lim', 'Investigate GI causes first.',
   'Worth ruling out GERD before assuming a purely cardiac origin.',
   'Empirical PPI trial for four weeks; if symptoms persist, escalate cardiac workup including stress echo.',
   '["Reasonable to defer angiogram pending GI workup.","A GI-first path is the less aggressive option.","Shared risk factors, but address reflux first."]',
   'Any exertional syncope or crescendo pattern — cardiology now.', 0, 'submitted', 1747512000000, 1747522000000, 1747522000000);

-- a couple of Q&A messages on #4821
INSERT OR REPLACE INTO messages (id, case_id, doctor_id, sender, body, created_at) VALUES
  ('msg_1', 'case_4821', 'doc_mehta', 'doctor', 'Two things I want to clarify: is the pain constant, or only with specific movements? And have you tried any physical therapy?', 1747450000000),
  ('msg_2', 'case_4821', 'doc_mehta', 'patient', 'Mostly with stairs (down more than up) and when I twist suddenly. Sitting and sleeping are fine.', 1747453000000);

-- payments + feedback
INSERT OR REPLACE INTO payments (id, case_id, user_id, amount_cents, status, provider, provider_id, payload_json, created_at, updated_at) VALUES
  ('pay_4821', 'case_4821', 'usr_client', 34900, 'paid', 'stub', 'stub_4821', '{"stub":true}', 1747440000000, 1747440000000);
