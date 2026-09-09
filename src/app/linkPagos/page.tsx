"use client";

import {
  ShoppingCart,
  Trash2,
  User,
  FileText,
  RotateCcw,
} from "lucide-react";
import EmptyState from "../shared/components/common/emptyState/EmptyState";
import {
  Autocomplete,
  FormControl,
  TextField,
} from "@mui/material";
import useLinkPagos from "./useLinkPagos";
import { useTheContext } from "../hooks/global.hook";
import { MdAdd, MdAutorenew } from "react-icons/md";
import UtilsService from "../services/utils";
import AdminPageShell from "../shared/components/layout/AdminPageShell";
import styles from "./linkPagos.module.css";
import { adminFieldSx } from "../theme/adminFieldSx";

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

  const calculateTotal = () => {
    if (!dataLinkPago?.products?.length) return 0;
    return dataLinkPago.products.reduce(
      (sum, product) => sum + product.price * (product as any).quantity,
      0,
    );
  };

  const resetForm = () => {
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
    setSelectedProduct(null);
    setQuantity(0);
  };

  return (
    <AdminPageShell
      title="Links de pago"
      subtitle="Crea órdenes personalizadas y genera PDFs profesionales"
    >
      <div className={styles.shell}>
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.iconBox} aria-hidden>
              <User size={20} />
            </span>
            <h3 className={styles.sectionTitle}>Información del cliente</h3>
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
              sx={adminFieldSx}
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
              sx={adminFieldSx}
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
              sx={adminFieldSx}
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
              sx={adminFieldSx}
            />
          </div>
        </section>

        <section className={styles.sectionBody}>
          <div className={styles.sectionHeader}>
            <span className={styles.iconBox} aria-hidden>
              <ShoppingCart size={20} />
            </span>
            <h3 className={styles.sectionTitle}>Agregar productos</h3>
          </div>

          <div className={styles.productForm}>
            <div className={styles.productRow}>
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
                      (m) => m.idProduct === selectedProduct?.idProduct,
                    ) || null
                  }
                  renderOption={(props, option) => (
                    <li {...props} key={option.idProduct}>
                      <div className={styles.optionRow}>
                        <div className={styles.optionText}>
                          <div className={styles.optionName}>{option.name}</div>
                          <div className={styles.optionDesc}>
                            {option.description ?? ""} — Stock: {option.stock}
                          </div>
                        </div>
                        <img
                          src={
                            Array.isArray(option.image_url) && option.image_url[0]
                              ? option.image_url[0]
                              : "/imagen-no-encontrada.png"
                          }
                          width={50}
                          height={50}
                          alt=""
                          style={{ objectFit: "contain" }}
                          onError={(event) => {
                            const target = event.currentTarget;
                            if (target.src.includes("imagen-no-encontrada.png"))
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
                      label="Buscar producto"
                      name="products"
                      placeholder="Selecciona un producto"
                      required
                      sx={adminFieldSx}
                    />
                  )}
                />
              </FormControl>

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
                sx={adminFieldSx}
              />

              <button
                type="button"
                className={styles.addBtn}
                aria-label="Agregar producto"
                onClick={() => {
                  setDataLinkPago((prev) => {
                    if (selectedProduct && quantity) {
                      const existingProductIndex = prev.products.findIndex(
                        (p) => p.idProduct === selectedProduct?.idProduct,
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
                    }
                    return prev;
                  });
                }}
              >
                <MdAdd size={24} />
              </button>
            </div>

            {selectedProduct ? (
              <span className={styles.stockBadge}>
                Disponibles: {selectedProduct.stock} piezas
              </span>
            ) : null}
          </div>

          <div className={styles.cartList}>
            {dataLinkPago?.products?.length > 0 ? (
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
                          aria-label="Quitar producto"
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
                <EmptyState
                  title="Carrito vacío"
                  description="No hay productos agregados al carrito."
                  icon="products"
                  compact
                  className={styles.emptyAlert}
                />
              </div>
            )}
          </div>

          {dataLinkPago?.products?.length > 0 ? (
            <div className={styles.totalBox}>
              <div className={styles.totalRow}>
                <span>Total</span>
                <span>{formatCurrency(calculateTotal())}</span>
              </div>
            </div>
          ) : null}

          <div className={styles.actionsGrid}>
            <button
              type="button"
              className="admin-btn-primary"
              disabled={loading}
              onClick={() => {
                handleGeneratePDF();
              }}
            >
              <span className={styles.btnRow}>
                {loading ? (
                  <MdAutorenew size={20} className="animate-spin" />
                ) : (
                  <FileText size={20} />
                )}
                {loading ? "Generando…" : "Generar PDF"}
              </span>
            </button>

            <button
              type="button"
              className="admin-btn-secondary"
              disabled={loading}
              onClick={resetForm}
            >
              <span className={styles.btnRow}>
                <RotateCcw size={20} />
                Limpiar todo
              </span>
            </button>
          </div>
        </section>
      </div>
    </AdminPageShell>
  );
}
