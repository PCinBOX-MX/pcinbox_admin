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

const CardComponent = ({ dataProduct }: { dataProduct: ProductsI }) => {
  const { formatCurrency } = UtilsService();
  const { setDataModal } = useTheContext();
  const { requestPostProveedores } = ProveedoresUtils();

  const [loadingRemoveProduct, setLoadingRemoveProduct] =
    useState<boolean>(false);

  const handleEditProduct = async (dataProductProp: ProductsI) => {
    setDataModal({
      isOpen: true,
      title: "Editar producto",
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
        content: (
          <div className="w-full max-w-full">
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
      className="w-full max-w-[300px] rounded-xl shadow-sm"
      style={{ padding: "10px" }}
    >
      <Carousel showIndicators={true} showThumbs={false} showStatus={false}>
        {dataProduct.image_url && dataProduct.image_url.length > 0
          ? dataProduct.image_url.map((img, i) => (
              <div
                key={i}
                className="flex justify-center"
                style={{ height: "150px" }}
              >
                <img
                  src={img}
                  style={{ objectFit: "contain" }}
                  loading="lazy"
                />
              </div>
            ))
          : [<div key="no-img">Sin imágenes</div>]}
      </Carousel>

      <CardContent>
        <Typography
          gutterBottom
          variant="h5"
          component="div"
          className="min-h-[65px]"
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
          <span className="text-black font-bold text-[17px]">SKU:</span>{" "}
          {dataProduct.sku}
        </Typography>

        {dataProduct?.upc && (
          <Typography
            variant="body2"
            sx={{ color: "text.secondary", margin: "10px 0px" }}
          >
            <span className="text-black font-bold text-[17px]">UPC:</span>{" "}
            {dataProduct?.upc}
          </Typography>
        )}

        {dataProduct?.idProductExt && (
          <Typography
            variant="body2"
            sx={{ color: "text.secondary", margin: "10px 0px" }}
          >
            <span className="text-black font-bold text-[17px]">Clave:</span>{" "}
            {dataProduct?.idProductExt}
          </Typography>
        )}

        <Typography
          variant="body2"
          sx={{ color: "text.secondary", margin: "10px 0px" }}
        >
          <span className="text-black font-bold text-[17px]">Disponible:</span>{" "}
          {dataProduct.stock || 0} piezas.
        </Typography>

        <Typography
          variant="body2"
          sx={{ color: "text.secondary", margin: "10px 0px" }}
        >
          <span className="text-black font-bold text-[17px]">Precio:</span>{" "}
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
            className="admin-btn admin-btn--primary flex w-full items-center justify-center gap-2"
            style={{ padding: "10px", margin: 0 }}
          >
            Dar de alta al sistema
            <MdFileUpload size={26} />
          </button>
        )}

        {dataProduct && dataProduct?.image_url.length > 0 && (
          <button
            type="button"
            className="admin-btn admin-btn--secondary flex w-full items-center justify-center gap-2"
            style={{ padding: "10px", margin: 0 }}
            onClick={() => {
              handleEditProduct(dataProduct);
            }}
          >
            Editar producto
            <MdEdit size={26} />
          </button>
        )}
        {dataProduct && dataProduct?.image_url?.length > 0 && (
          <button
            type="button"
            disabled={loadingRemoveProduct}
            className="admin-btn admin-btn--primary flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ padding: "10px", margin: 0 }}
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
              <MdAutorenew size={20} className="m-auto the-spinner" />
            ) : (
              <>
                Dar de baja del sistema
                <MdDownload size={26} />
              </>
            )}
          </button>
        )}
      </CardActions>
    </Card>
  );
};

export default CardComponent;
