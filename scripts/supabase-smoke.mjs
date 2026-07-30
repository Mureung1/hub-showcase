import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { createRuntimeRepositories } from '../backend/http/server.mjs'
import { loadEnvFiles } from '../backend/shared/env.mjs'

const repoRoot = process.cwd()
loadEnvFiles({ fs, path, repoRoot })

const runtime = createRuntimeRepositories({
  ...process.env,
  ICU_REPOSITORY_MODE: 'supabase',
})
const {
  supabaseClient,
  progressRepository,
  mistakeNoteRepository,
  gitLabAttemptRepository,
  gitLabAttemptRecorder,
  generatedCurriculumRepository,
  profileRepository,
} = runtime

const originalProfile = await profileRepository.get()

const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
const ids = {
  mission: `icu-smoke-mission-${suffix}`,
  mistake: `icu-smoke-mistake-${suffix}`,
  attempt: `icu-smoke-attempt-${suffix}`,
  rollbackAttempt: `icu-smoke-rollback-${suffix}`,
  curriculum: `icu-smoke-curriculum-${suffix}`,
}
const now = new Date().toISOString()

try {
  const smokeProfile = {
    displayName: 'ICU smoke',
    learningGoal: 'Supabase profile roundtrip',
    preferredTracks: ['frontend'],
    dailyStudyMinutes: 25,
    level: 'beginner',
  }
  await profileRepository.save(smokeProfile)
  assert(
    (await profileRepository.get())?.learningGoal === smokeProfile.learningGoal,
    'learner_profiles save/get failed',
  )
  await profileRepository.remove()
  assert(!(await profileRepository.get()), 'learner_profiles remove failed')

  await progressRepository.saveMission({
    missionId: ids.mission,
    runState: 'passed',
    runAttemptCount: 1,
    activeStepOffset: 0,
    completedAt: now,
    activityLog: [{ type: 'smoke', at: now }],
    lastTestResult: { passed: true },
  })
  assert((await progressRepository.listMissions())[ids.mission], 'learning_progress CRUD failed')

  await mistakeNoteRepository.save(createMistakeNote(ids.mistake))
  assert(await mistakeNoteRepository.findById(ids.mistake), 'mistake_notes CRUD failed')

  await generatedCurriculumRepository.save({
    id: ids.curriculum,
    goal: 'Supabase smoke test',
    plan: { id: ids.curriculum, tracks: [] },
    generatedAt: now,
    updatedAt: now,
  })
  assert(await generatedCurriculumRepository.getById(ids.curriculum), 'generated_curriculums CRUD failed')

  await gitLabAttemptRecorder.record({
    attempt: createAttempt(ids.attempt),
    mistakeNote: {
      ...createMistakeNote(`icu-smoke-linked-${suffix}`),
      reason: `linked-${suffix}`,
    },
  })
  assert(
    (await gitLabAttemptRepository.list()).some((attempt) => attempt.id === ids.attempt),
    'Git Lab transaction write failed',
  )

  const rollbackResult = await supabaseClient.rpc('record_git_lab_attempt_with_mistake_note', {
    p_attempt: {
      id: ids.rollbackAttempt,
      lesson_id: 'icu-smoke',
      command: 'git status',
      result: 'failed',
      reason: 'rollback probe',
      created_at: now,
    },
    p_mistake_note: {
      id: `icu-smoke-invalid-${suffix}`,
      source: 'git-lab',
      lesson_id: 'icu-smoke',
      lesson_title: 'Supabase smoke',
      command: 'git status',
      reason: 'rollback probe',
      correction: null,
      created_at: now,
      reviewed_at: null,
      status: 'open',
    },
  })
  assert(rollbackResult.error, 'Git Lab rollback probe unexpectedly succeeded')

  const rollbackLookup = await supabaseClient
    .from('git_lab_attempts')
    .select('id')
    .eq('id', ids.rollbackAttempt)
    .maybeSingle()
  assert(!rollbackLookup.error && !rollbackLookup.data, 'Git Lab transaction did not roll back')

  console.log('Supabase smoke test passed: five repositories and transaction rollback verified.')
} finally {
  await Promise.all([
    originalProfile ? profileRepository.save(originalProfile) : profileRepository.remove(),
    supabaseClient.from('learning_progress').delete().eq('mission_id', ids.mission),
    supabaseClient.from('mistake_notes').delete().like('id', `icu-smoke-%-${suffix}`),
    supabaseClient.from('git_lab_attempts').delete().like('id', `icu-smoke-%-${suffix}`),
    supabaseClient.from('generated_curriculums').delete().eq('id', ids.curriculum),
  ])
}

function createAttempt(id) {
  return {
    id,
    lessonId: 'icu-smoke',
    command: 'git status',
    result: 'failed',
    reason: `smoke-${suffix}`,
    createdAt: now,
  }
}

function createMistakeNote(id) {
  return {
    id,
    source: 'git-lab',
    lessonId: 'icu-smoke',
    lessonTitle: 'Supabase smoke',
    command: 'git status',
    reason: `smoke-${suffix}`,
    correction: 'fixture를 정리합니다.',
    createdAt: now,
    reviewedAt: null,
    status: 'open',
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}
