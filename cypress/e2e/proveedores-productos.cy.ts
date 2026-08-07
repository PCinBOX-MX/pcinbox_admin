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

const productLicense = {
  idProduct: 303,
  idProductExt: "EXT-LIC",
  name: "Antivirus Pro",
  description: "Licencia",
  price: 899,
  stock: 20,
  sku: "AV-303",
  upc: "333",
  rating: 4,
  image_url: ["https://cdn.example.com/antivirus.jpg"],
  categoryId: 99,
  marcaId: 10,
  providerId: 1,
  createdat: "",
  active: 1,
  isPc: 0,
  licenseType: "antivirus",
  caracteristicas: [
    { prop: "edicion", value: "1" },
    { prop: "modalidad", value: "ESD" },
    { prop: "vigencia", value: "Permanente" },
    { prop: "tipoCobertura", value: "Dispositivos" },
    { prop: "usuariosDispositivos", value: "1" },
    { prop: "idioma", value: "Multilenguaje" },
    { prop: "arquitectura", value: "No aplica" },
    { prop: "Nota", value: "Extra libre" },
  ],
};

const productInactive = {
  idProduct: 404,
  idProductExt: "EXT-OFF",
  name: "Teclado Offline",
  description: "Dado de baja",
  price: 300,
  stock: 0,
  sku: "KB-404",
  upc: "444",
  rating: 3,
  image_url: ["https://cdn.example.com/keyboard.jpg"],
  categoryId: 20,
  marcaId: 10,
  providerId: 1,
  createdat: "",
  active: 0,
  isPc: 0,
  caracteristicas: [],
};

const productMissing = {
  idProduct: 0,
  idProductExt: "EXT-NEW",
  name: "Producto sin alta",
  description: "Solo catálogo proveedor",
  price: 100,
  stock: 5,
  sku: "NEW-0",
  upc: "555",
  rating: 0,
  image_url: [],
  categoryId: 20,
  marcaId: 10,
  providerId: 2,
  createdat: "",
  active: 0,
  isPc: 0,
  caracteristicas: [],
};

const discardAndCloseModal = () => {
  cy.get("body").then(($body) => {
    if ($body.text().includes("Producto actualizado")) {
      cy.contains("button", "Aceptar").click({ force: true });
    }
  });

  cy.get("body").then(($body) => {
    if ($body.find('button[aria-label="Cerrar modal"]').length) {
      cy.get('button[aria-label="Cerrar modal"]').first().click({ force: true });
    }
  });

  // El confirm de dirty state aparece async; no leer el DOM en el mismo tick del click.
  cy.wait(250);
  cy.get("body").then(($body) => {
    if ($body.text().includes("Descartar cambios")) {
      cy.contains("button", "Sí, cerrar").click({ force: true });
    }
  });

  cy.get('[data-testid="form-register-product"]', { timeout: 10000 }).should(
    "not.exist",
  );
  cy.get('[data-testid="form-edit-product"]', { timeout: 10000 }).should(
    "not.exist",
  );
};

/** Cypress a veces entrega multipart como string; extrae un campo texto. */
const readFormField = (body: unknown, field: string): string | undefined => {
  if (!body) return undefined;
  if (typeof FormData !== "undefined" && body instanceof FormData) {
    const value = body.get(field);
    return value == null ? undefined : String(value);
  }
  if (typeof body === "object" && field in (body as Record<string, unknown>)) {
    const value = (body as Record<string, unknown>)[field];
    return value == null ? undefined : String(value);
  }
  if (typeof body === "string") {
    const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = body.match(
      new RegExp(
        `Content-Disposition: form-data; name="${escaped}"\\r?\\n\\r?\\n([\\s\\S]*?)\\r?\\n--`,
      ),
    );
    return match?.[1];
  }
  return undefined;
};

describe("Proveedores product flows (errores deliberados)", () => {
  beforeEach(() => {
    cy.stubProveedoresApis([
      productA,
      productB,
      productLicense,
      productInactive,
      productMissing,
    ]);
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
    // RegisterProduct es dynamic import: esperar a que el chunk monte el form.
    cy.get('[data-testid="form-register-product"]', { timeout: 30000 }).should(
      "exist",
    );
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
    cy.get('[data-testid="form-register-product"]', { timeout: 20000 }).should(
      "exist",
    );
    cy.get('[data-testid="select-tipo-producto"]').select("license");
    cy.get('[data-testid="license-fields"]').scrollIntoView().should("exist");
    cy.get('[data-testid="license-type"]').should("exist");
    cy.get('[data-testid="license-edition"]').should("exist");
    cy.get('[data-testid="license-modality"]').should("exist");
    cy.get('[data-testid="license-duration"]').should("exist");
    cy.get('[data-testid="license-coverageUnit"]').should("exist");
    cy.get('[data-testid="license-seats"]').should("exist");
    cy.get('[data-testid="license-language"]').should("exist");
    cy.get('[data-testid="license-architecture"]').should("exist");
    // Licencias siempre van a PCInBOX: proveedor fijo y no editable.
    cy.get('[data-testid="register-provider-input"]')
      .should("be.disabled")
      .and("have.value", "PC Inbox");
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
      const body = interception.request.body;
      const caracteristicasRaw = readFormField(body, "caracteristicas");
      expect(caracteristicasRaw, "caracteristicas en FormData").to.be.a(
        "string",
      );
      const caracteristicas = JSON.parse(caracteristicasRaw as string);
      expect(caracteristicas[0]).to.deep.equal({
        prop: "tipo",
        value: "workStation",
      });
      expect(caracteristicas.some((c: any) => c.value === "hack")).to.eq(false);
      // Sin cambios de imágenes: no se envía image_url ni files
      expect(readFormField(body, "image_url")).to.eq(undefined);
      expect(readFormField(body, "isPc")).to.eq("1");
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

  it("editar: valida mínimo 1 imagen sin cerrar el modal", () => {
    cy.get(`[data-testid="edit-product-${productB.idProduct}"]`).click({
      force: true,
    });
    cy.get('[data-testid="form-edit-product"]').should("exist");
    cy.get('[data-testid="edit-remove-image-0"]').click({ force: true });
    cy.get('[data-testid="edit-image-error"]')
      .should("be.visible")
      .and("contain", "al menos 1 imagen");
    cy.get('[data-testid="edit-submit"]').click({ force: true });
    cy.get("@editProduct.all").should("have.length", 0);
    cy.get('[data-testid="form-edit-product"]').should("exist");
    cy.get('[data-testid="edit-image-error"]').should("be.visible");
    discardAndCloseModal();
  });

  it("editar licencia: campos estructurados no van al textarea", () => {
    cy.get(`[data-testid="edit-product-${productLicense.idProduct}"]`).click({
      force: true,
    });
    cy.get('[data-testid="form-edit-product"]').should("exist");
    cy.get('[data-testid="edit-license-fields"]')
      .scrollIntoView()
      .should("exist");
    cy.get('[data-testid="edit-caracteristicas"]')
      .scrollIntoView()
      .invoke("val")
      .should("include", "Nota: Extra libre")
      .and("not.include", "edicion:")
      .and("not.include", "modalidad:")
      .and("not.include", "vigencia:")
      .and("not.include", "tipoCobertura:")
      .and("not.include", "usuariosDispositivos:")
      .and("not.include", "idioma:")
      .and("not.include", "arquitectura:");

    cy.get('[data-testid="edit-caracteristicas"]')
      .scrollIntoView()
      .type("{enter}edicion: hack{enter}modalidad: hack", { force: true });
    cy.get('[data-testid="edit-caracteristicas"]')
      .invoke("val")
      .should("not.include", "edicion:")
      .and("not.include", "modalidad:");
    discardAndCloseModal();
  });

  it("alta: active=0 o sin registro muestran Dar de alta, no Editar", () => {
    cy.contains(".MuiCard-root", productInactive.name).as("cardInactive");
    cy.get("@cardInactive").should("contain.text", "Dar de alta al sistema");
    cy.get("@cardInactive").should("not.contain.text", "Editar producto");
    cy.get("@cardInactive").should(
      "not.contain.text",
      "Dar de baja del sistema",
    );

    cy.contains(".MuiCard-root", productMissing.name).as("cardMissing");
    cy.get("@cardMissing").should("contain.text", "Dar de alta al sistema");
    cy.get("@cardMissing").should("not.contain.text", "Editar producto");

    cy.contains(".MuiCard-root", productA.name).as("cardActive");
    cy.get("@cardActive").should("contain.text", "Editar producto");
    cy.get("@cardActive").should("not.contain.text", "Dar de alta al sistema");
  });
});
