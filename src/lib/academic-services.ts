// Content for /academic/<slug> service pages — one entry per slug in ACADEMIC_SERVICES.
// Rendered by ~/components/academic/ServiceTemplate.astro.
//
// Rules for this file: plain statements only. No statistics, and no promises about
// acceptance, outcomes or turnaround. Prices and price notes come from ACADEMIC_PACKAGES
// (~/lib/academic); a service with no matching package has price_from: null.
// Chart values are restated from the existing pricing text and nothing else.

import { ACADEMIC_SERVICES, ACADEMIC_PACKAGES } from '~/lib/academic';

export interface ServiceScopeItem { heading: string; body: string }
export interface ServiceStep { heading: string; body: string; meta?: string }
export interface ServiceChartRow { feature: string; state: 'yes' | 'no' | ''; value: string }
export interface ServiceFaq { question: string; answer: string }
export interface ServiceRelatedCard { url: string; title: string; summary: string; price_from: number | null }

export interface ServiceContent {
  slug: string;
  title: string;            // from ACADEMIC_SERVICES.name
  title_short: string;      // used in "Questions about …"
  promise: string;          // from ACADEMIC_SERVICES.desc
  scope_items: ServiceScopeItem[];   // 4 to 6
  steps: ServiceStep[];              // exactly 4
  price_from: number | null;
  price_note: string;
  chart_rows: ServiceChartRow[];
  faqs: ServiceFaq[];                // 4 to 6
  related: [string, string, string]; // 3 other slugs
  featured: boolean;
  quote_url: string;
}

type Slug = (typeof ACADEMIC_SERVICES)[number]['slug'];

// Only these four services have a price today. Each maps to the existing pricing card.
const PACKAGE_FOR_SLUG: Partial<Record<Slug, string>> = {
  'academic-scientific-writing': 'scientific-writing',
  'manuscript-editing': 'manuscript-editing',
  'thesis-support': 'thesis-support',
  'journal-publication': 'journal-publication',
};
const pkg = (slug: Slug) => ACADEMIC_PACKAGES.find((p) => p.slug === PACKAGE_FOR_SLUG[slug]);

const NO_PRICE_NOTE = 'Quoted after we see your file.';

const steps = (what: string, work: string): ServiceStep[] => [
  { heading: 'Send your file', body: `Send ${what}, and your deadline.` },
  { heading: 'Get a quote', body: 'We read your file and reply with a quote that sets out the scope and the price.' },
  { heading: 'We work with you', body: work },
  { heading: 'You review and approve', body: 'You review our work and decide what goes into your document. You stay the author.' },
];

// Answers below that repeat the published FAQ text are copied from ACADEMIC_FAQS.
const FAQ_START: ServiceFaq = { question: 'How do I start?', answer: 'Send your file and deadline. We reply with a quote.' };
const FAQ_REVISIONS: ServiceFaq = { question: 'Do you offer revisions?', answer: 'Your quote states how many revision rounds are included. Extra rounds are quoted separately.' };
const FAQ_NOT_WRITE: ServiceFaq = { question: 'Do you write the paper for me?', answer: 'No. We edit, support and advise. The ideas, data and conclusions must be yours, and you approve every draft.' };
const FAQ_ACCEPTANCE: ServiceFaq = { question: 'Do you guarantee my paper will be accepted?', answer: "No. Acceptance is the journal's decision. We make sure your manuscript meets the journal's guidelines and reads clearly, and we only recommend Scopus and Web of Science indexed journals." };

const priceFaq = (slug: Slug, short: string): ServiceFaq => {
  const p = pkg(slug);
  return p
    ? { question: `How much does ${short} cost?`, answer: `Prices start from ₹${p.price.toLocaleString('en-IN')}. ${p.note.replace(/\.$/, '')}. Prices are in INR and exclude GST where applicable. The final quote comes after we see your file.` }
    : { question: `How is ${short} priced?`, answer: 'We quote after we see your file. Send it with your deadline and we reply with a quote.' };
};

type Draft = Omit<ServiceContent, 'title' | 'promise' | 'price_from' | 'price_note' | 'quote_url' | 'slug'>;

const DRAFTS: Record<Slug, Draft> = {
  'academic-scientific-writing': {
    title_short: 'academic and scientific writing',
    featured: false,
    scope_items: [
      { heading: 'Research papers', body: 'We prepare original-research manuscripts from your data. You approve every draft.' },
      { heading: 'Review articles', body: 'We help you structure and write a review article on your topic.' },
      { heading: 'Case reports', body: 'We write up case reports from the information you provide.' },
      { heading: 'Abstracts', body: 'We write and tighten abstracts to match your paper.' },
      { heading: 'Scientific content', body: 'We prepare other scientific content from your material.' },
      { heading: 'Acknowledgement', body: 'Writing support is acknowledged in the manuscript.' },
    ],
    steps: steps('your data, notes and any draft you have', 'We prepare the manuscript with you from your data. You approve every draft.'),
    chart_rows: [
      { feature: 'Case reports', state: '', value: 'From ₹12,000' },
      { feature: 'Research papers and reviews', state: '', value: 'Quoted after we see the data' },
    ],
    faqs: [
      { question: 'What do I need to provide?', answer: 'You provide the data and approve every draft.' },
      { question: 'Will the writing support be acknowledged?', answer: 'Yes. For scientific writing, the support is acknowledged in the manuscript, as medical journals require.' },
      priceFaq('academic-scientific-writing', 'academic and scientific writing'),
      FAQ_START,
    ],
    related: ['manuscript-editing', 'journal-publication', 'reviewer-revision'],
  },

  'manuscript-editing': {
    title_short: 'manuscript editing',
    featured: false,
    scope_items: [
      { heading: 'Grammar and language', body: 'We correct grammar, spelling and punctuation.' },
      { heading: 'Clarity', body: 'We rework unclear passages so your point is easy to follow.' },
      { heading: 'Sentence structure', body: 'We tighten long or tangled sentences.' },
      { heading: 'Academic tone', body: 'We bring the register in line with academic writing.' },
      { heading: 'Similarity and AI reports', body: 'We review your similarity and AI reports with you.' },
      { heading: 'Citations and flagged passages', body: 'Missing citations are added, and flagged passages come back with notes and sources so you revise them yourself.' },
    ],
    steps: steps('your manuscript and any similarity or AI reports you have', 'We edit the language and clarity, and review your similarity and AI reports with you.'),
    chart_rows: [
      { feature: 'Grammar and language', state: 'yes', value: '' },
      { feature: 'Clarity', state: 'yes', value: '' },
      { feature: 'Sentence structure', state: 'yes', value: '' },
      { feature: 'Academic tone', state: 'yes', value: '' },
      { feature: 'Similarity and AI reports reviewed', state: 'yes', value: '' },
      { feature: 'Words included', state: '', value: 'Up to 4,000 words' },
      { feature: 'Words after that', state: '', value: '₹1.25 per word' },
    ],
    faqs: [
      { question: 'What happens to my similarity and AI reports?', answer: 'We review them with you. Missing citations are added, and flagged passages come back with notes and sources so you revise them yourself.' },
      FAQ_NOT_WRITE,
      priceFaq('manuscript-editing', 'manuscript editing'),
      FAQ_REVISIONS,
      FAQ_START,
    ],
    related: ['thesis-support', 'journal-publication', 'ai-english-services'],
  },

  'thesis-support': {
    title_short: 'thesis and dissertation support',
    featured: true,
    scope_items: [
      { heading: 'Proposal', body: 'We review and edit your research proposal.' },
      { heading: 'Thesis chapters', body: 'We edit your chapters for language and structure.' },
      { heading: 'Literature review', body: 'We help you organise and edit the literature review.' },
      { heading: 'Discussion', body: 'We help you present the discussion of your findings clearly.' },
      { heading: 'Formatting', body: "We format the document to your university's requirements." },
      { heading: 'Language editing', body: 'We edit the language throughout the document.' },
    ],
    steps: steps("your proposal or chapters and your university's guidelines", 'We edit and format the document and give you comments to act on.'),
    chart_rows: [
      { feature: 'Proposal', state: 'yes', value: '' },
      { feature: 'Thesis chapters', state: 'yes', value: '' },
      { feature: 'Literature review', state: 'yes', value: '' },
      { feature: 'Discussion', state: 'yes', value: '' },
      { feature: 'Formatting', state: 'yes', value: '' },
      { feature: 'Language editing', state: 'yes', value: '' },
      { feature: 'Words included', state: '', value: 'Up to 20,000 words' },
      { feature: 'Examiner revisions', state: '', value: 'From ₹75,000' },
    ],
    faqs: [
      { question: 'Can you format to my university’s requirements?', answer: "Yes. Formatting is part of this service. Send your university's guidelines with your file." },
      FAQ_NOT_WRITE,
      priceFaq('thesis-support', 'thesis and dissertation support'),
      FAQ_REVISIONS,
      FAQ_START,
    ],
    related: ['research-consultancy', 'manuscript-editing', 'reviewer-revision'],
  },

  'research-consultancy': {
    title_short: 'research writing and consultancy',
    featured: false,
    scope_items: [
      { heading: 'Research methodology', body: 'We advise on methods that fit your research question.' },
      { heading: 'Literature review', body: 'We help you review the literature on your topic.' },
      { heading: 'Research gaps', body: 'We help you identify and state the gap your study addresses.' },
      { heading: 'Study design', body: 'We discuss study design and how it fits your aims.' },
      { heading: 'Proposal development', body: 'We help you develop your research proposal.' },
    ],
    steps: steps('your topic, and any draft or proposal you have', 'We advise on methodology, literature and study design as they apply to your work.'),
    chart_rows: [],
    faqs: [
      { question: 'What can I ask for help with?', answer: 'Research methodology, the literature review, research gaps, study design and proposal development.' },
      FAQ_NOT_WRITE,
      priceFaq('research-consultancy', 'research writing and consultancy'),
      FAQ_START,
    ],
    related: ['thesis-support', 'academic-scientific-writing', 'journal-publication'],
  },

  'journal-publication': {
    title_short: 'journal publication support',
    featured: false,
    scope_items: [
      { heading: 'Journal selection', body: 'We shortlist Scopus and Web of Science indexed journals only.' },
      { heading: 'Author guidelines', body: "We check your manuscript against the journal's author guidelines." },
      { heading: 'Formatting', body: "We format the manuscript and references to the journal's style." },
      { heading: 'Cover letter', body: 'We help you write the cover letter.' },
      { heading: 'Submission preparation', body: 'We prepare the files and details for submission.' },
    ],
    steps: steps('your manuscript and any journals you are considering', "We shortlist indexed journals and prepare the manuscript and submission to the journal's guidelines."),
    chart_rows: [
      { feature: 'Journal selection', state: 'yes', value: '' },
      { feature: 'Author-guideline compliance', state: 'yes', value: '' },
      { feature: 'Formatting', state: 'yes', value: '' },
      { feature: 'Cover letter', state: 'yes', value: '' },
      { feature: 'Submission preparation', state: 'yes', value: '' },
      { feature: 'Target journals', state: '', value: 'One' },
      { feature: 'Indexing', state: '', value: 'Scopus and Web of Science only' },
      { feature: 'Guaranteed acceptance', state: 'no', value: "Acceptance is the journal's decision" },
    ],
    faqs: [
      FAQ_ACCEPTANCE,
      { question: 'Which journals do you recommend?', answer: 'We shortlist Scopus and Web of Science indexed journals only.' },
      priceFaq('journal-publication', 'journal publication support'),
      FAQ_REVISIONS,
      FAQ_START,
    ],
    related: ['reviewer-revision', 'manuscript-editing', 'academic-scientific-writing'],
  },

  'reviewer-revision': {
    title_short: 'reviewer and revision support',
    featured: false,
    scope_items: [
      { heading: 'Response to reviewers', body: 'We help you prepare your response to each reviewer comment.' },
      { heading: 'Manuscript revisions', body: 'We help you revise the manuscript to address the comments.' },
      { heading: 'Language polishing', body: 'We polish the language of the revised text.' },
      { heading: 'Your decisions', body: 'You decide how to answer each comment. We advise and edit.' },
    ],
    steps: steps('the reviewer comments and your manuscript', 'We help you prepare a response to each comment and polish the revised manuscript.'),
    chart_rows: [],
    faqs: [
      { question: 'What should I send?', answer: 'Send the reviewer comments, your manuscript and your deadline.' },
      FAQ_NOT_WRITE,
      priceFaq('reviewer-revision', 'reviewer and revision support'),
      FAQ_START,
    ],
    related: ['journal-publication', 'manuscript-editing', 'thesis-support'],
  },

  'medical-healthcare-writing': {
    title_short: 'medical and healthcare writing',
    featured: false,
    scope_items: [
      { heading: 'Scientific and medical articles', body: 'We write and edit scientific and medical articles from your material.' },
      { heading: 'Patient education material', body: 'We prepare patient education material in clear language.' },
      { heading: 'CME content', body: 'We prepare continuing medical education (CME) content.' },
      { heading: 'Healthcare communications', body: 'We write healthcare communications for your practice or organisation.' },
    ],
    steps: steps('your source material and brief', 'We write or edit to your brief. You approve every draft.'),
    chart_rows: [],
    faqs: [
      { question: 'What can I ask for?', answer: 'Scientific and medical articles, patient education material, CME content and healthcare communications.' },
      priceFaq('medical-healthcare-writing', 'medical and healthcare writing'),
      FAQ_REVISIONS,
      FAQ_START,
    ],
    related: ['academic-scientific-writing', 'manuscript-editing', 'professional-digital-content'],
  },

  'professional-digital-content': {
    title_short: 'professional and digital content writing',
    featured: false,
    scope_items: [
      { heading: 'Websites', body: 'We write and edit website copy.' },
      { heading: 'Blogs', body: 'We write and edit blog posts.' },
      { heading: 'Newsletters', body: 'We write and edit newsletters.' },
      { heading: 'Institutional profiles', body: 'We write institutional and professional profiles.' },
      { heading: 'Brochures', body: 'We write and edit brochures.' },
      { heading: 'Social-media content', body: 'We write social-media content.' },
    ],
    steps: steps('your brief and any existing material', 'We write or edit the content. You approve every draft.'),
    chart_rows: [],
    faqs: [
      { question: 'What content can you help with?', answer: 'Websites, blogs, newsletters, institutional profiles, brochures and social-media content.' },
      priceFaq('professional-digital-content', 'professional and digital content writing'),
      FAQ_REVISIONS,
      FAQ_START,
    ],
    related: ['medical-healthcare-writing', 'manuscript-editing', 'ai-english-services'],
  },

  'ai-english-services': {
    title_short: 'AI and English language services',
    featured: false,
    scope_items: [
      { heading: 'Editing AI-assisted drafts', body: 'We edit AI-assisted drafts for accuracy, clarity and style.' },
      { heading: 'Similarity and AI reports reviewed', body: 'We review your similarity and AI reports with you.' },
      { heading: 'Fact and reference checking', body: 'We check facts and references against their sources.' },
      { heading: 'Academic language enhancement', body: 'We improve academic language and tone.' },
    ],
    steps: steps('your draft and any similarity or AI reports you have', 'We edit the draft, check facts and references, and review your reports with you.'),
    chart_rows: [],
    faqs: [
      { question: 'How do you handle AI-assisted drafts?', answer: 'We help you edit them and disclose AI use as each journal requires.' },
      { question: 'What happens to my similarity and AI reports?', answer: 'We review them with you.' },
      priceFaq('ai-english-services', 'AI and English language services'),
      FAQ_START,
    ],
    related: ['manuscript-editing', 'academic-scientific-writing', 'professional-digital-content'],
  },
};

export const ACADEMIC_SERVICE_PAGES: ServiceContent[] = ACADEMIC_SERVICES.map((s) => {
  const draft = DRAFTS[s.slug as Slug];
  const p = pkg(s.slug as Slug);
  return {
    slug: s.slug,
    title: s.name,
    promise: s.desc,
    price_from: p ? p.price : null,
    price_note: p ? p.note : NO_PRICE_NOTE,
    quote_url: `/contact?service=${s.slug}`,
    ...draft,
  };
});

export const serviceBySlug = (slug: string) => ACADEMIC_SERVICE_PAGES.find((s) => s.slug === slug);
