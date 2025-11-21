"use client";

import { useTheContext } from "@/app/hooks/global.hook";
import { ProductsI } from "@/app/interfaces/products/products.interface";
import ProveedoresUtils from "@/app/services/utils/proveedores.utils";
import {
  Box,
  Button,
  Card,
  CardActions,
  CardMedia,
  IconButton,
  TextField,
  Typography,
} from "@mui/material";
import { Trash2 } from "lucide-react";
import { Dispatch, SetStateAction, useState } from "react";
import {
  FieldValues,
  SubmitErrorHandler,
  SubmitHandler,
  useForm,
} from "react-hook-form";
import { MdAutorenew } from "react-icons/md";

const FormProduct = ({
  dataProductProp,
  setProductsProveedor,
}: {
  dataProductProp: ProductsI;
  setProductsProveedor: Dispatch<
    SetStateAction<{
      loading: boolean;
      data: ProductsI[];
    }>
  >;
}) => {
  const { requestPostProveedores } = ProveedoresUtils();
  const { setDataModal } = useTheContext();

  const [loadingUpdateProduct, setLoadingUpdateProduct] =
    useState<boolean>(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  const handleRegisterProveedores = async (event: any) => {
    if (event) {
      setLoadingUpdateProduct(true);
      try {
        const resp = await requestPostProveedores(
          {
            idProduct: dataProductProp.idProduct,
            stock: event.stock,
            price: event.price,
          },
          "/editProductPcinbox"
        );

        setLoadingUpdateProduct(false);
        if (resp.status == 200) {
          const data = resp.data;
          reset();
          setDataModal((prev) => ({ ...prev, isOpen: false }));

          setDataModal({
            isOpen: true,
            type: "success",
            content: data.message,
            title: "Correcto",
            showActions: true,
            onClose: () => {
              setDataModal((prev) => ({ ...prev, isOpen: false }));
            },
            onConfirm: () => {
              setDataModal((prev) => ({ ...prev, isOpen: false }));
            },
          });
        }
      } catch (error) {
        setLoadingUpdateProduct(false);
      }
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(handleRegisterProveedores)}
      sx={{
        width: "100%",
        mx: "auto",
        mt: 1,
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <div className="w-full grid grid-cols-[1fr]">
        <TextField
          label="Existencia"
          type="number"
          {...register("stock", {
            required: "Se requiere el Stock",
            value: dataProductProp?.stock,
            onChange(event) {
              setProductsProveedor((prev) => ({
                ...prev,
                data: prev.data.map((item) => {
                  if (item.idProduct === dataProductProp.idProduct) {
                    return { ...item, stock: event.target.value };
                  }
                  return item;
                }),
              }));
            },
          })}
        />
      </div>
      <div className="w-full grid grid-cols-[1fr]">
        <TextField
          label="Precio"
          type="number"
          {...register("price", {
            required: "Se requiere el Precio",
            value: dataProductProp?.price,
            onChange(event) {
              setProductsProveedor((prev) => ({
                ...prev,
                data: prev.data.map((item) => {
                  if (item.idProduct === dataProductProp.idProduct) {
                    return { ...item, price: event.target.value };
                  }
                  return item;
                }),
              }));
            },
          })}
        />
      </div>
      {/* Campo requerido
      <div className="w-full grid grid-cols-[1fr_1fr_1fr] gap-2">
        <TextField
          label="Nombre"
          type="text"
          {...register("name", {
            required: "El nombre del producto es requerido",
            value: dataProductProp?.name,
            onChange: (event) => {
              setProductsProveedor((prev) => ({
                ...prev,
                data: prev.data.map((item) => {
                  if (item.idProduct === dataProductProp.idProduct) {
                    return { ...item, name: event.target.value };
                  }
                  return item;
                }),
              }));
            },
          })}
        />

        <TextField
          label="Descripción"
          type="text"
          {...register("description", {
            value: dataProductProp?.description,
            onChange: (event) => {
              setProductsProveedor((prev) => ({
                ...prev,
                data: prev.data.map((item) => {
                  if (item.idProduct === dataProductProp.idProduct) {
                    return { ...item, description: event.target.value };
                  }
                  return item;
                }),
              }));
            },
          })}
        />

        <TextField
          label="SKU"
          type="text"
          {...register("sku", {
            required: "El SKU es requerido",
            value: dataProductProp.sku,
            onChange: (event) => {
              setProductsProveedor((prev) => ({
                ...prev,
                data: prev.data.map((item) => {
                  if (item.idProduct === dataProductProp.idProduct) {
                    return { ...item, sku: event.target.value };
                  }
                  return item;
                }),
              }));
            },
          })}
          error={!!errors.sku}
          helperText={!errors.sku?.message?.toString()}
        />
      </div>

      <div className="w-full grid grid-cols-[1fr_1fr] gap-2">
        <TextField
          label="Precio"
          type="number"
          {...register("price", {
            required: "El precio es requerido",
            value: Number(dataProductProp?.price),
            onChange: (event) => {
              setProductsProveedor((prev) => ({
                ...prev,
                data: prev.data.map((item) => {
                  if (item.idProduct === dataProductProp.idProduct) {
                    return { ...item, price: event.target.value };
                  }
                  return item;
                }),
              }));
            },
          })}
          error={!!errors.sku}
          helperText={!errors.sku?.message?.toString()}
        />

        <TextField
          label="Existencia"
          type="number"
          {...register("stock", {
            required: "El stock es requerido",
            value: dataProductProp?.stock,
            onChange: (event) => {
              setProductsProveedor((prev) => ({
                ...prev,
                data: prev.data.map((item) => {
                  if (item.idProduct === dataProductProp.idProduct) {
                    return { ...item, stock: event.target.value };
                  }
                  return item;
                }),
              }));
            },
          })}
          error={!!errors.stock}
          helperText={!errors.stock?.message?.toString()}
        />
      </div>

      <TextField
        label=""
        type="file"
        {...register("image_url", {
          required: "Minimo se requiere una imagen",
          onChange: (event) => {
            const files = (event.target as HTMLInputElement).files;
            if (!files) return;

            const fileList = Array.from(files[0].name);
            console.log(fileList);
            // setDataNewPcGamer((prev) => ({
            //   ...prev,
            //   image_url: fileList, // guarda ambos tipos
            // }));

            // setFiles((prev) => [...prev, ...fileList]);
            event.target.value = ""; // limpia input
          },
        })}
        error={!!errors.image_url}
        helperText={!errors.image_url?.message?.toString()}
        slotProps={{
          htmlInput: {
            multiple: true,
            max: 5,
            accept: "image/*,video/*",
          },
        }}
      />

      <div className="flex flex-wrap gap-3">
        {dataProductProp?.image_url.map((img: string, indexImg: number) => {
          return (
            <Card key={indexImg}>
              <CardMedia
                component={"img"}
                image={img}
                alt={indexImg.toString()}
                sx={{ height: 80, objectFit: "contain" }}
              />

              <CardActions sx={{ justifyContent: "space-between", px: 1 }}>
                <Typography
                  variant="caption"
                  sx={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: 100,
                  }}
                >
                  {"Imagen " + (indexImg + 1).toString() + ".jpg"}
                </Typography>

                <IconButton
                  size="small"
                  color="error"
                  onClick={() => {
                    setProductsProveedor((prev) => ({
                      ...prev,
                      data: prev.data.map((item) => {
                        if (item.idProduct === dataProductProp.idProduct) {
                          let updateImgUrl = item.image_url.filter(
                            (imgProp) => imgProp != img
                          );

                          return { ...item, image_url: updateImgUrl };
                        }
                        return item;
                      }),
                    }));
                  }}
                >
                  <Trash2 size={16} />
                </IconButton>
              </CardActions>
            </Card>
          );
        })}
       
      </div> */}

      <Button
        disabled={loadingUpdateProduct}
        type="submit"
        variant="contained"
        color="primary"
      >
        {loadingUpdateProduct ? (
          <MdAutorenew size={20} className="m-auto the-spinner" />
        ) : (
          <>Actualizar</>
        )}
      </Button>
    </Box>
  );
};

export default FormProduct;
