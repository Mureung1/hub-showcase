import type { FormEvent } from 'react';
import { Link } from 'lucide-react';

import type { InsightCategory } from '@/entities/insight';
import {
  Button,
  CategoryTag,
  StatusMessage,
  TextArea,
  TextField,
} from '@/shared/ui';

export type SavePageProps = {
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  onSaveCompleteChange: (value: boolean) => void;
  onUrlChange: (value: string) => void;
  saveComplete: boolean;
  saveUrl: string;
  suggestedCategories: InsightCategory[];
};

export function SavePage({
  onSave,
  onSaveCompleteChange,
  onUrlChange,
  saveComplete,
  saveUrl,
  suggestedCategories,
}: SavePageProps) {
  return (
    <>
      <section className="tip-banner" aria-label="화면 안내">
        <strong data-role="section-message-content-title">저장</strong>
        <p>
          URL만 저장해도 보관함에 먼저 들어가고, 정리는 나중에 해도 괜찮아요.
        </p>
      </section>

      <main className="board" aria-label="저장 화면">
        <section className="save-board" aria-labelledby="save-title">
          <div className="save-card">
            <p className="eyebrow">링크 저장</p>
            <h2 id="save-title">URL만 넣고 바로 보관해요</h2>
            <p>
              저장 전 미리보기 없이 먼저 보관하고, 카테고리와 메모는 선택적으로
              남깁니다.
            </p>

            <form className="save-form" onSubmit={onSave}>
              <label htmlFor="save-url">링크 URL</label>
              <TextField
                id="save-url"
                onChange={(event) => {
                  onUrlChange(event.currentTarget.value);
                  onSaveCompleteChange(false);
                }}
                placeholder="https://example.com/article"
                type="url"
                value={saveUrl}
                width="100%"
              />
              <Button
                fullWidth
                hierarchy="primary"
                leadingContent={<Link aria-hidden="true" />}
                size="medium"
                type="submit"
              >
                저장하기
              </Button>
            </form>
          </div>

          {saveComplete ? (
            <div className="save-followup">
              <StatusMessage title="저장 완료" variant="success">
                <p>필요하면 카테고리와 메모를 가볍게 붙여두세요.</p>
              </StatusMessage>
              <div className="situation-row" aria-label="추천 카테고리">
                {suggestedCategories.map((category) => (
                  <CategoryTag
                    className={`suggestion-chip chip-${category.tone}`}
                    key={category.name}
                    tone={category.tone}
                  >
                    {category.name}
                  </CategoryTag>
                ))}
              </div>
              <label htmlFor="save-memo">메모</label>
              <TextArea
                id="save-memo"
                minRows={3}
                placeholder="나중에 왜 다시 볼지 짧게 남겨두기"
                rows={3}
                width="100%"
              />
              <Button hierarchy="secondary" size="medium" type="button">
                그냥 저장
              </Button>
            </div>
          ) : null}
        </section>
      </main>
    </>
  );
}
