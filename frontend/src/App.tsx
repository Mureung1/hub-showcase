import { useEffect, useState } from 'react';
import { AuthForm } from './components/AuthForm';
import { Onboarding } from './components/Onboarding';
import { Home } from './components/Home';
import { Header } from './components/Header';
import { Analysis } from './components/Analysis';
import { Overlap } from './components/Overlap';
import { Recommend } from './components/Recommend';
import { Detail } from './components/Detail';
import type { AuthUser, LoginResponse } from './api/auth';
import type { Product, Screen } from './types';

const STORAGE_KEY = 'gc_auth';
const FLOW_STORAGE_KEY = 'gc_flow';

interface StoredAuth {
  token: string;
  user: AuthUser;
}

interface StoredFlow {
  screen: Screen;
  symptoms: string[];
  recommendedIngredientIds: number[];
  supplements: string[];
  selectedProduct: Product | null;
}

const INITIAL_FLOW: StoredFlow = {
  screen: 'home',
  symptoms: [],
  recommendedIngredientIds: [],
  supplements: [],
  selectedProduct: null,
};

function loadStoredAuth(): StoredAuth | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredAuth;
  } catch {
    return null;
  }
}

function loadStoredFlow(): StoredFlow {
  const raw = sessionStorage.getItem(FLOW_STORAGE_KEY);
  if (!raw) return INITIAL_FLOW;
  try {
    return { ...INITIAL_FLOW, ...(JSON.parse(raw) as Partial<StoredFlow>) };
  } catch {
    return INITIAL_FLOW;
  }
}

function App() {
  const [auth, setAuth] = useState<StoredAuth | null>(loadStoredAuth);
  const [editingProfile, setEditingProfile] = useState(false);
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>(() => loadStoredFlow().screen);
  const [symptoms, setSymptoms] = useState<string[]>(() => loadStoredFlow().symptoms);
  const [recommendedIngredientIds, setRecommendedIngredientIds] = useState<number[]>(
    () => loadStoredFlow().recommendedIngredientIds
  );
  const [supplements, setSupplements] = useState<string[]>(() => loadStoredFlow().supplements);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(
    () => loadStoredFlow().selectedProduct
  );

  useEffect(() => {
    const flow: StoredFlow = { screen, symptoms, recommendedIngredientIds, supplements, selectedProduct };
    sessionStorage.setItem(FLOW_STORAGE_KEY, JSON.stringify(flow));
  }, [screen, symptoms, recommendedIngredientIds, supplements, selectedProduct]);

  function handleLoggedIn(result: LoginResponse) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
    setAuth(result);
    setAuthErrorMessage(null);
  }

  function handleProfileComplete(updatedUser: AuthUser) {
    if (!auth) return;
    const next: StoredAuth = { ...auth, user: updatedUser };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setAuth(next);
  }

  function handleProfileEditComplete(updatedUser: AuthUser) {
    handleProfileComplete(updatedUser);
    setEditingProfile(false);
  }

  function handleLogout() {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(FLOW_STORAGE_KEY);
    setAuth(null);
    setScreen('home');
    setSymptoms([]);
    setRecommendedIngredientIds([]);
    setSupplements([]);
    setSelectedProduct(null);
  }

  function handleAuthError() {
    setAuthErrorMessage('로그인이 만료되었습니다. 다시 로그인해주세요.');
    handleLogout();
  }

  function handleStart(startedSymptoms: string[]) {
    setSymptoms(startedSymptoms);
    setScreen('analysis');
  }

  function handleAnalysisNext(ingredientIds: number[], enteredSupplements: string[]) {
    setRecommendedIngredientIds(ingredientIds);
    setSupplements(enteredSupplements);
    setScreen('overlap');
  }

  function handleSelectProduct(product: Product) {
    setSelectedProduct(product);
    setScreen('detail');
  }

  function handleBuy() {
    if (selectedProduct?.smartstoreUrl) {
      window.open(selectedProduct.smartstoreUrl, '_blank', 'noopener,noreferrer');
    }
  }

  function handleRestart() {
    setScreen('home');
    setSymptoms([]);
    setRecommendedIngredientIds([]);
    setSupplements([]);
    setSelectedProduct(null);
  }

  return (
    <div className={auth && auth.user.gender != null ? 'phone' : 'phone center-screen'}>
      {auth && auth.user.gender == null ? (
        <Onboarding token={auth.token} onComplete={handleProfileComplete} onAuthError={handleAuthError} />
      ) : auth ? (
        <>
          <Header
            screen={screen}
            userEmail={auth.user.email}
            onLogout={handleLogout}
            onEditProfile={() => setEditingProfile(true)}
          />
          <div className="phone-content">
            {editingProfile ? (
              <Onboarding
                token={auth.token}
                initialUser={auth.user}
                onComplete={handleProfileEditComplete}
                onCancel={() => setEditingProfile(false)}
                onAuthError={handleAuthError}
              />
            ) : (
              <>
                {screen === 'home' && <Home onStart={handleStart} />}
                {screen === 'analysis' && (
                  <Analysis symptoms={symptoms} onNext={handleAnalysisNext} />
                )}
                {screen === 'overlap' && (
                  <Overlap
                    supplements={supplements}
                    token={auth.token}
                    onNext={() => setScreen('recommend')}
                    onAuthError={handleAuthError}
                  />
                )}
                {screen === 'recommend' && (
                  <Recommend
                    ingredientIds={recommendedIngredientIds}
                    token={auth.token}
                    onSelect={handleSelectProduct}
                    onAuthError={handleAuthError}
                  />
                )}
                {screen === 'detail' && (
                  <Detail product={selectedProduct} onBuy={handleBuy} onRestart={handleRestart} />
                )}
              </>
            )}
          </div>
        </>
      ) : (
        <AuthForm onLoggedIn={handleLoggedIn} notice={authErrorMessage} />
      )}
    </div>
  );
}

export default App;
