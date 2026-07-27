/**
 * API가 신청기간 대신 자유 텍스트("예산 소진시까지" 등)를 주는 경우의 dday sentinel.
 * 정렬(deadline 오름차순) 시 날짜가 명확한 공고보다 뒤로 밀리도록 큰 값을 쓴다.
 * crawler(생성)와 client(표시) 양쪽이 같은 값을 참조해야 해서 shared에 둔다.
 */
export const NO_DEADLINE_DDAY = 9999
