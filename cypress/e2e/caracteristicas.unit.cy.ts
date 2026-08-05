import {
  buildCaracteristicasPayload,
  buildPcCaracteristicas,
  caracteristicasToTextarea,
  extractTipo,
  isPcProduct,
  parseCaracteristicasRaw,
  parseCharacteristics,
  remoteImageUrls,
  serializeCaracteristicas,
  stripTipoLinesFromText,
} from "../../src/app/utils/caracteristicas.utils";
import {
  isSameProduct,
  productsMatchForMerge,
} from "../../src/app/utils/productIdentity.utils";

describe("caracteristicas.utils — casos felices y errores", () => {
  it("parsea prop:value y descarta tipo del texto", () => {
    const parsed = parseCharacteristics(
      "tipo: WorkStation\nProcesador: AMD Ryzen 7\nMemoria RAM: 32 GB\n\n",
    );
    expect(parsed).to.deep.equal([
      { prop: "Procesador", value: "AMD Ryzen 7" },
      { prop: "Memoria RAM", value: "32 GB" },
    ]);
  });

  it("rechaza líneas sin valor (error deliberado)", () => {
    const parsed = parseCharacteristics("Procesador:\nSoloProp");
    expect(parsed).to.deep.equal([]);
  });

  it("arma payload PC con tipo interno primero", () => {
    const payload = buildPcCaracteristicas(
      "Procesador: AMD\ntipo: hackeado\nSSD: 1TB",
      "workStation",
    );
    expect(payload[0]).to.deep.equal({
      prop: "tipo",
      value: "workStation",
    });
    expect(payload.some((c) => c.value === "hackeado")).to.eq(false);
    expect(payload).to.deep.equal([
      { prop: "tipo", value: "workStation" },
      { prop: "Procesador", value: "AMD" },
      { prop: "SSD", value: "1TB" },
    ]);
  });

  it("sin tipo seleccionado no inventa tipo", () => {
    expect(buildPcCaracteristicas("RAM: 16GB", null)).to.deep.equal([
      { prop: "RAM", value: "16GB" },
    ]);
  });

  it("serializeCaracteristicas nunca deja string crudo con \\n", () => {
    const json = serializeCaracteristicas(
      "Procesador: AMD Ryzen 7\nMemoria RAM: 32 GB",
    );
    const parsed = JSON.parse(json);
    expect(parsed).to.be.an("array");
    expect(parsed[0]).to.have.keys(["prop", "value"]);
    expect(json.includes("\\n")).to.eq(false);
  });

  it("stripTipoLinesFromText evita que el usuario edite tipo en textarea", () => {
    const cleaned = stripTipoLinesFromText(
      "tipo: pro\nProcesador: X\nTIPO: entrada\nSSD: 1TB",
    );
    expect(cleaned).to.eq("Procesador: X\nSSD: 1TB");
  });

  it("parseCaracteristicasRaw tolera string JSON inválido (error)", () => {
    expect(parseCaracteristicasRaw('"tipo: WorkStation\\n..."')).to.deep.equal(
      [],
    );
    expect(parseCaracteristicasRaw("not-json")).to.deep.equal([]);
  });

  it("parseCaracteristicasRaw lee array correcto", () => {
    const raw = JSON.stringify([
      { prop: "tipo", value: "workStation" },
      { prop: "Procesador", value: "AMD" },
    ]);
    expect(extractTipo(parseCaracteristicasRaw(raw))).to.eq("workStation");
    expect(caracteristicasToTextarea(parseCaracteristicasRaw(raw))).to.eq(
      "Procesador: AMD",
    );
  });

  it("buildCaracteristicasPayload en edit PC reinyecta tipo", () => {
    const payload = buildCaracteristicasPayload(
      "tipo: malo\nGabinete: Torre",
      "intermedia",
      true,
    );
    expect(payload).to.deep.equal([
      { prop: "tipo", value: "intermedia" },
      { prop: "Gabinete", value: "Torre" },
    ]);
  });

  it("isPcProduct cubre variantes de flag", () => {
    expect(isPcProduct({ isPc: 1 })).to.eq(true);
    expect(isPcProduct({ isPC: "1" })).to.eq(true);
    expect(isPcProduct({ isPc: 0 })).to.eq(false);
    expect(isPcProduct({})).to.eq(false);
  });

  it("remoteImageUrls filtra blob: (error al editar con preview local)", () => {
    expect(
      remoteImageUrls([
        "https://cdn.example/a.jpg",
        "blob:http://localhost/abc",
        "",
        null,
      ]),
    ).to.deep.equal(["https://cdn.example/a.jpg"]);
  });
});

describe("productIdentity.utils — matches peligrosos", () => {
  it("no iguala productos con idProduct null/0 (bug histórico)", () => {
    expect(
      isSameProduct({ idProduct: null }, { idProduct: null }),
    ).to.eq(false);
    expect(isSameProduct({ idProduct: 0 }, { idProduct: 0 })).to.eq(false);
  });

  it("iguala por idProduct válido", () => {
    expect(
      isSameProduct({ idProduct: 12 }, { idProduct: "12" }),
    ).to.eq(true);
  });

  it("merge usa idProductExt cuando existe", () => {
    expect(
      productsMatchForMerge(
        { idProduct: 1, idProductExt: "ABC" },
        { idProduct: 99, idProductExt: "ABC" },
      ),
    ).to.eq(true);
    expect(
      productsMatchForMerge(
        { idProduct: 1, idProductExt: "" },
        { idProduct: 1, idProductExt: "" },
      ),
    ).to.eq(true);
  });

  it("no mezcla dos productos distintos por idProductExt vacío", () => {
    // Ambos sin ext: cae a idProduct
    expect(
      productsMatchForMerge(
        { idProduct: 5, idProductExt: null },
        { idProduct: 9, idProductExt: null },
      ),
    ).to.eq(false);
  });
});
