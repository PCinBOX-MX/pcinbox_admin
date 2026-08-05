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

const ALLOWED_CATEGORIES = [
  "ALMACENAMIENTO",
  "AUDIO Y BOCINAS",
  "ENFRIAMIENTO",
  "FUENTES DE PODER",
  "GABINETES",
  "LAPTOPS",
  "MEMORIAS RAM Y FLASH",
  "MONITORES Y ACCESORIOS PARA MONITOR",
  "MOUSES Y ACCESORIOS PARA MOUSES",
  "PROCESADORES",
  "REDES",
  "REGULADORES, NOBREAKS Y ENERGIA",
  "TARJETAS DE VIDEO",
  "TARJETAS MADRE",
  "TECLADOS",
  "VENTILADORES",
  "VIDEO Y ACCESORIOS"
];

const isSameProduct = (item: ProductsI, product: ProductsI) =>
  Number(item.idProduct) === Number(product.idProduct);

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

  // Imágenes locales: las mismas que muestra la tarjeta al abrir editar.
  // No se leen del estado global para evitar mezclar imágenes de otro producto.
  const [productImages, setProductImages] = useState<string[]>(() => [
    ...(dataProductProp.image_url || []),
  ]);

  const containerRef = useRef<HTMLDivElement>(null);

  const { register, handleSubmit, control } = useForm();

  const updateCurrentProduct = (
    updater: (item: ProductsI) => ProductsI,
  ) => {
    setProductsProveedor((prev) => ({
      ...prev,
      data: prev.data.map((item) =>
        isSameProduct(item, dataProductProp) ? updater(item) : item,
      ),
      copyData: prev.copyData?.map((item) =>
        isSameProduct(item, dataProductProp) ? updater(item) : item,
      ),
    }));
  };

  const syncImagesToStore = (images: string[]) => {
    setProductImages(images);
    updateCurrentProduct((item) => ({ ...item, image_url: images }));
  };

  const handleEditProduct = async (event: any) => {
    const findDataProduct = dataProductProveedor?.data?.find((item) =>
      isSameProduct(item, dataProductProp),
    );
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
          providerId: findDataProduct?.providerId ?? dataProductProp.providerId,
          profitMargin: providerUsesProfitMargin(
            findDataProduct?.providerId ?? dataProductProp.providerId,
          )
            ? event?.profitMargin
            : 0,
          isPc: dataProductProp?.isPc || (dataProductProp as any)?.isPC,
          caracteristicas: findDataProduct
            ? findDataProduct?.caracteristicas
            : dataProductProp.caracteristicas || [],
          image_url: productImages,
        },
        "/editProductPcinbox",
      );
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
    } catch (error: any) {
      setLoadingUpdateProduct(false);
      setDataModal({
        isOpen: true,
        type: "error",
        content: error?.response?.data?.message || error?.message || "Ocurrió un error al actualizar el producto",
        title: "Error",
        showActions: true,
        onClose: () => {
          setDataModal((prev: any) => ({ ...prev, isOpen: false }));
        },
        onConfirm: () => {
          setDataModal((prev: any) => ({ ...prev, isOpen: false }));
        },
      });
    } finally {
      setLoadingUpdateProduct(false);
    }
  };

  const currentProduct = dataProductProveedor.data.find((p) =>
    isSameProduct(p, dataProductProp),
  );

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [currentProduct?.caracteristicas]);

  const [bulkText, setBulkText] = useState("");
  const lastProductIdRef = useRef<number | null>(null);

  useEffect(() => {
    // Solo al abrir/cambiar de producto: mismas imágenes que la tarjeta.
    setProductImages([...(dataProductProp.image_url || [])]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- snapshot al abrir editar
  }, [dataProductProp.idProduct]);

  useEffect(() => {
    if (lastProductIdRef.current === dataProductProp.idProduct) return;

    const product =
      dataProductProveedor.data.find((p) =>
        isSameProduct(p, dataProductProp),
      ) || dataProductProp;

    if (product.caracteristicas) {
      try {
        const parsed =
          typeof product.caracteristicas === "string"
            ? JSON.parse(product.caracteristicas as unknown as string)
            : product.caracteristicas;
        if (Array.isArray(parsed)) {
          const text = parsed
            .map((c: any) => {
              if (
                c.prop === "Característica" &&
                !c.value.includes("Característica")
              ) {
                return c.value;
              }
              return `${c.prop}: ${c.value}`;
            })
            .join("\n");
          setBulkText(text);
          lastProductIdRef.current = dataProductProp.idProduct;
        }
      } catch (e) {
        console.error("Error parsing caracteristicas", e);
      }
    } else {
      setBulkText("");
      lastProductIdRef.current = dataProductProp.idProduct;
    }
  }, [dataProductProveedor.data, dataProductProp]);
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
              updateCurrentProduct((item) => ({
                ...item,
                name: event.target.value,
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
              updateCurrentProduct((item) => ({
                ...item,
                description: event.target.value,
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
                options={(dataCategoria || []).filter((c: any) => 
                  ALLOWED_CATEGORIES.includes(c.name?.trim().toUpperCase()) ||
                  c.idCategorie === dataProductProp.categoryId
                )}
                value={
                  dataCategoria?.find(
                    (c: any) => c.idCategorie == field.value,
                  ) || null
                }
                onChange={(event, newValue) => {
                  const id = newValue ? newValue.idCategorie : null;

                  field.onChange(id);

                  updateCurrentProduct((item) => ({
                    ...item,
                    categoryId: id,
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
                  const id = newValue ? newValue.idMarca : null;

                  field.onChange(id);

                  updateCurrentProduct((item) => ({
                    ...item,
                    marcaId: id,
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
              updateCurrentProduct((item) => ({
                ...item,
                stock: event.target.value,
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
              updateCurrentProduct((item) => ({
                ...item,
                price: event.target.value,
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
              updateCurrentProduct((item) => ({
                ...item,
                sku: event.target.value,
              }));
            },
          })}
        />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
          <label htmlFor={`file-upload-edit-${dataProductProp.idProduct}`} style={{ fontSize: "14px" }}>Imagen</label>
          <input
            id={`file-upload-edit-${dataProductProp.idProduct}`}
            type="file"
            onChange={(event) => {
              const files = (event.target as HTMLInputElement).files;
              if (!files) return;

              const fileList = Array.from(files);
              const previewUrls = fileList.map((file) =>
                URL.createObjectURL(file),
              );

              syncImagesToStore([...productImages, ...previewUrls]);
              event.target.value = "";
            }}
            multiple
            accept="image/*"
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
        {productImages.map((img: string, indexImg: number) => (
            <Card key={`${dataProductProp.idProduct}-${img}-${indexImg}`} sx={{ position: "relative", width: 130 }}>
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
                    const removed = productImages[indexImg];
                    if (removed?.startsWith("blob:")) {
                      URL.revokeObjectURL(removed);
                    }
                    syncImagesToStore(
                      productImages.filter((_, i) => i !== indexImg),
                    );
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
              updateCurrentProduct((item) => ({
                ...item,
                upc: event.target.value,
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

                  updateCurrentProduct((item) => ({
                    ...item,
                    providerId: Number(id),
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
                updateCurrentProduct((item) => ({
                  ...item,
                  profitMargin: event.target.value,
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

            updateCurrentProduct((prod) => ({
              ...prod,
              caracteristicas: newCaracs,
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
