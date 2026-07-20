"""소규모임대법인 판정 검증. 근거: 법인세법 §25⑤·§27의2 (기업업무추진비·업무용승용차 공유 판정)."""

import unittest

from taxengine.domain.company import 소규모임대법인여부


class 소규모임대법인여부_테스트(unittest.TestCase):
    def test_3요건_전부_충족하면_해당(self):
        회사 = {"부동산임대업주업": True, "상시근로자수": 1, "지배주주지분율": 100}
        self.assertTrue(소규모임대법인여부(회사))

    def test_임대업이_아니면_비해당(self):
        회사 = {"부동산임대업주업": False, "상시근로자수": 1, "지배주주지분율": 100}
        self.assertFalse(소규모임대법인여부(회사))

    def test_근로자_5인_이상이면_비해당(self):
        회사 = {"부동산임대업주업": True, "상시근로자수": 5, "지배주주지분율": 100}
        self.assertFalse(소규모임대법인여부(회사))

    def test_지배주주지분_50퍼센트_이하면_비해당(self):
        회사 = {"부동산임대업주업": True, "상시근로자수": 1, "지배주주지분율": 50}
        self.assertFalse(소규모임대법인여부(회사))

    def test_필드_누락돼도_에러_없이_False(self):
        self.assertFalse(소규모임대법인여부({}))


if __name__ == "__main__":
    unittest.main()
