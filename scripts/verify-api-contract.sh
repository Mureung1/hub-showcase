#!/bin/zsh
# L2 — 백엔드 API 계약 검증 (HTTP 레벨). 단위 테스트가 못 보는 상태코드·헤더·입력 검증을 본다.
BASE=${BASE:-http://localhost:3001}
# CORS 허용 origin. 배포 대상을 검사할 땐 ORIGIN=https://hub-theta-brown.vercel.app 로 넘긴다.
ORIGIN=${ORIGIN:-http://localhost:5173}
ANON="verify-l2-$(date +%s)"
pass=0; fail=0

check() { # 설명, 기대코드, 실제코드, 본문
  if [[ "$2" == "$3" ]]; then print -r -- "  PASS  $1 → $3"; ((pass++))
  else print -r -- "  FAIL  $1 → 기대 $2, 실제 $3 | $4"; ((fail++)); fi
}

hit() { # method path [data] → "코드|본문"
  local m=$1 p=$2 d=$3
  if [[ -n "$d" ]]; then
    curl -s -m 90 -o /tmp/l2body -w "%{http_code}" -X "$m" "$BASE$p" -H "Content-Type: application/json" -d "$d"
  else
    curl -s -m 90 -o /tmp/l2body -w "%{http_code}" -X "$m" "$BASE$p"
  fi
}

print "== L2 백엔드 계약 (BASE=$BASE) =="

c=$(hit GET /api/health);            check "health 정상"            200 "$c" "$(cat /tmp/l2body)"
print -r -- "        본문: $(cat /tmp/l2body)"

c=$(hit GET /api/nope);              check "없는 경로 404 JSON"      404 "$c" "$(cat /tmp/l2body)"
c=$(hit POST /api/results '{"anonId":"x"}');        check "동의 없이 저장 거부"   400 "$c" "$(cat /tmp/l2body)"
c=$(hit POST /api/results '{"consent":true}');      check "anonId 없이 저장 거부" 400 "$c" "$(cat /tmp/l2body)"
c=$(hit GET /api/results);           check "anonId 없이 조회 거부"  400 "$c" "$(cat /tmp/l2body)"
c=$(hit DELETE /api/results);        check "anonId 없이 삭제 거부"  400 "$c" "$(cat /tmp/l2body)"

# 화이트리스트: 허용되지 않은 필드(이름)는 저장되면 안 된다
c=$(hit POST /api/results "{\"consent\":true,\"anonId\":\"$ANON\",\"mbti\":\"INTJ\",\"fitScore\":4,\"name\":\"홍길동\",\"freeText\":\"자유응답\"}")
check "저장 성공" 201 "$c" "$(cat /tmp/l2body)"
if grep -q "홍길동\|freeText" /tmp/l2body; then print "  FAIL  화이트리스트: 비허용 필드가 응답에 있음"; ((fail++))
else print "  PASS  화이트리스트: name·freeText 저장 안 됨"; ((pass++)); fi

c=$(hit GET "/api/results?anonId=$ANON"); check "내 기록 조회" 200 "$c" "$(cat /tmp/l2body)"
n=$(python3 -c "import json,sys;print(len(json.load(open('/tmp/l2body'))))")
[[ "$n" == "1" ]] && { print "  PASS  조회 결과 1건"; ((pass++)); } || { print "  FAIL  조회 결과 ${n}건"; ((fail++)); }

c=$(hit DELETE "/api/results?anonId=$ANON"); check "내 기록 삭제" 200 "$c" "$(cat /tmp/l2body)"
c=$(hit GET "/api/results?anonId=$ANON")
n=$(python3 -c "import json;print(len(json.load(open('/tmp/l2body'))))")
[[ "$n" == "0" ]] && { print "  PASS  삭제 후 0건"; ((pass++)); } || { print "  FAIL  삭제 후 ${n}건"; ((fail++)); }

# CORS: 허용 origin 통과 / 미허용 origin 차단
allowed=$(curl -s -m 30 -i -X OPTIONS "$BASE/api/results" -H "Origin: $ORIGIN" -H "Access-Control-Request-Method: POST" | grep -ci "access-control-allow-origin")
[[ "$allowed" -ge 1 ]] && { print "  PASS  CORS 허용 origin 통과"; ((pass++)); } || { print "  FAIL  CORS 허용 origin 헤더 없음"; ((fail++)); }
blocked=$(curl -s -m 30 -i -X OPTIONS "$BASE/api/results" -H "Origin: https://evil.example.com" -H "Access-Control-Request-Method: POST" | grep -ci "access-control-allow-origin")
[[ "$blocked" -eq 0 ]] && { print "  PASS  CORS 미허용 origin 차단"; ((pass++)); } || { print "  FAIL  CORS 미허용 origin에 허용 헤더 부여"; ((fail++)); }

print "== L2 결과: PASS $pass · FAIL $fail =="
exit $fail
