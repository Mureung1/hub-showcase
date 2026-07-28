import { useEffect, useRef, useState } from "react";
import { signOut } from "firebase/auth";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
} from "react-router";
import { useAuth } from "../auth/authContext";
import {
  deleteRecipe,
  getRecipeDetail,
  getRecipes,
  structureRecipe,
} from "../api/recipeApi";
import RecipeInputForm from "../components/RecipeInputForm";
import RecipeDetailView from "../components/RecipeDetailView";
import { firebaseAuth } from "../firebase";
import TransferInvitationPage from "./TransferInvitationPage";

const filters = [
  { id: "all", label: "모든 레시피" },
  { id: "owned", label: "내가 등록한" },
  { id: "received", label: "전달받은" },
];

const typeLabels = {
  OWNED: "직접 작성",
  EXTERNAL: "외부 출처",
  RECEIVED: "전달받음",
};

function matchesFilter(recipe, filterId) {
  if (filterId === "owned") {
    return recipe.type === "OWNED" || recipe.type === "EXTERNAL";
  }

  return filterId !== "received" || recipe.type === "RECEIVED";
}

function RecipeListPlaceholderPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { recipeId } = useParams();
  const [recipes, setRecipes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [loadVersion, setLoadVersion] = useState(0);
  const [recipeDetail, setRecipeDetail] = useState(null);
  const [cookingModeRecipe, setCookingModeRecipe] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const isLogoutPendingRef = useRef(false);
  const isAddingRecipe = location.pathname === "/recipes/new";
  const isTransferInvitationDialog =
    location.pathname === "/transfer-invitations";
  const isShowingRightPage = isAddingRecipe || Boolean(recipeId);
  const isCookingMode =
    recipeDetail !== null &&
    recipeDetail.id === recipeId &&
    cookingModeRecipe === recipeDetail;

  useEffect(() => {
    let isCancelled = false;

    async function loadRecipes() {
      if (!user) {
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const idToken = await user.getIdToken();
        const userRecipes = await getRecipes(idToken);

        if (!isCancelled) {
          setRecipes(userRecipes);
        }
      } catch (requestError) {
        if (!isCancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "레시피를 불러오지 못했습니다.",
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadRecipes();

    return () => {
      isCancelled = true;
    };
  }, [loadVersion, user]);

  useEffect(() => {
    let isCancelled = false;

    async function loadRecipeDetail() {
      if (!user || !recipeId) {
        setRecipeDetail(null);
        setIsDetailLoading(false);
        setDetailError("");
        return;
      }

      setRecipeDetail(null);
      setIsDetailLoading(true);
      setDetailError("");

      try {
        const idToken = await user.getIdToken();
        const detail = await getRecipeDetail(idToken, recipeId);

        if (!isCancelled) {
          setRecipeDetail(detail);
        }
      } catch (requestError) {
        if (!isCancelled) {
          setRecipeDetail(null);
          setDetailError(
            requestError instanceof Error
              ? requestError.message
              : "레시피 상세를 불러오지 못했습니다.",
          );
        }
      } finally {
        if (!isCancelled) {
          setIsDetailLoading(false);
        }
      }
    }

    void loadRecipeDetail();

    return () => {
      isCancelled = true;
    };
  }, [recipeId, user]);

  const filteredRecipes = recipes.filter((recipe) =>
    matchesFilter(recipe, activeFilter),
  );

  function handleOpenTransferCode() {
    navigate("/transfer-invitations");
  }

  function handleCloseTransferCode() {
    navigate("/recipes/new");
  }

  function handleOpenRecipeInput() {
    navigate("/recipes/new");
  }

  function handleCloseRecipeInput() {
    navigate("/recipes")
  }

  async function handleLogout() {
    if (isLogoutPendingRef.current) {
      return;
    }

    isLogoutPendingRef.current = true;
    setIsLoggingOut(true);
    setLogoutError("");

    try {
      await signOut(firebaseAuth);
      navigate("/", { replace: true });
    } catch {
      setLogoutError("로그아웃에 실패했어요. 다시 시도해 주세요.");
    } finally {
      isLogoutPendingRef.current = false;
      setIsLoggingOut(false);
    }
  }

  async function handlePrepareRecipe(recipeInput) {
    if (!user) {
      throw new Error("로그인 정보를 확인할 수 없습니다.");
    }

    const idToken = await user.getIdToken();
    const structuredRecipe = await structureRecipe(idToken, recipeInput);

    navigate("/recipes/draft", {
      state: structuredRecipe,
    });
  }

  async function handleDeleteRecipe() {
    if (!user) {
      throw new Error("로그인 정보를 확인할 수 없습니다.");
    }

    const idToken = await user.getIdToken();
    await deleteRecipe(idToken, recipeId);
    setRecipes((currentRecipes) =>
      currentRecipes.filter((recipe) => recipe.id !== recipeId),
    );
    navigate("/recipes", { replace: true });
  }

  return (
    <main className="grid h-dvh grid-rows-[minmax(0,1fr)] place-items-stretch overflow-hidden bg-[radial-gradient(circle_at_50%_30%,#faf9f4,#e8e7e2_55%,#d7d6d1)] p-2.5 font-[Noto_Serif_KR,Nanum_Myeongjo,Malgun_Gothic,serif] text-[#272923] max-[700px]:flex max-[700px]:flex-col max-[700px]:p-0">
      <header
        className="hidden h-14 shrink-0 items-center gap-3 bg-[#15332a] bg-[url(/design-assets/cookbook/leather-texture-tile.png)] bg-center bg-size-[240px] px-4.5 text-base text-[#eed08b] max-[700px]:flex"
        inert={
          isTransferInvitationDialog || isCookingMode || undefined
        }
        aria-hidden={
          isTransferInvitationDialog || isCookingMode || undefined
        }
      >
        <span aria-hidden="true">☰</span>
        <span>나만의 레시피북</span>
        {logoutError ? (
          <p
            className="ml-auto max-w-32 text-right text-[11px] leading-tight text-[#ffd9cf]"
            role="alert"
          >
            {logoutError}
          </p>
        ) : null}
        <button
          type="button"
          className={`${logoutError ? "" : "ml-auto"} min-h-10 shrink-0 rounded-md border border-[#aa8c4b] px-2.5 text-xs text-[#f3e1b4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e3c580] disabled:cursor-wait disabled:opacity-70`}
          aria-busy={isLoggingOut}
          disabled={isLoggingOut}
          onClick={handleLogout}
        >
          {isLoggingOut ? "로그아웃 중" : "로그아웃"}
        </button>
      </header>

      <div
        className="relative grid min-h-0 w-full min-w-0 max-w-[1580px] justify-self-center grid-cols-[186px_minmax(0,1fr)] overflow-hidden p-[36px_25px] drop-shadow-[0_11px_8px_rgb(21_25_20/0.3)] isolate before:pointer-events-none before:absolute before:inset-0 before:z-[-2] before:border-49 before:border-transparent before:[border-image:url(/design-assets/cookbook/leather-frame-9slice.png)_96_fill_stretch] before:content-[''] after:pointer-events-none after:absolute after:inset-[24px_28px_22px] after:z-[-1] after:rounded-[9px] after:bg-[#163229] after:bg-[url(/design-assets/cookbook/leather-texture-tile.png)] after:bg-center after:bg-size-[440px] after:shadow-[inset_0_0_28px_#06120e] after:content-[''] min-[1101px]:px-7.75 max-[1100px]:grid-cols-[155px_minmax(0,1fr)] max-[1100px]:pr-5 max-[700px]:flex-1 max-[700px]:grid-cols-1 max-[700px]:bg-[#15332a] max-[700px]:bg-[url(/design-assets/cookbook/leather-texture-tile.png)] max-[700px]:bg-center max-[700px]:bg-size-[300px] max-[700px]:p-3 max-[700px]:drop-shadow-none max-[700px]:before:hidden max-[700px]:after:hidden short-screen:py-7"
        inert={isTransferInvitationDialog || undefined}
        aria-hidden={isTransferInvitationDialog || undefined}
      >
        <aside
          className="flex h-full min-h-0 flex-col items-center overflow-hidden bg-[linear-gradient(90deg,transparent,#102b23_18%,#102b23_82%,transparent)] px-2.5 pb-6.5 pt-11.25 text-[#e3c580] max-[700px]:hidden short-screen:pt-7.5"
          inert={isCookingMode || undefined}
          aria-hidden={isCookingMode || undefined}
        >
          <div className="text-center text-[21px] leading-normal tracking-[0.08em]">
            <img
              src="/design-assets/cookbook/gold-book-emblem.png"
              alt="펼쳐진 책 금박 문양"
              className="mx-auto mb-1.5 block h-15.25 w-19.5 object-contain"
            />
            <strong className="font-medium">
              나만의
              <br />
              레시피북
            </strong>
          </div>
          <nav className="mt-7.5 grid w-full gap-1.25 short-screen:mt-5 short-screen:gap-0.5" aria-label="주 메뉴">
            <button type="button" className="min-h-13.25 rounded-lg border border-[#aa8c4b] bg-[rgb(213_178_101/8%)] px-3.25 text-left text-base text-[#eed08b] short-screen:min-h-10.75" disabled>
              레시피북
            </button>
            <button
              type="button"
              className="min-h-13.25 rounded-lg border border-transparent px-3.25 text-left text-base text-[#eed08b] hover:bg-[rgb(255_244_204/7%)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e3c580] short-screen:min-h-10.75"
              onClick={handleOpenTransferCode}
            >
              전달 코드
            </button>
          </nav>
          <div className="mt-2 grid w-[calc(100%-10px)] gap-px border-t border-[rgb(220_193_126/32%)] pt-2" aria-label="레시피북 필터">
            {filters.map((filter) => {
              const isActive = activeFilter === filter.id;
              const count = recipes.filter((recipe) =>
                matchesFilter(recipe, filter.id),
              ).length;

              return (
                <button
                  key={filter.id}
                  type="button"
                  className={`flex min-h-7.25 items-center justify-between rounded px-2 text-xs text-[#d8d2bd] hover:bg-[rgb(255_244_204/7%)] ${isActive ? "bg-[rgb(255_244_204/7%)]" : ""}`}
                  aria-pressed={isActive}
                  onClick={() => setActiveFilter(filter.id)}
                >
                  <span>{filter.label}</span>
                  <small className="text-[11px] text-[#e7c981]">{count}</small>
                </button>
              );
            })}
          </div>
          <div className="mt-auto w-[calc(100%-10px)] border-t border-[rgb(220_193_126/32%)] pt-3">
            {logoutError ? (
              <p
                className="mb-2 text-xs leading-relaxed text-[#ffd9cf]"
                role="alert"
              >
                {logoutError}
              </p>
            ) : null}
            <button
              type="button"
              className="min-h-9 w-full rounded-md border border-[#aa8c4b] px-2.5 text-xs text-[#f3e1b4] hover:bg-[rgb(255_244_204/7%)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e3c580] disabled:cursor-wait disabled:opacity-70"
              aria-busy={isLoggingOut}
              disabled={isLoggingOut}
              onClick={handleLogout}
            >
              {isLoggingOut ? "로그아웃 중" : "로그아웃"}
            </button>
          </div>
        </aside>

        <div className="grid min-h-0 min-w-0 grid-cols-2 drop-shadow-[0_3px_3px_rgb(44_35_20/0.23)] max-[1100px]:grid-cols-1 max-[700px]:block max-[700px]:h-full">
          <section
            className={`min-w-0 overflow-hidden rounded-l-[3px] bg-[#f8f5eb] bg-[radial-gradient(circle_at_30%_40%,rgb(255_255_255/85%),transparent_60%)] shadow-[inset_-12px_0_23px_-20px_#4f3a20] min-[1101px]:shadow-[inset_-12px_0_23px_-20px_#4f3a20,-3px_0_0_#f1ece1,-6px_0_0_#d8cfbd] max-[700px]:h-full
    max-[700px]:rounded-[5px] ${isShowingRightPage ? "max-[1100px]:hidden" : "max-[700px]:block"
              }`}
            inert={isCookingMode || undefined}
            aria-hidden={isCookingMode || undefined}
          >
            <div className="relative h-full overflow-y-auto p-[50px_46px_120px_36px] max-[700px]:p-[25px_22px_84px] short-screen:p-[30px_34px_92px]">
              <header>
                <h1 className="mb-3.25 text-[31px] font-semibold tracking-[0.09em] max-[700px]:mb-2 max-[700px]:text-[25px] short-screen:mb-2 short-screen:text-[26px]">
                  {user?.displayName ?? "나"}의 레시피북
                </h1>
              </header>

              <div className="mt-4.25 hidden gap-1.5 overflow-x-auto max-[700px]:flex" aria-label="레시피 필터">
                {filters.map((filter) => {
                  const isActive = activeFilter === filter.id;

                  return (
                    <button
                      key={filter.id}
                      type="button"
                      className={`shrink-0 rounded-full border px-2.5 py-1.75 text-[11px] ${isActive ? "border-[#aa8c4b] bg-[#15332a] text-[#f3e1b4]" : "border-[#d5cdbb] text-[#626157]"}`}
                      aria-pressed={isActive}
                      onClick={() => setActiveFilter(filter.id)}
                    >
                      {filter.label}
                    </button>
                  );
                })}
              </div>

              {isLoading ? (
                <p className="mt-6.75 border border-dashed border-[#c9bea7] px-4.5 py-9 text-center text-[13px] text-[#626157]" role="status">
                  레시피를 불러오는 중입니다.
                </p>
              ) : null}

              {!isLoading && error ? (
                <div className="mt-6.75 rounded-[9px] border border-[#c79181] bg-[#fcf1ed] p-4.5">
                  <p className="text-[13px] text-[#7f3c29]">{error}</p>
                  <button type="button" className="mt-3 rounded-md bg-[#15332a] px-3 py-2 text-[#f3e1b4]" onClick={() => setLoadVersion((value) => value + 1)}>
                    다시 시도
                  </button>
                </div>
              ) : null}

              {!isLoading && !error && filteredRecipes.length === 0 ? (
                <div className="mt-6.75 border border-dashed border-[#c9bea7] px-4.5 py-9 text-center text-[13px] text-[#626157]">
                  <h2 className="mb-2.5 text-[18px] font-medium text-[#272923]">아직 레시피가 없습니다.</h2>
                  <p className="leading-[1.6]">첫 레시피 추가 화면은 다음 단계에서 연결됩니다.</p>
                </div>
              ) : null}

              {!isLoading && !error && filteredRecipes.length > 0 ? (
                <div className="mt-6.75 border-t border-[#c9bea7] max-[700px]:mt-3">
                  {filteredRecipes.map((recipe) => {
                    const sourceOrRelationship =
                      recipe.source?.title ??
                      recipe.source?.url ??
                      recipe.receivedInfo?.senderDisplayName ??
                      null;

                    return (
                      <Link key={recipe.id} to={`/recipes/${recipe.id}`} className="flex min-h-28 justify-between gap-4 border-b border-[#d8cfbd] pb-4 pl-2.5 pt-5.5 hover:bg-[#f1ece1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#15332a] max-[700px]:min-h-19 max-[700px]:gap-2.5 max-[700px]:px-0 max-[700px]:py-3 short-screen:min-h-23 short-screen:py-3.5">
                        <div className="min-w-0">
                          <h2 className="mb-2.25 text-[22px] font-medium max-[700px]:mb-1.25 max-[700px]:text-[17px] short-screen:mb-1.5 short-screen:text-[19px]">{recipe.title}</h2>
                          {recipe.description ? <p className="mb-3 text-[11px] leading-normal text-[#777469] max-[700px]:text-[10px]">{recipe.description}</p> : null}
                          <div className="flex gap-2.5 text-[11px] text-[#68675e] max-[700px]:text-[10px]">
                            <span>{typeLabels[recipe.type]}</span>
                            {sourceOrRelationship ? <span>{sourceOrRelationship}</span> : null}
                          </div>
                        </div>
                        <time className="self-center whitespace-nowrap text-[11px] text-[#68675e] max-[700px]:text-[10px]" dateTime={recipe.createdAt}>
                          {new Date(recipe.createdAt).toLocaleDateString("ko-KR")}
                        </time>
                      </Link>
                    );
                  })}
                </div>
              ) : null}
              {!isAddingRecipe ? (
                <button
                  type="button"
                  className="absolute bottom-7.5 left-1/2 h-13.5 -translate-x-1/2 whitespace-nowrap rounded-[9px] border border-[#061c16] bg-[#15332a] bg-[url(/design-assets/cookbook/leather-texture-tile.png)] bg-center bg-size-[220px] px-7.25 text-[#f3e1b4] max-[700px]:bottom-4.5 max-[700px]:h-11.5 short-screen:bottom-5.5 short-screen:h-11.75"
                  onClick={handleOpenRecipeInput}
                >
                  새 레시피 기록
                </button>
              ) : null}
            </div>
          </section>

          <section
            className={`min-w-0 overflow-hidden rounded-r bg-[#f8f5eb] bg-[radial-gradient(circle_at_30%_40%,rgb(255_255_255/85%),transparent_60%)] shadow-[inset_15px_0_26px_-24px_#3f2d17] min-[1101px]:shadow-[inset_15px_0_26px_-24px_#3f2d17,3px_0_0_#f1ece1,6px_0_0_#d8cfbd] ${isShowingRightPage
              ? "max-[1100px]:block max-[1100px]:h-full max-[700px]:rounded-[5px]"
              : "max-[1100px]:hidden"
              }`}
            aria-label="오른쪽 레시피 페이지"
          >
            {isAddingRecipe ? (
              <div className="h-full overflow-y-auto p-[50px_42px_38px] max-[1100px]:p-[38px_42px] max-[700px]:p-[25px_22px_24px] short-screen:p-[30px_34px_24px]">
                <RecipeInputForm
                  onCancel={handleCloseRecipeInput}
                  onOpenTransferCode={handleOpenTransferCode}
                  onPrepare={handlePrepareRecipe}
                />
              </div>
            ) : null}
            {recipeId && isDetailLoading ? (
              <div className="flex h-full items-center justify-center p-8">
                <p
                  className="text-center text-sm text-[#626157]"
                  role="status"
                >
                  레시피 상세를 불러오는 중입니다.
                </p>
              </div>
            ) : null}
            {recipeId && !isDetailLoading && detailError ? (
              <div className="flex h-full items-center justify-center p-8">
                <div
                  className="w-full max-w-sm rounded-lg border border-[#c79181] bg-[#fcf1ed] p-5 text-center"
                  role="alert"
                >
                  <p className="text-sm text-[#7f3c29]">
                    {detailError}
                  </p>
                  <Link
                    to="/recipes"
                    className="mt-4 inline-flex min-h-11 items-center rounded-md bg-[#15332a] px-4 text-sm text-[#f3e1b4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#15332a]"
                  >
                    목록으로 돌아가기
                  </Link>
                </div>
              </div>
            ) : null}
            {recipeDetail ? (
              <RecipeDetailView
                key={recipeDetail.id}
                isCookingMode={isCookingMode}
                isReceivedRecipeSaved={
                  location.state?.receivedRecipeSaved
                }
                onCookingModeChange={(nextCookingMode) =>
                  setCookingModeRecipe(
                    nextCookingMode ? recipeDetail : null,
                  )
                }
                onDelete={handleDeleteRecipe}
                recipeDetail={recipeDetail}
                recipeId={recipeId}
                user={user}
              />
            ) : null}
          </section>
        </div>
      </div>

      {isTransferInvitationDialog ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[rgb(3_14_10/78%)] p-4 backdrop-blur-[2px] max-[700px]:items-end max-[700px]:p-2"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              handleCloseTransferCode();
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              handleCloseTransferCode();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="transfer-code-dialog-title"
            className="relative max-h-[min(760px,calc(100dvh-32px))] w-full max-w-xl overflow-y-auto rounded-[5px] border border-[#c9bea7] bg-[#f8f5eb] p-5 text-[#272923] shadow-[0_26px_90px_rgb(0_0_0/52%)] sm:p-7 max-[700px]:max-h-[calc(100dvh-16px)] max-[700px]:rounded-[5px_5px_0_0]"
          >
            <header className="mb-5 border-b border-[#d8cfbd] pb-4 pr-12">
              <p className="text-xs font-semibold tracking-[0.12em] text-[#8b6e35]">
                전달받은 레시피
              </p>
              <h2
                id="transfer-code-dialog-title"
                className="mt-2 text-2xl font-semibold tracking-[0.04em]"
              >
                전달 코드로 레시피 받기
              </h2>
            </header>
            <button
              type="button"
              aria-label="닫기"
              onClick={handleCloseTransferCode}
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-[#c9bea7] bg-[#fbf7eb] text-xl text-[#31523d] hover:bg-[#eee7d9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b6e35]"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5"
              >
                <path
                  d="M6 6 18 18M18 6 6 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <TransferInvitationPage isDialog />
          </section>
        </div>
      ) : null}
    </main>
  );
}

export default RecipeListPlaceholderPage;
