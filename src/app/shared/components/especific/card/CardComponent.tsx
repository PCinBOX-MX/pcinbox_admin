"use client";

import { ProductsI } from "@/app/interfaces/products/products.interface";
import {
  Card,
  CardActions,
  CardContent,
  CardMedia,
  Typography,
} from "@mui/material";
import { MdFileDownload, MdFileUpload } from "react-icons/md";

const CardComponent = ({ dataProduct }: { dataProduct: ProductsI }) => {
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
            ? dataProduct.description.slice(0, 30)
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
          className="bg-[#bb3d4b] rounded text-white font-bold flex justify-center gap-2 cursor-pointer"
          style={{
            padding: "10px",
          }}
        >
          Dar de alta al sistema
          <MdFileUpload size={26} />
        </button>

        <button
          className="bg-[#606060] rounded text-white font-bold flex justify-center gap-2 cursor-pointer"
          style={{
            padding: "10px",
            marginTop: "10px",
          }}
        >
          Dar de baja del sistema
          <MdFileDownload size={26} />
        </button>
      </CardActions>
    </Card>
  );
};

export default CardComponent;
