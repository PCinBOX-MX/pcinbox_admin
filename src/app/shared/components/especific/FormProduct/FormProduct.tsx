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
import {
  Dispatch,
  SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Controller,
  FieldValues,
  SubmitErrorHandler,
  SubmitHandler,
  useForm,
} from "react-hook-form";
import { MdAutorenew, MdRemove } from "react-icons/md";

const FormProduct = ({ dataProductProp }: { dataProductProp: ProductsI }) => {
  const { requestPostProveedores } = ProveedoresUtils();
  const {
    setDataModal,
    dataMarca,
    dataCategoria,
    dataProductProveedor,
    setProductsProveedor,
  } = useTheContext();

  const [loadingUpdateProduct, setLoadingUpdateProduct] =
    useState<boolean>(false);

  const [loadingRemoveProduct, setLoadingRemoveProduct] =
    useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { register, handleSubmit, reset, control } = useForm();

  const handleEditProduct = async (event: any) => {
    const findDataProduct = dataProductProveedor?.data?.find(
      (prevProductProveedor) =>
        prevProductProveedor.idProduct == dataProductProp.idProduct
    );

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
            providerId: dataProductProp?.providerId,
            isPc: dataProductProp?.isPc,
            caracteristicas: findDataProduct
              ? findDataProduct?.caracteristicas
              : [],
            image_url: findDataProduct ? findDataProduct?.image_url : [],
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

  const currentProduct = dataProductProveedor.data.find(
    (p) => p.idProduct == dataProductProp.idProduct
  );

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [currentProduct?.caracteristicas]);

  const caracteristicasArray = useMemo(() => {
    const currentProduct = dataProductProveedor.data.find(
      (p) => p.idProduct === dataProductProp.idProduct
    );

    if (!currentProduct) return [];

    if (typeof currentProduct.caracteristicas === "string") {
      try {
        const parsed = JSON.parse(currentProduct.caracteristicas);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }

    if (Array.isArray(currentProduct.caracteristicas)) {
      return currentProduct.caracteristicas;
    }

    return [];
  }, [dataProductProveedor, dataProductProp.idProduct]);

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(handleEditProduct)}
      className="w-full flex gap-1 flex-col"
    >
      <div className=" w-full grid grid-cols-[1fr_1fr_1fr] gap-2">
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

      <div className="grid grid-cols-[1fr_1fr_1fr] gap-2">
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
      </div>
      <div className="grid grid-cols-[1fr_1fr] gap-2">
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
        <TextField
          label=""
          type="file"
          variant="outlined"
          name="image_url"
          onChange={(event) => {
            const files = (event.target as HTMLInputElement).files;
            if (!files) return;

            // Iteramos uno por uno
            for (let i = 0; i < files.length; i++) {
              const file = files[i];

              // Si quieres, puedes crear un preview de cada imagen
              const previewUrl = URL.createObjectURL(file);

              // O agregarlas individualmente al estado
              setProductsProveedor((prev) => ({
                ...prev,
                data: prev.data.map((item) => {
                  if (
                    item.idProduct === dataProductProp.idProduct ||
                    item.idProductExt === dataProductProp.idProductExt
                  ) {
                    return {
                      ...item,
                      image_url: [...(item.image_url || []), previewUrl],
                    };
                  }
                  return item;
                }),
              }));
            }
            event.target.value = "";
          }}
          slotProps={{
            htmlInput: {
              multiple: true,
              max: 5,
              accept: "image/*",
            },
          }}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        {dataProductProveedor.data
          .find(
            (p) =>
              p.idProduct === dataProductProp.idProduct ||
              p.idProductExt === dataProductProp.idProductExt
          )
          ?.image_url?.map((img: string, indexImg: number) => (
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
                  {/* Nombre o info opcional */}
                </Typography>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => {
                    setProductsProveedor((prev) => ({
                      ...prev,
                      data: prev.data.map((item) => {
                        if (
                          item.idProduct === dataProductProp.idProduct ||
                          item.idProductExt === dataProductProp.idProductExt
                        ) {
                          return {
                            ...item,
                            image_url: item.image_url.filter(
                              (_: any, i: number) => i !== indexImg
                            ), // eliminamos todas
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
          ))}
      </div>

      <div
        className="flex flex-wrap gap-3 w-full overflow-x-hidden overflow-y-auto max-h-[150px] mt-2 py-2"
        ref={containerRef}
      >
        {caracteristicasArray && caracteristicasArray.length > 0
          ? caracteristicasArray.map((car: any, indexCar: number) => {
              return (
                <div
                  key={indexCar}
                  className="w-full grid grid-cols-[1fr_1fr_auto] gap-2"
                >
                  <Controller
                    name={`caracteristicas.${indexCar}.prop`}
                    control={control}
                    defaultValue={car.prop}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Caracteristica"
                        variant="outlined"
                        onChange={(e) => {
                          field.onChange(e);
                          const newValue = e.target.value;
                          setProductsProveedor((prev) => ({
                            ...prev,
                            data: prev.data.map((prod) => {
                              if (prod.idProduct != dataProductProp.idProduct) {
                                return prod;
                              }

                              return {
                                ...prod,
                                caracteristicas: (Array.isArray(
                                  prod.caracteristicas
                                )
                                  ? prod.caracteristicas
                                  : JSON.parse(prod.caracteristicas || "[]")
                                ).map((c: any, i: number) => {
                                  if (i !== indexCar) return c;

                                  return {
                                    ...c,
                                    prop: newValue,
                                  };
                                }),
                              };
                            }),
                          }));
                        }}
                      />
                    )}
                  />

                  <Controller
                    name={`caracteristicas.${indexCar}.value`}
                    control={control}
                    defaultValue={car.value}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Valor"
                        variant="outlined"
                        onChange={(e) => {
                          field.onChange(e);
                          const newValue = e.target.value;
                          setProductsProveedor((prev) => ({
                            ...prev,
                            data: prev.data.map((prod) => {
                              if (prod.idProduct != dataProductProp.idProduct) {
                                return prod;
                              }

                              return {
                                ...prod,
                                caracteristicas: (Array.isArray(
                                  prod.caracteristicas
                                )
                                  ? prod.caracteristicas
                                  : JSON.parse(prod.caracteristicas || "[]")
                                ).map((c: any, i: number) => {
                                  if (i !== indexCar) return c;

                                  return {
                                    ...c,
                                    value: newValue,
                                  };
                                }),
                              };
                            }),
                          }));
                        }}
                      />
                    )}
                  />

                  <Button
                    style={{ background: "red", color: "white" }}
                    onClick={() => {
                      setProductsProveedor((prev) => ({
                        ...prev,
                        data: prev.data.map((prod) => {
                          if (prod.idProduct !== dataProductProp.idProduct)
                            return prod;

                          const caracteristicasArray = Array.isArray(
                            prod.caracteristicas
                          )
                            ? prod.caracteristicas
                            : JSON.parse(prod.caracteristicas || "[]");

                          return {
                            ...prod,
                            caracteristicas: caracteristicasArray.filter(
                              (_: any, i: number) => i !== indexCar
                            ),
                          };
                        }),
                      }));
                    }}
                  >
                    <MdRemove size={26} />
                  </Button>
                </div>
              );
            })
          : ""}
      </div>

      <div className="flex flex-wrap gap-3 w-full">
        <Button
          type="button"
          variant="contained"
          color="success"
          onClick={() => {
            setProductsProveedor((prev) => ({
              ...prev,
              data: prev.data.map((prod) => {
                if (prod.idProduct !== dataProductProp.idProduct) return prod;

                // Asegurarnos de tener un array
                const caracteristicasArray = Array.isArray(prod.caracteristicas)
                  ? prod.caracteristicas
                  : prod.caracteristicas
                  ? JSON.parse(prod.caracteristicas)
                  : [];

                return {
                  ...prod,
                  caracteristicas: [
                    ...caracteristicasArray,
                    { prop: "", value: "" },
                  ],
                };
              }),
            }));
          }}
        >
          +
        </Button>
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
