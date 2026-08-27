import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext.jsx';
import { usePushNotifications } from '../../hooks/usePushNotifications.js';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationsPage() {
  const { notifications, markAllRead } = useNotifications();
  const pushObj = usePushNotifications();
  const navigate = useNavigate();

  useEffect(() => {
    // Automatically mark notifications read when they visit this page
    markAllRead();
  }, [markAllRead]);

  const handleNotificationClick = (notification) => {
    if (notification.orderId) {
      navigate(`/orders/${notification.orderId}`);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-stone-900">Notifications</h1>
      </div>

      <div className="mb-6 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-stone-900">Order Alerts</h3>
            <p className="text-sm text-stone-500">Receive order updates even when the app is closed.</p>
          </div>
          <button
            onClick={() => pushObj.isSubscribed ? pushObj.unsubscribe() : pushObj.subscribe()}
            disabled={!pushObj.isSupported || pushObj.isLoading || (pushObj.isIOS && !pushObj.isStandalone)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
              pushObj.isSubscribed ? 'bg-amber-500' : 'bg-stone-300'
            } ${(pushObj.isLoading || !pushObj.isSupported) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                pushObj.isSubscribed ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        
        {pushObj.isIOS && !pushObj.isStandalone && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <strong>iOS User?</strong> To enable notifications, you must install this app using Safari: tap the <strong>Share</strong> icon, then <strong>Add to Home Screen</strong>.
          </div>
        )}
        {!pushObj.isSupported && (!pushObj.isIOS || pushObj.isStandalone) && (
          <div className="mt-3 text-xs text-stone-400">Push notifications are not supported in your browser.</div>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-stone-200 bg-stone-50 py-16 text-center text-stone-500">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <p>No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <button
              key={n._id}
              onClick={() => handleNotificationClick(n)}
              className="w-full rounded-2xl border border-stone-200 bg-white p-4 text-left shadow-sm transition hover:border-amber-300 hover:bg-amber-50/50"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-stone-900">{n.message}</p>
                  <p className="mt-1 text-xs text-stone-500">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
