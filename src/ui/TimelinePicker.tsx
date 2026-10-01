import { useCallback, useEffect, useRef, useState } from 'react'
import { CURRENT_YEAR, ERAS, FIRST_YEAR, eraOf, formatYear } from '../engine/eras'

interface Props {
  year: number
  onChange: (year: number) => void
}

const N = ERAS.length

/** 연도 → 연표 위치 (0~1). 시대마다 같은 폭, 시대 안에서는 선형 */
function yearToFraction(year: number): number {
  const y = Math.max(FIRST_YEAR, Math.min(CURRENT_YEAR, year))
  const i = ERAS.findIndex((e) => y >= e.start && y < e.end)
  const idx = i < 0 ? N - 1 : i
  const e = ERAS[idx]
  const span = Math.max(1, e.end - 1 - e.start)
  return (idx + (y - e.start) / span) / N
}

function fractionToYear(f: number): number {
  const c = Math.max(0, Math.min(0.999999, f))
  const idx = Math.floor(c * N)
  const e = ERAS[idx]
  const within = c * N - idx
  return Math.round(e.start + within * (e.end - 1 - e.start))
}

/** 4만 년 연표에서 손잡이를 끌어 생년을 고른다. 화살표 ±1년, Shift ±10년, PageUp/Down ±100년 */
export function TimelinePicker({ year, onChange }: Props) {
  const track = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const [text, setText] = useState(String(year))
  const [editing, setEditing] = useState(false)
  const era = eraOf(year)
  const f = yearToFraction(year)

  useEffect(() => {
    if (!dragging && !editing) setText(String(year))
  }, [year, dragging, editing])

  const fromPointer = useCallback((clientX: number) => {
    const el = track.current
    if (!el) return
    const r = el.getBoundingClientRect()
    onChange(fractionToYear((clientX - r.left) / r.width))
  }, [onChange])

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    track.current?.setPointerCapture(e.pointerId)
    track.current?.focus()
    setDragging(true)
    fromPointer(e.clientX)
  }
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragging) fromPointer(e.clientX)
  }
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return
    setDragging(false)
    try { track.current?.releasePointerCapture(e.pointerId) } catch { /* 이미 해제됨 */ }
  }
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === 'PageUp' || e.key === 'PageDown' ? 100 : e.shiftKey ? 10 : 1
    let next: number | null = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'PageUp') next = year + step
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown' || e.key === 'PageDown') next = year - step
    if (e.key === 'Home') next = FIRST_YEAR
    if (e.key === 'End') next = CURRENT_YEAR
    if (next === null) return
    e.preventDefault()
    onChange(Math.max(FIRST_YEAR, Math.min(CURRENT_YEAR, next)))
  }
  /** 입력값을 즉시 반영한다. blur 를 기다리면 모바일에서 버튼 탭 시 값이 버려질 수 있다 */
  const applyText = (raw: string) => {
    setText(raw)
    const cleaned = raw.replace(/[^\d-]/g, '')
    if (!/^-?\d+$/.test(cleaned)) return
    const n = Number(cleaned)
    if (n >= FIRST_YEAR && n <= CURRENT_YEAR) onChange(n)
  }
  const commitText = () => {
    const cleaned = text.replace(/[^\d-]/g, '')
    if (!/^-?\d+$/.test(cleaned)) { setText(String(year)); return }
    onChange(Math.max(FIRST_YEAR, Math.min(CURRENT_YEAR, Number(cleaned))))
  }

  return (
    <div className="tl">
      <div className="tl-readout" aria-live="polite">
        <span className="tl-year" style={{ ['--tint' as string]: era.tint }}>{formatYear(year)}</span>
        <span className="tl-era">{era.name}</span>
      </div>
      <div
        ref={track}
        className={`tl-track ${dragging ? 'dragging' : ''}`}
        role="slider"
        tabIndex={0}
        aria-label="생년"
        aria-valuemin={FIRST_YEAR}
        aria-valuemax={CURRENT_YEAR}
        aria-valuenow={year}
        aria-valuetext={`${formatYear(year)}, ${era.name}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
      >
        {ERAS.map((e) => (
          <div key={e.id} className={`tl-seg ${e.id === era.id ? 'on' : ''}`} style={{ ['--tint' as string]: e.tint }} title={e.name} />
        ))}
        <div className="tl-handle" style={{ left: `${f * 100}%`, ['--tint' as string]: era.tint }} />
      </div>
      <div className="tl-legend">
        <span>4만 년 전</span>
        <span className="tl-hint">끌거나 화살표 키로 조정 · Shift는 10년, PageUp/Down은 100년</span>
        <span>2026</span>
      </div>
      <label className="tl-input">
        연도 직접 입력 <span className="dim">(기원전은 음수)</span>
        <input type="text" inputMode="numeric" value={text} onChange={(e) => applyText(e.target.value)} onFocus={(e) => { setEditing(true); const el = e.currentTarget; requestAnimationFrame(() => el.select()) }} onBlur={() => { setEditing(false); commitText() }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitText() } }} />
      </label>
    </div>
  )
}
