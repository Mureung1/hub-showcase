#!/bin/bash
# 미리캣 워커 — 국내 서버(NCP) 설치 스크립트. 서버에서 root로 실행.
# 사용: bash worker-server-setup.sh   (실행 전에 .env를 서버로 복사해둘 것 — 아래 안내 참조)
set -e

echo "=== 1. 시간대 KST + 기본 도구 ==="
timedatectl set-timezone Asia/Seoul
apt-get update -qq && apt-get install -y -qq git python3-venv python3-pip

echo "=== 2. 코드 받기 (work 브랜치) ==="
cd /root
[ -d hub ] || git clone -b work https://github.com/jaehyun429/hub.git
cd hub && git pull

echo "=== 3. 파이썬 환경 ==="
cd /root/hub/miricat/agent-worker
python3 -m venv .venv
.venv/bin/pip install -q -r requirements.txt

echo "=== 4. .env 확인 ==="
if [ ! -f /root/hub/miricat/.env ]; then
  echo "⚠️  /root/hub/miricat/.env 가 없습니다 — 맥북에서 먼저 복사하세요:"
  echo "    scp -i <pem파일> ~/Desktop/ai_agent_challenge/hub/miricat/.env root@<서버IP>:/root/hub/miricat/.env"
  exit 1
fi

echo "=== 5. 시험 순찰 1회 ==="
.venv/bin/python run_scout.py

echo "=== 6. 매일 07:30 크론 등록 ==="
CRON="30 7 * * * cd /root/hub/miricat/agent-worker && git -C /root/hub pull -q && .venv/bin/python run_scout.py >> /root/miricat-patrol.log 2>&1"
( crontab -l 2>/dev/null | grep -v run_scout ; echo "$CRON" ) | crontab -
crontab -l
echo "✅ 완료 — 매일 07:30(KST) 순찰. 로그: /root/miricat-patrol.log"
