const TOP_N = 3;

function buildProfileText(profile) {
  const parts = [
    profile.major,
    profile.doubleMajor,
    profile.minor,
    ...(profile.certificates ?? []),
    profile.experience,
  ].filter(Boolean);

  return parts.join(" ");
}

function parseGpa(gpaInput) {
  const match = String(gpaInput).match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function countKeywordOverlap(profileText, keywords) {
  return keywords.filter((keyword) => profileText.includes(keyword)).length;
}

function scorePosting(profile, posting) {
  const overlapCount = countKeywordOverlap(buildProfileText(profile), posting.keywords ?? []);
  const gpa = parseGpa(profile.gpa);
  const gpaScore = gpa >= (posting.gpaMin ?? 0) ? 1 : -3;

  return overlapCount * 2 + gpaScore;
}

export function scoreAndRank(profile, postings) {
  return postings
    .map((posting) => ({ ...posting, score: scorePosting(profile, posting) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(a.deadline) - new Date(b.deadline);
    })
    .slice(0, TOP_N);
}
