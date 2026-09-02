"use client";



import { useMemo, useState } from "react";

import {

  Alert,

  Box,

  Button,

  Chip,

  Collapse,

  Stack,

  TextField,

  Typography,

} from "@mui/material";

import { KeyRound, Lock, Mail, Send, ShieldCheck } from "lucide-react";

import UtilsService from "@/app/services/utils";

import {

  getPaymentStatusLabel,

  isOrderPaid,

} from "@/app/utils/paymentStatus.util";



type PanelFeedback = {

  type: "success" | "error" | "warning";

  message: string;

};



type SendLicenseKeyPanelProps = {

  idOrder: number;

  idSale: number;

  idShipment: number;

  productName: string;

  defaultEmail: string;

  customerName?: string;

  statusPay?: string | null;

  shipmentStatus?: string | null;

  /** Unidades compradas del producto (para exigir N claves). */

  quantity?: number | null;

  onSent?: (nextStatus: "entregado") => void;

};



const DEFAULT_INSTRUCTIONS =

  "Activa tu producto con la clave indicada. Si el fabricante requiere descarga, usa su portal oficial. Conserva este correo como comprobante de tu licencia PCinBOX.";



const SendLicenseKeyPanel = ({

  idOrder,

  idSale,

  idShipment,

  productName,

  defaultEmail,

  customerName,

  statusPay,

  shipmentStatus,

  quantity,

  onSent,

}: SendLicenseKeyPanelProps) => {

  const { requestPost } = UtilsService();

  const [open, setOpen] = useState(false);

  const [toEmail, setToEmail] = useState(defaultEmail || "");

  const [licenseKeysText, setLicenseKeysText] = useState("");

  const [instructions, setInstructions] = useState(DEFAULT_INSTRUCTIONS);

  const [loading, setLoading] = useState(false);

  const [feedback, setFeedback] = useState<PanelFeedback | null>(null);



  const paid = isOrderPaid(statusPay);

  const alreadySent =

    String(shipmentStatus || "").toLowerCase() === "entregado";

  const expectedKeys = Math.max(1, Number(quantity) || 1);



  const licenseKeys = useMemo(

    () =>

      licenseKeysText

        .split(/\r?\n/)

        .map((line) => line.trim())

        .filter(Boolean),

    [licenseKeysText],

  );



  const showFeedback = (next: PanelFeedback) => {

    setFeedback(next);

  };



  const handleSend = async () => {

    setFeedback(null);



    if (!paid) {

      showFeedback({

        type: "warning",

        message:

          "Solo puedes enviar la licencia cuando la orden esté marcada como Pagada.",

      });

      return;

    }



    if (!toEmail.trim()) {

      showFeedback({

        type: "warning",

        message: "Indica el correo del cliente.",

      });

      return;

    }



    if (!licenseKeys.length) {

      showFeedback({

        type: "warning",

        message: "Escribe al menos una clave de activación (una por línea).",

      });

      return;

    }



    if (licenseKeys.length < expectedKeys) {

      showFeedback({

        type: "warning",

        message: `El cliente compró ${expectedKeys} unidad(es). Debes ingresar ${expectedKeys} clave(s) (una por línea). Ahora hay ${licenseKeys.length}.`,

      });

      return;

    }



    try {

      setLoading(true);

      const resp = await requestPost(

        {

          idOrder,

          idSale,

          idShipment,

          toEmail: toEmail.trim(),

          customerName: customerName || "",

          productName,

          licenseKeys,

          instructions,

        },

        "/sales/admin/sendLicenseKey",

        { silent: true },

      );



      setLoading(false);



      if (resp.status === 200) {

        setLicenseKeysText("");

        onSent?.("entregado");

        showFeedback({

          type: "success",

          message:

            resp.data?.message ||

            `Licencia enviada a ${toEmail.trim()}. Esta línea quedó marcada como Entregada.`,

        });

      } else {

        showFeedback({

          type: "error",

          message:

            resp?.data?.message ||

            "No se pudo enviar la licencia. Intenta de nuevo.",

        });

      }

    } catch (error: any) {

      setLoading(false);

      showFeedback({

        type: "error",

        message:

          error?.response?.data?.message ||

          "Ocurrió un error al enviar el correo de la licencia.",

      });

    }

  };



  return (

    <Box

      sx={{

        mt: 1.5,

        borderRadius: "14px",

        border: "1px solid",

        borderColor: paid ? "rgba(187, 61, 75, 0.22)" : "#e5e7eb",

        background: paid

          ? "linear-gradient(165deg, #fffafb 0%, #ffffff 55%, #f8fafc 100%)"

          : "linear-gradient(165deg, #f9fafb 0%, #ffffff 100%)",

        overflow: "hidden",

      }}

    >

      {feedback ? (

        <Alert

          severity={feedback.type}

          onClose={() => setFeedback(null)}

          sx={{ borderRadius: 0, fontSize: "0.85rem" }}

        >

          {feedback.message}

        </Alert>

      ) : null}



      <Stack spacing={1.5} sx={{ px: 1.75, py: 1.5 }}>
        <Stack direction="row" spacing={1.25} alignItems="flex-start">
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: "12px",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
              bgcolor: paid ? "rgba(187, 61, 75, 0.1)" : "#f3f4f6",
              color: paid ? "#bb3d4b" : "#6b7280",
            }}
          >
            {paid ? <KeyRound size={18} /> : <Lock size={18} />}
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{ fontWeight: 700, fontSize: "0.95rem", color: "#111827" }}
            >
              Entrega de licencia digital
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: "#6b7280",
                mt: 0.35,
                lineHeight: 1.5,
                textAlign: "left",
              }}
            >
              El equipo PCinBOX envía la información de activación al cliente
              desde este panel, únicamente con la orden pagada.
            </Typography>
            <Stack
              direction="row"
              spacing={0.75}
              sx={{ mt: 0.85 }}
              flexWrap="wrap"
              useFlexGap
            >
              <Chip
                size="small"
                icon={paid ? <ShieldCheck size={14} /> : <Lock size={14} />}
                label={
                  paid
                    ? "Pago confirmado"
                    : `Pago: ${getPaymentStatusLabel(statusPay)}`
                }
                color={paid ? "success" : "warning"}
                variant={paid ? "filled" : "outlined"}
                sx={{ fontWeight: 700, height: 24 }}
              />
              {alreadySent ? (
                <Chip
                  size="small"
                  label="Entregado"
                  color="info"
                  variant="outlined"
                  sx={{ fontWeight: 700, height: 24 }}
                />
              ) : null}
            </Stack>
          </Box>
        </Stack>

        {!paid ? (
          <Alert
            severity="warning"
            sx={{
              borderRadius: "10px",
              alignItems: "center",
              "& .MuiAlert-message": { fontSize: "0.85rem", fontWeight: 600 },
            }}
          >
            Disponible cuando el pago esté confirmado.
          </Alert>
        ) : (
          <Button
            variant="contained"
            startIcon={<Mail size={16} />}
            onClick={() => setOpen((v) => !v)}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              borderRadius: "10px",
              px: 1.75,
              py: 0.85,
              bgcolor: "#bb3d4b",
              boxShadow: "none",
              alignSelf: { xs: "stretch", sm: "flex-start" },
              "& .MuiButton-startIcon": { marginRight: 0.75 },
              "&:hover": { bgcolor: "#992230", boxShadow: "none" },
            }}
          >
            {open
              ? "Ocultar formulario"
              : alreadySent
                ? "Reenviar licencia"
                : "Enviar licencia"}
          </Button>
        )}
      </Stack>



      <Collapse in={open && paid}>

        <Stack

          spacing={1.5}

          sx={{

            px: 1.75,

            pb: 1.75,

            pt: 0.25,

            borderTop: "1px solid rgba(187, 61, 75, 0.12)",

          }}

        >

          <Typography variant="caption" color="text.secondary">

            Orden #{idOrder} · {productName}

            {expectedKeys > 1 ? ` · ${expectedKeys} unidades` : ""}

          </Typography>



          <TextField

            label="Correo del cliente"

            value={toEmail}

            onChange={(e) => setToEmail(e.target.value)}

            fullWidth

            size="small"

            type="email"

            required

          />



          <TextField

            label="Clave(s) de activación"

            value={licenseKeysText}

            onChange={(e) => setLicenseKeysText(e.target.value)}

            fullWidth

            size="small"

            required

            multiline

            minRows={Math.min(Math.max(expectedKeys, 2), 6)}

            helperText={

              expectedKeys > 1

                ? `El cliente compró ${expectedKeys} unidades: ingresa ${expectedKeys} claves (una por línea). Llevas ${licenseKeys.length}.`

                : "Si hay más de una, una clave por línea."

            }

            placeholder={

              expectedKeys > 1

                ? "CLAVE-UNIDAD-1\nCLAVE-UNIDAD-2"

                : "XXXXX-XXXXX-XXXXX-XXXXX"

            }

            error={

              licenseKeys.length > 0 && licenseKeys.length < expectedKeys

            }

            InputProps={{

              sx: { fontFamily: "Consolas, Monaco, monospace" },

            }}

          />



          <TextField

            label="Instrucciones para el cliente (opcional)"

            value={instructions}

            onChange={(e) => setInstructions(e.target.value)}

            fullWidth

            size="small"

            multiline

            minRows={3}

          />



          <Alert

            severity="info"

            icon={<Mail size={18} />}

            sx={{ fontSize: "0.8rem", borderRadius: "10px" }}

          >

            Se enviará desde PCinBOX Admin: pedido #{idOrder}, producto,{" "}

            {licenseKeys.length || 0} clave(s)

            {expectedKeys > 1 ? ` (se esperan ${expectedKeys})` : ""} e

            instrucciones a <strong>{toEmail || "—"}</strong>.

          </Alert>



          <Stack direction="row" spacing={1}>

            <Button

              variant="contained"

              startIcon={<Send size={16} />}

              disabled={loading}

              onClick={handleSend}

              sx={{

                textTransform: "none",

                fontWeight: 700,

                borderRadius: "10px",

                bgcolor: "#bb3d4b",

                boxShadow: "none",

                "&:hover": { bgcolor: "#992230", boxShadow: "none" },

              }}

            >

              {loading ? "Enviando..." : "Confirmar y enviar"}

            </Button>

            <Button

              variant="outlined"

              disabled={loading}

              onClick={() => setOpen(false)}

              sx={{ textTransform: "none", borderRadius: "10px" }}

            >

              Cancelar

            </Button>

          </Stack>

        </Stack>

      </Collapse>

    </Box>

  );

};



export default SendLicenseKeyPanel;

