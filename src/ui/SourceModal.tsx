import { useEffect, useRef } from 'react'
import { Icon } from '@iconify/react'
import closeIcon from '@iconify-icons/material-symbols/close-sharp'
import linkIcon from '@iconify-icons/material-symbols/link-sharp'
import { src, type SourceKind } from '../data/sources'

const LABEL: Record<SourceKind, string> = { stat: '실측 통계', estimate: '학술 추정', fiction: '창작' }

interface Props {
  ids: string[] | null
  onClose: () => void
}

export function SourceModal({ ids, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (ids && !d.open) d.showModal()
    if (!ids && d.open) d.close()
  }, [ids])
  return (
    <dialog ref={ref} className="modal" onClose={onClose} onClick={(e) => { if (e.target === ref.current) onClose() }}>
      <div className="modal-body" data-lenis-prevent>
        <div className="modal-head">
          <h3>출처</h3>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기"><Icon icon={closeIcon} width={22} /></button>
        </div>
        {ids?.map((id) => {
          const s = src(id)
          return (
            <article key={id} className="source">
              <div className="source-top">
                <span className={`pill pill-${s.kind} pill-static`}><span className="pill-kind">{LABEL[s.kind]}</span></span>
                <strong>{s.title}</strong>
              </div>
              <div className="source-org">{s.org}</div>
              {s.note && <p className="source-note">{s.note}</p>}
              {s.url && <a href={s.url} target="_blank" rel="noreferrer noopener"><Icon icon={linkIcon} width={14} /> {s.url.replace(/^https?:\/\//, '')}</a>}
            </article>
          )
        })}
        <p className="modal-foot">통계 = 국가기관 실측치 · 추정 = 원전·모델 기반 학술 추정 · 창작 = 기록이 없어 만든 값</p>
      </div>
    </dialog>
  )
}
