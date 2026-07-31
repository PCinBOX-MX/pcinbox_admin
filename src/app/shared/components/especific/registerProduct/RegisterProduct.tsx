"use client";
import {
  Dispatch,
  FormEventHandler,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Autocomplete,
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
import ProveedoresUtils from "@/app/services/utils/proveedores.utils";
import { ProductsI } from "@/app/interfaces/products/products.interface";
import { useTheContext } from "@/app/hooks/global.hook";
import { MdAdd, MdRemove } from "react-icons/md";
import { Controller, useForm } from "react-hook-form";
import rpStyles from "./registerProduct.module.css";

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
  const containerRef = useRef<HTMLDivElement>(null);
  const containerRef2 = useRef<HTMLDivElement>(null);

  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [selectedMarca, setSelectedMarca] = useState<number>(0);

  const [selectedCategoria, setSelectedCategoria] = useState<number>(0);
  const { dataProveedores } = useTheContext();

  const { control } = useForm();

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
  });
  const [typeProduct, setTypeProduct] = useState("");

  const [loadinNewProduct, setLoadingNewProduct] = useState<boolean>(false);

  const { requestPostProveedores } = ProveedoresUtils();

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

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;

    if (!form.checkValidity()) {
      alert("Completa los campos");
      return;
    }

    if (
      (typeProduct == "component" &&
        dataNewComponent &&
        dataNewComponent.image_url.length == 0) ||
      (typeProduct == "pcgamer" &&
        dataNewPcGamer &&
        dataNewPcGamer.image_url.length == 0)
    ) {
      alert("Sube por lo menos 1 imagen");
      return;
    }

    try {
      setLoadingNewProduct(true);

      const formData = new FormData();

      if (typeProduct?.toLowerCase() === "component") {
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

        const filesArray = Array.from(files || []);
        filesArray.forEach((file) => formData.append("files", file));
        formData.append("providerId", dataNewComponent.providerId.toString());
        formData.append("isPc", "0");
        formData.append(
          "caracteristicas",
          typeof dataNewComponent.caracteristicas === 'string' 
            ? dataNewComponent.caracteristicas 
            : JSON.stringify(dataNewComponent.caracteristicas)
        );
      } else if (typeProduct?.toLowerCase() === "pcgamer") {
        formData.append("name", dataNewPcGamer.name);
        formData.append("description", dataNewPcGamer.description);
        formData.append("newPrice", dataNewPcGamer.price.toString());
        formData.append("sku", dataNewPcGamer.sku);
        formData.append("stock", dataNewPcGamer.stock.toString());
        formData.append("clave", dataNewComponent?.clave || "");
        formData.append("upc", dataNewComponent?.upc || "");

        formData.append(
          "caracteristicas",
          JSON.stringify(dataNewPcGamer.caracteristicas),
        );

        const filesArray = Array.from(files || []);
        filesArray.forEach((file) => formData.append("files", file));
        formData.append("providerId", dataNewComponent.providerId.toString());
        formData.append("isPc", "1");
      }

      const resp = await requestPostProveedores(formData, "/newProductPcinbox");
      setLoadingNewProduct(false);

      if (resp.status == 200) {
        const data = resp.data;
        setDataModal({
          isOpen: true,
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

        setProductsProveedor((prev) => {
          const newProduct = data.data.data;
          const newData = [newProduct, ...prev.data];
          return { ...prev, data: newData, copyData: newData };
        });
      }
    } catch (error) {
      setLoadingNewProduct(false);
      alert(
        typeProduct?.toLowerCase() === "component"
          ? `La clave ${dataNewComponent.clave} ya existe u ocurrió un error inesperado `
          : "Ocurrió un error",
      );
    }
  };

  useEffect(() => {
    if (files.length > 5) {
      setFiles((prev) => prev.slice(0, 5));
    }
  }, [files]);

  useEffect(() => {
    const newUrls = files.map((file) => URL.createObjectURL(file));
    setPreviewUrls(newUrls);

    // Limpia las URLs anteriores al desmontar o actualizar
    return () => {
      newUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  return (
    <form
      onSubmit={handleSubmit}
      className="admin-form-shell"
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
        </select>
      </div>

      {typeProduct == "component" ? (
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
                options={dataMarca || []} // tu array de marcas
                getOptionLabel={(option: any) =>
                  `${option.name} ${
                    option.description == null ? "" : option.description
                  }`
                } // cómo mostrar cada opción
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
                        if (index >= 0) newStocks[index].stock = stockVal;
                        else newStocks.push({ tienda: sucursal, stock: stockVal });
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
                        if (index >= 0) newStocks[index].stock = stockVal;
                        else newStocks.push({ tienda: sucursal, stock: stockVal });
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
          <div
            style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", width: "100%" }}
          >
            <TextField
              required
              label="SKU"
              type="text"
              variant="outlined"
              name="sku"
              value={dataNewComponent.sku || ""}
              onChange={(event) =>
                setDataNewComponent((prev) => ({
                  ...prev,
                  sku: event.target.value,
                }))
              }
            />

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
                setDataNewComponent((prev) => ({
                  ...prev,
                  image_url: fileList as any,
                }));
                setFiles((prev) => [...prev, ...fileList]);
                event.target.value = "";
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

          <div
            className="admin-row admin-row--wrap admin-mb-md"
          >
            {files.map((file, indexFile) => {
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
                      onClick={() => handleRemoveFile(indexFile)}
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  </CardActions>
                </Card>
              );
            })}
          </div>

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
                      />
                    )}
                  />
                )}
              />
            </FormControl>

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
          <div className="admin-row admin-mb-md">
            <TextField
              label="Características"
              multiline
              rows={4}
              variant="outlined"
              name="caracteristicas"
              value={typeof dataNewComponent.caracteristicas === 'string' ? dataNewComponent.caracteristicas : ""}
              onChange={(event) =>
                setDataNewComponent((prev) => ({
                  ...prev,
                  caracteristicas: event.target.value,
                }))
              }
              fullWidth
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

          <div
            style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", width: "100%" }}
          >
            <TextField
              label="Existencia"
              type="number"
              variant="outlined"
              name="stock"
              value={dataNewPcGamer.stock ?? ""}
              onChange={(event) => {
                  setDataNewPcGamer((prev) => ({
                    ...prev,
                    stock: event.target.value === "" ? "" : Number(event.target.value),
                  }));
              }}
              required
            />
            <TextField
              label=""
              type="file"
              variant="outlined"
              name="image_url"
              onChange={(event) => {
                const files = (event.target as HTMLInputElement).files;
                if (!files) return;

                const fileList = Array.from(files);

                setDataNewPcGamer((prev) => ({
                  ...prev,
                  image_url: fileList, // guarda ambos tipos
                }));

                setFiles((prev) => [...prev, ...fileList]);
                event.target.value = ""; // limpia input
              }}
              slotProps={{
                htmlInput: {
                  multiple: true,
                  max: 5,
                  accept: "image/*,video/*",
                },
              }}
            />
          </div>

          <div
            style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", width: "100%" }}
          >
            <TextField
              label="UPC"
              variant="outlined"
              name="name"
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

            <FormControl fullWidth>
              <Controller
                name="Tipo"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    fullWidth
                    options={[
                      {
                        tipo: "Oficina y Gaming",
                        label: "Laptops, Escritorios y sillas Gamer",
                      },
                      { tipo: "workStation", label: "PC Estación de trabajo" },
                      // { tipo: "", label: "" },
                      { tipo: "pro", label: "Pc Gamer Pro" },
                      { tipo: "intermedia", label: "Pc Gamer Intermedio" },
                      { tipo: "entrada", label: "Pc Gamer de entrada" },
                    ]}
                    value={
                      [
                        {
                          tipo: "Oficina y Gaming",
                          label: "Laptops, Escritorios y sillas Gamer",
                        },
                        {
                          tipo: "workStation",
                          label: "PC Estación de trabajo",
                        },
                        // { tipo: "", label: "" },
                        { tipo: "pro", label: "Pc Gamer Pro" },
                        { tipo: "intermedia", label: "Pc Gamer Intermedio" },
                        { tipo: "entrada", label: "Pc Gamer de entrada" },
                      ].find((p: any) => p.tipo == field.value) || null
                    }
                    onChange={(event, newValue) => {
                      const id = newValue ? newValue.tipo : null;

                      field.onChange(id);
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

          <div
            className="admin-row admin-row--wrap"
            style={{ marginBottom: "16px", padding: 0 }}
          >
            {files.map((file, indexFile) => {
              const fileUrl = previewUrls[indexFile];
              const isVideo = file.type.startsWith("video/");

              return (
                <Card key={indexFile} sx={{ position: "relative", width: 130 }}>
                  {isVideo ? (
                    <video
                      src={fileUrl}
                      controls
                      style={{
                        width: "100%",
                        height: 80,
                        objectFit: "cover",
                        borderRadius: 4,
                      }}
                    />
                  ) : (
                    <CardMedia
                      component="img"
                      image={fileUrl}
                      alt={file.name}
                      sx={{ height: 80, objectFit: "cover" }}
                    />
                  )}

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
                      onClick={() => handleRemoveFile(indexFile)}
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  </CardActions>
                </Card>
              );
            })}
          </div>

          <div className="admin-row admin-mb-md">
            <TextField
              label="Características"
              multiline
              rows={4}
              variant="outlined"
              name="caracteristicas"
              value={typeof dataNewPcGamer.caracteristicas === 'string' ? dataNewPcGamer.caracteristicas : ''}
              onChange={(event) => {
                setDataNewPcGamer((prev) => ({
                  ...prev,
                  caracteristicas: event.target.value as any,
                }));
              }}
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
            bottom: "-16px",
            background: "linear-gradient(to bottom, rgba(255,255,255,0.9), #ffffff)",
            paddingBottom: "16px",
            zIndex: 10,
            borderTop: "1px solid #f3f4f6"
          }}
        >
          <button
            disabled={loadinNewProduct}
            type="submit"
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
