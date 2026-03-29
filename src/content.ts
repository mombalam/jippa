export type InterestArea = 'borrow' | 'save' | 'spend' | 'all';

export const interestOptions: Array<{ value: InterestArea; label: string }> = [
  { value: 'borrow', label: 'Instant Credit' },
  { value: 'save', label: 'Savings' },
  { value: 'spend', label: 'Global Card' },
  { value: 'all', label: 'All of the above' },
];

export const siteContent = {
  assets: {
    logo: '/assets/jippa-logo-primary.png',
    icon: '/assets/jippa-icon-j.png',
    home: '/assets/home-screen.png',
    borrow: '/assets/borrow-screen.png',
    savings: '/assets/savings-screen.png',
    cards: '/assets/cards-screen.png',
  },
  nav: {
    cta: 'JOIN WAITLIST',
  },
  hero: {
    titleLead: 'The bank',
    titleHighlight: 'you',
    titleTail: 'deserve.',
    subtitle: 'Right in your pocket.',
    description: 'No queues. No paperwork. Just secure USD banking and instant credit.',
    primaryCta: 'START YOUR JOURNEY',
    callouts: ['Borrow', 'Stash', 'Card'],
    supportEyebrow: 'USD savings',
    supportTitle: 'Set goals. Save daily.',
  },
  showcase: {
    kicker: '',
    title: 'Everything you need to stay on top of your money.',
    description:
      'Life doesn’t stand still, and neither should your finances. Jippa unlocks a smarter way to borrow, save, and spend, all from one simple app.',
  },
  valueStrip: [
    {
      title: 'Apply in 2 minutes',
      description: 'See your limit and borrow without turning it into a whole process.',
    },
    {
      title: 'Save in USD',
      description: 'Build your stash and keep money aside from daily spending.',
    },
    {
      title: 'Control your card',
      description: 'Copy details fast, pay online, and freeze the card whenever you need to.',
    },
  ],
  products: [
    {
      id: 'borrow',
      label: '',
      title: 'Short before month-end?',
      eyebrow: 'APPLY IN 2 MINUTES • $10-$500',
      description: 'See what you can borrow, choose an amount, pick a term, and get cash instantly.',
      points: ['See your available limit', 'Choose your repayment term', 'Get cash instantly'],
      image: '/assets/borrow-screen.png',
      alt: 'Jippa Instant Credit screen showing a credit limit and borrowing controls.',
    },
    {
      id: 'save',
      label: '',
      title: 'Trying to keep dollars aside?',
      eyebrow: 'VAULT BALANCE • AUTO-PILOT',
      description: 'Build a USD stash, set goals that matter, and stop mixing savings with everyday spending.',
      points: ['Track your vault balance', 'Set goals that matter to you', 'Build a saving habit'],
      image: '/assets/savings-screen.png',
      alt: 'Jippa Stash screen showing savings balance and financial goals.',
    },
    {
      id: 'card',
      label: '',
      title: 'The world in your pocket.',
      eyebrow: 'JIPPA OBSIDIAN VIRTUAL',
      description:
        'Pay for Netflix, Amazon, Facebook Ads, or global imports. Our virtual card works everywhere Visa and Mastercard are accepted.',
      points: ['Create your card in-app', 'Copy details fast', 'Freeze it any time'],
      image: '/assets/cards-screen.png',
      alt: 'Jippa Global Card screen showing a virtual card and card controls.',
    },
  ],
  waitlist: {
    eyebrow: '',
    title: 'Get early access to Jippa.',
    description:
      'Leave your details and tell us what you want first. We’ll let you know when access opens.',
    submitLabel: 'JOIN JIPPA',
    successMessage: 'You are on the list. We will reach out as Jippa opens access.',
    errorMessage: 'We could not save your details right now. Please try again in a moment.',
    endpointMessage:
      'Waitlist capture is not configured yet. Add VITE_API_BASE_URL or deploy the Netlify function at /api/waitlist.',
  },
  success: {
    title: 'You’re on the list.',
    description: 'Your details are in. We’ll reach out as soon as Jippa opens access.',
    note: 'Keep an eye on your email and WhatsApp for the first invite drops.',
    primaryCta: 'Back to home',
    chipLabel: 'Application received',
    chipTitle: 'We’ll be in touch',
  },
  footer: {
    note: 'The bank you deserve. Right in your pocket.',
  },
} as const;
