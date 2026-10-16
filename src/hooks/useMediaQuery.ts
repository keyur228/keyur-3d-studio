import { useEffect, useState } from 'react'

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])
  return matches
}

/** True on touch-first devices — used to disable hover physics. */
export const useCoarsePointer = () => useMediaQuery('(hover: none), (pointer: coarse)')
export const useReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)')
