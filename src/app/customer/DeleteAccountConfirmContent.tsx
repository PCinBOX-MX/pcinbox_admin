"use client";

import { Mail, Phone, ShieldAlert, UserX } from "lucide-react";

type Props = {
  name: string;
  email?: string;
  phone?: string;
  idUser: number | string;
};

export default function DeleteAccountConfirmContent({
  name,
  email,
  phone,
  idUser,
}: Props) {
  return (
    <div className="admin-cancel-modal admin-cancel-modal--dialog">
      <div className="admin-cancel-modal__banner">
        <div className="admin-cancel-modal__banner-icon">
          <UserX size={22} strokeWidth={2.25} />
        </div>
        <div>
          <p className="admin-cancel-modal__eyebrow">Acción permanente</p>
          <h3 className="admin-cancel-modal__heading">
            Eliminar cuenta de {name}
          </h3>
        </div>
      </div>

      <div className="admin-cancel-modal__order-pill">Usuario #{idUser}</div>

      <div className="admin-cancel-modal__impact">
        {email ? (
          <div className="admin-cancel-modal__impact-item">
            <Mail size={16} />
            <span>{email}</span>
          </div>
        ) : null}
        {phone ? (
          <div className="admin-cancel-modal__impact-item">
            <Phone size={16} />
            <span>{phone}</span>
          </div>
        ) : null}
        <div className="admin-cancel-modal__impact-item">
          <ShieldAlert size={16} />
          <span>
            La cuenta dejará de poder iniciar sesión. El registro se conserva
            (estado <strong>inactivo</strong>).
          </span>
        </div>
      </div>

      <p style={{ margin: 0, color: "#64748b", fontSize: "0.875rem", lineHeight: 1.55 }}>
        ¿Confirmas eliminar de forma permanente el acceso de{" "}
        <strong style={{ color: "#0f172a" }}>{name}</strong>? Esta acción no se
        puede deshacer desde el listado.
      </p>
    </div>
  );
}
