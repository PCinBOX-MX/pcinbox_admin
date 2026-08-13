"use client";

import {
  ShoppingCart,
  Trash2,
  User,
  FileText,
  RotateCcw,
  CreditCard,
} from "lucide-react";
import {
  Alert,
  Autocomplete,
  Box,
  FormControl,
  TextField,
} from "@mui/material";
import useLinkPagos from "./useLinkPagos";
import { useTheContext } from "../hooks/global.hook";
import { MdAdd, MdAutorenew } from "react-icons/md";
import UtilsService from "../services/utils";
import AdminPageShell from "../shared/components/layout/AdminPageShell";

export default function LinkPagosPage() {
  const {    quantity,
    dataLinkPago,
    selectedProduct,
    loading,

    setSelectedProduct,
    setDataLinkPago,
    setQuantity,
    handleGeneratePDF,
  } = useLinkPagos();

  const { dataProducts } = useTheContext();
  const { formatCurrency } = UtilsService();

  // Calcular totales
  const calculateSubtotal = () => {
    if (dataLinkPago && dataLinkPago?.products?.length > 0) {
      return (
        dataLinkPago?.products?.reduce(
          (sum, product) => sum + product.price * (product as any).quantity,
          0
        ) || 0
      );
    }
  };

  const calculateTotal = () => calculateSubtotal();

  return (
    <AdminPageShell
      title="Links de pago"
      subtitle="Crea órdenes personalizadas y genera PDFs profesionales"
    >
      <section className="w-full">
        <div className="max-w-6xl mx-auto w-full">
          <div className="rounded-2xl overflow-hidden" style={{ marginTop: "15px" }}>          <Box
            component="form"
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 3,
            }}
          >
            {/* Sección Información del Cliente */}
            <div className=" from-gray-50 to-white p-8 border-b border-gray-200">
              <div
                className="flex items-center gap-3 mb-6"
                style={{
                  marginBottom: "15px",
                  marginTop: "15px",
                }}
              >
                <div
                  className="bg-[#bb3d4b] rounded-xl shadow-lg"
                  style={{ padding: "5px" }}
                >
                  <User className="text-white" size={24} />
                </div>
                <h3 className="text-gray-800 text-2xl font-bold">
                  Información del Cliente
                </h3>
              </div>

              <div
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
                style={{ marginTop: "5px" }}
              >
                <TextField
                  label="Nombre"
                  variant="outlined"
                  name="name"
                  value={dataLinkPago?.name || ""}
                  onChange={(event) => {
                    setDataLinkPago((prev) => ({
                      ...prev,
                      name: event?.target?.value,
                    }));
                  }}
                  required
                  className="bg-white"
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      "&:hover fieldset": {
                        borderColor: "#bb3d4b",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "#bb3d4b",
                      },
                    },
                    "& .MuiInputLabel-root.Mui-focused": {
                      color: "#bb3d4b",
                    },
                  }}
                />

                <TextField
                  label="Apellidos"
                  variant="outlined"
                  name="lastname"
                  value={dataLinkPago?.lastname || ""}
                  onChange={(event) => {
                    setDataLinkPago((prev) => ({
                      ...prev,
                      lastname: event?.target?.value,
                    }));
                  }}
                  className="bg-white"
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      "&:hover fieldset": {
                        borderColor: "#bb3d4b",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "#bb3d4b",
                      },
                    },
                    "& .MuiInputLabel-root.Mui-focused": {
                      color: "#bb3d4b",
                    },
                  }}
                />

                <TextField
                  label="Email"
                  variant="outlined"
                  name="email"
                  value={dataLinkPago?.email || ""}
                  onChange={(event) => {
                    setDataLinkPago((prev) => ({
                      ...prev,
                      email: event?.target?.value,
                    }));
                  }}
                  required
                  className="bg-white"
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      "&:hover fieldset": {
                        borderColor: "#bb3d4b",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "#bb3d4b",
                      },
                    },
                    "& .MuiInputLabel-root.Mui-focused": {
                      color: "#bb3d4b",
                    },
                  }}
                />

                <TextField
                  label="Teléfono"
                  variant="outlined"
                  name="phone"
                  type="tel"
                  value={dataLinkPago?.phone || ""}
                  onChange={(event) => {
                    setDataLinkPago((prev) => ({
                      ...prev,
                      phone: event?.target?.value,
                    }));
                  }}
                  required
                  className="bg-white"
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      "&:hover fieldset": {
                        borderColor: "#bb3d4b",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "#bb3d4b",
                      },
                    },
                    "& .MuiInputLabel-root.Mui-focused": {
                      color: "#bb3d4b",
                    },
                  }}
                />
              </div>
            </div>

            {/* Sección Agregar Productos */}
            <div className="px-8 pb-8">
              <div className="flex items-center gap-3 mb-6">
                <div
                  className="bg-[#bb3d4b] rounded-xl shadow-lg"
                  style={{ padding: "5px" }}
                >
                  <ShoppingCart className="text-white" size={24} />
                </div>
                <h3 className="text-gray-800 text-2xl font-bold">
                  Agregar Productos
                </h3>
              </div>

              {/* Formulario de productos */}
              <div
                className="bg-gray-50 rounded-xl"
                style={{
                  marginTop: "15px",
                  padding: "20px",
                  marginBottom: "10px",
                }}
              >
                <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr_auto] gap-4">
                  <div className="space-y-2">
                    <FormControl fullWidth>
                      <Autocomplete
                        fullWidth
                        options={dataProducts || []}
                        getOptionLabel={(option: any) =>
                          `${option.name} ${
                            option.description == null ? "" : option.description
                          }`
                        }
                        value={
                          dataProducts.find(
                            (m) => m.idProduct === selectedProduct?.idProduct
                          ) || null
                        }
                        renderOption={(props, option) => (
                          <li {...props} key={option.idProduct}>
                            <div className="flex justify-between w-full">
                              <div className="py-2">
                                <div className="font-semibold text-gray-800">
                                  {option.name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {option.description ?? ""} - Stock:{" "}
                                  {option.stock}
                                </div>
                              </div>
                              <img
                                src={
                                  Array.isArray(option.image_url) &&
                                  option.image_url[0]
                                    ? option.image_url[0]
                                    : "/imagen-no-encontrada.png"
                                }
                                width="50px"
                                height="50px"
                                style={{
                                  objectFit: "contain",
                                }}
                                onError={(event) => {
                                  const target = event.currentTarget;
                                  if (
                                    target.src.includes(
                                      "imagen-no-encontrada.png",
                                    )
                                  )
                                    return;
                                  target.src = "/imagen-no-encontrada.png";
                                }}
                              />
                            </div>
                          </li>
                        )}
                        onChange={(_, newValue) => {
                          setSelectedProduct(newValue);
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Buscar Producto"
                            name="products"
                            placeholder="Selecciona un producto"
                            required
                            sx={{
                              backgroundColor: "white",
                              "& .MuiOutlinedInput-root": {
                                "&:hover fieldset": {
                                  borderColor: "#bb3d4b",
                                },
                                "&.Mui-focused fieldset": {
                                  borderColor: "#bb3d4b",
                                },
                              },
                              "& .MuiInputLabel-root.Mui-focused": {
                                color: "#bb3d4b",
                              },
                            }}
                          />
                        )}
                      />
                    </FormControl>
                    {selectedProduct && (
                      <div className="flex items-center gap-2">
                        <span
                          className="bg-indigo-600 text-white text-xs font-semibold rounded-full shadow-sm"
                          style={{
                            padding: "5px",
                            marginTop: "5px",
                          }}
                        >
                          Disponibles: {selectedProduct.stock} piezas
                        </span>
                      </div>
                    )}
                  </div>

                  <TextField
                    label="Cantidad"
                    variant="outlined"
                    type="number"
                    value={quantity || ""}
                    onChange={(event) => {
                      if (selectedProduct) {
                        setQuantity(Number(event.target.value));
                      }
                    }}
                    sx={{
                      backgroundColor: "white",
                      "& .MuiOutlinedInput-root": {
                        "&:hover fieldset": {
                          borderColor: "#bb3d4b",
                        },
                        "&.Mui-focused fieldset": {
                          borderColor: "#bb3d4b",
                        },
                      },
                      "& .MuiInputLabel-root.Mui-focused": {
                        color: "#bb3d4b",
                      },
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => {
                      setDataLinkPago((prev) => {
                        if (selectedProduct && quantity) {
                          const existingProductIndex = prev.products.findIndex(
                            (p) => p.idProduct === selectedProduct?.idProduct
                          );

                          let updatedProducts;
                          const totalQuantityIfExists =
                            existingProductIndex !== -1
                              ? prev.products[existingProductIndex].quantity +
                                quantity
                              : quantity;

                          if (totalQuantityIfExists > selectedProduct.stock) {
                            return prev;
                          }

                          if (existingProductIndex !== -1) {
                            updatedProducts = [...prev.products];
                            updatedProducts[existingProductIndex] = {
                              ...updatedProducts[existingProductIndex],
                              quantity: totalQuantityIfExists,
                            };
                          } else {
                            updatedProducts = [
                              ...prev.products,
                              {
                                ...selectedProduct,
                                quantity: quantity,
                              },
                            ];
                          }

                          setSelectedProduct(null);
                          setQuantity(0);

                          return {
                            ...prev,
                            products: updatedProducts,
                          };
                        } else {
                          return prev;
                        }
                      });
                    }}
                    style={{
                      paddingLeft: "10px",
                      paddingRight: "10px",
                      height: "60px",
                      cursor: "pointer",
                    }}
                    className="bg-gradient-to-r from-[#bb3d4b] to-[#9a3139] hover:from-[#9a3139] hover:to-[#7a252f] text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
                  >
                    <MdAdd size={24} />
                  </button>
                </div>
              </div>

              {/* Lista de productos */}
              <div
                className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 max-h-[500px] overflow-y-auto shadow-inner border border-gray-200"
                style={{ marginTop: "20px" }}
              >
                {dataLinkPago?.products &&
                dataLinkPago?.products?.length > 0 ? (
                  <div
                    className="space-y-4"
                    style={{
                      padding: "10px",
                    }}
                  >
                    {dataLinkPago?.products?.map((product, indexProduct) => (
                      <div
                        key={indexProduct}
                        style={{
                          padding: "10px",
                          marginTop: "15px",
                        }}
                        className="bg-white rounded-xl shadow-md"
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <h4 className="text-gray-800 font-bold text-lg mb-2">
                              {product?.name && product?.name?.length > 50
                                ? `${product?.name?.slice(0, 50)}...`
                                : product?.name}
                            </h4>
                            <div className="flex items-center gap-2 text-gray-500 text-sm">
                              <span
                                className="bg-gray-100 px-3 py-1 rounded-full font-medium"
                                style={{
                                  padding: "3px",
                                }}
                              >
                                Cantidad: {(product as any)?.quantity}
                              </span>
                              <span>×</span>
                              <span className="font-semibold text-[#bb3d4b]">
                                {formatCurrency(product?.price)}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-3">
                            <span className="text-gray-900 font-bold text-2xl">
                              {formatCurrency(
                                product?.price * (product as any).quantity
                              )}
                            </span>
                            <button
                              type="button"
                              style={{
                                padding: "5px",
                                cursor: "pointer",
                              }}
                              onClick={() => {
                                setDataLinkPago((prev) => {
                                  const updatedProducts = prev.products.filter(
                                    (p) => p.idProduct !== product.idProduct
                                  );

                                  return {
                                    ...prev,
                                    products: updatedProducts,
                                  };
                                });
                              }}
                              className="bg-red-500 hover:bg-red-600 text-white rounded-lg p-2.5 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-110 active:scale-95"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12">
                    <Alert
                      severity="info"
                      className="max-w-md mx-auto"
                      sx={{
                        borderRadius: "12px",
                        "& .MuiAlert-icon": {
                          fontSize: "28px",
                        },
                      }}
                    >
                      No hay productos agregados al carrito
                    </Alert>
                  </div>
                )}
              </div>

              {/* Resumen de totales */}
              {dataLinkPago?.products?.length > 0 && (
                <div
                  className="mt-8 bg-gradient-to-r from-[#bb3d4b] to-[#9a3139] rounded-2xl shadow-2xl p-8 text-white"
                  style={{ marginTop: "20px" }}
                >
                  <div className="space-y-4">
                    <div
                      className="flex justify-between items-center text-3xl font-bold pt-2"
                      style={{
                        padding: "8px",
                      }}
                    >
                      <span>Total:</span>
                      <span>{formatCurrency(calculateTotal())}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Botones de acción */}
              <div
                className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8"
                style={{ margin: "10px" }}
              >
                <button
                  type="button"
                  style={{
                    padding: "10px",
                    cursor: "pointer",
                  }}
                  disabled={loading}
                  onClick={() => {
                    handleGeneratePDF();
                  }}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold rounded-xl px-8 py-4 flex items-center justify-center gap-3 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
                >
                  {loading ? (
                    <MdAutorenew size={22} />
                  ) : (
                    <>
                      <FileText size={22} />
                      <span className="text-lg">Generar PDF</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  style={{
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    setDataLinkPago({
                      chargeId: "",
                      customerId: "",
                      description: "",
                      email: "",
                      lastname: "",
                      linkPago: "",
                      monto: 0,
                      name: "",
                      products: [],
                      referencia: "",
                      phone: "",
                      status: "payment_pending",
                    });
                  }}
                  className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-bold rounded-xl px-8 py-4 flex items-center justify-center gap-3 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
                >
                  <RotateCcw size={22} />
                  <span className="text-lg">Limpiar Todo</span>
                </button>
              </div>
            </div>
          </Box>
        </div>
      </div>
    </section>
    </AdminPageShell>
  );
}