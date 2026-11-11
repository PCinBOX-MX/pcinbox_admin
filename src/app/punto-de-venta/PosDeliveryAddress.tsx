"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { MenuItem, TextField } from "@mui/material";
import { Pencil, Plus, Trash2, Truck } from "lucide-react";
import UtilsService from "../services/utils";
import {
  MAX_POS_DELIVERIES,
  POSTAL_CODE_LOOKUP_FAILED,
  POSTAL_CODE_NOT_FOUND,
  PosDeliveryErrors,
  PosDeliveryForm,
} from "./posDelivery";
import { formatMoney } from "./posFormat";
import PosNumberField from "./PosNumberField";
import styles from "./punto-de-venta.module.css";

type PostalPlace = {
  placeName: string;
  adminName1: string;
  adminName2: string;
  adminName3: string;
};

type DeliveryEditor = {
  id: string | null;
  form: PosDeliveryForm;
};

type Props = {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  addresses: PosDeliveryForm[];
  editor: DeliveryEditor | null;
  errors: PosDeliveryErrors;
  onStartAdd: () => void;
  onStartEdit: (id: string) => void;
  onRemove: (id: string) => void;
  onChangeEditor: (next: PosDeliveryForm) => void;
  onRegister: () => void;
  onCancelEditor: () => void;
  idleHint?: string;
  activeHint?: string;
};

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "12px",
    backgroundColor: "#fff",
    "&:hover fieldset": { borderColor: "#1d4ed8" },
    "&.Mui-focused": {
      boxShadow: "0 0 0 3px rgba(29, 78, 216, 0.14)",
    },
    "&.Mui-focused fieldset": { borderColor: "#1d4ed8" },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: "#1d4ed8" },
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className={styles.deliveryError}>{message}</p>;
}

function DeliveryAddressFields({
  title,
  canRemove,
  value,
  errors,
  onChange,
  onRemove,
  footer,
}: {
  title: string;
  canRemove: boolean;
  value: PosDeliveryForm;
  errors: PosDeliveryErrors;
  onChange: (next: PosDeliveryForm) => void;
  onRemove: () => void;
  footer?: ReactNode;
}) {
  const { requestPost } = UtilsService();
  const requestPostRef = useRef(requestPost);
  requestPostRef.current = requestPost;
  const [places, setPlaces] = useState<PostalPlace[]>([]);
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const lookupId = useRef(0);
  const valueRef = useRef(value);
  valueRef.current = value;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const readPlaces = (payload: unknown): PostalPlace[] => {
    const body =
      payload && typeof payload === "object"
        ? (payload as { data?: unknown; postalcodes?: unknown })
        : null;
    const nested =
      body?.data && typeof body.data === "object"
        ? (body.data as {
            postalcodes?: unknown;
            data?: { postalcodes?: unknown };
          })
        : null;
    const codes =
      nested?.postalcodes ?? nested?.data?.postalcodes ?? body?.postalcodes;
    if (!Array.isArray(codes)) return [];
    return codes
      .filter(
        (row: { placeName?: string }) =>
          Boolean(row) && typeof row.placeName === "string" && row.placeName,
      )
      .map((row: PostalPlace) => ({
        placeName: String(row.placeName),
        adminName1: String(row.adminName1 || ""),
        adminName2: String(row.adminName2 || ""),
        adminName3: String(row.adminName3 || ""),
      }));
  };

  const applyPlaces = (nextPlaces: PostalPlace[]) => {
    const current = valueRef.current;
    setPlaces(nextPlaces);
    if (nextPlaces.length === 0) {
      setLookupError(POSTAL_CODE_NOT_FOUND);
      onChangeRef.current({
        ...current,
        cologne: "",
        state: "",
        city: "",
      });
      return;
    }
    setLookupError("");
    const first = nextPlaces[0];
    const stillValid = nextPlaces.some(
      (place) => place.placeName === current.cologne,
    );
    onChangeRef.current({
      ...current,
      state: first.adminName1,
      city: first.adminName3 || first.adminName2,
      cologne: stillValid ? current.cologne : "",
    });
  };

  const lookupPostalCode = async (postalCode: string) => {
    const lookup = ++lookupId.current;
    setLookingUp(true);
    setLookupError("");
    setPlaces([]);
    let payload: unknown;
    try {
      const res = await requestPostRef.current(
        { postalCode },
        "/geonames/getAddressWithPostalCode",
        { silent: true },
      );
      payload = res?.data;
    } catch {
      if (lookup !== lookupId.current) return;
      setPlaces([]);
      setLookupError(POSTAL_CODE_LOOKUP_FAILED);
      onChangeRef.current({
        ...valueRef.current,
        cologne: "",
        state: "",
        city: "",
      });
      setLookingUp(false);
      return;
    }
    if (lookup !== lookupId.current) return;
    try {
      applyPlaces(readPlaces(payload));
    } finally {
      if (lookup === lookupId.current) setLookingUp(false);
    }
  };

  const lookupRef = useRef(lookupPostalCode);
  lookupRef.current = lookupPostalCode;

  useEffect(() => {
    const postalCode = String(value.postalCode || "").replace(/\D/g, "");
    if (postalCode.length !== 5) {
      lookupId.current += 1;
      setPlaces([]);
      setLookingUp(false);
      setLookupError("");
      return;
    }
    void lookupRef.current(postalCode);
  }, [value.postalCode]);

  const patch = (partial: Partial<PosDeliveryForm>) => {
    onChange({ ...value, ...partial });
  };

  const changePostalCode = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 5);
    patch({
      postalCode: digits,
      cologne: "",
      city: "",
      state: "",
    });
  };

  const locationLocked = places.length === 0 || lookingUp;
  const stateLabel = places[0]?.adminName1 || "";
  const cityLabel = places[0]?.adminName3 || places[0]?.adminName2 || "";
  const postalMessage = errors.postalCode || lookupError;

  return (
    <div className={styles.deliveryForm}>
      <div className={styles.deliveryCardHead}>
        <span className={styles.deliveryCardTitle}>{title}</span>
        {canRemove ? (
          <button
            type="button"
            className={styles.deliveryRemoveBtn}
            onClick={onRemove}
          >
            Quitar
          </button>
        ) : null}
      </div>

      <div className={styles.deliveryFields}>
        <div>
          <TextField
            size="small"
            fullWidth
            label="Calle"
            value={value.street}
            onChange={(event) => patch({ street: event.target.value })}
            error={Boolean(errors.street)}
            sx={fieldSx}
          />
          <FieldError message={errors.street} />
        </div>

        <div className={styles.deliveryGrid}>
          <div>
            <TextField
              size="small"
              fullWidth
              label="Número exterior"
              value={value.noExt}
              onChange={(event) => patch({ noExt: event.target.value })}
              error={Boolean(errors.noExt)}
              inputProps={{ maxLength: 10 }}
              sx={fieldSx}
            />
            <FieldError message={errors.noExt} />
          </div>
          <div>
            <TextField
              size="small"
              fullWidth
              label="Interior (opcional)"
              value={value.noInt}
              onChange={(event) => patch({ noInt: event.target.value })}
              error={Boolean(errors.noInt)}
              inputProps={{ maxLength: 10 }}
              sx={fieldSx}
            />
            <FieldError message={errors.noInt} />
          </div>
        </div>

        <div className={styles.deliveryLocation}>
          <div className={styles.deliveryPostal}>
            <TextField
              size="small"
              fullWidth
              label="Código postal"
              value={value.postalCode}
              onChange={(event) => changePostalCode(event.target.value)}
              error={Boolean(postalMessage)}
              inputProps={{ inputMode: "numeric", maxLength: 5 }}
              helperText={
                lookingUp ? "Consultando colonias y ubicación…" : undefined
              }
              sx={fieldSx}
            />
            <FieldError message={postalMessage} />
          </div>
          <div>
            <TextField
              select
              size="small"
              fullWidth
              label="Colonia"
              value={
                places.some((place) => place.placeName === value.cologne)
                  ? value.cologne
                  : ""
              }
              onChange={(event) => patch({ cologne: event.target.value })}
              error={Boolean(errors.cologne)}
              disabled={locationLocked}
              sx={fieldSx}
            >
              <MenuItem value="">
                {lookingUp ? "Cargando colonias…" : "Selecciona una colonia"}
              </MenuItem>
              {places.map((place, placeIndex) => (
                <MenuItem
                  key={`${place.placeName}-${placeIndex}`}
                  value={place.placeName}
                >
                  {place.placeName}
                </MenuItem>
              ))}
            </TextField>
            <FieldError message={errors.cologne} />
          </div>
        </div>

        <div>
          <div className={styles.deliveryGrid}>
            <TextField
              select
              size="small"
              fullWidth
              label="Estado"
              value={locationLocked ? "" : value.state || stateLabel}
              onChange={(event) => patch({ state: event.target.value })}
              error={Boolean(errors.state)}
              disabled={locationLocked}
              sx={fieldSx}
            >
              {locationLocked ? (
                <MenuItem value="">
                  {lookingUp ? "Cargando…" : "Selecciona un estado"}
                </MenuItem>
              ) : (
                <MenuItem value={stateLabel}>{stateLabel}</MenuItem>
              )}
            </TextField>
            <TextField
              select
              size="small"
              fullWidth
              label="Ciudad"
              value={locationLocked ? "" : value.city || cityLabel}
              onChange={(event) => patch({ city: event.target.value })}
              error={Boolean(errors.city)}
              disabled={locationLocked}
              sx={fieldSx}
            >
              {locationLocked ? (
                <MenuItem value="">
                  {lookingUp ? "Cargando…" : "Selecciona una ciudad"}
                </MenuItem>
              ) : (
                <MenuItem value={cityLabel}>{cityLabel}</MenuItem>
              )}
            </TextField>
          </div>
          <FieldError message={errors.state || errors.city} />
        </div>

        <div className={styles.deliveryCost}>
          <PosNumberField
            label="Costo de envío"
            value={value.shippingCost}
            onCommit={(raw) => patch({ shippingCost: raw })}
            error={Boolean(errors.shippingCost)}
            sx={fieldSx}
          />
      <FieldError message={errors.shippingCost} />
      {footer}
    </div>
      </div>
    </div>
  );
}

function addressSummary(form: PosDeliveryForm): string {
  const interior = form.noInt.trim() ? ` Int. ${form.noInt.trim()}` : "";
  return `${form.street.trim()} #${form.noExt.trim()}${interior}`;
}

function DeliveryEditorCard({
  title,
  value,
  errors,
  registerLabel,
  onChange,
  onRegister,
  onCancel,
}: {
  title: string;
  value: PosDeliveryForm;
  errors: PosDeliveryErrors;
  registerLabel: string;
  onChange: (next: PosDeliveryForm) => void;
  onRegister: () => void;
  onCancel: () => void;
}) {
  return (
    <DeliveryAddressFields
      title={title}
      canRemove={false}
      value={value}
      errors={errors}
      onChange={onChange}
      onRemove={() => undefined}
      footer={
        <div className={styles.deliveryFormActions}>
          <button
            type="button"
            className={styles.deliveryRegisterBtn}
            onClick={onRegister}
          >
            {registerLabel}
          </button>
          <button
            type="button"
            className={styles.deliveryCancelBtn}
            onClick={onCancel}
          >
            Cancelar
          </button>
        </div>
      }
    />
  );
}

export default function PosDeliveryAddress({
  enabled,
  onEnabledChange,
  addresses,
  editor,
  errors,
  onStartAdd,
  onStartEdit,
  onRemove,
  onChangeEditor,
  onRegister,
  onCancelEditor,
  idleHint = "Actívalo solo si esta venta se envía a domicilio",
  activeHint = "Registra cada domicilio. Cuenta como un servicio.",
}: Props) {
  const atLimit = addresses.length >= MAX_POS_DELIVERIES;
  const adding = editor != null && editor.id == null;

  return (
    <div className={styles.deliveryBlock} id="pos-delivery-form">
      <label
        className={`${styles.deliveryCheck} ${
          enabled ? styles.deliveryCheckActive : ""
        }`}
      >
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => onEnabledChange(event.target.checked)}
        />
        <span className={styles.facturaCheckBody}>
          <span className={styles.deliveryCheckTitle}>
            <Truck size={15} strokeWidth={2.4} />
            Envío a domicilio
          </span>
          <span className={styles.deliveryCheckHint}>
            {enabled ? activeHint : idleHint}
          </span>
        </span>
      </label>

      {enabled ? (
        <>
          {addresses.map((address, index) =>
            editor?.id === address.id ? (
              <DeliveryEditorCard
                key={address.id}
                title={`Editar domicilio ${index + 1}`}
                value={editor.form}
                errors={errors}
                registerLabel="Guardar domicilio"
                onChange={onChangeEditor}
                onRegister={onRegister}
                onCancel={onCancelEditor}
              />
            ) : (
              <article key={address.id} className={styles.deliveryItem}>
                <div className={styles.deliveryItemBody}>
                  <span className={styles.deliveryItemMark} aria-hidden>
                    <Truck size={18} strokeWidth={2.3} />
                  </span>
                  <div className={styles.deliveryItemCopy}>
                    <div className={styles.deliveryItemHead}>
                      <span className={styles.deliveryItemKicker}>
                        Domicilio {index + 1}
                      </span>
                      <span className={styles.deliveryServiceBadge}>Servicio</span>
                    </div>
                    <strong className={styles.deliveryItemStreet}>
                      {addressSummary(address)}
                    </strong>
                    <p className={styles.deliveryItemPlace}>
                      <span>Col. {address.cologne}</span>
                      <span className={styles.deliveryItemDot} aria-hidden>
                        ·
                      </span>
                      <span>CP {address.postalCode}</span>
                      <span className={styles.deliveryItemDot} aria-hidden>
                        ·
                      </span>
                      <span>
                        {address.city}, {address.state}
                      </span>
                    </p>
                  </div>
                  <div className={styles.deliveryItemPrice}>
                    <span>Envío</span>
                    <strong>
                      {formatMoney(Number(address.shippingCost) || 0)}
                    </strong>
                  </div>
                </div>
                <div className={styles.deliveryItemActions}>
                  <button
                    type="button"
                    className={styles.deliveryEditBtn}
                    onClick={() => onStartEdit(address.id)}
                    disabled={editor != null}
                  >
                    <Pencil size={14} strokeWidth={2.4} />
                    Editar
                  </button>
                  <button
                    type="button"
                    className={styles.deliveryDeleteBtn}
                    onClick={() => onRemove(address.id)}
                  >
                    <Trash2 size={14} strokeWidth={2.4} />
                    Borrar
                  </button>
                </div>
              </article>
            ),
          )}

          {adding && editor ? (
            <DeliveryEditorCard
              title="Nuevo domicilio"
              value={editor.form}
              errors={errors}
              registerLabel="Registrar domicilio"
              onChange={onChangeEditor}
              onRegister={onRegister}
              onCancel={onCancelEditor}
            />
          ) : null}

          {!editor && addresses.length === 0 ? (
            <p className={styles.deliveryEmpty}>Aún no hay domicilios registrados.</p>
          ) : null}

          {!editor ? (
            <button
              type="button"
              className={styles.deliveryAddBtn}
              onClick={onStartAdd}
              disabled={atLimit}
            >
              <Plus size={15} strokeWidth={2.5} />
              {atLimit ? "Máximo 10 domicilios" : "Añadir domicilio"}
            </button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
