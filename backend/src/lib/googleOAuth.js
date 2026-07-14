import { OAuth2Client } from 'google-auth-library'

export const oauth2Client = new OAuth2Client({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_CALLBACK_URL,
})

export function buildGoogleAuthUrl(state) {
  return oauth2Client.generateAuthUrl({
    access_type: 'online',
    scope: ['openid', 'email', 'profile'],
    ...(state ? { state } : {}),
  })
}

export async function fetchGoogleProfile(code) {
  const { tokens } = await oauth2Client.getToken(code)
  const ticket = await oauth2Client.verifyIdToken({
    idToken: tokens.id_token,
    audience: process.env.GOOGLE_CLIENT_ID,
  })
  const payload = ticket.getPayload()
  return { googleId: payload.sub, email: payload.email, username: payload.name }
}
