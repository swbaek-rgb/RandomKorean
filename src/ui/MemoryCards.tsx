import { useLayoutEffect, useRef } from 'react'
import { Icon } from '@iconify/react'
import bookIcon from '@iconify-icons/material-symbols/menu-book-outline-sharp'
import type { LifeMemories } from '../data/memories'
import { SourcePill } from './SourcePill'
import { gsap, EASE_OUT } from '../motion/gsap'
import { prefersReduced } from '../motion/reduced'

interface Props {
  memories: LifeMemories
  onOpenSources: (ids: string[]) => void
}

/** 기억 카드 묶음: 가장 기억에 남는 하루, (사망자면) 마지막 날 */
export function MemoryCards({ memories, onOpenSources }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || prefersReduced()) return
    const ctx = gsap.context(() => {
      gsap.from('.memory-card', { opacity: 0, y: 18, filter: 'blur(8px)', duration: 0.8, stagger: 0.18, ease: EASE_OUT, clearProps: 'filter' })
      gsap.from('.memory-card .memory-body', { opacity: 0, duration: 0.9, delay: 0.35, stagger: 0.18, ease: EASE_OUT })
    }, el)
    return () => ctx.revert()
  }, [memories])

  const [dateLine, placeLine] = splitTitle(memories.best.title)
  return (
    <div ref={ref} className="memory-cards">
      <article className="memory-card">
        <div className="memory-head">
          <span className="memory-kind"><Icon icon={bookIcon} width={14} /> 첨부 기록 №1 · {memories.best.kind}에 대한 기억</span>
          <SourcePill sources={['memory_fiction']} onOpen={onOpenSources} />
        </div>
        <h4 className="memory-title">가장 기억에 남는 하루</h4>
        <div className="memory-when"><span className="k">일자</span> {dateLine}{placeLine && <><span className="k"> 장소</span> {placeLine}</>}</div>
        <p className="memory-body">{memories.best.body}</p>
      </article>

      {memories.last && (
        <article className="memory-card memory-card-last">
          <div className="memory-head">
            <span className="memory-kind">첨부 기록 №2 · 죽음에 대한 기억</span>
            <SourcePill sources={['memory_fiction']} onOpen={onOpenSources} />
          </div>
          <h4 className="memory-title">마지막 날</h4>
          <div className="memory-when"><span className="k">일자</span> {memories.last.title.replace(/^마지막 날 · /, '')}</div>
          <p className="memory-body">{memories.last.body}</p>
        </article>
      )}
      {memories.lastOmitted && (
        <article className="memory-card memory-card-last memory-card-quiet">
          <p className="memory-omitted">{memories.lastOmitted}</p>
        </article>
      )}
    </div>
  )
}

/** "가장 기억에 남는 하루 · 1687년 늦여름, 23세 · 경상도" → ["1687년 늦여름, 23세", "경상도"] */
function splitTitle(title: string): [string, string] {
  const parts = title.split(' · ')
  return [parts[1] ?? '', parts.slice(2).join(' · ')]
}
