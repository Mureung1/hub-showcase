// 전체(모든 사용자 합산) 일일 사용량 상한.
//
// IP 단위 제한은 X-Forwarded-For 위조나 IP 로테이션으로 우회할 수 있어서, Gemini 쿼터를
// 실제로 지켜주는 건 이쪽이다. 공개 URL에 올라가는 데모라 "누가 쓰든 하루 N회까지"라는
// 절대 상한을 두어 비용이 예측 가능하게 만든다.
//
// 인스턴스 메모리에만 저장한다 — Render 무료 티어는 단일 인스턴스이고, 슬립/재배포로
// 프로세스가 죽으면 카운터도 초기화된다. 정확한 회계가 아니라 폭주 방지가 목적이므로
// 이 정도로 충분하다(외부 저장소를 붙이면 관리 비용이 목적에 비해 커진다).

export interface DailyQuota {
  consume(): { allowed: boolean; remaining: number };
  usage(): { used: number; max: number };
}

// UTC 기준 날짜 문자열. 서버 타임존에 관계없이 하루 경계가 일정하도록 UTC로 고정한다.
function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function createDailyQuota(params: { max: number; now?: () => Date }): DailyQuota {
  const { max, now = () => new Date() } = params;

  let currentDay = dayKey(now());
  let used = 0;

  function rolloverIfNeeded(): void {
    const today = dayKey(now());
    if (today !== currentDay) {
      currentDay = today;
      used = 0;
    }
  }

  return {
    consume() {
      rolloverIfNeeded();

      // 거부된 호출은 세지 않는다. 세어버리면 상한 초과 후 들어온 요청들이 사용량을
      // 계속 밀어올려 usage() 값이 실제 처리량을 반영하지 못한다.
      if (used >= max) {
        return { allowed: false, remaining: 0 };
      }

      used += 1;
      return { allowed: true, remaining: max - used };
    },

    usage() {
      rolloverIfNeeded();
      return { used, max };
    },
  };
}
