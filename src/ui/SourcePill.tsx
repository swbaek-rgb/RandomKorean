import { src, type SourceKind } from '../data/sources'

const LABEL: Record<SourceKind, string> = { stat: '통계', estimate: '추정', fiction: '창작' }

interface Props {
  sources: string[]
  onOpen: (ids: string[]) => void
}

/** 출처 pill: 가장 강한 근거 등급을 표시하고, 클릭하면 전체 출처 목록을 연다 */
export function SourcePill({ sources, onOpen }: Props) {
  if (sources.length === 0) return null
  const kinds = sources.map((id) => src(id).kind)
  const kind: SourceKind = kinds.includes('stat') ? 'stat' : kinds.includes('estimate') ? 'estimate' : 'fiction'
  const first = src(sources[0])
  const org = first.org.length <= 6 ? first.org : first.org.split(/[ (·]/)[0]
  return (
    <button type="button" className={`pill pill-${kind}`} onClick={() => onOpen(sources)} title="출처 보기">
      <span className="pill-kind">{LABEL[kind]}</span>
      <span className="pill-org">{org}{sources.length > 1 ? ` 외 ${sources.length - 1}` : ''}</span>
    </button>
  )
}
