import { mockMenteeProfile } from "../data/menteeProfile";

const menteeProfileKey = "mentoring.menteeProfile";

export function getMenteeProfile() {
  try {
    const savedProfile = JSON.parse(window.localStorage.getItem(menteeProfileKey));
    return savedProfile ? { ...mockMenteeProfile, ...savedProfile } : mockMenteeProfile;
  } catch {
    return mockMenteeProfile;
  }
}

export function saveMenteeProfile(profile) {
  try {
    window.localStorage.setItem(menteeProfileKey, JSON.stringify(profile));
    return true;
  } catch {
    return false;
  }
}
