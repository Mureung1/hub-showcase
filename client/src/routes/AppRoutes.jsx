import { Navigate, Route, Routes } from "react-router-dom";
import LandingPage from "../pages/LandingPage";
import MenteeSignupPage from "../pages/MenteeSignupPage";
import MentorListComingSoonPage from "../pages/MentorListComingSoonPage";
import MentorSignupPage from "../pages/MentorSignupPage";
import PlannedPage from "../pages/PlannedPage";
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
        <Route path={routePaths.menteeMentors} element={<MentorListComingSoonPage />} />
        <Route
          path={routePaths.menteeMentorDetail}
          element={<PlannedPage title="멘토 프로필 상세" description="선택한 멘토의 상세 정보를 보여주는 화면입니다." />}
        />
        <Route
          path={routePaths.menteeApplicationNew}
          element={<PlannedPage title="사전 질문지 작성" description="선택한 멘토에게 보낼 면담 신청 질문지를 작성합니다." />}
        />
        <Route
          path={routePaths.menteeApplicationComplete}
          element={<PlannedPage title="면담 신청 완료" description="생성된 면담 신청 정보와 대기중 상태를 안내합니다." />}
        />
        <Route
          path={routePaths.menteeMyPage}
          element={<PlannedPage title="멘티 마이페이지" description="멘토 목록 우측 상단의 마이페이지 버튼이 연결되는 시작 화면입니다." />}
        />
        <Route
          path={routePaths.menteeApplications}
          element={<PlannedPage title="면담 신청 내역" description="멘티가 신청한 면담과 진행 상태를 확인합니다." />}
        />
        <Route
          path={routePaths.menteeApplicationDetail}
          element={<PlannedPage title="면담 신청 상세" description="사전 질문과 선택한 멘토, 현재 상태를 확인합니다." />}
        />
      </Route>

      {/* 멘토 전용 화면 */}
      <Route element={<RoleRoute role="mentor" />}>
        <Route
          path={routePaths.mentorHome}
          element={<PlannedPage title="멘토 홈" description="멘토에게 도착한 면담 신청 목록을 보여줍니다." />}
        />
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
