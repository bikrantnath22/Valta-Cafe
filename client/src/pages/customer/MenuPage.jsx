// src/pages/customer/MenuPage.jsx — browse the menu, grouped by category.
// Public: anyone can browse. Ordering controls live on the cards and respect
// the cafe's open/closed state.
import { useEffect, useMemo, useRef, useState } from 'react';
import { getMenu } from '../../lib/api.js';
import FoodItemCard from '../../components/customer/FoodItemCard.jsx';

export default function MenuPage({ readOnly = false }) {
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inputText, setInputText] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const sectionRefs = useRef({});

  useEffect(() => {
    let active = true;
    const fetchMenu = async () => {
      try {
        const data = await getMenu();
        if (!active) return;
        setCategories(data.categories || []);
        setItems(data.items || []);
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchMenu();

    const onMenuUpdate = () => {
      fetchMenu();
    };
    window.addEventListener('valta_menu_updated', onMenuUpdate);

    return () => {
      active = false;
      window.removeEventListener('valta_menu_updated', onMenuUpdate);
    };
  }, []);

  // Suggestions for the dropdown
  const suggestions = useMemo(() => {
    if (!inputText.trim()) return [];
    const q = inputText.toLowerCase().trim();
    // Unique item names that match
    const matches = items.filter((it) => it.name.toLowerCase().includes(q));
    const uniqueNames = Array.from(new Set(matches.map(it => it.name)));
    return uniqueNames.slice(0, 5);
  }, [items, inputText]);

  // Filter items by activeSearch for the main menu display
  const filteredItems = useMemo(() => {
    if (!activeSearch.trim()) return items;
    const q = activeSearch.toLowerCase().trim();
    return items.filter(
      (it) =>
        it.name.toLowerCase().includes(q) ||
        (it.description && it.description.toLowerCase().includes(q))
    );
  }, [items, activeSearch]);

  // Group items under their category, preserving category order and collecting
  // anything uncategorised into a trailing "More" group.
  const groups = useMemo(() => {
    const byCategory = categories.map((cat) => ({
      id: cat._id,
      name: cat.name,
      items: filteredItems.filter((it) => String(it.categoryId) === String(cat._id)),
    }));

    const knownIds = new Set(categories.map((c) => String(c._id)));
    const orphans = filteredItems.filter((it) => !it.categoryId || !knownIds.has(String(it.categoryId)));
    if (orphans.length) byCategory.push({ id: '__more__', name: 'More', items: orphans });

    const validGroups = byCategory.filter((g) => g.items.length > 0);

    // Only show best sellers if we are NOT searching, or if they match the search
    const bestSellers = filteredItems.filter((it) => it.isBestSeller);
    if (bestSellers.length > 0) {
      validGroups.unshift({
        id: '__best_sellers__',
        name: '🔥 Best Sellers',
        items: bestSellers,
      });
    }

    return validGroups;
  }, [categories, filteredItems]);

  const scrollTo = (id) => {
    const el = sectionRefs.current[id];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (loading) return <MenuSkeleton />;

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        Couldn't load the menu: {error}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="py-16 text-center text-stone-500">
        <p className="text-lg font-semibold">The menu is being prepared</p>
        <p className="mt-1 text-sm">Please check back soon.</p>
      </div>
    );
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setActiveSearch(inputText);
    setShowDropdown(false);
  };

  const handleSuggestionClick = (suggestion) => {
    setInputText(suggestion);
    setActiveSearch(suggestion);
    setShowDropdown(false);
  };

  const clearSearch = () => {
    setInputText('');
    setActiveSearch('');
    setShowDropdown(false);
  };

  return (
    <div>
      {activeSearch && (
        <div className="mb-3 flex items-center gap-3">
          <button 
            onClick={clearSearch}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-200 text-stone-600 transition hover:bg-stone-300"
            aria-label="Back to home"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <h1 className="text-xl font-bold text-stone-900">Search Results</h1>
        </div>
      )}

      <div className="mb-2 relative z-30">
        <form onSubmit={handleSearchSubmit} className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-stone-400">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </div>
          <input
            type="search"
            placeholder="Search for dishes..."
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            className="w-full rounded-2xl border border-stone-200 bg-white py-3 pl-11 pr-4 text-sm font-medium text-stone-900 placeholder:font-normal placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-500/10 shadow-sm transition-all"
          />
        </form>

        {showDropdown && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg">
            <ul className="py-1">
              {suggestions.map((sug, i) => (
                <li key={i}>
                  <button
                    onClick={() => handleSuggestionClick(sug)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-stone-700 transition hover:bg-stone-50"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                    {sug}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {groups.length === 0 && activeSearch.trim() !== '' && (
        <div className="py-12 text-center text-stone-500">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-stone-400">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </div>
          <p className="text-base font-semibold text-stone-900">No matches found</p>
          <p className="mt-1 text-sm">We couldn't find any items matching "{activeSearch}".</p>
          <button 
            onClick={clearSearch}
            className="mt-4 rounded-lg bg-stone-100 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-200 transition"
          >
            Clear Search
          </button>
        </div>
      )}

      {/* Sticky category quick-nav */}
      {groups.length > 1 && !activeSearch.trim() && (
        <div className="sticky top-[57px] z-10 -mx-4 mb-4 flex gap-2 overflow-x-auto border-b border-stone-100 bg-white/95 px-4 py-3 backdrop-blur shadow-sm scrollbar-hide">
          {groups.map((g) => (
            <button
              type="button"
              key={g.id}
              onClick={() => scrollTo(g.id)}
              className="whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-bold transition-all border border-stone-200 bg-white text-stone-600 shadow-sm hover:border-amber-400 hover:text-amber-700 active:scale-95"
            >
              {g.name}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-5">
        {groups.map((group) => (
          <section
            key={group.id}
            ref={(el) => {
              sectionRefs.current[group.id] = el;
            }}
            className="scroll-mt-32"
          >
            <h2 className="mb-2.5 px-1 text-[13px] font-semibold uppercase tracking-wider text-stone-500">
              {group.name}
            </h2>
            <div className="space-y-2.5">
              {group.items.map((item) => (
                <FoodItemCard key={item._id} item={item} readOnly={readOnly} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function MenuSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-6 w-24 animate-pulse rounded bg-stone-200" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-3 rounded-xl border border-stone-200 bg-white p-3">
          <div className="h-24 w-24 shrink-0 animate-pulse rounded-lg bg-stone-200" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 w-2/3 animate-pulse rounded bg-stone-200" />
            <div className="h-3 w-full animate-pulse rounded bg-stone-100" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-stone-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
