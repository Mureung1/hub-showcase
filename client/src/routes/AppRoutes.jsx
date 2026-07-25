import { Navigate, Route, Routes } from "react-router-dom";
import LandingPage from "../pages/LandingPage";
import MenteeApplicationListPage from "../pages/MenteeApplicationListPage";
import MenteeProfileEditPage from "../pages/MenteeProfileEditPage";
import MenteeSignupPage from "../pages/MenteeSignupPage";
import MentorDetailPage from "../pages/MentorDetailPage";
import MentorHomePage from "../pages/MentorHomePage";
import MentorListPage from "../pages/MentorListPage";
import MentorProfileEditPage from "../pages/MentorProfileEditPage";
import MentorSignupPage from "../pages/MentorSignupPage";
import PlannedPage from "../pages/PlannedPage";
import QuestionnairePage from "../pages/QuestionnairePage";
import SignupPage from "../pages/SignupPage";
import RoleRoute from "./RoleRoute";
import { routePaths } from "./routePaths";

function AppRoutes() {
  return (
    <Routes>
      {/* 공개 화면 */}
      <Route path={routePaths.landing} element={<LandingPage />} />
      <Route path={routePaths.login} element={<Navigate to={routePaths.landingLogin} replace />} />
      <Route path={routePaths.signup} element={<SignupPage />} />
      <Route path={routePaths.menteeSignup} element={<MenteeSignupPage />} />
      <Route path={routePaths.mentorSignup} element={<MentorSignupPage />} />

      {/* 멘티 전용 화면 */}
      <Route element={<RoleRoute role="mentee" />}>
        <Route path={routePaths.menteeMentors} element={<MentorListPage />} />
        <Route path={routePaths.menteeMentorDetail} element={<MentorDetailPage />} />
        <Route path={routePaths.menteeApplicationNew} element={<QuestionnairePage />} />
        <Route path={routePaths.menteeMyPage} element={<MenteeProfileEditPage />} />
        <Route path={routePaths.menteeApplications} element={<MenteeApplicationListPage />} />
        <Route
          path={routePaths.menteeApplicationDetail}
          element={<PlannedPage title="면담 신청 상세" description="사전 질문과 선택한 멘토, 현재 상태를 확인합니다." />}
        />
      </Route>

      {/* 멘토 전용 화면 */}
      <Route element={<RoleRoute role="mentor" />}>
        <Route path={routePaths.mentorHome} element={<MentorHomePage />} />
        <Route path={routePaths.mentorMyPage} element={<MentorProfileEditPage />} />
        <Route
          path={routePaths.mentorApplicationDetail}
          element={<PlannedPage title="멘토 면담 신청 상세" description="사전 질문지를 확인하고 신청을 수락하거나 거절합니다." />}
        />
      </Route>

      {/* 권한 및 잘못된 주소 처리 */}
      <Route
        path={routePaths.forbidden}
        element={<PlannedPage title="접근할 수 없는 화면입니다" description="현재 계정 역할로는 이 화면을 이용할 수 없습니다." />}
      />
      <Route
        path="*"
        element={<PlannedPage title="페이지를 찾을 수 없습니다" description="주소를 다시 확인하거나 첫 화면으로 돌아가 주세요." />}
      />
    </Routes>
  );
}

export default AppRoutes;
