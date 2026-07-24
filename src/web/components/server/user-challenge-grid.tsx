import type { UserChallengeCardDto } from '../../dto/challenge';
import { EmptyState } from '../empty-state';
import { UserChallengeCard } from './user-challenge-card';
export function UserChallengeGrid({ items }: { items: readonly UserChallengeCardDto[] }) { return items.length ? <div className="grid challenge-grid">{items.map((item) => <UserChallengeCard key={item.challengeId} challenge={item} />)}</div> : <EmptyState title="조건에 맞는 챌린지가 없어요" body="검색어 또는 모집 상태를 바꿔 보세요." /> }
