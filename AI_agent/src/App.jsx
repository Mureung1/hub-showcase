import { useEffect, useMemo, useState } from "react";

import Home from "./pages/Home";
import Signup from "./pages/Signup";
import VerifyEmail from "./pages/VerifyEmail";
import Login from "./pages/Login";
import MyPage from "./pages/MyPage";
import SpecRegister from "./pages/SpecRegister";
import Analysis from "./pages/Analysis";
import Mission from "./pages/Mission";
import MissionDetail from "./pages/MissionDetail";
import UploadResult from "./pages/UploadResult";
import Feedback from "./pages/Feedback";
import Portfolio from "./pages/Portfolio";
import Footer from "./components/layout/Footer";
import { getCurrentPath, routes, subscribeToRouteChange } from "./router";

const pageMap = {
  [routes.home]: Home,
  [routes.signup]: Signup,
  [routes.verifyEmail]: VerifyEmail,
  [routes.login]: Login,
  [routes.myPage]: MyPage,
  [routes.specs]: SpecRegister,
  [routes.analysis]: Analysis,
  [routes.mission]: Mission,
  [routes.missionDetail]: MissionDetail,
  [routes.upload]: UploadResult,
  [routes.feedback]: Feedback,
  [routes.portfolio]: Portfolio,
};

const resolvePage = (path) => {
  if (path.startsWith("/mission/")) {
    return MissionDetail;
  }

  return pageMap[path] || Home;
};

function App() {
  const [currentPath, setCurrentPath] = useState(getCurrentPath);

  useEffect(() => {
    return subscribeToRouteChange(() => setCurrentPath(getCurrentPath()));
  }, []);

  const Page = useMemo(() => resolvePage(currentPath), [currentPath]);

  return (
    <>
      <Page />
      <Footer />
    </>
  );
}

export default App;
