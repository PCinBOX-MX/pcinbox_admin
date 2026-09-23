"use client";

import { useEffect, useState } from "react";
import { LinkPagosI } from "../interfaces/linkPagos/linkPagos.interface";
import { ProductsI } from "../interfaces/products/products.interface";
import { useTheContext } from "../hooks/global.hook";
import {
  applyCronStockUpdate,
  normalizeCronStockPayload,
} from "../utils/cronStockLiveSync";

const useLinkPagos = () => {
  const { setDataModal, setShowSpinner, socketCron, socketCronReady } =
    useTheContext();

  const [dataLinkPago, setDataLinkPago] = useState<LinkPagosI>({
    chargeId: "",
    customerId: "",
    description: "",
    email: "",
    lastname: "",
    linkPago: "",
    monto: 0,
    name: "",
    products: [],
    referencia: "",
    phone: "",
    status: "payment_pending",
  });

  const [selectedProduct, setSelectedProduct] = useState<ProductsI | null>(
    null
  );

  const [quantity, setQuantity] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const cronSocket = socketCron?.current;
    if (!cronSocket || !socketCronReady) return;

    const onCronUpdate = (payload: unknown) => {
      const updates = normalizeCronStockPayload(payload);
      if (!updates.length) return;

      setSelectedProduct((prev) => {
        if (!prev) return prev;
        const update = updates.find(
          (u) => Number(u.idProduct) === Number(prev.idProduct),
        );
        return update ? applyCronStockUpdate(prev, update) : prev;
      });

      setDataLinkPago((prev) => {
        if (!prev.products?.length) return prev;
        let changed = false;
        const products = prev.products.map((p: any) => {
          const update = updates.find(
            (u) => Number(u.idProduct) === Number(p.idProduct),
          );
          if (!update) return p;
          changed = true;
          const next = applyCronStockUpdate(p as ProductsI, update);
          return {
            ...next,
            quantity: p.quantity,
          };
        });
        return changed ? { ...prev, products } : prev;
      });
    };

    cronSocket.on("updatedStockCron", onCronUpdate);
    return () => {
      cronSocket.off("updatedStockCron", onCronUpdate);
    };
  }, [socketCron, socketCronReady]);

  const handleGeneratePDF = async () => {
    try {
      if (
        !dataLinkPago?.name ||
        !dataLinkPago?.email ||
        !dataLinkPago?.phone ||
        dataLinkPago?.products?.length == 0
      ) {
        setDataModal({
          isOpen: true,
          content: "Completa los campos obligatorios",
          showActions: true,
          title: "Error",
          type: "error",
          onConfirm: () => {
            setDataModal((prev) => ({ ...prev, isOpen: false }));
          },
          onClose: () => {
            setDataModal((prev) => ({ ...prev, isOpen: false }));
          },
        });
        return;
      }
      setLoading(true);
      setShowSpinner(true);
      const resp = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL_PAGOS}/openpay/linkPayOnline`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: dataLinkPago?.name,
            lastname: dataLinkPago?.lastname ?? "",
            email: dataLinkPago?.email,
            phone: dataLinkPago?.phone,
            monto: Number(
              dataLinkPago?.products
                ? dataLinkPago?.products.reduce(
                    (sum: number, product: any) =>
                      sum + product.price * product.quantity,
                    0
                  )
                : 0
            ),

            products: dataLinkPago?.products,
          }),
        }
      );
      setLoading(false);
      setShowSpinner(false);

      if (resp.ok) {
        const data = await resp.json();
        const url = data.checkoutLink || data.link;
        if (url) window.open(url, "_blank");
        setDataLinkPago({
          chargeId: "",
          customerId: "",
          description: "",
          email: "",
          lastname: "",
          linkPago: "",
          monto: 0,
          name: "",
          products: [],
          referencia: "",
          phone: "",
          status: "payment_pending",
        });
        setDataModal({
          isOpen: true,
          content: url
            ? `Link generado correctamente.${data.referencia ? ` Ref: ${data.referencia}` : ""}`
            : "Link generado, pero no se recibió URL. Revisa la pasarela.",
          showActions: true,
          title: "Listo",
          type: "success",
          onConfirm: () => {
            setDataModal((prev) => ({ ...prev, isOpen: false }));
          },
          onClose: () => {
            setDataModal((prev) => ({ ...prev, isOpen: false }));
          },
        });
      } else {
        let message = "No se pudo generar el link de pago. Intenta de nuevo.";
        try {
          const errBody = await resp.json();
          if (errBody?.message) message = errBody.message;
        } catch {
          /* ignore */
        }
        setDataModal({
          isOpen: true,
          content: message,
          showActions: true,
          title: "Error",
          type: "error",
          onConfirm: () => {
            setDataModal((prev) => ({ ...prev, isOpen: false }));
          },
          onClose: () => {
            setDataModal((prev) => ({ ...prev, isOpen: false }));
          },
        });
      }
    } catch (error) {
      setLoading(false);
      setShowSpinner(false);
      setDataModal({
        isOpen: true,
        content: "Error interno del servidor",
        showActions: true,
        title: "Error",
        type: "error",
        onConfirm: () => {
          setDataModal((prev) => ({ ...prev, isOpen: false }));
        },
        onClose: () => {
          setDataModal((prev) => ({ ...prev, isOpen: false }));
        },
      });
    }
  };

  const handleSelectedProduct = (idProduct: number) => {
    setSelectedProduct((prev) => (prev ? { ...prev, idProduct } : prev));
  };

  return {
    quantity,
    dataLinkPago,
    selectedProduct,
    loading,
    setLoading,
    setQuantity,
    setSelectedProduct,
    setDataLinkPago,
    handleGeneratePDF,
    handleSelectedProduct,
  };
};

export default useLinkPagos;
