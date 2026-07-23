from __future__ import annotations

import json
from pathlib import Path
from typing import Any


TOOL_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = TOOL_ROOT.parents[1]
PHOTO_GUIDES_ROOT = REPO_ROOT / "assets" / "photo-guides"


def load_entries(root: Path) -> list[dict[str, Any]]:
    manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
    places: list[dict[str, Any]] = []
    for place in manifest["places"]:
        frames = []
        for frame in place["frames"]:
            report_path = root / frame["comparisonReport"]
            report = json.loads(report_path.read_text(encoding="utf-8")) if report_path.exists() else None
            frames.append({
                "frameId": frame["frameId"],
                "title": frame["title"],
                "mode": frame["mode"],
                "poseId": frame["poseId"],
                "reference": frame["reference"],
                "comparison": frame["comparison"],
                "report": report,
            })
        places.append({"placeId": place["placeId"], "name": place["name"], "frames": frames})
    return places


def page_html(places: list[dict[str, Any]]) -> str:
    data = json.dumps(places, ensure_ascii=False).replace("</", "<\\/")
    return f"""<!doctype html>
<html lang=\"ko\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><title>Photo Navigation Dataset Review</title>
<style>
:root{{font-family:Arial,'Malgun Gothic',sans-serif;color:#17211a;background:#f5f7f5}}*{{box-sizing:border-box}}body{{margin:0}}header{{position:sticky;top:0;z-index:2;padding:18px max(20px,calc((100vw - 1320px)/2));border-bottom:1px solid #dce4de;background:rgba(255,255,255,.96)}}h1{{margin:0 0 6px;font-size:22px}}p{{margin:0;color:#5e6b61;font-size:13px}}nav{{display:flex;gap:8px;overflow:auto;margin-top:14px}}button{{font:inherit;cursor:pointer}}.filter{{padding:7px 10px;border:1px solid #b9c9bb;border-radius:5px;color:#36513b;background:#fff;white-space:nowrap}}.filter.active{{border-color:#03a64a;color:#fff;background:#03a64a}}main{{max-width:1320px;margin:auto;padding:28px 20px 60px}}section{{margin-top:34px;scroll-margin-top:130px}}h2{{margin:0 0 12px;font-size:19px}}.grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(370px,1fr));gap:16px}}article{{overflow:hidden;border:1px solid #dbe3dc;border-radius:6px;background:#fff}}.head{{display:flex;justify-content:space-between;gap:8px;padding:13px 14px 10px;border-bottom:1px solid #edf1ed}}h3{{margin:0;font-size:16px}}small{{display:block;margin-top:4px;color:#718075}}.badge{{padding:4px 7px;border-radius:999px;background:#e6f7eb;color:#087737;font-size:12px;font-weight:700}}.mid{{background:#fff8de;color:#816400}}.low{{background:#fff0ee;color:#a53a28}}.photos{{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:#dbe3dc}}.photo{{position:relative;min-height:260px;background:#edf2ed;overflow:hidden}}.photo img{{display:block;width:100%;height:100%;min-height:260px;max-height:420px;object-fit:cover}}.photo .overlay{{position:absolute;inset:0;opacity:.95;pointer-events:none}}.label,.note{{position:absolute;z-index:1;padding:4px 6px;border-radius:3px;color:#fff;font-size:11px}}.label{{top:8px;left:8px;background:rgba(20,31,23,.78)}}.note{{right:8px;bottom:8px;background:rgba(3,166,74,.92)}}.metrics{{padding:13px 14px 15px}}.score{{color:#087737;font-size:25px;font-weight:800}}.unit{{margin-left:8px;color:#67736b;font-size:13px}}.metric-grid{{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:12px}}.metric{{padding:8px;border-radius:4px;background:#f5f8f5}}.metric b{{display:block;color:#56645a;font-size:12px}}.metric span{{display:block;margin-top:3px;font-size:15px;font-weight:700}}.warn{{margin-top:10px;color:#75591a;font-size:12px;line-height:1.45}}@media(max-width:480px){{main{{padding:18px 12px}}.grid{{grid-template-columns:1fr}}.photo,.photo img{{min-height:220px}}}}
</style></head><body><header><h1>Photo Navigation Dataset Review</h1><p>보수 기준 v1: 위치·크기·포즈 차이를 엄격하게 계산한 15개 구도 비교 테스트 값입니다.</p><nav id=\"filters\"></nav></header><main id=\"app\"></main><script>
const places={data};const app=document.querySelector('#app'),filters=document.querySelector('#filters');let active='all';
const esc=(v)=>String(v??'').replace(/[&<>\"']/g,(c)=>({{'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}})[c]);
const asset=(path)=>encodeURI(path);const badge=(r)=>{{const cls=r.score>=80?'':r.score>=60?'mid':'low';return `<span class=\"badge ${{cls}}\">${{r.classification}}</span>`}};const metric=(name,item)=>`<div class=\"metric\"><b>${{name}}</b><span>${{item?.available?item.score+'점':'-'}}</span></div>`;
function card(frame){{const r=frame.report;if(active==='high'&&r.score<80)return '';if(active==='mid'&&(r.score<60||r.score>=80))return '';if(active==='low'&&r.score>=60)return '';return `<article><div class=\"head\"><div><h3>${{esc(frame.title)}}</h3><small>${{esc(frame.frameId)}} · ${{frame.mode}} · pose ${{frame.poseId}}</small></div>${{badge(r)}}</div><div class=\"photos\"><div class=\"photo\"><span class=\"label\">기준</span><img src=\"${{asset(frame.reference.photo)}}\" alt=\"기준 사진\"></div><div class=\"photo\"><span class=\"label\">비교</span><img src=\"${{asset(frame.comparison.photo)}}\" alt=\"비교 사진\"><img class=\"overlay\" src=\"${{asset(frame.reference.overlay)}}\" alt=\"기준 레이아웃\"><span class=\"note\">기준 레이아웃</span></div></div><div class=\"metrics\"><span class=\"score\">${{r.score}}</span><span class=\"unit\">/ 100 유사도</span><div class=\"metric-grid\">${{metric('위치',r.components.position)}}${{metric('크기',r.components.size)}}${{metric('포즈',r.components.pose)}}</div>${{r.warnings?.length?`<div class=\"warn\">${{r.warnings.map(esc).join('<br>')}}</div>`:''}}</div></article>`}}
function render(){{app.innerHTML=places.map((place)=>`<section id=\"${{place.placeId}}\"><h2>${{esc(place.name)}}</h2><div class=\"grid\">${{place.frames.map(card).join('')}}</div></section>`).join('')}}
const items=[['all','전체'],['high','80점 이상'],['mid','60~79점'],['low','60점 미만']];filters.innerHTML=items.map(([k,l])=>`<button class=\"filter ${{k===active?'active':''}}\" data-filter=\"${{k}}\">${{l}}</button>`).join('')+places.map((p)=>`<button class=\"filter\" data-place=\"${{p.placeId}}\">${{esc(p.name)}}</button>`).join('');filters.addEventListener('click',(e)=>{{const b=e.target.closest('button');if(!b)return;if(b.dataset.place)return document.querySelector('#'+b.dataset.place)?.scrollIntoView({{behavior:'smooth'}});active=b.dataset.filter;[...filters.querySelectorAll('[data-filter]')].forEach((x)=>x.classList.toggle('active',x.dataset.filter===active));render()}});render();
</script></body></html>"""


def main() -> int:
    output = PHOTO_GUIDES_ROOT / "dataset-review.html"
    output.write_text(page_html(load_entries(PHOTO_GUIDES_ROOT)), encoding="utf-8")
    print(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
