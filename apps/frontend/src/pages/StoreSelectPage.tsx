import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useAuth, useMe } from "../features/auth";
import { createStore } from "../features/store";
import { ApiError } from "../shared/api";

const createStoreSchema = z.object({
  name: z.string().trim().min(1, "매장명을 입력해주세요."),
  address: z.string().trim().optional()
});

const completeProfileSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력해주세요.")
});

type CreateStoreFormValues = z.infer<typeof createStoreSchema>;
type CompleteProfileFormValues = z.infer<typeof completeProfileSchema>;

const SELECTED_STORE_ID_KEY = "selectedStoreId";

export function StoreSelectPage() {
  const { retryProfileCreation, session, signOut, user } = useAuth();
  const { data: me, error: meError, isLoading: isMeLoading } = useMe();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState("");
  const [profileErrorMessage, setProfileErrorMessage] = useState("");

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
    if (!me?.stores) {
      return;
    }

    const selectedStoreId = localStorage.getItem(SELECTED_STORE_ID_KEY);
    const hasSelectedStore = me.stores.some((store) => store.id === selectedStoreId);

    if (selectedStoreId && !hasSelectedStore) {
      localStorage.removeItem(SELECTED_STORE_ID_KEY);
    }

    if (!selectedStoreId && me.stores.length === 1) {
      localStorage.setItem(SELECTED_STORE_ID_KEY, me.stores[0].id);
    }
  }, [me?.stores]);

  const handleStoreSelect = (storeId: string) => {
    localStorage.setItem(SELECTED_STORE_ID_KEY, storeId);
    navigate("/schedule");
  };

  const onProfileSubmit = handleProfileSubmit(async (values) => {
    setProfileErrorMessage("");

    try {
      await retryProfileCreation(values.name);
      await queryClient.invalidateQueries({ queryKey: ["me", user?.id] });
    } catch (error) {
      setProfileErrorMessage(error instanceof Error ? error.message : "프로필 생성에 실패했습니다.");
    }
  });

  const onSubmit = handleSubmit(async (values) => {
    setErrorMessage("");

    const accessToken = session?.access_token;

    if (!accessToken) {
      setErrorMessage("로그인 세션을 확인할 수 없습니다.");
      return;
    }

    try {
      const response = await createStore(accessToken, {
        name: values.name,
        address: values.address || undefined
      });

      localStorage.setItem(SELECTED_STORE_ID_KEY, response.store.id);
      await queryClient.invalidateQueries({ queryKey: ["me", user?.id] });
      navigate("/schedule", { replace: true });
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

          <div className="empty-state">
            <strong>프로필 생성이 필요합니다.</strong>
            <span>{user?.email}</span>
          </div>

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
          <h1>정보를 불러오지 못했습니다</h1>
          <p className="form-error">{meError instanceof Error ? meError.message : "다시 시도해주세요."}</p>
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

        {me?.stores.length ? (
          <div className="store-list" aria-label="소속 매장 목록">
            {me.stores.map((store) => (
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
          <div className="empty-state">
            <strong>아직 소속된 매장이 없습니다.</strong>
            <span>매장을 만들거나 사장님의 초대를 받아야 합니다.</span>
          </div>
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
