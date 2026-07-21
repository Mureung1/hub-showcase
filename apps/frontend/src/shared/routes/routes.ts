export const ROUTES = {
  home: "/",
  login: "/login",
  signup: "/signup",
  storesSelect: "/stores/select",
  schedule: "/schedule",
  scheduleDate: "/schedule/:date",
  substituteRequests: "/substitute-requests",
  newSubstituteRequest: "/substitute-requests/new",
  workers: "/workers",
  notifications: "/notifications",
  myWork: "/my-work"
} as const;

export function getScheduleDatePath(date: string) {
  return `/schedule/${date}`;
}
