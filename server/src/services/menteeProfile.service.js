const { ENROLLMENT_STATUSES, GRADES } = require('../constants/mentee');
const { supabase } = require('../db/supabase');
const { ValidationError, requireString } = require('../utils/validators');

const toApiProfile = (user, menteeProfile) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  nickname: user.nickname,
  school: menteeProfile.school,
  major: menteeProfile.major,
  grade: menteeProfile.grade,
  enrollmentStatus: menteeProfile.enrollment_status,
});

const fetchMenteeProfileRow = async (userId) => {
  const { data: menteeProfile, error } = await supabase
    .from('mentee_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !menteeProfile) {
    throw new Error('멘티 프로필을 찾을 수 없습니다.');
  }

  return menteeProfile;
};

const getMyProfile = async (user) => {
  const menteeProfile = await fetchMenteeProfileRow(user.id);
  return toApiProfile(user, menteeProfile);
};

const updateMyProfile = async (user, payload = {}) => {
  const profileUpdate = {};
  const menteeProfileUpdate = {};

  if (payload.name !== undefined) {
    profileUpdate.name = requireString(payload.name, 'name');
  }

  if (payload.nickname !== undefined) {
    profileUpdate.nickname = requireString(payload.nickname, 'nickname');
  }

  if (payload.school !== undefined) {
    menteeProfileUpdate.school = requireString(payload.school, 'school');
  }

  if (payload.major !== undefined) {
    menteeProfileUpdate.major = requireString(payload.major, 'major');
  }

  if (payload.grade !== undefined) {
    const grade = requireString(payload.grade, 'grade');
    if (!GRADES.includes(grade)) {
      throw new ValidationError(`grade는 ${GRADES.join(', ')} 중 하나여야 합니다.`, 'grade');
    }
    menteeProfileUpdate.grade = grade;
  }

  if (payload.enrollmentStatus !== undefined) {
    const enrollmentStatus = requireString(payload.enrollmentStatus, 'enrollmentStatus');
    if (!ENROLLMENT_STATUSES.includes(enrollmentStatus)) {
      throw new ValidationError(
        `enrollmentStatus는 ${ENROLLMENT_STATUSES.join(', ')} 중 하나여야 합니다.`,
        'enrollmentStatus',
      );
    }
    menteeProfileUpdate.enrollment_status = enrollmentStatus;
  }

  if (Object.keys(profileUpdate).length > 0) {
    const { error } = await supabase.from('profiles').update(profileUpdate).eq('id', user.id);
    if (error) throw error;
  }

  if (Object.keys(menteeProfileUpdate).length > 0) {
    const { error } = await supabase
      .from('mentee_profiles')
      .update(menteeProfileUpdate)
      .eq('user_id', user.id);
    if (error) throw error;
  }

  const menteeProfile = await fetchMenteeProfileRow(user.id);
  return toApiProfile(
    {
      ...user,
      name: profileUpdate.name ?? user.name,
      nickname: profileUpdate.nickname ?? user.nickname,
    },
    menteeProfile,
  );
};

module.exports = { getMyProfile, updateMyProfile };
