export const routes = {
  home: "/",
  signup: "/signup",
  verifyEmail: "/verify-email",
  login: "/login",
  myPage: "/me",
  specs: "/specs",
  jobGoal: "/job-goal",
  analysis: "/analysis",
  mission: "/mission",
  missionDetail: "/mission/1",
  upload: "/upload",
  feedback: "/feedback",
  portfolio: "/portfolio",
};

export const protectedRoutes = [
  routes.myPage,
  routes.specs,
  routes.jobGoal,
  routes.analysis,
  routes.mission,
  routes.upload,
  routes.feedback,
  routes.portfolio,
];

export const getMissionDetailPath = (missionId) => `/mission/${missionId}`;

export const isProtectedPath = (path) => {
  return protectedRoutes.includes(path) || path.startsWith("/mission/");
};

export const getCurrentPath = () => window.location.pathname || routes.home;

let routerNavigate = null;

export const setRouterNavigate = (navigateHandler) => {
  routerNavigate = navigateHandler;

  return () => {
    if (routerNavigate === navigateHandler) {
      routerNavigate = null;
    }
  };
};

export const navigate = (path) => {
  if (routerNavigate) {
    routerNavigate(path);
    return;
  }

  if (window.location.pathname !== path) {
    window.history.pushState({}, "", path);
  }

  window.dispatchEvent(new PopStateEvent("popstate"));
};

export const subscribeToRouteChange = (callback) => {
  window.addEventListener("popstate", callback);

  return () => window.removeEventListener("popstate", callback);
};
