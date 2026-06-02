// ~/lib/content.ts — read helpers for public content. Each falls back to a
// static copy of the seed so the marketing site renders even before Turso is wired.
import { getDb, hasDb, type Env } from './db';

export interface Faq { id: string; category: string; question: string; answer: string; }
export interface JournalPost {
  slug: string; title: string; category: string | null; excerpt: string | null;
  authorName: string | null; authorInitials: string | null; readMinutes: number | null;
  featured: boolean; publishedAt: number | null;
}
export interface Package {
  slug: string; name: string; opinionCount: number; priceCents: number; blurb: string | null; featured: boolean;
}
export interface Specialty { slug: string; name: string; }

export const FAQ_CATEGORIES = [
  { slug: 'getting_started',  label: 'Getting started' },
  { slug: 'doctors_matching', label: 'Doctors & matching' },
  { slug: 'billing',          label: 'Billing & teleconsult' },
] as const;

const FALLBACK_FAQS: Faq[] = [
  { id: 'f1', category: 'getting_started', question: 'How fast do I get my opinion?', answer: 'All packages deliver within 24 hours from confirmed submission. If we miss it, full refund — no questions.' },
  { id: 'f2', category: 'getting_started', question: 'What can I submit?', answer: 'Reports, scans (PDF, JPG, DICOM), your symptoms in your own words, an existing diagnosis if you have one, and up to three questions for the doctors.' },
  { id: 'f3', category: 'getting_started', question: 'Do I need a diagnosis already?', answer: 'No. Many clients come to us precisely because they are unsure. Describe what is going on and our doctors take it from there.' },
  { id: 'f4', category: 'doctors_matching', question: 'Who reads my case?', answer: 'Board-certified specialists with a minimum eight years post-residency. We vet every doctor before they join our network.' },
  { id: 'f5', category: 'doctors_matching', question: 'Can I pick my doctor?', answer: 'You can state a preference and our case managers honour it where possible. Otherwise our algorithm matches you on specialty fit, availability, and philosophy.' },
  { id: 'f6', category: 'doctors_matching', question: 'What if a doctor declines?', answer: 'We re-match immediately from your panel waitlist, so your 24-hour clock is never at risk.' },
  { id: 'f7', category: 'billing', question: 'When am I charged?', answer: 'You only pay when you choose a panel. Telling us what is going on and uploading reports is free.' },
  { id: 'f8', category: 'billing', question: 'Is a teleconsult included?', answer: 'Written opinions are included in every package. A follow-up video teleconsult with any doctor who reviewed you can be booked separately.' },
];

const FALLBACK_POSTS: JournalPost[] = [
  { slug: 'second-opinion-before-surgery', title: 'Should you get a second opinion before surgery?', category: 'decisions', excerpt: 'The 30-second version: it costs less than you think, and saves you more than you would guess. Here is the long version.', authorName: 'Dr. Devika Mehta', authorInitials: 'DM', readMinutes: 8, featured: true, publishedAt: 1747526520000 },
  { slug: 'what-good-doctors-do', title: "What good doctors do when they don't know", category: 'inside', excerpt: 'Uncertainty is part of medicine. The best specialists say so — and tell you what to do next.', authorName: 'Editorial', authorInitials: 'ED', readMinutes: 5, featured: false, publishedAt: 1747440000000 },
  { slug: 'how-we-vet-specialists', title: 'How we vet our 500+ specialists', category: 'inside', excerpt: 'Board certification is the floor, not the ceiling. A look at what it takes to join the network.', authorName: 'Anya P., Head of Network', authorInitials: 'AP', readMinutes: 6, featured: false, publishedAt: 1747353600000 },
  { slug: 'reading-your-lab-report', title: 'Reading your own lab report — the basics', category: 'patient_guides', excerpt: 'Reference ranges, flagged values, and what actually warrants a call to your doctor.', authorName: 'Dr. S. Khurana', authorInitials: 'SK', readMinutes: 4, featured: false, publishedAt: 1747267200000 },
  { slug: 'avoided-surgery-story', title: 'The surgery I almost had', category: 'stories', excerpt: 'A reader shares how a three-doctor panel changed her mind — and her year.', authorName: 'As told to DocFriends', authorInitials: 'DF', readMinutes: 7, featured: false, publishedAt: 1747180800000 },
  { slug: 'preparing-for-teleconsult', title: 'Getting the most from a teleconsult', category: 'patient_guides', excerpt: 'Fifteen minutes goes fast. Here is how to come prepared so it counts.', authorName: 'Dr. A. Lim', authorInitials: 'AL', readMinutes: 4, featured: false, publishedAt: 1747094400000 },
];

const FALLBACK_PACKAGES: Package[] = [
  { slug: 'single',  name: 'Single',  opinionCount: 1, priceCents: 14900, blurb: 'A sanity check', featured: false },
  { slug: 'council', name: 'Council', opinionCount: 3, priceCents: 34900, blurb: 'Compare three perspectives', featured: true },
  { slug: 'board',   name: 'Board',   opinionCount: 5, priceCents: 54900, blurb: 'A full panel', featured: false },
];

const FALLBACK_SPECIALTIES: Specialty[] = [
  { slug: 'cardiology', name: 'Cardiology' }, { slug: 'oncology', name: 'Oncology' },
  { slug: 'neurology', name: 'Neurology' }, { slug: 'orthopedics', name: 'Orthopedics' },
  { slug: 'endocrinology', name: 'Endocrinology' }, { slug: 'pulmonology', name: 'Pulmonology' },
  { slug: 'gastroenterology', name: 'Gastroenterology' }, { slug: 'internal_med', name: 'Internal Medicine' },
  { slug: 'dermatology', name: 'Dermatology' }, { slug: 'otolaryngology', name: 'Otolaryngology (ENT)' },
  { slug: 'urology', name: 'Urology' }, { slug: 'gynecology', name: 'Gynecology' },
  { slug: 'ophthalmology', name: 'Ophthalmology' },
];

export async function getFaqs(env: Env): Promise<Faq[]> {
  if (!hasDb(env)) return FALLBACK_FAQS;
  try {
    const res = await getDb(env).execute('SELECT id, category, question, answer FROM faqs ORDER BY position, rowid');
    if (!res.rows.length) return FALLBACK_FAQS;
    return res.rows.map((r) => ({ id: String(r.id), category: String(r.category), question: String(r.question), answer: String(r.answer) }));
  } catch (e) { console.error('getFaqs', e); return FALLBACK_FAQS; }
}

export async function getJournalPosts(env: Env): Promise<JournalPost[]> {
  if (!hasDb(env)) return FALLBACK_POSTS;
  try {
    const res = await getDb(env).execute('SELECT slug, title, category, excerpt, author_name, author_initials, read_minutes, featured, published_at FROM journal_posts WHERE published = 1 ORDER BY featured DESC, published_at DESC');
    if (!res.rows.length) return FALLBACK_POSTS;
    return res.rows.map((r) => ({
      slug: String(r.slug), title: String(r.title), category: r.category ? String(r.category) : null,
      excerpt: r.excerpt ? String(r.excerpt) : null, authorName: r.author_name ? String(r.author_name) : null,
      authorInitials: r.author_initials ? String(r.author_initials) : null,
      readMinutes: r.read_minutes ? Number(r.read_minutes) : null, featured: !!Number(r.featured),
      publishedAt: r.published_at ? Number(r.published_at) : null,
    }));
  } catch (e) { console.error('getJournalPosts', e); return FALLBACK_POSTS; }
}

export async function getPackages(env: Env): Promise<Package[]> {
  if (!hasDb(env)) return FALLBACK_PACKAGES;
  try {
    const res = await getDb(env).execute('SELECT slug, name, opinion_count, price_cents, blurb, featured FROM packages ORDER BY position');
    if (!res.rows.length) return FALLBACK_PACKAGES;
    return res.rows.map((r) => ({ slug: String(r.slug), name: String(r.name), opinionCount: Number(r.opinion_count), priceCents: Number(r.price_cents), blurb: r.blurb ? String(r.blurb) : null, featured: !!Number(r.featured) }));
  } catch (e) { console.error('getPackages', e); return FALLBACK_PACKAGES; }
}

export async function getSpecialties(env: Env): Promise<Specialty[]> {
  if (!hasDb(env)) return FALLBACK_SPECIALTIES;
  try {
    const res = await getDb(env).execute('SELECT slug, name FROM specialties WHERE active = 1 ORDER BY position');
    if (!res.rows.length) return FALLBACK_SPECIALTIES;
    return res.rows.map((r) => ({ slug: String(r.slug), name: String(r.name) }));
  } catch (e) { console.error('getSpecialties', e); return FALLBACK_SPECIALTIES; }
}
