"use client";

import { useState, useEffect } from "react";
import UtilsService from "@/app/services/utils";
import { FormControl, MenuItem, Select } from "@mui/material";

const DataProducts = ({ params, handleChangeStatusShip }: any) => {
  const { BRANCHES_DICO } = UtilsService();

  // Estado local para productos
  const [products, setProducts] = useState(params.value || []);

  // Sincronizamos si params.value cambia
  useEffect(() => {
    setProducts(params.value || []);
  }, [params.value]);

  const handleChange = (event: any, idShipment: number) => {
    // Actualizamos estado local
    const newProducts = products.map((p: any) =>
      p.idShipment === idShipment
        ? { ...p, statusShip: event.target.value }
        : p,
    );
    setProducts(newProducts);

    // Llamamos a la función que hace la petición

    handleChangeStatusShip(event, idShipment, params.row.idUser);
  };

  return (
    <div className="flex flex-col gap-3 min-w-[500px] max-w-[700px] max-h-[500px] overflow-y-auto pr-2">
      {products.map((item: any, index: number) => {
        // Info del producto
        const productInfo = {
          name: item.productName,
          description: item.description,
          sku: item.sku,
          upc: item.upc,
          clave: item.clave,
          quantity: item.quantity,
          statusShip: item.statusShip,
        };

        // Info de dirección
        const addressInfo = item.address
          ? {
              delivery: "Domicilio",
              street: item.address.street,
              noExt: item.address.noExt,
              noInt: item.address.noInt || "",
              cp: item.address.cp,
              cologne: item.address.cologne,
              city: item.address.city,
              state: item.address.state,
              country: item.address.country,
              requireInsurance: item.address.requireInsurance === 1,
              branch: BRANCHES_DICO.find(
                (bd) => bd.name === item.address.branche,
              )?.name,
              shippingMethod: item.address.shipping_method,
              trackingNumber: item.address.trackingNumber,
            }
          : { delivery: "PCinBOX-LEON" };

        return (
          <div
            key={index}
            className="rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors p-4"
            style={{
              padding: "10px",
            }}
          >
            {/* Información del producto */}
            <div className="flex flex-col gap-3">
              <div>
                <span className="text-gray-500 text-sm font-semibold block mb-1">
                  Nombre:
                </span>
                <p className="text-gray-900 font-medium">{productInfo.name}</p>
              </div>

              {productInfo.description && (
                <div>
                  <span className="text-gray-500 text-sm font-semibold block mb-1">
                    Descripción:
                  </span>
                  <p className="text-gray-700">{productInfo.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {productInfo.sku && (
                  <div>
                    <span className="text-gray-500 text-sm font-semibold block mb-1">
                      SKU:
                    </span>
                    <p className="text-gray-700">{productInfo.sku}</p>
                  </div>
                )}
                {productInfo.upc && (
                  <div>
                    <span className="text-gray-500 text-sm font-semibold block mb-1">
                      UPC:
                    </span>
                    <p className="text-gray-700">{productInfo.upc}</p>
                  </div>
                )}
                {productInfo.clave && (
                  <div>
                    <span className="text-gray-500 text-sm font-semibold block mb-1">
                      Clave:
                    </span>
                    <p className="text-gray-700">{productInfo.clave}</p>
                  </div>
                )}
                <div>
                  <span className="text-gray-500 text-sm font-semibold block mb-1">
                    Cantidad:
                  </span>
                  <p className="text-gray-700 font-semibold">
                    {productInfo.quantity}
                  </p>
                </div>
              </div>

              {/* Información de entrega */}
              <div className="bg-orange-50 rounded-lg border border-orange-200 p-2 space-y-2 mt-2">
                <div className="flex items-center gap-2">
                  <span className="text-orange-700 font-bold text-sm">
                    📦 Entrega:
                  </span>
                  <span className="text-gray-800 font-medium text-sm">
                    {addressInfo.delivery}
                  </span>
                </div>

                {addressInfo.street && (
                  <>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-700 font-bold text-sm">
                        📍
                      </span>
                      <span className="text-gray-700 text-sm">
                        {`${addressInfo.street} #${addressInfo.noExt} ${addressInfo.noInt}, CP: ${addressInfo.cp}, Colonia: ${addressInfo.cologne}, Ciudad: ${addressInfo.city}, Estado: ${addressInfo.state}, País: ${addressInfo.country}`}
                      </span>
                    </div>

                    {addressInfo.requireInsurance && (
                      <div className="flex items-center gap-2 bg-amber-100 rounded p-1">
                        <span className="text-amber-700 font-bold text-sm">
                          Seguro Requerido
                        </span>
                        <span className="text-green-700 font-bold text-sm">
                          ✓
                        </span>
                      </div>
                    )}

                    {addressInfo.branch && (
                      <div className="flex items-center gap-2 bg-amber-100 rounded p-1">
                        <span className="text-amber-700 font-bold text-sm">
                          Sucursal de pedido
                        </span>
                        <span className="text-green-700 font-bold text-sm">
                          {addressInfo.branch}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 bg-amber-100 rounded p-1">
                      <span className="text-amber-700 font-bold text-sm">
                        Paquetería
                      </span>
                      <span className="text-green-700 font-bold text-sm">
                        {addressInfo.shippingMethod === "estafeta"
                          ? "Estafeta"
                          : "Paquete Express"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 bg-amber-100 rounded p-1">
                      <span className="text-amber-700 font-bold text-sm">
                        NO. Guía
                      </span>
                      <span className="text-green-700 font-bold text-sm">
                        {addressInfo.trackingNumber}
                      </span>
                    </div>
                  </>
                )}

                {/* Select de estado de envío */}
                <div className="pt-2 my-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Estado de envío:
                  </label>
                  <div className="w-[150px]">
                    <FormControl fullWidth>
                      <Select
                        value={item.statusShip}
                        onChange={(e) => handleChange(e, item.idShipment)}
                      >
                        <MenuItem value={"entregado"}>Entregado</MenuItem>
                        <MenuItem value={"cancelado"}>Cancelado</MenuItem>
                        <MenuItem value={"enviado"}>Enviado</MenuItem>
                        <MenuItem value={"procesando"}>Procesando</MenuItem>
                        <MenuItem value={"disponible"}>Disponible</MenuItem>
                      </Select>
                    </FormControl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DataProducts;
