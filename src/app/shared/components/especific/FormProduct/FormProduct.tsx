"use client";

import { useTheContext } from "@/app/hooks/global.hook";
import { ProductsI } from "@/app/interfaces/products/products.interface";
import ProveedoresUtils from "@/app/services/utils/proveedores.utils";
import {
  Autocomplete,
  Box,
  Button,
  Card,
  CardActions,
  CardMedia,
  FormControl,
  IconButton,
  TextField,
  Typography,
} from "@mui/material";
import { Trash2 } from "lucide-react";
import { Dispatch, SetStateAction, useState } from "react";
import {
  Controller,
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
  const { setDataModal, dataMarca, dataCategoria, dataProductProveedor } =
    useTheContext();

  const [loadingUpdateProduct, setLoadingUpdateProduct] =
    useState<boolean>(false);

  const [loadingRemoveProduct, setLoadingRemoveProduct] =
    useState<boolean>(false);

  const { register, handleSubmit, reset, control } = useForm();

  const handleRegisterProveedores = async (event: any) => {
    if (event) {
      setLoadingUpdateProduct(true);

      try {
        const resp = await requestPostProveedores(
          {
            idProduct: dataProductProp.idProduct,
            idProductExt: dataProductProp.idProductExt,
            name: event.name,
            description: event.description,
            categoryId: event.categoria,
            marcaId: event.marca,
            stock: event.stock,
            price: event.price,
            sku: event.sku,
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
      className="w-full flex gap-2 flex-col"
    >
      <div className=" w-full grid grid-cols-[1fr_1fr] gap-2">
        <TextField
          label="Nombre"
          variant="outlined"
          {...register("name", {
            required: "Se requiere nombre",
            value: dataProductProp?.name,
            onChange(event) {
              setProductsProveedor((prev) => ({
                ...prev,
                data: prev.data.map((item) => {
                  if (
                    item.idProduct === dataProductProp.idProduct ||
                    item.idProductExt == dataProductProp.idProductExt
                  ) {
                    return { ...item, name: event.target.value };
                  }
                  return item;
                }),
              }));
            },
          })}
          required
        />

        <TextField
          label="Descripción"
          type="text"
          {...register("description", {
            value: dataProductProp?.description,
            onChange(event) {
              setProductsProveedor((prev) => ({
                ...prev,
                data: prev.data.map((item) => {
                  if (
                    item.idProduct === dataProductProp.idProduct ||
                    item.idProductExt == dataProductProp.idProductExt
                  ) {
                    return { ...item, description: event.target.value };
                  }
                  return item;
                }),
              }));
            },
          })}
        />
      </div>

      <div className="grid grid-cols-[auto] gap-2">
        <FormControl fullWidth>
          <Controller
            name="categoria"
            control={control}
            defaultValue={dataProductProp.categoryId}
            render={({ field }) => (
              <Autocomplete
                fullWidth
                options={dataCategoria || []}
                value={
                  dataCategoria?.find(
                    (c: any) => c.idCategorie == field.value
                  ) || null
                }
                onChange={(event, newValue) => {
                  const id = newValue ? newValue.id : null;

                  field.onChange(id);

                  setProductsProveedor((prev) => ({
                    ...prev,
                    data: prev.data.map((item) =>
                      item.idProduct === dataProductProp.idProduct ||
                      item.idProductExt === dataProductProp.idProductExt
                        ? { ...item, categoryId: id }
                        : item
                    ),
                  }));
                }}
                getOptionLabel={(option) =>
                  `${option.name} ${option.description ?? ""}`
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Categoria"
                    placeholder="Buscar categoría"
                  />
                )}
              />
            )}
          />
        </FormControl>
      </div>

      <div className="grid grid-cols-[1fr_1fr] gap-2">
        <FormControl fullWidth>
          <Controller
            name="marca"
            control={control}
            defaultValue={dataProductProp.marcaId}
            render={({ field }) => (
              <Autocomplete
                fullWidth
                options={dataMarca || []}
                value={
                  dataMarca?.find((c: any) => c.idMarca == field.value) || null
                }
                onChange={(event, newValue) => {
                  const id = newValue ? newValue.id : null;

                  field.onChange(id);

                  setProductsProveedor((prev) => ({
                    ...prev,
                    data: prev.data.map((item) =>
                      item.idProduct === dataProductProp.idProduct ||
                      item.idProductExt === dataProductProp.idProductExt
                        ? { ...item, marcaId: id }
                        : item
                    ),
                  }));
                }}
                getOptionLabel={(option) =>
                  `${option.name} ${option.description ?? ""}`
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Marca"
                    placeholder="Buscar marca"
                  />
                )}
              />
            )}
          />
        </FormControl>

        <TextField
          label="Existencia"
          type="number"
          variant="outlined"
          {...register("stock", {
            value: dataProductProp?.stock,
            onChange(event) {
              setProductsProveedor((prev) => ({
                ...prev,
                data: prev.data.map((item) => {
                  if (
                    item.idProduct === dataProductProp.idProduct ||
                    item.idProductExt == dataProductProp.idProductExt
                  ) {
                    return { ...item, stock: event.target.value };
                  }
                  return item;
                }),
              }));
            },
          })}
          required
        />
      </div>
      <div className="grid grid-cols-[1fr_1fr] gap-2">
        <TextField
          required
          label="Precio"
          type="number"
          variant="outlined"
          inputProps={{
            step: "0.01", // permite 2 decimales
          }}
          {...register("price", {
            value: dataProductProp?.price,

            onChange(event) {
              setProductsProveedor((prev) => ({
                ...prev,
                data: prev.data.map((item) => {
                  if (
                    item.idProduct === dataProductProp.idProduct ||
                    item.idProductExt == dataProductProp.idProductExt
                  ) {
                    return { ...item, price: event.target.value };
                  }
                  return item;
                }),
              }));
            },
          })}
        />
        <TextField
          required
          label="SKU"
          type="text"
          variant="outlined"
          {...register("sku", {
            value: dataProductProp?.sku,
            onChange(event) {
              setProductsProveedor((prev) => ({
                ...prev,
                data: prev.data.map((item) => {
                  if (
                    item.idProduct === dataProductProp.idProduct ||
                    item.idProductExt == dataProductProp.idProductExt
                  ) {
                    return { ...item, sku: event.target.value };
                  }
                  return item;
                }),
              }));
            },
          })}
        />
      </div>

      <div className="grid grid-cols-[auto] gap-2">
        <TextField
          label=""
          type="file"
          variant="outlined"
          name="image_url"
          onChange={(event) => {
            const imgs = (event.target as any).files;

            const fileList: File[] = Array.isArray(imgs)
              ? imgs
              : Array.from(imgs);
            // setDataNewComponent((prev) => ({
            //   ...prev,
            //   image_url: fileList as any,
            // }));
            // setFiles((prev) => [...prev, ...fileList]);
            // event.target.value = "";
          }}
          slotProps={{
            htmlInput: {
              multiple: true,
              max: 5,
              accept: "image/*",
            },
          }}
          // value={dataNewProduct.image_url}
          // // onChange={handleChange}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        {dataProductProp.image_url && dataProductProp.image_url.length > 0
          ? dataProductProp.image_url.map((img: string, indexImg: number) => {
              return (
                <Card key={indexImg} sx={{ position: "relative", width: 130 }}>
                  <CardMedia
                    component="img"
                    image={img}
                    alt={""}
                    sx={{ height: 50, objectFit: "cover" }}
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
                      {/* {file.name} */}
                    </Typography>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => {
                        const currentProduct = dataProductProveedor.data.find(
                          (p) =>
                            p.idProduct === dataProductProp.idProduct ||
                            p.idProductExt === dataProductProp.idProductExt
                        );

                        setProductsProveedor((prev) => ({
                          ...prev,
                          data: prev.data.map((item) => {
                            if (currentProduct) {
                              console.log("localizado");
                              return {
                                ...item,
                                image_url: [],
                              };
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
            })
          : null}
        {/* {files.map((file, indexFile) => {
              const imageUrl = URL.createObjectURL(file);
              return (
                <Card key={indexFile} sx={{ position: "relative", width: 130 }}>
                  <CardMedia
                    component="img"
                    image={imageUrl}
                    alt={file.name}
                    sx={{ height: 50, objectFit: "cover" }}
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
                      {file.name}
                    </Typography>
                    <IconButton
                      size="small"
                      color="error"
                      // onClick={() => handleRemoveFile(indexFile)}
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  </CardActions>
                </Card>
              );
            })} */}
      </div>

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

      <Button
        disabled={loadingRemoveProduct}
        type="button"
        variant="contained"
        color="error"
        className="my-2"
        onClick={async () => {
          setDataModal({
            isOpen: true,
            type: "info",
            content: `¿Seguro que deseas dar de baja el producto ${dataProductProp.name}?`,
            showActions: true,
            onClose: () => {
              setDataModal((prev) => ({ ...prev, isOpen: false }));
            },
            onConfirm: async () => {
              try {
                setLoadingRemoveProduct(true);

                const resp = await requestPostProveedores(
                  {
                    idProduct: dataProductProp.idProduct,
                    idProductExt: dataProductProp.idProductExt,
                  },
                  "/removeProductPcinbox"
                );

                setLoadingRemoveProduct(false);

                if (resp.status == 200) {
                  setDataModal({
                    isOpen: true,
                    title: "Correcto",
                    type: "success",
                    content: "Producto dado de baja correctamente",
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
                setLoadingRemoveProduct(false);
              }
            },
            title: "Cuidado",
          });
        }}
      >
        {loadingRemoveProduct ? (
          <MdAutorenew size={20} className="m-auto the-spinner" />
        ) : (
          <>Dar de baja del sistema</>
        )}
      </Button>
    </Box>
  );
};

export default FormProduct;
