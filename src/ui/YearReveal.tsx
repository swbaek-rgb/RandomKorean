import { useEffect, useRef, useState } from 'react'
import { CURRENT_YEAR, FIRST_YEAR, formatYear } from '../engine/eras'
import { gsap, EASE_OUT } from '../motion/gsap'
import { prefersReduced } from '../motion/reduced'

interface Props {
  year: number
  eraName: string
  tint: string
  onDone: () => void
}

const DURATION = 2800

function easeOutQuint(t: number) {
  return 1 - Math.pow(1 - t, 5)
}

/** 숫자가 어둠 속에서 흐릿하게 돌다가 또렷해지며 생년에 멈춘다 */
export function YearReveal({ year, eraName, tint, onDone }: Props) {
  const [shown, setShown] = useState<number>(FIRST_YEAR)
  const [blur, setBlur] = useState(3)
  const [settled, setSettled] = useState(false)
  const doneRef = useRef(onDone)
  doneRef.current = onDone
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = root.current
    if (!el) return
    const reduced = prefersReduced()
    const finish = () => {
      setShown(year)
      setBlur(0)
      setSettled(true)
      if (!reduced) {
        gsap.timeline()
          .fromTo(el.querySelector('.reveal-year'), { scale: 0.965, filter: 'blur(6px)' }, { scale: 1, filter: 'blur(0px)', color: tint, duration: 0.9, ease: EASE_OUT })
          .fromTo(el.querySelector('.reveal-era'), { opacity: 0, y: 8, filter: 'blur(6px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.7, ease: EASE_OUT }, '-=0.55')
      } else {
        gsap.set(el.querySelector('.reveal-year'), { color: tint })
        gsap.set(el.querySelector('.reveal-era'), { opacity: 1 })
      }
      doneRef.current()
    }
    if (reduced) {
      finish()
      return
    }
    gsap.fromTo(el.querySelector('.reveal-label'), { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.8, ease: EASE_OUT })
    let raf = 0
    let lastTick = 0
    const start = performance.now()
    const frame = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION)
      const e = easeOutQuint(t)
      const interval = 28 + 200 * e
      if (now - lastTick >= interval && t < 1) {
        lastTick = now
        const spread = (CURRENT_YEAR - FIRST_YEAR) * (1 - e)
        const lo = Math.max(FIRST_YEAR, year - spread)
        const hi = Math.min(CURRENT_YEAR, year + spread)
        setShown(Math.round(lo + Math.random() * (hi - lo)))
        setBlur(3 * (1 - e))
      }
      if (t < 1) raf = requestAnimationFrame(frame)
      else finish()
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [year, tint])

  return (
    <div ref={root} className={`reveal ${settled ? 'settled' : ''}`}>
      <div className="reveal-label">당신의 생년은</div>
      <div className="reveal-year" style={{ filter: settled ? undefined : `blur(${blur.toFixed(2)}px)` }}>{formatYear(shown)}</div>
      <div className="reveal-era">{eraName}</div>
    </div>
  )
}
