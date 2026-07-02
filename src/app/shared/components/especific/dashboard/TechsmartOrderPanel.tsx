"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from "@mui/material";
import useTechsmartOrder from "@/app/hooks/useTechsmartOrder";
import panelStyles from "./techsmart-panel.module.css";
import {
  TechsmartGuideI,
  TechsmartOrderI,
} from "@/app/interfaces/techsmart/techsmart.interface";
import { formatTechsmartErrorMessage } from "@/app/utils/techsmartErrorMessage";

interface TechsmartOrderPanelProps {
  idOrder: number;
  initialOrder?: TechsmartOrderI | null;
  statusPay?: string;
  onOrderUpdated?: (order: TechsmartOrderI | null) => void;
}

type PreviewData = {
  idOrder: number;
  idProducts?: number[];
  pedido?: {
    cveSucursal?: string;
    cveDireccionEnvio?: string;
    numOrdenCompra?: string;
    productos?: Array<{
      cveProducto?: string;
      cantidad?: number | string;
      descripcion?: string;
    }>;
  };
  xmlPedido?: string;
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  sent: "Pedido enviado",
  guide_linked: "Guías vinculadas",
  invoiced: "Facturado",
  failed: "Error al enviar",
  error: "Error",
};

const GUIDE_STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  linked: "Vinculada",
  failed: "Error",
};

const CARRIER_OPTIONS = ["Estafeta", "Paquete Express"];

function getActiveStep(status: string): number {
  if (status === "invoiced") return 3;
  if (status === "guide_linked") return 2;
  if (status === "sent") return 1;
  return 0;
}

const TechsmartOrderPanel = ({
  idOrder,
  initialOrder,
  statusPay,
  onOrderUpdated,
}: TechsmartOrderPanelProps) => {
  const {
    loadingAction,
    getOrderStatus,
    saveNumOrdenCompra,
    previewOrder,
    generateOrder,
    linkGuideUnit,
    invoiceOrder,
  } = useTechsmartOrder();

  const [techsmartOrder, setTechsmartOrder] = useState<TechsmartOrderI | null>(
    initialOrder ?? null,
  );
  const [numOrdenCompraInput, setNumOrdenCompraInput] = useState(
    initialOrder?.numOrdenCompra ?? "",
  );
  const [hasNumOrdenCompra, setHasNumOrdenCompra] = useState(
    Boolean(initialOrder?.numOrdenCompra?.trim()),
  );
  const [guides, setGuides] = useState<TechsmartGuideI[]>([]);
  const [guidesSummary, setGuidesSummary] = useState({
    total: 0,
    linked: 0,
    pending: 0,
  });
  const [requiresGuides, setRequiresGuides] = useState(false);
  const [canInvoice, setCanInvoice] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [guideForms, setGuideForms] = useState<
    Record<
      number,
      {
        guiaPedido: string;
        nombrePaqueteria: string;
        pdfFile: File | null;
      }
    >
  >({});

  const refreshStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const data = await getOrderStatus(idOrder);
      const nextOrder = (data?.techsmartOrder ?? null) as TechsmartOrderI | null;
      setTechsmartOrder(nextOrder);
      setGuides(data?.guides ?? []);
      setGuidesSummary(
        data?.guidesSummary ?? { total: 0, linked: 0, pending: 0 },
      );
      setRequiresGuides(Boolean(data?.requiresGuides));
      setCanInvoice(Boolean(data?.canInvoice));
      setHasNumOrdenCompra(Boolean(data?.hasNumOrdenCompra));
      setNumOrdenCompraInput(
        data?.numOrdenCompra ?? nextOrder?.numOrdenCompra ?? "",
      );
      onOrderUpdated?.(nextOrder);
    } finally {
      setLoadingStatus(false);
    }
  }, [getOrderStatus, idOrder, onOrderUpdated]);

  useEffect(() => {
    refreshStatus();
  }, [idOrder, refreshStatus]);

  const isPaid = ["paid", "approved"].includes(
    String(statusPay || "").toLowerCase(),
  );
  const status = String(techsmartOrder?.status || "pending");
  const isBusy = Boolean(loadingAction) || loadingStatus;
  const activeStep = useMemo(() => getActiveStep(status), [status]);
  const referenceLocked = Boolean(techsmartOrder?.folioPedido);
  const referenceValue = numOrdenCompraInput.trim();
  const canStartOrder =
    isPaid &&
    Boolean(referenceValue) &&
    !referenceLocked &&
    !["sent", "guide_linked", "invoiced"].includes(status);

  const handleOpenPreview = async () => {
    if (!referenceValue) return;

    if (!hasNumOrdenCompra || referenceValue !== (techsmartOrder?.numOrdenCompra ?? "")) {
      const saved = await saveNumOrdenCompra(idOrder, referenceValue, {
        silent: true,
      });
      if (!saved) return;
      setTechsmartOrder(saved);
      setHasNumOrdenCompra(true);
    }

    const preview = (await previewOrder(idOrder, referenceValue)) as PreviewData | null;
    if (!preview) return;
    setPreviewData(preview);
    setPreviewOpen(true);
  };

  const handleConfirmGenerate = async () => {
    setPreviewOpen(false);
    const value = numOrdenCompraInput.trim();
    const updated = await generateOrder(idOrder, value);
    if (updated) {
      setTechsmartOrder(updated);
      onOrderUpdated?.(updated);
    }
    await refreshStatus();
  };

  const handleInvoice = async () => {
    const updated = await invoiceOrder(idOrder);
    if (updated) {
      setTechsmartOrder(updated);
      onOrderUpdated?.(updated);
    } else {
      await refreshStatus();
    }
  };

  const updateGuideForm = (
    guideId: number,
    patch: Partial<(typeof guideForms)[number]>,
  ) => {
    setGuideForms((prev) => ({
      ...prev,
      [guideId]: {
        guiaPedido: prev[guideId]?.guiaPedido ?? "",
        nombrePaqueteria: prev[guideId]?.nombrePaqueteria ?? CARRIER_OPTIONS[0],
        pdfFile: prev[guideId]?.pdfFile ?? null,
        ...patch,
      },
    }));
  };

  const handleLinkGuideUnit = async (guide: TechsmartGuideI) => {
    const form = guideForms[guide.idTechsmartGuide] ?? {
      guiaPedido: guide.guiaPedido ?? "",
      nombrePaqueteria: guide.nombrePaqueteria ?? CARRIER_OPTIONS[0],
      pdfFile: null,
    };

    const result = await linkGuideUnit({
      idTechsmartGuide: guide.idTechsmartGuide,
      guiaPedido: form.guiaPedido,
      nombrePaqueteria: form.nombrePaqueteria,
      pdfFile: form.pdfFile,
    });

    if (result) {
      setTechsmartOrder(result.techsmartOrder);
      setGuides(result.guides);
      setGuidesSummary(result.guidesSummary);
      onOrderUpdated?.(result.techsmartOrder);
    } else {
      await refreshStatus();
    }
  };

  const previewProducts = previewData?.pedido?.productos ?? [];

  return (
    <div className={panelStyles.panel}>
      <div className={panelStyles.header}>
        <div className={panelStyles.headerLeft}>
          <span className={panelStyles.title}>TechSmart</span>
          <Chip
            size="small"
            label={STATUS_LABELS[status] || status}
            color={
              status === "invoiced"
                ? "success"
                : status === "failed" || status === "error"
                  ? "error"
                  : "primary"
            }
          />
        </div>
        <Button
          size="small"
          className={panelStyles.refreshBtn}
          disabled={isBusy}
          onClick={refreshStatus}
        >
          Actualizar
        </Button>
      </div>

      <Stepper
        activeStep={activeStep}
        alternativeLabel
        className={panelStyles.stepper}
        sx={{ pt: 0.5, pb: 0.25 }}
      >
        <Step completed={activeStep > 0}>
          <StepLabel>Generar pedido</StepLabel>
        </Step>
        <Step completed={activeStep > 1}>
          <StepLabel>Vincular guías</StepLabel>
        </Step>
        <Step completed={activeStep > 2}>
          <StepLabel>Facturar</StepLabel>
        </Step>
      </Stepper>

      {!isPaid && (
        <Alert severity="warning" sx={{ py: 0.5, borderRadius: "12px" }}>
          El pago debe estar confirmado antes de procesar en TechSmart.
        </Alert>
      )}

      {isPaid && status === "pending" && !referenceLocked && (
        <Alert severity="info" sx={{ py: 0.5, borderRadius: "12px" }}>
          Captura la referencia, genera el pedido y luego vincula las guías de
          envío.
        </Alert>
      )}

      {!referenceLocked && (
        <section className={panelStyles.referenceBlock}>
          <p className={panelStyles.referenceBlockTitle}>Paso 1 · Pedido</p>
          <TextField
            size="small"
            label="Referencia"
            placeholder="Ej. 12345"
            value={numOrdenCompraInput}
            onChange={(event) => setNumOrdenCompraInput(event.target.value)}
            disabled={referenceLocked || isBusy}
            fullWidth
            required
            sx={{
              "& .MuiOutlinedInput-root": { borderRadius: "12px" },
            }}
          />
          <Button
            variant="contained"
            className={panelStyles.generateBtn}
            disabled={isBusy || !canStartOrder}
            onClick={handleOpenPreview}
          >
            {loadingAction === "preview" || loadingAction === "saveReference" ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              "Generar pedido"
            )}
          </Button>
        </section>
      )}

      {(techsmartOrder?.numOrdenCompra ||
        techsmartOrder?.folioPedido ||
        guidesSummary.total > 0 ||
        techsmartOrder?.folioFactura) && (
        <div className={panelStyles.metaGrid}>
          {techsmartOrder?.numOrdenCompra ? (
            <span className={panelStyles.metaPill}>
              <strong>Ref.</strong> {techsmartOrder.numOrdenCompra}
            </span>
          ) : null}
          {techsmartOrder?.folioPedido ? (
            <span className={panelStyles.metaPill}>
              <strong>Folio</strong> {techsmartOrder.folioPedido}
            </span>
          ) : null}
          {guidesSummary.total > 0 ? (
            <span className={panelStyles.metaPill}>
              <strong>Guías</strong> {guidesSummary.linked}/{guidesSummary.total}
            </span>
          ) : null}
          {techsmartOrder?.folioFactura ? (
            <span className={panelStyles.metaPill}>
              <strong>Factura</strong> {techsmartOrder.folioFactura}
            </span>
          ) : null}
        </div>
      )}

      {status === "failed" && (
        <Alert severity="warning" sx={{ py: 0.5, borderRadius: "12px" }}>
          El último intento falló. Corrige el problema y vuelve a pulsar
          &quot;Generar pedido&quot;.
        </Alert>
      )}

      {techsmartOrder?.wsError && (
        <Alert severity="error" sx={{ py: 0.5, borderRadius: "12px" }}>
          {formatTechsmartErrorMessage(techsmartOrder.wsError)}
        </Alert>
      )}

      {canInvoice && status !== "invoiced" && (
        <Button
          variant="contained"
          className={panelStyles.invoiceBtn}
          fullWidth
          disabled={isBusy || !isPaid}
          onClick={handleInvoice}
        >
          {loadingAction === "invoice" ? (
            <CircularProgress size={18} color="inherit" />
          ) : (
            "Facturar"
          )}
        </Button>
      )}

      {requiresGuides && guides.length > 0 && (
        <Stack spacing={1.25} className={panelStyles.guidesSection}>
          <p className={panelStyles.guidesSectionTitle}>Paso 2 · Guías</p>
          {guides.map((guide) => {
            const form = guideForms[guide.idTechsmartGuide] ?? {
              guiaPedido: guide.guiaPedido ?? "",
              nombrePaqueteria: guide.nombrePaqueteria ?? CARRIER_OPTIONS[0],
              pdfFile: null,
            };
            const isLinked = guide.status === "linked";

            return (
              <div
                key={guide.idTechsmartGuide}
                className={panelStyles.guideCard}
              >
                <div className={panelStyles.guideHeader}>
                  <div>
                    <p className={panelStyles.guideTitle}>
                      {guide.productName}
                      {guide.requiresOwnGuide
                        ? ` · Unidad ${guide.unitIndex}`
                        : ""}
                    </p>
                    <p className={panelStyles.guideSubtitle}>
                      Guía interna: {guide.internalGuideNumber}
                    </p>
                  </div>
                  <Chip
                    size="small"
                    label={GUIDE_STATUS_LABELS[guide.status] || guide.status}
                    color={
                      isLinked
                        ? "success"
                        : guide.status === "failed"
                          ? "error"
                          : "default"
                    }
                  />
                </div>

                {guide.wsError && (
                  <Alert severity="error" sx={{ py: 0.5 }}>
                    {guide.wsError}
                  </Alert>
                )}

                {!isLinked && (
                  <Stack spacing={1.5}>
                    <TextField
                      size="small"
                      label="Número de guía (carrier)"
                      value={form.guiaPedido}
                      onChange={(event) =>
                        updateGuideForm(guide.idTechsmartGuide, {
                          guiaPedido: event.target.value,
                        })
                      }
                      fullWidth
                    />
                    <TextField
                      size="small"
                      select
                      label="Paquetería"
                      value={form.nombrePaqueteria}
                      onChange={(event) =>
                        updateGuideForm(guide.idTechsmartGuide, {
                          nombrePaqueteria: event.target.value,
                        })
                      }
                      fullWidth
                    >
                      {CARRIER_OPTIONS.map((carrier) => (
                        <MenuItem key={carrier} value={carrier}>
                          {carrier}
                        </MenuItem>
                      ))}
                    </TextField>
                    <Button component="label" size="small" variant="outlined">
                      {form.pdfFile ? form.pdfFile.name : "Subir PDF de guía (opcional)"}
                      <input
                        hidden
                        type="file"
                        accept="application/pdf"
                        onChange={(event) =>
                          updateGuideForm(guide.idTechsmartGuide, {
                            pdfFile: event.target.files?.[0] ?? null,
                          })
                        }
                      />
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      disabled={
                        isBusy ||
                        !isPaid ||
                        !hasNumOrdenCompra ||
                        !techsmartOrder?.folioPedido ||
                        !form.guiaPedido.trim()
                      }
                      onClick={() => handleLinkGuideUnit(guide)}
                    >
                      {loadingAction === `guide-${guide.idTechsmartGuide}` ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        "Vincular guía"
                      )}
                    </Button>
                  </Stack>
                )}

                {isLinked && (
                  <div className={panelStyles.linkedInfo}>
                    {techsmartOrder?.numOrdenCompra && (
                      <p>
                        <strong>Referencia:</strong>{" "}
                        {techsmartOrder.numOrdenCompra}
                      </p>
                    )}
                    <p>
                      <strong>Guía:</strong> {guide.guiaPedido}
                      {guide.nombrePaqueteria
                        ? ` (${guide.nombrePaqueteria})`
                        : ""}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </Stack>
      )}

      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirmar pedido TechSmart</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Orden <strong>{idOrder}</strong> — revisa el resumen antes de enviar
            al webservice.
          </Typography>

          {previewData?.pedido?.cveSucursal && (
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Sucursal:</strong> {previewData.pedido.cveSucursal}
            </Typography>
          )}

          {previewData?.pedido?.numOrdenCompra && (
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Referencia:</strong> {previewData.pedido.numOrdenCompra}
            </Typography>
          )}

          <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
            Productos ({previewProducts.length || previewData?.idProducts?.length || 0})
          </Typography>

          <Stack spacing={1}>
            {previewProducts.length > 0 ? (
              previewProducts.map((product, index) => (
                <Typography key={`${product.cveProducto}-${index}`} variant="body2">
                  • {product.descripcion || product.cveProducto} — cant.{" "}
                  {product.cantidad}
                </Typography>
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                {previewData?.idProducts?.length ?? 0} producto(s) TechSmart en la orden.
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleConfirmGenerate}
            disabled={loadingAction === "generate"}
          >
            {loadingAction === "generate" ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              "Confirmar y enviar"
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default TechsmartOrderPanel;
