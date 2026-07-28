import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useAuth, useMe } from "../features/auth";
import { acceptInvitation, usePendingInvitations } from "../features/invitation";
import { createStore, useStores } from "../features/store";
import { ApiError } from "../shared/api";
import { StatusNotice } from "../shared/components";
import { ROUTES } from "../shared/routes";
import { clearSelectedStoreId, getSelectedStoreId, setSelectedStoreId } from "../shared/utils";

const createStoreSchema = z.object({
  name: z.string().trim().min(1, "매장명을 입력해주세요."),
  address: z.string().trim().optional()
});

const completeProfileSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력해주세요.")
});

type CreateStoreFormValues = z.infer<typeof createStoreSchema>;
type CompleteProfileFormValues = z.infer<typeof completeProfileSchema>;

function formatTime(value: string | null) {
  return value ? value.slice(0, 5) : "";
}

export function StoreSelectPage() {
  const { retryProfileCreation, session, signOut, user } = useAuth();
  const { error: meError, isLoading: isMeLoading } = useMe();
  const { data: storesResponse, error: storesError, isLoading: isStoresLoading } = useStores();
  const {
    data: pendingInvitationsResponse,
    error: pendingInvitationsError,
    isLoading: isPendingInvitationsLoading
  } = usePendingInvitations();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState("");
  const [profileErrorMessage, setProfileErrorMessage] = useState("");
  const [acceptErrorMessage, setAcceptErrorMessage] = useState("");
  const stores = storesResponse?.stores ?? [];
  const pendingInvitations = pendingInvitationsResponse?.invitations ?? [];
  const accessToken = session?.access_token ?? "";

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register
  } = useForm<CreateStoreFormValues>({
    resolver: zodResolver(createStoreSchema),
    defaultValues: {
      name: "",
      address: ""
    }
  });

  const {
    formState: { errors: profileErrors, isSubmitting: isProfileSubmitting },
    handleSubmit: handleProfileSubmit,
    register: registerProfile
  } = useForm<CompleteProfileFormValues>({
    resolver: zodResolver(completeProfileSchema),
    defaultValues: {
      name: ""
    }
  });

  const isProfileMissing = meError instanceof ApiError && meError.code === "PROFILE_NOT_FOUND";

  useEffect(() => {
    if (!storesResponse) {
      return;
    }

    const selectedStoreId = getSelectedStoreId();
    const hasSelectedStore = stores.some((store) => store.id === selectedStoreId);

    if (selectedStoreId && !hasSelectedStore) {
      clearSelectedStoreId();
    }

    if (!selectedStoreId && stores.length === 1) {
      setSelectedStoreId(stores[0].id);
    }
  }, [stores, storesResponse]);

  const acceptInvitationMutation = useMutation({
    mutationFn: (invitationId: string) => acceptInvitation(accessToken, invitationId),
    onSuccess: async (response) => {
      setSelectedStoreId(response.store.id);
      await queryClient.invalidateQueries({ queryKey: ["me", user?.id] });
      await queryClient.invalidateQueries({ queryKey: ["stores", user?.id] });
      await queryClient.invalidateQueries({ queryKey: ["pendingInvitations", user?.id] });
      navigate(ROUTES.schedule, { replace: true });
    },
    onError: (error) => {
      setAcceptErrorMessage(error instanceof Error ? error.message : "초대 수락에 실패했습니다.");
    }
  });

  const handleStoreSelect = (storeId: string) => {
    setSelectedStoreId(storeId);
    navigate(ROUTES.schedule);
  };

  const onProfileSubmit = handleProfileSubmit(async (values) => {
    setProfileErrorMessage("");

    try {
      await retryProfileCreation(values.name);
      await queryClient.invalidateQueries({ queryKey: ["me", user?.id] });
      await queryClient.invalidateQueries({ queryKey: ["stores", user?.id] });
      await queryClient.invalidateQueries({ queryKey: ["pendingInvitations", user?.id] });
    } catch (error) {
      setProfileErrorMessage(error instanceof Error ? error.message : "프로필 생성에 실패했습니다.");
    }
  });

  const onSubmit = handleSubmit(async (values) => {
    setErrorMessage("");

    if (!accessToken) {
      setErrorMessage("로그인 세션을 확인할 수 없습니다.");
      return;
    }

    try {
      const response = await createStore(accessToken, {
        name: values.name,
        address: values.address || undefined
      });

      setSelectedStoreId(response.store.id);
      await queryClient.invalidateQueries({ queryKey: ["me", user?.id] });
      await queryClient.invalidateQueries({ queryKey: ["stores", user?.id] });
      navigate(ROUTES.schedule, { replace: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "매장 생성에 실패했습니다.");
    }
  });

  if (isMeLoading) {
    return (
      <main className="auth-stage">
        <section className="auth-card store-select-card">
          <p className="label">STORE</p>
          <h1>매장 정보를 확인 중</h1>
        </section>
      </main>
    );
  }

  if (isProfileMissing) {
    return (
      <main className="auth-stage">
        <section className="auth-card store-select-card" aria-labelledby="profile-complete-title">
          <div className="auth-heading">
            <p className="label">PROFILE</p>
            <h1 id="profile-complete-title">프로필 완료</h1>
          </div>

          <StatusNotice description={user?.email} title="프로필 생성이 필요합니다." variant="info" />

          <form className="auth-form store-form" onSubmit={onProfileSubmit}>
            <label>
              <span>이름</span>
              <input autoComplete="name" type="text" {...registerProfile("name")} />
              {profileErrors.name ? <strong>{profileErrors.name.message}</strong> : null}
            </label>

            {profileErrorMessage ? <p className="form-error">{profileErrorMessage}</p> : null}

            <button className="primary-button" disabled={isProfileSubmitting} type="submit">
              {isProfileSubmitting ? "생성 중" : "프로필 생성"}
            </button>
          </form>

          <div className="auth-actions-row">
            <button className="text-button" onClick={() => void signOut()} type="button">
              로그아웃
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (meError) {
    return (
      <main className="auth-stage">
        <section className="auth-card store-select-card">
          <p className="label">STORE</p>
          <h1>사용자 정보를 불러오지 못했습니다.</h1>
          <p className="form-error">{meError instanceof Error ? meError.message : "다시 시도해주세요."}</p>
        </section>
      </main>
    );
  }

  if (isStoresLoading || isPendingInvitationsLoading) {
    return (
      <main className="auth-stage">
        <section className="auth-card store-select-card">
          <p className="label">STORE</p>
          <h1>매장 목록을 확인 중</h1>
        </section>
      </main>
    );
  }

  if (storesError) {
    return (
      <main className="auth-stage">
        <section className="auth-card store-select-card">
          <p className="label">STORE</p>
          <h1>매장 목록을 불러오지 못했습니다.</h1>
          <p className="form-error">{storesError instanceof Error ? storesError.message : "다시 시도해주세요."}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-stage">
      <section className="auth-card store-select-card" aria-labelledby="store-select-title">
        <div className="auth-heading">
          <p className="label">STORE</p>
          <h1 id="store-select-title">매장 선택</h1>
        </div>

        {pendingInvitations.length ? (
          <section className="store-invitation-section" aria-labelledby="pending-invitation-title">
            <h2 id="pending-invitation-title">받은 초대</h2>
            <div className="store-list">
              {pendingInvitations.map((invitation) => (
                <article className="store-list-item" key={invitation.id}>
                  <div>
                    <strong>{invitation.store.name}</strong>
                    <span>
                      {invitation.hourlyWage === null ? "시급 미입력" : `${invitation.hourlyWage.toLocaleString()}원`}
                      {" · "}
                      {formatTime(invitation.defaultWorkStartTime) || "--:--"}-
                      {formatTime(invitation.defaultWorkEndTime) || "--:--"}
                    </span>
                  </div>
                  <button
                    className="secondary-button"
                    disabled={acceptInvitationMutation.isPending}
                    onClick={() => {
                      setAcceptErrorMessage("");
                      acceptInvitationMutation.mutate(invitation.id);
                    }}
                    type="button"
                  >
                    수락
                  </button>
                </article>
              ))}
            </div>
            {acceptErrorMessage ? <p className="form-error">{acceptErrorMessage}</p> : null}
          </section>
        ) : null}

        {pendingInvitationsError ? (
          <p className="form-error">
            {pendingInvitationsError instanceof Error
              ? pendingInvitationsError.message
              : "받은 초대를 불러오지 못했습니다."}
          </p>
        ) : null}

        {stores.length ? (
          <div className="store-list" aria-label="소속 매장 목록">
            {stores.map((store) => (
              <article className="store-list-item" key={store.id}>
                <div>
                  <strong>{store.name}</strong>
                  <span>{store.address ?? "주소 미입력"}</span>
                </div>
                <div className="store-list-actions">
                  <p className="badge">{store.role === "OWNER" ? "사장님" : "알바생"}</p>
                  <button className="secondary-button" onClick={() => handleStoreSelect(store.id)} type="button">
                    선택
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <StatusNotice
            description="사장님이라면 매장을 만들고, 알바생이라면 사장님의 초대를 받은 뒤 다시 확인해주세요."
            title="소속된 매장이 없습니다."
          />
        )}

        <form className="auth-form store-form" onSubmit={onSubmit}>
          <label>
            <span>매장명</span>
            <input autoComplete="organization" type="text" {...register("name")} />
            {errors.name ? <strong>{errors.name.message}</strong> : null}
          </label>

          <label>
            <span>주소</span>
            <input autoComplete="street-address" type="text" {...register("address")} />
            {errors.address ? <strong>{errors.address.message}</strong> : null}
          </label>

          {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? "생성 중" : "매장 생성"}
          </button>
        </form>

        <div className="auth-actions-row">
          <button className="text-button" onClick={() => void signOut()} type="button">
            로그아웃
          </button>
        </div>
      </section>
    </main>
  );
}
