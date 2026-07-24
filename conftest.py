# 이 파일은 내용이 아니라 "위치"가 목적이다.
# repo 루트에 conftest.py가 있으면 pytest가 이 디렉토리를 sys.path에 넣어,
# tests/에서 `import app`이 되게 한다. bare `pytest` 실행(CLAUDE.md 개발 명령)에 필요.
# (python -m pytest는 cwd를 sys.path에 넣어 이 파일 없이도 되지만, 명령을 통일한다.)
