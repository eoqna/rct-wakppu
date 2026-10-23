import { useEffect, useState } from 'react'

const coarse = () => typeof window.matchMedia === 'function' && window.matchMedia('(hover: none) and (pointer: coarse)').matches

/** True on a phone or tablet, and from the first finger on the page of anything else (a touch laptop, an iPad with a trackpad). */
export function useTouchMode() {
  const [touch, setTouch] = useState(coarse)
  useEffect(() => {
    if (touch) return
    const onDown = (e: PointerEvent) => { if (e.pointerType === 'touch') setTouch(true) }
    window.addEventListener('pointerdown', onDown, true)
    return () => window.removeEventListener('pointerdown', onDown, true)
  }, [touch])
  return touch
}
