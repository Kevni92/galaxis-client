// Feature: GAL-CLIENT-A0-E2E-001
// Fachlicher Ablauf: docs/roadmap/IMPLEMENTATION-ROADMAP.md (Abschnitt 5.6 "A0-Abnahmedemo")
//
// Orchestriert den A0-End-to-End-Smoke gegen einen echten Server: startet PostgreSQL und den
// Server aus dem Nachbar-Repository `galaxis-server`, wartet ohne feste Wartezeiten auf dessen
// Bereitschaft, führt `playwright.a0.config.ts` aus und beendet den Serverprozess anschließend
// wieder. Der Client selbst bleibt Vue-/Vite-only; dieses Skript ist reine Testorchestrierung.
//
// Server-Repository-Ort: `GALAXIS_SERVER_DIR` (Standard: `../server`, passend zum lokalen
// Nebeneinander-Checkout; CI setzt eine eigene ausgecheckte Kopie).

import { spawn, spawnSync } from 'node:child_process'
import { createWriteStream, existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const clientRoot = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const serverDir = path.resolve(
  process.env.GALAXIS_SERVER_DIR ?? path.join(clientRoot, '..', 'server'),
)

// Unter Windows sind `pnpm`/`docker` .cmd-Shims und lassen sich nur über eine Shell starten;
// dafür wird die gesamte Kommandozeile als ein String übergeben (kein Array neben `shell: true`),
// damit Node keine unsichere Argumentzusammenführung warnt (DEP0190) – die Teile sind rein
// statisch und enthalten keine externe Eingabe.
const useShell = process.platform === 'win32'

function spawnArgs(parts, options) {
  return useShell
    ? [parts.join(' '), { shell: true, ...options }]
    : [parts[0], parts.slice(1), options]
}

const GALAXIS_PORT = '3000'
const GALAXIS_HOST = '127.0.0.1'
const serverEnv = {
  ...process.env,
  GALAXIS_PORT,
  GALAXIS_HOST,
  GALAXIS_LOG_LEVEL: process.env.GALAXIS_LOG_LEVEL ?? 'info',
  GALAXIS_DATABASE_URL:
    process.env.GALAXIS_DATABASE_URL ?? 'postgres://galaxis:galaxis@127.0.0.1:5432/galaxis',
}

function fail(message) {
  console.error(`[run-e2e-a0] ${message}`)
  process.exitCode = 1
  throw new Error(message)
}

function run(parts, options) {
  console.log(`[run-e2e-a0] $ ${parts.join(' ')} (cwd: ${options.cwd})`)
  const result = spawnSync(...spawnArgs(parts, { stdio: 'inherit', ...options }))
  if (result.status !== 0) {
    fail(`Befehl fehlgeschlagen (${result.status}): ${parts.join(' ')}`)
  }
}

async function waitForReady(url, { timeoutMs, intervalMs, describe }) {
  const deadline = Date.now() + timeoutMs
  let lastError
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)
      if (response.ok) return
      lastError = new Error(`HTTP ${response.status}`)
    } catch (error) {
      lastError = error
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
  fail(`${describe} wurde innerhalb von ${timeoutMs}ms nicht bereit: ${String(lastError)}`)
}

function killTree(child) {
  if (!child || child.killed || child.exitCode !== null) return
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'])
  } else {
    try {
      process.kill(-child.pid, 'SIGTERM')
    } catch {
      child.kill('SIGTERM')
    }
  }
}

/** True, sobald das eigene Skript den Serverprozess bewusst beendet hat. */
let shuttingDownServer = false

async function main() {
  if (!existsSync(serverDir)) {
    fail(
      `Server-Repository nicht gefunden unter ${serverDir}. ` +
        `Nebeneinander-Checkout von galaxis-server anlegen oder GALAXIS_SERVER_DIR setzen.`,
    )
  }
  if (!existsSync(path.join(serverDir, 'docker-compose.yml'))) {
    fail(`${serverDir} enthält keine docker-compose.yml – ist der Pfad korrekt?`)
  }

  console.log(`[run-e2e-a0] Server-Repository: ${serverDir}`)

  console.log('[run-e2e-a0] Starte PostgreSQL …')
  run(['docker', 'compose', 'up', '-d', '--wait', 'postgres'], { cwd: serverDir })

  console.log('[run-e2e-a0] Führe Migrationen aus …')
  run(['pnpm', 'db:migrate'], { cwd: serverDir, env: serverEnv })

  await mkdir(path.join(clientRoot, 'test-results-a0'), { recursive: true })
  const logPath = path.join(clientRoot, 'test-results-a0', 'server-a0.log')
  const logStream = createWriteStream(logPath)

  console.log(`[run-e2e-a0] Starte Server (Log: ${logPath}) …`)
  const serverProcess = spawn(
    ...spawnArgs(['pnpm', 'dev'], {
      cwd: serverDir,
      env: serverEnv,
      detached: process.platform !== 'win32',
    }),
  )
  serverProcess.stdout?.pipe(logStream)
  serverProcess.stderr?.pipe(logStream)
  serverProcess.once('exit', (code) => {
    if (!shuttingDownServer && code !== null && code !== 0) {
      console.error(
        `[run-e2e-a0] Serverprozess unerwartet beendet (Code ${code}), siehe ${logPath}`,
      )
    }
  })

  let playwrightExitCode = 1
  try {
    await waitForReady(`http://${GALAXIS_HOST}:${GALAXIS_PORT}/health/ready`, {
      timeoutMs: 30_000,
      intervalMs: 300,
      describe: 'Server-Readiness',
    })
    console.log('[run-e2e-a0] Server bereit. Starte Playwright …')

    const playwright = spawnSync(
      ...spawnArgs(['pnpm', 'exec', 'playwright', 'test', '-c', 'playwright.a0.config.ts'], {
        cwd: clientRoot,
        stdio: 'inherit',
        env: { ...process.env, GALAXIS_E2E_SERVER_URL: `http://${GALAXIS_HOST}:${GALAXIS_PORT}` },
      }),
    )
    playwrightExitCode = playwright.status ?? 1
  } finally {
    console.log('[run-e2e-a0] Beende Serverprozess …')
    shuttingDownServer = true
    killTree(serverProcess)
    logStream.end()
  }

  process.exitCode = playwrightExitCode
}

await main()
