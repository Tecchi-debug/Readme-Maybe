type ApiRequestOptions = Partial<Cypress.RequestOptions> & {
  url: string;
};

type ApiSession = {
  accessToken: string;
  refreshToken: string;
  userId: string;
};

const getApiBaseUrl = () => String(Cypress.env('apiBaseUrl') || 'http://127.0.0.1:5000').replace(/\/$/, '');

const getRequiredEnv = (key: string) => {
  const value = String(Cypress.env(key) || '').trim();
  if (!value) {
    throw new Error(`Missing Cypress env "${key}"`);
  }
  return value;
};

Cypress.Commands.add('apiRequest', (options: ApiRequestOptions) => {
  const requestOptions = {
    failOnStatusCode: false,
    ...options,
    url: options.url.startsWith('http') ? options.url : `${getApiBaseUrl()}${options.url}`,
  };

  return cy.request(requestOptions as Cypress.RequestOptions);
});

Cypress.Commands.add('loginByApi', () => {
  const Email = getRequiredEnv('testEmail');
  const Password = getRequiredEnv('testPassword');

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
