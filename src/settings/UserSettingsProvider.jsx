import { createContext, useCallback, useEffect, useMemo, useState } from "react";

import { getUserSettings, resetUserSettings, saveUserSettings } from "../api.js";
import { useAuth } from "../auth/useAuth.js";

export const UserSettingsContext = createContext(null);

export function UserSettingsProvider({ children }) {
  const { isConfigured, session, user } = useAuth();
  const [settings, setSettings] = useState(null);
  const [isDefault, setIsDefault] = useState(true);
  const [isSettingsLoading, setIsSettingsLoading] = useState(false);
  const [isSettingsSaving, setIsSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState("");

  const refreshSettings = useCallback(async () => {
    if (!isConfigured || !user || !session?.access_token) {
      setSettings(null);
      setIsDefault(true);
      setIsSettingsLoading(false);
      return null;
    }

    setIsSettingsLoading(true);
    setSettingsError("");
    try {
      const response = await getUserSettings(session.access_token);
      setSettings(response.settings);
      setIsDefault(Boolean(response.isDefault));
      return response;
    } catch (error) {
      setSettings(null);
      setSettingsError(error.message || "개인 설정을 불러오지 못했습니다.");
      throw error;
    } finally {
      setIsSettingsLoading(false);
    }
  }, [isConfigured, session?.access_token, user?.id]);

  useEffect(() => {
    let cancelled = false;

    if (!isConfigured || !user || !session?.access_token) {
      setSettings(null);
      setIsDefault(true);
      setSettingsError("");
      setIsSettingsLoading(false);
      return undefined;
    }

    setSettings(null);
    setIsDefault(true);
    setIsSettingsLoading(true);
    setSettingsError("");

    getUserSettings(session.access_token)
      .then((response) => {
        if (cancelled) return;
        setSettings(response.settings);
        setIsDefault(Boolean(response.isDefault));
      })
      .catch((error) => {
        if (!cancelled) setSettingsError(error.message || "개인 설정을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!cancelled) setIsSettingsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isConfigured, session?.access_token, user?.id]);

  const saveSettings = useCallback(async (nextSettings) => {
    if (!session?.access_token) throw new Error("로그인 상태를 확인하지 못했습니다. 다시 로그인해 주세요.");

    setIsSettingsSaving(true);
    setSettingsError("");
    try {
      const response = await saveUserSettings(nextSettings, session.access_token);
      setSettings(response.settings);
      setIsDefault(Boolean(response.isDefault));
      return response;
    } catch (error) {
      setSettingsError(error.message || "개인 설정 저장에 실패했습니다.");
      throw error;
    } finally {
      setIsSettingsSaving(false);
    }
  }, [session?.access_token]);

  const resetSettings = useCallback(async () => {
    if (!session?.access_token) throw new Error("로그인 상태를 확인하지 못했습니다. 다시 로그인해 주세요.");

    setIsSettingsSaving(true);
    setSettingsError("");
    try {
      const response = await resetUserSettings(session.access_token);
      setSettings(response.settings);
      setIsDefault(true);
      return response;
    } catch (error) {
      setSettingsError(error.message || "개인 설정 초기화에 실패했습니다.");
      throw error;
    } finally {
      setIsSettingsSaving(false);
    }
  }, [session?.access_token]);

  const value = useMemo(() => ({
    isDefault,
    isSettingsLoading,
    isSettingsSaving,
    refreshSettings,
    resetSettings,
    saveSettings,
    settings,
    settingsError,
  }), [isDefault, isSettingsLoading, isSettingsSaving, refreshSettings, resetSettings, saveSettings, settings, settingsError]);

  return <UserSettingsContext.Provider value={value}>{children}</UserSettingsContext.Provider>;
}