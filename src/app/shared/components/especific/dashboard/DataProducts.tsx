"use client";

import { useState, useEffect, useMemo } from "react";
import ProveedoresUtils from "@/app/services/utils/proveedores.utils";
import {
  FormControl,
  MenuItem,
  Select,
  Chip,
  Skeleton,
  Divider,
} from "@mui/material";
import {
  getProviderLabel,
  PROVIDER_DICOTECH,
} from "@/app/constants/providers.constants";
import {
  ModalDetailField,
  ModalDetailGrid,
  ModalDetailSection,
} from "../modal/ModalDetail";
import {
  formatOrderMoney,
} from "@/app/utils/orderCostBreakdown";
import {
  MapPin,
  Package,
  ShieldCheck,
  Store,
  Truck,
} from "lucide-react";

type BranchOption = {
  idBranche: number;
  name: string;
  externalStoreId?: number | null;
};

let dicotechBranchesCache: BranchOption[] | null = null;

const SHIPPING_LABELS: Record<string, string> = {
  estafeta: "Estafeta",
  paqueteexpress: "Paquete Express",
  envioLeon: "Envío personalizado PCinBOX",
};

const DataProducts = ({ params, handleChangeStatusShip }: any) => {
  const { requestGetProveedores } = ProveedoresUtils();

  const [products, setProducts] = useState(params.value || []);
  const [dicotechBranches, setDicotechBranches] = useState<BranchOption[]>(
    dicotechBranchesCache ?? [],
  );
  const [branchesLoading, setBranchesLoading] = useState(!dicotechBranchesCache);

  useEffect(() => {
    setProducts(params.value || []);
  }, [params.value]);

  useEffect(() => {
    if (dicotechBranchesCache) {
      setDicotechBranches(dicotechBranchesCache);
      setBranchesLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const resp = await requestGetProveedores(
          `/getBranchesByProvider/${PROVIDER_DICOTECH}`,
          { silent: true },
        );
        if (!cancelled && resp?.data?.data) {
          dicotechBranchesCache = resp.data.data;
          setDicotechBranches(resp.data.data);
        }
      } catch {
        // Fallback silencioso
      } finally {
        if (!cancelled) setBranchesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const branchNameByStoreId = useMemo(() => {
    const map = new Map<number, string>();
    for (const branch of dicotechBranches) {
      if (branch.externalStoreId != null) {
        map.set(Number(branch.externalStoreId), branch.name);
      }
      map.set(Number(branch.idBranche), branch.name);
    }
    return map;
  }, [dicotechBranches]);

  const handleChange = (event: any, idShipment: number) => {
    const newProducts = products.map((p: any) =>
      p.idShipment === idShipment
        ? { ...p, statusShip: event.target.value }
        : p,
    );
    setProducts(newProducts);
    handleChangeStatusShip(event, idShipment, params.row.idUser);
  };

  if (!products?.length) {
    return (
      <p className="admin-modal-empty">No hay productos en esta orden.</p>
    );
  }

  return (
    <div className="admin-modal-products">
      {products.map((item: any, index: number) => {
        const providerLabel = getProviderLabel(item.providerId);
        const providerChipColor =
          Number(item.providerId) === PROVIDER_DICOTECH
            ? "warning"
            : Number(item.providerId) === 2
              ? "info"
              : "default";

        const hasStreetAddress = item.address?.street != null;
        const branchName =
          item.address?.branche ||
          branchNameByStoreId.get(Number(item.address?.storeId)) ||
          (branchesLoading ? null : "PCinBOX-LEON");

        const shippingLabel =
          SHIPPING_LABELS[item.address?.shipping_method] ??
          (item.address?.shipping_method ? "Desconocido" : null);

        const showDescription =
          item.description &&
          item.description.trim() !== String(item.productName || "").trim();

        return (
          <article key={item.idShipment ?? index} className="admin-product-card">
            <header className="admin-product-card__header">
              <div className="admin-product-card__title-wrap">
                <span className="admin-product-card__index">
                  Producto {index + 1}
                </span>
                <h3 className="admin-product-card__name">
                  {item.productName}
                </h3>
                {showDescription ? (
                  <p className="admin-product-card__description">
                    {item.description}
                  </p>
                ) : null}
              </div>
              <div className="admin-product-card__badges">
                <Chip
                  size="small"
                  label={providerLabel}
                  color={providerChipColor}
                  variant="outlined"
                />
                <span className="admin-product-card__qty">
                  × {item.quantity}
                </span>
              </div>
            </header>

            <ModalDetailGrid columns={3}>
              {item.sku ? (
                <ModalDetailField label="SKU" value={item.sku} />
              ) : null}
              {item.upc ? (
                <ModalDetailField label="UPC" value={item.upc} />
              ) : null}
              {item.clave ? (
                <ModalDetailField label="Clave" value={item.clave} />
              ) : null}
            </ModalDetailGrid>

            <Divider sx={{ my: 1.5, borderColor: "#eef0f4" }} />

            <ModalDetailSection
              title="Entrega y envío"
              icon={<Package size={16} />}
              variant="accent"
            >
              <ModalDetailField
                label="Tipo de entrega"
                value={
                  hasStreetAddress
                    ? "Domicilio"
                    : branchName
                      ? `Sucursal — ${branchName}`
                      : "Sucursal"
                }
                fullWidth
              />

              {hasStreetAddress ? (
                <div className="admin-product-card__address">
                  <MapPin size={15} className="admin-product-card__address-icon" />
                  <div className="admin-product-card__address-lines">
                    <span>
                      {item.address.street} #{item.address.noExt}
                      {item.address.noInt ? ` Int. ${item.address.noInt}` : ""}
                    </span>
                    <span>
                      CP {item.address.cp} · {item.address.cologne}
                    </span>
                    <span>
                      {item.address.city}, {item.address.state},{" "}
                      {item.address.country}
                    </span>
                  </div>
                </div>
              ) : null}

              <ModalDetailGrid columns={2}>
                {Number(item.address?.shippingCost ?? 0) > 0 ? (
                  <ModalDetailField
                    label="Costo de envío"
                    value={formatOrderMoney(Number(item.address.shippingCost))}
                  />
                ) : null}
                {Number(item.address?.insuranceCost ?? 0) > 0 ? (
                  <ModalDetailField
                    label="Costo de seguro"
                    value={formatOrderMoney(Number(item.address.insuranceCost))}
                  />
                ) : null}
              </ModalDetailGrid>

              <div className="admin-product-card__tags">
                {item.address?.requireInsurance === 1 ? (
                  <span className="admin-product-card__tag admin-product-card__tag--success">
                    <ShieldCheck size={14} />
                    Seguro requerido
                  </span>
                ) : null}

                {branchName ? (
                  <span className="admin-product-card__tag">
                    <Store size={14} />
                    {branchesLoading && !item.address?.branche ? (
                      <Skeleton width={80} height={16} />
                    ) : (
                      `Sucursal ${branchName}`
                    )}
                  </span>
                ) : null}

                {shippingLabel ? (
                  <span className="admin-product-card__tag">
                    <Truck size={14} />
                    {shippingLabel}
                  </span>
                ) : null}

                {item.address?.trackingNumber ? (
                  <span className="admin-product-card__tag admin-product-card__tag--guide">
                    Guía {item.address.trackingNumber}
                  </span>
                ) : null}
              </div>

              <div className="admin-product-card__status">
                <label htmlFor={`ship-status-${item.idShipment}`}>
                  Estado de envío
                </label>
                <FormControl fullWidth size="small">
                  <Select
                    id={`ship-status-${item.idShipment}`}
                    value={item.statusShip ?? "procesando"}
                    onChange={(e) => handleChange(e, item.idShipment)}
                    sx={{
                      borderRadius: "12px",
                      bgcolor: "#fff",
                      fontWeight: 600,
                    }}
                  >
                    <MenuItem value="procesando">Procesando</MenuItem>
                    <MenuItem value="disponible">Disponible</MenuItem>
                    <MenuItem value="enviado">Enviado</MenuItem>
                    <MenuItem value="entregado">Entregado</MenuItem>
                    <MenuItem value="cancelado">Cancelado</MenuItem>
                  </Select>
                </FormControl>
              </div>
            </ModalDetailSection>
          </article>
        );
      })}
    </div>
  );
};

export default DataProducts;
