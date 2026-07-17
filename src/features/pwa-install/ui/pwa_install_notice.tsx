import { Button } from '@/shared/ui';

import './pwa_install_notice.css';

export type PwaInstallNoticeProps = Readonly<{
  isPrompting: boolean;
  onDismiss(): void;
  onInstall(): Promise<void> | void;
}>;

export function PwaInstallNotice({
  isPrompting,
  onDismiss,
  onInstall,
}: PwaInstallNoticeProps) {
  return (
    <section
      aria-labelledby="pwa-install-notice-title"
      className="pwa-install-notice"
    >
      <div className="pwa-install-notice__copy">
        <h2 id="pwa-install-notice-title">더 빠르게 저장하기</h2>
        <p>
          아맞다를 홈 화면에 설치하면 Android 공유 메뉴에서 바로 열 수 있어요.
        </p>
      </div>
      <div className="pwa-install-notice__actions">
        <Button
          disabled={isPrompting}
          hierarchy="primary"
          onClick={() => void onInstall()}
          type="button"
        >
          {isPrompting ? '설치 중' : '설치하기'}
        </Button>
        <Button
          disabled={isPrompting}
          hierarchy="ghost"
          onClick={onDismiss}
          type="button"
        >
          나중에
        </Button>
      </div>
    </section>
  );
}
