"use client";

import { useState } from "react";
import ProveedoresUtils from "../services/utils/proveedores.utils";
import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  TextField,
  Typography,
} from "@mui/material";
import { ProveedoresI } from "../interfaces/proveedores/proveedores.interface";
import { ProductsI } from "../interfaces/products/products.interface";
import { useTheContext } from "../hooks/global.hook";
import RegisterFormProovedor from "../shared/components/especific/proveedores/register/RegisterFormProveedor";
import { useForm } from "react-hook-form";
import RegisterProduct from "../shared/components/especific/registerProduct/RegisterProduct";

const useProveedores = () => {
  const { reset } = useForm();
  const { dataProveedores, setDataModal, setDataProveedores } = useTheContext();
  const { requestGetProveedores, requestPostProveedores } = ProveedoresUtils();

  const [slcProveedor, setSlcProveedor] = useState<string>("");
  const [dataProductProveedor, setProductsProveedor] = useState<{
    loading: boolean;
    data: ProductsI[];
  }>({
    loading: false,
    data: [],
  });

  const [registerProveedores, setRegisterProveedores] = useState<{
    loading: boolean;
  }>({ loading: false });

  const [files, setFiles] = useState<File[]>([]);

  const handleOnChange = (event: SelectChangeEvent) => {
    setSlcProveedor(event.target.value);
  };

  const handleGetProveedores = async () => {
    try {
      setDataProveedores((prev) => ({ ...prev, loading: true }));

      const resp = await requestGetProveedores("/getAllProveedores");
      setDataProveedores((prev) => ({ ...prev, loading: false }));

      if (resp?.status == 200) {
        const data = resp.data;
        setDataProveedores((prev) => ({ ...prev, data: data.data.data }));

        if (data.length > 0) {
          setSlcProveedor(data[0].idProveedor.toString());
        }
      }
    } catch (error) {
      setDataProveedores((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleGetProductsByProveedor = async (idProveedor: any) => {
    try {
      setProductsProveedor((prev) => ({ ...prev, loading: true }));

      const resp = await requestPostProveedores(
        {
          idProveedor,
        },
        "/getProductsByProveedor"
      );
      setProductsProveedor((prev) => ({ ...prev, loading: false }));

      if (resp?.status == 200) {
        const data = resp.data;
        setProductsProveedor((prev) => ({ ...prev, data: data.data.data }));
      }
    } catch (error) {
      setProductsProveedor((prev) => ({ ...prev, loading: false }));
    }
  };

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
        "/registerProveedor"
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
          data.data.data[data.data.data.length - 1].idProvider.toString()
        );
        reset();
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
      type: "success",
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
    dataProductProveedor,
    registerProveedores,
    handleGetProductsByProveedor,
    handleGetProveedores,
    handleOnChange,
    showModalRegisterProveedor,
    handleRegisterProveedores,
    handleAddProduct,
  };
};

export default useProveedores;
