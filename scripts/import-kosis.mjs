// KOSIS 오픈 API 에서 시·군·구 통계표를 받아 스냅숏 JSON의 rows 에 채운다.
// 사용: KOSIS_API_KEY=... node scripts/import-kosis.mjs <tblId> <연도> <스냅숏 json> [itmId]
//   예) 시군구 출생아 수:   node scripts/import-kosis.mjs DT_1B81A01 2020 src/data/regions/2020-births-south.json
//   예) 인구총조사 시군구:  tblId 는 KOSIS 통계표 URL 의 tblId= 값. 1966년은 '인구총조사 > 시군구별 인구' 표에서 확인.
// 주의: 표마다 항목(itmId)·분류 코드가 다르므로 첫 실행 후 출력된 항목 목록을 보고 itmId 를 지정한다.
import { readFileSync, writeFileSync } from 'node:fs'

const key = process.env.KOSIS_API_KEY
const [tblId, year, jsonPath, itmIdArg] = process.argv.slice(2)
if (!key || !tblId || !year || !jsonPath) {
  console.error('사용법: KOSIS_API_KEY=키 node scripts/import-kosis.mjs <tblId> <연도> <snapshot.json> [itmId]')
  process.exit(1)
}
const params = new URLSearchParams({
  method: 'getList', apiKey: key, format: 'json', jsonVD: 'Y',
  orgId: '101', tblId, prdSe: process.env.KOSIS_PRDSE ?? 'Y', startPrdDe: year, endPrdDe: year, // 옛 5년 주기 표는 KOSIS_PRDSE=F
  itmId: itmIdArg ?? 'ALL', objL1: 'ALL',
})
// 표에 축이 더 있으면 KOSIS_OBJL2=코드 처럼 환경변수로 지정 (예: 월별 축의 '계')
for (const k of ['objL2', 'objL3', 'objL4']) {
  const v = process.env['KOSIS_' + k.toUpperCase()]
  if (v) params.set(k, v)
}
const url = `https://kosis.kr/openapi/Param/statisticsParameterData.do?${params}`
const res = await fetch(url)
// KOSIS 는 키에 따옴표가 없는 비표준 JSON 을 줄 때가 있어 관대하게 파싱한다
const text = await res.text()
let data
try { data = JSON.parse(text) } catch { data = new Function('return ' + text)() }
if (!Array.isArray(data)) {
  console.error('KOSIS 응답 오류:', data)
  process.exit(1)
}
const items = [...new Set(data.map((d) => `${d.ITM_ID} ${d.ITM_NM}`))]
console.log('항목:', items.join(' | '))
// KOSIS_SUM=1 이면 여러 항목(남자·여자 등)을 코드별로 합산한다 (합계 항목이 없는 옛 표)
const sumItems = process.env.KOSIS_SUM === '1'
if (!itmIdArg && items.length > 1 && !sumItems) {
  console.log('항목이 여러 개입니다. itmId 를 골라 다시 실행하거나 KOSIS_SUM=1 로 합산하세요.')
  process.exit(0)
}
// C1 코드: 2자리 = 시도, 5자리 = 시군구. 시도 이름을 province 로 붙인다.
const sido = new Map()
for (const d of data) if ((d.C1 ?? '').length === 2) sido.set(d.C1, d.C1_NM)
// 구를 둔 시(수원시 31010 아래 장안구 31011 …)는 시와 구가 함께 오므로 구 행을 버리고 시 행만 남긴다
// KOSIS_LEVEL=5 이면 5자리 코드만 취한다 (1935년처럼 부·군·면 3단 코드 표)
// KOSIS_NODISTRICT=1 이면 구 판정을 끈다 (1935·1955년처럼 코드가 순번이라 xxxx0 규칙이 안 맞는 표)
const level = process.env.KOSIS_LEVEL ? Number(process.env.KOSIS_LEVEL) : null
const noDistrict = process.env.KOSIS_NODISTRICT === '1'
const codes = new Set(data.map((d) => d.C1 ?? ''))
const isDistrictOfCity = (code) => !noDistrict && code.length === 5 && code[4] !== '0' && codes.has(code.slice(0, 4) + '0')
const byCode = new Map()
for (const d of data) {
  const code = d.C1 ?? ''
  if (level ? code.length !== level : code.length <= 2) continue
  if (code === '00' || isDistrictOfCity(code)) continue
  if (/^(시부|읍부|면부|군부|부부|동부|계)$/.test(d.C1_NM)) continue // 도별 소계 행
  const weight = Number(String(d.DT).replace(/[^\d.]/g, ''))
  if (!Number.isFinite(weight) || weight <= 0) continue
  const province = sido.get(code.slice(0, 2)) ?? ''
  const name = d.C1_NM
  // 광역시 안의 구 처럼 "부산광역시 해운대구" 로 오는 경우 앞부분을 떼어낸다
  const row = byCode.get(code) ?? { province, name: name.startsWith(province) ? name.slice(province.length).trim() || name : name, weight: 0 }
  row.weight += weight
  byCode.set(code, row)
}
const rows = [...byCode.values()]
const snap = JSON.parse(readFileSync(jsonPath, 'utf8'))
snap.rows = rows
snap.year = Number(year)
writeFileSync(jsonPath, JSON.stringify(snap, null, 2) + '\n')
console.log(`${jsonPath}: ${rows.length}개 시군구, 합 ${rows.reduce((a, r) => a + r.weight, 0).toLocaleString()}`)
