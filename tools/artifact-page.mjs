#!/usr/bin/env node
// Turns the Vite build into a claude.ai Artifact page. The Artifact host wraps the page in its
// own <html>/<head>/<body>, so this keeps only the title, styles, scripts and the React root,
// and lists every other built file to publish alongside it.
//
//   node tools/artifact-page.mjs [distDir]   → writes <distDir>/artifact.html, prints the file map as JSON

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const dist = process.argv[2] ?? 'dist'
const html = readFileSync(join(dist, 'index.html'), 'utf8')
const title = html.match(/<title>[\s\S]*?<\/title>/)?.[0] ?? '<title>왁뿌 타워</title>'
const assets = [...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="\.\/assets\/[^"]+"[^>]*>(?:<\/script>)?/g)].map((m) => m[0])

const page = [
  title,
  '<meta name="claude:viewport-fit-sides" content="cover">',
  '<link rel="icon" type="image/svg+xml" href="./favicon.svg">',
  ...assets.filter((a) => a.startsWith('<link')),
  '<div id="root"></div>',
  ...assets.filter((a) => a.startsWith('<script')),
].join('\n')
writeFileSync(join(dist, 'artifact.html'), page + '\n')

const files = {}
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full)
    else {
      const rel = relative(dist, full)
      if (rel !== 'index.html' && rel !== 'artifact.html') files[rel] = full
    }
  }
}
walk(dist)
console.log(JSON.stringify(files, null, 2))
