import type {
  MockPatientConfig,
  PatientRegistrationInput,
  QueuePosition,
} from "@baro-jinryo/shared";
import { defaultPatientCategories } from "@baro-jinryo/shared";
import { useCallback, useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { MockAuthProvider, useMockAuth } from "./auth/MockAuthContext";
import { HospitalSearchPage } from "./pages/HospitalSearchPage";
import { PatientRegistrationPage } from "./pages/PatientRegistrationPage";
import { PatientWaitingPage } from "./pages/PatientWaitingPage";
import { PatientLoginPage } from "./pages/PatientLoginPage";
import { OnsiteWaitingStatusPage } from "./pages/OnsiteWaitingStatusPage";
import {
  cancelPatientWaiting,
  deferPatientWaiting,
  getPatientConfig,
  getPatientWaiting,
  registerRemoteWaiting,
} from "./services/apiClient";

const pollInterval = Number(import.meta.env.VITE_WAITING_POLL_INTERVAL_MS ?? 10_000);

function RequireLogin({ children }: { children: React.ReactNode }) {
  const { session } = useMockAuth();
  const location = useLocation();
  if (session) return children;
  const returnTo = `${location.pathname}${location.search}`;
  return <Navigate to={`/login?returnTo=${encodeURIComponent(returnTo)}`} replace />;
}

function PatientApp() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<MockPatientConfig>({
    inputMode: "categorized",
    categories: defaultPatientCategories,
    queueStatus: "open",
  });
  const [waiting, setWaiting] = useState<QueuePosition | null>(null);

  const refresh = useCallback(async () => {
    const [nextConfig, nextWaiting] = await Promise.all([getPatientConfig(), getPatientWaiting()]);
    setConfig(nextConfig);
    setWaiting(nextWaiting);
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(() => void refresh(), pollInterval);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(timer);
    };
  }, [refresh]);

  async function handleRegister(input: PatientRegistrationInput) {
    setWaiting(await registerRemoteWaiting(input));
    navigate("/my-waiting");
  }

  async function handleCancel() {
    setWaiting(await cancelPatientWaiting());
  }

  async function handleDefer() {
    setWaiting(await deferPatientWaiting());
  }

  return (
    <Routes>
      <Route path="/" element={<HospitalSearchPage />} />
      <Route path="/login" element={<PatientLoginPage />} />
      <Route path="/onsite-status/:lookupToken" element={<OnsiteWaitingStatusPage />} />
      <Route
        path="/hospitals/hospital-1/waiting/new"
        element={
          <RequireLogin>
            <PatientRegistrationPage
              inputMode={config.inputMode}
              categories={config.categories}
              onRegister={handleRegister}
            />
          </RequireLogin>
        }
      />
      <Route
        path="/my-waiting"
        element={
          <RequireLogin>
            <PatientWaitingPage waiting={waiting} onCancel={handleCancel} onDefer={handleDefer} />
          </RequireLogin>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <MockAuthProvider>
        <PatientApp />
      </MockAuthProvider>
    </BrowserRouter>
  );
}
