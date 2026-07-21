const { mentorProfiles, profiles } = require('../data/mockData');
const { sendError } = require('../utils/apiError');

const getMentorSummary = (mentorProfile) => {
  const profile = profiles.find((item) => item.id === mentorProfile.userId);

  return {
    id: mentorProfile.userId,
    name: profile.name,
    nickname: profile.nickname,
    school: mentorProfile.school,
    major: mentorProfile.major,
    academicStatus: mentorProfile.academicStatus,
    program: mentorProfile.program,
    lab: mentorProfile.lab,
    introduction: mentorProfile.introduction,
    researchFields: mentorProfile.researchFields,
    counselingFields: mentorProfile.counselingFields,
    availableTime: mentorProfile.availableTime,
  };
};

const getMentorDetail = (mentorProfile) => ({
  ...getMentorSummary(mentorProfile),
  detailedIntroduction: mentorProfile.detailedIntroduction,
  careerHighlights: mentorProfile.careerHighlights,
  internationalActivities: mentorProfile.internationalActivities,
});

const matchesQuery = (mentorProfile, profile, query) => {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) return true;

  const searchableFields = [
    profile.name,
    mentorProfile.school,
    mentorProfile.major,
    ...mentorProfile.researchFields,
  ];

  return searchableFields.some((field) =>
    field?.toLowerCase().includes(normalizedQuery),
  );
};

const matchesExact = (value, filterValue) => {
  if (!filterValue) return true;

  return value?.toLowerCase() === filterValue.trim().toLowerCase();
};

const matchesListField = (values, filterValue) => {
  if (!filterValue) return true;

  const normalizedFilterValue = filterValue.trim().toLowerCase();

  return values.some((value) => value.toLowerCase() === normalizedFilterValue);
};

const getMentors = (req, res) => {
  const { query, researchField, counselingField, major, academicStatus, lab } =
    req.query;

  const filteredMentors = mentorProfiles
    .filter((mentorProfile) => {
      const profile = profiles.find((item) => item.id === mentorProfile.userId);

      return (
        profile &&
        (!query || matchesQuery(mentorProfile, profile, query)) &&
        matchesListField(mentorProfile.researchFields, researchField) &&
        matchesListField(mentorProfile.counselingFields, counselingField) &&
        matchesExact(mentorProfile.major, major) &&
        matchesExact(mentorProfile.academicStatus, academicStatus) &&
        matchesExact(mentorProfile.lab, lab)
      );
    })
    .map(getMentorSummary);

  return res.json({
    data: filteredMentors,
    meta: { total: filteredMentors.length },
  });
};

const getMentorById = (req, res) => {
  const { mentorId } = req.params;
  const mentorProfile = mentorProfiles.find((item) => item.userId === mentorId);

  if (!mentorProfile) {
    return sendError(res, 404, 'MENTOR_NOT_FOUND', '멘토 정보를 찾을 수 없습니다.');
  }

  return res.json({ data: getMentorDetail(mentorProfile) });
};

module.exports = {
  getMentorById,
  getMentors,
};
