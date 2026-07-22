const { updateAccountCredentials } = require('./account.service');
const { supabase } = require('../db/supabase');
const { ValidationError, requireString, requireStringArray } = require('../utils/validators');

const FIELD_MAP = {
  school: 'school',
  major: 'major',
  academicStatus: 'academic_status',
  program: 'program',
  lab: 'lab',
  detailedIntroduction: 'detailed_introduction',
};

const toApiProfile = (user, mentorProfile) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  nickname: user.nickname,
  school: mentorProfile.school,
  major: mentorProfile.major,
  academicStatus: mentorProfile.academic_status,
  program: mentorProfile.program,
  lab: mentorProfile.lab,
  introduction: mentorProfile.introduction,
  detailedIntroduction: mentorProfile.detailed_introduction,
  researchFields: mentorProfile.research_fields,
  counselingFields: mentorProfile.counseling_fields,
  careerHighlights: mentorProfile.career_highlights,
  internationalActivities: mentorProfile.international_activities,
  availableTime: mentorProfile.available_time,
});

const fetchMentorProfileRow = async (userId) => {
  const { data: mentorProfile, error } = await supabase
    .from('mentor_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !mentorProfile) {
    throw new Error('멘토 프로필을 찾을 수 없습니다.');
  }

  return mentorProfile;
};

const getMyProfile = async (user) => {
  const mentorProfile = await fetchMentorProfileRow(user.id);
  return toApiProfile(user, mentorProfile);
};

const updateMyProfile = async (user, payload = {}) => {
  const profileUpdate = {};
  const mentorProfileUpdate = {};

  if (payload.name !== undefined) {
    profileUpdate.name = requireString(payload.name, 'name');
  }

  if (payload.nickname !== undefined) {
    profileUpdate.nickname = requireString(payload.nickname, 'nickname');
  }

  const updatedEmail = await updateAccountCredentials(user.id, {
    email: payload.email,
    password: payload.password,
  });

  ['school', 'major', 'academicStatus', 'program', 'lab', 'detailedIntroduction'].forEach(
    (field) => {
      if (payload[field] !== undefined) {
        mentorProfileUpdate[FIELD_MAP[field]] = requireString(payload[field], field);
      }
    },
  );

  if (payload.introduction !== undefined) {
    const introduction = requireString(payload.introduction, 'introduction');
    if (introduction.length > 120) {
      throw new ValidationError('introduction은 120자 이하여야 합니다.', 'introduction');
    }
    mentorProfileUpdate.introduction = introduction;
  }

  if (payload.availableTime !== undefined) {
    mentorProfileUpdate.available_time = requireString(payload.availableTime, 'availableTime');
  }

  if (payload.researchFields !== undefined) {
    mentorProfileUpdate.research_fields = requireStringArray(
      payload.researchFields,
      'researchFields',
      { min: 3, max: 8 },
    );
  }

  if (payload.counselingFields !== undefined) {
    mentorProfileUpdate.counseling_fields = requireStringArray(
      payload.counselingFields,
      'counselingFields',
      { min: 1, max: 5 },
    );
  }

  if (payload.careerHighlights !== undefined) {
    mentorProfileUpdate.career_highlights = requireStringArray(
      payload.careerHighlights,
      'careerHighlights',
      { min: 1, max: 5 },
    );
  }

  if (payload.internationalActivities !== undefined) {
    mentorProfileUpdate.international_activities = requireStringArray(
      payload.internationalActivities,
      'internationalActivities',
      { min: 1, max: 5 },
    );
  }

  if (Object.keys(profileUpdate).length > 0) {
    const { error } = await supabase.from('profiles').update(profileUpdate).eq('id', user.id);
    if (error) throw error;
  }

  if (Object.keys(mentorProfileUpdate).length > 0) {
    const { error } = await supabase
      .from('mentor_profiles')
      .update(mentorProfileUpdate)
      .eq('user_id', user.id);
    if (error) throw error;
  }

  const mentorProfile = await fetchMentorProfileRow(user.id);
  return toApiProfile(
    {
      ...user,
      email: updatedEmail ?? user.email,
      name: profileUpdate.name ?? user.name,
      nickname: profileUpdate.nickname ?? user.nickname,
    },
    mentorProfile,
  );
};

module.exports = { getMyProfile, updateMyProfile };
