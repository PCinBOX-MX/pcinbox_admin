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
  MenuItem,
  TextField,
  Typography,
  Stack,
} from "@mui/material";
import { Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { MdAutorenew } from "react-icons/md";
import {
  buildCaracteristicasPayload,
  caracteristicasToTextarea,
  extractTipo,
  isPcProduct,
  parseCaracteristicasRaw,
  PC_TIPO_OPTIONS,
  remoteImageUrls,
  stripTipoLinesFromText,
} from "@/app/utils/caracteristicas.utils";
import { isSameProduct } from "@/app/utils/productIdentity.utils";
import {
  LICENSE_SELECT_OPTIONS,
  LICENSE_TYPE_OPTIONS,
  LicenseSelectField,
} from "@/app/constants/softwareLicenses";

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
  "VIDEO Y ACCESORIOS",
];

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

  const productIsPc = isPcProduct(dataProductProp);

  const [productImages, setProductImages] = useState<string[]>(() =>
    remoteImageUrls(dataProductProp.image_url),
  );

  const initialCaracs = parseCaracteristicasRaw(dataProductProp.caracteristicas);
  const productIsLicense = Boolean(dataProductProp.licenseType);
  const licenseValue = (prop: string) =>
    initialCaracs.find((item) => item.prop === prop)?.value || "";
  const legacyCoverage = licenseValue("usuariosDispositivos");
  const [licenseFields, setLicenseFields] = useState({
    licenseType: dataProductProp.licenseType || "",
    edition: licenseValue("edicion"),
    modality: licenseValue("modalidad"),
    duration: licenseValue("vigencia"),
    coverageUnit:
      licenseValue("tipoCobertura") ||
      (legacyCoverage
        ? /usuario/i.test(legacyCoverage)
          ? "Usuarios"
          : "Dispositivos"
        : ""),
    seats: legacyCoverage.match(/\d+/)?.[0] || legacyCoverage,
    language: licenseValue("idioma"),
    architecture: licenseValue("arquitectura"),
  });
  const [selectedPcTipo, setSelectedPcTipo] = useState<string | null>(() =>
    productIsPc ? extractTipo(initialCaracs) : null,
  );
  const [bulkText, setBulkText] = useState(() =>
    caracteristicasToTextarea(initialCaracs),
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const { register, handleSubmit, control, setValue } = useForm();

  const updateCurrentProduct = (updater: (item: ProductsI) => ProductsI) => {
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

  const syncImages = (updater: (prev: string[]) => string[]) => {
    setProductImages((prev) => {
      const next = updater(prev);
      updateCurrentProduct((item) => ({ ...item, image_url: next }));
      return next;
    });
  };

  const syncCaracteristicasFromText = (text: string, tipo: string | null) => {
    const cleaned = stripTipoLinesFromText(text);
    setBulkText(cleaned);
    const payload = buildCaracteristicasPayload(cleaned, tipo, productIsPc);
    updateCurrentProduct((item) => ({
      ...item,
      caracteristicas: payload,
    }));
  };

  const handleEditProduct = async (event: any) => {
    const findDataProduct = dataProductProveedor?.data?.find((item) =>
      isSameProduct(item, dataProductProp),
    );

    if (productIsPc && !selectedPcTipo) {
      alert("Selecciona el tipo de PC");
      return;
    }

    let caracteristicas = buildCaracteristicasPayload(
      bulkText,
      selectedPcTipo,
      productIsPc,
    );
    if (productIsLicense) {
      const controlled = new Set([
        "edicion",
        "modalidad",
        "vigencia",
        "tipoCobertura",
        "usuariosDispositivos",
        "idioma",
        "arquitectura",
      ]);
      caracteristicas = [
        ...caracteristicas.filter((item) => !controlled.has(item.prop)),
        { prop: "edicion", value: licenseFields.edition },
        { prop: "modalidad", value: licenseFields.modality },
        { prop: "vigencia", value: licenseFields.duration },
        { prop: "tipoCobertura", value: licenseFields.coverageUnit },
        { prop: "usuariosDispositivos", value: licenseFields.seats },
        { prop: "idioma", value: licenseFields.language },
        { prop: "arquitectura", value: licenseFields.architecture },
      ];
    }

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
          isPc: productIsPc ? 1 : 0,
          licenseType: productIsLicense ? licenseFields.licenseType : null,
          caracteristicas,
          image_url: remoteImageUrls(productImages),
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
      setDataModal({
        isOpen: true,
        type: "error",
        content:
          error?.response?.data?.message ||
          error?.message ||
          "Ocurrió un error al actualizar el producto",
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

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [bulkText]);

  useEffect(() => {
    setProductImages(remoteImageUrls(dataProductProp.image_url));

    const caracs = parseCaracteristicasRaw(dataProductProp.caracteristicas);
    const tipo = productIsPc ? extractTipo(caracs) : null;
    setSelectedPcTipo(tipo);
    if (tipo) setValue("Tipo", tipo);
    setBulkText(caracteristicasToTextarea(caracs));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- snapshot al abrir editar
  }, [dataProductProp.idProduct]);

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(handleEditProduct)}
      data-testid="form-edit-product"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        minWidth: "700px",
        padding: "10px",
      }}
    >
      <div style={{ display: "flex", gap: "16px" }}>
        <TextField
          style={{ flex: 1 }}
          label="Nombre"
          variant="outlined"
          inputProps={{ "data-testid": "edit-name" }}
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
                options={(dataCategoria || []).filter(
                  (c: any) =>
                    ALLOWED_CATEGORIES.includes(
                      c.name?.trim().toUpperCase(),
                    ) || c.idCategorie === dataProductProp.categoryId,
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

        {productIsPc && (
          <FormControl style={{ flex: 1 }}>
            <Controller
              name="Tipo"
              control={control}
              defaultValue={selectedPcTipo}
              render={({ field }) => (
                <Autocomplete
                  fullWidth
                  options={[...PC_TIPO_OPTIONS]}
                  value={
                    PC_TIPO_OPTIONS.find((p) => p.tipo == field.value) || null
                  }
                  onChange={(_, newValue) => {
                    const tipo = newValue ? newValue.tipo : null;
                    field.onChange(tipo);
                    setSelectedPcTipo(tipo);
                    syncCaracteristicasFromText(bulkText, tipo);
                  }}
                  getOptionLabel={(option) => `${option.label}`}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Tipo de PC"
                      placeholder="Buscar Tipo de PC"
                      required
                      inputProps={{
                        ...params.inputProps,
                        "data-testid": "edit-tipo-pc",
                      }}
                    />
                  )}
                />
              )}
            />
          </FormControl>
        )}
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
            step: "0.01",
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
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <label
            htmlFor={`file-upload-edit-${dataProductProp.idProduct}`}
            style={{ fontSize: "14px" }}
          >
            Imagen
          </label>
          <input
            id={`file-upload-edit-${dataProductProp.idProduct}`}
            data-testid="edit-file-input"
            type="file"
            onChange={(event) => {
              const files = (event.target as HTMLInputElement).files;
              if (!files) return;

              const previewUrls = Array.from(files).map((file) =>
                URL.createObjectURL(file),
              );
              syncImages((prev) => [...prev, ...previewUrls]);
              event.target.value = "";
            }}
            multiple
            accept="image/*"
          />
        </div>
      </div>

      <div
        style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}
        data-testid="edit-product-images"
      >
        {productImages.map((img: string, indexImg: number) => (
          <Card
            key={`${dataProductProp.idProduct}-${img}-${indexImg}`}
            sx={{ position: "relative", width: 130 }}
            data-testid={`edit-image-${indexImg}`}
            data-image-src={img}
          >
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
              />
              <IconButton
                size="small"
                color="error"
                data-testid={`edit-remove-image-${indexImg}`}
                onClick={() => {
                  syncImages((prev) => {
                    const removed = prev[indexImg];
                    if (removed?.startsWith("blob:")) {
                      URL.revokeObjectURL(removed);
                    }
                    return prev.filter((_, i) => i !== indexImg);
                  });
                }}
              >
                <Trash2 size={16} />
              </IconButton>
            </CardActions>
          </Card>
        ))}
      </div>

      <div style={{ display: "flex", gap: "16px" }}>
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

      {productIsLicense && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: "12px",
          }}
          data-testid="edit-license-fields"
        >
          <TextField
            select
            label="Bloque de licencia"
            value={licenseFields.licenseType}
            onChange={(event) =>
              setLicenseFields((previous) => ({
                ...previous,
                licenseType: event.target.value as
                  | "windows"
                  | "antivirus"
                  | "office",
              }))
            }
            required
            slotProps={{ inputLabel: { shrink: true } }}
          >
            {LICENSE_TYPE_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          {(
            [
              ["modality", "Modalidad"],
              ["duration", "Vigencia"],
              ["coverageUnit", "Tipo de cobertura"],
              ["language", "Idioma"],
              ["architecture", "Arquitectura"],
            ] as const
          ).map(([key, label]) => (
            <TextField
              key={key}
              select
              label={label}
              value={licenseFields[key]}
              onChange={(event) =>
                setLicenseFields((previous) => ({
                  ...previous,
                  [key]: event.target.value,
                }))
              }
              required
              slotProps={{ inputLabel: { shrink: true } }}
            >
              <MenuItem value="" disabled>
                Selecciona una opción
              </MenuItem>
              {LICENSE_SELECT_OPTIONS[key as LicenseSelectField].map(
                (option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ),
              )}
            </TextField>
          ))}
          {[
            ["edition", "Versión o edición"],
            ["seats", "Cantidad de usuarios o dispositivos"],
          ].map(([key, label]) => (
            <TextField
              key={key}
              label={label}
              value={licenseFields[key as keyof typeof licenseFields]}
              onChange={(event) =>
                setLicenseFields((previous) => ({
                  ...previous,
                  [key]: event.target.value,
                }))
              }
              required
              type={key === "seats" ? "number" : "text"}
              slotProps={
                key === "seats"
                  ? { htmlInput: { min: 1, step: 1 } }
                  : undefined
              }
            />
          ))}
        </div>
      )}

      <Stack spacing={2} className="admin-mt-sm admin-py-sm">
        <TextField
          label="Características (propiedad: valor, una por línea)"
          multiline
          rows={6}
          variant="outlined"
          fullWidth
          value={bulkText}
          inputProps={{ "data-testid": "edit-caracteristicas" }}
          onChange={(e) => {
            syncCaracteristicasFromText(e.target.value, selectedPcTipo);
          }}
          helperText={
            productIsPc
              ? "El tipo de PC no aparece aquí: se guarda con el selector de arriba."
              : undefined
          }
        />
      </Stack>

      <Button
        disabled={loadingUpdateProduct}
        type="submit"
        fullWidth
        variant="contained"
        data-testid="edit-submit"
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
