/// <reference types="cypress" />

export {};

Cypress.on("uncaught:exception", (err) => {
  const msg = err.message || "";
  if (
    msg.includes("Hydration") ||
    msg.includes("Minified React error") ||
    msg.includes("ResizeObserver") ||
    msg.includes("ChunkLoadError") ||
    msg.includes("Loading chunk") ||
    msg.includes("Failed to load chunk")
  ) {
    // HMR/chunk tras editar código: visitProveedores reintenta.
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
          {
            idCategorie: 99,
            name: "SOFTWARE",
            description: "Licencias",
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

const seedAdminSession = (win: Window) => {
  win.localStorage.setItem("token", "cypress-test-token");
  win.localStorage.setItem("adminRole", "admin");
  win.localStorage.setItem("email", "cypress@test.com");
};

Cypress.Commands.add("visitProveedores", () => {
  cy.viewport(1440, 900);
  cy.intercept("GET", "**/socket.io/**", { statusCode: 200, body: {} });

  const openPage = () =>
    cy.visit("/proveedores?provider=1", {
      onBeforeLoad: seedAdminSession,
      failOnStatusCode: false,
      timeout: 60000,
    });

  const ensureReady = (attempt: number) => {
    openPage();
    cy.location("pathname", { timeout: 15000 }).should(
      "include",
      "/proveedores",
    );
    cy.wait(attempt === 1 ? 500 : 2000);
    cy.get("body", { timeout: 30000 }).then(($body) => {
      const ready = $body.text().includes("Agregar producto");
      if (!ready && attempt < 3) {
        ensureReady(attempt + 1);
      }
    });
  };

  ensureReady(1);

  // Cierra residuales de modales de tests previos.
  cy.get("body").then(($body) => {
    if ($body.find('button[aria-label="Cerrar modal"]').length) {
      cy.get('button[aria-label="Cerrar modal"]').click({ force: true });
    }
    if ($body.text().includes("Descartar cambios")) {
      cy.contains("button", "Sí, cerrar").click({ force: true });
    }
  });

  cy.contains("Agregar producto", { timeout: 60000 }).should("be.visible");
  cy.get('[data-testid="btn-agregar-producto"]').should("be.visible");
});
