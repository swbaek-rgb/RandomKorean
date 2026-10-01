// 초상 묶음(bucket) 선택. 시대군 × 성별 × 계층 × 나이대 로 파일 이름을 만들고, 생성된 파일 목록(manifest)에 있으면 쓴다.
import type { Life } from '../engine/types'
import manifest from './portraits-manifest.json'

export type PortraitGroup = 'prehist' | 'ancient' | 'joseon' | 'colonial' | 'south' | 'north'
export type Tier = 'elite' | 'common' | 'low'
export type AgeBand = 'child' | 'young' | 'middle' | 'old'

export const GROUPS: PortraitGroup[] = ['prehist', 'ancient', 'joseon', 'colonial', 'south', 'north']
export const TIERS: Tier[] = ['elite', 'common', 'low']
export const AGES: AgeBand[] = ['child', 'young', 'middle', 'old']
export const VARIANTS = 2

export function groupOf(life: Life): PortraitGroup {
  const y = life.birthYear
  if (y < -108) return 'prehist'
  if (y < 1392) return 'ancient'
  if (y < 1897) return 'joseon'
  if (y < 1945) return 'colonial'
  return life.country.value.north ? 'north' : 'south'
}
export function tierOf(life: Life): Tier {
  const h = life.socialClass.value.hazard
  return h < 0.9 ? 'elite' : h > 1 ? 'low' : 'common'
}
export function ageBandOf(life: Life): AgeBand {
  const d = life.death.value
  const age = d ? d.age : (life.currentAge ?? 0)
  return age < 15 ? 'child' : age < 35 ? 'young' : age < 60 ? 'middle' : 'old'
}

export function portraitKey(life: Life): string {
  return `${groupOf(life)}-${life.sex === 'M' ? 'm' : 'f'}-${tierOf(life)}-${ageBandOf(life)}-${life.seed % VARIANTS}`
}

/** 선택 태그. 지금은 남한 남성 청년 이상의 안경만 있고, 통계 미반영이라 시드로 절반 확률. 뒤에 국민건강영양조사 시력 교정률로 바꿀 자리 */
export function portraitTags(life: Life): string[] {
  const tags: string[] = []
  if (groupOf(life) === 'south' && life.sex === 'M' && ageBandOf(life) !== 'child' && ((life.seed >>> 3) & 1) === 1) tags.push('glasses')
  return tags
}

const FILES = new Set<string>((manifest as { files: string[] }).files)

/** 생성된 초상이 있으면 그 경로, 없으면 null */
export function portraitPath(life: Life): string | null {
  // 영유아기(7세 미만)에 죽은 삶에는 초상을 붙이지 않는다
  const d = life.death.value
  if (d && d.age < 7) return null
  const key = portraitKey(life)
  // 태그 붙은 파일이 있으면 그것, 없으면 태그 없는 파일로 떨어진다
  const tagged = portraitTags(life).map((t) => `${key}-${t}`)
  for (const k of [...tagged, key]) for (const ext of ['jpg', 'png']) if (FILES.has(`${k}.${ext}`)) return `portraits/${k}.${ext}`
  return null
}
