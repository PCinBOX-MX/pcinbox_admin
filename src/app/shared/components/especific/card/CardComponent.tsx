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
import { MdEdit, MdFileUpload, MdRemove } from "react-icons/md";
import { Carousel } from "react-responsive-carousel";
import FormProduct from "../FormProduct/FormProduct";
import { Dispatch, SetStateAction, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import UploadImgProductProvider2 from "../registerProduct/UploadImgProvider2";

const CardComponent = ({ dataProduct }: { dataProduct: ProductsI }) => {
  const { formatCurrency } = UtilsService();
  const { setDataModal } = useTheContext();

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
    if (dataProductProp?.providerId == 2) {
      setDataModal({
        isOpen: true,
        title: "Ingresa los datos",
        content: (
          <UploadImgProductProvider2 dataProductProp={dataProductProp} />
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
      sx={{ minWidth: 300, maxWidth: 300, padding: "10px" }}
      className="shadow rounded"
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

        <Typography
          variant="body2"
          sx={{ color: "text.secondary", margin: "10px 0px" }}
        >
          <span className="text-black font-bold text-[17px]">Disponible:</span>{" "}
          {dataProduct.stock} piezas.
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
        <button
          onClick={() => {
            handleAltaProduct(dataProduct);
          }}
          className="bg-[#bb3d4b] rounded text-white font-bold flex justify-center gap-2 cursor-pointer w-full"
          style={{
            padding: "10px",
          }}
        >
          Dar de alta al sistema
          <MdFileUpload size={26} />
        </button>

        <button
          className="bg-[#808080] rounded text-white font-bold flex justify-center gap-2 cursor-pointer w-full"
          style={{
            padding: "10px",
            marginLeft: "0px",
          }}
          onClick={() => {
            handleEditProduct(dataProduct);
          }}
        >
          Editar producto
          <MdEdit size={26} />
        </button>
      </CardActions>
    </Card>
  );
};

export default CardComponent;
