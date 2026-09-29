import { useEffect, useMemo, useRef, useState } from 'react'
import { ERAS } from '../engine/eras'
import { eraBirthShare } from '../engine/demography'
import type { Mode } from '../engine/types'
import { gsap } from '../motion/gsap'
import { prefersReduced } from '../motion/reduced'

/** 4만 년의 지층: 시대 10개의 추첨 비중을 띠로 보여주는 데이터 그래픽 */
export function EraStrip({ mode }: { mode: Mode }) {
  const shares = useMemo(() => ERAS.map((e) => eraBirthShare(e.start, e.end)), [])
  const ref = useRef<HTMLDivElement>(null)
  const first = useRef(true)
  const [hover, setHover] = useState<number | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const segs = Array.from(el.querySelectorAll<HTMLElement>('.seg'))
    const animate = !first.current && !prefersReduced()
    first.current = false
    segs.forEach((s, i) => {
      const grow = mode === 'uniform' ? 1 : Math.max(0.12, shares[i] * 10)
      if (animate) gsap.to(s, { flexGrow: grow, duration: 0.8, ease: 'power3.inOut', overwrite: 'auto' })
      else s.style.flexGrow = String(grow)
    })
  }, [mode, shares])

  const label = hover === null ? (mode === 'uniform' ? '열 개 시대가 같은 폭' : '출생아 수에 비례한 폭') : `${ERAS[hover].name} · ${mode === 'uniform' ? '10' : (shares[hover] * 100).toFixed(shares[hover] < 0.01 ? 1 : 0)}%`

  return (
    <div className="strip-wrap">
      <div ref={ref} className="strip" role="img" aria-label={`시대별 추첨 비중. ${mode === 'uniform' ? '열 개 시대 각 10%' : ERAS.map((e, i) => `${e.name} ${(shares[i] * 100).toFixed(1)}%`).join(', ')}`} onPointerLeave={() => setHover(null)}>
        {ERAS.map((e, i) => (
          <div key={e.id} className={`seg ${hover === i ? 'on' : ''}`} style={{ ['--tint' as string]: e.tint, flexGrow: 1 }} onPointerEnter={() => setHover(i)} />
        ))}
      </div>
      <div className="strip-legend">
        <span>4만 년 전</span>
        <span className="strip-label" aria-live="polite">{label}</span>
        <span>2026</span>
      </div>
    </div>
  )
}
