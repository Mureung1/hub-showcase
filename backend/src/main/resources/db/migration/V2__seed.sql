INSERT INTO certification (name, issuer) VALUES
    ('산업안전기사', '한국산업인력공단'),
    ('품질경영기사', '한국산업인력공단'),
    ('위험물산업기사', '한국산업인력공단'),
    ('정보처리기사', '한국산업인력공단'),
    ('컴퓨터활용능력 1급', '대한상공회의소'),
    ('SQLD', '한국데이터산업진흥원'),
    ('리눅스마스터 1급', '한국정보통신진흥협회');

INSERT INTO certification_mention (certification_id, job_title, total_posting_count, mention_count)
SELECT id, '반도체 품질관리', 120, 94 FROM certification WHERE name = '산업안전기사'
UNION ALL
SELECT id, '반도체 품질관리', 120, 54 FROM certification WHERE name = '품질경영기사'
UNION ALL
SELECT id, '반도체 품질관리', 120, 36 FROM certification WHERE name = '위험물산업기사'
UNION ALL
SELECT id, '반도체 품질관리', 120, 14 FROM certification WHERE name = '컴퓨터활용능력 1급'
UNION ALL
SELECT id, '반도체 품질관리', 120, 8 FROM certification WHERE name = '정보처리기사'
UNION ALL
SELECT id, '전산직', 80, 52 FROM certification WHERE name = '정보처리기사'
UNION ALL
SELECT id, '전산직', 80, 40 FROM certification WHERE name = '컴퓨터활용능력 1급'
UNION ALL
SELECT id, '전산직', 80, 28 FROM certification WHERE name = 'SQLD'
UNION ALL
SELECT id, '전산직', 80, 12 FROM certification WHERE name = '리눅스마스터 1급'
UNION ALL
SELECT id, '전산직', 80, 2 FROM certification WHERE name = '산업안전기사';
