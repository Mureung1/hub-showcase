import { useId, useRef, useState } from 'react';
import { Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { searchBooks } from '@/lib/api';

export function AddBookDialog({ open, onOpenChange, onCreateBook }) {
  const queryId = useId();
  const initialPageId = useId();
  const searchRequestId = useRef(0);
  const finalFocusRef = useRef(null);
  const wasOpenRef = useRef(open);
  if (open && !wasOpenRef.current && typeof document !== 'undefined') {
    finalFocusRef.current = document.activeElement;
  }
  wasOpenRef.current = open;
  const [draft, setDraft] = useState({ query: '', providerId: '', initialPage: '1' });
  const [results, setResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  function resetDialog() {
    searchRequestId.current += 1;
    setDraft({ query: '', providerId: '', initialPage: '1' });
    setResults([]);
    setHasSearched(false);
    setErrors({});
    setSubmitError('');
    setIsSearching(false);
    setIsSaving(false);
  }

  function handleOpenChange(nextOpen) {
    if (!nextOpen && isSaving) return;
    onOpenChange(nextOpen);
    if (!nextOpen) resetDialog();
  }

  async function handleSearch() {
    const query = draft.query.trim();
    if (!query) {
      setErrors({ query: '책 이름을 입력해 주세요.' });
      return;
    }

    setIsSearching(true);
    const requestId = ++searchRequestId.current;
    setResults([]);
    setHasSearched(false);
    setDraft((current) => ({ ...current, providerId: '' }));
    setErrors({});
    setSubmitError('');

    try {
      const response = await searchBooks(query);
      if (requestId !== searchRequestId.current) return;
      setResults(response.books ?? []);
      setHasSearched(true);
    } catch (requestError) {
      if (requestId === searchRequestId.current) setSubmitError(requestError.message);
    } finally {
      if (requestId === searchRequestId.current) setIsSearching(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const initialPage = Number(draft.initialPage);
    const nextErrors = {};

    if (!draft.providerId) {
      nextErrors.query = '검색 결과에서 책을 선택해 주세요.';
    }

    if (!Number.isInteger(initialPage) || initialPage < 1) {
      nextErrors.initialPage = '1 이상의 페이지를 입력해 주세요.';
    }

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setIsSaving(true);
    setSubmitError('');

    try {
      await onCreateBook({ providerId: draft.providerId, initialPage });
      onOpenChange(false);
      resetDialog();
    } catch (requestError) {
      setSubmitError(requestError.message);
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="add-book-dialog" showCloseButton={false} finalFocus={finalFocusRef}>
        <DialogHeader className="add-book-dialog__header">
          <p className="section-kicker">ADD A BOOK</p>
          <DialogTitle>읽고 있는 책을 꽂아볼까요?</DialogTitle>
          <DialogDescription>
            책 이름으로 검색한 뒤, 읽고 있는 판본을 골라 주세요. 마지막 갈피는 읽은 뒤에 남길 수 있어요.
          </DialogDescription>
        </DialogHeader>

        <form className="add-book-dialog__form" onSubmit={handleSubmit} noValidate>
          <div className="field-group">
            <Label htmlFor={queryId}>책 이름</Label>
            <div className="book-search__input-row">
              <Input
                id={queryId}
                name="query"
                value={draft.query}
                onChange={(event) => {
                  searchRequestId.current += 1;
                  setIsSearching(false);
                  setDraft((current) => ({ ...current, query: event.target.value, providerId: '' }));
                  setResults([]);
                  setHasSearched(false);
                  if (errors.query && event.target.value.trim()) {
                    setErrors((current) => ({ ...current, query: undefined }));
                  }
                }}
                placeholder="예: 아주 작은 습관의 힘"
                autoFocus
                required
                aria-invalid={Boolean(errors.query)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleSearch();
                  }
                }}
                onBlur={() => {
                  if (!draft.query.trim()) setErrors((current) => ({ ...current, query: '책 이름을 입력해 주세요.' }));
                }}
              />
              <Button type="button" variant="outline" onClick={handleSearch} disabled={isSearching || isSaving}>
                <Search aria-hidden="true" size={16} />
                {isSearching ? '검색 중…' : '검색'}
              </Button>
            </div>
            {errors.query && <p className="field-error" role="alert">{errors.query}</p>}
          </div>
          {results.length > 0 && (
            <div className="book-search__results" role="listbox" aria-label="책 검색 결과">
              {results.map((book) => (
                <button
                  key={book.providerId}
                  className={`book-search__result ${draft.providerId === book.providerId ? 'book-search__result--selected' : ''}`}
                  type="button"
                  role="option"
                  aria-selected={draft.providerId === book.providerId}
                  onClick={() => {
                    setDraft((current) => ({ ...current, providerId: book.providerId }));
                    setErrors((current) => ({ ...current, query: undefined }));
                  }}
                >
                  <strong>{book.title}</strong>
                  <span>{book.author || '저자 정보 없음'}</span>
                  <small>
                    {[book.publishedDate, book.isbn13 || book.isbn10, book.pageCount ? `${book.pageCount}쪽` : null]
                      .filter(Boolean)
                      .join(' · ') || '판본 정보가 적어요'}
                  </small>
                </button>
              ))}
            </div>
          )}
          {!isSearching && hasSearched && !results.length && !submitError && (
            <p className="field-help" role="status">검색 결과가 없어요. 다른 책 이름으로 다시 검색해 주세요.</p>
          )}
          <div className="field-group field-group--page">
            <Label htmlFor={initialPageId}>시작 페이지</Label>
            <Input
              id={initialPageId}
              name="initialPage"
              type="number"
              min="1"
              inputMode="numeric"
              value={draft.initialPage}
              onChange={(event) => {
                setDraft((current) => ({ ...current, initialPage: event.target.value }));
                if (errors.initialPage && Number.isInteger(Number(event.target.value)) && Number(event.target.value) >= 1) {
                  setErrors((current) => ({ ...current, initialPage: undefined }));
                }
              }}
              aria-invalid={Boolean(errors.initialPage)}
            />
            {errors.initialPage ? (
              <p className="field-error" role="alert">{errors.initialPage}</p>
            ) : (
              <p className="field-help">처음부터 읽는다면 1쪽 그대로 두면 돼요.</p>
            )}
          </div>
          {submitError && <p className="field-error" role="alert">{submitError}</p>}

          <div className="add-book-dialog__actions">
            <DialogClose render={<Button type="button" variant="outline" disabled={isSaving} />}>
              취소
            </DialogClose>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? '책장에 꽂는 중이에요…' : '책장에 꽂기'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
