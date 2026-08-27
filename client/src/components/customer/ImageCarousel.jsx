// src/components/customer/ImageCarousel.jsx — small per-item image gallery.
// Shows one image at a time with prev/next controls, dot indicators, auto-slide,
// and touch swiping. Falls back to a placeholder when an item has no images.
import { useState, useEffect, useCallback, useRef } from 'react';

export default function ImageCarousel({ images = [], alt = '', className = '' }) {
  const [index, setIndex] = useState(0);
  const count = images.length;
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const intervalRef = useRef(null);

  const safeIndex = Math.min(index, count > 0 ? count - 1 : 0);
  const go = useCallback((next) => {
    if (count > 0) {
      setIndex(((next % count) + count) % count);
    }
  }, [count]);

  // Auto-slide effect
  useEffect(() => {
    if (count <= 1) return;
    intervalRef.current = setInterval(() => {
      go(safeIndex + 1);
    }, 4000); // slide every 4 seconds

    return () => clearInterval(intervalRef.current);
  }, [count, safeIndex, go]);

  // Touch handlers for swiping
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) go(safeIndex + 1);
    if (isRightSwipe) go(safeIndex - 1);
  };

  if (count === 0) {
    return (
      <div
        className={`flex items-center justify-center bg-stone-100 text-stone-300 ${className}`}
        aria-label="No image available"
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="8.5" cy="9.5" r="1.5" fill="currentColor" />
          <path d="M4 17l5-5 4 4 3-3 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }

  return (
    <div 
      className={`relative overflow-hidden ${className}`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <img
        src={images[safeIndex].url}
        alt={alt}
        loading="lazy"
        className="h-full w-full object-cover transition-opacity duration-300"
        draggable={false}
      />

      {/* Controls removed as requested, auto-sliding and swipe still work */}
    </div>
  );
}
