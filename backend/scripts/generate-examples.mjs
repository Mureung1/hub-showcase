// 게임 × 시스템 카탈로그를 순회하며 AI 예시 역기획서를 만들어 Supabase 에 저장한다.
//
// 사용법 (backend 디렉터리에서):
//   node scripts/generate-examples.mjs --limit 1          # 1건만(품질 확인용)
//   node scripts/generate-examples.mjs --only 발로란트     # 특정 게임만
//   node scripts/generate-examples.mjs                    # 전체(이미 있는 건 건너뜀)
//   node scripts/generate-examples.mjs --force            # 이미 있어도 다시 생성(교체)
//
// 무료 티어 rate limit 때문에 호출 사이에 지연을 둔다. 중간에 끊겨도 다시 돌리면 이어서 진행된다.
import 'dotenv/config'
import { supabase } from '../src/lib/supabase.js'
import { generateExampleDoc } from '../src/lib/aiExample.js'
import { gameSystems } from '../../frontend/src/data/gameSystems.js'
import { getTemplate } from '../../frontend/src/data/templates.js'

const JOB_TAG_BY_TEMPLATE = {
  system: '시스템',
  content: '컨텐츠',
  uiux: 'UI/UX',
  level: '레벨',
  free: '자유',
}

const EXAMPLE_AUTHOR = 'respec 예시'
const DELAY_MS = Number(process.env.EXAMPLE_DELAY_MS ?? 4000)

function parseArgs(argv) {
  const args = { force: false, only: null, limit: Infinity }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--force') args.force = true
    else if (argv[i] === '--only') args.only = argv[++i]
    else if (argv[i] === '--limit') args.limit = Number(argv[++i])
  }
  return args
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function unwrap({ data, error }) {
  if (error) throw new Error(error.message)
  return data
}

// 같은 게임·시스템의 예시가 이미 있는지.
async function findExisting(entry) {
  const rows = unwrap(
    await supabase
      .from('documents')
      .select('id')
      .eq('is_example', true)
      .eq('game_tag', entry.game)
      .eq('system_tag', entry.name)
      .limit(1),
  )
  return rows[0] ?? null
}

// 생성 결과를 documents 행으로. 섹션은 템플릿 순서를 유지하고 id를 부여한다.
function toRow(entry, template, generated) {
  const byKey = new Map(generated.sections.map((s) => [s.key, s.content]))
  const sections = template.sections.map((s, i) => ({
    id: `${entry.id}-${i + 1}`,
    heading: s.heading,
    content: byKey.get(s.key) ?? '',
  }))

  return {
    author_id: null,
    author_name: EXAMPLE_AUTHOR,
    type: '역기획',
    template_id: entry.templateId,
    status: 'published',
    is_example: true,
    title: generated.title,
    game_tag: entry.game,
    job_tag: JOB_TAG_BY_TEMPLATE[entry.templateId],
    system_tag: entry.name,
    category: entry.category,
    feedback_wanted: false,
    sections,
    comments: [],
    published_at: new Date().toISOString(),
  }
}

// category 컬럼이 없으면 insert가 전부 실패한다. AI를 부르기 전에 한 번만 확인한다.
async function assertSchemaReady() {
  const { error } = await supabase.from('documents').select('category').limit(1)
  if (error) {
    console.error('documents.category 컬럼이 없습니다. Supabase SQL Editor에서 먼저 실행하세요:\n')
    console.error('  alter table public.documents add column if not exists category text;')
    console.error('  create index if not exists documents_category_idx')
    console.error('    on public.documents (category);\n')
    process.exit(1)
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  await assertSchemaReady()
  const targets = gameSystems
    .filter((e) => (args.only ? e.game === args.only : true))
    .slice(0, args.limit)

  if (targets.length === 0) {
    console.log('대상이 없습니다. --only 값을 확인하세요.')
    return
  }
  console.log(`대상 ${targets.length}건 (force=${args.force}, delay=${DELAY_MS}ms)\n`)

  let created = 0
  let skipped = 0
  const failed = []

  for (const [i, entry] of targets.entries()) {
    const label = `[${i + 1}/${targets.length}] ${entry.game} · ${entry.name}`
    try {
      const existing = await findExisting(entry)
      if (existing && !args.force) {
        console.log(`${label} — 이미 있음, 건너뜀`)
        skipped++
        continue
      }

      const template = getTemplate(entry.templateId)
      if (!template) throw new Error(`알 수 없는 템플릿: ${entry.templateId}`)

      const generated = await generateExampleDoc(entry, template)
      const row = toRow(entry, template, generated)

      if (existing) {
        unwrap(await supabase.from('documents').update(row).eq('id', existing.id))
        console.log(`${label} — 교체됨: ${row.title}`)
      } else {
        unwrap(await supabase.from('documents').insert(row))
        console.log(`${label} — 생성됨: ${row.title}`)
      }
      created++
    } catch (err) {
      console.log(`${label} — 실패: ${err.message}`)
      failed.push({ entry: `${entry.game} · ${entry.name}`, error: err.message })
    }

    if (i < targets.length - 1) await sleep(DELAY_MS)
  }

  console.log(`\n완료 — 생성/교체 ${created}, 건너뜀 ${skipped}, 실패 ${failed.length}`)
  if (failed.length > 0) {
    console.log('실패 목록(다시 실행하면 이어서 시도합니다):')
    failed.forEach((f) => console.log(`  - ${f.entry}: ${f.error}`))
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
