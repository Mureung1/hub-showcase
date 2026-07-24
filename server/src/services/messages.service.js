const { supabase } = require('../db/supabase');
const { fetchApplicationRow } = require('./applications.service');
const { ConflictError, ForbiddenError } = require('../utils/errors');
const { ValidationError, requireString } = require('../utils/validators');

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const MAX_BODY_LENGTH = 2000;

const assertParticipant = (userId, application) => {
  if (application.mentee_id !== userId && application.accepted_mentor_id !== userId) {
    throw new ForbiddenError('이 신청의 채팅에 접근할 권한이 없습니다.');
  }
};

const assertConfirmed = (application) => {
  if (application.status !== 'confirmed') {
    throw new ConflictError(
      '확정된 신청에서만 메시지를 주고받을 수 있습니다.',
      'APPLICATION_NOT_CONFIRMED',
    );
  }
};

const encodeCursor = (row) =>
  Buffer.from(JSON.stringify({ createdAt: row.created_at, id: row.id })).toString('base64');

const decodeCursor = (cursor) => {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
    if (!parsed.createdAt || !parsed.id) throw new Error('invalid');
    return parsed;
  } catch {
    throw new ValidationError('cursor 값을 확인해 주세요.', 'cursor');
  }
};

const toApiMessage = (row) => ({
  id: row.id,
  applicationId: row.application_id,
  senderId: row.sender_id,
  senderName: row.profiles?.name ?? null,
  body: row.body,
  createdAt: row.created_at,
});

const listMessages = async (userId, applicationId, { cursor, limit } = {}) => {
  const application = await fetchApplicationRow(applicationId);
  assertParticipant(userId, application);

  const pageSize = Number.isInteger(limit) && limit > 0 ? Math.min(limit, MAX_LIMIT) : DEFAULT_LIMIT;

  let query = supabase
    .from('messages')
    .select('*, profiles(name)')
    .eq('application_id', applicationId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(pageSize + 1);

  if (cursor) {
    const { createdAt, id } = decodeCursor(cursor);
    query = query.or(`created_at.lt.${createdAt},and(created_at.eq.${createdAt},id.lt.${id})`);
  }

  const { data, error } = await query;
  if (error) throw error;

  const hasMore = data.length > pageSize;
  const page = hasMore ? data.slice(0, pageSize) : data;
  const nextCursor = hasMore ? encodeCursor(page[page.length - 1]) : null;

  return {
    // page는 최신순으로 가져왔으므로, 화면에 표시할 시간 오름차순으로 뒤집는다.
    data: page.map(toApiMessage).reverse(),
    meta: { hasMore, nextCursor },
  };
};

const createMessage = async (userId, applicationId, body) => {
  const application = await fetchApplicationRow(applicationId);
  assertParticipant(userId, application);
  assertConfirmed(application);

  const content = requireString(body, 'body');
  if (content.length > MAX_BODY_LENGTH) {
    throw new ValidationError(`body는 ${MAX_BODY_LENGTH}자 이하여야 합니다.`, 'body');
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({ application_id: applicationId, sender_id: userId, body: content })
    .select('*, profiles(name)')
    .single();

  if (error) throw error;

  return toApiMessage(data);
};

module.exports = { createMessage, listMessages };
