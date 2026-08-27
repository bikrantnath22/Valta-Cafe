import webpush from 'web-push';
import PushSubscription from '../models/PushSubscription.js';

let initialized = false;

function initWebPush() {
  if (initialized) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

  if (!publicKey || !privateKey) {
    console.warn('VAPID keys not configured, Web Push will be disabled.');
    return;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  initialized = true;
}

/**
 * Send a push notification to specific users or roles.
 * Automatically deletes subscriptions that return 404 or 410.
 */
export async function sendPushNotification(query, payload) {
  initWebPush();
  if (!initialized) return;

  try {
    const subscriptions = await PushSubscription.find(query);
    if (!subscriptions.length) return;

    const payloadString = JSON.stringify(payload);

    const promises = subscriptions.map((subDoc) =>
      webpush.sendNotification(subDoc.subscription, payloadString).catch(async (err) => {
        if (err.statusCode === 404 || err.statusCode === 410) {
          // Subscription has expired or is no longer valid
          console.log('Subscription expired, deleting...', subDoc._id);
          await PushSubscription.deleteOne({ _id: subDoc._id });
        } else {
          console.error('Error sending push notification:', err);
        }
      })
    );

    await Promise.all(promises);
  } catch (err) {
    console.error('Failed to send push notifications:', err);
  }
}
