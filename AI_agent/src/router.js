export const routes = {
  home: "/",
  signup: "/signup",
  login: "/login",
  myPage: "/me",
  specs: "/specs",
  analysis: "/analysis",
  mission: "/mission",
  missionDetail: "/mission/1",
  upload: "/upload",
  feedback: "/feedback",
  portfolio: "/portfolio",
};

export const getCurrentPath = () => window.location.pathname || routes.home;

export const navigate = (path) => {
  if (window.location.pathname !== path) {
    window.history.pushState({}, "", path);
  }

  window.dispatchEvent(new PopStateEvent("popstate"));
};

export const subscribeToRouteChange = (callback) => {
  window.addEventListener("popstate", callback);

  return () => window.removeEventListener("popstate", callback);
};
