const { supabase } = require('../db/supabase');
const { ValidationError } = require('../utils/validators');

const TOUR_COLUMNS = {
  mentorList: 'mentor_list_onboarded_at',
  questionnaire: 'questionnaire_onboarded_at',
};

const toApiOnboardingStatus = (profile) => ({
  mentorListOnboardedAt: profile.mentor_list_onboarded_at,
  questionnaireOnboardedAt: profile.questionnaire_onboarded_at,
});

const completeOnboarding = async (user, payload = {}) => {
  const tour = payload.tour;
  const column = TOUR_COLUMNS[tour];

  if (!column) {
    throw new ValidationError(
      `tour는 ${Object.keys(TOUR_COLUMNS).join(', ')} 중 하나여야 합니다.`,
      'tour',
    );
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .update({ [column]: new Date().toISOString() })
    .eq('id', user.id)
    .select('mentor_list_onboarded_at, questionnaire_onboarded_at')
    .single();

  if (error || !profile) throw error ?? new Error('온보딩 상태를 저장하지 못했습니다.');

  return toApiOnboardingStatus(profile);
};

module.exports = { completeOnboarding };
