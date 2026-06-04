// ~/lib/site.ts — static content (things that don't live in the DB).

export const SITE = {
  name: 'DocFriends',
  domain: 'docfriends.co',
  tagline: 'A panel of doctors, at your side, within 24 hours.',
  supportEmail: 'help@docfriends.com',
  doctorsEmail: 'doctors@docfriends.com',
  pressEmail: 'hello@docfriends.com',
  office: '73 Wickham Lane, Brooklyn, NY 11215',
  phone: '+1 (212) 555-0143',
};

// Primary marketing nav (public pages).
export const NAV_LINKS = [
  { href: '/',        label: 'Home',    match: ['/'] },
  { href: '/find-a-specialist', label: 'Find a specialist', match: ['/find-a-specialist'] },
  { href: '/pricing', label: 'Pricing', match: ['/pricing'] },
  { href: '/faqs',    label: 'FAQs',    match: ['/faqs'] },
  { href: '/journal', label: 'Journal', match: ['/journal'] },
  { href: '/for-physicians', label: 'For physicians', match: ['/for-physicians'] },
  { href: '/contact', label: 'Contact', match: ['/contact'] },
] as const;

// Where each role lands after sign-in.
export const HOME_FOR_ROLE: Record<string, string> = {
  client: '/dashboard',
  doctor: '/doctor',
  admin:  '/admin',
};

export const JOURNAL_CATEGORIES = [
  { slug: 'all',           label: 'All' },
  { slug: 'decisions',     label: 'Decisions' },
  { slug: 'patient_guides',label: 'Patient guides' },
  { slug: 'stories',       label: 'Stories' },
  { slug: 'inside',        label: 'Inside' },
] as const;
