"use client";

import { useState, useCallback, useEffect } from "react";
import ProveedoresUtils from "../services/utils/proveedores.utils";
import { SelectChangeEvent } from "@mui/material";
import { ProductsI } from "../interfaces/products/products.interface";
import { useTheContext } from "../hooks/global.hook";
import { useQueryParams } from "../hooks/useQueryParams";
import RegisterFormProovedor from "../shared/components/especific/proveedores/register/RegisterFormProveedor";
import RegisterProduct from "../shared/components/especific/registerProduct/RegisterProduct";
import { productsMatchForMerge } from "../utils/productIdentity.utils";
import dynamic from "next/dynamic";
import { useRequestSequence } from "../hooks/useRequestSequence";

const BulkUploadProvider = dynamic(
  () =>
    import("../shared/components/especific/registerProduct/BulkUploadProvider"),
  { ssr: false },
);

const useProveedores = () => {
  const { setDataModal, setDataProveedores, setProductsProveedor } =
    useTheContext();
  const { requestGetProveedores, requestPostProveedores } = ProveedoresUtils();
  const { nextSequence, isCurrent } = useRequestSequence();

  const { searchParams, setQueryParams } = useQueryParams();
  const providerParam = searchParams.get("provider") || "";
  const [slcProveedor, setSlcProveedor] = useState<string>(providerParam);

  useEffect(() => {
    if (providerParam && providerParam !== slcProveedor) {
      setSlcProveedor(providerParam);
      setProductsProveedor((prev) => ({ ...prev, loading: true }));
    }
  }, [providerParam, slcProveedor, setProductsProveedor]);

  const [registerProveedores, setRegisterProveedores] = useState<{
    loading: boolean;
  }>({ loading: false });
  const [catalogError, setCatalogError] = useState("");
  const [providersError, setProvidersError] = useState("");

  const handleOnChange = (event: SelectChangeEvent) => {
    const newVal = event.target.value;
    setSlcProveedor(newVal);
    setProductsProveedor((prev) => ({ ...prev, loading: true }));
    setQueryParams({ provider: newVal, page: 1 });
  };

  const handleGetProveedores = useCallback(async () => {
    try {
      setProvidersError("");
      setDataProveedores((prev) => ({ ...prev, loading: true }));

      const resp = await requestGetProveedores("/getAllProveedores");
      setDataProveedores((prev) => ({ ...prev, loading: false }));

      if (resp?.status == 200) {
        const data = resp.data;
        setDataProveedores((prev) => ({ ...prev, data: data.data.data }));

        if (data.data.data?.length > 0 && !providerParam) {
          const firstId = String(data.data.data[0].idProvider);
          setSlcProveedor(firstId);
          setQueryParams({ provider: firstId });
        }
      } else {
        setProvidersError(
          "No pudimos cargar los proveedores. Intenta de nuevo.",
        );
      }
    } catch (error) {
      setDataProveedores((prev) => ({ ...prev, loading: false }));
      setProvidersError(
        "No pudimos cargar los proveedores. Revisa tu conexión e intenta de nuevo.",
      );
    }
  }, [requestGetProveedores, setDataProveedores, providerParam, setQueryParams]);

  const handleGetProductsByProveedor = useCallback(
    async (
      idProveedor: string | number,
      options: { page?: number; pageSize?: number; search?: string } = {},
    ) => {
      const page = options.page && options.page > 0 ? options.page : 1;
      const pageSize =
        options.pageSize && options.pageSize > 0 ? options.pageSize : 12;
      const search = options.search?.trim() ?? "";
      const sequence = nextSequence();

      try {
        setCatalogError("");
        setProductsProveedor((prev) => ({ ...prev, loading: true }));

        const resp = await requestPostProveedores(
          { idProveedor, page, pageSize, search },
          "/getProductsByProveedor",
        );
        if (!isCurrent(sequence)) return;
        setProductsProveedor((prev) => ({ ...prev, loading: false }));

        if (resp?.status == 200) {
          const payload = resp.data?.data ?? {};
          const rows = (payload.data ?? []) as ProductsI[];
          const updates = (payload.dataExist ?? []) as ProductsI[];

          // Compat: si el server aún manda dataExist, merge local.
          const merged = rows.map((item) => {
            const match = updates.find((u) => productsMatchForMerge(u, item));
            return match ? { ...item, ...match } : item;
          });
          const newOnes = updates.filter(
            (u) => !rows.some((o) => productsMatchForMerge(o, u)),
          );
          const catalog = [...merged, ...newOnes];
          const totalRows =
            Number(payload.pagination?.totalRows ?? payload.totalRows) ||
            catalog.length;

          setProductsProveedor((prev) => ({
            ...prev,
            data: catalog,
            copyData: catalog,
            totalRows,
          }));
        } else {
          setCatalogError(
            "No se pudo cargar el catálogo. Intenta de nuevo.",
          );
          setProductsProveedor((prev) => ({
            ...prev,
            data: [],
            copyData: [],
            totalRows: 0,
          }));
        }
      } catch {
        if (!isCurrent(sequence)) return;
        setCatalogError(
          "No se pudo cargar el catálogo. Revisa tu conexión e intenta de nuevo.",
        );
        setProductsProveedor((prev) => ({
          ...prev,
          loading: false,
          data: [],
          copyData: [],
          totalRows: 0,
        }));
      }
    },
    [requestPostProveedores, setProductsProveedor, nextSequence, isCurrent],
  );

  const showModalRegisterProveedor = async () => {
    setDataModal({
      isOpen: true,
      content: <RegisterFormProovedor />,
      title: "Registro de proveedor",
      type: "info",
      onConfirm: () => {
        setDataModal((prev) => ({ ...prev, isOpen: false }));
      },
      onClose: () => {
        setDataModal((prev) => ({ ...prev, isOpen: false }));
      },
      showActions: false,
    });
  };

  const handleRegisterProveedores = async (dataForm: Record<string, any>) => {
    try {
      setRegisterProveedores((prev) => ({ ...prev, loading: true }));

      const resp = await requestPostProveedores(
        {
          companyName: dataForm.companyName,
          address: dataForm.address,
          contactEmail: dataForm.contactEmail,
          phone: dataForm.phone,
        },
        "/registerProveedor",
      );

      if (resp?.status == 200) {
        const data = resp.data;

        setDataModal((prev) => ({ ...prev, isOpen: false }));
        setDataProveedores((prev1) => ({
          ...prev1,
          data: data.data.data,
        }));
        setRegisterProveedores((prev) => ({
          ...prev,
          loading: false,
        }));
        setDataModal({
          isOpen: true,
          type: "success",
          content:
            "Proveedor " + dataForm.companyName + " registrado correctamente.",
          title: "Correcto",
          showActions: true,
          onConfirm: () => {
            setDataModal((prev) => ({ ...prev, isOpen: false }));
          },
          onClose: () => {
            setDataModal((prev) => ({ ...prev, isOpen: false }));
          },
        });
        setSlcProveedor(
          data.data.data[data.data.data.length - 1].idProvider.toString(),
        );
      } else {
        setRegisterProveedores((prev) => ({ ...prev, loading: false }));
        setDataModal({
          isOpen: true,
          type: "error",
          title: "No se registró el proveedor",
          content:
            resp?.data?.message ||
            "No pudimos registrar el proveedor. Intenta de nuevo.",
          showActions: true,
          onConfirm: () => {
            setDataModal((prev) => ({ ...prev, isOpen: false }));
          },
          onClose: () => {
            setDataModal((prev) => ({ ...prev, isOpen: false }));
          },
        });
      }
    } catch (error) {
      setRegisterProveedores((prev) => ({ ...prev, loading: false }));
      setDataModal({
        isOpen: true,
        type: "error",
        title: "No se registró el proveedor",
        content:
          "Ocurrió un error al registrar el proveedor. Revisa tu conexión e intenta de nuevo.",
        showActions: true,
        onConfirm: () => {
          setDataModal((prev) => ({ ...prev, isOpen: false }));
        },
        onClose: () => {
          setDataModal((prev) => ({ ...prev, isOpen: false }));
        },
      });
    }
  };

  const handleAddProduct = () => {
    setDataModal({
      isOpen: true,
      content: <RegisterProduct />,
      title: "Agregar producto",
      type: "info",

      showActions: false,
      onClose: () => {
        setDataModal((prev) => ({ ...prev, isOpen: false }));
      },
      onConfirm: () => {
        setDataModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleBulkUpload = () => {
    setDataModal({
      isOpen: true,
      content: (
        <BulkUploadProvider
          defaultProviderId={Number(slcProveedor) || undefined}
        />
      ),
      title: "Alta Masiva por Excel",
      type: "info",
      maxWidth: "min(95vw, 1000px)",
      showActions: false,
      onClose: () => {
        setDataModal((prev) => ({ ...prev, isOpen: false }));
      },
      onConfirm: () => {
        setDataModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  return {
    slcProveedor,
    registerProveedores,
    catalogError,
    providersError,
    handleGetProductsByProveedor,
    handleGetProveedores,
    handleOnChange,
    showModalRegisterProveedor,
    handleRegisterProveedores,
    handleAddProduct,
    handleBulkUpload,
    setProductsProveedor,
  };
};

export default useProveedores;
