import type { ProjectReport } from './projectReport';

// getFullProjectReport()의 집계 데이터를 사람이 읽는 리포트 마크다운으로 변환한다.
// analysisMarkdown.ts(분석 요청용 원본 MD)와는 목적이 다르다 — 이건 분석 "결과" 리포트다.
export function buildReportMarkdown(report: ProjectReport): string {
  const { project, hypotheses } = report;

  const hypothesesSection = hypotheses
    .map((h) => {
      const vr = h.verification_result;

      const evidenceList = h.evidence_tags
        .map((tag, i) => {
          const speaker = tag.speaker || '화자 미상';
          const interview = tag.interviewee_name ? ` (${tag.interviewee_name} 인터뷰)` : '';
          const badge = tag.badge_label ? `[${tag.badge_label}] ` : '';
          return `${i + 1}. ${badge}"${tag.quote}" — ${speaker}${interview}`;
        })
        .join('\n');

      const verificationSection = vr
        ? `${vr.summary}

**수정 방향성:** ${vr.direction || '-'}

**핵심 근거:** ${vr.key_evidence || '-'}`
        : '_아직 분석 근거가 없습니다._';

      return `### 가설 ${h.display_index + 1}: ${h.cause} → ${h.effect}

- 검증 상태: ${h.verification_status}
- 판단: ${h.status}

${verificationSection}

${evidenceList ? `**근거 목록**\n\n${evidenceList}` : ''}`;
    })
    .join('\n\n---\n\n');

  return `# ${project.title}

## 문제 정의

${project.problem_definition}

## 가설별 검증 결과

${hypothesesSection}
`;
}
