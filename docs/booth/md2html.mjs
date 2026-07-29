/**
 * 마크다운 문서를 인쇄용 A4 HTML로 감싼다. (부스 대본 출력용)
 *
 *   node docs/booth/md2html.mjs <입력.md> <출력.html> "<문서 제목>"
 *
 * 포스터(A3)와 같은 Pretendard woff2를 쓰되 지면만 A4로 바꾼다.
 * 부스에서 손에 들고 보는 종이라 본문을 크게 잡고, 표·인용이 페이지 경계에서
 * 쪼개지지 않도록 break-inside를 막았다.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { marked } from "marked";

const [, , src, out, title = "문서"] = process.argv;
if (!src || !out) {
  console.error("사용법: node md2html.mjs <입력.md> <출력.html> [제목]");
  process.exit(1);
}

marked.setOptions({ gfm: true, breaks: false });

// 첫 h1은 표지 제목으로 따로 뽑아 쓰므로 본문에서 뺀다.
const md = readFileSync(src, "utf8").replace(/^#\s.*\n/, "");
const body = marked.parse(md);

const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<link rel="preload" as="font" type="font/woff2" crossorigin href="./fonts/Pretendard-Regular.woff2" />
<link rel="preload" as="font" type="font/woff2" crossorigin href="./fonts/Pretendard-SemiBold.woff2" />
<link rel="preload" as="font" type="font/woff2" crossorigin href="./fonts/Pretendard-Bold.woff2" />
<style>
@font-face{font-family:"PretendardBooth";src:url("./fonts/Pretendard-Regular.woff2") format("woff2");font-weight:400;font-display:block}
@font-face{font-family:"PretendardBooth";src:url("./fonts/Pretendard-SemiBold.woff2") format("woff2");font-weight:600;font-display:block}
@font-face{font-family:"PretendardBooth";src:url("./fonts/Pretendard-Bold.woff2") format("woff2");font-weight:700;font-display:block}
@font-face{font-family:"PretendardBooth";src:url("./fonts/Pretendard-ExtraBold.woff2") format("woff2");font-weight:800;font-display:block}

@page{size:A4 portrait;margin:15mm 16mm 14mm}
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
html,body{margin:0;padding:0;word-break:keep-all;overflow-wrap:break-word;
  font-family:"PretendardBooth","맑은 고딕","Malgun Gothic",sans-serif;
  color:#253449;font-size:10.5pt;line-height:1.62}
@media screen{body{max-width:180mm;margin:0 auto;padding:14mm 0;background:#fff}}

.cover{border-left:4mm solid #4a90e2;padding:1mm 0 1mm 6mm;margin:0 0 9mm}
.cover h1{margin:0 0 2mm;font-size:22pt;font-weight:800;letter-spacing:-0.03em;line-height:1.15}
.cover p{margin:0;font-size:10pt;color:#6b7787}

h2{font-size:15pt;font-weight:800;letter-spacing:-0.02em;margin:11mm 0 3.5mm;
  padding-bottom:2mm;border-bottom:0.6mm solid #4a90e2;break-after:avoid;break-inside:avoid}
h2:first-of-type{margin-top:0}
h3{font-size:12pt;font-weight:700;margin:7mm 0 2.5mm;color:#3b7dd8;break-after:avoid}
h4{font-size:10.5pt;font-weight:700;margin:5mm 0 2mm;break-after:avoid}
p{margin:0 0 3mm}
ul,ol{margin:0 0 3mm;padding-left:6mm}
li{margin-bottom:1.5mm}
li>p{margin:0 0 1.5mm}
strong{font-weight:700;color:#1b2736}
hr{border:0;border-top:0.4mm solid #e4eaf1;margin:8mm 0}
a{color:#3b7dd8;text-decoration:none}

/* 실제로 읽을 대사 — 눈에 바로 띄어야 한다 */
blockquote{margin:0 0 4mm;padding:3.5mm 5mm;background:#f2f7fe;
  border-left:1.6mm solid #4a90e2;border-radius:0 2mm 2mm 0;break-inside:avoid}
blockquote p{margin:0 0 2mm}
blockquote p:last-child{margin:0}

code{font-family:"Consolas","D2Coding",monospace;font-size:9pt;
  background:#f4f7fa;padding:0.6mm 1.4mm;border-radius:1mm}
pre{background:#f4f7fa;border:0.35mm solid #e4eaf1;border-radius:2mm;
  padding:3mm 4mm;overflow-x:auto;margin:0 0 4mm;break-inside:avoid}
pre code{background:none;padding:0;font-size:9pt;line-height:1.5}

table{width:100%;border-collapse:collapse;margin:0 0 4mm;font-size:9.5pt;break-inside:avoid}
th,td{border:0.3mm solid #e4eaf1;padding:2mm 2.6mm;text-align:left;vertical-align:top}
th{background:#eef3f8;font-weight:700;white-space:nowrap}
tr{break-inside:avoid}
</style>
</head>
<body>
<div class="cover">
  <h1>${title}</h1>
  <p>WeatherPilot · N111 양서형 — 부스에서 손에 들고 보는 대본</p>
</div>
${body}
</body>
</html>
`;

writeFileSync(out, html, "utf8");
console.log(`${out} 생성`);
