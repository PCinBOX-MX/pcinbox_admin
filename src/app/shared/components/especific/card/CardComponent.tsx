"use client";

import { useTheContext } from "@/app/hooks/global.hook";
import { ProductsI } from "@/app/interfaces/products/products.interface";
import UtilsService from "@/app/services/utils";
import {
  Card,
  CardActions,
  CardContent,
  Typography,
} from "@mui/material";
import {
  MdAutorenew,
  MdDownload,
  MdEdit,
  MdFileUpload,
} from "react-icons/md";
import { Carousel } from "react-responsive-carousel";
import FormProduct from "../FormProduct/FormProduct";
import { MouseEvent, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import UploadImgProductProvider2 from "../registerProduct/UploadImgProvider2";
import ProveedoresUtils from "@/app/services/utils/proveedores.utils";
import styles from "./card.module.css";

const PRODUCT_IMAGE_FALLBACK = "/imagen-no-encontrada.png";

const CardComponent = ({ dataProduct }: { dataProduct: ProductsI }) => {
  const { formatCurrency } = UtilsService();
  const { setDataModal, setProductsProveedor } = useTheContext();
  const { requestPostProveedores } = ProveedoresUtils();

  const [loadingRemoveProduct, setLoadingRemoveProduct] =
    useState<boolean>(false);
  const [loadingReactivateProduct, setLoadingReactivateProduct] =
    useState<boolean>(false);

  const hasCatalogRecord =
    Number.isFinite(Number(dataProduct?.idProduct)) &&
    Number(dataProduct.idProduct) > 0;
  /** Ya existió en sistema y solo está inactivo → reactivar (active=1). */
  const canReactivate =
    hasCatalogRecord && Number(dataProduct.active) === 0;
  /** Primera alta (sin registro en catálogo). */
  const needsFirstAlta = !hasCatalogRecord;
  const needsAlta = canReactivate || needsFirstAlta;
  const isInSystem = hasCatalogRecord && Number(dataProduct.active) !== 0;

  const handleEditProduct = async (dataProductProp: ProductsI) => {
    setDataModal({
      isOpen: true,
      title: "Editar producto",
      maxWidth: "min(95vw, 850px)",
      content: (
        <div className={styles.modalShell}>
          <FormProduct dataProductProp={dataProductProp} />
        </div>
      ),
      type: "info",
      showActions: false,
      onClose: () => {
        setDataModal((prev) => ({ ...prev, isOpen: false }));
      },
      onConfirm: () => {
        setDataModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleAltaProduct = async (dataProductProp: ProductsI) => {
    // Producto ya en BD pero inactive: solo confirmar reactivación.
    if (
      Number.isFinite(Number(dataProductProp.idProduct)) &&
      Number(dataProductProp.idProduct) > 0 &&
      Number(dataProductProp.active) === 0
    ) {
      setDataModal({
        isOpen: true,
        title: "Volver a Activar",
        type: "info",
        content: `¿Deseas volver a publicar "${dataProductProp.name}" en el sistema?`,
        showActions: true,
        onClose: () => {
          setDataModal((prev) => ({ ...prev, isOpen: false }));
        },
        onConfirm: async () => {
          try {
            setLoadingReactivateProduct(true);
            setDataModal((prev) => ({ ...prev, loading: true }));

            const resp = await requestPostProveedores(
              { idProduct: dataProductProp.idProduct },
              "/reactivateProductPcinbox",
            );

            setLoadingReactivateProduct(false);
            setDataModal((prev) => ({ ...prev, loading: false }));

            if (resp.status === 200) {
              setProductsProveedor((prev) => {
                const same = (item: ProductsI) =>
                  Number(item.idProduct) === Number(dataProductProp.idProduct);
                return {
                  ...prev,
                  data: prev.data.map((item) =>
                    same(item) ? { ...item, active: 1 } : item,
                  ),
                  copyData: prev.copyData?.map((item) =>
                    same(item) ? { ...item, active: 1 } : item,
                  ),
                };
              });
              setDataModal({
                isOpen: true,
                title: "Correcto",
                type: "success",
                content:
                  resp.data?.message || "Producto dado de alta correctamente",
                showActions: false,
                onClose: () => {
                  setDataModal((prev) => ({ ...prev, isOpen: false }));
                },
                onConfirm: () => {
                  setDataModal((prev) => ({ ...prev, isOpen: false }));
                },
              });
              setTimeout(() => {
                setDataModal((prev) => ({ ...prev, isOpen: false }));
              }, 1500);
            }
          } catch (error: any) {
            setLoadingReactivateProduct(false);
            setDataModal({
              isOpen: true,
              title: "Error",
              type: "error",
              content:
                error?.response?.data?.message ||
                "Ocurrió un error al dar de alta el producto.",
              showActions: false,
              onClose: () => {
                setDataModal((prev) => ({ ...prev, isOpen: false }));
              },
              onConfirm: () => {
                setDataModal((prev) => ({ ...prev, isOpen: false }));
              },
            });
          }
        },
      });
      return;
    }

    // Primera alta: formulario con imágenes / datos.
    setDataModal({
      isOpen: true,
      title: "Dar de alta al sistema",
      maxWidth: "min(95vw, 700px)",
      content: (
        <div className={styles.modalShell}>
          <UploadImgProductProvider2 dataProductProp={dataProductProp} />
        </div>
      ),
      type: "success",
      showActions: false,
      onClose: () => {
        setDataModal((prev) => ({ ...prev, isOpen: false }));
      },
      onConfirm: () => {
        setDataModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const stopPropagation = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
  };

  const renderArrowPrev = (
    clickHandler: () => void,
    hasPrev: boolean,
    label: string,
  ) => {
    if (!hasPrev) return <></>;
    return (
      <button
        type="button"
        className={`${styles.navBtn} ${styles.navPrev}`}
        onClick={(event) => {
          stopPropagation(event);
          clickHandler();
        }}
        aria-label={label}
      >
        <ChevronLeft size={18} strokeWidth={2.5} aria-hidden />
      </button>
    );
  };

  const renderArrowNext = (
    clickHandler: () => void,
    hasNext: boolean,
    label: string,
  ) => {
    if (!hasNext) return <></>;
    return (
      <button
        type="button"
        className={`${styles.navBtn} ${styles.navNext}`}
        onClick={(event) => {
          stopPropagation(event);
          clickHandler();
        }}
        aria-label={label}
      >
        <ChevronRight size={18} strokeWidth={2.5} aria-hidden />
      </button>
    );
  };

  const stock = Number(dataProduct.stock) || 0;
  const stockDotClass =
    stock <= 0
      ? styles.stockDotOut
      : stock > 10
        ? styles.stockDotHigh
        : styles.stockDotLow;
  const stockLabel =
    stock <= 0
      ? "Sin stock"
      : stock < 10
        ? `¡Solo ${stock} pzas!`
        : `${stock} pzas.`;

  const statusClass = needsFirstAlta
    ? styles.statusNew
    : canReactivate
      ? styles.statusInactive
      : styles.statusActive;
  const statusLabel = needsFirstAlta
    ? "Sin alta"
    : canReactivate
      ? "Inactivo"
      : "Activo";

  const productImages = (
    Array.isArray(dataProduct.image_url) ? dataProduct.image_url : []
  ).filter(
    (img): img is string => typeof img === "string" && img.trim().length > 0,
  );
  const carouselImages =
    productImages.length > 0 ? productImages : [PRODUCT_IMAGE_FALLBACK];
  const hasRealImages = productImages.length > 0;

  return (
    <Card key={dataProduct.idProduct} className={styles.card} elevation={0}>
      <div className={styles.media}>
        <Carousel
          showIndicators={hasRealImages && carouselImages.length > 1}
          showThumbs={false}
          showStatus={false}
          showArrows={hasRealImages && carouselImages.length > 1}
          swipeable={false}
          emulateTouch={false}
          infiniteLoop={hasRealImages && carouselImages.length > 1}
          renderArrowPrev={renderArrowPrev}
          renderArrowNext={renderArrowNext}
        >
          {carouselImages.map((img, i) => (
            <div key={`${img}-${i}`} className={styles.carouselSlide}>
              <img
                src={img}
                alt={dataProduct.name || "producto"}
                loading="lazy"
                onError={(event) => {
                  const target = event.currentTarget;
                  if (target.src.includes("imagen-no-encontrada.png")) return;
                  target.src = PRODUCT_IMAGE_FALLBACK;
                }}
              />
            </div>
          ))}
        </Carousel>
      </div>

      <CardContent className={styles.body}>
        <Typography
          component="h3"
          className={styles.title}
          title={dataProduct.name}
        >
          {dataProduct.name}
        </Typography>

        <span className={`${styles.statusBadge} ${statusClass}`}>
          {statusLabel}
        </span>

        <div className={styles.metaRow}>
          <Typography className={styles.metaLine}>
            <span className={styles.metaLabel}>SKU:</span>{" "}
            {dataProduct.sku || "—"}
          </Typography>

          {dataProduct?.upc ? (
            <Typography className={styles.metaLine}>
              <span className={styles.metaLabel}>UPC:</span> {dataProduct.upc}
            </Typography>
          ) : null}

          {dataProduct?.idProductExt ? (
            <Typography className={styles.metaLine}>
              <span className={styles.metaLabel}>Clave:</span>{" "}
              {dataProduct.idProductExt}
            </Typography>
          ) : null}
        </div>

        <div className={styles.priceStockRow}>
          <Typography className={styles.price}>
            {formatCurrency(Number(dataProduct.price))}
          </Typography>
          <div className={styles.stockRow}>
            <span
              className={`${styles.stockDot} ${stockDotClass}`}
              aria-hidden
            />
            <span className={styles.stockText}>{stockLabel}</span>
          </div>
        </div>
      </CardContent>

      <CardActions className={styles.actions}>
        {needsAlta ? (
          <button
            type="button"
            disabled={loadingReactivateProduct}
            onClick={() => {
              handleAltaProduct(dataProduct);
            }}
            className="admin-btn-primary"
            style={{ width: "100%", justifyContent: "center" }}
            data-testid={
              canReactivate
                ? `reactivate-product-${dataProduct.idProduct}`
                : `alta-product-${dataProduct.idProductExt || "new"}`
            }
          >
            {loadingReactivateProduct ? (
              <MdAutorenew
                size={20}
                className={`${styles.spinnerCenter} the-spinner`}
              />
            ) : (
              <>
                {canReactivate ? "Volver a Activar" : "Dar de alta al sistema"}
                <MdFileUpload size={20} />
              </>
            )}
          </button>
        ) : null}

        {isInSystem && (
          <button
            type="button"
            className="admin-btn-secondary"
            data-testid={`edit-product-${dataProduct.idProduct}`}
            style={{
              width: "100%",
              justifyContent: "center",
              background: "#f3f4f6",
              color: "#374151",
              border: "1px solid #d1d5db",
            }}
            onClick={() => {
              handleEditProduct(dataProduct);
            }}
          >
            Editar producto
            <MdEdit size={20} />
          </button>
        )}
        {isInSystem && (
          <button
            type="button"
            disabled={loadingRemoveProduct}
            data-testid={`remove-product-${dataProduct.idProduct}`}
            className="admin-btn-primary"
            style={{
              width: "100%",
              justifyContent: "center",
              background: "linear-gradient(135deg, #1f2937 0%, #111827 100%)",
              boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
            }}
            onClick={async () => {
              setDataModal({
                isOpen: true,
                type: "info",
                content: `¿Seguro que deseas dar de baja el producto ${dataProduct.name}?`,
                showActions: true,
                onClose: () => {
                  setDataModal((prev) => ({ ...prev, isOpen: false }));
                },
                onConfirm: async () => {
                  try {
                    setLoadingRemoveProduct(true);
                    setDataModal((prev) => ({ ...prev, loading: true }));

                    const resp = await requestPostProveedores(
                      {
                        idProduct: dataProduct.idProduct,
                        idProductExt: dataProduct.idProductExt,
                      },
                      "/removeProductPcinbox",
                    );

                    setLoadingRemoveProduct(false);
                    setDataModal((prev) => ({ ...prev, loading: false }));

                    if (resp.status == 200) {
                      setProductsProveedor((prev) => {
                        const same = (item: ProductsI) =>
                          Number(item.idProduct) ===
                          Number(dataProduct.idProduct);

                        return {
                          ...prev,
                          data: prev.data.map((item) =>
                            same(item) ? { ...item, active: 0 } : item,
                          ),
                          copyData: prev.copyData?.map((item) =>
                            same(item) ? { ...item, active: 0 } : item,
                          ),
                        };
                      });
                      setDataModal({
                        isOpen: true,
                        title: "Correcto",
                        type: "success",
                        content: "Producto dado de baja correctamente",
                        showActions: false,
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
                      setTimeout(() => {
                        setDataModal((prev) => ({ ...prev, isOpen: false }));
                      }, 1500);
                    }
                  } catch (error) {
                    setLoadingRemoveProduct(false);
                    setDataModal({
                      isOpen: true,
                      title: "Error",
                      type: "error",
                      content:
                        "Ocurrió un error al intentar dar de baja el producto.",
                      showActions: false,
                      onClose: () => {
                        setDataModal((prev) => ({ ...prev, isOpen: false }));
                      },
                      onConfirm: () => {
                        setDataModal((prev) => ({ ...prev, isOpen: false }));
                      },
                    });
                    setTimeout(() => {
                      setDataModal((prev) => ({ ...prev, isOpen: false }));
                    }, 1500);
                  }
                },
                title: "Cuidado",
              });
            }}
          >
            {loadingRemoveProduct ? (
              <MdAutorenew
                size={20}
                className={`${styles.spinnerCenter} the-spinner`}
              />
            ) : (
              <>
                Dar de baja del sistema
                <MdDownload size={20} />
              </>
            )}
          </button>
        )}
      </CardActions>
    </Card>
  );
};

export default CardComponent;
