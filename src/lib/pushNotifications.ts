import { supabase, isSupabaseConfigured } from './supabaseClient';

/**
 * EYE Workflow Hub — Mobile Web Push & OneSignal Service
 * Supports Native Web Push API, ServiceWorker Push, and OneSignal Integration.
 * Works on Android Chrome, Edge, Safari (iOS 16.4+ via Add to Home Screen), and Desktop.
 */

declare global {
  interface Window {
    OneSignalDeferred?: any[];
    OneSignal?: any;
  }
}

// ── Browser & Platform Checks ──────────────────────────────────────────────

export const isPushSupported = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
};

export const isIOS = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
};

export const isStandalonePWA = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
};

export const getPushPermissionState = (): NotificationPermission => {
  if (!isPushSupported()) return 'denied';
  return Notification.permission;
};

export const savePushSubscriptionToSupabase = async () => {
  if (!isPushSupported() || Notification.permission !== 'granted') return;
  try {
    const reg = await registerServiceWorker();
    if (!reg) return;

    let sub = await reg.pushManager.getSubscription();
    if (sub) {
      const subJson = sub.toJSON();
      const currentUserRaw = localStorage.getItem('eye_current_user');
      const currentUser = currentUserRaw ? JSON.parse(currentUserRaw) : null;
      const userId = currentUser?.id;

      if (isSupabaseConfigured && supabase && subJson.endpoint) {
        const isUuid = userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
        await supabase.from('push_subscriptions').upsert({
          user_id: isUuid ? userId : null,
          endpoint: subJson.endpoint,
          p256dh: subJson.keys?.p256dh || '',
          auth: subJson.keys?.auth || '',
        }, { onConflict: 'endpoint' });
      }
    }
  } catch (err) {
    console.warn('[EYE Push] savePushSubscriptionToSupabase warn:', err);
  }
};

export const requestPushPermission = async (): Promise<NotificationPermission> => {
  if (!isPushSupported()) {
    console.warn('[EYE Push] Browser or device does not support Web Push notifications.');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    await registerServiceWorker();
    await savePushSubscriptionToSupabase();
    return 'granted';
  }
  if (Notification.permission === 'denied') return 'denied';

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      await registerServiceWorker();
      await savePushSubscriptionToSupabase();
    }
    return permission;
  } catch {
    return 'denied';
  }
};

// ── OneSignal Push SDK Initializer ─────────────────────────────────────────

export const initOneSignalPush = (appId?: string) => {
  const targetAppId = appId || localStorage.getItem('eye_onesignal_app_id') || '00000000-0000-0000-0000-000000000000';
  if (!targetAppId || targetAppId.startsWith('00000000')) {
    console.log('[EYE Push] OneSignal App ID not set. Using Native Web Push / ServiceWorker fallback.');
    return;
  }

  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async function (OneSignal: any) {
    await OneSignal.init({
      appId: targetAppId,
      allowLocalhostAsSecureOrigin: true,
      serviceWorkerParam: { scope: '/' },
      serviceWorkerPath: 'sw.js',
      notifyButton: {
        enable: false,
      },
    });
    console.log('[EYE Push] OneSignal Push initialized successfully.');
  });
};

// ── Core Push Dispatcher (Mobile & Desktop) ───────────────────────────────

export const sendMobilePushNotification = (
  title: string,
  body: string,
  options?: { icon?: string; tag?: string; url?: string; vibrate?: number[] }
): boolean => {
  if (!isPushSupported() || Notification.permission !== 'granted') return false;

  const notifIcon = options?.icon || '/eye-logo-transparent.png';
  const notifTag = options?.tag || `eye-push-${Date.now()}`;
  const notifUrl = options?.url || '/';

  // 1. Try Service Worker push notification first (Works when browser is backgrounded/locked)
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    try {
      navigator.serviceWorker.controller.postMessage({
        type: 'SHOW_TEST_PUSH',
        title,
        body,
        icon: notifIcon,
        tag: notifTag,
        url: notifUrl,
      });
    } catch {}
  }

  // 2. Also dispatch Native Browser Notification as fallback
  try {
    const notif = new Notification(title, {
      body,
      icon: notifIcon,
      badge: notifIcon,
      tag: notifTag,
      silent: false,
      data: { url: notifUrl },
    });

    if ('vibrate' in navigator && options?.vibrate) {
      try { navigator.vibrate(options.vibrate); } catch {}
    }

    notif.onclick = () => {
      window.focus();
      if (options?.url) window.location.href = options.url;
      notif.close();
    };

    setTimeout(() => {
      try { notif.close(); } catch {}
    }, 10000);

    return true;
  } catch (err) {
    console.warn('[EYE Push] Push notification error:', err);
    return false;
  }
};

// ── High-Level Event Triggers ─────────────────────────────────────────────

export const triggerPushFromSystemNotif = (
  title: string,
  message: string,
  type: 'info' | 'success' | 'warning' | 'error'
) => {
  const emojiMap = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌',
  };
  sendMobilePushNotification(`${emojiMap[type]} ${title}`, message, {
    vibrate: [200, 100, 200],
  });
};

export const triggerNewFeaturePush = (featureTitle: string, featureSummary: string) => {
  sendMobilePushNotification(`🚀 ميزة جديدة متوفرة الآن: ${featureTitle}`, featureSummary, {
    vibrate: [300, 100, 300, 100, 300],
  });
};

export const sendTestPushNotification = async (): Promise<boolean> => {
  const perm = await requestPushPermission();
  if (perm === 'granted') {
    return sendMobilePushNotification(
      '📱 تجربة إشعارات الموبايل الفورية — EYE Hub',
      'تهانينا! إشعارات الموبايل المباشرة تعمل بنجاح وسوف تصلك أهم التحديثات والأعذار فوراً. 📲✨',
      { vibrate: [200, 100, 200] }
    );
  }
  return false;
};

// ── Service Worker Registration ──────────────────────────────────────────

let _swRegistration: ServiceWorkerRegistration | null = null;

export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    _swRegistration = reg;
    console.log('[EYE SW] Service Worker registered:', reg.scope);
    return reg;
  } catch (err) {
    console.warn('[EYE SW] Service Worker registration failed:', err);
    return null;
  }
};

export const recordUserVisit = (userId: string) => {
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return;
  try {
    navigator.serviceWorker.controller.postMessage({
      type: 'RECORD_VISIT',
      user: userId,
    });
  } catch {}
};

export interface ReengagementContext {
  userId: string;
  pendingTasks: number;
  upcomingMeetings: number;
  upcomingSessions: number;
}

export const checkAndSendReengagementNotif = async (ctx: ReengagementContext): Promise<void> => {
  if (!('serviceWorker' in navigator)) return;
  if (Notification.permission !== 'granted') return;
  const sw = navigator.serviceWorker.controller;
  if (!sw) return;
  sw.postMessage({
    type: 'CHECK_REENGAGEMENT',
    user: ctx.userId,
    pendingTasks: ctx.pendingTasks,
    upcomingMeetings: ctx.upcomingMeetings,
    upcomingSessions: ctx.upcomingSessions,
  });
};

export const registerPeriodicSync = async (): Promise<void> => {
  if (!_swRegistration) return;
  try {
    // @ts-ignore
    const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
    if (status.state === 'granted') {
      // @ts-ignore
      await _swRegistration.periodicSync.register('eye-reengagement-check', {
        minInterval: 20 * 60 * 60 * 1000,
      });
    }
  } catch {}
};
