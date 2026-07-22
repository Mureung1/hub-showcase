from pathlib import Path
import re

root = Path.cwd()
outfits_path = root / "src" / "components" / "OutfitsTab.tsx"
server_path = root / "server.ts"

outfits = outfits_path.read_text(encoding="utf-8")
server = server_path.read_text(encoding="utf-8")

old = """          closet,
          mode: recommendMode
        })"""
new = """          closet,
          mode: recommendMode,
          retrySeed: `${Date.now()}-${Math.random()}`,
          excludeItemIds: isRetry && resultOutfit
            ? Object.values(resultOutfit.items).filter(Boolean).map((item) => item!.id)
            : []
        })"""
outfits = outfits.replace(old, new, 1)

outfits = re.sub(
    r'onClick=\{\(\)\s*=>\s*generateRandomCharacter\(\)\}',
    'onClick={() => handleRecommend(true)}',
    outfits
)

outfits = outfits.replace(
    'className="flex gap-2 shrink-0 md:self-center"',
    'className="flex w-full min-w-0 flex-wrap justify-start gap-2 md:w-auto md:max-w-[44%] md:justify-end md:self-center"'
)
outfits = outfits.replace(
    'className="flex flex-wrap gap-2 shrink-0 md:self-center"',
    'className="flex w-full min-w-0 flex-wrap justify-start gap-2 md:w-auto md:max-w-[44%] md:justify-end md:self-center"'
)
outfits = outfits.replace(
    'className={`px-3 py-1.5 text-xs',
    'className={`min-w-0 max-w-full px-2.5 py-1.5 text-xs'
)
outfits = outfits.replace(
    '<span>{addedItems[',
    '<span className="whitespace-normal break-keep text-center leading-tight">{addedItems['
)
outfits = outfits.replace(
    'className="flex items-center gap-4 flex-1"',
    'className="flex min-w-0 flex-1 items-center gap-3"'
)

server = server.replace(
    'const { weather, destination, situation, closet, mode } = req.body;',
    'const { weather, destination, situation, closet, mode, retrySeed, excludeItemIds = [] } = req.body;',
    1
)

anchor = '- 상황: ${situation}'
extra = (
    '- 상황: ${situation}\\n'
    '- 추천 요청 고유값: ${retrySeed ?? Date.now()}\\n'
    '- 직전 추천에서 제외할 상품 ID: ${Array.isArray(excludeItemIds) ? excludeItemIds.join(", ") : ""}\\n\\n'
    '같은 조건으로 다시 추천하더라도 직전 결과와 가능한 한 다른 아이템 조합을 선택하세요.\\n'
    '제외 상품 ID에 포함된 상품은 대체 상품이 충분한 경우 선택하지 마세요.'
)
server = server.replace(anchor, extra)
server = server.replace('temperature: 0.25', 'temperature: 0.75')
server = server.replace('temperature: 0.35', 'temperature: 0.75')
server = server.replace(
    'getOfflineRecommendation(weather, destination, situation, closet)',
    'getOfflineRecommendation(weather, destination, situation, closet, excludeItemIds)'
)

outfits_path.write_text(outfits, encoding="utf-8")
server_path.write_text(server, encoding="utf-8")

print("OutfitsTab.tsx와 server.ts 수정 완료")
