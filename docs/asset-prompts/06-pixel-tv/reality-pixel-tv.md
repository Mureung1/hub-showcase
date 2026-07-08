# Reality To Pixel TV Prompt

## 목적

MVP 이후 “현실을 픽셀화해서 웹사이트 안 TV에서 상영하는 느낌”을 만들기 위한 TV 프레임과 샘플 화면 프롬프트다. 실제 웹캠 영상은 `<canvas>`에서 처리하고, 프롬프트는 TV/노트북/창문 같은 연출 에셋 생성에 쓴다.

## 출력 규격

- TV 프레임: transparent PNG, `1024x1024`
- 샘플 배경 포함 이미지: `1536x1024`
- 텍스트 없음

## TV 프레임 프롬프트

```text
Create a transparent pixel art object of a small cozy CRT TV for a lofi cabin room web app. The TV has a blank screen area reserved for live canvas video, warm wooden or beige plastic frame, tiny antenna, subtle screen glow, readable pixel edges, no text, no logo, no watermark, front-facing 3/4 view, suitable to overlay a canvas inside the screen.
```

## 샘플 상영 화면 프롬프트

```text
A cozy pixel art cabin room with a small CRT TV showing a pixelated impression of the real world as abstract colored blocks, like a webcam feed transformed into low resolution pixels. Warm room light, tiny electronic creature nearby, no readable faces, privacy-safe abstract screen, no text, no logo, calm nostalgic mood.
```

## 개인정보/UX 메모

- 웹캠 프레임은 기본적으로 저장하지 않는다.
- 화면에는 “픽셀화된 추상 프리뷰”만 보여준다.
- 카메라 기능은 opt-in으로 켜고, 꺼도 핵심 퀘스트 루프는 동작해야 한다.
