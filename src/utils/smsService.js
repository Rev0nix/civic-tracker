// Lokify SMS Notification Dispatcher Service
// Simulates carrier SMS transmission and logs all SMS dispatches with phone verification

export const sendSmsNotification = async ({
  toPhone,
  message,
  issueId = null,
  eventType = 'STATUS_UPDATE',
}) => {
  if (!toPhone) {
    console.warn('SMS dispatch failed: No recipient phone number provided.');
    return { success: false, error: 'Missing phone number' };
  }

  const timestamp = new Date().toISOString();
  const smsEntry = {
    id: 'sms_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    toPhone: toPhone.trim(),
    message: message.trim(),
    issueId,
    eventType,
    timestamp,
    status: 'Delivered',
    carrier: 'GovNet SMS Gateway',
  };

  // 1. Persist to local storage SMS history
  try {
    const existing = JSON.parse(localStorage.getItem('lokify_sms_history') || '[]');
    existing.unshift(smsEntry);
    localStorage.setItem('lokify_sms_history', JSON.stringify(existing.slice(0, 50)));
  } catch (err) {
    console.warn('Could not store SMS history:', err);
  }

  // 2. Dispatch a window event so the app displays a native-style Heads-Up SMS banner
  if (typeof window !== 'undefined') {
    const customEvent = new CustomEvent('lokify:sms_received', { detail: smsEntry });
    window.dispatchEvent(customEvent);
  }

  return { success: true, smsEntry };
};

export const getSmsHistory = (phoneFilter = null) => {
  try {
    const all = JSON.parse(localStorage.getItem('lokify_sms_history') || '[]');
    if (!phoneFilter) return all;
    return all.filter((s) => s.toPhone.includes(phoneFilter) || phoneFilter.includes(s.toPhone));
  } catch {
    return [];
  }
};
