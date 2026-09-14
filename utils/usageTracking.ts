import { supabase } from '../supabaseClient';

const EXCLUDE_KEY = 'walkgoal_exclude_usage_tracking';
const DEVICE_ID_KEY = 'walkgoal_device_id';

// Lets the developer opt this device out of the anonymous usage stats
// (e.g. their own phone, used many times a day while testing).
export const isTrackingExcluded = (): boolean =>
  localStorage.getItem(EXCLUDE_KEY) === 'true';

export const setTrackingExcluded = (excluded: boolean) => {
  localStorage.setItem(EXCLUDE_KEY, excluded ? 'true' : 'false');
};

// Random id generated once per install and stored locally, so repeat
// opens can be told apart from new installs. Not tied to any personal
// info — just a random number that lives in this browser/app only.
const getDeviceId = (): string => {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
};

// Fire-and-forget, anonymous usage ping. Sends an event type, timestamp
// and a random per-install id — no name, email or other personal info.
export const trackEvent = (eventType: 'app_open' | 'walk_logged') => {
  if (isTrackingExcluded()) return;

  supabase
    .from('usage_events')
    .insert({ event_type: eventType, device_id: getDeviceId() })
    .then(({ error }) => {
      if (error) console.warn('usage tracking failed:', error.message);
    });
};
