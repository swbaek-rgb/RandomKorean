import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import arrowLeft from '@iconify-icons/material-symbols/arrow-back-sharp'
import arrowRight from '@iconify-icons/material-symbols/chevron-right-sharp'
import restartIcon from '@iconify-icons/material-symbols/refresh-sharp'
import shareIcon from '@iconify-icons/material-symbols/share-sharp'
import checkIcon from '@iconify-icons/material-symbols/check-circle-outline-sharp'
import { generateLife } from './engine/generate'
import { randomSeed } from './engine/rng'
import { ERAS } from './engine/eras'
import type { Life, Mode } from './engine/types'
import { LifeCard } from './ui/LifeCard'
import { MemoryCards } from './ui/MemoryCards'
import { lifeMemories } from './data/memories'
import { portraitPath } from './data/portraits'
import bookIcon from '@iconify-icons/material-symbols/menu-book-outline-sharp'
import { SourceModal } from './ui/SourceModal'
import { YearReveal } from './ui/YearReveal'
import { EraStrip } from './ui/EraStrip'
import { TimelinePicker } from './ui/TimelinePicker'
import { SplitWords } from './ui/SplitWords'
import { gsap, EASE_OUT } from './motion/gsap'
import { prefersReduced } from './motion/reduced'
import { useLenis } from './motion/useLenis'

type Step = 'start' | 'year' | 'life'
function readUrl(): { seed: number | null; mode: Mode; year: number | null } {
  const p = new URLSearchParams(location.search)
  const s = p.get('s')
  const m = p.get('m')
  const y = p.get('y')
  return { seed: s && /^\d+$/.test(s) ? Number(s) >>> 0 : null, mode: m === 'w' ? 'weighted' : 'uniform', year: y && /^-?\d+$/.test(y) ? Number(y) : null }
}

function writeUrl(seed: number | null, mode: Mode, year: number | null) {
  if (seed === null) {
    history.replaceState(null, '', location.pathname)
    return
  }
  const p = new URLSearchParams()
  p.set('s', String(seed))
  if (year !== null) p.set('y', String(year))
  else if (mode === 'weighted') p.set('m', 'w')
  history.replaceState(null, '', `?${p.toString()}`)
}

const DEFAULT_ERA_COLOR = '#6b6259'

export default function App() {
  const init = useMemo(readUrl, [])
  const [mode, setMode] = useState<Mode>(init.mode)
  const [seed, setSeed] = useState<number | null>(init.seed)
  const [fixedYear, setFixedYear] = useState<number | null>(init.year)
  const [manual, setManual] = useState(false)
  const [manualYear, setManualYear] = useState<number>(init.year ?? 1990)
  const manualYearRef = useRef(manualYear)
  manualYearRef.current = manualYear
  const [step, setStep] = useState<Step>(init.seed === null ? 'start' : 'life')
  const [revealed, setRevealed] = useState(false)
  const [sources, setSources] = useState<string[] | null>(null)
  const [copied, setCopied] = useState(false)
  const [showMemory, setShowMemory] = useState(false)
  const screenRef = useRef<HTMLElement>(null)
  const leaving = useRef(false)

  const life: Life | null = useMemo(() => (seed === null ? null : generateLife(seed, mode, fixedYear ?? undefined)), [seed, mode, fixedYear])
  const memories = useMemo(() => (life ? lifeMemories(life) : null), [life])
  useEffect(() => { setShowMemory(false) }, [seed])
  const tint = life ? ERAS.find((e) => e.id === life.eraId)!.tint : DEFAULT_ERA_COLOR

  useLenis(step === 'life')

  useEffect(() => {
    writeUrl(seed, mode, fixedYear)
  }, [seed, mode, fixedYear])

  // 시대 빛깔: 생년이 드러난 뒤와 상세 화면에서만 켠다
  useEffect(() => {
    const on = (step === 'year' && revealed) || step === 'life'
    document.documentElement.style.setProperty('--era', on ? tint : DEFAULT_ERA_COLOR)
  }, [step, revealed, tint])

  // 화면 진입: 먹이 번지듯 흐림에서 또렷해진다
  useLayoutEffect(() => {
    const el = screenRef.current
    if (!el || prefersReduced()) return
    const ctx = gsap.context(() => {
      gsap.fromTo(el, { opacity: 0, y: 14, filter: 'blur(10px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.7, ease: EASE_OUT, clearProps: 'filter' })
      if (step === 'start') {
        gsap.timeline({ delay: 0.15 })
          .from('.eyebrow', { opacity: 0, y: 6, duration: 0.6, ease: EASE_OUT })
          .from('.title .w-in', { opacity: 0, y: 26, filter: 'blur(8px)', duration: 0.9, stagger: 0.07, ease: EASE_OUT, clearProps: 'filter' }, '-=0.4')
          .from('.tagline', { opacity: 0, y: 8, duration: 0.7, ease: EASE_OUT }, '-=0.6')
          .from('.seg', { scaleX: 0, duration: 0.7, stagger: 0.045, ease: EASE_OUT }, '-=0.5')
          .from('.strip-legend', { opacity: 0, duration: 0.5 }, '-=0.4')
          .from(['.mode', '.mode-help', '.screen-start .roll', '.screen-start .intro'], { opacity: 0, y: 10, duration: 0.6, stagger: 0.08, ease: EASE_OUT }, '-=0.45')
      }
    }, el)
    return () => ctx.revert()
  }, [step])

  /** 화면 전환: 현재 화면을 빠르게 걷어낸 뒤 다음 화면을 올린다 */
  const goTo = useCallback((next: Step, before?: () => void) => {
    const el = screenRef.current
    if (leaving.current) return
    const apply = () => {
      before?.()
      setStep(next)
      leaving.current = false
      window.scrollTo({ top: 0 })
    }
    if (!el || prefersReduced()) {
      apply()
      return
    }
    leaving.current = true
    gsap.to(el, { opacity: 0, y: -10, filter: 'blur(8px)', duration: 0.24, ease: 'power2.out', onComplete: apply })
  }, [])

  const pickYear = useCallback(() => {
    goTo('year', () => {
      setSeed(randomSeed())
      setFixedYear(null)
      setRevealed(false)
    })
  }, [goTo])

  /** 연표에서 고른 생년으로 바로 상세 화면 */
  const liveManual = useCallback(() => {
    // 클로저가 아니라 ref 로 읽는다: 모바일에서 입력 직후 탭하면 렌더 전 값이 잡힐 수 있음
    const y = manualYearRef.current
    goTo('life', () => {
      setSeed(randomSeed())
      setFixedYear(y)
    })
  }, [goTo])

  const restart = useCallback(() => {
    goTo('start', () => {
      setSeed(null)
      setFixedYear(null)
    })
  }, [goTo])

  const share = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      /* clipboard 미지원 */
    }
  }, [])

  return (
    <>
      <div className="ink" aria-hidden="true">
        <div className="ink-grain" />
      </div>

      <main className="app sheet">
        <div className="sheet-holes" aria-hidden="true"><span /><span /><span /></div>
        {step === 'start' && (
          <section ref={screenRef} className="screen screen-start" key="start">
            <div className="masthead">
              <div className="eyebrow">기록 제1호 · 한반도 · 4만 년</div>
              <h1 className="title"><SplitWords text="한반도 생애 시뮬레이터" /></h1>
              <p className="tagline">4만 년 전부터 2026년까지, 한반도에서 태어난 어떤 한 사람의 생애 기록</p>
            </div>

            <EraStrip mode={mode} />

            <div className="mode" role="radiogroup" aria-label="생년 추첨 방식">
              <label className={`mode-opt ${mode === 'uniform' ? 'on' : ''}`}>
                <input type="radio" name="mode" checked={mode === 'uniform'} onChange={() => setMode('uniform')} />
                시대 균등
              </label>
              <label className={`mode-opt ${mode === 'weighted' ? 'on' : ''}`}>
                <input type="radio" name="mode" checked={mode === 'weighted'} onChange={() => setMode('weighted')} />
                출생아 가중
              </label>
            </div>
            <p className="mode-help">
              {mode === 'uniform' ? '열 개 시대 중 하나를 같은 확률로 고른 뒤 그 안에서 생년을 뽑습니다.' : '각 연도의 추정 인구 × 출생률에 비례해 생년을 뽑습니다. 실제로 태어난 사람 중 한 명을 고르는 것과 같아, 대부분 조선 이후가 나옵니다.'}
            </p>

            <button type="button" className="roll" onClick={pickYear}>생년 정하기</button>
            <button type="button" className="linkish" onClick={() => setManual((m) => !m)} aria-expanded={manual}>
              {manual ? '직접 입력 닫기' : '생년 직접 입력하기'}
            </button>

            {manual && (
              <div className="manual">
                <TimelinePicker year={manualYear} onChange={setManualYear} />
                <button type="button" className="roll compact" onClick={liveManual}>이 생년으로 살아보기</button>
              </div>
            )}

            <p className="intro">
              생년이 정해지면 그 시대의 통계에 따라 이름·거주지·계급·가족·직업·주식·사망이 차례로 뽑힙니다.
              각 항목 옆의 작은 배지를 누르면 어떤 자료를 근거로 했는지 볼 수 있습니다.
            </p>
          </section>
        )}

        {step === 'year' && life && (
          <section ref={screenRef} className="screen screen-year" key={`year-${life.seed}`}>
            <YearReveal year={life.birthYear} eraName={life.eraName} tint={tint} onDone={() => setRevealed(true)} />
            <div className={`reveal-actions ${revealed ? 'show' : ''}`}>
              <button type="button" className="roll" onClick={() => goTo('life')} disabled={!revealed}>다음 <Icon icon={arrowRight} width={18} style={{ verticalAlign: '-3px' }} /></button>
              <button type="button" className="ghost" onClick={pickYear} disabled={!revealed}><Icon icon={restartIcon} width={16} /> 다시 뽑기</button>
            </div>
          </section>
        )}

        {step === 'life' && life && (
          <section ref={screenRef} className="screen screen-life" key={`life-${life.seed}`}>
            <header className="life-head">
              <button type="button" className="ghost small" onClick={restart}><Icon icon={arrowLeft} width={16} /> 처음으로</button>
              <span className="life-title">한반도 생애 시뮬레이터 · 생애 기록</span>
            </header>
            <LifeCard life={life} onOpenSources={setSources} {...(portraitPath(life) ? { portraitSrc: portraitPath(life)!, portraitSource: 'portrait_ai', portraitTrim: 0.07, portraitStretch: 1.2, portraitZoom: life.birthYear >= -108 && life.birthYear < 1897 ? 1.6 : 1 } : {})} />

            {memories && !showMemory && (
              <div className="memory-cta">
                <button type="button" className="roll memory-btn" onClick={() => setShowMemory(true)}>
                  <Icon icon={bookIcon} width={20} style={{ verticalAlign: '-4px' }} /> 이 삶의 기억 보기
                </button>
                <p className="memory-cta-help">가장 기억에 남는 하루{life.death.value ? '와 마지막 날' : ''}을 그 사람의 목소리로 읽습니다</p>
              </div>
            )}
            {memories && showMemory && <MemoryCards memories={memories} onOpenSources={setSources} />}

            <div className="actions">
              <button type="button" className="roll compact" onClick={pickYear}>다른 삶 살아보기</button>
              {fixedYear !== null && <button type="button" className="ghost" onClick={() => setSeed(randomSeed())}><Icon icon={restartIcon} width={16} /> 같은 생년으로 다시</button>}
              <button type="button" className="ghost" onClick={share}><Icon icon={copied ? checkIcon : shareIcon} width={16} /> {copied ? '링크 복사됨' : '이 삶 공유하기'}</button>
            </div>
            <p className="seed">seed {life.seed}</p>
            <footer className="foot">
              <p>전근대 수치는 학술 추정치이며, 개인 서사는 통계로 만든 허구입니다. 배지 색: <span className="pill pill-stat pill-static"><span className="pill-kind">통계</span></span> <span className="pill pill-estimate pill-static"><span className="pill-kind">추정</span></span> <span className="pill pill-fiction pill-static"><span className="pill-kind">창작</span></span></p>
            </footer>
          </section>
        )}
      </main>

      <SourceModal ids={sources} onClose={() => setSources(null)} />
    </>
  )
}
