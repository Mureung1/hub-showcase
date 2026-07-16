grant select, insert, update, delete
on table
  public.repositories,
  public.analysis_results,
  public.contributor_metrics,
  public.analysis_evidence
to service_role;

revoke all
on table
  public.repositories,
  public.analysis_results,
  public.contributor_metrics,
  public.analysis_evidence
from anon, authenticated;
