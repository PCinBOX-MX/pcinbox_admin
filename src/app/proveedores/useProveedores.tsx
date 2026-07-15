"use client";

import { useState, useCallback } from "react";
import ProveedoresUtils from "../services/utils/proveedores.utils";
import { SelectChangeEvent } from "@mui/material";
import { ProductsI } from "../interfaces/products/products.interface";
import { useTheContext } from "../hooks/global.hook";
import { useQueryParams } from "../hooks/useQueryParams";
import RegisterFormProovedor from "../shared/components/especific/proveedores/register/RegisterFormProveedor";
import dynamic from "next/dynamic";

const RegisterProduct = dynamic(
  () =>
    import("../shared/components/especific/registerProduct/RegisterProduct"),
  { ssr: false },
);

const useProveedores = () => {
  const { setDataModal, setDataProveedores, setProductsProveedor } =
    useTheContext();
  const { requestGetProveedores, requestPostProveedores } = ProveedoresUtils();

  const { searchParams, setQueryParams } = useQueryParams();
  const providerParam = searchParams.get("provider") || "";
  const [slcProveedor, setSlcProveedor] = useState<string>(providerParam);

  const [registerProveedores, setRegisterProveedores] = useState<{
    loading: boolean;
  }>({ loading: false });

  const handleOnChange = (event: SelectChangeEvent) => {
    const newVal = event.target.value;
    setSlcProveedor(newVal);
    setQueryParams({ provider: newVal, page: 1 });
  };

  const handleGetProveedores = useCallback(async () => {
    try {
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
      }
    } catch (error) {
      setDataProveedores((prev) => ({ ...prev, loading: false }));
    }
  }, [requestGetProveedores, setDataProveedores]);

  const handleGetProductsByProveedor = useCallback(
    async (idProveedor: string | number) => {
      try {
        setProductsProveedor((prev) => ({ ...prev, loading: true }));

        const resp = await requestPostProveedores(
          { idProveedor },
          "/getProductsByProveedor"
        );
        setProductsProveedor((prev) => ({ ...prev, loading: false }));

        if (resp?.status == 200) {
          const data = resp.data;

          setProductsProveedor((prev) => {
            const originals = data.data.data ?? [];
            const updates = data.data.dataExist ?? [];

            const merged = originals.map((item: ProductsI) => {
              const match = updates.find(
                (u: ProductsI) => Number(u.idProduct) === Number(item.idProduct),
              );
              return match ? { ...item, ...match } : item;
            });

            const newOnes = updates.filter(
              (u: ProductsI) =>
                !originals.some(
                  (o: ProductsI) =>
                    Number(o.idProduct) === Number(u.idProduct),
                ),
            );

            return {
              ...prev,
              data: [...merged, ...newOnes],
              copyData: [...merged, ...newOnes],
            };
          });
        }
      } catch (error) {
        setProductsProveedor((prev) => ({ ...prev, loading: false }));
      }
    },
    [requestPostProveedores, setProductsProveedor],
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
      }
    } catch (error) {
      setRegisterProveedores((prev) => ({ ...prev, loading: false }));
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

  return {
    slcProveedor,
    registerProveedores,
    handleGetProductsByProveedor,
    handleGetProveedores,
    handleOnChange,
    showModalRegisterProveedor,
    handleRegisterProveedores,
    handleAddProduct,
    setProductsProveedor,
  };
};

export default useProveedores;
