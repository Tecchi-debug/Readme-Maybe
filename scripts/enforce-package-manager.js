const userAgent = process.env.npm_config_user_agent || '';

function fail(message) {
  console.error(`\n${message}\n`);
  process.exit(1);
}

if (!userAgent) {
  fail('Unable to detect the package manager. Use Yarn 4.9.1 from the repository root.');
}

if (userAgent.startsWith('yarn/')) {
  const version = userAgent.slice('yarn/'.length).split(' ')[0];
  const majorVersion = Number.parseInt(version.split('.')[0], 10);

  if (Number.isNaN(majorVersion) || majorVersion < 4) {
    fail(`Yarn ${version} is not supported. Use the repo-pinned Yarn 4.9.1 by running "yarn install" from the repository root.`);
  }

  process.exit(0);
}

fail('This repository is managed with Yarn 4.9.1 at the root. Do not run npm or pnpm installs in the workspace root.');
