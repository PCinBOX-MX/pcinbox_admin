const quote = (id: number, quoteNumber = `COT-${id}`) => ({
  idCotizacion: id,
  quoteNumber,
  originalFileName: `${quoteNumber}.pdf`,
  mimeType: "application/pdf",
  sizeBytes: 2048,
  sha256: `sha-${id}`,
  totalAmount: 15999.9,
  itemCount: 3,
  includeAssemblyService: true,
  createdAt: "2026-08-01T12:00:00.000Z",
  expiresAt: "2026-08-15T12:00:00.000Z",
  userId: 100 + id,
  customer: {
    name: "Cliente Prueba",
    email: "cliente@example.com",
  },
});

const listResponse = (
  data = [quote(1)],
  page = 1,
  total = data.length,
  totalPages = 1,
) => ({
  ok: true,
  data,
  pagination: { page, limit: 25, total, totalPages },
});

function visitAs(role: "admin" | "support" = "admin") {
  cy.visit("/cotizaciones", {
    onBeforeLoad(win) {
      win.localStorage.setItem("token", "cypress-test-token");
      win.localStorage.setItem("adminRole", role);
      win.localStorage.setItem("email", "cypress@test.com");
    },
    failOnStatusCode: false,
  });
}

describe("Administración de cotizaciones", () => {
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

  it("sincroniza búsqueda y paginación con el servidor y la URL", () => {
    cy.intercept("GET", "**/cotizaciones/admin?*", (request) => {
      const url = new URL(request.url);
      const search = url.searchParams.get("search");
      const page = Number(url.searchParams.get("page"));

      if (search === "ana") {
        request.reply(listResponse([quote(9, "COT-ANA")]));
      } else if (page === 2) {
        request.reply(listResponse([quote(26)], 2, 30, 2));
      } else {
        request.reply(listResponse([quote(1)], 1, 30, 2));
      }
    }).as("listQuotes");

    visitAs();
    cy.wait("@listQuotes");
    cy.get('[data-testid="cotizaciones-search"]').type("ana");
    cy.wait(500);
    cy.wait("@listQuotes").its("request.url").should("include", "search=ana");
    cy.location("search").should("include", "search=ana");
    cy.contains("COT-ANA").should("be.visible");

    cy.get('[data-testid="clear-cotizaciones-filters"]').click();
    cy.wait("@listQuotes");
    cy.get(".MuiPagination-ul button").contains("2").click();
    cy.wait("@listQuotes").its("request.url").should("include", "page=2");
    cy.location("search").should("include", "page=2");
    cy.contains("COT-26").should("be.visible");
  });

  it("previsualiza y descarga el PDF autenticado", () => {
    cy.intercept("GET", "**/cotizaciones/admin?*", listResponse()).as(
      "listQuotes",
    );
    cy.intercept(
      "GET",
      "**/cotizaciones/admin/1/content?disposition=inline",
      {
        statusCode: 200,
        headers: { "content-type": "application/pdf" },
        body: "%PDF-preview",
      },
    ).as("previewPdf");
    cy.intercept(
      "GET",
      "**/cotizaciones/admin/1/content?disposition=attachment",
      {
        statusCode: 200,
        headers: { "content-type": "application/pdf" },
        body: "%PDF-download",
      },
    ).as("downloadPdf");

    visitAs();
    cy.wait("@listQuotes");
    cy.window().then((win) => {
      cy.stub(win.URL, "createObjectURL").returns("blob:cypress-pdf");
      cy.spy(win.URL, "revokeObjectURL").as("revokeObjectUrl");
      cy.stub(win.HTMLAnchorElement.prototype, "click").as("anchorClick");
    });

    cy.get('[data-testid="preview-cotizacion-1"]:visible').click();
    cy.wait("@previewPdf")
      .its("request.headers.authorization")
      .should("eq", "Bearer cypress-test-token");
    cy.get('[data-testid="cotizacion-preview-frame"]').should(
      "have.attr",
      "src",
      "blob:cypress-pdf",
    );
    cy.get('button[aria-label="Cerrar modal"]').click();
    cy.get("@revokeObjectUrl").should("have.been.calledWith", "blob:cypress-pdf");

    cy.get('[data-testid="download-cotizacion-1"]:visible').click();
    cy.wait("@downloadPdf");
    cy.get("@anchorClick").should("have.been.called");
    cy.get("@revokeObjectUrl").should("have.callCount", 2);
  });

  it("cancela y confirma archivado, regresando de una página vacía", () => {
    let currentPage = 2;
    cy.intercept("GET", "**/cotizaciones/admin?*", (request) => {
      const requestedPage = Number(new URL(request.url).searchParams.get("page"));
      currentPage = requestedPage;
      request.reply(
        requestedPage === 2
          ? listResponse([quote(26)], 2, 26, 2)
          : listResponse([quote(1)], 1, 25, 1),
      );
    }).as("listQuotes");
    cy.intercept("DELETE", "**/cotizaciones/admin/26", {
      statusCode: 200,
      body: { ok: true },
    }).as("archiveQuote");

    cy.visit("/cotizaciones?page=2", {
      onBeforeLoad(win) {
        win.localStorage.setItem("token", "cypress-test-token");
        win.localStorage.setItem("adminRole", "admin");
      },
    });
    cy.wait("@listQuotes");
    cy.get('[data-testid="archive-cotizacion-26"]:visible').click();
    cy.contains("su archivo PDF se eliminará permanentemente").should(
      "be.visible",
    );
    cy.contains("button", "Cancelar").click();
    cy.get("@archiveQuote.all").should("have.length", 0);

    cy.get('[data-testid="archive-cotizacion-26"]:visible').click();
    cy.contains("button", "Aceptar").click();
    cy.wait("@archiveQuote");
    cy.contains("Cotización archivada").should("be.visible");
    cy.contains("su archivo PDF se eliminó permanentemente").should(
      "be.visible",
    );
    cy.wait("@listQuotes").then(() => expect(currentPage).to.eq(1));
    cy.location("search").should("include", "page=1");
    cy.contains("button", "Aceptar").click();
  });

  it("presenta respuestas 401, 403 y 404 de forma accionable", () => {
    cy.intercept("GET", "**/cotizaciones/admin?*", {
      statusCode: 401,
      body: { message: "Unauthorized" },
    }).as("unauthorized");
    visitAs();
    cy.wait("@unauthorized");
    cy.contains("Sesión expirada").should("be.visible");

    cy.intercept("GET", "**/cotizaciones/admin?*", {
      statusCode: 403,
      body: { message: "Forbidden" },
    }).as("forbidden");
    cy.reload();
    cy.wait("@forbidden");
    cy.get('[data-testid="cotizaciones-error"]')
      .should("be.visible")
      .and("contain", "No tienes permiso");

    cy.intercept("GET", "**/cotizaciones/admin?*", listResponse());
    cy.intercept("GET", "**/cotizaciones/admin/1/content?disposition=inline", {
      statusCode: 404,
      body: { message: "Not found" },
    }).as("missingPdf");
    cy.reload();
    cy.get('[data-testid="preview-cotizacion-1"]:visible').click();
    cy.wait("@missingPdf");
    cy.contains("La cotización solicitada ya no existe").should("be.visible");
  });

  it("muestra tarjetas móviles y oculta el módulo a soporte", () => {
    cy.intercept("GET", "**/cotizaciones/admin?*", listResponse());
    cy.viewport("iphone-x");
    visitAs();
    cy.get('[data-testid="cotizaciones-cards"]').should("be.visible");
    cy.get('[data-testid="cotizacion-card-1"]').should("contain", "COT-1");

    visitAs("support");
    cy.contains("No tienes permiso para administrar cotizaciones").should(
      "be.visible",
    );
    cy.get("aside").should("not.contain", "Cotizaciones");
  });

});
