"use client";

import { ReactNode } from "react";
import {
  Building2,
  CreditCard,
  FileText,
  Hash,
  Landmark,
  Mail,
  MapPin,
  Phone,
  Receipt,
  UserRound,
} from "lucide-react";
import EmptyState from "../../common/emptyState/EmptyState";
import {
  ModalDetailField,
  ModalDetailGrid,
} from "../modal/ModalDetail";

function displayText(value: unknown) {
  if (value == null || typeof value === "object") return "";
  return String(value).trim();
}

const PAYMENT_LABELS: Record<string, string> = {
  tarjeta_de_credito: "Tarjeta de crédito",
  tarjeta_de_debito: "Tarjeta de débito",
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  transferencia_electronica: "Transferencia electrónica",
  "01": "Efectivo",
  "02": "Cheque nominativo",
  "03": "Transferencia electrónica de fondos",
  "04": "Tarjeta de crédito",
  "28": "Tarjeta de débito",
  "99": "Por definir",
  pue: "PUE · Pago en una sola exhibición",
  ppd: "PPD · Pago en parcialidades o diferido",
};

const CFDI_LABELS: Record<string, string> = {
  G01: "Adquisición de mercancías",
  G02: "Devoluciones, descuentos o bonificaciones",
  G03: "Gastos en general",
  I01: "Construcciones",
  I02: "Mobiliario y equipo de oficina por inversiones",
  I03: "Equipo de transporte",
  I04: "Equipo de cómputo y accesorios",
  I05: "Dados, troqueles, moldes, matrices y herramental",
  I06: "Comunicaciones telefónicas",
  I07: "Comunicaciones satelitales",
  I08: "Otra maquinaria y equipo",
  D01: "Honorarios médicos, dentales y gastos hospitalarios",
  D02: "Gastos médicos por incapacidad o discapacidad",
  D03: "Gastos funerales",
  D04: "Donativos",
  D05: "Intereses reales de créditos hipotecarios",
  D06: "Aportaciones voluntarias al SAR",
  D07: "Primas por seguros de gastos médicos",
  D08: "Gastos de transportación escolar obligatoria",
  D09: "Depósitos en cuentas para el ahorro",
  D10: "Pagos por servicios educativos",
  S01: "Sin efectos fiscales",
  CP01: "Pagos",
  CN01: "Nómina",
};

const TAX_REGIMEN_LABELS: Record<string, string> = {
  "601": "General de Ley Personas Morales",
  "603": "Personas Morales con Fines no Lucrativos",
  "605": "Sueldos y Salarios e Ingresos Asimilados a Salarios",
  "606": "Arrendamiento",
  "607": "Régimen de Enajenación o Adquisición de Bienes",
  "608": "Demás ingresos",
  "610": "Residentes en el Extranjero sin Establecimiento Permanente",
  "611": "Ingresos por Dividendos",
  "612": "Personas Físicas con Actividades Empresariales y Profesionales",
  "614": "Ingresos por intereses",
  "615": "Régimen de los ingresos por obtención de premios",
  "616": "Sin obligaciones fiscales",
  "620": "Sociedades Cooperativas de Producción",
  "621": "Incorporación Fiscal",
  "622": "Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras",
  "623": "Opcional para Grupos de Sociedades",
  "624": "Coordinados",
  "625": "Actividades Empresariales a través de Plataformas Tecnológicas",
  "626": "Régimen Simplificado de Confianza",
};

const FIELD_LABELS: Record<string, string> = {
  companyName: "Razón social",
  razonSocial: "Razón social",
  rfc: "RFC",
  cfdi: "Uso de CFDI",
  usoCfdi: "Uso de CFDI",
  taxRegimen: "Régimen fiscal",
  regimenFiscal: "Régimen fiscal",
  methodPay: "Método de pago",
  metodoPago: "Método de pago",
  formaPago: "Forma de pago",
  codePostal: "Código postal",
  codigoPostal: "Código postal",
  postalCode: "Código postal",
  state: "Estado",
  estado: "Estado",
  city: "Ciudad",
  ciudad: "Ciudad",
  municipio: "Municipio",
  email: "Correo",
  correo: "Correo",
  orden: "No. orden",
  phone: "Teléfono",
  telefono: "Teléfono",
  phone1: "Teléfono",
  street: "Calle",
  calle: "Calle",
  address: "Dirección",
  direccion: "Dirección",
  colonia: "Colonia",
  cologne: "Colonia",
  country: "País",
  pais: "País",
  noExt: "No. exterior",
  noInt: "No. interior",
  personType: "Tipo de persona",
  tipoPersona: "Tipo de persona",
  lastName: "Apellido",
  lastname: "Apellido",
  active: "Estado de la cuenta",
  role: "Tipo de cuenta",
};

const HIDDEN_KEYS = new Set([
  "id",
  "idBilling",
  "idFacturacion",
  "idOrder",
  "idUser",
  "userId",
  "createdAt",
  "updatedAt",
  "deletedAt",
  "created_at",
  "updated_at",
]);

function formatPaymentMethod(value: unknown) {
  const raw = displayText(value);
  if (!raw) return "";
  const key = raw.toLowerCase().replace(/\s+/g, "_");
  if (PAYMENT_LABELS[key]) return PAYMENT_LABELS[key];
  if (PAYMENT_LABELS[raw]) return PAYMENT_LABELS[raw];
  if (raw.includes("_")) return raw.replace(/_/g, " ").replace(/\s+/g, " ").trim();
  return raw;
}

function catalogHint(catalog: Record<string, string>, value: string) {
  const code = value.toUpperCase();
  return catalog[code] ?? catalog[value] ?? "";
}

function pickField(data: any, keys: string[]) {
  for (const key of keys) {
    const value = displayText(data?.[key]);
    if (value) return { key, value };
  }
  return null;
}

function labelFromKey(key: string) {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  const spaced = key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function extraEntries(data: any, usedKeys: Set<string>) {
  if (!data || typeof data !== "object") return [];
  return Object.entries(data).flatMap(([key, raw]) => {
    if (usedKeys.has(key) || HIDDEN_KEYS.has(key)) return [];
    if (raw == null || typeof raw === "object") return [];
    const value = displayText(raw);
    if (!value || value === "null" || value === "undefined") return [];
    const readable = value.includes("_")
      ? value.replace(/_/g, " ").replace(/\s+/g, " ").trim()
      : value;
    return [{ key, label: labelFromKey(key), value: readable }];
  });
}

function BillingTile({
  icon,
  tone,
  label,
  value,
  hint,
  wide = false,
}: {
  icon: ReactNode;
  tone: "rose" | "blue" | "amber" | "green" | "slate";
  label: string;
  value: string;
  hint?: string;
  wide?: boolean;
}) {
  return (
    <div className={`admin-billing-tile${wide ? " admin-billing-tile--wide" : ""}`}>
      <span className={`admin-billing-tile__icon admin-billing-tile__icon--${tone}`} aria-hidden>
        {icon}
      </span>
      <div className="admin-billing-tile__copy">
        <span className="admin-billing-tile__label">{label}</span>
        <strong className="admin-billing-tile__value">{value}</strong>
        {hint ? <span className="admin-billing-tile__hint">{hint}</span> : null}
      </div>
    </div>
  );
}

function BillingRecord({
  data,
  index,
  total,
}: {
  data: any;
  index: number;
  total: number;
}) {
  const company = pickField(data, ["companyName", "razonSocial", "company", "businessName", "nombre"]);
  const rfc = pickField(data, ["rfc", "RFC"]);
  const cfdi = pickField(data, ["cfdi", "usoCfdi", "usoCFDI"]);
  const regimen = pickField(data, ["taxRegimen", "regimenFiscal", "taxRegime", "regimen"]);
  const payment = pickField(data, ["methodPay", "metodoPago", "formaPago", "paymentMethod"]);
  const postal = pickField(data, ["codePostal", "codigoPostal", "postalCode", "cp", "zip"]);
  const state = pickField(data, ["state", "estado"]);
  const city = pickField(data, ["city", "ciudad", "municipio"]);
  const email = pickField(data, ["email", "correo", "mail"]);
  const phone = pickField(data, ["phone", "telefono", "phone1"]);
  const order = pickField(data, ["orden", "noOrden", "orderNumber"]);
  const street = pickField(data, ["street", "calle", "address", "direccion"]);
  const colonia = pickField(data, ["colonia", "cologne", "neighborhood"]);
  const exterior = pickField(data, ["noExt", "numExt", "exterior"]);
  const interior = pickField(data, ["noInt", "numInt", "interior"]);
  const country = pickField(data, ["country", "pais"]);

  const usedKeys = new Set(
    [company, rfc, cfdi, regimen, payment, postal, state, city, email, phone, order, street, colonia, exterior, interior, country]
      .filter(Boolean)
      .map((field) => field!.key),
  );
  const extras = extraEntries(data, usedKeys);

  const addressLines = [
    [street?.value, exterior?.value ? `Ext. ${exterior.value}` : "", interior?.value ? `Int. ${interior.value}` : ""]
      .filter(Boolean)
      .join(", "),
    colonia?.value ? `Col. ${colonia.value}` : "",
    [city?.value, state?.value].filter(Boolean).join(", "),
    postal?.value ? `C.P. ${postal.value}` : "",
    country?.value ?? "",
  ].filter(Boolean);

  const fiscalTiles = [
    cfdi
      ? {
          key: "cfdi",
          icon: <FileText size={16} strokeWidth={2.2} />,
          tone: "blue" as const,
          label: "Uso de CFDI",
          value: cfdi.value.toUpperCase(),
          hint: catalogHint(CFDI_LABELS, cfdi.value),
        }
      : null,
    regimen
      ? {
          key: "regimen",
          icon: <Landmark size={16} strokeWidth={2.2} />,
          tone: "amber" as const,
          label: "Régimen fiscal",
          value: regimen.value,
          hint: catalogHint(TAX_REGIMEN_LABELS, regimen.value),
        }
      : null,
  ].filter(Boolean);

  const contactTiles = [
    email
      ? {
          key: "email",
          icon: <Mail size={16} strokeWidth={2.2} />,
          tone: "slate" as const,
          label: "Correo",
          value: email.value,
          wide: true,
        }
      : null,
    phone
      ? {
          key: "phone",
          icon: <Phone size={16} strokeWidth={2.2} />,
          tone: "slate" as const,
          label: "Teléfono",
          value: phone.value,
          wide: false,
        }
      : null,
    order
      ? {
          key: "order",
          icon: <Hash size={16} strokeWidth={2.2} />,
          tone: "slate" as const,
          label: "No. orden",
          value: order.value,
          wide: false,
        }
      : null,
  ].filter(Boolean);

  return (
    <article className="admin-billing-card">
      <header className="admin-billing-card__hero">
        <div className="admin-billing-card__hero-top">
          <span className="admin-billing-card__badge">
            <Receipt size={14} strokeWidth={2.4} />
            {total > 1 ? `Factura ${index + 1}` : "Factura"}
          </span>
          <Building2 size={42} strokeWidth={1.4} className="admin-billing-card__watermark" />
        </div>
        <p className="admin-billing-card__kicker">Razón social</p>
        <h3 className="admin-billing-card__company">
          {company?.value || "Sin razón social"}
        </h3>
        {rfc ? (
          <p className="admin-billing-card__rfc">
            <span>RFC</span>
            <strong>{rfc.value.toUpperCase()}</strong>
          </p>
        ) : null}
      </header>

      <div className="admin-billing-card__body">
        {fiscalTiles.length > 0 || payment ? (
          <section className="admin-billing-card__section">
            <h4>Datos fiscales</h4>
            <div className="admin-billing-card__grid">
              {fiscalTiles.map((tile) => (
                <BillingTile
                  key={tile.key}
                  icon={tile.icon}
                  tone={tile.tone}
                  label={tile.label}
                  value={tile.value}
                  hint={tile.hint}
                  wide={fiscalTiles.length === 1}
                />
              ))}
              {payment ? (
                <BillingTile
                  wide
                  icon={<CreditCard size={16} strokeWidth={2.2} />}
                  tone="green"
                  label={payment.key === "formaPago" ? "Forma de pago" : "Método de pago"}
                  value={formatPaymentMethod(payment.value)}
                />
              ) : null}
            </div>
          </section>
        ) : null}

        {addressLines.length > 0 ? (
          <section className="admin-billing-card__section">
            <h4>Domicilio fiscal</h4>
            <div className="admin-billing-place">
              <span className="admin-billing-place__icon" aria-hidden>
                <MapPin size={18} strokeWidth={2.2} />
              </span>
              <div className="admin-billing-place__lines">
                {addressLines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {contactTiles.length > 0 ? (
          <section className="admin-billing-card__section">
            <h4>Contacto</h4>
            <div className="admin-billing-card__grid">
              {contactTiles.map((tile) => (
                <BillingTile
                  key={tile.key}
                  icon={tile.icon}
                  tone={tile.tone}
                  label={tile.label}
                  value={tile.value}
                  wide={tile.wide || contactTiles.length === 1}
                />
              ))}
            </div>
          </section>
        ) : null}

        {extras.length > 0 ? (
          <section className="admin-billing-card__section">
            <h4>Otros datos</h4>
            <div className="admin-billing-card__grid">
              {extras.map((item) => (
                <BillingTile
                  key={item.key}
                  icon={<FileText size={16} strokeWidth={2.2} />}
                  tone="slate"
                  label={item.label}
                  value={item.value}
                  wide={extras.length === 1 || item.value.length > 28}
                />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </article>
  );
}

function hasBillingContent(data: any) {
  if (!data || typeof data !== "object") return false;
  return Object.entries(data).some(([key, value]) => {
    if (HIDDEN_KEYS.has(key) || value == null || typeof value === "object") return false;
    return Boolean(displayText(value));
  });
}

const CUSTOMER_HIDDEN_KEYS = new Set([
  ...HIDDEN_KEYS,
  "password",
  "token",
  "accessToken",
  "refreshToken",
  "addressPhones",
]);

function phoneKey(value: string) {
  return value.replace(/\s+/g, "");
}

function uniquePhones(values: unknown[], exclude: string[] = []) {
  const seen = new Set(exclude.map(phoneKey).filter(Boolean));
  const phones: string[] = [];
  values.forEach((raw) => {
    const value = displayText(raw);
    if (!value) return;
    const key = phoneKey(value);
    if (seen.has(key)) return;
    seen.add(key);
    phones.push(value);
  });
  return phones;
}

function customerInitials(name: string) {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
  return letters || "?";
}

function addressLinesFrom(source: any) {
  if (!source || typeof source !== "object" || Array.isArray(source)) return [];
  const street = pickField(source, ["street", "calle"]);
  const writtenAddress = pickField(source, ["address", "direccion"]);
  const exterior = pickField(source, ["noExt", "numExt", "exterior"]);
  const interior = pickField(source, ["noInt", "numInt", "interior"]);
  const colonia = pickField(source, ["colonia", "cologne", "neighborhood"]);
  const city = pickField(source, ["city", "ciudad", "municipio"]);
  const state = pickField(source, ["state", "estado"]);
  const postal = pickField(source, ["codePostal", "codigoPostal", "postalCode", "cp", "zip"]);
  const country = pickField(source, ["country", "pais"]);
  const streetLine = [street?.value, exterior?.value ? `Ext. ${exterior.value}` : "", interior?.value ? `Int. ${interior.value}` : ""]
    .filter(Boolean)
    .join(", ");
  const addressLine =
    writtenAddress && writtenAddress.value !== street?.value ? writtenAddress.value : "";

  return [
    streetLine,
    addressLine,
    colonia?.value ? `Col. ${colonia.value}` : "",
    [city?.value, state?.value].filter(Boolean).join(", "),
    postal?.value ? `C.P. ${postal.value}` : "",
    country?.value ?? "",
  ].filter(Boolean);
}

function customerAddressFields(source: any) {
  if (!source || typeof source !== "object" || Array.isArray(source)) return [];
  const specs = [
    { keys: ["street", "calle"], label: "Calle" },
    { keys: ["noExt", "numExt", "exterior"], label: "No. exterior" },
    { keys: ["noInt", "numInt", "interior"], label: "No. interior" },
    { keys: ["colonia", "cologne", "neighborhood"], label: "Colonia" },
    { keys: ["city", "ciudad", "municipio"], label: "Ciudad" },
    { keys: ["state", "estado"], label: "Estado" },
    { keys: ["codePostal", "codigoPostal", "postalCode", "cp", "zip"], label: "Código postal" },
    { keys: ["country", "pais"], label: "País" },
  ];
  const fields = specs.flatMap((spec) => {
    const field = pickField(source, spec.keys);
    return field ? [{ label: spec.label, value: field.value }] : [];
  });
  const written = pickField(source, ["address", "direccion"]);
  const street = pickField(source, ["street", "calle"]);
  if (written && written.value !== street?.value) {
    fields.unshift({ label: "Dirección", value: written.value });
  }
  return fields;
}

function customerColumnCount(tiles: { value: string }[]) {
  const count = tiles.length;
  if (count <= 1) return 1;
  const hasLongValue = tiles.some((tile) => tile.value.length > 42);
  if (!hasLongValue && count >= 3 && count !== 4) return 3;
  return 2;
}

function formatCustomerExtra(key: string, value: string) {
  if (key === "active") {
    if (value === "1" || value.toLowerCase() === "true") return "Activo";
    if (value === "0" || value.toLowerCase() === "false") return "Inactivo";
  }
  if (key === "role") {
    const role = value.toLowerCase();
    if (role === "admin") return "Administrador";
    if (role === "provider" || role === "proveedor") return "Proveedor";
    if (role === "customer" || role === "cliente") return "Cliente registrado";
  }
  return value;
}

function CustomerRecord({
  data,
  index,
  total,
}: {
  data: any;
  index: number;
  total: number;
}) {
  const firstName = displayText(data?.name);
  const lastName = displayText(data?.lastName) || displayText(data?.lastname);
  const fullName = [firstName, lastName].filter(Boolean).join(" ");
  const email = displayText(data?.email || data?.correo || data?.mail);
  const accountPhone = displayText(data?.phone || data?.telefono);
  const deliveryPhones = uniquePhones(
    [
      ...(Array.isArray(data?.addressPhones) ? data.addressPhones : []),
      data?.phone1,
      data?.phone2,
      data?.deliveryPhone,
      data?.telefonoEntrega,
    ],
    accountPhone ? [accountPhone] : [],
  );
  const nestedAddress =
    data?.address && typeof data.address === "object" && !Array.isArray(data.address)
      ? data.address
      : null;

  const usedKeys = new Set([
    "name",
    "lastName",
    "lastname",
    "email",
    "correo",
    "mail",
    "phone",
    "telefono",
    "phone1",
    "phone2",
    "deliveryPhone",
    "telefonoEntrega",
    "address",
    "addressPhones",
    "street",
    "calle",
    "direccion",
    "colonia",
    "cologne",
    "neighborhood",
    "city",
    "ciudad",
    "municipio",
    "state",
    "estado",
    "codePostal",
    "codigoPostal",
    "postalCode",
    "cp",
    "zip",
    "country",
    "pais",
    "noExt",
    "numExt",
    "exterior",
    "noInt",
    "numInt",
    "interior",
  ]);
  const extras = extraEntries(data, new Set([...usedKeys, ...CUSTOMER_HIDDEN_KEYS]));

  const headline = fullName || email || accountPhone || "Sin nombre";
  const kicker = fullName ? "Nombre completo" : email ? "Correo" : "Cliente";
  const addressFields = [
    ...customerAddressFields(data),
    ...customerAddressFields(nestedAddress),
  ].filter(
    (field, fieldIndex, all) =>
      all.findIndex((item) => item.label === field.label && item.value === field.value) === fieldIndex,
  );
  const tiles = [
    email && headline !== email
      ? {
          key: "email",
          icon: <Mail size={16} strokeWidth={2.2} />,
          tone: "slate" as const,
          label: "Correo",
          value: email,
        }
      : null,
    accountPhone && headline !== accountPhone
      ? {
          key: "account-phone",
          icon: <Phone size={16} strokeWidth={2.2} />,
          tone: "green" as const,
          label: "Teléfono de la cuenta",
          value: accountPhone,
        }
      : null,
    ...deliveryPhones.map((phone, phoneIndex) => ({
      key: `delivery-${phoneIndex}`,
      icon: <Phone size={16} strokeWidth={2.2} />,
      tone: "rose" as const,
      label:
        deliveryPhones.length > 1
          ? `Teléfono de entrega ${phoneIndex + 1}`
          : "Teléfono de entrega",
      value: phone,
    })),
    ...addressFields.map((field) => ({
      key: `address-${field.label}`,
      icon: <MapPin size={16} strokeWidth={2.2} />,
      tone: "rose" as const,
      label: field.label,
      value: field.value,
    })),
    ...extras.map((item) => ({
      key: item.key,
      icon: <FileText size={16} strokeWidth={2.2} />,
      tone: "slate" as const,
      label: item.label,
      value: formatCustomerExtra(item.key, item.value),
    })),
  ].filter((tile) => tile !== null);
  const columns = customerColumnCount(tiles);
  const hasBody = tiles.length > 0;

  return (
    <article className="admin-billing-card">
      <header className="admin-billing-card__hero">
        <div className="admin-billing-card__hero-top">
          <span className="admin-billing-card__badge">
            <UserRound size={14} strokeWidth={2.4} />
            {total > 1 ? `Cliente ${index + 1}` : "Cliente"}
          </span>
          <span className="admin-customer-card__avatar" aria-hidden>
            {customerInitials(fullName || email || accountPhone)}
          </span>
        </div>
        <p className="admin-billing-card__kicker">{kicker}</p>
        <h3 className="admin-billing-card__company">{headline}</h3>
      </header>

      {hasBody ? (
        <div className="admin-billing-card__body">
          <div className="admin-customer-facts" data-columns={columns}>
            {tiles.map((tile) => (
              <BillingTile
                key={tile.key}
                icon={tile.icon}
                tone={tile.tone}
                label={tile.label}
                value={tile.value}
              />
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function hasCustomerContent(data: any) {
  if (!data || typeof data !== "object") return false;
  if (addressLinesFrom(data).length > 0 || addressLinesFrom(data?.address).length > 0) return true;
  if (Array.isArray(data.addressPhones) && data.addressPhones.some((phone: unknown) => displayText(phone))) {
    return true;
  }
  return Object.entries(data).some(([key, value]) => {
    if (CUSTOMER_HIDDEN_KEYS.has(key) || value == null || typeof value === "object") return false;
    return Boolean(displayText(value));
  });
}

export function CustomerDetailsContent({ data }: { data: any }) {
  const records = (Array.isArray(data) ? data : data ? [data] : []).filter(hasCustomerContent);

  if (records.length === 0) {
    return (
      <EmptyState
        title="Sin datos del cliente"
        description="No hay información del cliente para esta orden."
        icon="customers"
        compact
      />
    );
  }

  return (
    <div className="admin-billing-stack">
      {records.map((record, index) => (
        <CustomerRecord
          key={record?.idUser ?? record?.email ?? record?.id ?? index}
          data={record}
          index={index}
          total={records.length}
        />
      ))}
    </div>
  );
}

export function BillingDetailsContent({ billing }: { billing: any[] }) {
  const records = (Array.isArray(billing) ? billing : []).filter(hasBillingContent);

  if (records.length === 0) {
    return (
      <EmptyState
        title="Sin datos de facturación"
        description="No hay información de facturación para esta orden."
        icon="quotes"
        compact
      />
    );
  }

  return (
    <div className="admin-billing-stack">
      {records.map((data, index) => (
        <BillingRecord
          key={data?.id ?? data?.rfc ?? index}
          data={data}
          index={index}
          total={records.length}
        />
      ))}
    </div>
  );
}

export const modalCloseOnly = {
  showActions: true,
  confirmLabel: "Cerrar",
} as const;

export function InvitadoProductsContent({ products }: { products: any[] }) {
  if (!Array.isArray(products) || products.length === 0) {
    return (
      <EmptyState
        title="Sin productos"
        description="No hay productos en esta orden."
        icon="products"
        compact
      />
    );
  }

  return (
    <div className="admin-modal-products">
      {products.map((item: any, index: number) => (
        <article
          key={item.idProduct ?? item.sku ?? index}
          className="admin-product-card"
        >
          <header className="admin-product-card__header">
            <div className="admin-product-card__title-wrap">
              <span className="admin-product-card__index">
                Producto {index + 1}
              </span>
              <h3 className="admin-product-card__name">{item.name}</h3>
              {item.description ? (
                <p className="admin-product-card__description">
                  {item.description}
                </p>
              ) : null}
            </div>
            <span className="admin-product-card__qty">× {item.quantity}</span>
          </header>

          <ModalDetailGrid columns={2}>
            {item.sku ? (
              <ModalDetailField label="SKU" value={item.sku} />
            ) : null}
            {item.upc ? (
              <ModalDetailField label="UPC" value={item.upc} />
            ) : null}
            {item.clave ? (
              <ModalDetailField label="Clave" value={item.clave} />
            ) : null}
            <ModalDetailField
              label="Cantidad"
              value={String(item.quantity)}
              highlight
            />
          </ModalDetailGrid>
        </article>
      ))}
    </div>
  );
}
