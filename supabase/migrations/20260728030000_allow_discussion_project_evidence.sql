alter table public.analysis_evidence
  drop constraint analysis_evidence_type_valid;

alter table public.analysis_evidence
  add constraint analysis_evidence_type_valid
  check (
    evidence_type in (
      'commit',
      'pull_request',
      'issue',
      'discussion',
      'project',
      'file',
      'config',
      'release'
    )
  );
