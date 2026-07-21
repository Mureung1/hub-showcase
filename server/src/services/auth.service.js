const { supabase, supabaseAnon } = require('../db/supabase');
const { ValidationError, requireString, requireStringArray } = require('../utils/validators');

const GRADES = ['1', '2', '3', '4', '5+'];
const ENROLLMENT_STATUSES = ['enrolled', 'leave', 'graduated', 'other'];
const MIN_PASSWORD_LENGTH = 8;

class ConflictError extends Error {}

class AuthError extends Error {}

const requireEmail = (email) => {
  requireString(email, 'email');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ValidationError('올바른 이메일 형식이 아닙니다.', 'email');
  }
  return email;
};

const requirePassword = (password) => {
  requireString(password, 'password');
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new ValidationError(
      `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`,
      'password',
    );
  }
  return password;
};

const createAuthUser = async (email, password) => {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    if (error.code === 'email_exists' || error.status === 422) {
      throw new ConflictError('이미 가입된 이메일입니다.');
    }
    throw error;
  }

  return data.user;
};

const rollbackAuthUser = async (userId) => {
  await supabase.auth.admin.deleteUser(userId);
};

const signupMentee = async (payload) => {
  const email = requireEmail(payload?.email);
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

  const authUser = await createAuthUser(email, password);

  try {
    const { error: profileError } = await supabase.from('profiles').insert({
      id: authUser.id,
      role: 'mentee',
      name,
      nickname,
    });
    if (profileError) throw profileError;

    const { error: menteeError } = await supabase.from('mentee_profiles').insert({
      user_id: authUser.id,
      school,
      major,
      grade,
      enrollment_status: enrollmentStatus,
    });
    if (menteeError) throw menteeError;
  } catch (err) {
    await rollbackAuthUser(authUser.id);
    throw err;
  }

  return {
    id: authUser.id,
    email,
    role: 'mentee',
    name,
    nickname,
  };
};

const signupMentor = async (payload) => {
  const email = requireEmail(payload?.email);
  const password = requirePassword(payload?.password);
  const name = requireString(payload?.name, 'name');
  const nickname = requireString(payload?.nickname, 'nickname');
  const school = requireString(payload?.school, 'school');
  const major = requireString(payload?.major, 'major');
  const academicStatus = requireString(payload?.academicStatus, 'academicStatus');
  const program = requireString(payload?.program, 'program');
  const lab = requireString(payload?.lab, 'lab');
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

  const authUser = await createAuthUser(email, password);

  try {
    const { error: profileError } = await supabase.from('profiles').insert({
      id: authUser.id,
      role: 'mentor',
      name,
      nickname,
    });
    if (profileError) throw profileError;

    const { error: mentorError } = await supabase.from('mentor_profiles').insert({
      user_id: authUser.id,
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
    await rollbackAuthUser(authUser.id);
    throw err;
  }

  return {
    id: authUser.id,
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
    .select('id, role, name, nickname')
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
