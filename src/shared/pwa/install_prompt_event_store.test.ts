import { describe, expect, it, vi } from 'vitest';

import {
  createInstallPromptEventStore,
  type BeforeInstallPromptEvent,
} from './install_prompt_event_store';

describe('설치 프롬프트 이벤트 저장소', () => {
  it('구독 전 발생한 설치 이벤트를 보관하고 브라우저 기본 UI를 막는다', () => {
    const target = new EventTarget();
    const store = createInstallPromptEventStore();
    const promptEvent = createBeforeInstallPromptEvent();
    const preventDefault = vi.spyOn(promptEvent, 'preventDefault');

    store.start(target);
    target.dispatchEvent(promptEvent);

    expect(preventDefault).toHaveBeenCalledOnce();
    expect(store.getSnapshot()).toEqual({
      installed: false,
      prompt: promptEvent,
    });
  });

  it('같은 대상에서 중복 start 호출을 무시한다', () => {
    const target = new EventTarget();
    const addEventListener = vi.spyOn(target, 'addEventListener');
    const store = createInstallPromptEventStore();

    store.start(target);
    store.start(target);

    expect(addEventListener).toHaveBeenCalledTimes(2);
    expect(addEventListener.mock.calls.map(([type]) => type)).toEqual([
      'beforeinstallprompt',
      'appinstalled',
    ]);
  });

  it('변경을 구독자에게 알리고 구독 해제 뒤에는 알리지 않는다', () => {
    const target = new EventTarget();
    const store = createInstallPromptEventStore();
    const listener = vi.fn();
    store.start(target);
    const unsubscribe = store.subscribe(listener);

    target.dispatchEvent(createBeforeInstallPromptEvent());
    expect(listener).toHaveBeenCalledOnce();

    unsubscribe();
    target.dispatchEvent(createBeforeInstallPromptEvent());
    expect(listener).toHaveBeenCalledOnce();
  });

  it('prompt를 원자적으로 꺼내고 다음 변경 전까지 snapshot을 유지한다', () => {
    const target = new EventTarget();
    const store = createInstallPromptEventStore();
    const promptEvent = createBeforeInstallPromptEvent();
    const listener = vi.fn();
    store.start(target);
    store.subscribe(listener);
    const initialSnapshot = store.getSnapshot();

    expect(store.getSnapshot()).toBe(initialSnapshot);
    target.dispatchEvent(promptEvent);
    const promptSnapshot = store.getSnapshot();
    expect(store.getSnapshot()).toBe(promptSnapshot);

    expect(store.takePrompt()).toBe(promptEvent);
    expect(store.getSnapshot()).toEqual({
      installed: false,
      prompt: undefined,
    });
    expect(store.getSnapshot()).not.toBe(promptSnapshot);
    expect(store.takePrompt()).toBeUndefined();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('discardPrompt가 보관한 prompt만 제거한다', () => {
    const target = new EventTarget();
    const store = createInstallPromptEventStore();
    const listener = vi.fn();
    store.start(target);
    store.subscribe(listener);
    target.dispatchEvent(createBeforeInstallPromptEvent());

    store.discardPrompt();
    const discardedSnapshot = store.getSnapshot();
    expect(discardedSnapshot).toEqual({
      installed: false,
      prompt: undefined,
    });

    store.discardPrompt();
    expect(store.getSnapshot()).toBe(discardedSnapshot);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('appinstalled에서 prompt를 제거하고 설치 완료를 알린다', () => {
    const target = new EventTarget();
    const store = createInstallPromptEventStore();
    const listener = vi.fn();
    store.start(target);
    store.subscribe(listener);
    target.dispatchEvent(createBeforeInstallPromptEvent());

    target.dispatchEvent(new Event('appinstalled'));

    expect(store.getSnapshot()).toEqual({
      installed: true,
      prompt: undefined,
    });
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

function createBeforeInstallPromptEvent(): BeforeInstallPromptEvent {
  return Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt: vi.fn().mockResolvedValue(undefined),
    userChoice: Promise.resolve({
      outcome: 'dismissed',
      platform: '',
    } as const),
  });
}
