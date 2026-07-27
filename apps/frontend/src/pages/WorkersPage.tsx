import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth, useMe } from "../features/auth";
import { cancelInvitation, createInvitation } from "../features/invitation";
import { updateWorker, useWorkers } from "../features/worker";
import type { Worker } from "../features/worker";
import { getSelectedStoreId } from "../shared/utils";

const optionalTimeSchema = z
  .string()
  .trim()
  .refine((value) => value === "" || /^([01]\d|2[0-3]):[0-5]\d$/.test(value), {
    message: "시간은 HH:mm 형식으로 입력해주세요."
  });

const optionalWageSchema = z
  .string()
  .trim()
  .refine((value) => value === "" || Number(value) >= 0, {
    message: "시급은 0 이상이어야 합니다."
  });

const inviteSchema = z
  .object({
    inviteeEmail: z.string().trim().email("초대할 이메일을 입력해주세요."),
    hourlyWage: optionalWageSchema,
    defaultWorkStartTime: optionalTimeSchema,
    defaultWorkEndTime: optionalTimeSchema
  })
  .refine(
    (value) =>
      !value.defaultWorkStartTime ||
      !value.defaultWorkEndTime ||
      value.defaultWorkEndTime > value.defaultWorkStartTime,
    {
      message: "기본 종료 시간은 시작 시간보다 늦어야 합니다.",
      path: ["defaultWorkEndTime"]
    }
  );

const workerSettingsSchema = z
  .object({
    hourlyWage: optionalWageSchema,
    defaultWorkStartTime: optionalTimeSchema,
    defaultWorkEndTime: optionalTimeSchema
  })
  .refine(
    (value) =>
      !value.defaultWorkStartTime ||
      !value.defaultWorkEndTime ||
      value.defaultWorkEndTime > value.defaultWorkStartTime,
    {
      message: "기본 종료 시간은 시작 시간보다 늦어야 합니다.",
      path: ["defaultWorkEndTime"]
    }
  );

type InviteFormValues = z.infer<typeof inviteSchema>;
type WorkerSettingsFormValues = z.infer<typeof workerSettingsSchema>;

function toOptionalNumber(value: string) {
  return value.trim() === "" ? null : Number(value);
}

function toOptionalTime(value: string) {
  return value.trim() === "" ? null : value.trim();
}

function formatTime(value: string | null) {
  return value ? value.slice(0, 5) : "";
}

function formatWage(value: number | null) {
  return value === null ? "" : String(value);
}

type WorkerSettingsFormProps = {
  accessToken: string;
  storeId: string;
  worker: Worker;
};

function WorkerSettingsForm({ accessToken, storeId, worker }: WorkerSettingsFormProps) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register
  } = useForm<WorkerSettingsFormValues>({
    resolver: zodResolver(workerSettingsSchema),
    defaultValues: {
      hourlyWage: formatWage(worker.hourlyWage),
      defaultWorkStartTime: formatTime(worker.defaultWorkStartTime),
      defaultWorkEndTime: formatTime(worker.defaultWorkEndTime)
    }
  });

  const onSubmit = handleSubmit(async (values) => {
    setMessage("");
    setErrorMessage("");

    try {
      await updateWorker(accessToken, storeId, worker.userId, {
        hourlyWage: toOptionalNumber(values.hourlyWage),
        defaultWorkStartTime: toOptionalTime(values.defaultWorkStartTime),
        defaultWorkEndTime: toOptionalTime(values.defaultWorkEndTime)
      });
      await queryClient.invalidateQueries({ queryKey: ["workers", storeId] });
      await queryClient.invalidateQueries({ queryKey: ["payrollSummary", storeId] });
      setMessage("저장되었습니다.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "알바생 정보 수정에 실패했습니다.");
    }
  });

  return (
    <form className="worker-settings-form" onSubmit={onSubmit}>
      <label>
        <span>시급</span>
        <input inputMode="decimal" type="number" min="0" step="10" {...register("hourlyWage")} />
        {errors.hourlyWage ? <strong>{errors.hourlyWage.message}</strong> : null}
      </label>
      <label>
        <span>기본 시작</span>
        <input type="time" {...register("defaultWorkStartTime")} />
        {errors.defaultWorkStartTime ? <strong>{errors.defaultWorkStartTime.message}</strong> : null}
      </label>
      <label>
        <span>기본 종료</span>
        <input type="time" {...register("defaultWorkEndTime")} />
        {errors.defaultWorkEndTime ? <strong>{errors.defaultWorkEndTime.message}</strong> : null}
      </label>
      <button className="secondary-button" disabled={isSubmitting} type="submit">
        {isSubmitting ? "저장 중" : "저장"}
      </button>
      {message ? <p className="form-success">{message}</p> : null}
      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
    </form>
  );
}

export function WorkersPage() {
  const { session } = useAuth();
  const { data: me, isLoading: isMeLoading } = useMe();
  const selectedStoreId = getSelectedStoreId();
  const selectedStore = me?.stores.find((store) => store.id === selectedStoreId);
  const isOwner = selectedStore?.role === "OWNER";
  const workersQuery = useWorkers(selectedStoreId, isOwner);
  const queryClient = useQueryClient();
  const [inviteErrorMessage, setInviteErrorMessage] = useState("");
  const [inviteSuccessMessage, setInviteSuccessMessage] = useState("");
  const accessToken = session?.access_token ?? "";

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset
  } = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      inviteeEmail: "",
      hourlyWage: "",
      defaultWorkStartTime: "",
      defaultWorkEndTime: ""
    }
  });

  const cancelMutation = useMutation({
    mutationFn: (invitationId: string) => {
      if (!selectedStoreId) {
        throw new Error("선택된 매장이 없습니다.");
      }

      return cancelInvitation(accessToken, selectedStoreId, invitationId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["workers", selectedStoreId] });
      await queryClient.invalidateQueries({ queryKey: ["payrollSummary", selectedStoreId] });
    }
  });

  const onInviteSubmit = handleSubmit(async (values) => {
    setInviteErrorMessage("");
    setInviteSuccessMessage("");

    if (!selectedStoreId) {
      setInviteErrorMessage("선택된 매장이 없습니다.");
      return;
    }

    try {
      await createInvitation(accessToken, selectedStoreId, {
        inviteeEmail: values.inviteeEmail,
        hourlyWage: toOptionalNumber(values.hourlyWage),
        defaultWorkStartTime: toOptionalTime(values.defaultWorkStartTime),
        defaultWorkEndTime: toOptionalTime(values.defaultWorkEndTime)
      });
      await queryClient.invalidateQueries({ queryKey: ["workers", selectedStoreId] });
      reset();
      setInviteSuccessMessage("초대를 등록했습니다.");
    } catch (error) {
      setInviteErrorMessage(error instanceof Error ? error.message : "초대 등록에 실패했습니다.");
    }
  });

  if (isMeLoading) {
    return (
      <main className="dashboard">
        <section className="page-panel">
          <p className="label">WORKERS</p>
          <h1>알바생 정보를 확인 중</h1>
        </section>
      </main>
    );
  }

  if (!selectedStoreId || !selectedStore) {
    return (
      <main className="dashboard">
        <section className="page-panel">
          <p className="label">WORKERS</p>
          <h1>매장을 먼저 선택해주세요.</h1>
        </section>
      </main>
    );
  }

  if (!isOwner) {
    return (
      <main className="dashboard">
        <section className="page-panel">
          <p className="label">WORKERS</p>
          <h1>사장님만 접근할 수 있습니다.</h1>
          <div className="empty-state">
            <strong>알바생 초대와 정보 관리는 사장님 권한이 필요합니다.</strong>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="dashboard workers-dashboard">
      <section className="page-panel workers-panel">
        <div>
          <p className="label">WORKERS</p>
          <h1>알바생 관리</h1>
        </div>

        <form className="worker-invite-form" onSubmit={onInviteSubmit}>
          <label>
            <span>초대 이메일</span>
            <input autoComplete="email" type="email" {...register("inviteeEmail")} />
            {errors.inviteeEmail ? <strong>{errors.inviteeEmail.message}</strong> : null}
          </label>
          <label>
            <span>시급</span>
            <input inputMode="decimal" type="number" min="0" step="10" {...register("hourlyWage")} />
            {errors.hourlyWage ? <strong>{errors.hourlyWage.message}</strong> : null}
          </label>
          <label>
            <span>기본 시작</span>
            <input type="time" {...register("defaultWorkStartTime")} />
            {errors.defaultWorkStartTime ? <strong>{errors.defaultWorkStartTime.message}</strong> : null}
          </label>
          <label>
            <span>기본 종료</span>
            <input type="time" {...register("defaultWorkEndTime")} />
            {errors.defaultWorkEndTime ? <strong>{errors.defaultWorkEndTime.message}</strong> : null}
          </label>
          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? "초대 중" : "초대 등록"}
          </button>
          {inviteSuccessMessage ? <p className="form-success">{inviteSuccessMessage}</p> : null}
          {inviteErrorMessage ? <p className="form-error">{inviteErrorMessage}</p> : null}
        </form>

        {workersQuery.isLoading ? (
          <div className="empty-state">
            <strong>알바생 목록을 불러오는 중입니다.</strong>
          </div>
        ) : null}

        {workersQuery.error ? (
          <p className="form-error">
            {workersQuery.error instanceof Error ? workersQuery.error.message : "알바생 목록을 불러오지 못했습니다."}
          </p>
        ) : null}

        <section className="worker-section" aria-labelledby="worker-list-title">
          <h2 id="worker-list-title">소속 알바생</h2>
          {workersQuery.data?.workers.length ? (
            <div className="worker-list">
              {workersQuery.data.workers.map((worker) => (
                <article className="worker-card" key={worker.userId}>
                  <div className="worker-card-head">
                    <div>
                      <strong>{worker.name}</strong>
                      <span>{worker.email}</span>
                    </div>
                    <p className="badge">알바생</p>
                  </div>
                  <WorkerSettingsForm accessToken={accessToken} storeId={selectedStoreId} worker={worker} />
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>아직 소속된 알바생이 없습니다.</strong>
              <span>이메일로 초대를 등록하면 알바생이 수락 후 매장에 소속됩니다.</span>
            </div>
          )}
        </section>

        <section className="worker-section" aria-labelledby="invitation-list-title">
          <h2 id="invitation-list-title">대기 중 초대</h2>
          {workersQuery.data?.invitations.length ? (
            <div className="worker-list">
              {workersQuery.data.invitations.map((invitation) => (
                <article className="invitation-card" key={invitation.id}>
                  <div>
                    <strong>{invitation.inviteeEmail}</strong>
                    <span>
                      {invitation.hourlyWage === null ? "시급 미입력" : `${invitation.hourlyWage.toLocaleString()}원`}
                      {" · "}
                      {formatTime(invitation.defaultWorkStartTime) || "--:--"}-
                      {formatTime(invitation.defaultWorkEndTime) || "--:--"}
                    </span>
                  </div>
                  <button
                    className="secondary-button"
                    disabled={cancelMutation.isPending}
                    onClick={() => cancelMutation.mutate(invitation.id)}
                    type="button"
                  >
                    취소
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>대기 중인 초대가 없습니다.</strong>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
