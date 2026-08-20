function visitVentas() {
  cy.visit("/dashboard", {
    onBeforeLoad(win) {
      win.localStorage.setItem("token", "cypress-test-token");
      win.localStorage.setItem("adminRole", "admin");
      win.localStorage.setItem("email", "cypress@test.com");
    },
    failOnStatusCode: false,
  });
}

describe("Ventas — filtro Dicotech pendiente", () => {
  beforeEach(() => {
    cy.intercept("GET", "**/getAllProduct*", {
      statusCode: 200,
      body: { data: [] },
    });
    cy.intercept("GET", "**/getAllMarcaPrincipal*", {
      statusCode: 200,
      body: { data: { data: [] } },
    });
    cy.intercept("GET", "**/getAllCategoriPrincipal*", {
      statusCode: 200,
      body: { data: { data: [] } },
    });
  });

  it("envía dicotechPending=true y muestra chip Dicotech pendiente", () => {
    cy.intercept("GET", "**/getAllSales*", (req) => {
      const url = new URL(req.url);
      if (url.searchParams.get("dicotechPending") === "true") {
        req.reply({
          statusCode: 200,
          body: {
            data: {
              totalSales: 1,
              data: [
                {
                  idOrder: 9001,
                  totalAmount: "1500.00",
                  statusPay: "paid",
                  methodPay: "mercadopago",
                  hasDicotechPendingProducts: true,
                  products: [
                    {
                      productName: "Producto Dicotech pendiente",
                      quantity: 1,
                      providerId: 3,
                      purchaseId: null,
                    },
                  ],
                  dataUser: {
                    name: "Cliente",
                    email: "cliente@test.com",
                  },
                },
              ],
            },
          },
        });
        return;
      }

      req.reply({
        statusCode: 200,
        body: { data: { totalSales: 0, data: [] } },
      });
    }).as("getAllSales");

    visitVentas();
    cy.wait("@getAllSales");

    cy.get('[data-testid="ventas-provider-pending-filter"]').click();
    cy.get('ul[role="listbox"] li[data-value="dicotech"]').click();

    cy.wait("@getAllSales")
      .its("request.url")
      .should("include", "dicotechPending=true");

    cy.location("search").should("include", "providerPending=dicotech");
    cy.get('[data-testid="dicotech-pending-9001"]').should("be.visible");
  });
});
