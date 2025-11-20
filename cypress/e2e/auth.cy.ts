/* eslint-disable @typescript-eslint/no-explicit-any */
/// <reference types="cypress" />

describe('Authentication Flow', () => {
  const testUser = {
    email: 'testuser@example.com',
    password: 'password123',
    fullName: 'Test User'
  };

  before(() => {
    cy.request({
      method: 'POST',
      url: '/api/auth/register',
      body: {
        email: testUser.email,
        password: testUser.password,
        fullName: testUser.fullName
      },
      failOnStatusCode: false
    });
  });

  it('should allow a user to log in and see the dashboard', () => {
    cy.visit('/login');

    cy.get('input[id=email]').type(testUser.email);
    cy.get('input[id=password]').type(testUser.password);
    cy.get('button[type=submit]').click();

    cy.url().should('include', '/dashboard');
    cy.contains(`Welcome back, ${testUser.fullName}`).should('be.visible');
  });

  it('should allow a logged-in user to log out', () => {
    cy.request('POST', '/api/auth/login', {
      email: testUser.email,
      password: testUser.password,
    }).then((response: any) => {
      cy.setCookie('token', response.body.token);
    });

    cy.visit('/dashboard');

    cy.get('header')
      .find('button')
      .contains('LogOut')
      .parents('button')
      .click();

    cy.url().should('include', '/login');
    cy.getCookie('token').should('not.exist');
  });

  it('should show an error for invalid credentials', () => {
    cy.visit('/login');

    cy.get('input[id=email]').type(testUser.email);
    cy.get('input[id=password]').type('wrongpassword');
    cy.get('button[type=submit]').click();

    cy.url().should('include', '/login');
    cy.contains('Invalid credentials').should('be.visible');
  });
});
