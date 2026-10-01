"use client";

import { useTheContext } from "@/app/hooks/global.hook";
import { providerUsesProfitMargin } from "@/app/constants/providers.constants";
import { ProductsI } from "@/app/interfaces/products/products.interface";
import ProveedoresUtils from "@/app/services/utils/proveedores.utils";
import CatalogWarrantyFields from "../CatalogWarrantyFields";
import {
  appendCatalogWarrantyToFormData,
  CatalogWarrantyState,
  validateCatalogWarranty,
  warrantyStateFromProduct,
} from "@/app/shared/utils/catalogWarranty";
import {
  Autocomplete,
  Box,
  Button,
  FormControl,
  MenuItem,
  TextField,
  Stack,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { MdAutorenew } from "react-icons/md";
import {
  buildCaracteristicasPayload,
  caracteristicasToTextarea,
  extractTipo,
  isPcProduct,
  LICENSE_CONTROLLED_PROPS,
  parseCaracteristicasRaw,
  PC_TIPO_OPTIONS,
  remoteImageUrls,
  stripLicenseControlledLinesFromText,
  stripTipoLinesFromText,
} from "@/app/utils/caracteristicas.utils";
import { isSameProduct } from "@/app/utils/productIdentity.utils";
import {
  applyCronStockUpdate,
  normalizeCronStockPayload,
} from "@/app/utils/cronStockLiveSync";
import {
  LICENSE_SELECT_OPTIONS,
  LICENSE_TYPE_OPTIONS,
  LicenseSelectField,
} from "@/app/constants/softwareLicenses";
import {
  takeFilesWithinLimit,
  validateProductImagesCount,
} from "@/app/constants/productImages.constants";
import ProductImagesField from "../productImages/ProductImagesField";
import StickyFormAction from "../productImages/StickyFormAction";

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
    socketCron,
    socketCronReady,
  } = useTheContext();

  const [loadingUpdateProduct, setLoadingUpdateProduct] =
    useState<boolean>(false);

  const productIsPc = isPcProduct(dataProductProp);

  const [productImages, setProductImages] = useState<string[]>(() =>
    remoteImageUrls(dataProductProp.image_url),
  );
  /** Archivos nuevos pendientes de subir (mismo orden que los blobs en productImages). */
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const imageSectionRef = useRef<HTMLDivElement>(null);
  const initialImageUrlsRef = useRef<string[]>(
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
    caracteristicasToTextarea(initialCaracs, {
      stripLicenseControlled: productIsLicense,
    }),
  );
  const [warrantyState, setWarrantyState] = useState<CatalogWarrantyState>(() =>
    warrantyStateFromProduct({
      warrantyMode: dataProductProp.warrantyMode,
      warrantyMonths: dataProductProp.warrantyMonths,
    }),
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

  useEffect(() => {
    const cronSocket = socketCron?.current;
    if (!cronSocket || !socketCronReady) return;

    const onCronUpdate = (payload: unknown) => {
      const updates = normalizeCronStockPayload(payload);
      const update = updates.find(
        (u) => Number(u.idProduct) === Number(dataProductProp.idProduct),
      );
      if (!update) return;

      if (update.price != null && Number.isFinite(update.price)) {
        setValue("price", update.price);
      }
      if (update.stock != null && Number.isFinite(update.stock)) {
        setValue("stock", update.stock);
      }
      updateCurrentProduct((item) => applyCronStockUpdate(item, update));
    };

    cronSocket.on("updatedStockCron", onCronUpdate);
    return () => {
      cronSocket.off("updatedStockCron", onCronUpdate);
    };
  }, [socketCron, socketCronReady, dataProductProp.idProduct, setValue]);

  const syncImages = (updater: (prev: string[]) => string[]) => {
    // No actualizar GlobalProvider dentro del updater de setProductImages.
    let nextImages = productImages;
    setProductImages((prev) => {
      nextImages = updater(prev);
      return nextImages;
    });
    updateCurrentProduct((item) => ({ ...item, image_url: nextImages }));
  };

  const syncCaracteristicasFromText = (text: string, tipo: string | null) => {
    let cleaned = stripTipoLinesFromText(text);
    if (productIsLicense) {
      cleaned = stripLicenseControlledLinesFromText(cleaned);
    }
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

    const imagesValidationError = validateProductImagesCount(
      productImages.length,
    );
    if (imagesValidationError) {
      setImageError(imagesValidationError);
      return;
    }
    setImageError(null);

    let caracteristicas = buildCaracteristicasPayload(
      bulkText,
      selectedPcTipo,
      productIsPc,
    );
    if (productIsLicense) {
      const controlled = new Set<string>(LICENSE_CONTROLLED_PROPS);
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
      const keptRemoteUrls = remoteImageUrls(productImages);
      const providerId =
        findDataProduct?.providerId ?? dataProductProp.providerId;

      const warrantyError = validateCatalogWarranty(warrantyState, {
        providerId,
        isPC: productIsPc,
      });
      if (warrantyError) {
        setDataModal({
          isOpen: true,
          loading: false,
          type: "error",
          content: warrantyError,
          title: "Garantía",
          showActions: true,
          onClose: () => setDataModal((p) => ({ ...p, isOpen: false })),
          onConfirm: async () => setDataModal((p) => ({ ...p, isOpen: false })),
        });
        return;
      }

      setLoadingUpdateProduct(true);
      setDataModal((prev) => ({ ...prev, loading: true }));

      const formData = new FormData();
      formData.append("idProduct", String(dataProductProp.idProduct));
      if (dataProductProp.idProductExt != null) {
        formData.append("idProductExt", String(dataProductProp.idProductExt));
      }
      formData.append("name", String(event.name ?? ""));
      formData.append("description", String(event.description ?? ""));
      formData.append("categoryId", String(event.categoria ?? ""));
      formData.append("marcaId", String(event.marca ?? ""));
      formData.append("stock", String(event.stock ?? ""));
      formData.append("price", String(event.price ?? ""));
      formData.append("sku", String(event.sku ?? ""));
      formData.append("upc", String(event.upc ?? ""));
      formData.append("providerId", String(providerId ?? ""));
      formData.append(
        "profitMargin",
        String(
          providerUsesProfitMargin(providerId) ? (event?.profitMargin ?? 0) : 0,
        ),
      );
      formData.append("isPc", productIsPc ? "1" : "0");
      if (productIsLicense) {
        formData.append("licenseType", licenseFields.licenseType);
      }
      formData.append("caracteristicas", JSON.stringify(caracteristicas));

      appendCatalogWarrantyToFormData(formData, warrantyState, {
        providerId,
        isPC: productIsPc,
      });

      const initialUrls = initialImageUrlsRef.current;
      const imagesChanged =
        newImageFiles.length > 0 ||
        keptRemoteUrls.length !== initialUrls.length ||
        keptRemoteUrls.some((url, index) => url !== initialUrls[index]);

      if (imagesChanged) {
        formData.append("image_url", JSON.stringify(keptRemoteUrls));
        newImageFiles.forEach((file) => formData.append("files", file));
      }

      const resp = await requestPostProveedores(
        formData,
        "/editProductPcinbox",
        { silent: true },
      );

      if (resp.status !== 200) {
        setDataModal({
          isOpen: true,
          loading: false,
          type: "error",
          content:
            resp?.data?.message ||
            "No se pudo actualizar el producto. Intenta de nuevo.",
          title: "Error",
          showActions: true,
          onClose: () => {
            setDataModal((prev) => ({ ...prev, isOpen: false }));
          },
          onConfirm: () => {
            setDataModal((prev) => ({ ...prev, isOpen: false }));
          },
        });
        return;
      }

      const data = resp.data;
      const updatedProduct =
        data?.data?.data ?? data?.data ?? null;

      if (imagesChanged) {
        const nextUrls = remoteImageUrls(
          updatedProduct?.image_url ??
            updatedProduct?.imageUrl ??
            keptRemoteUrls,
        );
        productImages.forEach((url) => {
          if (url.startsWith("blob:")) URL.revokeObjectURL(url);
        });
        setNewImageFiles([]);
        setProductImages(nextUrls);
        initialImageUrlsRef.current = nextUrls;
        updateCurrentProduct((item) => ({ ...item, image_url: nextUrls }));
      }

      setDataModal({
        isOpen: true,
        loading: false,
        type: "success",
        content: data.message || "Producto actualizado correctamente",
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
        loading: false,
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
    if (!imageError || !imageSectionRef.current) return;
    imageSectionRef.current.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [imageError]);

  useEffect(() => {
    productImages.forEach((url) => {
      if (url.startsWith("blob:")) URL.revokeObjectURL(url);
    });
    const initialUrls = remoteImageUrls(dataProductProp.image_url);
    initialImageUrlsRef.current = initialUrls;
    setNewImageFiles([]);
    setProductImages(initialUrls);
    setImageError(null);

    const caracs = parseCaracteristicasRaw(dataProductProp.caracteristicas);
    const tipo = productIsPc ? extractTipo(caracs) : null;
    setSelectedPcTipo(tipo);
    if (tipo) setValue("Tipo", tipo);
    setBulkText(
      caracteristicasToTextarea(caracs, {
        stripLicenseControlled: productIsLicense,
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- snapshot al abrir editar
  }, [dataProductProp.idProduct]);

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(handleEditProduct)}
      data-testid="form-edit-product"
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        minWidth: { xs: "100%", sm: "700px" },
        padding: "10px",
        textAlign: "left",
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
                getOptionLabel={(option) => option.name || ""}
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

      <TextField
        required
        label="SKU"
        type="text"
        variant="outlined"
        fullWidth
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

      <ProductImagesField
        sectionRef={imageSectionRef}
        previews={productImages}
        error={imageError}
        inputTestId="edit-file-input"
        triggerTestId="edit-file-input-trigger"
        errorTestId="edit-image-error"
        imagesTestId="edit-product-images"
        imageItemTestIdPrefix="edit-image"
        removeTestIdPrefix="edit-remove-image"
        onAddFiles={(incoming) => {
          const { accepted, error } = takeFilesWithinLimit(
            productImages.length,
            incoming,
          );
          setImageError(error);
          if (!accepted.length) return;
          const previewUrls = accepted.map((file) => URL.createObjectURL(file));
          setNewImageFiles((prev) => [...prev, ...accepted]);
          syncImages((prev) => [...prev, ...previewUrls]);
        }}
        onRemove={(indexImg) => {
          const removed = productImages[indexImg];
          if (removed?.startsWith("blob:")) {
            URL.revokeObjectURL(removed);
            const blobIndex = productImages
              .slice(0, indexImg)
              .filter((u) => u.startsWith("blob:")).length;
            setNewImageFiles((files) =>
              files.filter((_, i) => i !== blobIndex),
            );
          }
          const next = productImages.filter((_, i) => i !== indexImg);
          setImageError(validateProductImagesCount(next.length));
          syncImages(() => next);
        }}
      />

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

      <CatalogWarrantyFields
        providerId={dataProductProp?.providerId}
        isPC={productIsPc}
        value={warrantyState}
        onChange={(next) => {
          setWarrantyState(next);
          const amount = Number(next.amount);
          const monthsFromUi =
            next.choice === "months" && Number.isFinite(amount) && amount > 0
              ? Math.round(amount)
              : next.choice === "years" && Number.isFinite(amount) && amount > 0
                ? Math.round(amount) * 12
                : null;
          updateCurrentProduct((item) => ({
            ...item,
            warrantyMode:
              next.choice === "none" || next.choice === "service_center"
                ? next.choice
                : next.choice
                  ? "months"
                  : null,
            warrantyMonths: monthsFromUi,
          }));
        }}
      />

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
            productIsLicense
              ? "Los campos de licencia (edición, modalidad, vigencia, etc.) no van aquí: se guardan con los selectores de arriba."
              : productIsPc
                ? "El tipo de PC no aparece aquí: se guarda con el selector de arriba."
                : undefined
          }
        />
      </Stack>

      <StickyFormAction>
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
      </StickyFormAction>
    </Box>
  );
};

export default FormProduct;
