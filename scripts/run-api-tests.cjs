#!/usr/bin/env node
const { spawn } = require('node:child_process');
const process = require('node:process');

const HEALTH_URL = 'http://127.0.0.1:5050/healthz';
const POLL_INTERVAL_MS = 1000;
const POLL_TIMEOUT_MS = 180000;
const packageManagerCommand = process.platform === 'win32' ? 'corepack.cmd' : 'corepack';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForHealth = async () => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
    try {
      const response = await fetch(HEALTH_URL);
      if (response.ok) {
        return;
      }
    } catch {
      // Backend is not ready yet.
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(`Backend did not become healthy at ${HEALTH_URL} within ${POLL_TIMEOUT_MS / 1000}s`);
};

const spawnProcess = (args, options = {}) => {
  const child = spawn(packageManagerCommand, ['yarn', ...args], {
    stdio: 'inherit',
    shell: true,
    ...options,
  });

  return child;
};

const run = async () => {
  const backend = spawnProcess(['workspace', 'backend', 'start']);

  const stopBackend = () => {
    if (!backend.killed) {
      backend.kill();
    }
  };

  process.on('SIGINT', () => {
    stopBackend();
    process.exit(130);
  });

  process.on('SIGTERM', () => {
    stopBackend();
    process.exit(143);
  });

  try {
    await waitForHealth();

    const testExitCode = await new Promise((resolve, reject) => {
      const testProcess = spawnProcess(['workspace', 'frontend', 'test:api']);

      testProcess.on('exit', (code, signal) => {
        if (signal) {
          reject(new Error(`Frontend test process exited with signal ${signal}`));
          return;
        }

        resolve(typeof code === 'number' ? code : 1);
      });

      testProcess.on('error', reject);
    });

    if (testExitCode !== 0) {
      process.exitCode = testExitCode;
    }
  } finally {
    stopBackend();
  }
};

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
