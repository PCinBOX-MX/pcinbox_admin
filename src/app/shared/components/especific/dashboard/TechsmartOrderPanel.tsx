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
  const [canGeneratePedido, setCanGeneratePedido] = useState(false);
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
      setCanGeneratePedido(Boolean(data?.canGeneratePedido));
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

  const handleSaveReference = async () => {
    const value = numOrdenCompraInput.trim();
    if (!value) return;

    const updated = await saveNumOrdenCompra(idOrder, value);
    if (updated) {
      setTechsmartOrder(updated);
      setHasNumOrdenCompra(true);
      setCanGeneratePedido(true);
      onOrderUpdated?.(updated);
    }
    await refreshStatus();
  };

  const handleOpenPreview = async () => {
    const value = numOrdenCompraInput.trim();
    if (!value) return;

    if (!hasNumOrdenCompra || value !== (techsmartOrder?.numOrdenCompra ?? "")) {
      const saved = await saveNumOrdenCompra(idOrder, value);
      if (!saved) return;
      setTechsmartOrder(saved);
      setHasNumOrdenCompra(true);
    }

    const preview = (await previewOrder(idOrder, value)) as PreviewData | null;
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

      <Stepper activeStep={activeStep} alternativeLabel sx={{ pt: 1 }}>
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
        <Alert severity="warning" sx={{ py: 0.5 }}>
          El pago debe estar confirmado antes de procesar en TechSmart.
        </Alert>
      )}

      {isPaid && status === "pending" && (
        <Alert severity="info" sx={{ py: 0.5 }}>
          Captura la referencia TechSmart (NumOrdenCompra), genera el pedido,
          vincula cada guía de carrier y luego factura.
        </Alert>
      )}

      <Stack spacing={1.5}>
        <TextField
          size="small"
          label="Referencia TechSmart (NumOrdenCompra)"
          helperText="Obligatoria antes de generar el pedido o vincular guías"
          value={numOrdenCompraInput}
          onChange={(event) => setNumOrdenCompraInput(event.target.value)}
          disabled={referenceLocked || isBusy}
          fullWidth
          required
        />
        {!referenceLocked && (
          <Button
            size="small"
            variant="outlined"
            disabled={isBusy || !numOrdenCompraInput.trim()}
            onClick={handleSaveReference}
          >
            {loadingAction === "saveReference" ? (
              <CircularProgress size={16} />
            ) : (
              "Guardar referencia"
            )}
          </Button>
        )}
      </Stack>

      {techsmartOrder?.numOrdenCompra && (
        <p className={panelStyles.meta}>
          <strong>NumOrdenCompra:</strong> {techsmartOrder.numOrdenCompra}
        </p>
      )}

      {techsmartOrder?.folioPedido && (
        <p className={panelStyles.meta}>
          <strong>Folio:</strong> {techsmartOrder.folioPedido}
        </p>
      )}

      {guidesSummary.total > 0 && (
        <p className={panelStyles.meta}>
          <strong>Guías:</strong> {guidesSummary.linked}/{guidesSummary.total}{" "}
          vinculadas
        </p>
      )}

      {techsmartOrder?.folioFactura && (
        <p className={panelStyles.meta}>
          <strong>Factura:</strong> {techsmartOrder.folioFactura}
        </p>
      )}

      {status === "failed" && (
        <Alert severity="warning" sx={{ py: 0.5 }}>
          El último intento falló. Corrige el problema indicado abajo y vuelve a
          pulsar &quot;Generar pedido&quot;.
        </Alert>
      )}

      {techsmartOrder?.wsError && (
        <Alert severity="error" sx={{ py: 0.5 }}>
          {techsmartOrder.wsError}
        </Alert>
      )}

      <Stack direction="row" flexWrap="wrap" gap={1}>
        <Button
          size="small"
          variant="outlined"
          disabled={
            isBusy ||
            !isPaid ||
            !canGeneratePedido ||
            !numOrdenCompraInput.trim() ||
            ["sent", "guide_linked", "invoiced"].includes(status)
          }
          onClick={handleOpenPreview}
        >
          {loadingAction === "preview" ? (
            <CircularProgress size={16} />
          ) : (
            "Generar pedido"
          )}
        </Button>
        <Button
          size="small"
          variant="contained"
          disabled={isBusy || !isPaid || !canInvoice || status === "invoiced"}
          onClick={handleInvoice}
        >
          {loadingAction === "invoice" ? (
            <CircularProgress size={16} color="inherit" />
          ) : (
            "Facturar"
          )}
        </Button>
        <Button size="small" disabled={isBusy} onClick={refreshStatus}>
          Actualizar
        </Button>
      </Stack>

      {requiresGuides && guides.length > 0 && (
        <Stack spacing={2} className={panelStyles.guidesSection}>
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
              <strong>NumOrdenCompra:</strong> {previewData.pedido.numOrdenCompra}
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
