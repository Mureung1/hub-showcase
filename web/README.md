# web/

정적 **프론트엔드**(HTML/CSS/JS)가 위치하는 곳. GitHub Pages로 서빙된다.

`../data/`의 JSON을 로드해 '오늘의 브리핑' 피드(F1~F4)를 렌더링한다. 별도 서버 없이 정적 파일만으로 동작한다.

## 로컬 실행

`fetch`는 `file://`에서 막히므로 정적 서버로 열어야 한다. **저장소 루트**에서:

```bash
python3 -m http.server 8000
# → http://localhost:8000/web/ 접속
```

- 구성: `index.html`(셸) · `style.css`(팔레트) · `app.js`(F1~F4 로직)
- 데이터: `../data/2026-07-09.json` (목 데이터, 파이프라인 연동 전)
- 북마크는 브라우저 `localStorage`에 저장된다.
