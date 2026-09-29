// 선사 시대(후기 구석기·신석기·청동기) 계급과 역할.
// 성별 비율은 Murdock & Provost(1973)의 185개 사회 분업 조사, 나이 규칙은 Gurven & Kaplan(2007)의 수렵채집 인구학,
// 역할 목록은 국립중앙박물관·국립문화재연구원의 유적 해석을 바탕으로 한 추정이다.
import type { EraId } from '../engine/eras'
import type { Sex, SocialClass } from '../engine/types'
import type { Rng } from '../engine/rng'

const C = (id: string, name: string, desc: string, hazard: number, literate = false): SocialClass => ({ id, name, desc, hazard, surname: false, literate })

export const PREHISTORIC_CLASSES: Record<'paleo' | 'neo' | 'bronze', { v: SocialClass; w: number }[]> = {
  paleo: [
    { v: C('band', '무리 구성원', '20~30명 규모 이동 수렵채집 무리. 뚜렷한 계급 없음.', 1), w: 90 },
    { v: C('band_hunter', '이름난 사냥꾼 가계', '큰 짐승 사냥으로 무리를 먹여 존경받는 집안. 세습은 아님.', 0.95), w: 5 },
    { v: C('band_shaman', '주술사 가계', '장례와 사냥 의례를 맡는 집안.', 0.95), w: 3 },
    { v: C('band_elder', '무리 연장자 가계', '이동 경로와 분쟁을 결정하는 연장자 집안.', 0.95), w: 2 },
  ],
  neo: [
    { v: C('village', '촌락 구성원', '움집 10여 채 규모 정착 촌락. 평등 사회.', 1), w: 85 },
    { v: C('village_chief', '촌락장 가계', '큰 움집과 많은 토기를 가진 집안. 계급 분화 초기.', 0.95), w: 5 },
    { v: C('village_trader', '흑요석·옥 교역 가계', '백두산 흑요석과 옥 장신구를 먼 촌락과 바꾸는 집안.', 0.95), w: 4 },
    { v: C('village_shaman', '주술사 가계', '제의와 치병을 맡는 집안.', 0.95), w: 3 },
    { v: C('village_artisan', '토기·석기 장인 가계', '빗살무늬토기와 간석기를 만드는 솜씨로 알려진 집안.', 1), w: 3 },
  ],
  bronze: [
    { v: C('chief', '군장·지배 가계', '고인돌을 세울 수 있는 족장 집안. 비파형동검 소유.', 0.85, true), w: 2 },
    { v: C('priest', '제사장 가계', '청동 방울과 거울로 하늘에 제사 지내는 집안.', 0.85, true), w: 1 },
    { v: C('warrior', '전사 계층', '군장을 따르는 무장 계층.', 0.95), w: 7 },
    { v: C('artisan', '장인 가계', '청동기 주조·옥 가공을 맡는 집안.', 0.95), w: 3 },
    { v: C('commoner', '일반 부족민', '벼·조 농경과 어로. 고인돌 축조 노역 동원.', 1), w: 75 },
    { v: C('bond', '예속민', '전쟁 포로나 빚으로 예속. 8조법에 노비 규정 존재.', 1.2), w: 12 },
  ],
}

interface Role {
  name: string
  w: number
  /** 남성 비율 (0~1). 여성은 1-male */
  male: number
  minAge?: number
  maxAge?: number
  /** 계급 id → 가중치 배수 */
  boost?: Record<string, number>
  /** 계급 제한 (청동기) */
  only?: string[]
  /** 말년 역할이면 true: 기준 나이를 넘긴 사람에게 덧붙는다 */
  late?: boolean
}

const PALEO: Role[] = [
  { name: '큰 짐승 사냥꾼 (사슴·멧돼지·들소)', w: 22, male: 0.9, maxAge: 45, boost: { band_hunter: 3 } },
  { name: '덫·소형 동물 사냥과 채집', w: 20, male: 0.4 },
  { name: '채집인 (도토리·뿌리·열매)', w: 20, male: 0.2 },
  { name: '어로 (민물고기·조개)', w: 10, male: 0.55 },
  { name: '석기 장인 (슴베찌르개·돌날)', w: 8, male: 0.7 },
  { name: '가죽 무두질·옷 만들기', w: 8, male: 0.15 },
  { name: '불 지킴이·움막 관리', w: 5, male: 0.3 },
  { name: '주술사 (장례·사냥 의례)', w: 2, male: 0.4, minAge: 25, boost: { band_shaman: 10 } },
  { name: '이야기꾼·전승자', w: 2, male: 0.5, minAge: 40, late: true },
  { name: '무리의 이동 길잡이·연장자', w: 3, male: 0.6, minAge: 45, boost: { band_elder: 10 }, late: true },
]
const NEO: Role[] = [
  { name: '조·기장 밭 농경', w: 25, male: 0.45 },
  { name: '어로 (작살·낚시·그물)', w: 15, male: 0.75 },
  { name: '조개잡이·갯일', w: 10, male: 0.25 },
  { name: '사냥 (활, 개 사육)', w: 10, male: 0.85, maxAge: 45 },
  { name: '채집 (도토리·산나물)', w: 10, male: 0.2 },
  { name: '빗살무늬토기 장인', w: 8, male: 0.3, boost: { village_artisan: 5 } },
  { name: '간석기·옥 장신구 장인', w: 6, male: 0.7, boost: { village_artisan: 5 } },
  { name: '가락바퀴 실잣기·직조', w: 6, male: 0.1 },
  { name: '흑요석·옥 교역자', w: 3, male: 0.7, minAge: 20, boost: { village_trader: 8 } },
  { name: '주술사·제의 담당', w: 3, male: 0.35, minAge: 25, boost: { village_shaman: 10 } },
  { name: '촌락장', w: 2, male: 0.7, minAge: 40, boost: { village_chief: 10 }, late: true },
  { name: '연장자·중재자', w: 2, male: 0.5, minAge: 50, late: true },
]
const BRONZE: Role[] = [
  { name: '군장', w: 40, male: 0.95, minAge: 30, only: ['chief'] },
  { name: '군장 가문의 일원 (제의 보조·혼인 동맹)', w: 60, male: 0.4, only: ['chief'] },
  { name: '제사장 (청동 방울·거울)', w: 70, male: 0.5, minAge: 25, only: ['priest'] },
  { name: '제의 보조', w: 30, male: 0.4, only: ['priest'] },
  { name: '전사', w: 80, male: 0.95, maxAge: 45, only: ['warrior'] },
  { name: '전사 가문의 농경·직조', w: 20, male: 0.1, only: ['warrior'] },
  { name: '청동기 주조 장인', w: 40, male: 0.85, minAge: 20, only: ['artisan'] },
  { name: '옥·석기 장인', w: 30, male: 0.6, only: ['artisan'] },
  { name: '토기 장인', w: 30, male: 0.3, only: ['artisan'] },
  { name: '벼농사 농민', w: 40, male: 0.5, only: ['commoner'] },
  { name: '밭농사 (조·콩·보리)', w: 25, male: 0.45, only: ['commoner'] },
  { name: '어로', w: 15, male: 0.7, only: ['commoner'] },
  { name: '직조·가사', w: 10, male: 0.05, only: ['commoner'] },
  { name: '사냥', w: 5, male: 0.85, maxAge: 45, only: ['commoner'] },
  { name: '고인돌 축조 노역 (부역)', w: 5, male: 0.8, maxAge: 45, only: ['commoner'] },
  { name: '농경 노역', w: 60, male: 0.6, only: ['bond'] },
  { name: '가내 노동', w: 30, male: 0.2, only: ['bond'] },
  { name: '청동 공방 잡역', w: 10, male: 0.7, only: ['bond'] },
]
const BRONZE_LATE: Record<string, string> = { commoner: '마을 연장자', warrior: '군장의 참모', chief: '원로 군장', artisan: '공방의 우두머리' }

const ROLES: Record<'paleo' | 'neo' | 'bronze', Role[]> = { paleo: PALEO, neo: NEO, bronze: BRONZE }

function weight(r: Role, cls: SocialClass, sex: Sex, ageReached: number): number {
  if (r.only && !r.only.includes(cls.id)) return 0
  if (r.minAge !== undefined && ageReached < r.minAge) return 0
  let w = r.w * (sex === 'M' ? r.male : 1 - r.male)
  if (r.boost?.[cls.id]) w *= r.boost[cls.id]
  return w
}

export function isPrehistoric(era: EraId): era is 'paleo' | 'neo' | 'bronze' {
  return era === 'paleo' || era === 'neo' || era === 'bronze'
}

/** 7~14세 아이 역할 */
export function prehistoricChildRole(rng: Rng, era: 'paleo' | 'neo' | 'bronze', sex: Sex, cls: SocialClass): string {
  if (era === 'bronze' && cls.id === 'bond') return '어린 예속민 (10세부터 노역)'
  if (era === 'paleo') return sex === 'M' && rng.chance(0.7) ? '사냥 따라다니기와 채집 돕기' : '채집 돕기·땔감 모으기'
  if (era === 'neo') return sex === 'F' && rng.chance(0.6) ? '땔감·물 긷기와 조개 줍기' : '조개 줍기·밭의 새 쫓기'
  return sex === 'F' && rng.chance(0.6) ? '물 긷기·동생 돌보기' : '밭의 새 쫓기·땔감 모으기'
}

/**
 * 성인 역할. 젊은 시절 역할을 뽑고, 말년 역할 기준 나이를 넘겼으면 50% 확률로 덧붙인다.
 * 예속민은 10세부터 노역이므로 minAdult 가 낮다.
 */
export function prehistoricOccupation(rng: Rng, era: 'paleo' | 'neo' | 'bronze', cls: SocialClass, sex: Sex, ageReached: number): string {
  const roles = ROLES[era]
  // 젊은 시절 역할: 말년 전용 역할과 maxAge 이전 역할 중에서
  const young = roles.filter((r) => !r.late)
  const youngW = young.map((r) => weight(r, cls, sex, ageReached))
  const main = youngW.some((w) => w > 0) ? young[rng.weightedIndex(youngW)] : young[0]
  let label = main.name
  // 말년 역할
  const late = roles.filter((r) => r.late).map((r) => ({ r, w: weight(r, cls, sex, ageReached) })).filter((x) => x.w > 0)
  if (era === 'bronze') {
    const l = BRONZE_LATE[cls.id]
    if (l && ageReached >= 45 && rng.chance(0.5)) label = `${label}, 45세 이후 ${l}`
  } else if (late.length > 0 && rng.chance(0.5)) {
    const pick = late[rng.weightedIndex(late.map((x) => x.w))].r
    label = `${label}, ${pick.minAge}세 이후 ${pick.name}`
  }
  return label
}
