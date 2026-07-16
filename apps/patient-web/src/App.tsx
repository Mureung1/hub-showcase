import type {
  MockPatientConfig,
  PatientRegistrationInput,
  QueuePosition,
} from "@baro-jinryo/shared";
import { useCallback, useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { PatientAuthProvider, usePatientAuth } from "./auth/PatientAuthContext";
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
  const { session, profile, loading } = usePatientAuth();
  const location = useLocation();
  if (loading) return null;
  if (session && profile) return children;
  const returnTo = `${location.pathname}${location.search}`;
  return <Navigate to={`/login?returnTo=${encodeURIComponent(returnTo)}`} replace />;
}

function PatientRegistrationRoute({
  onRegistered,
}: {
  onRegistered: (hospitalId: string, input: PatientRegistrationInput) => Promise<void>;
}) {
  const { hospitalId } = useParams();
  const [result, setResult] = useState<{
    hospitalId: string;
    config?: MockPatientConfig;
    error?: string;
  }>({ hospitalId: "" });

  useEffect(() => {
    if (!hospitalId) return;
    void getPatientConfig(hospitalId)
      .then((config) => setResult({ hospitalId, config }))
      .catch(() => setResult({
        hospitalId,
        error: "이 병원의 원격 접수 정보를 불러올 수 없습니다.",
      }));
  }, [hospitalId]);

  const error = result.hospitalId === hospitalId ? result.error : undefined;
  const config = result.hospitalId === hospitalId ? result.config : undefined;
  if (!hospitalId || error) {
    return <Navigate to={`/?error=${encodeURIComponent(error || "병원 정보가 올바르지 않습니다.")}`} replace />;
  }
  if (!config) return <p className="content-width">원격 접수 정보를 불러오는 중입니다.</p>;
  return (
    <PatientRegistrationPage
      inputMode={config.inputMode}
      categories={config.categories}
      onRegister={(input) => onRegistered(hospitalId, input)}
    />
  );
}

function PatientApp() {
  const navigate = useNavigate();
  const { session, profile } = usePatientAuth();
  const [waiting, setWaiting] = useState<QueuePosition | null>(null);

  const refresh = useCallback(async () => {
    setWaiting(session && profile ? await getPatientWaiting() : null);
  }, [profile, session]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(() => void refresh(), pollInterval);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(timer);
    };
  }, [refresh]);

  async function handleRegister(hospitalId: string, input: PatientRegistrationInput) {
    setWaiting(await registerRemoteWaiting(hospitalId, input));
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
        path="/hospitals/:hospitalId/waiting/new"
        element={
          <RequireLogin>
            <PatientRegistrationRoute onRegistered={handleRegister} />
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
      <PatientAuthProvider>
        <PatientApp />
      </PatientAuthProvider>
    </BrowserRouter>
  );
}
