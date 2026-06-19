"use client";

import {
  Alert,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
import CardComponent from "../shared/components/especific/card/CardComponent";
import useProveedores from "./useProveedores";
import { useEffect, useState } from "react";
import { MdAdd, MdAutorenew } from "react-icons/md";
import { useTheContext } from "../hooks/global.hook";
import PaginatorComponent from "../shared/components/common/paginator/Paginator";

const Proveedores = () => {
  const { dataProveedores, dataProductProveedor, setProductsProveedor } =
    useTheContext();
  const {
    slcProveedor,
    handleGetProductsByProveedor,
    handleOnChange,
    showModalRegisterProveedor,
    handleAddProduct,
  } = useProveedores();

  const [search, setSearch] = useState<string>("");

  const itemsPerPage = 8;
  const [page, setPage] = useState(1);

  useEffect(() => {
    setProductsProveedor((prev) => {
      if (!search) {
        return { ...prev, copyData: prev.data };
      }

      const filtered = prev.data.filter((item) => {
        const name = item.name?.toLowerCase()?.trim() || "";
        const description = item.description?.toLowerCase()?.trim() || "";
        const upc = String((item as any).upc || "")
          .toLowerCase()
          ?.trim();
        const idProductExt = item?.idProductExt?.toLowerCase()?.trim() || "";

        return (
          name.includes(search) ||
          description.includes(search) ||
          upc.includes(search) ||
          idProductExt.includes(search)
        );
      });

      return {
        ...prev,
        copyData: filtered,
      };
    });
  }, [search]);

  //[search, dataProductProveedor.data]

  const startIndex = (page - 1) * itemsPerPage;
  const visibleDataProveedores = dataProductProveedor.copyData!.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  return (
    <section className="w-full no-padding-top">
      <div className="admin-panel">
        <div className="admin-panel__header">
          <h2 className="admin-panel__title">Catálogo por proveedor</h2>
          <p className="admin-panel__subtitle">
            Consulta, registra y edita productos de PCInbox, TechSmart y Dicotech
          </p>
        </div>
        <div className="admin-panel__body">
          {!dataProveedores.loading ? (
            <div className="w-full flex flex-col sm:flex-row justify-between gap-3 mb-4">
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
              <button
                type="button"
                disabled={!slcProveedor}
                className="admin-btn admin-btn--primary shrink-0 min-w-[110px]"
                onClick={() => {
                  if (slcProveedor) {
                    handleGetProductsByProveedor(slcProveedor);
                  }
                }}
              >
                Consultar
              </button>
            </div>
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
              type="button"
              className="admin-btn admin-btn--primary flex items-center gap-1"
              onClick={showModalRegisterProveedor}
            >
              <MdAdd size={22} />
              Agregar proveedor
            </button>

            <button
              type="button"
              onClick={handleAddProduct}
              className="admin-btn admin-btn--secondary flex items-center gap-1"
            >
              <MdAdd size={22} />
              Agregar Producto
            </button>
            {/* {!dataProductProveedor.loading &&
            visibleDataProveedores &&
            visibleDataProveedores.length > 0 ? ( */}
            <div className="absolute right-0 top-0">
              <TextField
                id="outlined-basic"
                label="Buscar producto"
                variant="outlined"
                onChange={(event) => {
                  const value = event.target.value.toLowerCase().trim();
                  setSearch(value);
                  //  if (event.target.value != "") {
                  // const search = event.target.value.toLowerCase();

                  // setProductsProveedor((prev) => {
                  //   // si el usuario borra todo, restauramos los datos completos
                  //   if (search === "") {
                  //     return {
                  //       ...prev,
                  //       copyData: prev.data, // <<--- restaurar todo
                  //     };
                  //   }

                  //   // filtrar cuando SI hay texto
                  //   const filtered = prev.data?.filter((item) => {
                  //     const name = item.name?.toLowerCase() || "";
                  //     const description = item.description?.toLowerCase() || "";
                  //     const upc = String((item as any).upc || "").toLowerCase();
                  //     const idProductExt =
                  //       item?.idProductExt?.toLowerCase() || "";

                  //     return (
                  //       name.includes(search) ||
                  //       description.includes(search) ||
                  //       upc.includes(search) ||
                  //       idProductExt.includes(search)
                  //     );
                  //   });

                  //   return {
                  //     ...prev,
                  //     copyData: filtered,
                  //   };
                  // });
                  //}
                }}
              />
            </div>
            {/* // ) : (
            //   ""
            // )} */}
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
            {!dataProductProveedor.loading ? (
              visibleDataProveedores && visibleDataProveedores.length > 0 ? (
                visibleDataProveedores.map((product, index) => {
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
            <div className="flex justify-end w-full">
              <PaginatorComponent
                totalItems={dataProductProveedor.copyData!.length}
                itemsPerPage={8}
                onPageChange={setPage}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Proveedores;
