"use client";

import { useTheContext } from "@/app/hooks/global.hook";
import { ProductsI } from "@/app/interfaces/products/products.interface";
import UtilsService from "@/app/services/utils";
import {
  Card,
  CardActions,
  CardContent,
  CardMedia,
  Typography,
} from "@mui/material";
import { MdFileUpload } from "react-icons/md";

const CardComponent = ({ dataProduct }: { dataProduct: ProductsI }) => {
  const { formatCurrency } = UtilsService();
  const { setDataModal } = useTheContext();

  const handleAltaProduct = async (dataProductProp: ProductsI) => {
    //console.log(dataProductProp);
    setDataModal({
      isOpen: true,
      title: "Dar de alta el producto",
      content: "¿Seguro que deseas dar de alta el producto?",
      type: "info",
      showActions: true,
      onClose: () => {
        setDataModal((prev) => ({ ...prev, isOpen: false }));
      },
      onConfirm: () => {},
    });
  };

  return (
    <Card
      key={dataProduct.idProduct}
      sx={{ maxWidth: 300, padding: "10px" }}
      className="shadow rounded"
    >
      <CardMedia
        sx={{ height: 200, objectFit: "contain" }}
        image={dataProduct.image_url[0]}
      />
      <CardContent>
        <Typography gutterBottom variant="h5" component="div">
          {dataProduct.name.length > 30
            ? dataProduct.name.slice(0, 30)
            : dataProduct.name}
        </Typography>

        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {dataProduct.description.length > 30
            ? `${dataProduct.description.slice(0, 30)}...`
            : dataProduct.description}
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: "text.secondary", margin: "10px 0px" }}
        >
          <span className="text-black font-bold text-[17px]">SKU:</span>{" "}
          {dataProduct.sku}
        </Typography>

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
          <span className="text-black font-bold text-[17px]">Price:</span>{" "}
          {formatCurrency(Number(dataProduct.price))}
        </Typography>
      </CardContent>
      <CardActions
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <button
          onClick={() => handleAltaProduct(dataProduct)}
          className="bg-[#bb3d4b] rounded text-white font-bold flex justify-center gap-2 cursor-pointer"
          style={{
            padding: "10px",
          }}
        >
          Dar de alta al sistema
          <MdFileUpload size={26} />
        </button>
      </CardActions>
    </Card>
  );
};

export default CardComponent;
