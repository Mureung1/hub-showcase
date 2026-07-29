#!/usr/bin/env python3
"""
list.csv에서 주소(2번째 컬럼)가 비어 있는 베이커리를 네이버 지역검색 API로 찾아 채운다.

- 이름 유사도가 낮거나 검색 결과가 아예 없는 곳은 잘못된 주소가 들어가는 걸 막기 위해
  CSV를 건드리지 않고 address_review.csv로 따로 정리한다(동명이인 체인점/폐업 등 대비).
- server/.env에 NAVER_SEARCH_CLIENT_ID / NAVER_SEARCH_CLIENT_SECRET이 있어야 한다
  (네이버 클라우드플랫폼 Maps 키와는 별개로, developers.naver.com에서 발급받는 오픈API 키).
- 실행 전 list.csv를 list.csv.bak으로 백업한다.

실행: python3 server/scripts/fill_addresses.py
"""
import csv
import difflib
import html
import json
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
CSV_PATH = os.path.join(ROOT, 'list.csv')
BACKUP_PATH = CSV_PATH + '.bak'
REVIEW_PATH = os.path.join(ROOT, 'address_review.csv')
ENV_PATH = os.path.join(ROOT, 'server', '.env')

MATCH_THRESHOLD = 0.6
REQUEST_DELAY_SEC = 0.15


def load_env(path):
    env = {}
    with open(path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            key, value = line.split('=', 1)
            env[key.strip()] = value.strip()
    return env


def strip_html(raw):
    return html.unescape(re.sub(r'</?b>', '', raw)).strip()


def normalize(name):
    return re.sub(r'\s+', '', name)


def similarity(a, b):
    return difflib.SequenceMatcher(None, normalize(a), normalize(b)).ratio()


def clean_address(addr):
    addr = re.sub(r'\([^)]*\)', '', addr)  # 지점명 등 괄호 설명 제거
    addr = addr.replace('대전광역시', '대전')  # 기존 데이터 표기(짧은 형태)에 맞춤
    addr = re.sub(r'\s+', ' ', addr).strip()
    addr = addr.replace(',', ' ')  # list.csv가 콤마 구분이라 주소엔 콤마가 섞이면 안 됨
    return addr


def search_local(name, client_id, client_secret):
    query = f'대전 {name}'
    url = 'https://openapi.naver.com/v1/search/local.json?' + urllib.parse.urlencode(
        {'query': query, 'display': 5}
    )
    req = urllib.request.Request(
        url,
        headers={
            'X-Naver-Client-Id': client_id,
            'X-Naver-Client-Secret': client_secret,
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as res:
            body = json.load(res)
    except urllib.error.HTTPError as e:
        print(f'  ✗ {name} — API 오류 {e.code}: {e.read().decode("utf-8", "ignore")}')
        return []
    return body.get('items', [])


def main():
    env = load_env(ENV_PATH)
    client_id = env.get('NAVER_SEARCH_CLIENT_ID')
    client_secret = env.get('NAVER_SEARCH_CLIENT_SECRET')
    if not client_id or not client_secret:
        raise SystemExit('server/.env에 NAVER_SEARCH_CLIENT_ID / NAVER_SEARCH_CLIENT_SECRET이 없습니다.')

    with open(CSV_PATH, 'r', encoding='utf-8') as f:
        text = f.read()
    lines = text.rstrip('\n').split('\n')
    header, rows = lines[0], lines[1:]

    with open(BACKUP_PATH, 'w', encoding='utf-8') as f:
        f.write(text)
    print(f'백업: {BACKUP_PATH}')

    filled, skipped_has_address, no_match, low_confidence = 0, 0, [], []
    new_rows = []

    for line in rows:
        if not line.strip():
            new_rows.append(line)
            continue
        fields = line.split(',')
        if len(fields) != 8:
            print(f'  ! 컬럼 수가 8개가 아니라 건드리지 않고 넘어감: {line}')
            new_rows.append(line)
            continue

        name, address = fields[0].strip(), fields[1].strip()
        if address:
            skipped_has_address += 1
            new_rows.append(line)
            continue

        items = search_local(name, client_id, client_secret)
        time.sleep(REQUEST_DELAY_SEC)

        if not items:
            print(f'  ✗ {name} — 검색 결과 없음')
            no_match.append({'name': name, 'candidate': '', 'candidate_address': '', 'reason': '검색 결과 없음'})
            new_rows.append(line)
            continue

        best = max(items, key=lambda it: similarity(name, strip_html(it['title'])))
        best_title = strip_html(best['title'])
        sim = similarity(name, best_title)
        candidate_address = clean_address(best.get('roadAddress') or best.get('address') or '')

        if sim >= MATCH_THRESHOLD and candidate_address:
            fields[1] = candidate_address
            new_rows.append(','.join(fields))
            filled += 1
            print(f'  ✓ {name} → {candidate_address} (유사도 {sim:.2f})')
        else:
            print(f'  ? {name} — 확신 낮음(유사도 {sim:.2f}), 후보: {best_title} / {candidate_address}')
            low_confidence.append(
                {'name': name, 'candidate': best_title, 'candidate_address': candidate_address, 'reason': f'이름 유사도 {sim:.2f}'}
            )
            new_rows.append(line)

    with open(CSV_PATH, 'w', encoding='utf-8', newline='\n') as f:
        f.write(header + '\n')
        f.write('\n'.join(new_rows) + '\n')

    review_rows = no_match + low_confidence
    if review_rows:
        with open(REVIEW_PATH, 'w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=['name', 'candidate', 'candidate_address', 'reason'])
            writer.writeheader()
            writer.writerows(review_rows)
        print(f'\n확인 필요 {len(review_rows)}건 → {REVIEW_PATH}')

    print(f'\n자동 채움 {filled}건 / 이미 주소 있음 {skipped_has_address}건 / 확인 필요 {len(review_rows)}건')


if __name__ == '__main__':
    main()
