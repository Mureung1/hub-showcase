export type ReportDevice =
  | Readonly<{ coldLoadMs: number; status: 'measured' }>
  | Readonly<{ reason: string; status: 'not measured' }>;

export type BrowserBenchmarkReportInput = Readonly<{
  android: ReportDevice;
  desktop: ReportDevice;
}>;

export function renderBrowserBenchmarkReport(
  result: BrowserBenchmarkReportInput
): string {
  return [
    '# 브라우저 E5 벤치마크',
    '',
    '실제 브라우저에서 측정한 값만 기록합니다. Node 실행 수치로 대체하지 않습니다.',
    '',
    '## 측정 상태',
    '',
    '| 기기 | 상태 | cold load | 미측정 사유 |',
    '| --- | --- | ---: | --- |',
    formatDeviceRow('Desktop Chrome', result.desktop),
    formatDeviceRow('Android Chrome', result.android),
    '',
  ].join('\n');
}

function formatDeviceRow(name: string, device: ReportDevice): string {
  if (device.status === 'measured') {
    return `| ${name} | 측정 완료 | ${device.coldLoadMs} ms | - |`;
  }

  return `| ${name} | 미측정 | - | ${device.reason} |`;
}
