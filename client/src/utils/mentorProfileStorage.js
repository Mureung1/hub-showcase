import {
  mentorPersonalInformation,
  mentorProfileInformation,
} from "../data/mentorProfile";

const mentorProfileKey = "mentoring.mentorProfile";

const defaultMentorProfile = {
  personalInformation: mentorPersonalInformation,
  profileInformation: mentorProfileInformation,
};

export function getMentorProfile() {
  try {
    const savedProfile = JSON.parse(window.localStorage.getItem(mentorProfileKey));

    if (!savedProfile) return defaultMentorProfile;

    return {
      personalInformation: {
        ...mentorPersonalInformation,
        ...savedProfile.personalInformation,
      },
      profileInformation: {
        ...mentorProfileInformation,
        ...savedProfile.profileInformation,
      },
    };
  } catch {
    return defaultMentorProfile;
  }
}

export function saveMentorProfile(profile) {
  try {
    window.localStorage.setItem(mentorProfileKey, JSON.stringify(profile));
    return true;
  } catch {
    return false;
  }
}
