import { useState } from 'react';
import { AuthForm } from './components/AuthForm';
import { Home } from './components/Home';
import { Header } from './components/Header';
import { Analysis } from './components/Analysis';
import { Overlap } from './components/Overlap';
import { Recommend } from './components/Recommend';
import { Detail } from './components/Detail';
import type { AuthUser, LoginResponse } from './api/auth';
import type { Product, Screen } from './types';

const STORAGE_KEY = 'gc_auth';

interface StoredAuth {
  token: string;
  user: AuthUser;
}

function loadStoredAuth(): StoredAuth | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredAuth;
  } catch {
    return null;
  }
}

function App() {
  const [auth, setAuth] = useState<StoredAuth | null>(loadStoredAuth);
  const [screen, setScreen] = useState<Screen>('home');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  function handleLoggedIn(result: LoginResponse) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
    setAuth(result);
  }

  function handleLogout() {
    localStorage.removeItem(STORAGE_KEY);
    setAuth(null);
    setScreen('home');
    setSymptoms([]);
    setSelectedProduct(null);
  }

  function handleStart(startedSymptoms: string[]) {
    setSymptoms(startedSymptoms);
    setScreen('analysis');
  }

  function handleSelectProduct(product: Product) {
    setSelectedProduct(product);
    setScreen('detail');
  }

  function handleBuy() {
    console.log('스마트스토어로 이동 (mock):', selectedProduct);
  }

  function handleRestart() {
    setScreen('home');
    setSymptoms([]);
    setSelectedProduct(null);
  }

  return (
    <div className={auth ? 'phone' : 'phone center-screen'}>
      {auth ? (
        <>
          <Header screen={screen} userEmail={auth.user.email} onLogout={handleLogout} />
          {screen === 'home' && <Home onStart={handleStart} />}
          {screen === 'analysis' && (
            <Analysis symptoms={symptoms} onNext={() => setScreen('overlap')} />
          )}
          {screen === 'overlap' && <Overlap onNext={() => setScreen('recommend')} />}
          {screen === 'recommend' && <Recommend onSelect={handleSelectProduct} />}
          {screen === 'detail' && (
            <Detail product={selectedProduct} onBuy={handleBuy} onRestart={handleRestart} />
          )}
        </>
      ) : (
        <AuthForm onLoggedIn={handleLoggedIn} />
      )}
    </div>
  );
}

export default App;
