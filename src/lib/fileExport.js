// 텍스트 파일 저장을 3개 환경(PC 웹 / 모바일 웹 / APK)에 걸쳐 하나의 함수로 통일한다(PRD v2.0 FR-2.1).
// CSV 내보내기 경로들은 전부 여기만 부르고 플랫폼을 직접 판단하지 않는다.
//
// 왜 필요한가: 안드로이드 웹뷰(Capacitor)는 `<a download>` + blob URL 다운로드를 처리하지 않아서,
// 웹에서 잘 되던 내보내기가 앱에서는 아무 반응 없이 끝난다(무반응 = PRD가 금지하는 silent fail).
// 그래서 네이티브에서는 @capacitor/filesystem으로 실제 파일을 쓰고 @capacitor/share로 공유 시트를 띄운다.
//
// @capacitor/filesystem·share는 네이티브에서만 동적 import한다 — 웹 번들에서는 이 두 청크가 로드되지
// 않아 초기 로딩에 영향을 주지 않는다(externalLink.js가 @capacitor/browser를 다루는 방식과 동일).
import { getPlatform, PLATFORM } from '../utils/platform.js'

// 엑셀이 UTF-8 CSV를 시스템 기본 인코딩(한국어 윈도우면 CP949)으로 잘못 읽어 한글이 깨지는 걸 막는
// 바이트 순서 표식. 파일 맨 앞에 이 문자 하나가 있으면 엑셀이 UTF-8로 인식한다(저장된 파일을 헥스
// 뷰어로 열면 EF BB BF로 시작해야 한다).
export const UTF8_BOM = '﻿'

// PRD FR-2.1: 한글 파일명은 일부 환경에서 깨질 수 있어 영문 고정. 날짜는 로컬(KST) 기준으로 만든다 —
// toISOString()은 UTC라 자정 직후에 하루 전 날짜가 찍힌다.
export function todayFileStamp(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function downloadInBrowser(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// 네이티브 저장. 공용 Documents 폴더("내 파일 > Documents")를 먼저 시도하고, 실패하면(기기/안드로이드
// 버전에 따라 저장소 정책이 달라 막힐 수 있다) 앱 전용 캐시 폴더로 떨어뜨린 뒤 공유 시트로 사용자가
// 원하는 곳에 저장하게 한다 — 어느 쪽이든 "저장 안 됨"으로 조용히 끝나지 않는다.
async function saveOnNative(filename, content) {
  const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem')

  const attempts = [
    { directory: Directory.Documents, label: 'Documents 폴더' },
    { directory: Directory.Cache, label: '앱 임시 폴더' },
  ]

  let lastError = null
  for (const { directory, label } of attempts) {
    try {
      await Filesystem.writeFile({
        path: filename,
        data: content,
        directory,
        encoding: Encoding.UTF8,
        recursive: true,
      })
      const { uri } = await Filesystem.getUri({ directory, path: filename })
      return { uri, label, isPublic: directory === Directory.Documents }
    } catch (err) {
      lastError = err
    }
  }

  throw new Error(`파일을 저장하지 못했어요. (${lastError?.message ?? '알 수 없는 오류'})`)
}

// 저장된 파일의 공유 시트를 띄운다. 사용자가 시트를 그냥 닫는 것은 실패가 아니므로 조용히 넘긴다 —
// 파일은 이미 저장돼 있고, 호출부는 저장 성공 메시지를 이미 보여준 뒤이기 때문이다.
async function shareFile(uri, title) {
  try {
    const { Share } = await import('@capacitor/share')
    await Share.share({ title, url: uri, dialogTitle: title })
    return true
  } catch {
    return false
  }
}

// 텍스트를 파일로 저장한다. 반환값 { platform, message, uri, share } —
//   message: 그대로 토스트에 띄울 수 있는 완료 문구(환경별로 다르다)
//   share  : 네이티브에서만 채워지는 "공유 시트 열기" 함수(없으면 null)
// 실패하면 사용자에게 보여줄 문구를 담아 throw한다(무반응 금지).
export async function saveTextFile({ filename, content, mimeType = 'text/csv;charset=utf-8;', withBom = true }) {
  const platform = getPlatform()
  const data = withBom ? UTF8_BOM + content : content

  if (platform !== PLATFORM.APK) {
    downloadInBrowser(filename, data, mimeType)
    return {
      platform,
      uri: null,
      share: null,
      message:
        platform === PLATFORM.MOBILE_WEB
          ? '다운로드 폴더에 저장되었습니다.'
          : `다운로드 폴더에 저장되었습니다. (${filename})`,
    }
  }

  const { uri, label, isPublic } = await saveOnNative(filename, data)
  return {
    platform,
    uri,
    share: () => shareFile(uri, filename),
    message: isPublic
      ? `${label}에 저장되었습니다. (${filename})`
      : `${label}에 저장했어요. 공유하기로 원하는 위치에 옮겨주세요.`,
  }
}
