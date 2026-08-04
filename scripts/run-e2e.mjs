import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_PROJECT = 'chromium';

export function buildPlaywrightArgs(rawArgs, defaultProject = DEFAULT_PROJECT) {
  const withoutSeparator = rawArgs.filter((arg) => arg !== '--');
  const hasProjectFlag = withoutSeparator.some(
    (arg) => arg === '--project' || arg.startsWith('--project=')
  );
  return hasProjectFlag
    ? withoutSeparator
    : [`--project=${defaultProject}`, ...withoutSeparator];
}

function main() {
  const cliPath = fileURLToPath(
    new URL('../node_modules/@playwright/test/cli.js', import.meta.url)
  );
  const args = buildPlaywrightArgs(process.argv.slice(2));
  const child = spawn(process.execPath, [cliPath, 'test', ...args], {
    stdio: 'inherit'
  });

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => child.kill(signal));
  }

  child.on('error', (error) => {
    console.error(`[run-e2e] failed to spawn Playwright: ${error.message}`);
    process.exit(1);
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
    } else {
      process.exit(code ?? 1);
    }
  });
}

const isMainModule =
  process.argv[1] &&
  import.meta.url.startsWith('file:') &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  main();
}
