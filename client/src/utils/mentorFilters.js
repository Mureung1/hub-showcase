export const initialMentorFilters = {
  query: "",
  researchField: "",
  counselingField: "",
  major: "",
  academicStatus: "",
  lab: "",
};

const normalize = (value) => String(value ?? "").trim().toLocaleLowerCase("ko-KR");

const includesText = (value, searchValue) => normalize(value).includes(normalize(searchValue));

export function filterMentors(mentors, filters) {
  return mentors.filter((mentor) => {
    const searchableProfile = [
      mentor.name,
      mentor.school,
      mentor.lab,
      mentor.academicStatus,
      mentor.program,
      mentor.introduction,
      mentor.detailedIntroduction,
      mentor.major,
      ...mentor.keywords,
      ...mentor.counselingFields,
    ].join(" ");

    return (
      includesText(searchableProfile, filters.query)
      && (!filters.researchField
        || mentor.keywords.some((keyword) => includesText(keyword, filters.researchField)))
      && (!filters.counselingField || mentor.counselingFields.includes(filters.counselingField))
      && includesText(mentor.major, filters.major)
      && (!filters.academicStatus || mentor.academicStatus === filters.academicStatus)
      && includesText(mentor.lab, filters.lab)
    );
  });
}
