import { useCallback, useEffect, useRef, useState } from 'react'

type SliderDirection = 'horizontal' | 'vertical'

export function useSlider(direction: SliderDirection = 'horizontal') {
  const trackRef = useRef<HTMLDivElement>(null)
  const [canScroll, setCanScroll] = useState(false)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(true)

  const updateState = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    const position = direction === 'horizontal' ? track.scrollLeft : track.scrollTop
    const viewport = direction === 'horizontal' ? track.clientWidth : track.clientHeight
    const total = direction === 'horizontal' ? track.scrollWidth : track.scrollHeight
    setCanScroll(total > viewport + 1)
    setAtStart(position <= 1)
    setAtEnd(position + viewport >= total - 1)
  }, [direction])

  const move = useCallback((amount: number) => {
    const track = trackRef.current
    if (!track) return
    if (direction === 'horizontal') track.scrollBy({ left: amount * track.clientWidth, behavior: 'smooth' })
    else track.scrollBy({ top: amount * track.clientHeight, behavior: 'smooth' })
  }, [direction])

  useEffect(() => {
    updateState()
    const track = trackRef.current
    if (!track) return
    const observer = new ResizeObserver(updateState)
    observer.observe(track)
    return () => observer.disconnect()
  }, [updateState])

  return { trackRef, canScroll, atStart, atEnd, move, updateState }
}
