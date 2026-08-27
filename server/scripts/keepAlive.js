// scripts/keepAlive.js — Self-pinger to prevent Render's free tier from sleeping.
export function startKeepAlive() {
  if (process.env.NODE_ENV !== 'production') return;

  const url = process.env.CLIENT_URL;
  if (!url) {
    console.warn('⚠️  CLIENT_URL not set. Keep-alive ping is disabled.');
    return;
  }

  const pingUrl = `${url}/api/health`;
  const intervalMs = 4.5 * 60 * 1000; // 4 minutes and 30 seconds

  console.log(`⏰ Keep-alive enabled. Pinging ${pingUrl} every 4.5 mins.`);

  setInterval(async () => {
    try {
      const res = await fetch(pingUrl);
      if (!res.ok) {
        console.warn(`⚠️  Keep-alive ping failed with status: ${res.status}`);
      }
    } catch (err) {
      console.warn(`⚠️  Keep-alive ping error: ${err.message}`);
    }
  }, intervalMs);
}
