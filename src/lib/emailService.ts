// ====================================================================
// EYE Tasks — Email delivery (Resend API)
//
// Sends transactional emails (certificate issuance, task notifications,
// deadline reminders, etc.) via the Resend HTTP API.
//
// IMPORTANT: this runs from the BROWSER, so the VITE_RESEND_API_KEY
// will be visible to anyone who views the page source. Use a key that
// is locked to your verified "from" domain in the Resend dashboard.
// ====================================================================

const QUEUE_KEY = 'eye_email_queue';

export interface QueuedEmail {
  id: string;
  to: string[];
  subject: string;
  html: string;
  queuedAt: string;
  reason: 'no_api_key' | 'send_failed' | 'http_error';
  errorMessage?: string;
}

const loadQueue = (): QueuedEmail[] => {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch { return []; }
};
const saveQueue = (q: QueuedEmail[]) => {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch {}
};

export const getEmailQueue = (): QueuedEmail[] => loadQueue();

export const clearEmailQueue = (): void => {
  saveQueue([]);
};

export const retryQueuedEmails = async (): Promise<{ sent: number; stillFailed: number }> => {
  const queue = loadQueue();
  let sent = 0;
  let stillFailed = 0;
  const remaining: QueuedEmail[] = [];
  for (const item of queue) {
    const ok = await trySendOnce(item.to, item.subject, item.html, /*silent*/ true);
    if (ok) sent++; else { stillFailed++; remaining.push(item); }
  }
  saveQueue(remaining);
  return { sent, stillFailed };
};

const trySendOnce = async (to: string[], subject: string, html: string, silent = false): Promise<boolean> => {
  const apiKey = (import.meta.env.VITE_RESEND_API_KEY || '').trim();
  const fromEmail = (import.meta.env.VITE_SENDER_EMAIL || 'onboarding@resend.dev').trim();

  if (!apiKey) {
    if (!silent) {
      // eslint-disable-next-line no-console
      console.warn(
        '[EYE Email] VITE_RESEND_API_KEY is not set. Email queued. ' +
        'To enable email delivery, sign up at https://resend.com and add the key to .env. ' +
        `Recipient(s): ${to.join(', ')} | Subject: "${subject}"`
      );
    }
    const queue = loadQueue();
    queue.push({
      id: 'q-' + Math.random().toString(36).slice(2),
      to, subject, html,
      queuedAt: new Date().toISOString(),
      reason: 'no_api_key',
    });
    saveQueue(queue);
    return false;
  }

  // Remove duplicate/empty emails
  const cleanTo = Array.from(new Set(to.map(e => e.trim()).filter(e => e.length > 0)));
  if (cleanTo.length === 0) return false;

  try {
    // If key starts with 'xkeysib-' or BREVO key is provided, use Brevo API
    const isBrevo = apiKey.startsWith('xkeysib-') || !!import.meta.env.VITE_BREVO_API_KEY;
    
    if (isBrevo) {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey,
        },
        body: JSON.stringify({
          sender: { name: 'EYE Workflow Hub', email: fromEmail },
          to: cleanTo.map(email => ({ email })),
          subject,
          htmlContent: html,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        if (!silent) {
          console.error(`[EYE Email] Brevo rejected request: HTTP ${response.status} — ${errText}`);
        }
        const queue = loadQueue();
        queue.push({
          id: 'q-' + Math.random().toString(36).slice(2),
          to: cleanTo, subject, html,
          queuedAt: new Date().toISOString(),
          reason: 'http_error',
          errorMessage: `HTTP ${response.status}: ${errText}`,
        });
        saveQueue(queue);
        return false;
      }

      const resData = await response.json();
      if (!silent) {
        console.log('[EYE Email] Sent via Brevo:', resData);
      }
      return true;
    }

    // Default: Resend API
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: `EYE Tasks <${fromEmail}>`,
        to: cleanTo,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      if (!silent) {
        // eslint-disable-next-line no-console
        console.error(`[EYE Email] Resend rejected the request: HTTP ${response.status} — ${errText}`);
      }
      // Queue for retry
      const queue = loadQueue();
      queue.push({
        id: 'q-' + Math.random().toString(36).slice(2),
        to: cleanTo, subject, html,
        queuedAt: new Date().toISOString(),
        reason: 'http_error',
        errorMessage: `HTTP ${response.status}: ${errText}`,
      });
      saveQueue(queue);
      return false;
    }

    const resData = await response.json();
    if (!silent) {
      // eslint-disable-next-line no-console
      console.log('[EYE Email] Sent via Resend:', resData);
    }
    return true;
  } catch (error: any) {
    if (!silent) {
      // eslint-disable-next-line no-console
      console.error('[EYE Email] Network failure:', error?.message || error);
    }
    const queue = loadQueue();
    queue.push({
      id: 'q-' + Math.random().toString(36).slice(2),
      to: cleanTo, subject, html,
      queuedAt: new Date().toISOString(),
      reason: 'send_failed',
      errorMessage: error?.message || 'Unknown network error',
    });
    saveQueue(queue);
    return false;
  }
};

export const sendEmailAlert = async (to: string[], subject: string, htmlContent: string): Promise<boolean> => {
  return trySendOnce(to, subject, htmlContent);
};
