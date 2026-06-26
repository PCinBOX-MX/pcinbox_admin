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

interface DataNewProductI {
  name: string;
  clave?: string;
  description: string;
  marca: number;
  categoria: number;
  stock: number;
  sku: string;
  price: number;
  image_url: File[];
  upc?: string;
  providerId: number;
  caracteristicas: { prop: string; value: string }[];
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
    caracteristicas: [],
  });

  const [dataNewPcGamer, setDataNewPcGamer] = useState<{
    name: string;
    description: string;
    stock: number;
    sku: string;
    price: number;
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
        formData.append("newPrice", dataNewComponent.price.toString());
        formData.append("sku", dataNewComponent.sku);
        formData.append("categoryId", dataNewComponent.categoria.toString());
        formData.append("marcaId", dataNewComponent.marca.toString());
        formData.append("stock", dataNewComponent.stock.toString());
        formData.append("upc", dataNewComponent?.upc || "");

        const filesArray = Array.from(files || []);
        filesArray.forEach((file) => formData.append("files", file));
        formData.append("providerId", dataNewComponent.providerId.toString());
        formData.append("isPc", "0");
        formData.append(
          "caracteristicas",
          JSON.stringify(dataNewComponent.caracteristicas),
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

        setProductsProveedor((prev) => ({ ...prev, data: data.data.data }));
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
      style={{ margin: 0, padding: 0 }}
    >
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
            PC GAMER (Laptops, WorkStation, PC, etc.)
          </option>
        </select>
      </div>

      {typeProduct == "component" ? (
        <>
          <div
            className="admin-form-grid-3"
            style={{ marginBottom: "16px", padding: 0 }}
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
                options={dataCategoria || []}
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
            className="admin-form-grid-3"
            style={{ marginBottom: "16px", padding: 0 }}
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
            <TextField
              label="Existencia"
              type="number"
              variant="outlined"
              name="stock"
              value={dataNewComponent?.stock || ""}
              onChange={(event) => {
                setDataNewComponent((prev) => ({
                  ...prev,
                  stock: Number(event.target.value),
                }));
              }}
              required
            />
            <TextField
              required
              label="Precio"
              type="number"
              variant="outlined"
              name="price"
              value={dataNewComponent?.price || ""}
              onChange={(event) =>
                setDataNewComponent((prev) => ({
                  ...prev,
                  price: Number(event.target.value),
                }))
              }
            />
          </div>
          <div
            className="admin-form-grid-2"
            style={{ marginBottom: "16px", padding: 0 }}
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
            className="admin-row admin-row--wrap"
            style={{ marginBottom: "16px", padding: 0 }}
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
            className="admin-form-grid-3"
            style={{ marginBottom: "16px", padding: 0 }}
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
          <div
            className="admin-form-scroll-grid"
            style={{ marginBottom: "12px", padding: "12px 0" }}
            ref={containerRef2}
          >
            {dataNewComponent.caracteristicas &&
            dataNewComponent.caracteristicas.length > 0
              ? dataNewComponent.caracteristicas.map(
                  (car: any, indexCar: number) => {
                    return (
                      <div
                        key={indexCar}
                        className="admin-grid-form-actions"
                      >
                        <TextField
                          label="Caracteristica"
                          variant="outlined"
                          name="prop"
                          value={car.prop}
                          onChange={(event) => {
                            setDataNewComponent((prev) => ({
                              ...prev,
                              caracteristicas: prev.caracteristicas.map(
                                (item, indexPrevCar) =>
                                  indexPrevCar === indexCar
                                    ? { ...item, prop: event.target.value } // actualiza solo ese item
                                    : item,
                              ),
                            }));
                          }}
                        />

                        <TextField
                          label="Valor"
                          variant="outlined"
                          name="value"
                          value={car.value}
                          onChange={(event) => {
                            setDataNewComponent((prev) => ({
                              ...prev,
                              caracteristicas: prev.caracteristicas.map(
                                (item, indexPrevCar) =>
                                  indexPrevCar === indexCar
                                    ? { ...item, value: event.target.value } // actualiza solo ese item
                                    : item,
                              ),
                            }));
                          }}
                        />

                        <Button
                          style={{ background: "red", color: "white" }}
                          onClick={() => {
                            setDataNewComponent((prev) => ({
                              ...prev,
                              caracteristicas: prev.caracteristicas.filter(
                                (_, indexP) => indexP !== indexCar,
                              ),
                            }));
                          }}
                        >
                          <MdRemove size={26} />
                        </Button>
                      </div>
                    );
                  },
                )
              : ""}
          </div>
          <div className="admin-row admin-mb-md">
            <Button
              style={{ background: "green", color: "white" }}
              onClick={() => {
                setDataNewComponent((prev) => ({
                  ...prev,
                  caracteristicas: [
                    ...prev.caracteristicas,
                    { prop: "", value: "" },
                  ],
                }));
              }}
            >
              <MdAdd size={26} />
            </Button>
          </div>
        </>
      ) : typeProduct == "pcgamer" ? (
        <>
          <div
            className="admin-form-grid-4"
            style={{ marginBottom: "16px", padding: 0 }}
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
                  price:
                    event.target.value === "" ? 0 : Number(event.target.value),
                }))
              }
            />
          </div>

          <div
            className="admin-form-grid-2"
            style={{ marginBottom: "16px", padding: 0 }}
          >
            <TextField
              label="Existencia"
              type="number"
              variant="outlined"
              name="stock"
              value={dataNewPcGamer.stock === 0 ? "" : dataNewPcGamer.stock}
              onChange={(event) => {
                setDataNewPcGamer((prev) => ({
                  ...prev,
                  stock:
                    event.target.value === "" ? 0 : Number(event.target.value),
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
            className="admin-form-grid-3"
            style={{ marginBottom: "16px", padding: 0 }}
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

                      dataNewPcGamer.caracteristicas = [
                        {
                          prop: "tipo",
                          value: id || "",
                        },
                        ...dataNewPcGamer.caracteristicas,
                      ];
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

          <div
            className="admin-form-scroll-grid"
            style={{ marginBottom: "12px", padding: "12px 0" }}
            ref={containerRef}
          >
            {dataNewPcGamer.caracteristicas &&
            dataNewPcGamer.caracteristicas.length > 0
              ? dataNewPcGamer.caracteristicas.map(
                  (car: any, indexCar: number) => {
                    return (
                      <div
                        key={indexCar}
                        className="admin-grid-form-actions admin-w-full"
                      >
                        <TextField
                          label="Caracteristica"
                          variant="outlined"
                          name="prop"
                          value={car.prop}
                          onChange={(event) => {
                            setDataNewPcGamer((prev) => ({
                              ...prev,
                              caracteristicas: prev.caracteristicas.map(
                                (item, indexPrevCar) =>
                                  indexPrevCar === indexCar
                                    ? { ...item, prop: event.target.value } // actualiza solo ese item
                                    : item,
                              ),
                            }));
                          }}
                        />

                        <TextField
                          label="Valor"
                          variant="outlined"
                          name="value"
                          value={car.value}
                          onChange={(event) => {
                            setDataNewPcGamer((prev) => ({
                              ...prev,
                              caracteristicas: prev.caracteristicas.map(
                                (item, indexPrevCar) =>
                                  indexPrevCar === indexCar
                                    ? { ...item, value: event.target.value } // actualiza solo ese item
                                    : item,
                              ),
                            }));
                          }}
                        />

                        <Button
                          style={{ background: "red", color: "white" }}
                          onClick={() => {
                            setDataNewPcGamer((prev) => ({
                              ...prev,
                              caracteristicas: prev.caracteristicas.filter(
                                (_, indexP) => indexP !== indexCar,
                              ),
                            }));
                          }}
                        >
                          <MdRemove size={26} />
                        </Button>
                      </div>
                    );
                  },
                )
              : ""}
          </div>
          <div className="admin-row admin-mb-md">
            <Button
              style={{ background: "green", color: "white" }}
              onClick={() => {
                setDataNewPcGamer((prev) => ({
                  ...prev,
                  caracteristicas: [
                    ...prev.caracteristicas,
                    { prop: "", value: "" },
                  ],
                }));
              }}
            >
              <MdAdd size={26} />
            </Button>
          </div>
        </>
      ) : (
        ""
      )}

      {typeProduct ? (
        <div
          className="admin-form-footer"
          style={{ marginTop: "24px", paddingTop: "20px" }}
        >
          <button
            disabled={loadinNewProduct}
            type="submit"
            className={`admin-btn admin-btn--primary ${rpStyles.submitBtn}`}
            style={{ padding: "10px 22px", margin: 0 }}
          >
            {loadinNewProduct ? "Guardando..." : "Agregar producto"}
          </button>
        </div>
      ) : null}
    </form>
  );
};

export default RegisterProduct;
