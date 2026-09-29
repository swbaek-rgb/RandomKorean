import { generateLife } from './src/engine/generate'
type B = Record<string, number>
const eras = ['paleo', 'neo', 'bronze'] as const
const res: Record<string, { n: number; m: number; f: number; br: B; brM: B; brF: B; mat: number; fAdult: number; sumAge: number; s15: number; s45: number; s60: number }> = {}
const bracket = (a: number) => a < 1 ? '0세' : a < 5 ? '1~4세' : a < 15 ? '5~14세' : a < 30 ? '15~29세' : a < 45 ? '30~44세' : a < 60 ? '45~59세' : '60세 이상'
for (let s = 1; s < 150000; s++) {
  const l = generateLife(s, 'uniform')
  if (!(eras as readonly string[]).includes(l.eraId)) continue
  const r = (res[l.eraId] ??= { n: 0, m: 0, f: 0, br: {}, brM: {}, brF: {}, mat: 0, fAdult: 0, sumAge: 0, s15: 0, s45: 0, s60: 0 })
  const d = l.death.value!
  r.n++; l.sex === 'M' ? r.m++ : r.f++
  const b = bracket(d.age)
  r.br[b] = (r.br[b] ?? 0) + 1
  const bs = l.sex === 'M' ? r.brM : r.brF
  bs[b] = (bs[b] ?? 0) + 1
  r.sumAge += d.age
  if (d.age >= 15) r.s15++; if (d.age >= 45) r.s45++; if (d.age >= 60) r.s60++
  if (l.sex === 'F' && d.age >= 15) { r.fAdult++; if (d.maternal) r.mat++ }
}
const order = ['0세', '1~4세', '5~14세', '15~29세', '30~44세', '45~59세', '60세 이상']
for (const e of eras) {
  const r = res[e]
  console.log(`\n== ${e} n=${r.n} | 남 ${(r.m / r.n * 100).toFixed(1)}% 여 ${(r.f / r.n * 100).toFixed(1)}% | 평균 사망나이 ${(r.sumAge / r.n).toFixed(1)} | 15세 도달 ${(r.s15 / r.n * 100).toFixed(0)}%, 45세 ${(r.s45 / r.n * 100).toFixed(0)}%, 60세 ${(r.s60 / r.n * 100).toFixed(0)}% | 성인 여성 중 출산 사망 ${(r.mat / r.fAdult * 100).toFixed(1)}%`)
  console.log('  사망 나이대   전체    남     여')
  for (const k of order) console.log(`  ${k.padEnd(9)} ${((r.br[k] ?? 0) / r.n * 100).toFixed(1).padStart(5)}% ${((r.brM[k] ?? 0) / r.m * 100).toFixed(1).padStart(5)}% ${((r.brF[k] ?? 0) / r.f * 100).toFixed(1).padStart(5)}%`)
}
