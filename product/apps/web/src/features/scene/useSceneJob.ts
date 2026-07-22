import { useEffect, useState } from "react";

import { createSceneJob, loadSceneJob, retrySceneJob, type SceneJob } from "./sceneApi";

const POLLABLE_STATUSES = new Set<SceneJob["status"]>(["queued", "running"]);

export function useSceneJob() {
  const [job, setJob] = useState<SceneJob | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const jobId = job?.id;
  const jobStatus = job?.status;

  useEffect(() => {
    if (!jobId || !jobStatus || !POLLABLE_STATUSES.has(jobStatus)) return;
    const controller = new AbortController();
    const poll = () =>
      void loadSceneJob(jobId, controller.signal)
        .then(setJob)
        .catch((pollError: unknown) => {
          if (!controller.signal.aborted) {
            setError(
              pollError instanceof Error ? pollError.message : "작업 상태를 확인할 수 없습니다.",
            );
          }
        });
    const timer = window.setInterval(poll, 2_000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [jobId, jobStatus]);

  async function submit(form: FormData) {
    setSubmitting(true);
    setError(null);
    try {
      setJob(await createSceneJob(form));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "업로드에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function retry() {
    if (!job) return;
    setError(null);
    try {
      setJob(await retrySceneJob(job.id));
    } catch (retryError) {
      setError(
        retryError instanceof Error ? retryError.message : "작업을 다시 시작할 수 없습니다.",
      );
    }
  }

  return { error, job, retry, setError, submit, submitting };
}
