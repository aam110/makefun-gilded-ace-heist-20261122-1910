// main.ts — hands the GILDED ACE entry in: copies game/ and screenshots/ into the
// output directory and writes dossier.json with the kit's buildDossier.
// Node standard library only. It never deletes anything: the output directory is
// created and written into, never removed (the grader cannot delete its mountpoint).

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const REPO_ROOT = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR || '/output';

const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
} as const;

function copyTreeIntoOutput(): void {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  for (const dir of ['game', 'screenshots']) {
    const source = join(REPO_ROOT, dir);
    if (!existsSync(source)) throw new Error(`main.ts: missing ${dir}/ in the repository`);
    cpSync(source, join(OUTPUT_DIR, dir), { recursive: true });
  }
}

function writeDossier(): void {
  const dossier = buildDossier(OUTPUT_DIR, DOSSIER_CAPS);
  writeFileSync(join(OUTPUT_DIR, 'dossier.json'), dossier);
}

copyTreeIntoOutput();
writeDossier();
