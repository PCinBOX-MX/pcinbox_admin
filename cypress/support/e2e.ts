/// <reference types="cypress" />

export {};

Cypress.on("uncaught:exception", (err) => {
  const msg = err.message || "";
  if (
    msg.includes("Hydration") ||
    msg.includes("Minified React error") ||
    msg.includes("ResizeObserver") ||
    msg.includes("Failed to load chunk") ||
    msg.includes("Loading chunk") ||
    msg.includes("ChunkLoadError")
  ) {
    return false;
  }
  return true;
});

declare global {
  namespace Cypress {
    interface Chainable {
      loginAsAdmin(): Chainable<void>;
      stubProveedoresApis(products?: any[]): Chainable<void>;
      visitProveedores(): Chainable<void>;
    }
  }
}

Cypress.Commands.add("loginAsAdmin", () => {
  window.localStorage.setItem("token", "cypress-test-token");
  window.localStorage.setItem("adminRole", "admin");
  window.localStorage.setItem("email", "cypress@test.com");
});

Cypress.Commands.add("stubProveedoresApis", (products = []) => {
  cy.intercept("GET", "**/getAllProveedores*", {
    statusCode: 200,
    body: {
      data: {
        data: [{ idProvider: 1, companyName: "PC Inbox" }],
      },
    },
  }).as("getProveedores");

  cy.intercept("GET", "**/getAllMarcaPrincipal*", {
    statusCode: 200,
    body: {
      data: {
        data: [{ idMarca: 10, name: "AMD", description: "" }],
      },
    },
  }).as("getMarcas");

  cy.intercept("GET", "**/getAllCategoriPrincipal*", {
    statusCode: 200,
    body: {
      data: {
        data: [
          {
            idCategorie: 20,
            name: "PROCESADORES",
            description: "",
          },
        ],
      },
    },
  }).as("getCategorias");

  cy.intercept("POST", "**/getProductsByProveedor*", {
    statusCode: 200,
    body: {
      data: {
        data: products,
        dataExist: products,
      },
    },
  }).as("getProducts");
});

Cypress.Commands.add("visitProveedores", () => {
  cy.visit("/proveedores?provider=1", {
    onBeforeLoad(win) {
      win.localStorage.setItem("token", "cypress-test-token");
      win.localStorage.setItem("adminRole", "admin");
      win.localStorage.setItem("email", "cypress@test.com");
    },
    failOnStatusCode: false,
  });

  // Si el auth redirect nos mandó a login, forzamos de nuevo.
  cy.location("pathname", { timeout: 15000 }).then((path) => {
    if (path.includes("/features/auth/Login") || path === "/") {
      cy.window().then((win) => {
        win.localStorage.setItem("token", "cypress-test-token");
        win.localStorage.setItem("adminRole", "admin");
        win.localStorage.setItem("email", "cypress@test.com");
      });
      cy.visit("/proveedores?provider=1");
    }
  });

  cy.get('[data-testid="btn-agregar-producto"]', { timeout: 30000 }).should(
    "exist",
  );
});
