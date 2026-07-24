"use client";

import { useTheContext } from "@/app/hooks/global.hook";
import { providerUsesProfitMargin } from "@/app/constants/providers.constants";
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
  Stack,
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
    dataProveedores,
    setProductsProveedor,
  } = useTheContext();

  const [loadingUpdateProduct, setLoadingUpdateProduct] =
    useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const { register, handleSubmit, control } = useForm();

  const handleEditProduct = async (event: any) => {
    const findDataProduct = dataProductProveedor?.data?.find(
      (prevProductProveedor) =>
        prevProductProveedor.idProduct == dataProductProp.idProduct,
    );
    // if (event) {
    try {
      setLoadingUpdateProduct(true);
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
          upc: event.upc,
          providerId: findDataProduct?.providerId,
          profitMargin: providerUsesProfitMargin(findDataProduct?.providerId)
            ? event?.profitMargin
            : 0,
          isPc: dataProductProp?.isPc || (dataProductProp as any)?.isPC,
          caracteristicas: findDataProduct
            ? findDataProduct?.caracteristicas
            : [],
          image_url: findDataProduct ? findDataProduct?.image_url : [],
        },
        "/editProductPcinbox",
      );
      //     setLoadingUpdateProduct(false);
      //     if (resp.status == 200) {
      const data = resp.data;
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
      //       setProductsProveedor((prev) => {
      //         const updateItem = (prevItem: any) => {
      //           if (
      //             Number(prevItem.idProduct) === Number(data?.data?.idProduct)
      //           ) {
      //             return {
      //               ...prevItem,
      //               idProduct: Number(data?.data?.idProduct),
      //               idProductExt: data?.data?.idProductExt,
      //               name: data?.data?.name,
      //               description: data?.data?.description,
      //               caracteristicas: data?.data?.caracteristicas,
      //               price: Number(data?.data?.price),
      //               stock: Number(data?.data?.stock),
      //               sku: data?.data?.sku,
      //               upc: data?.data?.upc,
      //               width: Number(data?.data?.width),
      //               height: Number(data?.data?.height),
      //               largo: Number(data?.data?.largo),
      //               peso: data?.data?.peso,
      //               rating: Number(data?.data?.rating),
      //               image_url: data?.data?.image_url,
      //               categoryId: Number(data?.data?.categoryId),
      //               marcaId: Number(data?.data?.marcaId),
      //               providerId: Number(data?.data?.providerId),
      //               isPC: Number(data?.data?.isPC),
      //               createdAt: data?.data?.createdAt,
      //               active: Number(data?.data?.active),
      //             };
      //           }
      //           return prevItem;
      //         };
      //         return {
      //           ...prev,
      //           loading: false,
      //           data: prev.data.map(updateItem),
      //           copyData: prev.copyData!.map(updateItem), // 🔥 ESTA LÍNEA ES LA CLAVE
      //         };
      //       });
      //     }
    } catch (error) {
      setLoadingUpdateProduct(false);
    } finally {
      setLoadingUpdateProduct(false);
    }
    // }
  };

  const currentProduct = dataProductProveedor.data.find(
    (p) => p.idProduct == dataProductProp.idProduct,
  );

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [currentProduct?.caracteristicas]);

  const [bulkText, setBulkText] = useState("");
  useEffect(() => {
    const currentProduct = dataProductProveedor.data.find(
      (p) => p.idProduct === dataProductProp.idProduct,
    );
    if (!currentProduct) return;
    if (currentProduct.caracteristicas) {
      try {
        const parsed = typeof currentProduct.caracteristicas === "string" 
          ? JSON.parse(currentProduct.caracteristicas) 
          : currentProduct.caracteristicas;
        if (Array.isArray(parsed)) {
          const text = parsed
            .map((c: any) => `${c.prop}: ${c.value}`)
            .join("\n");
          setBulkText(text);
        }
      } catch (e) {
        console.error("Error parsing caracteristicas", e);
      }
    }
  }, [dataProductProveedor.data, dataProductProp.idProduct]);

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(handleEditProduct)}
      style={{ display: "flex", flexDirection: "column", gap: "20px", minWidth: "700px", padding: "10px" }}
    >
      <div style={{ display: "flex", gap: "16px" }}>
        <TextField
          style={{ flex: 1 }}
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
          style={{ flex: 1 }}
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
      
      <div style={{ display: "flex", gap: "16px" }}>
        <FormControl style={{ flex: 1 }}>
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
                    (c: any) => c.idCategorie == field.value,
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
                        : item,
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

      <div style={{ display: "flex", gap: "16px" }}>
        <FormControl style={{ flex: 1 }}>
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
                        : item,
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
            value: dataProductProp?.stock || 0,
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
      <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
        <TextField
          style={{ flex: 1 }}
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
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
          <label htmlFor={`file-upload-edit`} style={{ fontSize: "14px" }}>Imagen</label>
          <input
            id={`file-upload-edit`}
            type="file"
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
            multiple
            accept="image/*"
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
        {dataProductProveedor.data
          .find(
            (p) =>
              p.idProduct === dataProductProp.idProduct ||
              p.idProductExt === dataProductProp.idProductExt,
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
                              (_: any, i: number) => i !== indexImg,
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
        style={{ display: "flex", gap: "16px" }}
      >
        <TextField
          style={{ flex: 1 }}
          label="UPC"
          type="text"
          variant="outlined"
          {...register("upc", {
            value: dataProductProp?.upc,
            onChange(event) {
              setProductsProveedor((prev) => ({
                ...prev,
                data: prev.data.map((item) => {
                  if (
                    item.idProduct === dataProductProp.idProduct ||
                    item.idProductExt == dataProductProp.idProductExt
                  ) {
                    return { ...item, upc: event.target.value };
                  }
                  return item;
                }),
              }));
            },
          })}
        />

        <FormControl style={{ flex: 1 }}>
          <Controller
            name="Proveedor"
            control={control}
            defaultValue={dataProductProp.providerId}
            render={({ field }) => (
              <Autocomplete
                fullWidth
                options={
                  dataProveedores.data && dataProveedores.data.length > 0
                    ? dataProveedores.data
                    : []
                }
                value={
                  dataProveedores.data?.find(
                    (p: any) => p.idProvider == field.value,
                  ) || null
                }
                onChange={(event, newValue) => {
                  const id = newValue ? newValue.idProvider : null;

                  field.onChange(id);

                  setProductsProveedor((prev) => ({
                    ...prev,
                    data: prev.data.map((item) =>
                      item.idProduct === dataProductProp.idProduct ||
                      item.idProductExt === dataProductProp.idProductExt
                        ? { ...item, providerId: Number(id) }
                        : item,
                    ),
                  }));
                }}
                getOptionLabel={(option) => `${option.companyName}`}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Proveedor"
                    placeholder="Buscar Proveedor"
                  />
                )}
              />
            )}
          />
        </FormControl>

        {providerUsesProfitMargin(dataProductProp?.providerId) && (
          <TextField
            style={{ flex: 1 }}
            label="Margen de Utilidad"
            type="number"
            variant="outlined"
            {...register("profitMargin", {
              value: dataProductProp?.profitMargin,
              onChange(event) {
                setProductsProveedor((prev) => ({
                  ...prev,
                  data: prev.data.map((item) => {
                    if (
                      item.idProduct === dataProductProp.idProduct ||
                      item.idProductExt == dataProductProp.idProductExt
                    ) {
                      return { ...item, profitMargin: event.target.value };
                    }
                    return item;
                  }),
                }));
              },
            })}
          />
        )}
      </div>

      <Stack spacing={2} className="admin-mt-sm admin-py-sm">
        <TextField
          label="Características (propiedad: valor, una por línea)"
          multiline
          rows={6}
          variant="outlined"
          fullWidth
          value={bulkText}
          onChange={(e) => {
            const val = e.target.value;
            setBulkText(val);

            const newCaracs = val
              .split("\n")
              .filter((line) => line.trim().length > 0)
              .map((line) => {
                const parts = line.split(":");
                if (parts.length >= 2) {
                  return {
                    prop: parts[0].trim(),
                    value: parts.slice(1).join(":").trim(),
                  };
                }
                return { prop: "Característica", value: line.trim() };
              });

            setProductsProveedor((prev) => ({
              ...prev,
              data: prev.data.map((prod) =>
                prod.idProduct === dataProductProp.idProduct
                  ? { ...prod, caracteristicas: newCaracs }
                  : prod,
              ),
            }));
          }}
        />
      </Stack>

      <Button
        disabled={loadingUpdateProduct}
        type="submit"
        fullWidth
        variant="contained"
        sx={{
          background: "linear-gradient(135deg, #b92b3d 0%, #992230 100%)",
          color: "white",
          fontWeight: "bold",
          padding: "12px",
          fontSize: "1.1rem",
          boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
          "&:hover": { background: "#992230" },
        }}
      >
        {loadingUpdateProduct ? (
          <MdAutorenew size={20} className="admin-m-auto the-spinner" />
        ) : (
          <>Actualizar</>
        )}
      </Button>
    </Box>
  );
};

export default FormProduct;
