import { useNotifications } from '../../context/NotificationContext.jsx';
import { useNavigate } from 'react-router-dom';

export default function NotificationBell({ className = '' }) {
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const navigate = useNavigate();

  const handleBellClick = () => {
    let highlightIds = [];
    if (unreadCount > 0) {
      highlightIds = notifications
        .filter(n => !n.isRead)
        .map(n => n.orderId?.toString());
      markAllRead();
    }
    navigate('/orders', { state: { highlightIds } });
  };

  return (
    <button
      type="button"
      onClick={handleBellClick}
      className={`relative flex h-10 w-10 items-center justify-center rounded-full transition bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900 md:bg-white/10 md:text-stone-300 md:hover:bg-white/20 md:hover:text-white ${className}`}
      aria-label="Notifications"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
      </svg>
      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white shadow ring-2 ring-stone-900 md:ring-white">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}
