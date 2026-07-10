# Design References

이 폴더는 XP 데스크톱형 전자 매니저 UI의 시각 기준과 후보 이미지를 보관한다.

여기 있는 이미지는 바로 화면에 적용되는 파일이 아니다. 실제 브라우저에서 불러오는 에셋은 `public/assets/`에 둔다.

## 기준 이미지

| 파일 | 역할 |
|---|---|
| `concept.png` | 최우선 디자인 기준. 색감, 구도, 픽셀 밀도, XP 감성을 판단할 때 우선 참고한다. |
| `background.png` | 현재 배경으로 사용하기 위해 선별한 단일 배경 후보. 적용 시에는 `public/assets/background/background.png`로 복사해 사용한다. |

## 분해용 이미지

| 파일 | 역할 |
|---|---|
| `sky.png` | 하늘 레이어 실험 자료 |
| `cloud.png` | 구름 레이어 실험 자료 |
| `mountain.png` | 산/원경 레이어 실험 자료 |
| `ground.png` | 초원/지면 레이어 실험 자료 |

레이어 이미지는 향후 패럴랙스나 시간대 변화 연출을 실험할 때 참고한다. 현재 정적 프로토타입은 단일 `background.png`를 우선 사용한다.

## 후보 이미지

`Candidate/` 폴더는 비교용 후보 이미지를 보관한다.

- 최종 기준은 `concept.png`다.
- 후보 이미지는 발표나 디자인 비교에는 사용할 수 있지만, 공식 디자인 규칙은 `docs/design-system.md`에서 관리한다.

## 적용 흐름

```text
design-references/concept.png
  -> docs/design-system.md
  -> docs/asset-prompts/
  -> 생성·선별된 이미지
  -> public/assets/
  -> React MVP / prototype-static.html
```
