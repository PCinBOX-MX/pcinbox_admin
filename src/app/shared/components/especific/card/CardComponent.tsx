"use client";

import { useTheContext } from "@/app/hooks/global.hook";
import { ProductsI } from "@/app/interfaces/products/products.interface";
import UtilsService from "@/app/services/utils";
import {
  Button,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  IconButton,
  TextField,
  Typography,
} from "@mui/material";
import {
  MdAutorenew,
  MdDownload,
  MdEdit,
  MdFileUpload,
  MdRemove,
} from "react-icons/md";
import { Carousel } from "react-responsive-carousel";
import FormProduct from "../FormProduct/FormProduct";
import { Dispatch, SetStateAction, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import UploadImgProductProvider2 from "../registerProduct/UploadImgProvider2";
import ProveedoresUtils from "@/app/services/utils/proveedores.utils";
import styles from "./card.module.css";

const CardComponent = ({ dataProduct }: { dataProduct: ProductsI }) => {
  const { formatCurrency } = UtilsService();
  const { setDataModal, setProductsProveedor } = useTheContext();
  const { requestPostProveedores } = ProveedoresUtils();

  const [loadingRemoveProduct, setLoadingRemoveProduct] =
    useState<boolean>(false);

  const handleEditProduct = async (dataProductProp: ProductsI) => {
    setDataModal({
      isOpen: true,
      title: "Editar producto",
      maxWidth: "min(95vw, 850px)",
      content: (
        <FormProduct
          dataProductProp={dataProductProp}
          // setProductsProveedor={setProductsProveedor}
        />
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
    if (dataProductProp?.providerId != 1) {
      setDataModal({
        isOpen: true,
        title: "Ingresa los datos",
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
    }
  };

  return (
    <Card
      key={dataProduct.idProduct}
      className={styles.card}
    >
      <Carousel showIndicators={true} showThumbs={false} showStatus={false}>
        {dataProduct.image_url && dataProduct.image_url.length > 0
          ? dataProduct.image_url.map((img, i) => (
              <div
                key={i}
                className={styles.carouselSlide}
                style={{ height: "220px", display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: "#ffffff" }}
              >
                <img
                  src={img}
                  style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }}
                  loading="lazy"
                />
              </div>
            ))
          : [<div key="no-img" style={{ height: "220px", display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: "#f3f4f6", color: "#6b7280", fontStyle: "italic", borderRadius: "8px" }}>Sin imágenes</div>]}
      </Carousel>

      <CardContent>
        <Typography
          gutterBottom
          variant="h5"
          component="div"
          className={styles.title}
        >
          {dataProduct.name.length > 30
            ? dataProduct.name.slice(0, 30)
            : dataProduct.name}
        </Typography>

        {/* <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {dataProduct.description.length > 30
            ? `${dataProduct.description.slice(0, 30)}...`
            : dataProduct.description}
        </Typography> */}
        <Typography
          variant="body2"
          sx={{ color: "text.secondary", margin: "10px 0px" }}
        >
          <span className={styles.label}>SKU:</span>{" "}
          {dataProduct.sku}
        </Typography>

        {dataProduct?.upc && (
          <Typography
            variant="body2"
            sx={{ color: "text.secondary", margin: "10px 0px" }}
          >
            <span className={styles.label}>UPC:</span>{" "}
            {dataProduct?.upc}
          </Typography>
        )}

        {dataProduct?.idProductExt && (
          <Typography
            variant="body2"
            sx={{ color: "text.secondary", margin: "10px 0px" }}
          >
            <span className={styles.label}>Clave:</span>{" "}
            {dataProduct?.idProductExt}
          </Typography>
        )}

        <Typography
          variant="body2"
          sx={{ color: "text.secondary", margin: "10px 0px" }}
        >
          <span className={styles.label}>Disponible:</span>{" "}
          {dataProduct.stock || 0} piezas.
        </Typography>

        <Typography
          variant="body2"
          sx={{ color: "text.secondary", margin: "10px 0px" }}
        >
          <span className={styles.label}>Precio:</span>{" "}
          {formatCurrency(Number(dataProduct.price))}
        </Typography>
      </CardContent>
      <CardActions
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: "10px",
        }}
      >
        {dataProduct && dataProduct?.image_url?.length === 0 && (
          <button
            onClick={() => {
              handleAltaProduct(dataProduct);
            }}
            className="admin-btn-primary"
            style={{ width: "100%", justifyContent: "center" }}
          >
            Dar de alta al sistema
            <MdFileUpload size={20} />
          </button>
        )}

        {dataProduct && dataProduct?.image_url.length > 0 && (
          <button
            type="button"
            className="admin-btn-secondary"
            style={{ width: "100%", justifyContent: "center", background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db" }}
            onClick={() => {
              handleEditProduct(dataProduct);
            }}
          >
            Editar producto
            <MdEdit size={20} />
          </button>
        )}
        {dataProduct && dataProduct?.image_url?.length > 0 && (
          <button
            type="button"
            disabled={loadingRemoveProduct}
            className="admin-btn-primary"
            style={{ width: "100%", justifyContent: "center", background: "linear-gradient(135deg, #1f2937 0%, #111827 100%)", boxShadow: "0 4px 10px rgba(0,0,0,0.2)" }}
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

                    const resp = await requestPostProveedores(
                      {
                        idProduct: dataProduct.idProduct,
                        idProductExt: dataProduct.idProductExt,
                      },
                      "/removeProductPcinbox",
                    );

                    setLoadingRemoveProduct(false);

                    if (resp.status == 200) {
                      setProductsProveedor((prev) => ({
                        ...prev,
                        data: prev.data.filter((item) => item.idProduct !== dataProduct.idProduct),
                        copyData: prev.copyData?.filter((item) => item.idProduct !== dataProduct.idProduct)
                      }));
                      setDataModal({
                        isOpen: true,
                        title: "Correcto",
                        type: "success",
                        content: "Producto dado de baja correctamente",
                        showActions: true,
                        onClose: () => {
                          setDataModal((prev) => ({ ...prev, isOpen: false }));
                        },
                        onConfirm: () => {
                          setDataModal((prev) => ({ ...prev, isOpen: false }));
                        },
                      });
                    }
                  } catch (error) {
                    setLoadingRemoveProduct(false);
                  }
                },
                title: "Cuidado",
              });
            }}
          >
            {loadingRemoveProduct ? (
              <MdAutorenew size={20} className={`${styles.spinnerCenter} the-spinner`} />
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
