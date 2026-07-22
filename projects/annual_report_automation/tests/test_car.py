"""업무용승용차 관련비용 한도 검증. 근거: 법인세법 §27의2 (research.md §3-11 — 800만/1500만 확인 일치)."""

import unittest
from decimal import Decimal

from taxengine.engine import car as C

D = Decimal


class 전용보험_테스트(unittest.TestCase):
    def test_미가입이면_전액_손금불산입(self):
        r = C.판정({"감가상각비": D(8_000_000), "기타관련비용": D(2_000_000),
                   "전용보험가입": False}, 소규모임대법인=False)
        self.assertEqual(r["손금불산입액"], D(10_000_000))
        self.assertEqual(r["손금인정액"], D(0))


class 운행기록부_작성_테스트(unittest.TestCase):
    def test_감가한도_이내면_업무비율만큼만_인정(self):
        r = C.판정({"감가상각비": D(10_000_000), "기타관련비용": D(5_000_000),
                   "전용보험가입": True, "운행기록부작성": True, "업무사용비율": D(80)})
        self.assertEqual(r["감가상각한도초과"], D(0))
        self.assertEqual(r["손금인정액"], D(12_000_000))  # (10M+5M)*0.8
        self.assertEqual(r["손금불산입액"], D(3_000_000))  # 업무외 20%

    def test_감가상각비가_800만_넘으면_초과분_손금불산입(self):
        r = C.판정({"감가상각비": D(12_000_000), "기타관련비용": D(2_000_000),
                   "전용보험가입": True, "운행기록부작성": True, "업무사용비율": D(100)})
        self.assertEqual(r["감가상각한도초과"], D(4_000_000))  # 12M - 800만
        self.assertEqual(r["손금인정액"], D(10_000_000))  # 800만(감가) + 200만(기타)
        self.assertEqual(r["손금불산입액"], D(4_000_000))


class 운행기록부_미작성_테스트(unittest.TestCase):
    def test_1500만_한도로_비율_역산(self):
        r = C.판정({"감가상각비": D(10_000_000), "기타관련비용": D(10_000_000),
                   "전용보험가입": True, "운행기록부작성": False})
        self.assertEqual(r["업무사용비율"], D("0.75"))  # 1500만/2000만
        self.assertEqual(r["손금인정액"], D(15_000_000))  # 정확히 한도까지
        self.assertEqual(r["손금불산입액"], D(5_000_000))

    def test_관련비용이_1500만_이하면_전액_인정(self):
        r = C.판정({"감가상각비": D(5_000_000), "기타관련비용": D(3_000_000),
                   "전용보험가입": True, "운행기록부작성": False})
        self.assertEqual(r["업무사용비율"], D(1))
        self.assertEqual(r["손금인정액"], D(8_000_000))
        self.assertEqual(r["손금불산입액"], D(0))


class 소규모임대법인_축소_테스트(unittest.TestCase):
    def test_한도가_절반으로_축소된다(self):
        # 무기록한도 축소: 1500만→750만. 감가상각비를 낮게 둬서 800만→400만 축소한도는 안 걸리게 분리
        r = C.판정({"감가상각비": D(2_000_000), "기타관련비용": D(8_000_000),
                   "전용보험가입": True, "운행기록부작성": False}, 소규모임대법인=True)
        self.assertEqual(r["업무사용비율"], D("0.75"))  # 750만/1000만
        self.assertEqual(r["감가상각한도초과"], D(0))
        self.assertEqual(r["손금인정액"], D(7_500_000))  # 정확히 축소한도(750만)까지


class 처분손실_테스트(unittest.TestCase):
    def test_일반법인_800만_한도(self):
        r = C.처분손실판정(D(10_000_000), 소규모임대법인=False)
        self.assertEqual(r["인정액"], D(8_000_000))
        self.assertEqual(r["한도초과"], D(2_000_000))

    def test_소규모임대법인_400만_한도(self):
        r = C.처분손실판정(D(10_000_000), 소규모임대법인=True)
        self.assertEqual(r["인정액"], D(4_000_000))
        self.assertEqual(r["한도초과"], D(6_000_000))


if __name__ == "__main__":
    unittest.main()
