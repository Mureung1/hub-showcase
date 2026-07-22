import { supabase, createAuthClient } from '../db/supabaseClient.js'
import { ApiError } from '../middleware/errorHandler.js'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8

function validateCredentials(email, password) {
  if (!email || !EMAIL_PATTERN.test(email)) {
    throw new ApiError(400, 'INVALID_EMAIL', '올바른 이메일 형식이 아니에요.')
  }
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    throw new ApiError(400, 'WEAK_PASSWORD', `비밀번호는 최소 ${MIN_PASSWORD_LENGTH}자 이상이어야 해요.`)
  }
}

function toPublicUser(user) {
  return { id: user.id, email: user.email }
}

export async function signup(email, password) {
  validateCredentials(email, password)

  // email_confirm: true — 이메일 확인 절차 없이 즉시 가입 완료 처리(기존 "회원가입하면 바로 로그인" 동작 유지).
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (createError) {
    if (createError.code === 'email_exists') {
      throw new ApiError(409, 'EMAIL_TAKEN', '이미 가입된 이메일이에요.')
    }
    throw new ApiError(500, 'AUTH_FAILED', '회원가입에 실패했어요. 잠시 후 다시 시도해주세요.')
  }

  const { data: signedIn, error: signInError } = await createAuthClient().auth.signInWithPassword({
    email,
    password,
  })
  if (signInError) {
    throw new ApiError(500, 'AUTH_FAILED', '회원가입은 됐지만 로그인에 실패했어요. 다시 로그인해주세요.')
  }

  return { user: toPublicUser(created.user), token: signedIn.session.access_token }
}

export async function login(email, password) {
  const { data, error } = await createAuthClient().auth.signInWithPassword({ email, password })

  if (error) {
    if (error.code === 'invalid_credentials') {
      throw new ApiError(401, 'INVALID_CREDENTIALS', '이메일 또는 비밀번호가 올바르지 않아요.')
    }
    throw new ApiError(500, 'AUTH_FAILED', '로그인에 실패했어요. 잠시 후 다시 시도해주세요.')
  }

  return { user: toPublicUser(data.user), token: data.session.access_token }
}

export async function logout(token) {
  await supabase.auth.admin.signOut(token)
}

export async function getUserByToken(token) {
  if (!token) return null
  const { data, error } = await createAuthClient().auth.getUser(token)
  if (error || !data.user) return null
  return toPublicUser(data.user)
}
