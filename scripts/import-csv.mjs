// CSV (province,name,weight,now) → 스냅숏 JSON의 rows 에 채워 넣는다.
// 사용: node scripts/import-csv.mjs <csv 경로> <스냅숏 json 경로>
import { readFileSync, writeFileSync } from 'node:fs'

const [csvPath, jsonPath] = process.argv.slice(2)
if (!csvPath || !jsonPath) {
  console.error('사용법: node scripts/import-csv.mjs <csv> <snapshot.json>')
  process.exit(1)
}
const lines = readFileSync(csvPath, 'utf8').split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('#'))
const header = lines.shift().split(',').map((h) => h.trim())
const idx = (k) => header.indexOf(k)
if (['province', 'name', 'weight'].some((k) => idx(k) < 0)) {
  console.error('헤더에 province,name,weight 가 필요합니다')
  process.exit(1)
}
const rows = []
for (const line of lines) {
  const cols = line.split(',').map((c) => c.trim())
  const weight = Number(cols[idx('weight')].replace(/[^\d.]/g, ''))
  if (!Number.isFinite(weight) || weight <= 0) continue
  const row = { province: cols[idx('province')], name: cols[idx('name')], weight }
  const now = idx('now') >= 0 ? cols[idx('now')] : ''
  if (now) row.now = now
  rows.push(row)
}
const snap = JSON.parse(readFileSync(jsonPath, 'utf8'))
snap.rows = rows
writeFileSync(jsonPath, JSON.stringify(snap, null, 2) + '\n')
const total = rows.reduce((a, r) => a + r.weight, 0)
console.log(`${jsonPath}: ${rows.length}개 지역, 가중치 합 ${total.toLocaleString()}`)
