const BASE_URL = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug'

export async function nameToSmiles(name: string): Promise<string | null> {
  const url = `${BASE_URL}/compound/name/${encodeURIComponent(name)}/property/CanonicalSMILES/TXT`
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const text = await res.text()
    return text.trim() || null
  } catch {
    return null
  }
}

export async function smilesToCid(smiles: string): Promise<number | null> {
  const url = `${BASE_URL}/compound/smiles/${encodeURIComponent(smiles)}/cids/TXT`
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const text = await res.text()
    const cid = parseInt(text.trim().split('\n')[0], 10)
    return Number.isFinite(cid) ? cid : null
  } catch {
    return null
  }
}

export async function fetchSdf3d(cid: number): Promise<string | null> {
  const url = `${BASE_URL}/compound/cid/${cid}/record/SDF/?record_type=3d`
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}
