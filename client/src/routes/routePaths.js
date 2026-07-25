export const routePaths = {
  landing: "/",
  landingLogin: "/#login",
  login: "/login",
  signup: "/signup",
  menteeSignup: "/signup/mentee",
  mentorSignup: "/signup/mentor",

  menteeMentors: "/mentee/mentors",
  menteeMentorDetail: "/mentee/mentors/:mentorId",
  menteeApplicationNew: "/mentee/applications/new",
  menteeMyPage: "/mentee/mypage",
  menteeApplications: "/mentee/mypage/applications",
  menteeApplicationDetail: "/mentee/mypage/applications/:applicationId",

  mentorHome: "/mentor/home",
  mentorMyPage: "/mentor/mypage",
  mentorApplicationDetail: "/mentor/applications/:applicationId",

  forbidden: "/forbidden",
};

export const navigationTargets = {
  afterMenteeSignup: routePaths.landingLogin,
  afterMentorSignup: routePaths.landingLogin,
  afterMenteeLogin: routePaths.menteeMentors,
  afterMentorLogin: routePaths.mentorHome,
  afterApplicationComplete: routePaths.menteeMentors,
  mentorListMyPageButton: routePaths.menteeMyPage,
};
