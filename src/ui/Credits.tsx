import { useEffect, useState } from 'react'

interface Source { title: string; author: string; url: string; license: string }

async function loadSources(packs: readonly string[]): Promise<Source[]> {
  const files = await Promise.all(packs.map((p) =>
    fetch(`${import.meta.env.BASE_URL}sounds/${p}/credits.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null)))
  const seen = new Map<string, Source>()
  for (const file of files) {
    const cues = (file as { cues?: Record<string, { sources?: unknown[] }> } | null)?.cues ?? {}
    for (const cue of Object.values(cues)) {
      for (const s of cue.sources ?? []) {
        const src = s as Partial<Source>
        if (src.url && src.author && src.license) seen.set(src.url, { title: src.title ?? '', author: src.author, url: src.url, license: src.license })
      }
    }
  }
  return [...seen.values()]
}

/** Who recorded each sound, read from the credits.json next to every sound pack. */
export function Credits({ packs }: { packs: readonly string[] }) {
  const [sources, setSources] = useState<Source[] | null>(null)
  useEffect(() => {
    let alive = true
    void loadSources(packs).then((s) => { if (alive) setSources(s) })
    return () => { alive = false }
  }, [packs])
  if (!sources) return <p className="note">불러오는 중…</p>
  return (
    <ul className="credits">
      {sources.map((s) => (
        <li key={s.url}>
          <a href={s.url} target="_blank" rel="noopener noreferrer">{s.title || s.url}</a> · {s.author} · {s.license}
        </li>
      ))}
    </ul>
  )
}
