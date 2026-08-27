import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { API_BASE_URL, getNotifications, markNotificationsRead } from '../lib/api.js';
import { useAuth } from './AuthContext.jsx';
import { statusLabel } from '../lib/orderStatus.js';

const NotificationContext = createContext(null);

// Audio for new order chime. We use a short base64 string or construct a simple oscillator in AudioContext
// to avoid needing external files.
class ChimePlayer {
  constructor() {
    this.audioCtx = null;
    this.unlocked = false;
  }
  
  unlock() {
    if (this.unlocked) return;
    try {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      // Play complete silence to unlock (no clicking/popping)
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      gain.gain.value = 0;
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(0);
      osc.stop(0.001);
      this.unlocked = true;
    } catch (e) {
      console.warn('Could not unlock audio', e);
    }
  }

  play() {
    if (!this.unlocked || !this.audioCtx) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, this.audioCtx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(1760, this.audioCtx.currentTime + 0.1); // Up to A6
      
      gain.gain.setValueAtTime(0, this.audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.5, this.audioCtx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.5);
      
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      
      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.5);
    } catch (e) {
      console.error('Error playing chime', e);
    }
  }
}

const chime = new ChimePlayer();

export function NotificationProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  
  // Admin state
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // We expose a generic event listener system for components (like OrderDetailPage)
  const listenersRef = useRef(new Map()); // eventName -> Set(callbacks)
  
  useEffect(() => {
    // Unlock audio on first interaction
    const unlockAudio = () => {
      chime.unlock();
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
    window.addEventListener('click', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);
    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  // Socket connection
  useEffect(() => {
    // We connect regardless of authentication so that everyone (including guests)
    // receives real-time menu and settings updates.
    const query = isAuthenticated && user 
      ? { role: user.role, userId: user._id }
      : { role: 'guest' };

    const newSocket = io(API_BASE_URL, {
      query,
      withCredentials: true,
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
    });

    // For admins
    newSocket.on('new_order', (data) => {
      chime.play();
      setNotifications((prev) => [data.notification, ...prev]);
      setUnreadCount((c) => c + 1);
      
      // Dispatch to custom listeners
      if (listenersRef.current.has('new_order')) {
        listenersRef.current.get('new_order').forEach(cb => cb(data));
      }
    });

    newSocket.on('order_payment_updated', (data) => {
      if (listenersRef.current.has('order_payment_updated')) {
        listenersRef.current.get('order_payment_updated').forEach(cb => cb(data));
      }
    });

    // For customers
    newSocket.on('order_status_updated', (data) => {
      const toastId = toast.success(
        <div onClick={() => toast.dismiss(toastId)} className="cursor-pointer">
          Your order with {data.itemsPreview} is now {statusLabel(data.status, data.fulfillmentMethod)}!
        </div>,
        {
          duration: 5000,
          position: 'top-center',
        }
      );
      chime.play();
      
      // Update local notification state for the customer bell icon
      if (data.notification) {
        setNotifications((prev) => [data.notification, ...prev]);
        setUnreadCount((c) => c + 1);
      }

      if (listenersRef.current.has('order_status_updated')) {
        listenersRef.current.get('order_status_updated').forEach(cb => cb(data));
      }
    });

    // For all users (guests, customers, admins)
    newSocket.on('menu_updated', () => {
      if (listenersRef.current.has('menu_updated')) {
        listenersRef.current.get('menu_updated').forEach(cb => cb());
      }
    });

    newSocket.on('settings_updated', (data) => {
      if (listenersRef.current.has('settings_updated')) {
        listenersRef.current.get('settings_updated').forEach(cb => cb(data));
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [isAuthenticated, user]);

  // Load initial notifications for authenticated users
  useEffect(() => {
    if (isAuthenticated) {
      getNotifications().then(res => {
        setNotifications(res.notifications);
        setUnreadCount(res.notifications.filter(n => !n.isRead).length);
      }).catch(err => console.error('Failed to load notifications:', err));
    }
  }, [isAuthenticated, user]);

  const markAllRead = async () => {
    if (unreadCount === 0) return;
    // Optimistically clear the UI immediately
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    try {
      await markNotificationsRead();
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const subscribe = (event, callback) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    listenersRef.current.get(event).add(callback);
    return () => {
      if (listenersRef.current.has(event)) {
        listenersRef.current.get(event).delete(callback);
      }
    };
  };

  return (
    <NotificationContext.Provider value={{ socket, notifications, unreadCount, markAllRead, subscribe }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
