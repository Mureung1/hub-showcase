import 'package:flutter_test/flutter_test.dart';
import 'package:one_step/core/constants/growth_rules.dart';
import 'package:one_step/models/app_user.dart';

/// 4주차 캐릭터 성장 — `applyXpGain` 순수 함수.
/// 다단계 상승·진화 경계(단계별 xpPerLevel)·MAX 상한·음수 방어를 커버한다.
void main() {
  group('applyXpGain — 레벨업 계산', () {
    test('임계 미만이면 레벨은 그대로, XP만 누적된다', () {
      // 알 단계(Lv1)는 레벨당 5 XP. 3을 더해도 5 미만이라 레벨 유지.
      final r = applyXpGain(level: 1, xp: 0, gained: 3);
      expect(r.level, 1);
      expect(r.xp, 3);
    });

    test('기존 XP 위에 누적되어 임계 직전까지 찬다', () {
      final r = applyXpGain(level: 1, xp: 2, gained: 2);
      expect(r.level, 1);
      expect(r.xp, 4); // 4 < 5
    });

    test('정확히 임계에 닿으면 레벨 +1, XP 0으로 이월된다', () {
      // 알 단계 5 XP를 정확히 채우면 Lv2로 오르고 남는 XP는 0.
      final r = applyXpGain(level: 1, xp: 0, gained: 5);
      expect(r.level, 2);
      expect(r.xp, 0);
    });

    test('임계를 초과하면 레벨 +1, 남은 XP가 이월된다', () {
      // 5로 레벨업하고 2가 남는다.
      final r = applyXpGain(level: 1, xp: 0, gained: 7);
      expect(r.level, 2);
      expect(r.xp, 2);
    });

    test('한 번의 큰 XP로 여러 레벨이 오른다', () {
      // 알 단계 5 XP/레벨. 20을 넣으면 5씩 4번 = Lv1 → Lv5, 남는 XP 0.
      final r = applyXpGain(level: 1, xp: 0, gained: 20);
      expect(r.level, 5);
      expect(r.xp, 0);
    });

    test('여러 레벨 상승 후 남은 XP도 이월된다', () {
      // 22 = 5*4(→Lv5) + 2. 남는 XP 2.
      final r = applyXpGain(level: 1, xp: 0, gained: 22);
      expect(r.level, 5);
      expect(r.xp, 2);
    });

    test('진화 경계: 알(Lv9, 5/레벨)에서 참새(Lv10, 10/레벨)로 넘어가며 임계가 전환된다', () {
      // Lv9는 알(5 XP). 5를 채우면 Lv10(참새)로 오른다. 이후 임계는 10.
      // Lv9 xp0 + 5 → 정확히 Lv10, xp0.
      final r = applyXpGain(level: 9, xp: 0, gained: 5);
      expect(r.level, 10);
      expect(r.xp, 0);
      expect(stageOf(r.level).name, '참새');
      expect(stageOf(r.level).xpPerLevel, 10);
    });

    test('진화 경계를 넘어 다음 단계 임계까지 소비한다', () {
      // Lv9 xp0에서 15 획득: 알 5로 Lv10(참새) → 남은 10은 참새 임계 10과 같아
      // Lv11로 한 번 더, 남는 XP 0. 단계별 임계가 5→10으로 바뀌는 걸 확인.
      final r = applyXpGain(level: 9, xp: 0, gained: 15);
      expect(r.level, 11);
      expect(r.xp, 0);
    });

    test('진화 경계에서 임계 차이로 남는 XP가 정확하다', () {
      // Lv9 xp0 + 12: 알 5 → Lv10, 남은 7은 참새 임계 10 미만이라 그대로 이월.
      final r = applyXpGain(level: 9, xp: 0, gained: 12);
      expect(r.level, 10);
      expect(r.xp, 7);
    });

    test('MAX 상한: Lv50 도달 후 추가 XP는 레벨·XP를 올리지 않는다', () {
      // 이미 MAX면 어떤 XP가 와도 Lv50 유지, 레벨 내 XP는 0으로 고정.
      final r = applyXpGain(level: kMaxLevel, xp: 0, gained: 100);
      expect(r.level, kMaxLevel);
      expect(r.xp, 0);
    });

    test('MAX 직전에서 큰 XP가 들어와도 Lv50에서 멈추고 XP는 0이다', () {
      // Lv49 이펙트독수리(80/레벨). 넘치는 XP를 넣어도 Lv50에서 상한, 잔여 XP 버림.
      final r = applyXpGain(level: 49, xp: 0, gained: 1000);
      expect(r.level, kMaxLevel);
      expect(r.xp, 0);
      // MAX면 환생 가능.
      final user = AppUser(uid: 'u', level: r.level, xp: r.xp);
      expect(user.canRebirth, isTrue);
      expect(user.levelProgress, 1);
    });

    test('음수 gained는 XP를 깎지 않는다 (오염 방어)', () {
      final r = applyXpGain(level: 3, xp: 4, gained: -100);
      expect(r.level, 3);
      expect(r.xp, 4);
    });

    test('레벨이 범위를 벗어나 있어도 clamp되어 계산된다', () {
      // 저장 오류로 Lv0이 들어와도 1로 올려 계산한다.
      final r = applyXpGain(level: 0, xp: 0, gained: 5);
      expect(r.level, 2); // Lv1로 clamp 후 5 채워 Lv2.
      expect(r.xp, 0);
    });
  });
}
