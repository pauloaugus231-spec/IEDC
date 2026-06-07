import { useLocation } from 'react-router-dom';

/**
 * Returns a stable key for `AnimatePresence` that changes only when the
 * pathname changes — query-param or hash changes do not trigger a page
 * transition animation.
 *
 * Usage in App.tsx:
 * ```tsx
 * const { locationKey } = usePageTransition();
 * <AnimatePresence mode="wait">
 *   <Routes location={location} key={locationKey}> ... </Routes>
 * </AnimatePresence>
 * ```
 */
export function usePageTransition() {
  const location = useLocation();
  return {
    locationKey: location.pathname,
    location,
  };
}
