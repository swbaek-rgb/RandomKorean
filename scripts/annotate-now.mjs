// 옛 스냅숏의 행에 "지금의 대표 지역"(now)을 채운다.
// 규칙: ① 대응표(scripts/maps/now-map.json)에 있으면 그 값 ("도|이름" 키가 "이름" 키보다 우선)
//       ② 이름이 현재(2020 출생 스냅숏) 시군구 이름과 같으면 비움 (이미 현재 지명)
//       ③ 접미사(부·군·시·도)를 뗀 이름 + 시/군 이 현재 목록에 있으면 그 이름
//       ④ 그 외: 접미사를 뗀 이름. 북한 지역 도이면 " (북한)" 을 붙인다
// 사용: node scripts/annotate-now.mjs <snapshot.json> [snapshot.json ...]
import { readFileSync, writeFileSync } from 'node:fs'

const current = new Set(JSON.parse(readFileSync('src/data/regions/2020-births-south.json', 'utf8')).rows.map((r) => r.name))
const map = JSON.parse(readFileSync('scripts/maps/now-map.json', 'utf8'))
const NORTH = new Set(['황해도', '평안남도', '평안북도', '함경남도', '함경북도'])
const strip = (n) => n.replace(/(특별시|광역시|직할시|부|군|시|도|구)$/, '')

for (const path of process.argv.slice(2)) {
  const snap = JSON.parse(readFileSync(path, 'utf8'))
  let mapped = 0, kept = 0, guessed = 0
  for (const r of snap.rows) {
    const key = `${r.province}|${r.name}`
    if (map[key] !== undefined || map[r.name] !== undefined) {
      const v = map[key] ?? map[r.name]
      if (v) r.now = v; else delete r.now
      mapped++
      continue
    }
    const base = strip(r.name)
    if (NORTH.has(r.province)) { r.now = `북한 ${base}`; guessed++; continue } // 북한 지역은 남한 현재 지명과 대조하지 않는다
    if (current.has(r.name)) { delete r.now; kept++; continue }
    const hit = [`${base}시`, `${base}군`, `${base}구`].find((n) => current.has(n))
    if (hit) { r.now = hit; mapped++; continue }
    r.now = base
    guessed++
  }
  writeFileSync(path, JSON.stringify(snap, null, 2) + '\n')
  console.log(`${path}: 대응표·규칙 ${mapped}, 현재 지명 그대로 ${kept}, 접미사 제거 추정 ${guessed}`)
}
