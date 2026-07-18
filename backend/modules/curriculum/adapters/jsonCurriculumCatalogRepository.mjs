export const curriculumTrackFileNames = [
  'frontend.json',
  'backend.json',
  'fullstack.json',
  'devops.json',
  'software-engineer.json',
]

export function loadCurriculumTracks({ fs, path, repoRoot }) {
  const dataDir = path.join(repoRoot, 'shared', 'curriculum')

  return curriculumTrackFileNames.map((fileName) =>
    JSON.parse(fs.readFileSync(path.join(dataDir, fileName), 'utf8')),
  )
}