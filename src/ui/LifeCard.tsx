import { useLayoutEffect, useRef } from 'react'
import { Icon } from '@iconify/react'
import type { IconifyIcon } from '@iconify/react'
import calendarIcon from '@iconify-icons/material-symbols/calendar-month-outline-sharp'
import userIcon from '@iconify-icons/material-symbols/person-outline-sharp'
import mapIcon from '@iconify-icons/material-symbols/location-on-outline-sharp'
import medalIcon from '@iconify-icons/material-symbols/military-tech-outline-sharp'
import familyIcon from '@iconify-icons/material-symbols/family-restroom-sharp'
import caseIcon from '@iconify-icons/material-symbols/work-outline-sharp'
import bowlIcon from '@iconify-icons/material-symbols/rice-bowl-outline-sharp'
import moonIcon from '@iconify-icons/material-symbols/bedtime-outline-sharp'
import pulseIcon from '@iconify-icons/material-symbols/monitor-heart-outline-sharp'
import type { Life } from '../engine/types'
import { CURRENT_YEAR, formatYear } from '../engine/eras'
import { SourcePill } from './SourcePill'
import { Portrait } from './Portrait'
import { ordinal } from '../data/memories'
import { eul, euro } from './korean'
import { gsap, EASE_OUT } from '../motion/gsap'
import { prefersReduced } from '../motion/reduced'

interface Props {
  life: Life
  onOpenSources: (ids: string[]) => void
  /** 초상 이미지 경로 (없으면 초상 칸 없음) */
  portraitSrc?: string
  /** 초상 출처 id */
  portraitSource?: string
  /** 원본 아래쪽 잘라내기 비율 */
  portraitTrim?: number
  /** 확대 배율 */
  portraitZoom?: number
  /** 가로 늘리기 배율 */
  portraitStretch?: number
}

const ROW_ICONS: Record<string, IconifyIcon> = { 생년: calendarIcon, 이름: userIcon, 거주: mapIcon, 계급: medalIcon, 가족: familyIcon, 직업: caseIcon, 주식: bowlIcon, 사망: moonIcon, 현재: pulseIcon }

function Row({ label, children, sources, onOpen, note, odds }: { label: string; children: React.ReactNode; sources: string[]; onOpen: (ids: string[]) => void; note?: string; odds?: string }) {
  const icon = ROW_ICONS[label]
  return (
    <div className="row">
      <div className="row-label">{icon && <Icon icon={icon} width={17} className="row-icon" />}<span>{label}</span></div>
      <div className="row-value">
        <div className="row-main">
          <span>{children}</span>
          <SourcePill sources={sources} onOpen={onOpen} />
        </div>
        {odds && <div className="row-odds">{odds}</div>}
        {note && <div className="row-note">{note}</div>}
      </div>
    </div>
  )
}

export function LifeCard({ life, onOpenSources, portraitSrc, portraitSource = 'portrait_ai', portraitTrim = 0, portraitZoom = 1, portraitStretch = 1 }: Props) {
  const ref = useRef<HTMLElement>(null)

  // 서사는 문장 단위로 떠오르고, 상세 행은 시야에 들어올 때 드러난다
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || prefersReduced()) return
    const ctx = gsap.context(() => {
      gsap.timeline({ delay: 0.25 })
        .from('.card-era', { opacity: 0, duration: 0.6, ease: EASE_OUT })
        .from('.sent', { opacity: 0, y: 10, filter: 'blur(6px)', duration: 0.9, stagger: 0.16, ease: EASE_OUT, clearProps: 'filter' }, '-=0.3')
        .from('.mortality-note', { opacity: 0, duration: 0.7, ease: EASE_OUT }, '-=0.4')
        .from('.row', { opacity: 0, y: 14, duration: 0.7, stagger: 0.06, ease: EASE_OUT }, '-=0.5')
    }, el)
    return () => ctx.revert()
  }, [life.seed])

  const c = life.country.value
  const cls = life.socialClass.value
  const fam = life.family.value
  const d = life.death.value
  const sexWord = life.sex === 'M' ? '남자' : '여자'
  const orderWord = fam.siblingsBorn === 0 ? '외동' : `${fam.siblingsBorn + 1}남매 중 ${ordinal(fam.birthOrder)}`
  const yearLabel = formatYear(life.birthYear)

  const narrative: string[] = []
  narrative.push(`당신은 ${yearLabel}, ${c.name}의 ${c.region}에서 ${cls.name} 집안의 ${orderWord} ${sexWord}아이로 태어났습니다.`)
  narrative.push(`이름은 ${life.name.value}.`)
  if (d && d.age < 7) {
    narrative.push(`${life.staple.value}${eul(life.staple.value)} 먹는 집에서 자라다, ${d.age === 0 ? '첫돌을 넘기지 못하고' : `${d.age}세에`} ${d.cause}${euro(d.cause)} 세상을 떠났습니다.`)
  } else {
    const job = life.occupation.value
    if (d) narrative.push(`${life.staple.value}${eul(life.staple.value)} 먹으며 자랐고, ${job}${euro(job)} 살았습니다.`)
    else if (job === '영유아' && (life.currentAge ?? 0) < 3) narrative.push('아직 젖먹이 아기입니다.')
    else if (job === '영유아') narrative.push(`${life.staple.value}${eul(life.staple.value)} 먹으며 자라는 어린아이입니다.`)
    else if (job.startsWith('학생') || job.startsWith('대학생')) narrative.push(`${life.staple.value}${eul(life.staple.value)} 먹으며 자랐고, 지금은 ${job}입니다.`)
    else if (job.startsWith('은퇴 · 전직 ')) { const prev = job.slice('은퇴 · 전직 '.length); narrative.push(`${life.staple.value}${eul(life.staple.value)} 먹으며 자랐고, ${prev}${euro(prev)} 일하다 은퇴했습니다.`) }
    else narrative.push(`${life.staple.value}${eul(life.staple.value)} 먹으며 자랐고, ${job}${euro(job)} 살고 있습니다.`)
    if (fam.married) {
      const kids = fam.childrenBorn === 0 ? '자녀는 없었습니다' : fam.childrenSurvived === fam.childrenBorn ? `자녀 ${fam.childrenBorn}명을 두었습니다` : `자녀 ${fam.childrenBorn}명을 낳아 ${fam.childrenSurvived}명을 키웠습니다`
      narrative.push(`${fam.marriedAt}세에 혼인해 ${kids}.`)
      if (fam.divorcedAt !== undefined) narrative.push(`${fam.divorcedAt}세에 이혼했${fam.remarried ? '고, 뒤에 재혼했습니다' : '습니다'}.`)
      else if (fam.widowedAt !== undefined) narrative.push(`${fam.widowedAt}세에 배우자를 먼저 떠나보냈${fam.remarried ? '고, 뒤에 ' + (life.sex === 'M' ? '재취' : '재가') + '했습니다' : '습니다'}.`)
    } else if (d === null && (life.currentAge ?? 0) < 45) {
      narrative.push('아직 혼인하지 않았습니다.')
    } else if (d === null || d.age >= 45) {
      narrative.push('평생 혼인하지 않았습니다.')
    }
    if (d) narrative.push(`${d.age}세가 되던 ${formatYear(d.year)}, ${d.event ? `${d.event} 때 ` : ''}${d.cause}${euro(d.cause)} 세상을 떠났습니다.`)
    else narrative.push(`${CURRENT_YEAR}년 현재 ${life.currentAge}세로 살아 있습니다.`)
  }

  return (
    <section ref={ref} className="card">
      <div className="card-era dossier-line">
        <span>기록 번호 {String(life.seed).padStart(10, '0')}</span>
        <span>분류 {life.eraName}</span>
        <span>기록일 {CURRENT_YEAR}년</span>
        <span>기록자 시대별 통계</span>
      </div>
      <div className={`head-grid ${portraitSrc ? 'has-portrait' : ''}`}>
        {portraitSrc && (
          <figure className="portrait">
            <Portrait src={portraitSrc} alt={`${life.name.value} 초상`} trimBottom={portraitTrim} zoom={portraitZoom} stretchX={portraitStretch} />
            <figcaption><SourcePill sources={[portraitSource]} onOpen={onOpenSources} /></figcaption>
          </figure>
        )}
        <div className="head-text">
          <h2 className="headline">{life.name.value}</h2>
          <div className="headline-sub">
            {yearLabel}{d ? ` — ${formatYear(d.year)} · ${d.age}세` : ` — 현재 · ${life.currentAge}세`} · {c.region.replace(/\s*\(.*\)$/, '')}
          </div>
        </div>
      </div>
      <p className="narrative">
        {narrative.map((sent, i) => (
          <span key={i} className="sent">{sent}{i < narrative.length - 1 ? ' ' : ''}</span>
        ))}
      </p>
      <p className="mortality-note">비고 · {life.mortalityNote}</p>

      <div className="section-label">항목</div>
      <div className="rows">
        <Row label="생년" sources={['kosis_pop', 'kwon_shin', 'samguk_pop', 'jeongok']} onOpen={onOpenSources} odds={life.yearOdds} note={life.fixedYear !== undefined ? `직접 고른 생년. 출생아 가중이라면 이 시대에 태어날 확률은 ${(life.eraShare * 100).toFixed(life.eraShare < 0.01 ? 2 : 1)}%` : life.mode === 'uniform' ? `시대 균등 추첨. 출생아 가중이라면 이 시대에 태어날 확률은 ${(life.eraShare * 100).toFixed(life.eraShare < 0.01 ? 2 : 1)}%` : `출생아 가중 추첨. 이 시대 출생 비중 ${(life.eraShare * 100).toFixed(life.eraShare < 0.01 ? 2 : 1)}%`}>
          {yearLabel} · {life.eraName}
        </Row>
        <Row label="이름" sources={life.name.sources} onOpen={onOpenSources} note={life.name.note} odds={life.name.odds}>
          {life.name.value} <span className="dim">({sexWord})</span>
        </Row>
        <Row label="거주" sources={life.country.sources} onOpen={onOpenSources} note={life.country.note} odds={life.country.odds}>
          {c.name} <span className="dim">· {c.region}</span>
        </Row>
        <Row label="계급" sources={life.socialClass.sources} onOpen={onOpenSources} note={cls.desc || undefined} odds={life.socialClass.odds}>
          {cls.name}
        </Row>
        <Row label="가족" sources={life.family.sources} onOpen={onOpenSources} odds={life.family.odds}>
          아버지는 {fam.fatherJob}. {fam.siblingsBorn === 0 ? '형제 없음' : `형제 ${fam.siblingsBorn}명${fam.siblingsSurvived < fam.siblingsBorn ? ` (그중 ${fam.siblingsSurvived}명이 15세까지 생존)` : ''}`}.{' '}
          {fam.married ? `${fam.marriedAt}세 혼인${fam.divorcedAt !== undefined ? `, ${fam.divorcedAt}세 이혼` : ''}${fam.widowedAt !== undefined ? `, ${fam.widowedAt}세 사별` : ''}${fam.remarried ? ', 재혼' : ''}, 자녀 ${fam.childrenBorn}명${fam.childrenSurvived < fam.childrenBorn ? ` (${fam.childrenSurvived}명 생존)` : ''}` : '미혼'}
        </Row>
        <Row label="직업" sources={life.occupation.sources} onOpen={onOpenSources} odds={life.occupation.odds}>
          {life.occupation.value}
        </Row>
        <Row label="주식" sources={life.staple.sources} onOpen={onOpenSources} note={life.staple.note}>
          {life.staple.value}
        </Row>
        {d ? (
          <Row label="사망" sources={life.death.sources} onOpen={onOpenSources} odds={life.death.odds} note={d.event ? `역사 사건: ${d.event}` : d.maternal ? '출산 관련 사망. 시대·계급별 출산당 산모 사망률 보정 적용' : undefined}>
            {d.age}세 · {formatYear(d.year)} · {d.cause}
          </Row>
        ) : (
          <Row label="현재" sources={life.death.sources} onOpen={onOpenSources} odds={life.death.odds}>
            {CURRENT_YEAR}년 기준 {life.currentAge}세, 생존
          </Row>
        )}
      </div>

    </section>
  )
}
