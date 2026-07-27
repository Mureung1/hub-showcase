const { supabase } = require('../db/supabase');

const SELECT_FIELDS = '*, profiles(name, nickname)';

const toSummary = (row) => ({
  id: row.user_id,
  name: row.profiles.name,
  nickname: row.profiles.nickname,
  school: row.school,
  major: row.major,
  academicStatus: row.academic_status,
  program: row.program,
  lab: row.lab,
  introduction: row.introduction,
  researchFields: row.research_fields,
  counselingFields: row.counseling_fields,
  availableTime: row.available_time,
});

const toDetail = (row) => ({
  ...toSummary(row),
  detailedIntroduction: row.detailed_introduction,
  careerHighlights: row.career_highlights,
  internationalActivities: row.international_activities,
});

const matchesQuery = (row, query) => {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) return true;

  const searchableFields = [row.profiles.name, row.school, row.major, ...row.research_fields];

  return searchableFields.some((field) => field?.toLowerCase().includes(normalizedQuery));
};

const matchesExact = (value, filterValue) => {
  if (!filterValue) return true;

  return value?.toLowerCase() === filterValue.trim().toLowerCase();
};

const parseKeywords = (filterValue) => {
  if (!filterValue) return [];

  return filterValue
    .split(',')
    .map((keyword) => keyword.trim().toLowerCase())
    .filter((keyword) => keyword.length > 0);
};

const matchesSubstring = (value, filterValue) => {
  const keywords = parseKeywords(filterValue);

  if (keywords.length === 0) return true;

  return keywords.some((keyword) => value?.toLowerCase().includes(keyword));
};

const matchesListFieldExact = (values, filterValue) => {
  if (!filterValue) return true;

  const normalizedFilterValue = filterValue.trim().toLowerCase();

  return values.some((value) => value.toLowerCase() === normalizedFilterValue);
};

const matchesListFieldSubstring = (values, filterValue) => {
  const keywords = parseKeywords(filterValue);

  if (keywords.length === 0) return true;

  return values.some((value) =>
    keywords.some((keyword) => value.toLowerCase().includes(keyword)),
  );
};

const listMentors = async ({
  query,
  researchField,
  counselingField,
  major,
  academicStatus,
  lab,
} = {}) => {
  const { data, error } = await supabase.from('mentor_profiles').select(SELECT_FIELDS);

  if (error) throw error;

  return data
    .filter(
      (row) =>
        (!query || matchesQuery(row, query)) &&
        matchesListFieldSubstring(row.research_fields, researchField) &&
        matchesListFieldExact(row.counseling_fields, counselingField) &&
        matchesSubstring(row.major, major) &&
        matchesExact(row.academic_status, academicStatus) &&
        matchesSubstring(row.lab, lab),
    )
    .map(toSummary);
};

const getMentorDetail = async (mentorId) => {
  const { data, error } = await supabase
    .from('mentor_profiles')
    .select(SELECT_FIELDS)
    .eq('user_id', mentorId)
    .single();

  if (error || !data) return null;

  return toDetail(data);
};

module.exports = { getMentorDetail, listMentors };
