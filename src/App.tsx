import type { ChangeEvent, FormEvent, MouseEvent, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { interestOptions, siteContent, type InterestArea } from './content';

type WaitlistFormValues = {
  fullName: string;
  email: string;
  phoneOrWhatsApp: string;
  interestArea: InterestArea | '';
};

type WaitlistErrors = Partial<Record<keyof WaitlistFormValues, string>>;
type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error';
type StoryPanelId = 'top' | 'overview' | 'borrow' | 'save' | 'card' | 'waitlist';
type AppView = 'landing' | 'success';
type Product = (typeof siteContent.products)[number];
type SuccessDetails = {
  fullName: string;
  interestArea: InterestArea;
};

const initialValues: WaitlistFormValues = {
  fullName: '',
  email: '',
  phoneOrWhatsApp: '',
  interestArea: '',
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const configuredWaitlistEndpoint = import.meta.env.VITE_WAITLIST_ENDPOINT?.trim();
const previewSubmissionStorageKey = 'jippa-preview-waitlist-submissions';
const successDetailsStorageKey = 'jippa-success-details';

function getInitialView(): AppView {
  if (typeof window === 'undefined') {
    return 'landing';
  }

  const params = new URLSearchParams(window.location.search);
  return params.get('submitted') === '1' ? 'success' : 'landing';
}

function readStoredSuccessDetails(): SuccessDetails | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const stored = window.sessionStorage.getItem(successDetailsStorageKey);

    if (!stored) {
      return null;
    }

    return JSON.parse(stored) as SuccessDetails;
  } catch {
    return null;
  }
}

function persistSuccessDetails(details: SuccessDetails) {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(successDetailsStorageKey, JSON.stringify(details));
}

function clearStoredSuccessDetails() {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.removeItem(successDetailsStorageKey);
}

function canUseLocalPreviewSubmit() {
  if (typeof window === 'undefined') {
    return false;
  }

  return ['localhost', '127.0.0.1'].includes(window.location.hostname);
}

function resolveWaitlistEndpoint() {
  if (apiBaseUrl) {
    return new URL('/api/waitlist', apiBaseUrl).toString();
  }

  if (configuredWaitlistEndpoint) {
    return configuredWaitlistEndpoint;
  }

  if (canUseLocalPreviewSubmit()) {
    return 'http://127.0.0.1:8787/api/waitlist';
  }

  if (typeof window !== 'undefined') {
    return new URL('/api/waitlist', window.location.origin).toString();
  }

  return '/api/waitlist';
}

function storePreviewSubmission(values: WaitlistFormValues) {
  if (typeof window === 'undefined') {
    return;
  }

  const nextSubmission = {
    fullName: values.fullName.trim(),
    email: values.email.trim(),
    phoneOrWhatsApp: values.phoneOrWhatsApp.trim(),
    interestArea: values.interestArea,
    submittedAt: new Date().toISOString(),
    source: 'jippa-app-landing-preview',
  };

  try {
    const stored = window.localStorage.getItem(previewSubmissionStorageKey);
    const submissions = stored ? (JSON.parse(stored) as unknown[]) : [];
    window.localStorage.setItem(
      previewSubmissionStorageKey,
      JSON.stringify([...submissions, nextSubmission]),
    );
  } catch {
    window.sessionStorage.setItem(previewSubmissionStorageKey, JSON.stringify(nextSubmission));
  }
}

function App() {
  const storyRef = useRef<HTMLElement | null>(null);
  const [appView, setAppView] = useState<AppView>(getInitialView);
  const [activePanel, setActivePanel] = useState<StoryPanelId>('top');
  const [successDetails, setSuccessDetails] = useState<SuccessDetails | null>(readStoredSuccessDetails);

  useEffect(() => {
    const handlePopState = () => {
      setAppView(getInitialView());
      setSuccessDetails(readStoredSuccessDetails());
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  useEffect(() => {
    if (appView !== 'landing') {
      return;
    }

    const story = storyRef.current;

    if (!story || typeof window === 'undefined') {
      return;
    }

    const desktopQuery = window.matchMedia('(min-width: 1121px)');
    const updateActivePanel = () => {
      if (!desktopQuery.matches) {
        setActivePanel('top');
        return;
      }

      const panels = Array.from(story.querySelectorAll<HTMLElement>('[data-panel-id]'));

      if (panels.length === 0) {
        return;
      }

      const nearestPanel = panels.reduce((closestPanel, panel) => {
        const nextDistance = Math.abs(panel.offsetLeft - story.scrollLeft);
        const currentDistance = Math.abs(closestPanel.offsetLeft - story.scrollLeft);
        return nextDistance < currentDistance ? panel : closestPanel;
      });
      const nextPanelId = nearestPanel.dataset.panelId as StoryPanelId | undefined;

      if (nextPanelId) {
        setActivePanel(nextPanelId);
      }
    };

    const handleWheel = (event: WheelEvent) => {
      if (!desktopQuery.matches || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
        return;
      }

      const target = event.target as HTMLElement | null;

      if (target?.closest('input, select, textarea, option')) {
        return;
      }

      event.preventDefault();
      story.scrollBy({ left: event.deltaY, behavior: 'auto' });
    };

    story.addEventListener('wheel', handleWheel, { passive: false });
    story.addEventListener('scroll', updateActivePanel, { passive: true });
    window.addEventListener('resize', updateActivePanel);
    updateActivePanel();

    return () => {
      story.removeEventListener('wheel', handleWheel);
      story.removeEventListener('scroll', updateActivePanel);
      window.removeEventListener('resize', updateActivePanel);
    };
  }, [appView]);

  function scrollToPanel(panelId: StoryPanelId) {
    const panel = storyRef.current?.querySelector<HTMLElement>(`[data-panel-id="${panelId}"]`);
    panel?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
  }

  function showSuccessPage(details: SuccessDetails) {
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set('submitted', '1');
    window.history.pushState({ submitted: true }, '', `${nextUrl.pathname}${nextUrl.search}`);
    persistSuccessDetails(details);
    setSuccessDetails(details);
    setAppView('success');
  }

  function returnToLanding() {
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete('submitted');
    window.history.replaceState({ submitted: false }, '', `${nextUrl.pathname}${nextUrl.search}`);
    clearStoredSuccessDetails();
    setAppView('landing');
    setSuccessDetails(null);
    setActivePanel('top');
    window.requestAnimationFrame(() => {
      scrollToPanel('top');
    });
  }

  if (appView === 'success') {
    return (
      <div className="page-shell success-page-shell">
        <main className="success-main">
          <SuccessPage details={successDetails} onReturnHome={returnToLanding} />
        </main>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <SiteHeader hideBrand={activePanel === 'waitlist'} onNavigate={scrollToPanel} />
      <main className="story-main" ref={storyRef}>
        <HeroSection onNavigate={scrollToPanel} />
        <OverviewSection />
        {siteContent.products.map((product, index) => (
          <ProductPanel
            key={product.id}
            panelId={product.id as Extract<StoryPanelId, Product['id']>}
            product={product}
            reverse={index % 2 === 1}
          />
        ))}
        <WaitlistSection onSuccess={showSuccessPage} />
      </main>
    </div>
  );
}

function SiteHeader({
  hideBrand,
  onNavigate,
}: {
  hideBrand: boolean;
  onNavigate: (panelId: StoryPanelId) => void;
}) {
  function handleNavigate(panelId: StoryPanelId) {
    return (event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      onNavigate(panelId);
    };
  }

  return (
    <header className="site-header">
      <div className="container">
        <div className={`nav-bar ${hideBrand ? 'nav-bar-end' : ''}`}>
          {!hideBrand ? (
            <a className="brand-link" href="#top" aria-label="Jippa home" onClick={handleNavigate('top')}>
              <img className="brand-icon" src={siteContent.assets.icon} alt="Jippa" />
            </a>
          ) : null}
          <a
            className="button button-primary button-small"
            href="#waitlist"
            onClick={handleNavigate('waitlist')}
          >
            {siteContent.nav.cta}
          </a>
        </div>
      </div>
    </header>
  );
}

function HeroSection({ onNavigate }: { onNavigate: (panelId: StoryPanelId) => void }) {
  function handleNavigate(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    onNavigate('waitlist');
  }

  return (
    <section className="section story-panel hero-section" data-panel-id="top" id="top">
      <div className="container hero-grid">
        <div className="hero-copy reveal reveal-delay-1">
          <h1 className="hero-title">
            <span>{siteContent.hero.titleLead}</span>
            <span className="hero-highlight">{siteContent.hero.titleHighlight}</span>
            <span>{siteContent.hero.titleTail}</span>
          </h1>
          <p className="hero-subtitle">{siteContent.hero.subtitle}</p>
          <p className="hero-description">{siteContent.hero.description}</p>
          <a className="button button-primary hero-button" href="#waitlist" onClick={handleNavigate}>
            {siteContent.hero.primaryCta}
            <ArrowUpRightIcon />
          </a>
        </div>
        <HeroVisual />
      </div>
    </section>
  );
}

function HeroVisual() {
  return (
    <div className="hero-visual reveal reveal-delay-2" aria-hidden="true">
      <div className="hero-device-scene">
        <div className="hero-device-card">
          <img src={siteContent.assets.home} alt="" />
        </div>
        <div className="hero-floating-card hero-floating-borrow">
          <span>Instant Credit</span>
          <strong>$350 max limit</strong>
        </div>
        <div className="hero-floating-card hero-floating-note">
          <img className="hero-note-icon" src={siteContent.assets.icon} alt="" />
          <div>
            <span>{siteContent.hero.supportEyebrow}</span>
            <strong>{siteContent.hero.supportTitle}</strong>
          </div>
        </div>
        <div className="hero-floating-badge">
          <span>{siteContent.hero.callouts[0]}</span>
          <span>{siteContent.hero.callouts[1]}</span>
          <span>{siteContent.hero.callouts[2]}</span>
        </div>
      </div>
    </div>
  );
}

function OverviewSection() {
  return (
    <section className="section story-panel overview-section" data-panel-id="overview" id="overview">
      <div className="container overview-grid">
        <div className="showcase-intro reveal reveal-delay-1">
          <h2 className="section-title">{siteContent.showcase.title}</h2>
          <p className="section-description">{siteContent.showcase.description}</p>
        </div>
        <div className="value-strip">
          {siteContent.valueStrip.map((item, index) => (
            <article className={`value-card reveal reveal-delay-${(index % 3) + 1}`} key={item.title}>
              <h2>{item.title}</h2>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductPanel({
  panelId,
  product,
  reverse,
}: {
  panelId: Extract<StoryPanelId, Product['id']>;
  product: Product;
  reverse: boolean;
}) {
  return (
    <section
      className="section story-panel product-panel-section"
      data-panel-id={panelId}
      id={panelId === 'borrow' ? 'products' : undefined}
    >
      <div className="container">
        <article className={`feature-row ${reverse ? 'feature-row-reverse' : ''} reveal reveal-delay-1`}>
          <div className="feature-copy">
            {product.label ? <p className="section-kicker">{product.label}</p> : null}
            <h2 className="feature-title">{product.title}</h2>
            <p className="feature-description">{product.description}</p>
            <ul className="feature-points">
              {product.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>
          <div className="feature-media">
            <div className={`product-screen product-screen-${product.id}`}>
              <img src={product.image} alt={product.alt} />
            </div>
            <p className="product-eyebrow">{product.eyebrow}</p>
          </div>
        </article>
      </div>
    </section>
  );
}

function WaitlistSection({ onSuccess }: { onSuccess: (details: SuccessDetails) => void }) {
  return (
    <section className="section story-panel waitlist-section" data-panel-id="waitlist" id="waitlist">
      <div className="container waitlist-shell">
        <div className="waitlist-content">
          <div className="waitlist-copy reveal reveal-delay-1">
            {siteContent.waitlist.eyebrow ? (
              <p className="section-kicker">{siteContent.waitlist.eyebrow}</p>
            ) : null}
            <h2 className="section-title">{siteContent.waitlist.title}</h2>
            <p className="section-description">{siteContent.waitlist.description}</p>
          </div>
          <WaitlistForm onSuccess={onSuccess} />
        </div>
        <div className="waitlist-visual reveal reveal-delay-2" aria-hidden="true">
          <div className="waitlist-visual-glow" />
          <div className="waitlist-visual-plate waitlist-visual-plate-back" />
          <div className="waitlist-visual-plate waitlist-visual-plate-front" />
          <div className="waitlist-floating-chip">
            <span>USD stash</span>
            <strong>Goals on track</strong>
          </div>
          <div className="waitlist-floating-goal">
            <span>Auto-pilot</span>
            <div className="waitlist-goal-bar">
              <i />
            </div>
          </div>
          <div className="waitlist-device-card">
            <img src={siteContent.assets.savings} alt="" />
          </div>
        </div>
        <footer className="waitlist-footer reveal reveal-delay-3">
          <img className="waitlist-footer-logo" src={siteContent.assets.logo} alt="Jippa" />
          <p>{siteContent.footer.note}</p>
        </footer>
      </div>
    </section>
  );
}

function WaitlistForm({ onSuccess }: { onSuccess: (details: SuccessDetails) => void }) {
  const [values, setValues] = useState<WaitlistFormValues>(initialValues);
  const [errors, setErrors] = useState<WaitlistErrors>({});
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [message, setMessage] = useState('');

  function handleChange(event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = event.target;
    const field = name as keyof WaitlistFormValues;

    setValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));

    setErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };
      delete nextErrors[field];
      return nextErrors;
    });

    if (status !== 'idle') {
      setStatus('idle');
      setMessage('');
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationErrors = validateForm(values);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setStatus('error');
      setMessage('Please fix the highlighted fields and try again.');
      return;
    }

    const submittedDetails = {
      fullName: values.fullName.trim(),
      interestArea: values.interestArea as InterestArea,
    };
    const waitlistEndpoint = resolveWaitlistEndpoint();

    if (!waitlistEndpoint) {
      if (!canUseLocalPreviewSubmit()) {
        setStatus('error');
        setMessage(siteContent.waitlist.endpointMessage);
        return;
      }

      setStatus('submitting');
      setMessage('Saving your details locally...');
      storePreviewSubmission(values);
      onSuccess(submittedDetails);
      return;
    }

    setStatus('submitting');
    setMessage('Submitting your details...');

    const submissionPayload = {
      fullName: values.fullName.trim(),
      email: values.email.trim(),
      phoneOrWhatsApp: values.phoneOrWhatsApp.trim(),
      interestArea: values.interestArea,
      source: 'jippa-app-landing',
      submittedAt: new Date().toISOString(),
    };

    try {
      const response = await fetch(waitlistEndpoint, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionPayload),
      });

      if (!response.ok) {
        throw new Error('Submission failed');
      }

      onSuccess({
        fullName: submittedDetails.fullName,
        interestArea: submittedDetails.interestArea,
      });
    } catch {
      if (canUseLocalPreviewSubmit() && !apiBaseUrl && !configuredWaitlistEndpoint) {
        storePreviewSubmission(values);
        onSuccess(submittedDetails);
        return;
      }

      setStatus('error');
      setMessage(siteContent.waitlist.errorMessage);
    }
  }

  return (
    <form className="waitlist-card reveal reveal-delay-2" onSubmit={handleSubmit} noValidate>
      <div className="form-grid">
        <Field error={errors.fullName} htmlFor="fullName" label="Full name">
          <input
            autoComplete="name"
            id="fullName"
            name="fullName"
            onChange={handleChange}
            placeholder="Your full name"
            type="text"
            value={values.fullName}
          />
        </Field>

        <Field error={errors.email} htmlFor="email" label="Email address">
          <input
            autoComplete="email"
            id="email"
            name="email"
            onChange={handleChange}
            placeholder="you@example.com"
            type="email"
            value={values.email}
          />
        </Field>

        <Field error={errors.phoneOrWhatsApp} htmlFor="phoneOrWhatsApp" label="Phone or WhatsApp">
          <input
            autoComplete="tel"
            id="phoneOrWhatsApp"
            name="phoneOrWhatsApp"
            onChange={handleChange}
            placeholder="+263..."
            type="tel"
            value={values.phoneOrWhatsApp}
          />
        </Field>

        <Field error={errors.interestArea} htmlFor="interestArea" label="What matters most to you?">
          <select id="interestArea" name="interestArea" onChange={handleChange} value={values.interestArea}>
            <option value="">Select one</option>
            {interestOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <p className={`status-message status-${status}`} aria-live="polite">
        {message || 'Join the list and we’ll keep you close as access opens.'}
      </p>

      <button className="button button-primary button-block" disabled={status === 'submitting'} type="submit">
        {status === 'submitting' ? 'Submitting...' : siteContent.waitlist.submitLabel}
        <ArrowUpRightIcon />
      </button>
    </form>
  );
}

function SuccessPage({
  details,
  onReturnHome,
}: {
  details: SuccessDetails | null;
  onReturnHome: () => void;
}) {
  const interestLabel =
    details?.interestArea ? interestOptions.find((option) => option.value === details.interestArea)?.label : null;
  const firstName = details?.fullName.trim().split(/\s+/)[0];

  return (
    <section className="success-shell reveal reveal-delay-1">
      <div className="success-copy">
        <img className="success-logo" src={siteContent.assets.logo} alt="Jippa" />
        <div className="success-copy-stack">
          {firstName ? <p className="success-kicker">Thanks, {firstName}.</p> : null}
          <h1 className="success-title">{siteContent.success.title}</h1>
          <p className="success-description">{siteContent.success.description}</p>
          {interestLabel ? <p className="success-interest">Interest saved: {interestLabel}</p> : null}
          <p className="success-note">{siteContent.success.note}</p>
        </div>
        <button className="button button-primary success-button" onClick={onReturnHome} type="button">
          {siteContent.success.primaryCta}
          <ArrowLeftIcon />
        </button>
      </div>
      <div className="success-visual" aria-hidden="true">
        <div className="success-glow" />
        <div className="success-card success-card-back" />
        <div className="success-card success-card-front" />
        <div className="success-floating-chip">
          <span>{siteContent.success.chipLabel}</span>
          <strong>{siteContent.success.chipTitle}</strong>
        </div>
        <div className="success-device-card">
          <img src={siteContent.assets.home} alt="" />
        </div>
      </div>
    </section>
  );
}

function Field({
  children,
  error,
  htmlFor,
  label,
}: {
  children: ReactNode;
  error?: string;
  htmlFor: string;
  label: string;
}) {
  return (
    <label className="field" htmlFor={htmlFor}>
      <span>{label}</span>
      {children}
      {error ? <small className="field-error">{error}</small> : null}
    </label>
  );
}

function validateForm(values: WaitlistFormValues): WaitlistErrors {
  const nextErrors: WaitlistErrors = {};
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const digitsOnly = values.phoneOrWhatsApp.replace(/[^\d]/g, '');

  if (!values.fullName.trim()) {
    nextErrors.fullName = 'Full name is required.';
  }

  if (!values.email.trim()) {
    nextErrors.email = 'Email is required.';
  } else if (!emailPattern.test(values.email.trim())) {
    nextErrors.email = 'Enter a valid email address.';
  }

  if (values.phoneOrWhatsApp.trim() && digitsOnly.length < 7) {
    nextErrors.phoneOrWhatsApp = 'Enter a valid phone or WhatsApp number.';
  }

  if (!values.interestArea) {
    nextErrors.interestArea = 'Select what matters most to you.';
  }

  return nextErrors;
}

function ArrowUpRightIcon() {
  return (
    <svg className="icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M5.833 14.167 14.167 5.833M7.5 5.833h6.667V12.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg className="icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M14.167 10H5.833m0 0L9.167 6.667M5.833 10l3.334 3.333"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export default App;
