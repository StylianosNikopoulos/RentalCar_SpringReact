const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;

export const CONSENT_KEY = 'rentalcar-cookie-consent';
export const OPEN_SETTINGS_EVENT = 'open-cookie-settings';
const CONSENT_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

let scriptInjected = false;
let lastTrackedPath = null;

export function getConsent() {
  try {
    return JSON.parse(localStorage.getItem(CONSENT_KEY));
  } catch {
    return null;
  }
}

export function isConsentValid() {
  const consent = getConsent();
  if (!consent || !consent.savedAt) return false;
  return Date.now() - new Date(consent.savedAt).getTime() < CONSENT_MAX_AGE_MS;
}

export function hasAnalyticsConsent() {
  return isConsentValid() && getConsent()?.level === 'all';
}

export function saveConsent(level) {
  try {
    localStorage.setItem(
      CONSENT_KEY,
      JSON.stringify({ level, savedAt: new Date().toISOString() }),
    );
  } catch {
  }
  if (level === 'all') {
    loadGoogleAnalytics();
  } else {
    disableGoogleAnalytics();
  }
}

export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT));
}

export function loadGoogleAnalytics() {
  if (!measurementId) return;

  window[`ga-disable-${measurementId}`] = false;

  if (scriptInjected) {
    trackPageView(window.location.pathname + window.location.search);
    return;
  }

  scriptInjected = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  window.gtag('js', new Date());

  window.gtag('consent', 'update', {
    analytics_storage: 'granted',
    ad_storage: 'denied',
  });

  window.gtag('config', measurementId, {
    send_page_view: true,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });
}

export function disableGoogleAnalytics() {
  if (!measurementId) return;

  window[`ga-disable-${measurementId}`] = true;
  lastTrackedPath = null;

  const names = document.cookie
    .split(';')
    .map((c) => c.split('=')[0].trim())
    .filter((n) => n === '_ga' || n.startsWith('_ga_'));

  const parts = window.location.hostname.split('.');
  const expired = 'expires=Thu, 01 Jan 1970 00:00:00 GMT';

  names.forEach((name) => {
    document.cookie = `${name}=; ${expired}; path=/`;
    for (let i = 0; i < parts.length - 1; i++) {
      const domain = '.' + parts.slice(i).join('.');
      document.cookie = `${name}=; ${expired}; path=/; domain=${domain}`;
    }
  });
}

export function trackPageView(path) {
  if (!measurementId || !window.gtag || !hasAnalyticsConsent()) return;
  if (path === lastTrackedPath) return;
  lastTrackedPath = path;

  window.gtag('event', 'page_view', {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}

export function initAnalytics() {
  if (hasAnalyticsConsent()) {
    loadGoogleAnalytics();
  }
}