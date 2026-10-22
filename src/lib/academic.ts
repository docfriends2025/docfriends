// Academic & scientific writing microsite — single source of copy.
// Used by /academic, /academic/services, /academic/pricing, /academic/faqs.

export const ACADEMIC_NAV = [
  { href: '/academic', label: 'Overview' },
  { href: '/academic/services', label: 'Services' },
  { href: '/academic/pricing', label: 'Pricing' },
  { href: '/academic/faqs', label: 'FAQs' },
];

export const ACADEMIC_SERVICES = [
  { slug: 'academic-scientific-writing', name: 'Academic & Scientific Writing',
    desc: 'Research papers, review articles, case reports, abstracts and scientific content.' },
  { slug: 'manuscript-editing', name: 'Manuscript Editing & Proofreading',
    desc: 'Grammar, language, clarity, sentence structure and academic tone.' },
  { slug: 'thesis-support', name: 'Thesis & Dissertation Support',
    desc: 'Proposal, thesis chapters, literature review, discussion, formatting and language editing.' },
  { slug: 'research-consultancy', name: 'Research Writing & Consultancy',
    desc: 'Research methodology, literature review, research gaps, study design and proposal development.' },
  { slug: 'journal-publication', name: 'Journal Publication Support',
    desc: 'Journal selection, author-guideline compliance, formatting, cover letters and submission preparation.' },
  { slug: 'reviewer-revision', name: 'Reviewer & Revision Support',
    desc: 'Response-to-reviewers preparation, manuscript revisions and language polishing.' },
  { slug: 'medical-healthcare-writing', name: 'Medical & Healthcare Writing',
    desc: 'Scientific/medical articles, patient education material, CME content and healthcare communications.' },
  { slug: 'professional-digital-content', name: 'Professional & Digital Content Writing',
    desc: 'Websites, blogs, newsletters, institutional profiles, brochures and social-media content.' },
  { slug: 'ai-english-services', name: 'AI & English Language Services',
    desc: 'Editing of AI-assisted drafts, similarity and AI reports reviewed, fact and reference checking, and academic language enhancement.' },
];

// The four pricing cards. Card 02 is the featured card.
export const ACADEMIC_PACKAGES = [
  { slug: 'manuscript-editing', title: 'Manuscript Editing & Proofreading', featured: false, price: 5000,
    body: 'Grammar, language, clarity and academic tone. We review your similarity and AI reports with you. Missing citations are added, and flagged passages come back with notes and sources so you revise them yourself.',
    note: 'Up to 4,000 words · ₹1.25 per word after' },
  { slug: 'thesis-support', title: 'Thesis & Dissertation Support', featured: true, price: 28000,
    body: 'Proposal, thesis chapters, literature review, discussion, formatting and language editing.',
    note: 'Up to 20,000 words · Examiner revisions from ₹75,000' },
  { slug: 'journal-publication', title: 'Journal Publication Support', featured: false, price: 5000,
    body: 'Journal selection, author-guideline compliance, formatting, cover letter and submission preparation. We shortlist Scopus and Web of Science indexed journals only.',
    note: 'One target journal · No guarantee of acceptance' },
  { slug: 'scientific-writing', title: 'Scientific Writing', featured: false, price: 12000,
    body: 'Manuscript preparation for original research, reviews and case reports. You provide the data and approve every draft. Writing support is acknowledged in the manuscript.',
    note: 'Case reports. Research papers and reviews quoted after we see the data.' },
];

const ALL_FAQS = [
  // REVIEW: confirm editor background before publishing
  { q: "Who does the writing and editing?",
    a: "Each file is matched to an editor with experience in your field.", published: false },
  // REVIEW: confirm data handling and file deletion before publishing
  { q: "Is my manuscript confidential?",
    a: "Yes. Your files are used only for your project and are shared only with the team working on it. We delete your files on request.", published: false },
  { q: "Do you write the paper for me?",
    a: "No. We edit, support and advise. The ideas, data and conclusions must be yours, and you approve every draft." },
  { q: "Do you guarantee my paper will be accepted?",
    a: "No. Acceptance is the journal's decision. We make sure your manuscript meets the journal's guidelines and reads clearly, and we only recommend Scopus and Web of Science indexed journals." },
  // REVIEW: editing sentence is a draft
  { q: "Will my university or journal know you helped?",
    a: "You stay the author. For scientific writing, the support is acknowledged in the manuscript, as medical journals require. For editing, we send a short summary of the changes made, so you can see what changed and why.", published: false },
  { q: "What is your turnaround time?",
    a: "It depends on length and scope. We confirm the delivery date in your quote, before you pay." },
  { q: "Will my name be on the paper as a ghostwriter?",
    a: "No. You remain the author. We edit, support and advise." },
  { q: "Do you offer revisions?",
    a: "Your quote states how many revision rounds are included. Extra rounds are quoted separately." },
  { q: "How do you handle AI-assisted drafts?",
    a: "We help you edit them and disclose AI use as each journal requires." },
  { q: "How do I start?",
    a: "Send your file and deadline. We reply with a quote." },
];

export const ACADEMIC_FAQS = ALL_FAQS.filter((f) => f.published !== false);

export const PRICING_FOOTNOTE =
  'Prices in INR and exclude GST where applicable. Clients outside India pay the INR amount by international transfer.';

export function formatRupees(n: number): string {
  return '₹' + n.toLocaleString('en-IN');
}
