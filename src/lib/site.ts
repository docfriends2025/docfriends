// ~/lib/site.ts — static content (things that don't live in the DB).

// Business / contact details — single source of truth, reused in the footer, the
// Contact page, and the policy pages. Blanks are owner-to-fill before Razorpay submission.
export const SITE = {
  name: 'DocFriends',
  company: 'DocFriends',
  founder: 'Rekha Mani',                              // Founder & CEO
  legalEntity: 'DocFriends, operated by Rekha Mani',
  domain: 'docfriends.co',
  tagline: 'A panel of doctors, at your side, within 24 hours.',

  // Contact (verified .co domain). supportEmail/press/doctors all route here.
  contactEmail: 'hello@docfriends.co',
  supportEmail: 'hello@docfriends.co',
  pressEmail:   'hello@docfriends.co',
  doctorsEmail: 'hello@docfriends.co',

  // Registered business location (Chennai, Tamil Nadu). Blanks filled before launch.
  addressLine: '',                                    // street address line
  city:    'Chennai',
  region:  'Tamil Nadu',
  country: 'India',
  pin:     '',                                        // PIN code
  phone:   '',                                        // contact phone (Razorpay expects one)
  gstin:   '',                                        // GSTIN / business registration, if applicable

  // Grievance / Data Protection Officer (DPDP Act, 2023).
  grievanceOfficer: 'Rekha Mani',
  grievanceEmail:   'hello@docfriends.co',

  // Short medical disclaimer surfaced site-wide (footer) and on Terms.
  medicalDisclaimer:
    'DocFriends provides written second opinions for informational purposes only — not a diagnosis, ' +
    'a prescription, or a substitute for your treating doctor or emergency care. DocFriends does not ' +
    'provide emergency services; in an emergency, call 112 (or your local emergency number).',
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
