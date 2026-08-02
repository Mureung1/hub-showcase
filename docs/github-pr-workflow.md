# GitHub PR 올리는 방법

개발 저장소가 public으로 전환되면서 기존 fork 연결이 끊겼습니다.

개인 개발은 계속 본인 저장소에서 진행해도 됩니다. 다만 원본 `hub` 저장소의 브랜치로 계속 PR을 보내고 싶다면 아래 순서로 새 fork를 연결합니다.

## 다시 fork해서 PR 보내기

1. `hub` 저장소에서 `Fork`를 누릅니다.
   - 처음처럼 기본 브랜치 `main`으로 새 fork를 만듭니다.

2. 로컬 저장소의 `origin`을 새 fork 주소로 변경합니다.

   ```bash
   git remote set-url origin https://github.com/<내 ID>/hub.git
   ```

3. 기존 작업 브랜치를 새로 fork한 저장소에 올립니다.

   ```bash
   git push -u origin <내 로컬 브랜치>:Nxxx_이름
   ```

4. 새 fork에서 원본 `hub` 저장소의 `Nxxx_이름` 브랜치로 PR을 만듭니다.

## 원본 저장소 브랜치에서 이어 개발하기

원본 저장소의 `Nxxx_이름` 브랜치에 있는 본인 최신 코드를 다시 받아서 이어 개발하려면 아래 명령을 실행합니다.

```bash
git fetch upstream Nxxx_이름
git merge upstream/Nxxx_이름
```

`Nxxx_이름`은 본인의 루카스 ID와 이름에 맞는 브랜치명으로 바꿔서 사용합니다.
