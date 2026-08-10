"use client";

import { useState } from "react";
import { CanCancelOrderResult } from "@/app/types/orderCancellation";

type Props = {
  idOrder: number;
  eligibility: CanCancelOrderResult | null;
  canOverride: boolean;
  onCancel: () => void;
  onConfirm: (payload: {
    cancelReason: string;
    manualOverride: boolean;
  }) => void;
};

export default function OrderCancelModal({
  idOrder,
  eligibility,
  canOverride,
  onCancel,
  onConfirm,
}: Props) {
  const [reason, setReason] = useState("");
  const [manualOverride, setManualOverride] = useState(false);
  const [error, setError] = useState("");

  const blocked = eligibility != null && !eligibility.canCancel;
  const overrideForbidden =
    eligibility?.code === "TECHSMART_WINDOW" ||
    eligibility?.code === "TECHSMART_SENT" ||
    // Enviado / entregado / listo para recoger: no override ni reembolso automático.
    eligibility?.code === "SHIPMENT_STATUS" ||
    eligibility?.code === "DICOTECH_PROCESSING";
  const needsOverride = blocked && canOverride && !overrideForbidden;

  const handleSubmit = () => {
    if (!reason.trim()) {
      setError("El motivo de la cancelación es obligatorio.");
      return;
    }

    if (blocked && !manualOverride) {
      setError(
        eligibility?.reason ||
          "Esta orden no puede cancelarse con las reglas normales.",
      );
      return;
    }

    onConfirm({
      cancelReason: reason.trim(),
      manualOverride: blocked ? manualOverride : false,
    });
  };

  return (
    <div className="order-cancel-modal">
      <p className="order-cancel-modal__intro">
        Vas a cancelar la orden{" "}
        <strong className="order-cancel-modal__order-id">#{idOrder}</strong>.
        Se intentará reembolso si el pago ya fue capturado.
      </p>

      {eligibility?.reason && blocked && !manualOverride ? (
        <div className="order-cancel-modal__alert" role="status">
          {eligibility.reason}
        </div>
      ) : null}

      {needsOverride ? (
        <label className="order-cancel-modal__override">
          <input
            type="checkbox"
            className="order-cancel-modal__override-input"
            checked={manualOverride}
            onChange={(e) => {
              setManualOverride(e.target.checked);
              if (e.target.checked) setError("");
            }}
          />
          <span className="order-cancel-modal__override-text">
            <strong>Override manual</strong> — solo para casos operativos
            excepcionales. No aplica si el envío ya fue enviado/entregado, si
            hay licencia digital entregada, Dicotech en surtido, plazo TechSmart
            vencido o TechSmart ya recibió el pedido.
          </span>
        </label>
      ) : null}

      <div className="order-cancel-modal__field">
        <label
          className="order-cancel-modal__label"
          htmlFor={`cancel-reason-${idOrder}`}
        >
          Motivo de la cancelación *
        </label>
        <textarea
          id={`cancel-reason-${idOrder}`}
          className={`order-cancel-modal__textarea${
            error ? " order-cancel-modal__textarea--error" : ""
          }`}
          placeholder="Describe por qué se cancela esta orden..."
          rows={4}
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            if (e.target.value.trim()) setError("");
          }}
        />
        {error ? (
          <span className="order-cancel-modal__error" role="alert">
            {error}
          </span>
        ) : null}
      </div>

      <div className="order-cancel-modal__actions">
        <button
          type="button"
          className="admin-btn admin-btn--secondary order-cancel-modal__btn"
          onClick={onCancel}
        >
          Cerrar
        </button>
        <button
          type="button"
          className="admin-btn admin-btn--primary order-cancel-modal__btn order-cancel-modal__btn--confirm"
          disabled={blocked && (!canOverride || overrideForbidden)}
          onClick={handleSubmit}
        >
          Confirmar cancelación
        </button>
      </div>
    </div>
  );
}
