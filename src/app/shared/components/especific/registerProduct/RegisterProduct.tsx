"use client";
import { useEffect, useRef, useState } from "react";
import {
  Autocomplete,
  Button,
  FormControl,
  MenuItem,
  TextField,
} from "@mui/material";
import ProveedoresUtils from "@/app/services/utils/proveedores.utils";
import { useTheContext } from "@/app/hooks/global.hook";
import { MdAdd, MdRemove } from "react-icons/md";
import { Controller, useForm } from "react-hook-form";
import rpStyles from "./registerProduct.module.css";
import {
  buildPcCaracteristicas,
  PC_TIPO_OPTIONS,
  serializeCaracteristicas,
  stripTipoLinesFromText,
} from "@/app/utils/caracteristicas.utils";
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
import CatalogWarrantyFields from "../CatalogWarrantyFields";
import {
  appendCatalogWarrantyToFormData,
  CatalogWarrantyState,
  validateCatalogWarranty,
} from "@/app/shared/utils/catalogWarranty";

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
  "SOFTWARE",
];

type LicenseFields = {
  licenseType: string;
  edition: string;
  modality: string;
  duration: string;
  coverageUnit: string;
  seats: string;
  language: string;
  architecture: string;
};

interface DataNewProductI {
  name: string;
  clave?: string;
  description: string;
  marca: number;
  categoria: number;
  stock: number | string;
  sku: string;
  price: number | string;
  image_url: File[];
  upc?: string;
  providerId: number;
  caracteristicas: string | { prop: string; value: string }[];
  originPrice?: number | string;
  profitMargin?: number | string;
  branchStocks?: { tienda: string; stock: number | string }[];
}

const RegisterProduct = () => {
  const { setDataModal, dataMarca, dataCategoria, setProductsProveedor } =
    useTheContext();
  const [files, setFiles] = useState<File[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const containerRef2 = useRef<HTMLDivElement>(null);
  const imageSectionRef = useRef<HTMLDivElement>(null);

  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [selectedMarca, setSelectedMarca] = useState<number>(0);

  const [selectedCategoria, setSelectedCategoria] = useState<number>(0);
  const { dataProveedores } = useTheContext();

  const { control, setValue } = useForm();

  const [dataNewComponent, setDataNewComponent] = useState<DataNewProductI>({
    name: "",
    description: "",
    clave: "",
    marca: 0,
    categoria: 0,
    stock: 0,
    sku: "",
    price: 0,
    image_url: [],
    providerId: 1,
    caracteristicas: "",
    originPrice: 0,
    profitMargin: 0,
    branchStocks: [],
  });

  const [dataNewPcGamer, setDataNewPcGamer] = useState<{
    name: string;
    description: string;
    stock: number | string;
    sku: string;
    price: number | string;
    image_url: File[];
    upc?: string;
    providerId: number;
    clave?: string;
    caracteristicas: { prop: string; value: string }[];
  }>({
    name: "",
    description: "",
    stock: 0,
    sku: "",
    price: 0,
    image_url: [],
    caracteristicas: [],
    upc: "",
    providerId: 1,
    clave: "",
  });
  /** Texto visible en el textarea (nunca incluye "tipo"). */
  const [pcGamerCaracteristicasText, setPcGamerCaracteristicasText] =
    useState("");
  /** Tipo de PC solo interno; se inyecta en caracteristicas al guardar. */
  const [selectedPcTipo, setSelectedPcTipo] = useState<string | null>(null);
  const [typeProduct, setTypeProduct] = useState("");
  const [licenseFields, setLicenseFields] = useState<LicenseFields>({
    licenseType: "",
    edition: "",
    modality: "",
    duration: "",
    coverageUnit: "",
    seats: "",
    language: "",
    architecture: "",
  });

  const [loadinNewProduct, setLoadingNewProduct] = useState<boolean>(false);
  const [warrantyState, setWarrantyState] = useState<CatalogWarrantyState>({
    choice: "",
    amount: "",
  });

  const { requestPostProveedores } = ProveedoresUtils();

  const handlePcTipoChange = (tipo: string | null) => {
    setValue("Tipo", tipo);
    setSelectedPcTipo(tipo);
    // Solo estado interno: el textarea no se toca.
    setDataNewPcGamer((prev) => ({
      ...prev,
      caracteristicas: buildPcCaracteristicas(
        pcGamerCaracteristicasText,
        tipo,
      ),
    }));
  };

  const handlePcCaracteristicasTextChange = (text: string) => {
    // Si pegan "tipo: ...", se elimina del textarea para que no lo editen.
    const cleaned = stripTipoLinesFromText(text);
    setPcGamerCaracteristicasText(cleaned);
    setDataNewPcGamer((prev) => ({
      ...prev,
      caracteristicas: buildPcCaracteristicas(cleaned, selectedPcTipo),
    }));
  };

  const resetMediaState = () => {
    setFiles([]);
    setPreviewUrls([]);
    setImageError(null);
    setDataNewComponent((prev) => ({ ...prev, image_url: [] }));
    setDataNewPcGamer((prev) => ({ ...prev, image_url: [] }));
  };

  const syncFiles = (next: File[]) => {
    setFiles(next);
    setDataNewComponent((c) => ({ ...c, image_url: next }));
    setDataNewPcGamer((p) => ({ ...p, image_url: next }));
  };

  const handleAddFiles = (incoming: File[]) => {
    const { accepted, error } = takeFilesWithinLimit(files.length, incoming);
    setImageError(error);
    if (!accepted.length) return;
    syncFiles([...files, ...accepted]);
  };

  const handleRemoveFile = (index: number) => {
    const next = files.filter((_, i) => i !== index);
    syncFiles(next);
    setImageError(validateProductImagesCount(next.length));
  };

  const calculateFinalPrice = (cost: number, margin: number) => {
    const IVA = 0.16;
    const OPENPAY_PERCENT = 0.036;
    const OPENPAY_BASE = 3;
    const precioProveedor = cost * (1 + IVA);
    const precioConUtilidad = precioProveedor + Number(margin || 0);
    const comisionOpenPay = precioConUtilidad * OPENPAY_PERCENT;
    const precioFinal = precioConUtilidad + comisionOpenPay + OPENPAY_BASE;
    return Math.round(precioFinal * 100) / 100;
  };

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }

    if (containerRef2.current) {
      containerRef2.current.scrollTop = containerRef2.current.scrollHeight;
    }
  }, [dataNewPcGamer.caracteristicas, dataNewComponent.caracteristicas]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;

    if (!form.checkValidity()) {
      alert("Completa los campos");
      return;
    }

    const imagesValidationError = validateProductImagesCount(files.length);
    if (imagesValidationError) {
      setImageError(imagesValidationError);
      imageSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      return;
    }

    if (["component", "license"].includes(typeProduct?.toLowerCase())) {
      if (!dataNewComponent.categoria || !dataNewComponent.marca) {
        alert("Selecciona categoría y marca");
        return;
      }
    }
    if (
      typeProduct === "license" &&
      Object.values(licenseFields).some((value) => !value.trim())
    ) {
      alert("Completa todos los campos de la licencia");
      return;
    }

    if (typeProduct?.toLowerCase() === "pcgamer" && !selectedPcTipo) {
      alert("Selecciona el tipo de PC");
      return;
    }

    const warrantyProviderId =
      typeProduct === "license"
        ? 1
        : typeProduct?.toLowerCase() === "pcgamer"
          ? dataNewPcGamer.providerId
          : dataNewComponent.providerId;
    const warrantyIsPc = typeProduct?.toLowerCase() === "pcgamer";
    const warrantyError = validateCatalogWarranty(warrantyState, {
      providerId: warrantyProviderId,
      isPC: warrantyIsPc,
    });
    if (warrantyError) {
      alert(warrantyError);
      return;
    }

    try {
      setLoadingNewProduct(true);
      setDataModal((prev) => ({ ...prev, loading: true }));

      const formData = new FormData();

      if (["component", "license"].includes(typeProduct?.toLowerCase())) {
        formData.append("name", dataNewComponent.name);
        formData.append("clave", dataNewComponent?.clave || "");
        formData.append("description", dataNewComponent.description);
        
        const finalPrice = calculateFinalPrice(Number(dataNewComponent.originPrice || 0), Number(dataNewComponent.profitMargin || 0));
        formData.append("newPrice", dataNewComponent.providerId !== 1 ? finalPrice.toString() : (dataNewComponent.price || 0).toString());
        
        formData.append("sku", dataNewComponent.sku);
        formData.append("categoryId", dataNewComponent.categoria.toString());
        formData.append("marcaId", dataNewComponent.marca.toString());
        
        let finalStock = dataNewComponent.stock;
        if (dataNewComponent.providerId === 2 || dataNewComponent.providerId === 3) {
          finalStock = (dataNewComponent.branchStocks || []).reduce((acc, b) => acc + Number(b.stock || 0), 0);
        }
        formData.append("stock", finalStock.toString());
        formData.append("upc", dataNewComponent?.upc || "");

        if (dataNewComponent.providerId !== 1) {
          formData.append("originPrice", (dataNewComponent.originPrice || 0).toString());
          formData.append("profitMargin", (dataNewComponent.profitMargin || 0).toString());
          
          if (dataNewComponent.providerId === 2 || dataNewComponent.providerId === 3) {
            formData.append("branches", JSON.stringify(dataNewComponent.branchStocks || []));
          }
        }

        files.forEach((file) => formData.append("files", file));
        formData.append("providerId", dataNewComponent.providerId.toString());
        formData.append("isPc", "0");
        const baseCharacteristics = JSON.parse(
          serializeCaracteristicas(dataNewComponent.caracteristicas),
        );
        const licenseCharacteristics =
          typeProduct === "license"
            ? [
                { prop: "edicion", value: licenseFields.edition },
                { prop: "modalidad", value: licenseFields.modality },
                { prop: "vigencia", value: licenseFields.duration },
                { prop: "tipoCobertura", value: licenseFields.coverageUnit },
                { prop: "usuariosDispositivos", value: licenseFields.seats },
                { prop: "idioma", value: licenseFields.language },
                { prop: "arquitectura", value: licenseFields.architecture },
              ]
            : [];
        formData.append(
          "caracteristicas",
          JSON.stringify([...baseCharacteristics, ...licenseCharacteristics]),
        );
        if (typeProduct === "license") {
          formData.append("licenseType", licenseFields.licenseType);
          formData.set("providerId", "1");
        }
      } else if (typeProduct?.toLowerCase() === "pcgamer") {
        formData.append("name", dataNewPcGamer.name);
        formData.append("description", dataNewPcGamer.description);
        formData.append("newPrice", dataNewPcGamer.price.toString());
        formData.append("sku", dataNewPcGamer.sku);
        formData.append("stock", dataNewPcGamer.stock.toString());
        formData.append("clave", dataNewPcGamer.clave || "");
        formData.append("upc", dataNewPcGamer.upc || "");

        const caracteristicasPayload = buildPcCaracteristicas(
          pcGamerCaracteristicasText,
          selectedPcTipo,
        );
        formData.append(
          "caracteristicas",
          JSON.stringify(caracteristicasPayload),
        );

        files.forEach((file) => formData.append("files", file));
        formData.append("providerId", dataNewPcGamer.providerId.toString());
        formData.append("isPc", "1");
      }

      appendCatalogWarrantyToFormData(formData, warrantyState, {
        providerId: warrantyProviderId,
        isPC: warrantyIsPc,
      });

      const resp = await requestPostProveedores(formData, "/newProductPcinbox", {
        silent: true,
      });
      setLoadingNewProduct(false);

      if (resp.status == 200) {
        const data = resp.data;
        setProductsProveedor((prev) => {
          const newProduct = data?.data?.data ?? data?.data;
          if (!newProduct) return prev;
          const newData = [newProduct, ...prev.data];
          return { ...prev, data: newData, copyData: newData };
        });
        setDataModal({
          isOpen: true,
          loading: false,
          type: "success",
          title: "Correcto",
          content: "Producto dado de alta correctamente",
          showActions: true,
          onClose: () => {
            setDataModal((prev) => ({
              ...prev,
              isOpen: false,
            }));
          },
          onConfirm: () => {
            setDataModal((prev) => ({
              ...prev,
              isOpen: false,
            }));
          },
        });
      } else {
        setDataModal({
          isOpen: true,
          loading: false,
          type: "error",
          title: "No se dio de alta el producto",
          content:
            resp?.data?.message ||
            "No pudimos registrar el producto. Revisa los datos e intenta de nuevo.",
          showActions: true,
          onClose: () => {
            setDataModal((prev) => ({ ...prev, isOpen: false }));
          },
          onConfirm: () => {
            setDataModal((prev) => ({ ...prev, isOpen: false }));
          },
        });
      }
    } catch (error: any) {
      setLoadingNewProduct(false);
      setDataModal({
        isOpen: true,
        loading: false,
        type: "error",
        title: "No se dio de alta el producto",
        content:
          error?.response?.data?.message ||
          (typeProduct?.toLowerCase() === "component"
            ? `La clave ${dataNewComponent.clave} ya existe u ocurrió un error inesperado.`
            : "Ocurrió un error al registrar el producto. Intenta de nuevo."),
        showActions: true,
        onClose: () => {
          setDataModal((prev) => ({ ...prev, isOpen: false }));
        },
        onConfirm: () => {
          setDataModal((prev) => ({ ...prev, isOpen: false }));
        },
      });
    }
  };

  useEffect(() => {
    const newUrls = files.map((file) => URL.createObjectURL(file));
    setPreviewUrls(newUrls);

    return () => {
      newUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  useEffect(() => {
    resetMediaState();
    setSelectedPcTipo(null);
    setPcGamerCaracteristicasText("");
    setValue("Tipo", null);
    if (typeProduct === "license") {
      const software = dataCategoria.find(
        (category: any) =>
          category.name?.trim().toUpperCase() === "SOFTWARE",
      );
      const categoryId = Number(software?.idCategorie || 0);
      setSelectedCategoria(categoryId);
      setDataNewComponent((previous) => ({
        ...previous,
        providerId: 1,
        categoria: categoryId,
      }));
      setValue("Proveedor", 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeProduct]);

  return (
    <form
      onSubmit={handleSubmit}
      className="admin-form-shell"
      data-testid="form-register-product"
      style={{ display: "flex", flexDirection: "column", gap: "16px", background: "#ffffff", padding: "16px 20px", borderRadius: "16px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)", width: "100%" }}
    >
      <style>{`
        form.admin-form-shell .MuiFormControl-root,
        form.admin-form-shell .MuiTextField-root {
          width: 100% !important;
        }
      `}</style>
      <div className={rpStyles.fieldGroup}>
        <label htmlFor="select-tipo-producto" className={rpStyles.fieldLabel}>
          Tipo de producto{" "}
          <span className={rpStyles.required} aria-hidden="true">*</span>
        </label>
        <select
          id="select-tipo-producto"
          name="type-product"
          data-testid="select-tipo-producto"
          required
          value={typeProduct}
          onChange={(event) => setTypeProduct(event.target.value)}
          className={rpStyles.fieldSelect}
        >
          <option value="" disabled>
            Selecciona una opción
          </option>
          <option value="component">Componente</option>
          <option value="pcgamer">
            PC Gamers y Workstation
          </option>
          <option value="license">
            Licencias (Windows, Antivirus y Paquetería Office)
          </option>
        </select>
      </div>

      {typeProduct === "component" || typeProduct === "license" ? (
        <>
          <div
            style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", width: "100%" }}
          >
            <TextField
              label="Nombre"
              variant="outlined"
              name="name"
              value={dataNewComponent?.name || ""}
              onChange={(event) => {
                setDataNewComponent((prev) => ({
                  ...prev,
                  name: event.target.value,
                }));
              }}
              required
            />

            <TextField
              label="Descripción"
              type="text"
              variant="outlined"
              name="description"
              value={dataNewComponent?.description || ""}
              onChange={(event) => {
                setDataNewComponent((prev) => ({
                  ...prev,
                  description: event.target.value,
                }));
              }}
            />

            <FormControl fullWidth>
              <Autocomplete
                fullWidth
                disabled={typeProduct === "license"}
                options={(dataCategoria || []).filter((c: any) => ALLOWED_CATEGORIES.includes(c.name?.trim().toUpperCase()))}
                getOptionLabel={(option: any) =>
                  `${option.name} ${
                    option.description == null ? "" : option.description
                  }`
                } // cómo mostrar cada opción
                value={
                  dataCategoria.find(
                    (m: any) => m.idCategorie === selectedCategoria,
                  ) || null
                }
                onChange={(_, newValue) => {
                  const id = newValue ? newValue.idCategorie : null;
                  setSelectedCategoria(id);
                  setDataNewComponent((prev) => ({
                    ...prev,
                    categoria: id,
                  }));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Categoria"
                    name="categoria"
                    placeholder="Buscar categoría"
                    required
                  />
                )}
              />
            </FormControl>
          </div>

          <div
            style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", width: "100%" }}
          >
            <FormControl fullWidth>
              <Autocomplete
                fullWidth
                options={dataMarca || []}
                getOptionLabel={(option: any) => option.name || ""}
                value={
                  dataMarca.find((m: any) => m.idMarca === selectedMarca) ||
                  null
                }
                onChange={(_, newValue) => {
                  const id = newValue ? newValue.idMarca : null;
                  setSelectedMarca(id);
                  setDataNewComponent((prev) => ({
                    ...prev,
                    marca: id,
                  }));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Marca"
                    name="marca"
                    placeholder="Buscar marca"
                    required
                  />
                )}
              />
            </FormControl>
            {dataNewComponent.providerId === 1 ? (
              <TextField
                label="Existencia"
                type="number"
                variant="outlined"
                name="stock"
                value={dataNewComponent?.stock ?? ""}
                onChange={(event) => {
                  setDataNewComponent((prev) => ({
                    ...prev,
                    stock: event.target.value === "" ? "" : Number(event.target.value),
                  }));
                }}
                required
              />
            ) : (
              <>
                {dataNewComponent.providerId === 2 && ["GDL", "CDMX"].map((sucursal) => (
                  <TextField
                    key={sucursal}
                    label={`Stock ${sucursal}`}
                    type="number"
                    variant="outlined"
                    value={dataNewComponent.branchStocks?.find(b => b.tienda === sucursal)?.stock ?? ""}
                    onChange={(event) => {
                      const stockVal = event.target.value === "" ? "" : Number(event.target.value);
                      setDataNewComponent((prev) => {
                        const currentStocks = prev.branchStocks || [];
                        const index = currentStocks.findIndex(b => b.tienda === sucursal);
                        const newStocks = [...currentStocks];
                        if (index >= 0) {
                          newStocks[index] = { ...newStocks[index], stock: stockVal };
                        } else {
                          newStocks.push({ tienda: sucursal, stock: stockVal });
                        }
                        return { ...prev, branchStocks: newStocks };
                      });
                    }}
                    required
                  />
                ))}
                {dataNewComponent.providerId === 3 && ["leon2", "santafe"].map((sucursal) => (
                  <TextField
                    key={sucursal}
                    label={`Stock ${sucursal}`}
                    type="number"
                    variant="outlined"
                    value={dataNewComponent.branchStocks?.find(b => b.tienda === sucursal)?.stock ?? ""}
                    onChange={(event) => {
                      const stockVal = event.target.value === "" ? "" : Number(event.target.value);
                      setDataNewComponent((prev) => {
                        const currentStocks = prev.branchStocks || [];
                        const index = currentStocks.findIndex(b => b.tienda === sucursal);
                        const newStocks = [...currentStocks];
                        if (index >= 0) {
                          newStocks[index] = { ...newStocks[index], stock: stockVal };
                        } else {
                          newStocks.push({ tienda: sucursal, stock: stockVal });
                        }
                        return { ...prev, branchStocks: newStocks };
                      });
                    }}
                    required
                  />
                ))}
              </>
            )}

            {dataNewComponent.providerId === 1 ? (
              <TextField
                required
                label="Precio"
                type="number"
                variant="outlined"
                name="price"
                value={dataNewComponent?.price ?? ""}
                onChange={(event) =>
                  setDataNewComponent((prev) => ({
                    ...prev,
                    price: event.target.value === "" ? "" : Number(event.target.value),
                  }))
                }
              />
            ) : (
              <>
                <TextField
                  required
                  label="Costo Unitario ($)"
                  type="number"
                  variant="outlined"
                  value={dataNewComponent?.originPrice ?? ""}
                  onChange={(event) =>
                    setDataNewComponent((prev) => ({
                      ...prev,
                      originPrice: event.target.value === "" ? "" : Number(event.target.value),
                    }))
                  }
                />
                <TextField
                  required
                  label="Margen de Utilidad ($)"
                  type="number"
                  variant="outlined"
                  value={dataNewComponent?.profitMargin ?? ""}
                  onChange={(event) =>
                    setDataNewComponent((prev) => ({
                      ...prev,
                      profitMargin: event.target.value === "" ? "" : Number(event.target.value),
                    }))
                  }
                />
                <TextField
                  label="Precio Público Calculado"
                  type="number"
                  variant="outlined"
                  disabled
                  value={calculateFinalPrice(Number(dataNewComponent?.originPrice ?? 0), Number(dataNewComponent?.profitMargin ?? 0))}
                />
              </>
            )}
          </div>
          <TextField
            required
            label="SKU"
            type="text"
            variant="outlined"
            name="sku"
            fullWidth
            value={dataNewComponent.sku || ""}
            onChange={(event) =>
              setDataNewComponent((prev) => ({
                ...prev,
                sku: event.target.value,
              }))
            }
          />

          <ProductImagesField
            sectionRef={imageSectionRef}
            previews={previewUrls}
            files={files}
            error={imageError}
            accept="image/*"
            inputTestId="register-file-input"
            triggerTestId="register-file-input-trigger"
            errorTestId="register-image-error"
            imagesTestId="register-product-images"
            imageItemTestIdPrefix="register-image"
            removeTestIdPrefix="register-remove-image"
            onAddFiles={handleAddFiles}
            onRemove={handleRemoveFile}
          />

          <div
            style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", width: "100%" }}
          >
            <TextField
              required
              label="UPC"
              type="text"
              variant="outlined"
              name="upc"
              value={dataNewComponent?.upc || ""}
              onChange={(event) =>
                setDataNewComponent((prev) => ({
                  ...prev,
                  upc: event.target.value,
                }))
              }
            />

            <FormControl fullWidth>
              <Controller
                name="Proveedor"
                control={control}
                defaultValue={1}
                render={({ field }) => (
                  <Autocomplete
                    fullWidth
                    disabled={typeProduct === "license"}
                    data-testid="register-provider"
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
                      if (typeProduct === "license") return;
                      const id = newValue ? newValue.idProvider : null;

                      field.onChange(id);

                      setDataNewComponent((prev) => ({
                        ...prev,
                        providerId: Number(id),
                      }));
                    }}
                    getOptionLabel={(option) => `${option.companyName}`}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Proveedor"
                        placeholder="Buscar Proveedor"
                        disabled={typeProduct === "license"}
                        inputProps={{
                          ...params.inputProps,
                          "data-testid": "register-provider-input",
                        }}
                      />
                    )}
                  />
                )}
              />
            </FormControl>

            <div style={{ gridColumn: "1 / -1" }}>
              <CatalogWarrantyFields
                providerId={
                  typeProduct === "license" ? 1 : dataNewComponent.providerId
                }
                isPC={false}
                value={warrantyState}
                onChange={setWarrantyState}
              />
            </div>

            <TextField
              required
              label="Clave"
              type="text"
              variant="outlined"
              name="calve"
              value={dataNewComponent?.clave || ""}
              onChange={(event) =>
                setDataNewComponent((prev) => ({
                  ...prev,
                  clave: event.target.value,
                }))
              }
            />
          </div>
          {typeProduct === "license" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: "12px",
                width: "100%",
              }}
              data-testid="license-fields"
            >
              <TextField
                select
                label="Bloque de licencia"
                value={licenseFields.licenseType}
                onChange={(event) =>
                  setLicenseFields((previous) => ({
                    ...previous,
                    licenseType: event.target.value,
                  }))
                }
                required
                slotProps={{
                  inputLabel: { shrink: true },
                  htmlInput: { "data-testid": "license-type" },
                }}
              >
                <MenuItem value="" disabled>
                  Selecciona una opción
                </MenuItem>
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
                  slotProps={{
                    inputLabel: { shrink: true },
                    htmlInput: { "data-testid": `license-${key}` },
                  }}
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
                  value={licenseFields[key as keyof LicenseFields]}
                  onChange={(event) =>
                    setLicenseFields((previous) => ({
                      ...previous,
                      [key]: event.target.value,
                    }))
                  }
                  required
                  type={key === "seats" ? "number" : "text"}
                  slotProps={{
                    htmlInput: {
                      "data-testid": `license-${key}`,
                      ...(key === "seats" ? { min: 1, step: 1 } : {}),
                    },
                  }}
                />
              ))}
            </div>
          )}
          <div className="admin-row admin-mb-md">
            <TextField
              label="Características (propiedad: valor, una por línea)"
              multiline
              rows={4}
              variant="outlined"
              name="caracteristicas"
              value={
                typeof dataNewComponent.caracteristicas === "string"
                  ? dataNewComponent.caracteristicas
                  : ""
              }
              onChange={(event) =>
                setDataNewComponent((prev) => ({
                  ...prev,
                  caracteristicas: event.target.value,
                }))
              }
              fullWidth
              placeholder={"Procesador: AMD Ryzen 7...\nMemoria RAM: 32 GB..."}
            />
          </div>
        </>
      ) : typeProduct == "pcgamer" ? (
        <>
          <div
            style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", width: "100%" }}
          >
            <TextField
              label="Nombre"
              variant="outlined"
              name="name"
              value={dataNewPcGamer?.name || ""}
              onChange={(event) => {
                setDataNewPcGamer((prev) => ({
                  ...prev,
                  name: event.target.value,
                }));
              }}
              required
            />

            <TextField
              label="Descripción"
              type="text"
              variant="outlined"
              name="description"
              value={dataNewPcGamer?.description || ""}
              onChange={(event) => {
                setDataNewPcGamer((prev) => ({
                  ...prev,
                  description: event.target.value,
                }));
              }}
            />

            <TextField
              required
              label="SKU"
              type="text"
              variant="outlined"
              name="sku"
              value={dataNewPcGamer?.sku || ""}
              onChange={(event) =>
                setDataNewPcGamer((prev) => ({
                  ...prev,
                  sku: event.target.value,
                }))
              }
            />
            <TextField
              required
              label="Precio"
              type="number"
              variant="outlined"
              name="price"
              value={dataNewPcGamer.price === 0 ? "" : dataNewPcGamer.price}
              onChange={(event) =>
                  setDataNewPcGamer((prev) => ({
                    ...prev,
                    price: event.target.value === "" ? "" : Number(event.target.value),
                  }))
              }
            />
          </div>

          <TextField
            label="Existencia"
            type="number"
            variant="outlined"
            name="stock"
            fullWidth
            value={dataNewPcGamer.stock ?? ""}
            onChange={(event) => {
              setDataNewPcGamer((prev) => ({
                ...prev,
                stock:
                  event.target.value === "" ? "" : Number(event.target.value),
              }));
            }}
            required
          />

          <ProductImagesField
            sectionRef={imageSectionRef}
            previews={previewUrls}
            files={files}
            error={imageError}
            accept="image/*,video/*"
            inputTestId="register-pc-file-input"
            triggerTestId="register-pc-file-input-trigger"
            errorTestId="register-pc-image-error"
            imagesTestId="register-pc-product-images"
            imageItemTestIdPrefix="register-pc-image"
            removeTestIdPrefix="register-pc-remove-image"
            onAddFiles={handleAddFiles}
            onRemove={handleRemoveFile}
          />

          <div
            style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", width: "100%" }}
          >
            <TextField
              label="UPC"
              variant="outlined"
              name="upc"
              value={dataNewPcGamer?.upc || ""}
              onChange={(event) => {
                setDataNewPcGamer((prev) => ({
                  ...prev,
                  upc: event.target.value,
                }));
              }}
            />

            <FormControl fullWidth>
              <Controller
                name="Proveedor"
                control={control}
                defaultValue={1}
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

                      setDataNewPcGamer((prev) => ({
                        ...prev,
                        providerId: Number(id) || 1,
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

            <div style={{ gridColumn: "1 / -1" }}>
              <CatalogWarrantyFields
                providerId={dataNewPcGamer.providerId}
                isPC={true}
                value={warrantyState}
                onChange={setWarrantyState}
              />
            </div>

            <FormControl fullWidth>
              <Controller
                name="Tipo"
                control={control}
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
                      handlePcTipoChange(tipo);
                    }}
                    getOptionLabel={(option) => `${option.label}`}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Tipo de PC"
                        placeholder="Buscar Tipo de PC"
                        required
                      />
                    )}
                  />
                )}
              />
            </FormControl>
          </div>

          <div className="admin-row admin-mb-md">
            <TextField
              label="Características (propiedad: valor, una por línea)"
              multiline
              rows={4}
              variant="outlined"
              name="caracteristicas"
              value={pcGamerCaracteristicasText}
              onChange={(event) => {
                handlePcCaracteristicasTextChange(event.target.value);
              }}
              fullWidth
              inputProps={{ "data-testid": "register-caracteristicas-pc" }}
              placeholder={"Procesador: AMD Ryzen 7...\nMemoria RAM: 32 GB..."}
              helperText="El tipo de PC no aparece aquí: se guarda solo al elegir el selector de arriba."
            />
          </div>
        </>
      ) : (
        ""
      )}

      {typeProduct ? (
        <div
          className="admin-form-footer"
          style={{ 
            marginTop: "12px", 
            paddingTop: "16px", 
            display: "flex", 
            justifyContent: "flex-end",
            position: "sticky",
            bottom: 0,
            background: "#ffffff",
            paddingBottom: "28px",
            marginBottom: "-24px",
            marginLeft: "-8px",
            marginRight: "-8px",
            paddingLeft: "8px",
            paddingRight: "8px",
            zIndex: 20,
            borderTop: "1px solid #f3f4f6",
            boxShadow: "0 -8px 16px rgba(0,0,0,0.06), 0 40px 0 0 #ffffff",
          }}
        >
          <button
            disabled={loadinNewProduct}
            type="submit"
            data-testid="register-submit"
            style={{
              padding: "12px 28px",
              backgroundColor: "#bb3d4b",
              backgroundImage: "linear-gradient(135deg, #bb3d4b 0%, #9a2f3b 100%)",
              color: "white",
              fontWeight: "600",
              fontSize: "15px",
              border: "none",
              borderRadius: "10px",
              cursor: loadinNewProduct ? "not-allowed" : "pointer",
              boxShadow: "0 4px 14px rgba(187, 61, 75, 0.35)",
              opacity: loadinNewProduct ? 0.7 : 1,
              transition: "transform 0.2s ease, box-shadow 0.2s ease"
            }}
            onMouseEnter={(e) => {
              if (!loadinNewProduct) {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(187, 61, 75, 0.45)";
              }
            }}
            onMouseLeave={(e) => {
              if (!loadinNewProduct) {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = "0 4px 14px rgba(187, 61, 75, 0.35)";
              }
            }}
          >
            {loadinNewProduct ? "Guardando..." : "Agregar producto"}
          </button>
        </div>
      ) : null}
    </form>
  );
};

export default RegisterProduct;
