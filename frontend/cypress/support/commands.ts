type ApiRequestOptions = Partial<Cypress.RequestOptions> & {
  url: string;
};

type ApiSession = {
  accessToken: string;
  refreshToken: string;
  userId: string;
};

const getApiBaseUrl = () => String(Cypress.env('apiBaseUrl') || 'http://127.0.0.1:5050').replace(/\/$/, '');

const getOptionalEnv = (key: string) => String(Cypress.env(key) || '').trim();

Cypress.Commands.add('apiRequest', (options: ApiRequestOptions) => {
  const requestOptions = {
    failOnStatusCode: false,
    ...options,
    url: options.url.startsWith('http') ? options.url : `${getApiBaseUrl()}${options.url}`,
  };

  return cy.request(requestOptions as Cypress.RequestOptions);
});

Cypress.Commands.add('loginByApi', () => {
  const Email = getOptionalEnv('testEmail');
  const Password = getOptionalEnv('testPassword');

  if (!Email || !Password) {
    const unique = Date.now();
    const disposableEmail = `cypress-user-${unique}@example.com`;
    const disposableLogin = `cypress-user-${unique}`;
    const disposablePassword = 'Password123!';

    return cy.apiRequest({
      method: 'POST',
      url: '/api/auth/register',
      body: {
        FirstName: 'Cypress',
        LastName: 'User',
        Login: disposableLogin,
        Email: disposableEmail,
        Password: disposablePassword,
      },
    }).then((response) => {
      expect(response.status).to.eq(201);
      expect(response.body).to.have.property('jwtToken');
      expect(response.body).to.have.property('refreshToken');

      const userId = String(response.body?.user?._id || response.body?.user?.id || '');
      expect(userId, 'register response user id').to.not.equal('');

      return {
        accessToken: String(response.body.jwtToken),
        refreshToken: String(response.body.refreshToken),
        userId,
      } satisfies ApiSession;
    });
  }

  return cy.apiRequest({
    method: 'POST',
    url: '/api/auth/login',
    body: { Email, Password },
  }).then((response) => {
    expect(response.status).to.eq(201);
    expect(response.body).to.have.property('jwtToken');
    expect(response.body).to.have.property('refreshToken');

    const userId = String(response.body?.user?._id || response.body?.user?.id || '');
    expect(userId, 'login response user id').to.not.equal('');

    return {
      accessToken: String(response.body.jwtToken),
      refreshToken: String(response.body.refreshToken),
      userId,
    } satisfies ApiSession;
  });
});

declare global {
  namespace Cypress {
    interface Chainable {
      apiRequest(options: ApiRequestOptions): Chainable<Cypress.Response<any>>;
      loginByApi(): Chainable<ApiSession>;
    }
  }
}

export {};
