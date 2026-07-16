const { randomUUID } = require('node:crypto');

const {
  applicationMentors,
  applications,
  menteeProfiles,
  mentorProfiles,
  profiles,
} = require('../data/mockData');

const getMentee = (menteeId) => ({
  ...profiles.find((profile) => profile.id === menteeId),
  ...menteeProfiles.find((profile) => profile.userId === menteeId),
});

const getMentor = (mentorId) => ({
  ...profiles.find((profile) => profile.id === mentorId),
  ...mentorProfiles.find((profile) => profile.userId === mentorId),
});

const getApplicationResponse = (application) => {
  const mentorLinks = applicationMentors.filter(
    (link) => link.applicationId === application.id,
  );

  return {
    id: application.id,
    menteeId: application.menteeId,
    status: application.status,
    questionnaire: {
      introduction: application.introduction,
      concern: application.concern,
      goal: application.goal,
      preferredTime: application.preferredTime,
    },
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
    mentee: getMentee(application.menteeId),
    mentors: mentorLinks.map((link) => ({
      ...getMentor(link.mentorId),
      applicationStatus: link.status,
      respondedAt: link.respondedAt,
    })),
  };
};

const createApplication = (req, res) => {
  const { menteeId, mentorId, mentorIds, questionnaire } = req.body;
  const selectedMentorIds = mentorIds ?? (mentorId ? [mentorId] : []);

  const menteeExists = menteeProfiles.some(
    (profile) => profile.userId === menteeId,
  );
  const mentorsExist = selectedMentorIds.every((id) =>
    mentorProfiles.some((profile) => profile.userId === id),
  );
  const hasValidMentorCount =
    selectedMentorIds.length >= 1 && selectedMentorIds.length <= 3;
  const hasQuestionnaire =
    questionnaire?.introduction &&
    questionnaire?.concern &&
    questionnaire?.goal &&
    questionnaire?.preferredTime;

  if (!menteeId || !hasValidMentorCount || !hasQuestionnaire) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message:
          'menteeId, 1~3개의 mentorIds, 사전 질문지 4문항은 필수입니다.',
      },
    });
  }

  if (!menteeExists || !mentorsExist) {
    return res.status(404).json({
      error: {
        code: 'USER_NOT_FOUND',
        message: 'mock 데이터에서 멘티 또는 멘토를 찾을 수 없습니다.',
      },
    });
  }

  const now = new Date().toISOString();
  const application = {
    id: randomUUID(),
    menteeId,
    introduction: questionnaire.introduction,
    concern: questionnaire.concern,
    goal: questionnaire.goal,
    preferredTime: questionnaire.preferredTime,
    status: 'pending',
    acceptedMentorId: null,
    createdAt: now,
    updatedAt: now,
  };

  applications.push(application);
  selectedMentorIds.forEach((id) => {
    applicationMentors.push({
      applicationId: application.id,
      mentorId: id,
      status: 'pending',
      respondedAt: null,
      createdAt: now,
    });
  });

  return res.status(201).json({ data: getApplicationResponse(application) });
};

const getApplications = (req, res) => {
  const { menteeId, mentorId, status } = req.query;

  const filteredApplications = applications.filter((application) => {
    const mentorLink = applicationMentors.find(
      (link) =>
        link.applicationId === application.id && link.mentorId === mentorId,
    );

    if (menteeId && application.menteeId !== menteeId) return false;
    if (mentorId && !mentorLink) return false;
    if (status && mentorId && mentorLink.status !== status) return false;
    if (status && !mentorId && application.status !== status) return false;
    return true;
  });

  return res.json({
    data: filteredApplications.map(getApplicationResponse),
    meta: { total: filteredApplications.length },
  });
};

const acceptApplication = (req, res) => {
  const { applicationId } = req.params;
  const requestedMentorId = req.body?.mentorId ?? req.query.mentorId;
  const application = applications.find((item) => item.id === applicationId);

  if (!application) {
    return res.status(404).json({
      error: {
        code: 'APPLICATION_NOT_FOUND',
        message: '면담 신청을 찾을 수 없습니다.',
      },
    });
  }

  const mentorLink = applicationMentors.find(
    (link) =>
      link.applicationId === applicationId &&
      (!requestedMentorId || link.mentorId === requestedMentorId),
  );

  if (!mentorLink) {
    return res.status(404).json({
      error: {
        code: 'APPLICATION_MENTOR_NOT_FOUND',
        message: '해당 신청에 연결된 멘토를 찾을 수 없습니다.',
      },
    });
  }

  if (application.status !== 'pending' || mentorLink.status !== 'pending') {
    return res.status(409).json({
      error: {
        code: 'APPLICATION_ALREADY_PROCESSED',
        message: '이미 처리된 면담 신청입니다.',
      },
    });
  }

  const now = new Date().toISOString();
  application.status = 'confirmed';
  application.acceptedMentorId = mentorLink.mentorId;
  application.updatedAt = now;
  mentorLink.status = 'confirmed';
  mentorLink.respondedAt = now;

  applicationMentors
    .filter(
      (link) =>
        link.applicationId === applicationId && link !== mentorLink,
    )
    .forEach((link) => {
      link.status = 'rejected';
      link.respondedAt = now;
    });

  return res.json({ data: getApplicationResponse(application) });
};

module.exports = {
  acceptApplication,
  createApplication,
  getApplications,
};
