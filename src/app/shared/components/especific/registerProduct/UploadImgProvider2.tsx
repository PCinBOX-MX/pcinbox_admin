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
} from "@mui/material";
import ProveedoresUtils from "@/app/services/utils/proveedores.utils";
import { Trash2 } from "lucide-react";

import { useState, useEffect, useRef } from "react";
import { useTheContext } from "@/app/hooks/global.hook";
import { MdAutorenew, MdRemove } from "react-icons/md";
import useProveedores from "@/app/proveedores/useProveedores";

const UploadImgProductProvider2 = ({
  dataProductProp,
}: {
  dataProductProp: ProductsI;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const [loadingUploadImgProvider, setLoadingUploadImgProvider] =
    useState<boolean>(false);
  const { setDataModal } = useTheContext();
  const { setProductsProveedor } = useProveedores();

  const { requestPostProveedores } = ProveedoresUtils();

  const [price, setPrice] = useState<any>();
  const [files, setFiles] = useState<File[]>([]);
  const [caracteristicas, setCaracteristicas] = useState<
    { prop: any; value: any }[]
  >([{ prop: "", value: "" }]);

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
    <div className="grid grid-col-[auto] gap-2">
      <div className="w-full">
        <TextField
          label="Precio"
          type="number"
          variant="outlined"
          name="price"
          className="w-full"
          onChange={(event) => {
            setPrice(Number(event.target.value));
          }}
        />
      </div>
      <div className="w-full">
        <TextField
          label=""
          type="file"
          variant="outlined"
          name="image_url"
          className="w-full"
          onChange={(event) => {
            const selectedFiles = (event.target as HTMLInputElement).files;
            if (!selectedFiles) return;

            const fileList = Array.from(selectedFiles);

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
      <div className="flex flex-wrap gap-3 w-full">
        {files.map((file, indexFile) => {
          const fileUrl = previewUrls[indexFile]; // Ahora sí hay URLs en el array
          const isVideo = file.type.startsWith("video/");

          if (!fileUrl) return null; // Asegurar que la URL exista antes de renderizar

          return (
            <Card
              key={`${file.name}-${indexFile}`}
              sx={{ position: "relative", width: 130 }}
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
      </div>
      <div
        className="flex flex-wrap gap-3 w-full overflow-x-hidden overflow-y-auto max-h-[200px]"
        ref={containerRef}
      >
        {caracteristicas && caracteristicas.length > 0
          ? caracteristicas.map((car, indexCar) => {
              return (
                <div
                  key={indexCar}
                  className="w-full grid grid-cols-[1fr_1fr_auto] gap-2"
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
                      // setDataNewPcGamer((prev) => ({
                      //   ...prev,
                      //   caracteristicas: prev.caracteristicas.filter(
                      //     (_, indexP) => indexP !== indexCar
                      //   ),
                      // }));
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
      </div>

      <div className="flex flex-wrap gap-3 w-full">
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
      </div>

      <div className="w-full flex justify-center gap-1">
        <Button
          className="bg-white border rounded p-2 cursor-pointer"
          type="button"
          variant="contained"
          color="primary"
          disabled={loadingUploadImgProvider}
          onClick={async () => {
            try {
              let formData = new FormData();
              formData.append("clave", dataProductProp.idProductExt.toString());
              formData.append("name", dataProductProp.name);
              formData.append("description", dataProductProp.description);
              formData.append("price", price.toString());
              formData.append("sku", dataProductProp.sku);
              formData.append("stock", dataProductProp.stock.toString());
              formData.append(
                "providerId",
                dataProductProp.providerId.toString(),
              );
              formData.append("nameMarca", dataProductProp.nameMarca!);
              formData.append("nameCategory", dataProductProp.nameCategory!);
              formData.append("isPc", "false");
              formData.append(
                "caracteristicas",
                JSON.stringify(caracteristicas),
              );
              formData.append("upc", dataProductProp?.upc!.toString());
              // formData.append(
              //   "stockBranches",
              //   JSON.stringify(dataProductProp?.stockBranches!)
              // );

              formData.append("width", dataProductProp?.width);
              formData.append("height", dataProductProp?.height);
              formData.append("length", dataProductProp?.largo);
              formData.append(
                "branches",
                JSON.stringify(dataProductProp?.branches),
              );
              // formData.append("peso", dataProductProp?.peso);

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
            <MdAutorenew size={20} className="m-auto the-spinner" />
          ) : (
            <> Dar de alta</>
          )}
        </Button>
      </div>
    </div>
  );
};

export default UploadImgProductProvider2;
