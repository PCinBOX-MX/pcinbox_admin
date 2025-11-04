"use client";
import {
  Dispatch,
  FormEventHandler,
  SetStateAction,
  useEffect,
  useState,
} from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardActions,
  CardMedia,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import { Trash2 } from "lucide-react";
import ProveedoresUtils from "@/app/services/utils/proveedores.utils";
import { ProductsI } from "@/app/interfaces/products/products.interface";
import { useTheContext } from "@/app/hooks/global.hook";
import { MdAdd, MdRemove } from "react-icons/md";

interface DataNewProductI {
  name: string;
  description: string;
  marca: number;
  categoria: number;
  stock: number;
  sku: string;
  price: number;
  image_url: File[];
}

const RegisterProduct = () => {
  const {
    setDataModal,
    dataMarca,
    dataCategoria,
    dataProductProveedor,
    setProductsProveedor,
  } = useTheContext();
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [selectedMarca, setSelectedMarca] = useState<number>(0);

  const [selectedCategoria, setSelectedCategoria] = useState<number>(0);

  const [dataNewComponent, setDataNewComponent] = useState<DataNewProductI>({
    name: "",
    description: "",
    marca: 0,
    categoria: 0,
    stock: 0,
    sku: "",
    price: 0,
    image_url: [],
  });

  const [dataNewPcGamer, setDataNewPcGamer] = useState<{
    name: string;
    description: string;
    stock: number;
    sku: string;
    price: number;
    image_url: File[];
    caracteristicas: { prop: string; value: string }[];
  }>({
    name: "",
    description: "",
    stock: 0,
    sku: "",
    price: 0,
    image_url: [],
    caracteristicas: [],
  });
  const [typeProduct, setTypeProduct] = useState("");

  const [loadinNewProduct, setLoadingNewProduct] = useState<boolean>(false);

  const { requestPostProveedores } = ProveedoresUtils();

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (event: any) => {
    event.preventDefault();

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
        formData.append("description", dataNewComponent.description);
        formData.append("price", dataNewComponent.price.toString());
        formData.append("sku", dataNewComponent.sku);
        formData.append("categoryId", dataNewComponent.categoria.toString());
        formData.append("marcaId", dataNewComponent.marca.toString());
        formData.append("stock", dataNewComponent.stock.toString());

        const filesArray = Array.from(files || []);
        filesArray.forEach((file) => formData.append("files", file));
      } else if (typeProduct?.toLowerCase() === "pcgamer") {
        formData.append("name", dataNewPcGamer.name);
        formData.append("description", dataNewPcGamer.description);
        formData.append("price", dataNewPcGamer.price.toString());
        formData.append("sku", dataNewPcGamer.sku);
        formData.append("stock", dataNewPcGamer.stock.toString());
        formData.append(
          "caracteristicas",
          JSON.stringify(dataNewPcGamer.caracteristicas)
        );

        const filesArray = Array.from(files || []);
        filesArray.forEach((file) => formData.append("files", file));
      }

      const resp = await requestPostProveedores(formData, "/newProductPcinbox");
      setLoadingNewProduct(false);
      setDataModal((prev) => ({
        ...prev,
        isOpen: false,
      }));

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

      if (resp.status == 200) {
        const data = resp.data;

        setProductsProveedor((prev) => ({ ...prev, data: data.data.data }));
      }
    } catch (error: any) {
      setLoadingNewProduct(false);
      setDataModal((prev) => ({
        ...prev,
        isOpen: false,
      }));

      setDataModal({
        isOpen: true,
        type: "error",
        title: "Error",
        content: error?.response?.data?.message || error?.message,
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
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        width: "1000px",
        margin: "auto",
      }}
    >
      <Select
        labelId="label-tipo-producto"
        id="select-tipo-producto"
        value={typeProduct}
        label="Tipo de producto"
        name="type-product"
        onChange={(event) => {
          setTypeProduct(event.target.value);
        }}
      >
        <MenuItem value="component">
          <em>Componente</em>
        </MenuItem>

        <MenuItem value="pcgamer">
          <em>PC GAMER</em>
        </MenuItem>
      </Select>

      {typeProduct == "component" ? (
        <>
          <div className="grid grid-cols-[1fr_1fr] gap-2">
            <TextField
              label="Nombre"
              variant="outlined"
              name="name"
              value={dataNewComponent.name}
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
              value={dataNewComponent.description}
              onChange={(event) => {
                setDataNewComponent((prev) => ({
                  ...prev,
                  description: event.target.value,
                }));
              }}
            />
          </div>

          <div className="grid grid-cols-[auto] gap-2">
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
                    (m: any) => m.idCategorie === selectedCategoria
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
                  />
                )}
              />
            </FormControl>
          </div>

          <div className="grid grid-cols-[1fr_1fr] gap-2">
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
                  />
                )}
              />
            </FormControl>
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
          </div>
          <div className="grid grid-cols-[1fr_1fr] gap-2">
            <TextField
              required
              label="Precio"
              type="number"
              variant="outlined"
              name="price"
              onChange={(event) =>
                setDataNewComponent((prev) => ({
                  ...prev,
                  price: Number(event.target.value),
                }))
              }
            />
            <TextField
              required
              label="SKU"
              type="text"
              variant="outlined"
              name="sku"
              onChange={(event) =>
                setDataNewComponent((prev) => ({
                  ...prev,
                  sku: event.target.value,
                }))
              }
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

          <div className="flex flex-wrap gap-3">
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
        </>
      ) : typeProduct == "pcgamer" ? (
        <>
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-2">
            <TextField
              label="Nombre"
              variant="outlined"
              name="name"
              value={dataNewPcGamer.name}
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
              value={dataNewPcGamer.description}
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
              value={dataNewPcGamer.sku}
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
              value={dataNewPcGamer.price}
              onChange={(event) =>
                setDataNewPcGamer((prev) => ({
                  ...prev,
                  price: Number(event.target.value),
                }))
              }
            />
          </div>

          <div className="grid grid-cols-[1fr_1fr] gap-2">
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

          <div className="flex flex-wrap gap-3">
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

          <div className="grid grid-cols-[1fr_1fr_auto] grid-flow-row gap-2 max-h-[150px] overflow-y-auto overflow-x-hidden py-3">
            {dataNewPcGamer.caracteristicas &&
            dataNewPcGamer.caracteristicas.length > 0
              ? dataNewPcGamer.caracteristicas.map(
                  (car: any, indexCar: number) => {
                    return (
                      <>
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
                                    : item
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
                                    : item
                              ),
                            }));
                          }}
                        />

                        <Button
                          style={{ background: "red", color: "white" }}
                          onClick={() => {
                            setDataNewPcGamer((prev) => ({
                              ...prev,
                              caracteristecas: prev.caracteristicas.filter(
                                (_, indexP) => indexP != indexCar
                              ),
                            }));
                          }}
                        >
                          <MdRemove size={26} />
                        </Button>
                      </>
                    );
                  }
                )
              : ""}
          </div>
          <div className="flex justify-start">
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

      <Button
        disabled={loadinNewProduct}
        type="submit"
        variant="contained"
        color="primary"
      >
        Agregar producto
      </Button>
    </Box>
  );
};

export default RegisterProduct;
