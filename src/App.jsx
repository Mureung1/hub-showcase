import { useMemo, useState } from "react";
import "./App.css";
import Header from "./components/Header";
import Hero from "./components/Hero";
import ProductCard from "./components/ProductCard";
import { categories, mockGroupBuys, pickupRecommendations } from "./data/mockData";

function App() {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchedKeyword, setSearchedKeyword] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [hasSearched, setHasSearched] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [joinedIds, setJoinedIds] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isRecommendationOpen, setIsRecommendationOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [createdGroupBuys, setCreatedGroupBuys] = useState([]);
  const [newGroupBuy, setNewGroupBuy] = useState({
    name: "",
    targetPeople: 10,
    deadline: "내일 오후 6시",
    pickupLocation: "AI에게 추천받기",
  });

  const allGroupBuys = useMemo(
    () => [...createdGroupBuys, ...mockGroupBuys],
    [createdGroupBuys]
  );

  const filteredGroupBuys = useMemo(() => {
    const keyword = searchedKeyword.trim().toLowerCase();

    return allGroupBuys.filter((product) => {
      const matchesKeyword = !keyword || product.name.toLowerCase().includes(keyword);
      const matchesCategory = selectedCategory === "전체" || product.category === selectedCategory;
      return matchesKeyword && matchesCategory;
    });
  }, [allGroupBuys, searchedKeyword, selectedCategory]);

  const popularGroupBuys = [...allGroupBuys]
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 4);

  const recommendedGroupBuys = [...allGroupBuys]
    .sort((a, b) => b.currentPeople / b.targetPeople - a.currentPeople / a.targetPeople)
    .slice(0, 3);

  const cartTotal = cartItems.reduce((sum, item) => sum + item.price, 0);

  function showToast(message) {
    setToastMessage(message);
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => setToastMessage(""), 1900);
  }

  function handleSearch(event) {
    event?.preventDefault();
    const keyword = searchKeyword.trim();

    if (!keyword && selectedCategory === "전체") {
      showToast("상품명이나 카테고리를 선택해주세요.");
      return;
    }

    setSearchedKeyword(keyword);
    setHasSearched(true);
    document.getElementById("group-buys")?.scrollIntoView({ behavior: "smooth" });
  }

  function handleCategory(category) {
    setSelectedCategory(category);
    setHasSearched(true);
    setSearchedKeyword(searchKeyword.trim());
  }

  function handleAddCart(product) {
    if (cartItems.some((item) => item.id === product.id)) {
      showToast("이미 카트에 담긴 공동구매예요.");
      return;
    }

    setCartItems((previous) => [...previous, product]);
    showToast(`${product.name}을 카트에 담았어요.`);
  }

  function handleJoin(product) {
    if (joinedIds.includes(product.id)) return;
    setJoinedIds((previous) => [...previous, product.id]);
    handleAddCart(product);
    showToast(`${product.name} 공동구매에 참여했어요.`);
  }

  function removeCartItem(id) {
    setCartItems((previous) => previous.filter((item) => item.id !== id));
  }

  function handleCreateGroupBuy(event) {
    event.preventDefault();
    if (!newGroupBuy.name.trim()) {
      showToast("상품명을 입력해주세요.");
      return;
    }

    const created = {
      id: Date.now(),
      name: newGroupBuy.name.trim(),
      category: "기타",
      emoji: "🛒",
      price: 0,
      originalPrice: 0,
      currentPeople: 1,
      targetPeople: Number(newGroupBuy.targetPeople),
      deadline: newGroupBuy.deadline,
      pickupLocation: newGroupBuy.pickupLocation,
      creator: "나",
      recommendationReason: "방금 생성한 공동구매예요.",
      popularity: 50,
    };

    setCreatedGroupBuys((previous) => [created, ...previous]);
    setIsCreateOpen(false);
    setHasSearched(false);
    setNewGroupBuy({
      name: "",
      targetPeople: 10,
      deadline: "내일 오후 6시",
      pickupLocation: "AI에게 추천받기",
    });
    showToast(`${created.name} 공동구매가 생성됐어요.`);
  }

  function openCreateWithSearch() {
    setNewGroupBuy((previous) => ({
      ...previous,
      name: searchedKeyword || searchKeyword,
    }));
    setIsCreateOpen(true);
  }

  return (
    <>
      <Header
        cartCount={cartItems.length}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenRecommendation={() => setIsRecommendationOpen(true)}
      />

      <Hero onOpenRecommendation={() => setIsRecommendationOpen(true)} />

      <main>
        <section className="mvp-flow page-width">
          <div className="section-heading">
            <span className="eyebrow">Week 2 MVP Flow</span>
            <h2>검색부터 공동구매 생성까지 한 번에</h2>
          </div>
          <div className="flow-grid">
            {["상품 검색", "AI 공동구매 추천", "공동구매 참여", "없으면 새로 생성"].map((step, index) => (
              <article className="flow-card" key={step}>
                <span>{index + 1}</span>
                <h3>{step}</h3>
                <p>{[
                  "필요한 상품명을 입력해 현재 모집을 조회합니다.",
                  "검색어와 카테고리에 맞는 모집을 추천합니다.",
                  "인원과 마감 시간을 확인하고 바로 참여합니다.",
                  "조건에 맞는 모집이 없다면 직접 개설합니다.",
                ][index]}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="search-area">
          <form className="search-bar page-width" onSubmit={handleSearch}>
            <span aria-hidden="true">🔎</span>
            <input
              value={searchKeyword}
              onChange={(event) => setSearchKeyword(event.target.value)}
              placeholder="카트에 담고 싶은 물건을 검색해보세요 (예: 세제, 견과류)"
            />
            <button className="button button-primary" type="submit">검색</button>
          </form>

          <div className="category-list page-width">
            {categories.map((category) => (
              <button
                className={selectedCategory === category ? "category-chip active" : "category-chip"}
                type="button"
                key={category}
                onClick={() => handleCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </section>

        <section className="section page-width" id="group-buys">
          <div className="section-heading row-heading">
            <div>
              <span className="eyebrow">Search & AI Match</span>
              <h2>{hasSearched ? "AI 검색 결과" : "인기 공동구매"}</h2>
            </div>
            {hasSearched && (
              <button className="text-button" type="button" onClick={() => {
                setHasSearched(false);
                setSearchedKeyword("");
                setSelectedCategory("전체");
              }}>
                검색 초기화
              </button>
            )}
          </div>

          {hasSearched && (
            <p className="search-result-summary">
              {searchedKeyword && <><strong>“{searchedKeyword}”</strong> · </>}
              {selectedCategory !== "전체" && <><strong>{selectedCategory}</strong> · </>}
              조건에 맞는 공동구매 {filteredGroupBuys.length}개를 찾았어요.
            </p>
          )}

          {(hasSearched ? filteredGroupBuys : popularGroupBuys).length > 0 ? (
            <div className="product-grid">
              {(hasSearched ? filteredGroupBuys : popularGroupBuys).map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddCart={handleAddCart}
                  onJoin={handleJoin}
                  isJoined={joinedIds.includes(product.id)}
                  badge={hasSearched ? "✨ AI 추천" : "🔥 실시간 인기"}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>조건에 맞는 진행 중 공동구매가 없어요.</h3>
              <p>새로운 공동구매를 만들고 참여자를 모집해보세요.</p>
              <button className="button button-primary" type="button" onClick={openCreateWithSearch}>
                새 공동구매 만들기
              </button>
            </div>
          )}
        </section>

        <section className="section section-tint">
          <div className="page-width">
            <div className="section-heading">
              <span className="eyebrow">AI 추천 공동구매</span>
              <h2>검색과 이용 패턴을 바탕으로 추천해요</h2>
            </div>
            <div className="product-grid three-columns">
              {recommendedGroupBuys.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddCart={handleAddCart}
                  onJoin={handleJoin}
                  isJoined={joinedIds.includes(product.id)}
                  badge="✨ AI 추천"
                />
              ))}
            </div>
          </div>
        </section>

        <section className="section page-width">
          <div className="create-callout">
            <div className="create-icon">＋</div>
            <div>
              <span className="eyebrow">Create New Cart</span>
              <h2>찾는 공동구매가 없다면 직접 열어보세요</h2>
              <p>상품, 목표 인원, 마감 시간을 입력하면 AI가 알맞은 수령 장소를 추천해요.</p>
            </div>
            <button className="button button-primary" type="button" onClick={openCreateWithSearch}>
              공동구매 개설
            </button>
          </div>
        </section>

        <section className="section section-tint" id="pickup">
          <div className="page-width">
            <div className="section-heading">
              <span className="eyebrow">AI 추천 수령 장소</span>
              <h2>참여자 동선을 바탕으로 편한 장소를 추천해요</h2>
            </div>
            <div className="pickup-grid">
              {pickupRecommendations.map((place) => (
                <article className="pickup-card" key={place.id}>
                  <span className="pickup-icon">📍</span>
                  <div>
                    <span className="location-tag">{place.distance}</span>
                    <h3>{place.name}</h3>
                    <p>{place.reason}</p>
                    <div className="ai-reason">✨ 평균 이동 거리를 줄인 추천 장소예요.</div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="footer-inner page-width">
          <div>
            <h2>🛒 CampusCart</h2>
            <p>최소 주문금액 걱정 없이, 필요한 만큼만 함께 구매해요.</p>
          </div>
          <span>© 2026 CampusCart</span>
        </div>
      </footer>

      {isCartOpen && (
        <div className="overlay" onMouseDown={() => setIsCartOpen(false)}>
          <aside className="cart-drawer" onMouseDown={(event) => event.stopPropagation()}>
            <div className="drawer-heading">
              <div><span className="eyebrow">My Cart</span><h2>내 공동구매 카트</h2></div>
              <button type="button" onClick={() => setIsCartOpen(false)}>×</button>
            </div>

            <div className="cart-list">
              {cartItems.length === 0 ? (
                <div className="empty-state compact"><p>아직 담은 공동구매가 없어요.</p></div>
              ) : cartItems.map((item) => (
                <div className="cart-item" key={item.id}>
                  <span>{item.emoji}</span>
                  <div><strong>{item.name}</strong><p>{item.price.toLocaleString()}원</p></div>
                  <button type="button" onClick={() => removeCartItem(item.id)}>×</button>
                </div>
              ))}
            </div>

            <div className="drawer-footer">
              <div><span>예상 결제금액</span><strong>{cartTotal.toLocaleString()}원</strong></div>
              <button className="button button-primary" type="button" onClick={() => {
                if (!cartItems.length) return showToast("먼저 공동구매를 카트에 담아주세요.");
                showToast(`${cartItems.length}개 공동구매 참여를 완료했어요.`);
                setCartItems([]);
                setIsCartOpen(false);
              }}>
                담은 공동구매 참여하기
              </button>
            </div>
          </aside>
        </div>
      )}

      {isRecommendationOpen && (
        <div className="overlay modal-overlay" onMouseDown={() => setIsRecommendationOpen(false)}>
          <div className="modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="drawer-heading">
              <div><span className="eyebrow">AI Matching</span><h2>나에게 맞는 공동구매 찾기</h2></div>
              <button type="button" onClick={() => setIsRecommendationOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="recommend-steps">
                <p><strong>1. 원하는 상품 입력</strong><span>필요한 물건이나 카테고리를 알려주세요.</span></p>
                <p><strong>2. 기존 공동구매 매칭</strong><span>조건이 비슷한 모집을 추천해요.</span></p>
                <p><strong>3. 수령 장소 추천</strong><span>생활 동선을 반영해 장소를 제안해요.</span></p>
              </div>
              <label>찾는 상품<input value={searchKeyword} onChange={(event) => setSearchKeyword(event.target.value)} placeholder="예: 세제, 즉석밥, 간식" /></label>
              <button className="button button-primary full-button" type="button" onClick={() => {
                setIsRecommendationOpen(false);
                handleSearch();
              }}>
                AI 추천 결과 보기
              </button>
            </div>
          </div>
        </div>
      )}

      {isCreateOpen && (
        <div className="overlay modal-overlay" onMouseDown={() => setIsCreateOpen(false)}>
          <form className="modal" onSubmit={handleCreateGroupBuy} onMouseDown={(event) => event.stopPropagation()}>
            <div className="drawer-heading">
              <div><span className="eyebrow">New Group Buy</span><h2>새 공동구매 만들기</h2></div>
              <button type="button" onClick={() => setIsCreateOpen(false)}>×</button>
            </div>
            <div className="modal-body form-grid">
              <label className="full-field">상품명<input value={newGroupBuy.name} onChange={(event) => setNewGroupBuy({ ...newGroupBuy, name: event.target.value })} /></label>
              <label>목표 인원<input type="number" min="2" max="50" value={newGroupBuy.targetPeople} onChange={(event) => setNewGroupBuy({ ...newGroupBuy, targetPeople: event.target.value })} /></label>
              <label>마감 시간<select value={newGroupBuy.deadline} onChange={(event) => setNewGroupBuy({ ...newGroupBuy, deadline: event.target.value })}><option>오늘 자정</option><option>내일 오후 6시</option><option>3일 후</option><option>일주일 후</option></select></label>
              <label className="full-field">희망 수령 장소<select value={newGroupBuy.pickupLocation} onChange={(event) => setNewGroupBuy({ ...newGroupBuy, pickupLocation: event.target.value })}><option>AI에게 추천받기</option><option>기숙사 택배함</option><option>중앙도서관</option><option>학생회관</option></select></label>
              <button className="button button-primary full-field" type="submit">공동구매 개설하기</button>
            </div>
          </form>
        </div>
      )}

      {toastMessage && <div className="toast">{toastMessage}</div>}
    </>
  );
}

export default App;
