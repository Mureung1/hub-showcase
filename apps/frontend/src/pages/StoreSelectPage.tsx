import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "../features/auth";
import { createStore } from "../features/store";

const createStoreSchema = z.object({
  name: z.string().trim().min(1, "매장명을 입력해주세요."),
  address: z.string().trim().optional()
});

type CreateStoreFormValues = z.infer<typeof createStoreSchema>;

const SELECTED_STORE_ID_KEY = "selectedStoreId";

export function StoreSelectPage() {
  const { session, signOut, user } = useAuth();
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState("");

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
      navigate("/schedule", { replace: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "매장 생성에 실패했습니다.");
    }
  });

  return (
    <main className="auth-stage">
      <section className="auth-card store-select-card" aria-labelledby="store-select-title">
        <div className="auth-heading">
          <p className="label">STORE</p>
          <h1 id="store-select-title">매장 선택</h1>
        </div>

        <div className="empty-state">
          <strong>매장을 만들거나 초대를 받아야 합니다.</strong>
          <span>{user?.email}</span>
        </div>

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
