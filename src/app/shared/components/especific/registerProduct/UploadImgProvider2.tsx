"use client";

import { ProductsI } from "@/app/interfaces/products/products.interface";
import { Button, TextField, Stack, Box } from "@mui/material";
import ProveedoresUtils from "@/app/services/utils/proveedores.utils";
import { useState, useEffect, useRef } from "react";
import { useTheContext } from "@/app/hooks/global.hook";
import { MdAutorenew } from "react-icons/md";
import useProveedores from "@/app/proveedores/useProveedores";
import {
  PROVIDER_PCINBOX,
  PROVIDER_TECHSMART,
  providerUsesProfitMargin,
} from "@/app/constants/providers.constants";
import {
  takeFilesWithinLimit,
  validateProductImagesCount,
} from "@/app/constants/productImages.constants";
import ProductImagesField from "../productImages/ProductImagesField";
import StickyFormAction from "../productImages/StickyFormAction";
import CatalogWarrantyFields from "../CatalogWarrantyFields";
import {
  appendCatalogWarrantyToFormData,
  CatalogWarrantyState,
  validateCatalogWarranty,
} from "@/app/shared/utils/catalogWarranty";
import {
  applyCronStockUpdate,
  normalizeCronStockPayload,
} from "@/app/utils/cronStockLiveSync";

const UploadImgProductProvider2 = ({
  dataProductProp,
}: {
  dataProductProp: ProductsI;
}) => {
  const [bulkText, setBulkText] = useState<string>("");
  const containerRef = useRef<HTMLDivElement>(null);

  const [loadingUploadImgProvider, setLoadingUploadImgProvider] =
    useState<boolean>(false);
  const { setDataModal, socketCron, socketCronReady, dataProductProveedor, dataProducts } =
    useTheContext();
  const { setProductsProveedor } = useProveedores();

  const { requestPostProveedores } = ProveedoresUtils();

  const [price, setPrice] = useState<any>();
  const [profitMargin, setProfitMargin] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const imageSectionRef = useRef<HTMLDivElement>(null);
  const [caracteristicas, setCaracteristicas] = useState<
    { prop: string; value: string }[]
  >([]);
  const [liveProduct, setLiveProduct] = useState(dataProductProp);

  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [warrantyState, setWarrantyState] = useState<CatalogWarrantyState>({
    choice: "",
    amount: "",
  });

  useEffect(() => {
    setLiveProduct(dataProductProp);
  }, [dataProductProp]);

  useEffect(() => {
    const cronSocket = socketCron?.current;
    if (!cronSocket || !socketCronReady) return;

    const onCronUpdate = (payload: unknown) => {
      const updates = normalizeCronStockPayload(payload);
      const update = updates.find(
        (u) => Number(u.idProduct) === Number(dataProductProp.idProduct),
      );
      if (!update) return;
      setLiveProduct((prev) => applyCronStockUpdate(prev, update));
    };

    cronSocket.on("updatedStockCron", onCronUpdate);
    return () => {
      cronSocket.off("updatedStockCron", onCronUpdate);
    };
  }, [socketCron, socketCronReady, dataProductProp.idProduct]);

  const resolveLiveCatalogProduct = (): ProductsI => {
    const id = Number(dataProductProp.idProduct);
    const fromProveedor =
      dataProductProveedor?.data?.find((p) => Number(p.idProduct) === id) ||
      dataProductProveedor?.copyData?.find((p) => Number(p.idProduct) === id);
    const fromAll = dataProducts?.find((p) => Number(p.idProduct) === id);
    return fromProveedor || fromAll || liveProduct;
  };

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

  useEffect(() => {
    if (!imageError || !imageSectionRef.current) return;
    imageSectionRef.current.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [imageError]);

  return (
    <Stack
      spacing={3}
      sx={{ mt: 2, pb: 2, minWidth: { xs: "100%", sm: "550px" }, textAlign: "left" }}
    >
      {Number(dataProductProp?.providerId) === PROVIDER_PCINBOX && (
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

      {providerUsesProfitMargin(dataProductProp?.providerId) && (
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

      <CatalogWarrantyFields
        providerId={dataProductProp?.providerId}
        isPC={false}
        value={warrantyState}
        onChange={setWarrantyState}
      />

      <ProductImagesField
        sectionRef={imageSectionRef}
        previews={previewUrls}
        files={files}
        error={imageError}
        accept="image/*,video/*"
        errorTestId="alta-image-error"
        imagesTestId="alta-product-images"
        onAddFiles={(incoming) => {
          setFiles((prev) => {
            const { accepted, error } = takeFilesWithinLimit(
              prev.length,
              incoming,
            );
            setImageError(error);
            if (!accepted.length) return prev;
            return [...prev, ...accepted];
          });
        }}
        onRemove={(indexFile) => {
          setFiles((prev) => {
            const next = prev.filter((_, i) => i !== indexFile);
            setImageError(validateProductImagesCount(next.length));
            return next;
          });
        }}
      />

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
      </div> */}
      <StickyFormAction>
        <Button
          type="button"
          variant="contained"
          color="primary"
          size="large"
          fullWidth
          disabled={loadingUploadImgProvider}
          sx={{
            background: "linear-gradient(135deg, #b92b3d 0%, #992230 100%)",
            fontWeight: "bold",
            "&:hover": { background: "#992230" },
          }}
          onClick={async () => {
            try {
              if (!dataProductProp) {
                return;
              }

              const imagesValidationError = validateProductImagesCount(
                files.length,
              );
              if (imagesValidationError) {
                setImageError(imagesValidationError);
                return;
              }
              setImageError(null);

              const warrantyError = validateCatalogWarranty(warrantyState, {
                providerId: dataProductProp.providerId,
                isPC: false,
              });
              if (warrantyError) {
                setDataModal({
                  isOpen: true,
                  type: "error",
                  title: "Garantía",
                  content: warrantyError,
                  showActions: true,
                  onClose: () =>
                    setDataModal((prev) => ({ ...prev, isOpen: false })),
                  onConfirm: () =>
                    setDataModal((prev) => ({ ...prev, isOpen: false })),
                });
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

              const catalogProduct = resolveLiveCatalogProduct();

              let formData = new FormData();

              formData.append("clave", dataProductProp.idProductExt.toString());

              formData.append("name", dataProductProp.name);

              formData.append("description", dataProductProp.description);

              if (Number(dataProductProp.providerId) === PROVIDER_PCINBOX) {
                formData.append("newPrice", price?.toString() ?? "0");
              } else {
                formData.append("newPrice", catalogProduct.price.toString());
              }

              formData?.append(
                "originPrice",
                String(
                  catalogProduct?.originPriceMxn ?? catalogProduct?.price ?? 0,
                ),
              );
              if (providerUsesProfitMargin(catalogProduct.providerId)) {
                formData?.append("profitMargin", profitMargin?.toString());
              }

              if (Number(catalogProduct.providerId) === PROVIDER_TECHSMART) {
                formData.append(
                  "isDolares",
                  String(Boolean(catalogProduct?.isDolares)),
                );
                formData.append("originPriceMxn", "true");
              }

              formData.append("sku", catalogProduct.sku);

              formData.append("stock", (catalogProduct.stock ?? 0).toString());

              formData.append(
                "providerId",
                catalogProduct.providerId?.toString(),
              );

              formData.append("nameMarca", catalogProduct.nameMarca!);

              formData.append("nameCategory", catalogProduct.nameCategory!);

              formData.append("isPc", "false");

              formData.append(
                "caracteristicas",
                parsed === undefined
                  ? JSON.stringify([])
                  : JSON.stringify(parsed),
              );

              formData.append("upc", catalogProduct?.upc!.toString());

              formData.append("width", catalogProduct?.width);
              formData.append("height", catalogProduct?.height);
              formData.append("length", catalogProduct?.largo);
              formData.append(
                "branches",
                JSON.stringify(catalogProduct?.branches),
              );
              formData.append(
                "peso",
                catalogProduct?.peso?.toString() ?? "null",
              );

              appendCatalogWarrantyToFormData(formData, warrantyState, {
                providerId: catalogProduct.providerId,
                isPC: false,
              });

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
              } else {
                setDataModal({
                  isOpen: true,
                  type: "error",
                  title: "No se dio de alta el producto",
                  content:
                    resp?.data?.message ||
                    "No pudimos registrar el producto con imágenes. Intenta de nuevo.",
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
              setLoadingUploadImgProvider(false);
              setDataModal({
                isOpen: true,
                type: "error",
                title: "No se dio de alta el producto",
                content:
                  error?.response?.data?.message ||
                  "Ocurrió un error al subir el producto. Revisa tu conexión e intenta de nuevo.",
                showActions: true,
                onClose: () => {
                  setDataModal((prev) => ({ ...prev, isOpen: false }));
                },
                onConfirm: () => {
                  setDataModal((prev) => ({ ...prev, isOpen: false }));
                },
              });
            }
          }}
        >
          {loadingUploadImgProvider ? (
            <MdAutorenew size={24} className="admin-m-auto the-spinner" />
          ) : (
            "Dar de Alta Producto"
          )}
        </Button>
      </StickyFormAction>
    </Stack>
  );
};

export default UploadImgProductProvider2;
