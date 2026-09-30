import { Rng } from './rng'
import { CURRENT_YEAR, ERAS, FIRST_YEAR, eraOf, type Era } from './eras'
import { birthWeightedYear, birthsInYear, eraBirthShare, tfr } from './demography'
import type { Country, Death, Family, Life, Mode, Sex, SocialClass } from './types'
import { pickCountry, pickClass, pickOccupation, pickStaple } from '../data/tables'
import { pickName } from '../data/names'
import { baseHazard, eventHazard, eventsAt, hazardParams, pickCause } from '../data/mortality'
import { divorceHazard, meanFirstMarriageAge, neverMarriedRate, remarriageProb } from '../data/marriage'
import { birthProbability, maternalMortalityPerBirth } from '../data/maternal'
import { isPrehistoric, prehistoricChildRole } from '../data/prehistoric'

const shareCache = new Map<string, number>()

/** 확률을 읽기 좋은 문자열로 */
export function pct(p: number): string {
  if (p >= 0.1) return `${Math.round(p * 100)}%`
  if (p >= 0.01) return `${(p * 100).toFixed(1)}%`
  if (p >= 0.0001) return `${(p * 100).toFixed(2)}%`
  return `${Math.max(1, Math.round(p * 1e6)) / 1e4}%`
}

let totalBirthsCache: number | null = null
function totalBirths(): number {
  if (totalBirthsCache === null) {
    let t = 0
    for (let y = FIRST_YEAR; y <= CURRENT_YEAR; y++) t += birthsInYear(y)
    totalBirthsCache = t
  }
  return totalBirthsCache
}

/** 출생 시점 기준, 해당 나이까지 살아 있을 확률 (사건·산모 사망 제외) */
function survivalTo(age: number, birthYear: number, country: Country, cls: SocialClass, sex: Sex): number {
  let s = 1
  for (let a = 0; a < age; a++) {
    const year = birthYear + a
    if (year > CURRENT_YEAR) break
    const p = hazardParams(year, eraOf(year).id, country)
    s *= 1 - Math.min(0.95, baseHazard(a, p, sex, year >= 1960) * cls.hazard)
  }
  return s
}

function poissonPmf(k: number, lambda: number): number {
  let p = Math.exp(-lambda)
  for (let i = 1; i <= k; i++) p *= lambda / i
  return p
}
function eraShare(era: Era): number {
  let v = shareCache.get(era.id)
  if (v === undefined) {
    v = eraBirthShare(era.start, era.end)
    shareCache.set(era.id, v)
  }
  return v
}

function pickBirthYear(rng: Rng, mode: Mode): number {
  if (mode === 'weighted') return birthWeightedYear(rng.next())
  const era = rng.pick(ERAS)
  return rng.int(era.start, era.end - 1)
}

interface MarriagePlan {
  everMarries: boolean
  mAge: number
}

interface SimResult {
  death: Death | null
  deathSources: string[]
  /** 여성이면 시뮬레이션된 출산 횟수 */
  births: number
}

function simulateLife(rng: Rng, birthYear: number, country: Country, cls: SocialClass, sex: Sex, plan: MarriagePlan): SimResult {
  const sources = new Set<string>()
  const north = !!country.north
  let births = 0
  for (let age = 0; age <= 110; age++) {
    const year = birthYear + age
    if (year > CURRENT_YEAR) break
    const era = eraOf(year)
    const p = hazardParams(year, era.id, country)
    p.sources.forEach((s) => sources.add(s))
    const modern = year >= 1960
    // 출산과 산모 사망: 혼인한 여성이 그 해 출산할 확률 × 출산당 사망률
    if (sex === 'F' && plan.everMarries && age >= plan.mAge && age < 50) {
      const pBirth = birthProbability(age, tfr(year, north), meanFirstMarriageAge(year, 'F', north))
      if (rng.chance(pBirth)) {
        births++
        const mmr = maternalMortalityPerBirth(year, era.id, cls, north)
        if (rng.chance(mmr)) {
          const src = year < 1897 ? 'maternal_kr' : north ? 'un_wpp' : 'kosis_death'
          sources.add(src)
          const cause = year < 1897 ? rng.pick(['출산 중 사망 (난산)', '산후병 (산욕열)', '산후 출혈']) : rng.pick(['출산 합병증', '산욕열', '산후 출혈'])
          return { death: { age, year, cause, maternal: true }, deathSources: [...sources], births }
        }
      }
    }
    let q = baseHazard(age, p, sex, modern) * cls.hazard
    const evs = eventsAt(year, country)
    const evH = evs.map((e) => eventHazard(e, age, sex, cls))
    const evTotal = evH.reduce((a, b) => a + b, 0)
    const total = Math.min(0.97, q + evTotal)
    if (age === 110 || rng.chance(total)) {
      if (evTotal > 0 && rng.chance(evTotal / total)) {
        const e = evs[rng.weightedIndex(evH)]
        e.sources.forEach((s) => sources.add(s))
        return { death: { age, year, cause: e.cause, event: e.name }, deathSources: [...sources], births }
      }
      const c = age === 110 ? { cause: '노환', sources: [] as string[] } : pickCause(rng, age, year, era.id, country, sex, cls)
      c.sources.forEach((s) => sources.add(s))
      return { death: { age, year, cause: c.cause }, deathSources: [...sources], births }
    }
  }
  return { death: null, deathSources: [...sources], births }
}

/** 출생 시점 조건으로 15세까지 생존 확률 */
function survivalTo15(birthYear: number, country: Country, sex: Sex): { s1: number; s15: number } {
  let s = 1
  let s1 = 1
  for (let age = 0; age < 15; age++) {
    const year = birthYear + age
    const p = hazardParams(year, eraOf(year).id, country)
    s *= 1 - baseHazard(age, p, sex, year >= 1960)
    if (age === 0) s1 = s
  }
  return { s1, s15: s }
}

const ELITE = new Set(['chief', 'jingol', '6dupum', '45dupum', 'noble', 'munbeol', 'yangban', 'goguryeo_elite', 'han_official', 'hyangri', 'minor_official', 'jungin', 'landlord', 'intelligentsia'])

/** 개인 초혼 나이: 혼인 시점 연도의 평균 초혼연령을 고정점 반복으로 찾고 ±3년 편차를 준다 */
function sampleMarriageAge(rng: Rng, birthYear: number, sex: Sex, north: boolean): number {
  let age = meanFirstMarriageAge(birthYear + 25, sex, north)
  for (let i = 0; i < 3; i++) age = meanFirstMarriageAge(birthYear + age, sex, north)
  const spread = rng.int(-3, 3) + rng.int(-2, 3) // 삼각 분포, 표준편차 약 2.5년
  return Math.max(14, Math.round(age + spread))
}

/** 배우자가 먼저 죽는지 연 단위로 굴린다. 반환: 배우자 사망 시 본인 나이 */
function spouseDeathAge(rng: Rng, birthYear: number, marriedAt: number, ownSex: Sex, country: Country, cls: SocialClass, until: number): number | null {
  const spouseSex: Sex = ownSex === 'M' ? 'F' : 'M'
  const spouseAgeAtMarriage = Math.round(meanFirstMarriageAge(birthYear + marriedAt, spouseSex, !!country.north))
  for (let a = marriedAt; a < until; a++) {
    const year = birthYear + a
    const spouseAge = spouseAgeAtMarriage + (a - marriedAt)
    const p = hazardParams(year, eraOf(year).id, country)
    const q = baseHazard(spouseAge, p, spouseSex, year >= 1960) * cls.hazard
    if (rng.chance(Math.min(0.95, q))) return a
  }
  return null
}

function buildFamily(rng: Rng, birthYear: number, country: Country, cls: SocialClass, sex: Sex, death: Death | null, fatherJob: string, plan: MarriagePlan, simulatedBirths: number): Family {
  const north = !!country.north
  const elite = ELITE.has(cls.id)
  const f0 = tfr(birthYear, north)
  const siblingsBorn = rng.poisson(Math.max(0, f0 - 1) * (f0 > 3 ? 1.05 : 1))
  const { s15 } = survivalTo15(birthYear, country, sex)
  let siblingsSurvived = 0
  for (let i = 0; i < siblingsBorn; i++) if (rng.chance(s15)) siblingsSurvived++
  const birthOrder = rng.int(1, siblingsBorn + 1)
  const ageReached = death ? death.age : CURRENT_YEAR - birthYear

  // 혼인 여부와 초혼 나이는 사망 시뮬레이션 전에 정해졌다 (산모 사망 계산에 필요)
  const { everMarries, mAge } = plan
  const married = everMarries && ageReached >= mAge
  let childrenBorn = 0
  let childrenSurvived = 0
  let marriedAt: number | undefined
  let divorcedAt: number | undefined
  let widowedAt: number | undefined
  let remarried = false
  if (married) {
    marriedAt = mAge
    // 이혼: 혼인 기간 매년 조이혼율 환산 위험을 굴린다 (최대 45년)
    const until = Math.min(ageReached, marriedAt + 45)
    for (let a = marriedAt; a < until; a++) {
      if (rng.chance(divorceHazard(birthYear + a, north, elite))) {
        divorcedAt = a
        break
      }
    }
    // 사별: 이혼 전까지 배우자가 먼저 죽는지
    const w = spouseDeathAge(rng, birthYear, marriedAt, sex, country, cls, divorcedAt ?? until)
    if (w !== null) widowedAt = w
    const endedAt = divorcedAt ?? widowedAt
    if (endedAt !== undefined && ageReached - endedAt >= 2) {
      remarried = rng.chance(remarriageProb(birthYear + endedAt, sex, endedAt, elite, widowedAt !== undefined))
    }
    // 자녀: 첫 혼인 기간(재혼이면 연장) 안에서 출산
    const unionEnd = remarried ? Math.min(ageReached, marriedAt + 25) : Math.min(endedAt ?? ageReached, marriedAt + 25)
    const fertileYears = Math.max(0, unionEnd - marriedAt)
    const f1 = tfr(birthYear + marriedAt, north)
    // 여성은 사망 시뮬레이션에서 연도별로 출산을 굴렸으므로 그 값을 쓴다. 남성은 배우자 기준 근사
    childrenBorn = sex === 'F' ? Math.min(simulatedBirths, 12) : Math.min(rng.poisson(f1 * Math.min(1, fertileYears / 12 + 0.3)), Math.floor(fertileYears / 2) + (fertileYears > 0 ? 1 : 0), 12)
    const cs = survivalTo15(birthYear + marriedAt + 2, country, 'M').s15
    for (let i = 0; i < childrenBorn; i++) if (rng.chance(cs * (cls.hazard < 0.9 ? 1.05 : 1))) childrenSurvived++
    childrenSurvived = Math.min(childrenSurvived, childrenBorn)
  }
  return { fatherJob, siblingsBorn, siblingsSurvived, birthOrder, married, marriedAt, divorcedAt, widowedAt, remarried, childrenBorn, childrenSurvived }
}

export function generateLife(seed: number, mode: Mode, fixedYear?: number): Life {
  const rng = new Rng(seed)
  const birthYear = fixedYear === undefined ? pickBirthYear(rng, mode) : Math.max(FIRST_YEAR, Math.min(CURRENT_YEAR, Math.round(fixedYear)))
  const era = eraOf(birthYear)
  const sex: Sex = rng.chance(0.512) ? 'M' : 'F'
  const { country, sources: cSrc, note: cNote, prob: cProb } = pickCountry(rng, era.id, birthYear)
  const { cls, sources: clsSrc, note: clsNote, prob: clsProb } = pickClass(rng, era.id, birthYear, country)
  const name = pickName(rng, era.id, birthYear, country, cls, sex)
  const plan: MarriagePlan = {
    everMarries: !rng.chance(neverMarriedRate(birthYear + 45, sex, !!country.north)),
    mAge: sampleMarriageAge(rng, birthYear, sex, !!country.north),
  }
  const sim = simulateLife(rng, birthYear, country, cls, sex, plan)
  const ageReached = sim.death ? sim.death.age : CURRENT_YEAR - birthYear
  const father = pickOccupation(rng, era.id, birthYear - 30 < era.start ? era.start : birthYear - 30, country, cls, 'M', 30)
  const family = buildFamily(rng, birthYear, country, cls, sex, sim.death, father.job, plan, sim.births)

  let occupation: { job: string; sources: string[]; prob?: number }
  const modernSouth = birthYear >= 1945 && !country.north
  const alive = !sim.death
  if (ageReached < 7) occupation = alive ? { job: '영유아', sources: [] } : { job: '없음 (영유아기에 사망)', sources: [] }
  else if (ageReached < 15) {
    const young = birthYear >= 1945 ? '학생' : isPrehistoric(era.id) ? prehistoricChildRole(rng, era.id, sex, cls) : '집안 농사·심부름 거들기'
    occupation = alive ? { job: young, sources: birthYear >= 1945 ? ['kosis_jobs'] : [] } : { job: `${young} (어린 나이에 사망)`, sources: [] }
  } else if (alive && ageReached < (modernSouth ? 20 : 15)) occupation = { job: '학생', sources: ['kosis_jobs'] }
  else occupation = pickOccupation(rng, era.id, birthYear, country, cls, sex, ageReached)
  if (!sim.death && modernSouth && ageReached >= 20 && ageReached < 26 && rng.chance(0.6)) occupation = { job: `대학생 (졸업 후 ${occupation.job} 지망)`, sources: ['kosis_jobs'] }
  // 은퇴: 고용 관계가 있는 직업만. 주부·농어민·상인·성직·자유업은 은퇴 개념이 없어 그대로 둔다.
  // 남한 66세(실질 은퇴 연령), 북한은 법정 정년 남 60·여 55
  const NO_RETIRE = /주부|안주인|가사|농업|농민|농사|소작|자작|협동농장|머슴|어민|해녀|상인|행상|무당|승려|목사|프리랜서|유튜버|지주|가내 노동|식모/
  const retireAge = country.north ? (sex === 'M' ? 60 : 55) : 66
  if (!sim.death && ageReached >= retireAge && birthYear >= 1897 && !NO_RETIRE.test(occupation.job)) occupation = { job: `은퇴 · 전직 ${occupation.job}`, sources: occupation.sources }

  const staple = pickStaple(rng, era.id, birthYear, country, cls)
  const { s1, s15 } = survivalTo15(birthYear, country, sex)
  const mortalityNote = `이 시기 태어난 아이 100명 중 ${Math.round((1 - s1) * 100)}명은 첫돌 전에, ${Math.round((1 - s15) * 100)}명은 15세 전에 죽었습니다.`

  // 확률 각주
  const span = era.end - era.start
  const yearOdds = fixedYear !== undefined ? undefined : mode === 'uniform' ? `시대 ${ERAS.length}분의 1 × 그 안의 ${span.toLocaleString()}년 중 1년 = ${pct(1 / ERAS.length / span)}` : `전체 출생 중 이 해 ${pct(birthsInYear(birthYear) / totalBirths())}, 이 시대 ${pct(eraShare(era))}`
  const nameOdds = `${sex === 'M' ? '남자' : '여자'} ${pct(sex === 'M' ? 0.512 : 0.488)} · 이 이름 ${pct(name.prob)}`
  const regionOdds = cProb !== undefined ? `이 지역 ${pct(cProb)}` : undefined
  const classOdds = `이 계층 ${pct(clsProb)}`
  const jobOdds = occupation.sources.length > 0 && ageReached >= 15 ? `같은 시대·계급·성별 중 ${pct(occupation.prob ?? 1)}` : undefined
  const sibLambda = Math.max(0, tfr(birthYear, !!country.north) - 1) * (tfr(birthYear, !!country.north) > 3 ? 1.05 : 1)
  const familyOdds = `형제 ${family.siblingsBorn}명 ${pct(poissonPmf(family.siblingsBorn, sibLambda))} · 생애 혼인 ${pct(1 - neverMarriedRate(birthYear + 45, sex, !!country.north))}`
  const sAge = survivalTo(ageReached, birthYear, country, cls, sex)
  const sNext = survivalTo(ageReached + 1, birthYear, country, cls, sex)
  const who = `같은 해 태어난 ${sex === 'M' ? '남자' : '여자'}`
  const deathOdds = !sim.death
    ? `이 나이까지 살아 있을 확률 ${pct(sAge)}`
    : ageReached === 0
      ? `${who} 중 ${pct(sAge - sNext)}가 첫돌 전에 사망`
      : `${who} 중 ${pct(1 - sAge)}가 이 나이 전에, ${pct(sAge - sNext)}가 ${ageReached}세에 사망`

  return {
    seed,
    mode,
    fixedYear,
    birthYear,
    eraId: era.id,
    eraName: era.name,
    sex,
    name: { value: name.name, sources: name.sources, note: name.note, odds: nameOdds },
    country: { value: country, sources: cSrc, note: cNote, odds: regionOdds },
    socialClass: { value: cls, sources: clsSrc, note: clsNote, odds: classOdds },
    occupation: { value: occupation.job, sources: occupation.sources, odds: jobOdds },
    staple: { value: staple.food, sources: staple.sources, note: staple.note },
    family: { value: family, sources: birthYear >= 1925 ? ['kosis_marriage', 'kosis_pop', ...(country.north ? ['un_wpp'] : [])] : ['hh_size', 'coale_demeny'], odds: familyOdds },
    death: { value: sim.death, sources: sim.deathSources, odds: deathOdds },
    currentAge: sim.death ? null : CURRENT_YEAR - birthYear,
    eraShare: eraShare(era),
    yearOdds,
    mortalityNote,
  }
}
