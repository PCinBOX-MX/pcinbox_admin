"use client";

import {
  Alert,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
import CardComponent from "../shared/components/especific/card/CardComponent";
import useProveedores from "./useProveedores";
import { useEffect } from "react";
import { MdAdd, MdAutorenew } from "react-icons/md";
import { useTheContext } from "../hooks/global.hook";

const Proveedores = () => {
  const { dataProveedores } = useTheContext();
  const {
    slcProveedor,
    dataProductProveedor,
    handleGetProductsByProveedor,
    handleOnChange,
    handleGetProveedores,
    showModalRegisterProveedor,
    handleAddProduct,
  } = useProveedores();

  useEffect(() => {
    handleGetProveedores();
  }, []);

  useEffect(() => {
    if (slcProveedor) {
      handleGetProductsByProveedor(slcProveedor);
    }
  }, [slcProveedor]);

  return (
    <section className="w-full">
      <div className="w-full flex justify-center items-center">
        <div className="w-[95%]">
          {!dataProveedores.loading ? (
            <FormControl fullWidth>
              <InputLabel id="demo-simple-select-label">
                Selecciona un proveedor
              </InputLabel>
              <Select
                labelId="demo-simple-select-label"
                id="demo-simple-select"
                value={slcProveedor}
                label="Selecciona un proveedor"
                onChange={handleOnChange}
              >
                {dataProveedores && dataProveedores.data.length > 0 ? (
                  dataProveedores.data.map((p) => {
                    return (
                      <MenuItem
                        key={p.idProvider}
                        value={p.idProvider.toString()}
                      >
                        {p.companyName}
                      </MenuItem>
                    );
                  })
                ) : (
                  <MenuItem key={0} value={String(0)}>
                    Sin proveedores disponibles
                  </MenuItem>
                )}
              </Select>
            </FormControl>
          ) : (
            <>
              <MdAutorenew size={20} className="m-auto the-spinner" />
              <span>Cargando...</span>
            </>
          )}

          <div
            style={{
              marginTop: "10px",
              marginBottom: "10px",
              padding: "5px",
            }}
            className="flex justify-start relative gap-4"
          >
            <button
              className="bg-[#bb3d4b] text-[white] rounded font-bold cursor-pointer flex justify-center items-center gap-1"
              style={{
                padding: "10px",
              }}
              onClick={showModalRegisterProveedor}
            >
              <MdAdd size={22} />
              Agregar proveedor
            </button>

            <button
              style={{
                padding: "10px",
              }}
              onClick={handleAddProduct}
              className="bg-white border rounded font-bold cursor-pointer flex justify-center items-center gap-1"
            >
              <MdAdd size={22} />
              Agregar Producto
            </button>

            <div className="absolute right-0 top-0">
              <TextField
                id="outlined-basic"
                label="Buscar producto"
                variant="outlined"
              />
            </div>
          </div>

          <div
            className="flex justify-center flex-wrap rounded gap-5 bg-white"
            style={{
              marginTop: "30px",
              marginBottom: "30px",
              paddingLeft: "10px",
              paddingTop: "20px",
              paddingBottom: "20px",
              paddingRight: "10px",
              boxShadow: "rgba(99, 99, 99, 0.2) 0px 2px 8px 0px",
            }}
          >
            {/* {!loadingDataProveedores ? <CardComponent /> : "cargando...."} */}
            {!dataProductProveedor.loading ? (
              dataProductProveedor.data &&
              dataProductProveedor.data.length > 0 ? (
                dataProductProveedor.data.map((product, index) => {
                  return <CardComponent key={index} dataProduct={product} />;
                })
              ) : (
                <Alert severity="info">Sin contenido disponible</Alert>
              )
            ) : (
              <>
                <MdAutorenew size={20} className="m-auto the-spinner" />
                <span>Cargando...</span>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Proveedores;
