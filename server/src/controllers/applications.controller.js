const crypto = require('node:crypto');

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

const getMenteeApplicationResponse = (application) => {
  const mentorLinks = applicationMentors.filter(
    (link) => link.applicationId === application.id,
  );

  return {
    id: application.id,
    status: application.status,
    acceptedMentorId: application.acceptedMentorId,
    mentors: mentorLinks.map((link) => {
      const profile = profiles.find((item) => item.id === link.mentorId);
      const mentorProfile = mentorProfiles.find(
        (item) => item.userId === link.mentorId,
      );

      return {
        id: link.mentorId,
        name: profile.name,
        school: mentorProfile.school,
        major: mentorProfile.major,
        academicStatus: mentorProfile.academicStatus,
      };
    }),
    questionnaire: {
      introduction: application.introduction,
      concern: application.concern,
      goal: application.goal,
      preferredTime: application.preferredTime,
    },
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
  };
};

const getMentorApplicationResponse = (application, mentorLink) => {
  const profile = profiles.find((item) => item.id === application.menteeId);
  const menteeProfile = menteeProfiles.find(
    (item) => item.userId === application.menteeId,
  );

  return {
    id: application.id,
    applicationStatus: application.status,
    mentorStatus: mentorLink.status,
    acceptedMentorId: application.acceptedMentorId,
    mentee: {
      id: application.menteeId,
      name: profile.name,
      school: menteeProfile.school,
      major: menteeProfile.major,
      grade: menteeProfile.grade,
      enrollmentStatus: menteeProfile.enrollmentStatus,
    },
    questionnaire: {
      introduction: application.introduction,
      concern: application.concern,
      goal: application.goal,
      preferredTime: application.preferredTime,
    },
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
  };
};

const createApplication = (req, res) => {
  if (req.user.role !== 'mentee') {
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: '멘티만 면담을 신청할 수 있습니다.',
        details: {},
      },
    });
  }

  const { mentorIds, questionnaire } = req.body ?? {};

  if (!Array.isArray(mentorIds)) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'mentorIds는 배열이어야 합니다.',
        details: { field: 'mentorIds' },
      },
    });
  }

  if (mentorIds.length < 1 || mentorIds.length > 3) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: '멘토는 1명 이상 3명 이하로 선택해야 합니다.',
        details: { field: 'mentorIds' },
      },
    });
  }

  if (new Set(mentorIds).size !== mentorIds.length) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'mentorIds에는 중복된 멘토 ID를 넣을 수 없습니다.',
        details: { field: 'mentorIds' },
      },
    });
  }

  const invalidMentorId = mentorIds.find(
    (mentorId) =>
      !mentorProfiles.some((profile) => profile.userId === mentorId),
  );

  if (invalidMentorId) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: '존재하지 않는 멘토가 포함되어 있습니다.',
        details: { field: 'mentorIds', mentorId: invalidMentorId },
      },
    });
  }

  const requiredQuestionnaireFields = [
    'introduction',
    'concern',
    'goal',
    'preferredTime',
  ];
  const missingField = requiredQuestionnaireFields.find(
    (field) =>
      typeof questionnaire?.[field] !== 'string' ||
      questionnaire[field].trim() === '',
  );

  if (missingField) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: `questionnaire.${missingField}은(는) 필수입니다.`,
        details: { field: `questionnaire.${missingField}` },
      },
    });
  }

  const now = new Date().toISOString();
  const application = {
    id: crypto.randomUUID(),
    menteeId: req.user.id,
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
  mentorIds.forEach((mentorId) => {
    applicationMentors.push({
      applicationId: application.id,
      mentorId,
      status: 'pending',
      respondedAt: null,
      createdAt: now,
    });
  });

  return res.status(201).json({
    data: {
      id: application.id,
      status: application.status,
      mentorIds,
      questionnaire: {
        introduction: application.introduction,
        concern: application.concern,
        goal: application.goal,
        preferredTime: application.preferredTime,
      },
      createdAt: application.createdAt,
    },
  });
};

const getApplications = (req, res) => {
  const { status } = req.query;
  const allowedStatuses = ['pending', 'confirmed', 'completed', 'rejected'];

  if (status && !allowedStatuses.includes(status)) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: '허용되지 않는 신청 상태입니다.',
        details: { field: 'status', allowedValues: allowedStatuses },
      },
    });
  }

  if (req.user.role === 'mentee') {
    const menteeApplications = applications
      .filter(
        (application) =>
          application.menteeId === req.user.id &&
          (!status || application.status === status),
      )
      .map(getMenteeApplicationResponse);

    return res.json({
      data: menteeApplications,
      meta: { total: menteeApplications.length },
    });
  }

  if (req.user.role === 'mentor') {
    const mentorApplications = applicationMentors
      .filter(
        (link) =>
          link.mentorId === req.user.id && (!status || link.status === status),
      )
      .map((link) => {
        const application = applications.find(
          (item) => item.id === link.applicationId,
        );

        return getMentorApplicationResponse(application, link);
      });

    return res.json({
      data: mentorApplications,
      meta: { total: mentorApplications.length },
    });
  }

  return res.status(403).json({
    error: {
      code: 'FORBIDDEN',
      message: '면담 신청 목록을 조회할 권한이 없습니다.',
      details: {},
    },
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
