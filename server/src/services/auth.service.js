const { supabase, supabaseAnon } = require('../db/supabase');
const { ENROLLMENT_STATUSES, GRADES } = require('../constants/mentee');
const { ConflictError } = require('../utils/errors');
const {
  ValidationError,
  requireEmail,
  requireLabName,
  requirePassword,
  requireString,
  requireStringArray,
} = require('../utils/validators');

class AuthError extends Error {}

const ensureProfileNotExists = async (userId) => {
  const { data: existingProfile, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (existingProfile) {
    throw new ConflictError('이미 가입된 이메일입니다.');
  }
};

const setAccountPassword = async (userId, password) => {
  const { error } = await supabase.auth.admin.updateUserById(userId, { password });
  if (error) throw error;
};

const rollbackProfile = async (userId) => {
  await supabase.from('profiles').delete().eq('id', userId);
};

const signupMentee = async (verifiedUser, payload) => {
  const email = verifiedUser.email;
  const password = requirePassword(payload?.password);
  const name = requireString(payload?.name, 'name');
  const nickname = requireString(payload?.nickname, 'nickname');
  const school = requireString(payload?.school, 'school');
  const major = requireString(payload?.major, 'major');
  const grade = requireString(payload?.grade, 'grade');
  const enrollmentStatus = requireString(payload?.enrollmentStatus, 'enrollmentStatus');

  if (!GRADES.includes(grade)) {
    throw new ValidationError(`grade는 ${GRADES.join(', ')} 중 하나여야 합니다.`, 'grade');
  }
  if (!ENROLLMENT_STATUSES.includes(enrollmentStatus)) {
    throw new ValidationError(
      `enrollmentStatus는 ${ENROLLMENT_STATUSES.join(', ')} 중 하나여야 합니다.`,
      'enrollmentStatus',
    );
  }

  await ensureProfileNotExists(verifiedUser.id);
  await setAccountPassword(verifiedUser.id, password);

  try {
    const { error: profileError } = await supabase.from('profiles').insert({
      id: verifiedUser.id,
      role: 'mentee',
      name,
      nickname,
    });
    if (profileError) throw profileError;

    const { error: menteeError } = await supabase.from('mentee_profiles').insert({
      user_id: verifiedUser.id,
      school,
      major,
      grade,
      enrollment_status: enrollmentStatus,
    });
    if (menteeError) throw menteeError;
  } catch (err) {
    await rollbackProfile(verifiedUser.id);
    throw err;
  }

  return {
    id: verifiedUser.id,
    email,
    role: 'mentee',
    name,
    nickname,
  };
};

const signupMentor = async (verifiedUser, payload) => {
  const email = verifiedUser.email;
  const password = requirePassword(payload?.password);
  const name = requireString(payload?.name, 'name');
  const nickname = requireString(payload?.nickname, 'nickname');
  const school = requireString(payload?.school, 'school');
  const major = requireString(payload?.major, 'major');
  const academicStatus = requireString(payload?.academicStatus, 'academicStatus');
  const program = requireString(payload?.program, 'program');
  const lab = requireLabName(payload?.lab, 'lab');
  const introduction = requireString(payload?.introduction, 'introduction');
  const detailedIntroduction = requireString(
    payload?.detailedIntroduction,
    'detailedIntroduction',
  );
  const availableTime = requireString(payload?.availableTime, 'availableTime');

  if (introduction.length > 120) {
    throw new ValidationError('introduction은 120자 이하여야 합니다.', 'introduction');
  }

  const researchFields = requireStringArray(payload?.researchFields, 'researchFields', {
    min: 3,
    max: 8,
  });
  const counselingFields = requireStringArray(payload?.counselingFields, 'counselingFields', {
    min: 1,
    max: 5,
  });
  const careerHighlights = requireStringArray(payload?.careerHighlights, 'careerHighlights', {
    min: 1,
    max: 5,
  });
  const internationalActivities = requireStringArray(
    payload?.internationalActivities,
    'internationalActivities',
    { min: 1, max: 5 },
  );

  await ensureProfileNotExists(verifiedUser.id);
  await setAccountPassword(verifiedUser.id, password);

  try {
    const { error: profileError } = await supabase.from('profiles').insert({
      id: verifiedUser.id,
      role: 'mentor',
      name,
      nickname,
    });
    if (profileError) throw profileError;

    const { error: mentorError } = await supabase.from('mentor_profiles').insert({
      user_id: verifiedUser.id,
      school,
      major,
      academic_status: academicStatus,
      program,
      lab,
      introduction,
      detailed_introduction: detailedIntroduction,
      research_fields: researchFields,
      counseling_fields: counselingFields,
      career_highlights: careerHighlights,
      international_activities: internationalActivities,
      available_time: availableTime,
    });
    if (mentorError) throw mentorError;
  } catch (err) {
    await rollbackProfile(verifiedUser.id);
    throw err;
  }

  return {
    id: verifiedUser.id,
    email,
    role: 'mentor',
    name,
    nickname,
  };
};

const login = async (payload) => {
  const email = requireEmail(payload?.email);
  const password = requireString(payload?.password, 'password');

  const { data, error } = await supabaseAnon.auth.signInWithPassword({ email, password });

  if (error || !data.session) {
    throw new AuthError('이메일 또는 비밀번호가 올바르지 않습니다.');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, name, nickname, mentor_list_onboarded_at, questionnaire_onboarded_at')
    .eq('id', data.user.id)
    .single();

  if (profileError || !profile) {
    throw new AuthError('사용자 프로필을 찾을 수 없습니다.');
  }

  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresIn: data.session.expires_in,
    user: {
      id: profile.id,
      email: data.user.email,
      role: profile.role,
      name: profile.name,
      nickname: profile.nickname,
      mentorListOnboardedAt: profile.mentor_list_onboarded_at,
      questionnaireOnboardedAt: profile.questionnaire_onboarded_at,
    },
  };
};

const logout = async (accessToken) => {
  const { error } = await supabase.auth.admin.signOut(accessToken, 'global');
  if (error) throw error;
};

module.exports = {
  AuthError,
  ConflictError,
  ValidationError,
  login,
  logout,
  signupMentee,
  signupMentor,
};
