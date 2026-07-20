import { describe, expect, it } from 'vitest';

import type { CapturedInsight } from '@/entities/insight';

import {
  createAndroidShareSession,
  reduceShareSession,
  type AndroidShareInput,
} from './android_share_session';

const share: AndroidShareInput = {
  id: 'share-1',
  text: '공유 링크 https://example.com/article',
  title: '공유 제목',
};

const insight: CapturedInsight = {
  category: null,
  createdAt: '2026-07-21T00:00:00.000Z',
  domain: 'example.com',
  id: 'insight-1',
  memo: null,
  normalizedUrl: 'https://example.com/article',
  originalUrl: 'https://example.com/article',
  title: '저장된 제목',
  titleOrigin: 'capture',
  updatedAt: '2026-07-21T00:00:00.000Z',
};

function receiveShare() {
  return reduceShareSession(createAndroidShareSession(), share).session;
}

function startSaving() {
  return reduceShareSession(receiveShare(), { type: 'saving-started' }).session;
}

describe('Android 공유 메모리 세션', () => {
  it('같은 공유 id는 한 번만 수신한다', () => {
    const received = receiveShare();

    const transition = reduceShareSession(received, share);

    expect(transition.effect).toBe('ignore');
    expect(transition.session).toBe(received);
  });

  it('서로 다른 공유 id를 33개 수신해도 최근 id는 32개만 보관한다', () => {
    let session = createAndroidShareSession();

    for (let index = 1; index <= 33; index += 1) {
      session = reduceShareSession(session, {
        id: `share-${index}`,
        text: `https://example.com/${index}`,
      }).session;
    }

    expect(session.receivedShareIds).toHaveLength(32);
    expect(session.receivedShareIds).toEqual(
      Array.from({ length: 32 }, (_value, index) => `share-${index + 2}`)
    );
    expect(
      reduceShareSession(session, {
        id: 'share-33',
        text: 'https://example.com/33',
      }).effect
    ).toBe('ignore');
  });

  it('URL이 없는 공유는 서버 호출 없이 재공유 오류 상태가 된다', () => {
    const transition = reduceShareSession(createAndroidShareSession(), {
      id: 'share-without-url',
      text: '링크가 없는 일반 텍스트',
    });

    expect(transition.effect).toBe('none');
    expect(transition.session.state).toEqual({
      status: 'error',
      message: '저장할 링크를 찾지 못했어요.',
      retry: 'share',
    });
  });

  it('지원하지 않는 프로토콜은 재공유 오류 상태가 된다', () => {
    const transition = reduceShareSession(createAndroidShareSession(), {
      id: 'ftp-share',
      text: 'ftp://example.com/archive',
    });

    expect(transition.effect).toBe('none');
    expect(transition.session.state).toEqual({
      status: 'error',
      message: 'http 또는 https 링크만 저장할 수 있어요.',
      retry: 'share',
    });
  });

  it('인증을 시작하고 완료되면 같은 메모리 공유를 저장으로 재개한다', () => {
    const authenticating = reduceShareSession(receiveShare(), {
      type: 'authentication-started',
    });
    const saving = reduceShareSession(authenticating.session, {
      type: 'authentication-resumed',
    });

    expect(authenticating.effect).toBe('authenticate');
    expect(authenticating.session.state).toMatchObject({
      status: 'authenticating',
      share,
      url: 'https://example.com/article',
    });
    expect(saving.effect).toBe('capture');
    expect(saving.session.state).toMatchObject({
      status: 'saving',
      share,
      url: 'https://example.com/article',
    });
  });

  it('인증 완료 후 공유 메모리가 없으면 재공유 오류 상태가 된다', () => {
    const transition = reduceShareSession(createAndroidShareSession(), {
      type: 'authentication-resumed',
    });

    expect(transition.session.state).toEqual({
      status: 'error',
      message: '로그인은 완료됐지만 링크를 다시 받아야 해요.',
      retry: 'share',
    });
  });

  it.each([
    ['saved', true],
    ['duplicate', false],
  ] as const)('캡처 결과 %s는 메모 대상을 보존한다', (status, created) => {
    const transition = reduceShareSession(startSaving(), {
      type: 'capture-succeeded',
      created,
      insight,
    });

    expect(transition.session.state).toEqual({ status, insight });
  });

  it('캡처 실패는 메모리 pending을 보존한 저장 재시도 오류가 된다', () => {
    const transition = reduceShareSession(startSaving(), {
      type: 'capture-failed',
    });

    expect(transition.session.state).toEqual({
      status: 'error',
      message: '지금은 저장하지 못했어요.',
      retry: 'save',
      pending: {
        share,
        url: 'https://example.com/article',
      },
    });
  });

  it('저장 결과에서 메모 편집을 거쳐 완료 상태로 전이한다', () => {
    const saved = reduceShareSession(startSaving(), {
      type: 'capture-succeeded',
      created: true,
      insight,
    }).session;
    const editing = reduceShareSession(saved, {
      type: 'memo-editing-started',
    });
    const changed = reduceShareSession(editing.session, {
      type: 'memo-changed',
      memo: '나중에 다시 읽기',
    });
    const completed = reduceShareSession(changed.session, { type: 'completed' });

    expect(changed.session.state).toEqual({
      status: 'editing-memo',
      insight,
      memo: '나중에 다시 읽기',
    });
    expect(completed.session.state).toEqual({ status: 'completed' });
  });
});
