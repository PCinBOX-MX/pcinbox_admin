"use client";

import { useTheContext } from "@/app/hooks/global.hook";
import { ProductsI } from "@/app/interfaces/products/products.interface";
import UtilsService from "@/app/services/utils";
import { MdAutorenew, MdDownload, MdEdit, MdFileUpload } from "react-icons/md";
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
  const canReactivate =
    hasCatalogRecord && Number(dataProduct.active) === 0;
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
              { silent: true },
            );

            setLoadingReactivateProduct(false);

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
                loading: false,
                title: "Correcto",
                type: "success",
                content:
                  resp.data?.message || "Producto dado de alta correctamente",
                showActions: true,
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
                loading: false,
                title: "Error",
                type: "error",
                content:
                  resp?.data?.message ||
                  "No se pudo reactivar el producto. Intenta de nuevo.",
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
            setLoadingReactivateProduct(false);
            setDataModal({
              isOpen: true,
              loading: false,
              title: "Error",
              type: "error",
              content:
                error?.response?.data?.message ||
                "Ocurrió un error al dar de alta el producto.",
              showActions: true,
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

  const actionsCount = (needsAlta ? 1 : 0) + (isInSystem ? 2 : 0);

  return (
    <article className={styles.card}>
      <div className={styles.media}>
        <div className={styles.cardHeader}>
          <span className={`${styles.statusBadge} ${statusClass}`}>
            {statusLabel}
          </span>
        </div>

        <div className={styles.carouselWrapper}>
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
      </div>

      <div className={styles.body}>
        <h3 className={styles.title} title={dataProduct.name}>
          {dataProduct.name}
        </h3>

        <div className={styles.metaRow}>
          <p className={styles.metaLine}>
            <span className={styles.metaLabel}>SKU:</span>{" "}
            {dataProduct.sku || "—"}
          </p>

          {dataProduct?.upc ? (
            <p className={styles.metaLine}>
              <span className={styles.metaLabel}>UPC:</span> {dataProduct.upc}
            </p>
          ) : null}

          {dataProduct?.idProductExt ? (
            <p className={styles.metaLine}>
              <span className={styles.metaLabel}>Clave:</span>{" "}
              {dataProduct.idProductExt}
            </p>
          ) : null}
        </div>

        <div className={styles.priceStockRow}>
          <span className={styles.price}>
            {formatCurrency(Number(dataProduct.price))}
          </span>
          <div className={styles.stockRow}>
            <span
              className={`${styles.stockDot} ${stockDotClass}`}
              aria-hidden
            />
            <span className={styles.stockText}>{stockLabel}</span>
          </div>
        </div>

        <div
          className={`${styles.actions} ${
            actionsCount <= 1 ? styles.actionsSingle : ""
          }`}
        >
          {needsAlta ? (
            <button
              type="button"
              disabled={loadingReactivateProduct}
              onClick={() => {
                handleAltaProduct(dataProduct);
              }}
              className={styles.actionBtn}
              data-testid={
                canReactivate
                  ? `reactivate-product-${dataProduct.idProduct}`
                  : `alta-product-${dataProduct.idProductExt || "new"}`
              }
            >
              {loadingReactivateProduct ? (
                <MdAutorenew
                  size={16}
                  className={`${styles.spinnerCenter} the-spinner`}
                />
              ) : (
                <>
                  {canReactivate ? "Volver a Activar" : "Dar de alta"}
                  <MdFileUpload size={16} />
                </>
              )}
            </button>
          ) : null}

          {isInSystem ? (
            <button
              type="button"
              className={`${styles.actionBtn} ${styles.actionBtnSecondary}`}
              data-testid={`edit-product-${dataProduct.idProduct}`}
              onClick={() => {
                handleEditProduct(dataProduct);
              }}
            >
              Editar
              <MdEdit size={16} />
            </button>
          ) : null}

          {isInSystem ? (
            <button
              type="button"
              disabled={loadingRemoveProduct}
              data-testid={`remove-product-${dataProduct.idProduct}`}
              className={`${styles.actionBtn} ${styles.actionBtnDark}`}
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
                        { silent: true },
                      );

                      setLoadingRemoveProduct(false);

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
                          loading: false,
                          title: "Correcto",
                          type: "success",
                          content: "Producto dado de baja correctamente",
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
                          title: "Error",
                          type: "error",
                          content:
                            resp?.data?.message ||
                            "No se pudo dar de baja el producto. Intenta de nuevo.",
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
                    } catch (error) {
                      setLoadingRemoveProduct(false);
                      setDataModal({
                        isOpen: true,
                        loading: false,
                        title: "Error",
                        type: "error",
                        content:
                          "Ocurrió un error al intentar dar de baja el producto.",
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
                  },
                  title: "Cuidado",
                });
              }}
            >
              {loadingRemoveProduct ? (
                <MdAutorenew
                  size={16}
                  className={`${styles.spinnerCenter} the-spinner`}
                />
              ) : (
                <>
                  Dar de baja
                  <MdDownload size={16} />
                </>
              )}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
};

export default CardComponent;
