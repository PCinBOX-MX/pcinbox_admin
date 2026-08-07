const productA = {
  idProduct: 101,
  idProductExt: "EXT-A",
  name: "Workstation Ryzen",
  description: "PC estación",
  price: 25000,
  stock: 3,
  sku: "WS-101",
  upc: "111",
  rating: 5,
  image_url: [
    "https://cdn.example.com/workstation-a.jpg",
    "https://cdn.example.com/workstation-a-2.jpg",
  ],
  categoryId: 20,
  marcaId: 10,
  providerId: 1,
  createdat: "",
  active: 1,
  isPc: 1,
  caracteristicas: [
    { prop: "tipo", value: "workStation" },
    { prop: "Procesador", value: "AMD Ryzen 7 8700G" },
  ],
};

const productB = {
  idProduct: 202,
  idProductExt: "EXT-B",
  name: "Mouse Gamer",
  description: "Componente",
  price: 500,
  stock: 10,
  sku: "MOU-202",
  upc: "222",
  rating: 4,
  image_url: ["https://cdn.example.com/mouse-b.jpg"],
  categoryId: 20,
  marcaId: 10,
  providerId: 1,
  createdat: "",
  active: 1,
  isPc: 0,
  caracteristicas: [{ prop: "DPI", value: "16000" }],
};

const discardAndCloseModal = () => {
  cy.get('button[aria-label="Cerrar modal"]').click({ force: true });
  cy.get("body").then(($body) => {
    if ($body.text().includes("Descartar cambios")) {
      cy.contains("button", "Sí, cerrar").click({ force: true });
    }
  });
  cy.get(".MuiBackdrop-root", { timeout: 10000 }).should("not.exist");
};

describe("Proveedores product flows (errores deliberados)", () => {
  beforeEach(() => {
    cy.stubProveedoresApis([productA, productB]);
    cy.intercept("POST", "**/newProductPcinbox*", {
      statusCode: 200,
      body: {
        message: "ok",
        data: { data: { ...productA, idProduct: 999 } },
      },
    }).as("createProduct");
    cy.intercept("POST", "**/editProductPcinbox*", {
      statusCode: 200,
      body: { message: "Producto actualizado" },
    }).as("editProduct");
    cy.intercept("POST", "**/removeProductPcinbox*", {
      statusCode: 200,
      body: { message: "Producto dado de baja" },
    }).as("removeProduct");
    cy.intercept("GET", "**/socket.io/**", { statusCode: 200, body: {} });
    cy.visitProveedores();
    cy.contains("button", "Consultar").click({ force: true });
    cy.wait("@getProducts");
    cy.get(`[data-testid="edit-product-${productA.idProduct}"]`, {
      timeout: 20000,
    }).should("be.visible");
  });

  it("registrar: errores de validación + tipo no editable en textarea", () => {
    cy.get('[data-testid="btn-agregar-producto"]').click({ force: true });
    cy.get('[data-testid="select-tipo-producto"]').select("pcgamer");
    cy.get('[data-testid="form-register-product"] input[name="name"]').type(
      "PC Test",
      { force: true },
    );
    cy.get('[data-testid="register-submit"]').click({ force: true });
    cy.wait(300);
    cy.get("@createProduct.all").should("have.length", 0);

    cy.get('[data-testid="register-caracteristicas-pc"]')
      .clear({ force: true })
      .type("tipo: WorkStation{enter}Procesador: AMD Ryzen 7", { force: true });
    cy.get('[data-testid="register-caracteristicas-pc"]')
      .invoke("val")
      .should("not.include", "tipo:")
      .and("include", "Procesador: AMD Ryzen 7");

    cy.window().then((win) => cy.stub(win, "alert").as("alert"));
    cy.contains("label", "Tipo de PC")
      .parents(".MuiFormControl-root")
      .find("input")
      .first()
      .click({ force: true })
      .type("Estación{downarrow}{enter}", { force: true });
    cy.get('[data-testid="form-register-product"] input[name="sku"]').type(
      "SKU-2",
      { force: true },
    );
    cy.get('[data-testid="form-register-product"] input[name="price"]')
      .clear({ force: true })
      .type("2000", { force: true });
    cy.get('[data-testid="form-register-product"] input[name="stock"]')
      .clear({ force: true })
      .type("2", { force: true });
    cy.get('[data-testid="register-submit"]').click({ force: true });
    cy.get("@alert").should(
      "have.been.calledWith",
      "Sube por lo menos 1 imagen",
    );

    discardAndCloseModal();
  });

  it("registrar: muestra campos estructurados para licencias PCInBOX", () => {
    cy.get('[data-testid="btn-agregar-producto"]').click({ force: true });
    cy.get('[data-testid="select-tipo-producto"]').select("license");
    cy.get('[data-testid="license-fields"]').should("be.visible");
    cy.get('[data-testid="license-type"]').select("windows");
    cy.get('[data-testid="license-edition"]').type("Windows 11 Pro");
    cy.get('[data-testid="license-modality"]').parent().click();
    cy.contains('[role="option"]', "ESD (entrega digital)").click();
    cy.get('[data-testid="license-duration"]').parent().click();
    cy.contains('[role="option"]', "Permanente").click();
    cy.get('[data-testid="license-coverageUnit"]').parent().click();
    cy.contains('[role="option"]', "Dispositivos").click();
    cy.get('[data-testid="license-seats"]').type("1");
    cy.get('[data-testid="license-language"]').parent().click();
    cy.contains('[role="option"]', "Español").click();
    cy.get('[data-testid="license-architecture"]').parent().click();
    cy.contains('[role="option"]', "64 bits").click();
    cy.contains("label", "Proveedor")
      .parents(".MuiFormControl-root")
      .find("input")
      .should("be.disabled");
    discardAndCloseModal();
  });

  it("editar: imágenes correctas, tipo protegido y payload limpio", () => {
    cy.get(`[data-testid="edit-product-${productA.idProduct}"]`).click({
      force: true,
    });
    cy.get('[data-testid="form-edit-product"]').should("exist");
    cy.get('[data-testid="edit-product-images"] [data-testid^="edit-image-"]')
      .should("have.length", 2)
      .then(($cards) => {
        const srcs = [...$cards].map((el) => el.getAttribute("data-image-src"));
        expect(srcs).to.deep.equal(productA.image_url);
        expect(srcs.join(" ")).to.not.include("mouse-b");
      });

    cy.get('[data-testid="edit-caracteristicas"]')
      .invoke("val")
      .should("not.include", "tipo:")
      .and("include", "Procesador: AMD Ryzen 7 8700G");

    cy.get('[data-testid="edit-caracteristicas"]')
      .clear({ force: true })
      .type("tipo: hack{enter}Gabinete: Torre dual fan", { force: true });
    cy.get('[data-testid="edit-caracteristicas"]')
      .invoke("val")
      .should("not.include", "tipo:");

    cy.get('[data-testid="edit-submit"]').click({ force: true });
    cy.wait("@editProduct").then((interception) => {
      const body = interception.request.body as any;
      expect(body.caracteristicas[0]).to.deep.equal({
        prop: "tipo",
        value: "workStation",
      });
      expect(body.caracteristicas.some((c: any) => c.value === "hack")).to.eq(
        false,
      );
      expect(body.image_url.every((u: string) => !u.startsWith("blob:"))).to.eq(
        true,
      );
      expect(body.isPc).to.eq(1);
    });
    cy.contains("button", "Aceptar").click({ force: true });
    cy.get(".MuiBackdrop-root").should("not.exist");

    cy.get(`[data-testid="edit-product-${productB.idProduct}"]`).click({
      force: true,
    });
    cy.get('[data-testid="edit-product-images"] [data-testid^="edit-image-"]')
      .should("have.length", 1)
      .first()
      .should("have.attr", "data-image-src", productB.image_url[0]);
    discardAndCloseModal();
  });

  it("dar de baja usa el idProduct correcto", () => {
    cy.get(`[data-testid="remove-product-${productB.idProduct}"]`).click({
      force: true,
    });
    cy.contains("button", "Aceptar").click({ force: true });
    cy.wait("@removeProduct").then((interception) => {
      const body = interception.request.body as any;
      expect(Number(body.idProduct)).to.eq(productB.idProduct);
    });
  });
});
