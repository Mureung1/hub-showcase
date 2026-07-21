import { useContext } from "react";

import { UserSettingsContext } from "./UserSettingsProvider.jsx";

export function useUserSettings() {
  const context = useContext(UserSettingsContext);
  if (!context) throw new Error("useUserSettings는 UserSettingsProvider 내부에서 사용해야 합니다.");
  return context;
}