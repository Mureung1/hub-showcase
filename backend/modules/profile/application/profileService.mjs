import { normalizeLearnerProfile } from '../domain/learnerProfile.mjs'

export async function getProfile({ repository }) {
  return await repository.get()
}

export async function saveProfile({ input, repository }) {
  return await repository.save(normalizeLearnerProfile(input))
}

export async function deleteProfile({ repository }) {
  await repository.remove()
}
