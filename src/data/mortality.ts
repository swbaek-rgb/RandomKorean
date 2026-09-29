import type { EraId } from '../engine/eras'
import type { Country, Sex, SocialClass } from '../engine/types'
import type { Rng } from '../engine/rng'

export interface HazardParams {
  imr: number // 0세 사망확률
  q1_4: number // 1~4세 연간
  q5_14: number
  adultA: number // 성인 배경 사망확률 (Makeham 상수)
  adultS: number // 노화 사망 기준값 (15세)
  adultB: number // 노화 지수 증가율
  maternal: number // 가임기 여성 연간 추가 위험
  sources: string[]
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * Math.min(1, Math.max(0, t))
}

/** 달력 연도 기준 사망 위험 파라미터 (코호트가 아닌 기간 생명표 개념) */
export function hazardParams(year: number, era: EraId, country: Country): HazardParams {
  if (era === 'paleo' || era === 'neo') return { imr: 0.25, q1_4: 0.06, q5_14: 0.012, adultA: 0.007, adultS: 0.0012, adultB: 0.075, maternal: 0.01, sources: ['paleo_demo'] }
  if (year < 1392) return { imr: 0.25, q1_4: 0.06, q5_14: 0.01, adultA: 0.007, adultS: 0.0012, adultB: 0.075, maternal: 0.009, sources: ['coale_demeny'] }
  if (year < 1897) return { imr: 0.22, q1_4: 0.055, q5_14: 0.009, adultA: 0.0055, adultS: 0.0011, adultB: 0.076, maternal: 0.008, sources: ['coale_demeny', 'hh_size'] }
  if (year < 1945) {
    const t = (year - 1897) / 48
    return { imr: lerp(0.2, 0.15, t), q1_4: lerp(0.04, 0.03, t), q5_14: 0.006, adultA: lerp(0.005, 0.004, t), adultS: 0.001, adultB: 0.078, maternal: 0.006, sources: ['chosen_sotokufu', 'coale_demeny'] }
  }
  if (country.north) {
    // 북한: 1990년까지 남한과 유사하게 개선, 이후 정체
    const t = (year - 1945) / 45
    if (year < 1990) return { imr: lerp(0.14, 0.03, t), q1_4: lerp(0.02, 0.003, t), q5_14: lerp(0.004, 0.0008, t), adultA: lerp(0.0025, 0.0008, t), adultS: lerp(0.0006, 0.00014, t), adultB: lerp(0.085, 0.1, t), maternal: lerp(0.004, 0.0005, t), sources: ['un_wpp'] }
    const u = (year - 1990) / 36
    return { imr: lerp(0.03, 0.012, u), q1_4: lerp(0.003, 0.001, u), q5_14: 0.0008, adultA: lerp(0.0008, 0.0006, u), adultS: lerp(0.00014, 0.00013, u), adultB: 0.1, maternal: 0.0005, sources: ['un_wpp'] }
  }
  // 남한: 1950 IMR 14% → 2023 0.25%
  const stops: [number, HazardParams][] = [
    [1945, { imr: 0.14, q1_4: 0.02, q5_14: 0.004, adultA: 0.0025, adultS: 0.0006, adultB: 0.085, maternal: 0.004, sources: ['kosis_lifetable'] }],
    [1970, { imr: 0.045, q1_4: 0.005, q5_14: 0.0015, adultA: 0.0012, adultS: 0.0003, adultB: 0.095, maternal: 0.001, sources: ['kosis_lifetable'] }],
    [1990, { imr: 0.012, q1_4: 0.001, q5_14: 0.0005, adultA: 0.0006, adultS: 0.00013, adultB: 0.1, maternal: 0.0002, sources: ['kosis_lifetable'] }],
    [2010, { imr: 0.0032, q1_4: 0.0003, q5_14: 0.0002, adultA: 0.0003, adultS: 0.00006, adultB: 0.105, maternal: 0.00005, sources: ['kosis_lifetable'] }],
    [2026, { imr: 0.0025, q1_4: 0.0002, q5_14: 0.0001, adultA: 0.00025, adultS: 0.000045, adultB: 0.107, maternal: 0.00003, sources: ['kosis_lifetable'] }],
  ]
  let prev = stops[0]
  for (const s of stops) {
    if (year <= s[0]) {
      const t = (year - prev[0]) / Math.max(1, s[0] - prev[0])
      const a = prev[1]
      const b = s[1]
      return { imr: lerp(a.imr, b.imr, t), q1_4: lerp(a.q1_4, b.q1_4, t), q5_14: lerp(a.q5_14, b.q5_14, t), adultA: lerp(a.adultA, b.adultA, t), adultS: lerp(a.adultS, b.adultS, t), adultB: lerp(a.adultB, b.adultB, t), maternal: lerp(a.maternal, b.maternal, t), sources: ['kosis_lifetable'] }
    }
    prev = s
  }
  return prev[1]
}

/** 해당 나이의 연간 사망확률 */
export function baseHazard(age: number, p: HazardParams, sex: Sex, modern: boolean): number {
  let q: number
  if (age === 0) q = p.imr
  else if (age < 5) q = p.q1_4
  else if (age < 15) q = p.q5_14
  else q = p.adultA + p.adultS * Math.exp(p.adultB * (age - 15))
  // 산모 사망은 출산 연동으로 별도 계산한다 (data/maternal.ts). 여기서는 더하지 않는다.
  // 현대 남성 초과사망 (생명표 성별 격차 약 6년)
  if (modern && age >= 15) q *= sex === 'M' ? 1.35 : 0.8
  return Math.min(0.95, q)
}

// ───────────────────── 역사 사건 ─────────────────────

export interface HistEvent {
  name: string
  from: number
  to: number
  /** 연간 추가 사망확률 */
  extra: number
  cause: string
  sources: string[]
  /** 국가·지역 필터 (부분 문자열) */
  country?: string
  region?: string[]
  /** 15~45세 남성 배수 (전쟁) */
  maleFighting?: number
  /** 하층 배수 (기근) */
  lowerClass?: number
  /** 이 계층 id 에는 사건 위험을 적용하지 않음 (예: 기근기에도 배급이 유지된 북한 핵심 계층) */
  spared?: string[]
}

export const EVENTS: HistEvent[] = [
  { name: '고구려·수 전쟁', from: 598, to: 614, extra: 0.006, cause: '전쟁', country: '고구려', maleFighting: 3, sources: ['history_db'] },
  { name: '삼국통일 전쟁', from: 660, to: 676, extra: 0.01, cause: '전쟁', maleFighting: 3, sources: ['history_db'] },
  { name: '후삼국 내전', from: 892, to: 936, extra: 0.005, cause: '전쟁', maleFighting: 2.5, sources: ['history_db'] },
  { name: '거란 침입', from: 993, to: 1019, extra: 0.004, cause: '전쟁', region: ['북계', '서해도', '개경'], maleFighting: 2, sources: ['history_db'] },
  { name: '몽골 침입', from: 1231, to: 1259, extra: 0.012, cause: '전쟁·학살·포로', maleFighting: 2, sources: ['history_db'] },
  { name: '홍건적·왜구 침입', from: 1359, to: 1389, extra: 0.006, cause: '전쟁·왜구 약탈', maleFighting: 2, sources: ['history_db'] },
  { name: '임진왜란', from: 1592, to: 1598, extra: 0.02, cause: '전쟁·기근·역병', maleFighting: 2, region: ['경상도', '전라도', '한성', '충청도', '경기도'], sources: ['sillok'] },
  { name: '병자호란', from: 1636, to: 1637, extra: 0.01, cause: '전쟁·포로', region: ['경기도', '평안도', '황해도', '한성'], sources: ['sillok'] },
  { name: '경신대기근', from: 1670, to: 1671, extra: 0.045, cause: '기근·전염병', lowerClass: 1.8, sources: ['sillok'] },
  { name: '을병대기근', from: 1695, to: 1699, extra: 0.02, cause: '기근·전염병', lowerClass: 1.8, sources: ['sillok'] },
  { name: '1749년 역병 대유행', from: 1749, to: 1750, extra: 0.02, cause: '역병', sources: ['sillok'] },
  { name: '1821년 콜레라', from: 1821, to: 1822, extra: 0.015, cause: '콜레라 (괴질)', sources: ['sillok'] },
  { name: '1859년 콜레라', from: 1859, to: 1860, extra: 0.01, cause: '콜레라', sources: ['sillok'] },
  { name: '1886년 콜레라', from: 1886, to: 1886, extra: 0.008, cause: '콜레라', sources: ['sillok'] },
  { name: '동학농민운동·청일전쟁', from: 1894, to: 1895, extra: 0.004, cause: '전투·처형', region: ['전라도', '충청도', '평안도'], maleFighting: 3, sources: ['encykorea'] },
  { name: '의병 전쟁', from: 1907, to: 1910, extra: 0.002, cause: '일본군 토벌', maleFighting: 3, sources: ['encykorea'] },
  { name: '스페인 독감', from: 1918, to: 1919, extra: 0.008, cause: '독감 (무오년 독감)', sources: ['chosen_sotokufu'] },
  { name: '1946년 콜레라', from: 1946, to: 1946, extra: 0.003, cause: '콜레라', sources: ['kosis_death'] },
  { name: '제주 4·3', from: 1948, to: 1949, extra: 0.03, cause: '토벌·학살', region: ['제주'], sources: ['korea_war'] },
  { name: '한국전쟁', from: 1950, to: 1953, extra: 0.012, cause: '전쟁·폭격·학살', maleFighting: 3, sources: ['korea_war'] },
  { name: '베트남전 파병', from: 1965, to: 1973, extra: 0.0004, cause: '베트남전 전사', country: '대한민국', maleFighting: 8, sources: ['korea_war'] },
  { name: '고난의 행군', from: 1994, to: 1998, extra: 0.009, cause: '기근·영양실조', country: '북한', lowerClass: 1.8, spared: ['core'], sources: ['nk_famine'] },
  { name: '코로나19', from: 2020, to: 2022, extra: 0.0002, cause: '코로나19', sources: ['kosis_death'] },
]

export function eventsAt(year: number, country: Country): HistEvent[] {
  return EVENTS.filter((e) => {
    if (year < e.from || year > e.to) return false
    if (e.country && !country.name.includes(e.country)) return false
    if (e.region && !e.region.some((r) => country.region.includes(r))) return false
    return true
  })
}

export function eventHazard(e: HistEvent, age: number, sex: Sex, cls: SocialClass): number {
  if (e.spared?.includes(cls.id)) return 0
  let h = e.extra
  if (e.maleFighting && sex === 'M' && age >= 15 && age <= 45) h *= e.maleFighting
  if (e.lowerClass) h *= cls.hazard > 1 ? e.lowerClass : cls.hazard < 0.9 ? 0.4 : 1
  return h
}

// ───────────────────── 사망 원인 ─────────────────────

export function pickCause(rng: Rng, age: number, year: number, era: EraId, country: Country, sex: Sex, cls?: SocialClass): { cause: string; sources: string[] } {
  const prehistoric = era === 'paleo' || era === 'neo'
  const modern = year >= 1960 && !country.north
  const modernNorth = year >= 1960 && !!country.north
  const f = sex === 'F'
  if (prehistoric) {
    if (age < 1) return { cause: rng.pick(['신생아 감염', '출산 중 사망', '영양 부족', '추위']), sources: ['paleo_demo'] }
    if (age < 15) return { cause: rng.pick(['감염병', '설사병', '굶주림 (겨울)', '사고 (익사·추락)', '맹수 습격']), sources: ['paleo_demo'] }
    if (age < 45) return { cause: rng.pick(f ? ['감염된 상처', '감염병', '굶주림', '무리 간 충돌'] : ['사냥 중 부상', '감염된 상처', '맹수 습격', '무리 간 충돌', '감염병', '익사']), sources: ['paleo_demo'] }
    return { cause: rng.pick(['감염병', '굶주림 (겨울)', '노쇠', '치아 마모·소화 장애', '감염된 상처']), sources: ['paleo_demo'] }
  }
  if (modern) {
    if (age < 1) return { cause: rng.pick(['조산·저체중', '선천 기형', '신생아 호흡곤란', year < 1980 ? '폐렴·설사병' : '영아돌연사증후군']), sources: ['kosis_death'] }
    if (age < 15) return { cause: rng.pick(year < 1980 ? ['폐렴', '홍역', '설사병', '익사', '교통사고'] : ['교통사고', '백혈병', '익사', '선천 질환', '추락']), sources: ['kosis_death'] }
    if (age < 45) return { cause: rng.weighted([{ v: '자살', w: year > 2000 ? 40 : 12 }, { v: '교통사고', w: year < 2000 ? 35 : 15 }, { v: '암', w: 18 }, { v: '심장질환', w: 6 }, { v: year < 1990 ? '결핵' : '뇌혈관질환', w: 6 }, { v: '산업재해', w: sex === 'M' ? 8 : 1 }, { v: '간질환', w: sex === 'M' ? 6 : 1 }]), sources: ['kosis_death'] }
    if (age < 65) return { cause: rng.weighted([{ v: '암 (간암·위암·폐암)', w: 40 }, { v: '심장질환', w: 12 }, { v: '뇌혈관질환', w: 12 }, { v: '간질환', w: sex === 'M' ? 10 : 3 }, { v: '자살', w: 12 }, { v: '교통사고', w: 6 }, { v: '당뇨병', w: 4 }]), sources: ['kosis_death'] }
    return { cause: rng.weighted([{ v: '암', w: 30 }, { v: '심장질환', w: 15 }, { v: '폐렴', w: 12 }, { v: '뇌혈관질환', w: 12 }, { v: '알츠하이머·치매', w: age > 80 ? 12 : 3 }, { v: '당뇨병', w: 4 }, { v: '노환', w: age > 88 ? 15 : 2 }, { v: '고혈압성 질환', w: 3 }]), sources: ['kosis_death'] }
  }
  if (modernNorth) {
    // 핵심 계층은 배급이 유지돼 영양실조 사망을 두지 않는다
    const core = cls?.id === 'core'
    if (age < 1) return { cause: rng.pick(core ? ['폐렴', '설사병', '조산', '선천 기형'] : ['폐렴', '설사병', '조산', '영양실조']), sources: ['un_wpp'] }
    if (age < 15) return { cause: rng.pick(core ? ['폐렴', '설사병', '결핵', '사고', '백혈병'] : ['폐렴', '설사병', '영양실조', '결핵', '사고']), sources: ['un_wpp'] }
    if (age < 45) return { cause: rng.pick(['결핵', '사고 (탄광·군)', '간질환', '심장질환', '폐렴', f ? '결핵' : '군 복무 중 사고']), sources: ['un_wpp'] }
    return { cause: rng.pick(['뇌졸중', '심장질환', '암 (위암·간암)', '결핵', '폐렴', '만성 폐질환']), sources: ['un_wpp'] }
  }
  // 전근대 · 근대
  const src = year < 1897 ? ['coale_demeny', 'sillok'] : ['chosen_sotokufu']
  if (age < 1) return { cause: rng.pick(['신생아 감염 (배꼽 파상풍)', '설사병', '폐렴', '출산 중 사망', '영양 부족', year > 1800 ? '천연두 (마마)' : '경기 (경풍)']), sources: src }
  if (age < 15) return { cause: rng.weighted([{ v: '천연두 (마마)', w: 25 }, { v: '홍역', w: 20 }, { v: '이질·설사병', w: 20 }, { v: '폐렴', w: 10 }, { v: '익사', w: 5 }, { v: '장티푸스 (염병)', w: 8 }, { v: '기근', w: 7 }, { v: '화상·낙상', w: 5 }]), sources: src }
  if (age < 45) return { cause: rng.weighted([{ v: '결핵 (노채)', w: 18 }, { v: '장티푸스 (염병)', w: 15 }, { v: '이질', w: 8 }, { v: '사고 (낙마·익사·화재)', w: f ? 4 : 10 }, { v: '폭력·형벌', w: f ? 1 : 5 }, { v: '역병', w: 10 }, { v: '학질 (말라리아)', w: 6 }, { v: '기근', w: 5 }]), sources: src }
  if (age < 65) return { cause: rng.weighted([{ v: '중풍 (뇌졸중)', w: 20 }, { v: '결핵', w: 15 }, { v: '위장병 (체증·적취)', w: 15 }, { v: '폐렴', w: 12 }, { v: '역병', w: 12 }, { v: '장티푸스', w: 8 }, { v: '학질', w: 5 }, { v: '기근', w: 5 }, { v: '종기 (등창)', w: 8 }]), sources: src }
  return { cause: rng.weighted([{ v: '노환', w: 40 }, { v: '중풍 (뇌졸중)', w: 20 }, { v: '폐렴', w: 15 }, { v: '위장병', w: 10 }, { v: '역병', w: 8 }, { v: '추위 (겨울)', w: 7 }]), sources: src }
}
