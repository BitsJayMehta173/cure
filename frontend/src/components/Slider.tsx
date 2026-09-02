import type { ReactNode } from 'react'
import { useSlider } from '../hooks/useSlider'

type SliderProps = {
  children: ReactNode
  className?: string
  direction?: 'horizontal' | 'vertical'
  label?: string
}

export function Slider({ children, className = '', direction = 'horizontal', label = 'Slider' }: SliderProps) {
  const { trackRef, canScroll, atStart, atEnd, move, updateState } = useSlider(direction)

  return (
    <div className={`slider ${className}`}>
      <button className="slider-button slider-button-left" type="button" aria-label={`Previous ${label}`} onClick={() => move(-1)} hidden={!canScroll || atStart}>&lt;</button>
      <div className="slider-track" ref={trackRef} onScroll={updateState}>{children}</div>
      <button className="slider-button slider-button-right" type="button" aria-label={`Next ${label}`} onClick={() => move(1)} hidden={!canScroll || atEnd}>&gt;</button>
    </div>
  )
}
