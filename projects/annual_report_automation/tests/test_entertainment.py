"""기업업무추진비 한도 검증. 근거: 법인세법 §25 (research.md §3-10 — 2025 세율/한도표 대조 완료)."""

import unittest
from decimal import Decimal

from taxengine.engine import entertainment as E
from taxengine.domain.period import 사업연도월수

D = Decimal


class 사업연도월수_테스트(unittest.TestCase):
    def test_1년_풀타임은_12개월(self):
        self.assertEqual(사업연도월수("2025-01-01", "2025-12-31"), 12)

    def test_7월_설립이면_6개월(self):
        self.assertEqual(사업연도월수("2025-07-01", "2025-12-31"), 6)


class 수입금액한도_테스트(unittest.TestCase):
    def test_100억이하_구간은_0점3퍼센트(self):
        r = E.수입금액한도(D(5_000_000_000))
        self.assertEqual(r["금액"], D(5_000_000_000) * D("0.003"))

    def test_100억_500억_구간은_섞어_계산(self):
        # 100억은 0.3%, 나머지 50억은 0.2%
        r = E.수입금액한도(D(15_000_000_000))
        기대 = D(10_000_000_000) * D("0.003") + D(5_000_000_000) * D("0.002")
        self.assertEqual(r["금액"], 기대)


class 한도_테스트(unittest.TestCase):
    def test_중소기업_기본한도는_3600만(self):
        r = E.한도(수입금액=D(5_000_000_000), 월수=12, 중소기업=True)
        self.assertEqual(r["기본한도"], D(36_000_000))
        self.assertEqual(r["수입금액분"], D(15_000_000))
        self.assertEqual(r["한도"], D(51_000_000))

    def test_일반법인_기본한도는_1200만(self):
        r = E.한도(수입금액=D(0), 월수=12, 중소기업=False)
        self.assertEqual(r["한도"], D(12_000_000))

    def test_월할_적용(self):
        r = E.한도(수입금액=D(0), 월수=6, 중소기업=True)
        self.assertEqual(r["기본한도"], D(18_000_000))

    def test_소규모임대법인은_한도_50퍼센트_축소(self):
        일반 = E.한도(수입금액=D(5_000_000_000), 월수=12, 중소기업=True, 소규모임대법인=False)
        축소 = E.한도(수입금액=D(5_000_000_000), 월수=12, 중소기업=True, 소규모임대법인=True)
        self.assertEqual(축소["한도"], 일반["한도"] / 2)


class 시부인_테스트(unittest.TestCase):
    def test_한도_이내면_증빙불비만_손금불산입(self):
        한도결과 = E.한도(수입금액=D(5_000_000_000), 월수=12, 중소기업=True, 소규모임대법인=True)
        r = E.시부인(회사계상액=D(5_000_000), 적격증빙없는금액=D(500_000), 한도결과=한도결과)
        self.assertEqual(r["한도초과"], D(0))
        self.assertEqual(r["손금불산입합계"], D(500_000))

    def test_한도초과분도_추가로_손금불산입(self):
        한도결과 = E.한도(수입금액=D(0), 월수=12, 중소기업=False)  # 한도 1200만
        r = E.시부인(회사계상액=D(40_000_000), 적격증빙없는금액=D(1_000_000), 한도결과=한도결과)
        # 적격지출 39,000,000 - 한도 12,000,000 = 초과 27,000,000
        self.assertEqual(r["한도초과"], D(27_000_000))
        self.assertEqual(r["손금불산입합계"], D(1_000_000) + D(27_000_000))


if __name__ == "__main__":
    unittest.main()
