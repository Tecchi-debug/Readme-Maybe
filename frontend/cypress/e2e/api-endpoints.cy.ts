/// <reference types="cypress" />

// Recommended environment variables:
//   CYPRESS_API_BASE_URL=http://127.0.0.1:5000
//   CYPRESS_TEST_EMAIL=verified-user@example.com
//   CYPRESS_TEST_PASSWORD=your-password
//   CYPRESS_TEST_LOGIN=known-login
//   CYPRESS_TEST_REPO_URL=https://github.com/Tecchi-debug/Readme-Maybe
//   CYPRESS_STORED_REPO_ID=<existing stored repo id>
//   CYPRESS_DELETE_REPO_ID=<disposable stored repo id>
//   CYPRESS_RUN_LIVE_AUTH_TESTS=true
//   CYPRESS_RUN_LIVE_REPO_TESTS=true
//   CYPRESS_RUN_REPO_MUTATION_TESTS=true
//   CYPRESS_RUN_LAMBDA_TESTS=true
//   CYPRESS_RUN_PR_TESTS=true

type Session = {
  accessToken: string;
  refreshToken: string;
  userId: string;
};

type StoredRepo = {
  _id: string;
  Readme?: string;
  FullName?: string;
  Metadata?: {
    importantFiles?: string[];
  };
};

const PLACEHOLDER_ID = '000000000000000000000000';
const PLACEHOLDER_VERSION_ID = '111111111111111111111111';

const envFlag = (key: string) => {
  const value = Cypress.env(key);
  return value === true || value === 'true';
};

const envText = (key: string) => String(Cypress.env(key) || '').trim();

const skipUnless = (ctx: Mocha.Context, condition: boolean, reason: string) => {
  if (!condition) {
    Cypress.log({ name: 'skip', message: reason });
    ctx.skip();
  }
};

const requireEnv = (ctx: Mocha.Context, keys: string[]) => {
  const missing = keys.filter((key) => !envText(key));
  skipUnless(ctx, missing.length === 0, `Missing Cypress env: ${missing.join(', ')}`);
};

const authHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

const protectedRequests: Array<{
  title: string;
  method: Cypress.HttpMethod;
  url: string;
  body?: Record<string, unknown>;
}> = [
  { title: 'GET /api/auth/me', method: 'GET', url: '/api/auth/me' },
  { title: 'GET /api/auth/github/repos', method: 'GET', url: '/api/auth/github/repos' },
  { title: 'GET /api/repos', method: 'GET', url: '/api/repos' },
  { title: 'PUT /api/repos/:id/readme', method: 'PUT', url: `/api/repos/${PLACEHOLDER_ID}/readme`, body: { Readme: '# Test' } },
  { title: 'GET /api/repos/:id/versions', method: 'GET', url: `/api/repos/${PLACEHOLDER_ID}/versions` },
  { title: 'POST /api/repos/:id/versions/:versionId/restore', method: 'POST', url: `/api/repos/${PLACEHOLDER_ID}/versions/${PLACEHOLDER_VERSION_ID}/restore` },
  { title: 'POST /api/repos/:id/readme-pr', method: 'POST', url: `/api/repos/${PLACEHOLDER_ID}/readme-pr` },
  { title: 'DELETE /api/repos/:id', method: 'DELETE', url: `/api/repos/${PLACEHOLDER_ID}` },
  { title: 'POST /readme/generate', method: 'POST', url: '/readme/generate', body: { repoUrl: 'https://github.com/Tecchi-debug/Readme-Maybe' } },
];

describe('API endpoints', () => {
  describe('Safe public contracts', () => {
    it('GET /healthz responds with service health', () => {
      cy.apiRequest({ method: 'GET', url: '/healthz' }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.include({ status: 'ok' });
        expect(response.body).to.have.property('uptimeSec');
      });
    });

    it('GET /readyz responds with readiness state', () => {
      cy.apiRequest({ method: 'GET', url: '/readyz' }).then((response) => {
        expect([200, 503]).to.include(response.status);
        expect(response.body).to.have.property('ready');
        expect(response.body).to.have.property('mongoReady');
        expect(response.body).to.have.property('secretsLoaded');
      });
    });

    it('GET /api/auth/github redirects to GitHub or an auth error screen', () => {
      cy.apiRequest({
        method: 'GET',
        url: '/api/auth/github',
        followRedirect: false,
      }).then((response) => {
        expect([302, 303]).to.include(response.status);
        expect(String(response.headers.location || '')).to.not.equal('');
      });
    });

    it('GET /api/auth/github/callback without params redirects with an error', () => {
      cy.apiRequest({
        method: 'GET',
        url: '/api/auth/github/callback',
        followRedirect: false,
      }).then((response) => {
        expect([302, 303]).to.include(response.status);
        expect(String(response.headers.location || '')).to.include('/Login');
      });
    });

    it('POST /api/auth/login rejects an unknown email', () => {
      cy.apiRequest({
        method: 'POST',
        url: '/api/auth/login',
        body: {
          Email: `cypress-missing-${Date.now()}@example.com`,
          Password: 'not-the-right-password',
        },
      }).then((response) => {
        expect(response.status).to.eq(400);
        expect(response.body.message).to.eq('Invalid Email');
      });
    });

    it('POST /api/auth/forgot-password is generic for unknown users', () => {
      cy.apiRequest({
        method: 'POST',
        url: '/api/auth/forgot-password',
        body: {
          Email: `cypress-missing-${Date.now()}@example.com`,
        },
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.message).to.eq('If that email exists, a reset link has been sent.');
      });
    });

    it('POST /api/auth/reset-password/:token rejects invalid tokens', () => {
      cy.apiRequest({
        method: 'POST',
        url: '/api/auth/reset-password/not-a-real-token',
        body: {
          Password: 'Password123!',
        },
      }).then((response) => {
        expect(response.status).to.eq(400);
        expect(response.body.message).to.eq('Invalid or expired reset link.');
      });
    });

    it('POST /api/auth/refresh requires a refresh token', () => {
      cy.apiRequest({
        method: 'POST',
        url: '/api/auth/refresh',
        body: {},
      }).then((response) => {
        expect(response.status).to.eq(400);
        expect(response.body.message).to.eq('Refresh token is required');
      });
    });

    it('POST /api/auth/logout requires a token', () => {
      cy.apiRequest({
        method: 'POST',
        url: '/api/auth/logout',
        body: {},
      }).then((response) => {
        expect(response.status).to.eq(400);
        expect(response.body.message).to.eq('Token is required');
      });
    });

    it('GET /api/auth/verify/:token rejects invalid tokens', () => {
      cy.apiRequest({
        method: 'GET',
        url: '/api/auth/verify/not-a-real-token',
      }).then((response) => {
        expect(response.status).to.eq(400);
        expect(String(response.body)).to.include('Invalid verification link');
      });
    });

    protectedRequests.forEach(({ title, method, url, body }) => {
      it(`${title} rejects unauthenticated access`, () => {
        cy.apiRequest({
          method,
          url,
          body,
        }).then((response) => {
          expect(response.status).to.eq(401);
        });
      });
    });
  });

  describe('Authenticated auth endpoints', function () {
    let session: Session;

    before(function () {
      skipUnless(this, envFlag('runLiveAuthTests'), 'Set CYPRESS_RUN_LIVE_AUTH_TESTS=true to enable authenticated endpoint checks.');
      requireEnv(this, ['testEmail', 'testPassword']);

      cy.loginByApi().then((createdSession) => {
        session = createdSession;
      });
    });

    it('POST /api/auth/register rejects duplicate credentials when a known login and email are provided', function () {
      if (!envText('testLogin')) {
        this.skip();
      }

      cy.apiRequest({
        method: 'POST',
        url: '/api/auth/register',
        body: {
          FirstName: 'Cypress',
          LastName: 'Duplicate',
          Login: envText('testLogin'),
          Email: envText('testEmail'),
          Password: 'Password123!',
        },
      }).then((response) => {
        expect(response.status).to.eq(400);
        expect(['Login already in use', 'Email already in use']).to.include(response.body.message);
      });
    });

    it('POST /api/auth/login returns a JWT, refresh token, and user object', () => {
      expect(session.accessToken).to.not.equal('');
      expect(session.refreshToken).to.not.equal('');
      expect(session.userId).to.not.equal('');
    });

    it('GET /api/auth/me returns the authenticated user', () => {
      cy.apiRequest({
        method: 'GET',
        url: '/api/auth/me',
        headers: authHeaders(session.accessToken),
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(String(response.body._id || '')).to.eq(session.userId);
        expect(response.body).to.have.property('Email');
      });
    });

    it('POST /api/auth/refresh rotates the refresh session', () => {
      cy.apiRequest({
        method: 'POST',
        url: '/api/auth/refresh',
        body: {
          refreshToken: session.refreshToken,
        },
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(String(response.body.accessToken || '')).to.not.equal('');
        expect(String(response.body.refreshToken || '')).to.not.equal('');

        session = {
          ...session,
          accessToken: String(response.body.accessToken),
          refreshToken: String(response.body.refreshToken),
        };
      });
    });

    it('POST /api/auth/logout revokes the active session', () => {
      cy.loginByApi().then((freshSession) => {
        cy.apiRequest({
          method: 'POST',
          url: '/api/auth/logout',
          headers: authHeaders(freshSession.accessToken),
          body: {
            refreshToken: freshSession.refreshToken,
          },
        }).then((logoutResponse) => {
          expect(logoutResponse.status).to.eq(200);
          expect(logoutResponse.body.message).to.eq('Logged out');

          cy.apiRequest({
            method: 'GET',
            url: '/api/auth/me',
            headers: authHeaders(freshSession.accessToken),
          }).then((meResponse) => {
            expect(meResponse.status).to.eq(401);
          });
        });
      });
    });

    it('GET /api/auth/github/repos returns either repos or a not-connected response', () => {
      cy.apiRequest({
        method: 'GET',
        url: '/api/auth/github/repos',
        headers: authHeaders(session.accessToken),
      }).then((response) => {
        expect([200, 404]).to.include(response.status);
        if (response.status === 200) {
          expect(response.body).to.have.property('repos');
          expect(response.body.repos).to.be.an('array');
        } else {
          expect(response.body.message).to.eq('GitHub account is not connected');
        }
      });
    });

    it('GET /api/repos returns stored repos and dashboard stats', () => {
      cy.apiRequest({
        method: 'GET',
        url: '/api/repos',
        headers: authHeaders(session.accessToken),
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('repos');
        expect(response.body.repos).to.be.an('array');
        expect(response.body).to.have.property('stats');
      });
    });
  });

  describe('Live repo endpoints', function () {
    let session: Session;
    let analyzedRepo: StoredRepo | null = null;
    let selectedFiles: string[] = [];

    before(function () {
      skipUnless(this, envFlag('runLiveRepoTests'), 'Set CYPRESS_RUN_LIVE_REPO_TESTS=true to enable live repo endpoint checks.');
      requireEnv(this, ['testEmail', 'testPassword', 'testRepoUrl']);

      cy.loginByApi().then((createdSession) => {
        session = createdSession;
      });
    });

    it('POST /analyze analyzes a repository and persists a stored repo', () => {
      cy.apiRequest({
        method: 'POST',
        url: '/analyze',
        timeout: 180000,
        body: {
          repoUrl: envText('testRepoUrl'),
          userId: session.userId,
        },
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(String(response.body._id || '')).to.not.equal('');
        expect(String(response.body.FullName || '')).to.not.equal('');
        expect(response.body).to.have.property('Metadata');

        analyzedRepo = response.body as StoredRepo;
        selectedFiles = Array.isArray(response.body?.Metadata?.importantFiles)
          ? response.body.Metadata.importantFiles.slice(0, 2)
          : [];
      });
    });

    it('POST /contents fetches file contents for selected files', function () {
      skipUnless(this, selectedFiles.length > 0, 'No important files were returned by /analyze.');

      cy.apiRequest({
        method: 'POST',
        url: '/contents',
        body: {
          repoUrl: envText('testRepoUrl'),
          importantFiles: selectedFiles,
        },
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('fileContents');
        expect(response.body.fileContents).to.be.an('array');
        expect(response.body.fileContents.length).to.be.greaterThan(0);
      });
    });

    it('POST /difference returns the stored repo commit comparison', () => {
      cy.apiRequest({
        method: 'POST',
        url: '/difference',
        body: {
          repoUrl: envText('testRepoUrl'),
          userId: session.userId,
        },
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('differenceStatus');
        expect(response.body).to.have.property('total_commits');
      });
    });

    it('GET /api/repos/:id/versions returns README snapshots for the analyzed repo', function () {
      skipUnless(this, Boolean(analyzedRepo?._id), 'No stored repo id is available for version checks.');

      cy.apiRequest({
        method: 'GET',
        url: `/api/repos/${analyzedRepo!._id}/versions`,
        headers: authHeaders(session.accessToken),
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('versions');
        expect(response.body.versions).to.be.an('array');
        expect(response.body.versions.length).to.be.greaterThan(0);
      });
    });

    it('POST /readme/generate returns generated markdown for an authenticated user', function () {
      skipUnless(this, envFlag('runLambdaTests'), 'Set CYPRESS_RUN_LAMBDA_TESTS=true to exercise Lambda-backed README generation.');

      cy.apiRequest({
        method: 'POST',
        url: '/readme/generate',
        timeout: 180000,
        headers: authHeaders(session.accessToken),
        body: {
          repoUrl: envText('testRepoUrl'),
        },
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(String(response.body.readme || '')).to.not.equal('');
      });
    });
  });

  describe('Opt-in repo mutation endpoints', function () {
    let session: Session;
    let repoId = '';
    let originalReadme = '';

    before(function () {
      skipUnless(this, envFlag('runRepoMutationTests'), 'Set CYPRESS_RUN_REPO_MUTATION_TESTS=true to enable repo mutation checks.');
      requireEnv(this, ['testEmail', 'testPassword']);

      cy.loginByApi().then((createdSession) => {
        session = createdSession;
      });
    });

    before(function () {
      const configuredRepoId = envText('storedRepoId');
      if (configuredRepoId) {
        repoId = configuredRepoId;
        return;
      }

      cy.apiRequest({
        method: 'GET',
        url: '/api/repos',
        headers: authHeaders(session.accessToken),
      }).then((response) => {
        expect(response.status).to.eq(200);
        const repos = Array.isArray(response.body?.repos) ? response.body.repos : [];
        expect(repos.length, 'stored repos available for mutation tests').to.be.greaterThan(0);
        repoId = String(repos[0]._id);
        originalReadme = String(repos[0].Readme || '');
      });
    });

    it('PUT /api/repos/:id/readme updates the stored README', function () {
      skipUnless(this, Boolean(repoId), 'No stored repo id is available for README mutation.');

      const nextReadme = `${originalReadme || '# Cypress README'}\n\n<!-- cypress-api-test -->`;

      cy.apiRequest({
        method: 'PUT',
        url: `/api/repos/${repoId}/readme`,
        headers: authHeaders(session.accessToken),
        body: {
          Readme: nextReadme,
        },
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(String(response.body?.repo?.Readme || '')).to.include('cypress-api-test');
      });
    });

    it('POST /api/repos/:id/versions/:versionId/restore restores a saved version', function () {
      skipUnless(this, Boolean(repoId), 'No stored repo id is available for restore tests.');

      cy.apiRequest({
        method: 'GET',
        url: `/api/repos/${repoId}/versions`,
        headers: authHeaders(session.accessToken),
      }).then((versionsResponse) => {
        expect(versionsResponse.status).to.eq(200);
        const versions = Array.isArray(versionsResponse.body?.versions) ? versionsResponse.body.versions : [];
        expect(versions.length, 'available versions').to.be.greaterThan(0);

        cy.apiRequest({
          method: 'POST',
          url: `/api/repos/${repoId}/versions/${versions[0]._id}/restore`,
          headers: authHeaders(session.accessToken),
        }).then((restoreResponse) => {
          expect(restoreResponse.status).to.eq(200);
          expect(String(restoreResponse.body.message || '')).to.include('Restored version');
        });
      });
    });
  });

  describe('Opt-in pull request creation', function () {
    let session: Session;
    let repoId = '';

    before(function () {
      skipUnless(this, envFlag('runPrTests'), 'Set CYPRESS_RUN_PR_TESTS=true to enable GitHub PR creation checks.');
      requireEnv(this, ['testEmail', 'testPassword']);

      cy.loginByApi().then((createdSession) => {
        session = createdSession;
      });
    });

    before(function () {
      const configuredRepoId = envText('storedRepoId');
      skipUnless(this, Boolean(configuredRepoId), 'Set CYPRESS_STORED_REPO_ID to a repo that already has a generated README before creating a PR.');
      repoId = configuredRepoId;
    });

    it('POST /api/repos/:id/readme-pr opens a GitHub pull request', function () {
      skipUnless(this, Boolean(repoId), 'No stored repo id is configured for PR creation.');

      cy.apiRequest({
        method: 'POST',
        url: `/api/repos/${repoId}/readme-pr`,
        headers: authHeaders(session.accessToken),
      }).then((response) => {
        expect(response.status).to.eq(201);
        expect(String(response.body.prUrl || '')).to.include('github.com');
        expect(Number(response.body.prNumber)).to.be.greaterThan(0);
      });
    });
  });

  describe('Opt-in destructive delete endpoint', function () {
    let session: Session;

    before(function () {
      skipUnless(this, Boolean(envText('deleteRepoId')), 'Set CYPRESS_DELETE_REPO_ID to a disposable stored repo id before running delete coverage.');
      requireEnv(this, ['testEmail', 'testPassword']);

      cy.loginByApi().then((createdSession) => {
        session = createdSession;
      });
    });

    it('DELETE /api/repos/:id removes a stored repo', function () {
      cy.apiRequest({
        method: 'DELETE',
        url: `/api/repos/${envText('deleteRepoId')}`,
        headers: authHeaders(session.accessToken),
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.message).to.eq('Deleted');
      });
    });
  });
});
