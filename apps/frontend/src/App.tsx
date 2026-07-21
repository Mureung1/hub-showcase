import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { GuestRoute, HomeRedirect, ProtectedRoute, RequireSelectedStore } from "./features/auth";
import { LoginPage } from "./pages/LoginPage";
import { MyWorkPage } from "./pages/MyWorkPage";
import { NewSubstituteRequestPage } from "./pages/NewSubstituteRequestPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { ScheduleDatePage } from "./pages/ScheduleDatePage";
import { SchedulePage } from "./pages/SchedulePage";
import { SignupPage } from "./pages/SignupPage";
import { StoreSelectPage } from "./pages/StoreSelectPage";
import { SubstituteRequestsPage } from "./pages/SubstituteRequestsPage";
import { WorkersPage } from "./pages/WorkersPage";
import { AppLayout } from "./shared/components";
import { ROUTES } from "./shared/routes";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={ROUTES.home} element={<HomeRedirect />} />

        <Route element={<GuestRoute />}>
          <Route path={ROUTES.login} element={<LoginPage />} />
          <Route path={ROUTES.signup} element={<SignupPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path={ROUTES.storesSelect} element={<StoreSelectPage />} />

          <Route element={<RequireSelectedStore />}>
            <Route element={<AppLayout />}>
              <Route path={ROUTES.schedule} element={<SchedulePage />} />
              <Route path={ROUTES.scheduleDate} element={<ScheduleDatePage />} />
              <Route path={ROUTES.substituteRequests} element={<SubstituteRequestsPage />} />
              <Route path={ROUTES.newSubstituteRequest} element={<NewSubstituteRequestPage />} />
              <Route path={ROUTES.workers} element={<WorkersPage />} />
              <Route path={ROUTES.myWork} element={<MyWorkPage />} />
              <Route path={ROUTES.notifications} element={<NotificationsPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
