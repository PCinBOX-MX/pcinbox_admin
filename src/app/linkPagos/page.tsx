"use client";

import {
  ShoppingCart,
  Trash2,
  User,
  FileText,
  RotateCcw,
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
import styles from "./linkPagos.module.css";

export default function LinkPagosPage() {
  const {
    quantity,
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

  const calculateSubtotal = () => {
    if (dataLinkPago && dataLinkPago?.products?.length > 0) {
      return (
        dataLinkPago?.products?.reduce(
          (sum, product) => sum + product.price * (product as any).quantity,
          0,
        ) || 0
      );
    }
  };

  const calculateTotal = () => calculateSubtotal();

  const muiFieldSx = {
    "& .MuiOutlinedInput-root": {
      "&:hover fieldset": { borderColor: "#bb3d4b" },
      "&.Mui-focused fieldset": { borderColor: "#bb3d4b" },
    },
    "& .MuiInputLabel-root.Mui-focused": { color: "#bb3d4b" },
  };

  return (
    <section className="admin-page admin-page--flush-top">
      <div className="admin-panel">
        <div className="admin-panel__header">
          <h2 className="admin-panel__title">Links de pago</h2>
          <p className="admin-panel__subtitle">
            Crea órdenes de pago personalizadas y genera PDFs profesionales
          </p>
        </div>
        <div className="admin-panel__body">
          <Box component="form" sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <div className={styles.iconBox}>
                  <User size={24} />
                </div>
                <h3 className={styles.sectionTitle}>Información del Cliente</h3>
              </div>

              <div className={styles.formGrid}>
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
                  sx={{ backgroundColor: "white", ...muiFieldSx }}
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
                  sx={{ backgroundColor: "white", ...muiFieldSx }}
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
                  sx={{ backgroundColor: "white", ...muiFieldSx }}
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
                  sx={{ backgroundColor: "white", ...muiFieldSx }}
                />
              </div>
            </div>

            <div className={styles.sectionBody}>
              <div className={styles.sectionHeader}>
                <div className={styles.iconBox}>
                  <ShoppingCart size={24} />
                </div>
                <h3 className={styles.sectionTitle}>Agregar Productos</h3>
              </div>

              <div className={styles.productForm}>
                <div className={styles.productRow}>
                  <div>
                    <FormControl fullWidth>
                      <Autocomplete
                        fullWidth
                        options={dataProducts || []}
                        getOptionLabel={(option: any) =>
                          `${option.name} ${option.description == null ? "" : option.description}`
                        }
                        value={
                          dataProducts.find(
                            (m) => m.idProduct === selectedProduct?.idProduct,
                          ) || null
                        }
                        renderOption={(props, option) => (
                          <li {...props} key={option.idProduct}>
                            <div className={styles.optionRow}>
                              <div className={styles.optionText}>
                                <div className={styles.optionName}>{option.name}</div>
                                <div className={styles.optionDesc}>
                                  {option.description ?? ""} - Stock: {option.stock}
                                </div>
                              </div>
                              <img
                                src={option.image_url[0]}
                                width="50"
                                height="50"
                                alt=""
                                style={{ objectFit: "contain" }}
                              />
                            </div>
                          </li>
                        )}
                        onChange={(_, newValue) => setSelectedProduct(newValue)}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Buscar Producto"
                            name="products"
                            placeholder="Selecciona un producto"
                            required
                            sx={{ backgroundColor: "white", ...muiFieldSx }}
                          />
                        )}
                      />
                    </FormControl>
                    {selectedProduct && (
                      <span className={styles.stockBadge}>
                        Disponibles: {selectedProduct.stock} piezas
                      </span>
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
                    sx={{ backgroundColor: "white", ...muiFieldSx }}
                  />

                  <button
                    type="button"
                    className={styles.addBtn}
                    onClick={() => {
                      setDataLinkPago((prev) => {
                        if (selectedProduct && quantity) {
                          const existingProductIndex = prev.products.findIndex(
                            (p) => p.idProduct === selectedProduct?.idProduct,
                          );
                          const totalQuantityIfExists =
                            existingProductIndex !== -1
                              ? prev.products[existingProductIndex].quantity + quantity
                              : quantity;

                          if (totalQuantityIfExists > selectedProduct.stock) {
                            return prev;
                          }

                          let updatedProducts;
                          if (existingProductIndex !== -1) {
                            updatedProducts = [...prev.products];
                            updatedProducts[existingProductIndex] = {
                              ...updatedProducts[existingProductIndex],
                              quantity: totalQuantityIfExists,
                            };
                          } else {
                            updatedProducts = [
                              ...prev.products,
                              { ...selectedProduct, quantity },
                            ];
                          }

                          setSelectedProduct(null);
                          setQuantity(0);
                          return { ...prev, products: updatedProducts };
                        }
                        return prev;
                      });
                    }}
                  >
                    <MdAdd size={24} />
                  </button>
                </div>
              </div>

              <div className={styles.cartList}>
                {dataLinkPago?.products && dataLinkPago.products.length > 0 ? (
                  <div className={styles.cartItems}>
                    {dataLinkPago.products.map((product, indexProduct) => (
                      <div key={indexProduct} className={styles.cartItem}>
                        <div className={styles.cartItemRow}>
                          <div className={styles.cartItemMain}>
                            <h4 className={styles.cartItemTitle}>
                              {product?.name && product.name.length > 50
                                ? `${product.name.slice(0, 50)}...`
                                : product?.name}
                            </h4>
                            <div className={styles.cartItemMeta}>
                              <span className={styles.qtyPill}>
                                Cantidad: {(product as any)?.quantity}
                              </span>
                              <span>×</span>
                              <span className={styles.priceAccent}>
                                {formatCurrency(product?.price)}
                              </span>
                            </div>
                          </div>
                          <div className={styles.cartItemSide}>
                            <span className={styles.cartItemTotal}>
                              {formatCurrency(
                                product?.price * (product as any).quantity,
                              )}
                            </span>
                            <button
                              type="button"
                              className={styles.removeBtn}
                              onClick={() => {
                                setDataLinkPago((prev) => ({
                                  ...prev,
                                  products: prev.products.filter(
                                    (p) => p.idProduct !== product.idProduct,
                                  ),
                                }));
                              }}
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptyCart}>
                    <Alert severity="info" className={styles.emptyAlert} sx={{ borderRadius: "12px" }}>
                      No hay productos agregados al carrito
                    </Alert>
                  </div>
                )}
              </div>

              {dataLinkPago?.products?.length > 0 && (
                <div className={styles.totalBox}>
                  <div className={styles.totalRow}>
                    <span>Total:</span>
                    <span>{formatCurrency(calculateTotal())}</span>
                  </div>
                </div>
              )}

              <div className={styles.actionsGrid}>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleGeneratePDF()}
                  className={`admin-btn admin-btn--primary ${styles.btnRow}`}
                  style={{ padding: "12px 20px", margin: 0 }}
                >
                  {loading ? (
                    <MdAutorenew size={22} className="the-spinner" />
                  ) : (
                    <>
                      <FileText size={22} />
                      <span>Generar PDF</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
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
                  className={`admin-btn admin-btn--secondary ${styles.btnRow}`}
                  style={{ padding: "12px 20px", margin: 0 }}
                >
                  <RotateCcw size={22} />
                  <span>Limpiar todo</span>
                </button>
              </div>
            </div>
          </Box>
        </div>
      </div>
    </section>
  );
}
