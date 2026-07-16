import { supabase } from '../../../lib/supabase'

const EMAIL_DOMAIN = 'users.hub-visualizer.com'

function toFakeEmail(username: string) {
  return `${username}@${EMAIL_DOMAIN}`
}

export async function signUpWithUsername(username: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email: toFakeEmail(username),
    password,
  })
  if (error) throw new Error(error.message)
  if (!data.user) throw new Error('회원가입에 실패했어요. 다시 시도해주세요.')

  const { error: profileError } = await supabase
    .from('profiles')
    .insert({ id: data.user.id, username })
  if (profileError) throw new Error(profileError.message)
}

export async function signInWithUsername(username: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({
    email: toFakeEmail(username),
    password,
  })
  if (error) throw new Error(error.message)
}
