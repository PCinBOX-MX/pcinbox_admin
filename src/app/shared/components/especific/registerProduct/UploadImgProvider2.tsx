"use client";

import { ProductsI } from "@/app/interfaces/products/products.interface";
import {
  Button,
  Card,
  CardActions,
  CardMedia,
  IconButton,
  TextField,
  Typography,
  Stack,
  Box,
} from "@mui/material";
import ProveedoresUtils from "@/app/services/utils/proveedores.utils";
import { Trash2 } from "lucide-react";

import { useState, useEffect, useRef } from "react";
import { useTheContext } from "@/app/hooks/global.hook";
import { MdAutorenew, MdRemove, MdCloudUpload } from "react-icons/md";
import useProveedores from "@/app/proveedores/useProveedores";
import rpStyles from "./registerProduct.module.css";

const UploadImgProductProvider2 = ({
  dataProductProp,
}: {
  dataProductProp: ProductsI;
}) => {
  const [bulkText, setBulkText] = useState<string>("");
  const containerRef = useRef<HTMLDivElement>(null);

  const [loadingUploadImgProvider, setLoadingUploadImgProvider] =
    useState<boolean>(false);
  const { setDataModal } = useTheContext();
  const { setProductsProveedor } = useProveedores();

  const { requestPostProveedores } = ProveedoresUtils();

  const [price, setPrice] = useState<any>();
  const [profitMargin, setProfitMargin] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [caracteristicas, setCaracteristicas] = useState<
    { prop: string; value: string }[]
  >([]);

  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [caracteristicas]);

  return (
    <Stack spacing={3} sx={{ mt: 2, pb: 2 }}>
      {dataProductProp && Number(dataProductProp?.providerId) === 1 && (
        <TextField
          label="Precio"
          type="number"
          variant="outlined"
          name="newPrice"
          fullWidth
          onChange={(event) => {
            setPrice(Number(event.target.value));
          }}
        />
      )}
      
      {dataProductProp &&
        (Number(dataProductProp?.providerId) === 3 ||
          Number(dataProductProp?.providerId) === 2) && (
          <TextField
            label="Margen de Utilidad"
            type="number"
            variant="outlined"
            name="profitMargin"
            fullWidth
            onChange={(event) => {
              setProfitMargin(Number(event.target.value));
            }}
          />
        )}

      <Box>
        <Button
          variant="outlined"
          component="label"
          fullWidth
          startIcon={<MdCloudUpload />}
          sx={{ height: 56, borderStyle: "dashed", borderWidth: 2 }}
        >
          {files.length > 0 ? `${files.length} archivo(s) seleccionado(s)` : "Seleccionar Imágenes / Videos"}
          <input
            type="file"
            hidden
            multiple
            accept="image/*,video/*"
            onChange={(event) => {
              const selectedFiles = (event.target as HTMLInputElement).files;
              if (!selectedFiles) return;
              const fileList = Array.from(selectedFiles).slice(0, 5); // limit to 5
              setFiles((prev) => [...prev, ...fileList]);
              event.target.value = ""; // limpia input
            }}
          />
        </Button>
      </Box>

      {files.length > 0 && (
        <Stack direction="row" spacing={2} sx={{ overflowX: "auto", pb: 1 }}>
          {files.map((file, indexFile) => {
            const fileUrl = previewUrls[indexFile];
            const isVideo = file.type.startsWith("video/");

            if (!fileUrl) return null;

            return (
              <Card
                key={`${file.name}-${indexFile}`}
                sx={{ position: "relative", minWidth: 130, width: 130 }}
              >
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
                    onClick={() => {
                      setFiles((prev) => prev.filter((_, i) => i !== indexFile));
                    }}
                  >
                    <Trash2 size={16} />
                  </IconButton>
                </CardActions>
              </Card>
            );
          })}
        </Stack>
      )}

      <Stack spacing={2}>
        <TextField
          label="Pega aquí todas las características (Ej. RAM: 16GB)"
          multiline
          rows={5}
          fullWidth
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
        />

        <Button
          variant="text"
          color="error"
          onClick={() => {
            setBulkText("");
          }}
          sx={{ alignSelf: "flex-end" }}
        >
          Borrar Características
        </Button>
      </Stack>
      {/* <div
        className="admin-form-scroll-grid"
        style={{ maxHeight: "200px" }}
        ref={containerRef}
      >
        {caracteristicas && caracteristicas.length > 0
          ? caracteristicas.map((car, indexCar) => {
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
                      setCaracteristicas((prev) => {
                        return prev.map((item, indexPrevCar) =>
                          indexPrevCar === indexCar
                            ? { ...item, prop: event.target.value }
                            : item,
                        );
                      });
                    }}
                  />

                  <TextField
                    label="Valor"
                    variant="outlined"
                    name="value"
                    value={car.value}
                    onChange={(event) => {
                      setCaracteristicas((prev) => {
                        return prev.map((item, indexPrevCar) =>
                          indexPrevCar === indexCar
                            ? { ...item, value: event.target.value }
                            : item,
                        );
                      });
                    }}
                  />

                  <Button
                    style={{ background: "red", color: "white" }}
                    onClick={() => {
                     
                      setCaracteristicas((prev) => {
                        return prev.filter(
                          (item, indexPrevCar) => indexPrevCar !== indexCar,
                        );
                      });
                    }}
                  >
                    <MdRemove size={26} />
                  </Button>
                </div>
              );
            })
          : ""}
      </div> */}
      {/* 
      <div className="admin-row admin-row--wrap admin-w-full">
        <Button
          type="button"
          variant="contained"
          color="success"
          onClick={() => {
            setCaracteristicas((prev) => [...prev, { prop: "", value: "" }]);
          }}
        >
          +
        </Button>
      </div> */}      <Box sx={{ mt: 3 }}>
        <Button
          type="button"
          variant="contained"
          color="primary"
          size="large"
          fullWidth
          disabled={loadingUploadImgProvider}
          onClick={async () => {
            try {
              if (!dataProductProp) {
                return;
              }

              let parsed;

              if (bulkText && bulkText.trim().length > 0) {
                parsed = bulkText
                  .split(/\r?\n/)
                  .map((line) => line.trim())
                  .filter((line) => line.length > 0)
                  .map((line) => {
                    let prop = "";
                    let value = "";

                    // Caso 1: tiene :
                    if (line.includes(":")) {
                      const parts = line.split(":");

                      // La primera parte es propiedad
                      prop = parts.shift() || "";

                      // El resto se vuelve a unir como valor
                      value = parts.join(":");
                    } else {
                      // Caso 2: no tiene :, intenta separar ǧltimo nǧmero/unidad
                      const match = line.match(/^(.*?)(\d+.*)$/);
                      if (match) {
                        prop = match[1];
                        value = match[2];
                      }
                    }

                    return {
                      prop: prop.trim(),
                      value: value.trim(),
                    };
                  })
                  .filter((item) => item.prop !== "" && item.value !== "");
              }

              let formData = new FormData();

              formData.append("clave", dataProductProp.idProductExt.toString());

              formData.append("name", dataProductProp.name);

              formData.append("description", dataProductProp.description);

              if (
                Number(dataProductProp.providerId) === 3 ||
                Number(dataProductProp.providerId) === 2
              ) {
                formData.append("newPrice", dataProductProp.price.toString());
              } else {
                formData.append("newPrice", price?.toString() ?? "0");
              }

              formData?.append(
                "originPrice",
                String(
                  dataProductProp?.originPriceMxn ?? dataProductProp?.price ?? 0,
                ),
              );
              if (Number(dataProductProp.providerId) !== 1) {
                formData?.append("profitMargin", profitMargin?.toString());
              }

              if (Number(dataProductProp.providerId) === 2) {
                formData.append(
                  "isDolares",
                  String(Boolean(dataProductProp?.isDolares)),
                );
                formData.append("originPriceMxn", "true");
              }

              formData.append("sku", dataProductProp.sku);

              formData.append("stock", (dataProductProp.stock ?? 0).toString());

              formData.append(
                "providerId",
                dataProductProp.providerId?.toString(),
              );

              formData.append("nameMarca", dataProductProp.nameMarca!);

              formData.append("nameCategory", dataProductProp.nameCategory!);

              formData.append("isPc", "false");

              formData.append(
                "caracteristicas",
                parsed === undefined
                  ? JSON.stringify([])
                  : JSON.stringify(parsed),
              );

              formData.append("upc", dataProductProp?.upc!.toString());

              formData.append("width", dataProductProp?.width);
              formData.append("height", dataProductProp?.height);
              formData.append("length", dataProductProp?.largo);
              formData.append(
                "branches",
                JSON.stringify(dataProductProp?.branches),
              );
              formData.append(
                "peso",
                dataProductProp?.peso?.toString() ?? "null",
              );

              files.forEach((file) => formData.append("files", file));

              setLoadingUploadImgProvider(true);

              const resp = await requestPostProveedores(
                formData,
                "/newProductPcinbox",
              );
              setLoadingUploadImgProvider(false);
              if (resp.status == 200) {
                const data = resp?.data?.data;

                setProductsProveedor((prev) => {
                  const updateItem = (prevItem: any) => {
                    if (prevItem.idProductExt == data?.data?.idProductExt) {
                      return {
                        ...prevItem,
                        idProduct: Number(data?.data?.idProduct),
                        idProductExt: data?.data?.idProductExt,
                        name: data?.data?.name,
                        description: data?.data?.description,
                        caracteristicas: data?.data?.caracteristicas,
                        price: Number(data?.data?.price),
                        stock: Number(data?.data?.stock),
                        sku: data?.data?.sku,
                        upc: data?.data?.upc,
                        width: Number(data?.data?.width),
                        height: Number(data?.data?.height),
                        largo: Number(data?.data?.largo),
                        peso: data?.data?.peso,
                        rating: Number(data?.data?.rating),
                        image_url: data?.data?.image_url,
                        categoryId: Number(data?.data?.categoryId),
                        marcaId: Number(data?.data?.marcaId),
                        providerId: Number(data?.data?.providerId),
                        isPC: Number(data?.data?.isPC),
                        createdAt: data?.data?.createdAt,
                        active: Number(data?.data?.active),
                      };
                    }
                    return prevItem;
                  };
                  return {
                    ...prev,
                    loading: false,
                    data: prev.data.map(updateItem),
                    copyData: prev.copyData!.map(updateItem),
                  };
                });

                setDataModal({
                  isOpen: true,
                  type: "success",
                  content: `${dataProductProp.name} dado de alta correctamente`,
                  showActions: true,
                  title: "Correcto",
                  onClose: () => {
                    setDataModal((prev) => ({ ...prev, isOpen: false }));
                  },
                  onConfirm: () => {
                    setDataModal((prev) => ({ ...prev, isOpen: false }));
                  },
                });
              }
            } catch (error: any) {
              setLoadingUploadImgProvider(false);
            }
          }}
        >
          {loadingUploadImgProvider ? (
            <MdAutorenew size={24} className="admin-m-auto the-spinner" />
          ) : (
            "Dar de Alta Producto"
          )}
        </Button>
      </Box>
    </Stack>
  );
};

export default UploadImgProductProvider2;
