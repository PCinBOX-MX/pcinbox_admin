"use client";

import {
  createContext,
  useContext,
  useState,
  Dispatch,
  SetStateAction,
  useRef,
  useEffect,
  RefObject,
} from "react";
import { usePathname } from "next/navigation";
import { isAuthPathname } from "../utils/authRoutes";
import { ProveedoresI } from "../interfaces/proveedores/proveedores.interface";
import io, { Socket } from "socket.io-client";
import { GridRowsProp } from "@mui/x-data-grid";
import { SalesI } from "../interfaces/sales/sales.interface";
import ProveedoresUtils from "../services/utils/proveedores.utils";
import { ProductsI } from "../interfaces/products/products.interface";

type ModalType = "success" | "error" | "warning" | "info";

interface ModalData {
  isOpen: boolean;
  onClose: () => void;
  type: ModalType;
  title: string;
  content: React.ReactNode;
  onConfirm: () => void;
  children?: any;
  showActions: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  maxWidth?: string;
  loading?: boolean;
}

interface ContextProps {
  dataModal: ModalData;
  setDataModal: Dispatch<SetStateAction<ModalData>>;
  dataProveedores: {
    loading: boolean;
    data: ProveedoresI[];
  };
  setDataProveedores: Dispatch<
    SetStateAction<{
      loading: boolean;
      data: ProveedoresI[];
    }>
  >;
  dataProductProveedor: {
    copyData?: ProductsI[];
    loading: boolean;
    data: ProductsI[];
  };
  setProductsProveedor: Dispatch<
    SetStateAction<{
      loading: boolean;
      data: ProductsI[];
      copyData?: ProductsI[];
    }>
  >;
  socketPagos: RefObject<Socket | null>;
  socketServer: RefObject<Socket | null>;
  socketCron: RefObject<Socket | null>;
  socketPagosReady: boolean;
  socketServerReady: boolean;
  socketCronReady: boolean;
  rowsVentas: {
    totalRows: number;
    data: SalesI[];
  };
  setRowsVentas: Dispatch<
    SetStateAction<{
      totalRows: number;
      data: SalesI[];
    }>
  >;
  rowsVentasInvitados: any[];
  setRowsVentasInvitados: Dispatch<SetStateAction<any[]>>;
  showSpinner: boolean;
  setShowSpinner: Dispatch<SetStateAction<boolean>>;
  dataProducts: ProductsI[];
  setDataProducts: Dispatch<SetStateAction<ProductsI[]>>;
  dataMarca: any;
  setDataMarca: Dispatch<SetStateAction<any>>;
  dataCategoria: any;
  setDataCategoria: Dispatch<SetStateAction<any>>;
  tableKey: number;
  setTableKey: Dispatch<SetStateAction<number>>;
}

const CreateContext = createContext<ContextProps>({
  dataModal: {
    isOpen: false,
    onClose: () => {},
    type: "success",
    title: "",
    content: null,
    onConfirm: () => {},
    children: "",
    showActions: false,
  },
  setDataModal: () => {},
  dataProveedores: {
    loading: false,
    data: [],
  },
  setDataProveedores: () => {},
  dataProductProveedor: {
    loading: false,
    data: [],
    copyData: [],
  },
  setProductsProveedor: () => {},
  socketPagos: { current: null },
  socketServer: { current: null },
  socketCron: { current: null },
  socketPagosReady: false,
  socketServerReady: false,
  socketCronReady: false,
  rowsVentas: {
    totalRows: 0,
    data: [],
  },
  setRowsVentas: () => {},
  showSpinner: false,
  setShowSpinner: () => {},
  dataProducts: [],
  setDataProducts: () => {},
  dataMarca: [],
  setDataMarca: () => {},
  dataCategoria: [],
  setDataCategoria: () => {},
  tableKey: 0,
  setTableKey: () => {},
  rowsVentasInvitados: [],
  setRowsVentasInvitados: () => {},
});

export const GlobalProvider = ({ children }: { children: any }) => {
  //Data para los modales
  const [dataModal, setDataModal] = useState<ModalData>({
    isOpen: false,
    onClose: () => {},
    type: "success",
    title: "",
    content: null,
    onConfirm: () => {},
    children: "",
    showActions: false,
  });

  const [dataProveedores, setDataProveedores] = useState<{
    loading: boolean;
    data: ProveedoresI[];
  }>({ loading: false, data: [] });

  const [dataProductProveedor, setProductsProveedor] = useState<{
    loading: boolean;
    data: ProductsI[];
    copyData?: ProductsI[];
  }>({
    loading: false,
    data: [],
    copyData: [],
  });

  const [rowsVentas, setRowsVentas] = useState<{
    totalRows: number;
    data: SalesI[];
  }>({
    totalRows: 0,
    data: [],
  });
  const [rowsVentasInvitados, setRowsVentasInvitados] = useState<any[]>([]);

  const [showSpinner, setShowSpinner] = useState<boolean>(false);

  const socketPagos = useRef<Socket | null>(null);
  const socketServer = useRef<Socket | null>(null);
  const socketCron = useRef<Socket | null>(null);
  const [socketPagosReady, setSocketPagosReady] = useState(false);
  const [socketServerReady, setSocketServerReady] = useState(false);
  const [socketCronReady, setSocketCronReady] = useState(false);

  const [dataMarca, setDataMarca] = useState([]);
  const [tableKey, setTableKey] = useState(0);

  const [dataCategoria, setDataCategoria] = useState([]);
  const [dataProducts, setDataProducts] = useState<ProductsI[]>([]);
  const { requestGetProveedores } = ProveedoresUtils();
  const pathName = usePathname();
  const isAuthPage = isAuthPathname(pathName);

  const handleGetMarcas = async () => {
    try {
      const resp = await requestGetProveedores("/getAllMarcaPrincipal");
      const data = resp.data;

      if (resp.status == 200) {
        setDataMarca(data.data.data);
      }
    } catch (error) {
      setDataMarca([]);
    }
  };

  const handleGetCategorias = async () => {
    try {
      const resp = await requestGetProveedores("/getAllCategoriPrincipal");
      const data = resp.data;

      if (resp.status == 200) {
        setDataCategoria(data.data.data);
      }
    } catch (error) {
      setDataCategoria([]);
    }
  };

  useEffect(() => {
    const socketProveedorUrl = process.env.NEXT_PUBLIC_SOCKET_PROVEEDOR?.trim();
    const socketPagosUrl = process.env.NEXT_PUBLIC_SOCKET_PAGOS?.trim();
    const socketCronUrl = process.env.NEXT_PUBLIC_SOCKET_CRON?.trim();

    if (socketPagosUrl) {
      const socket = io(socketPagosUrl, {
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
      });
      socketPagos.current = socket;

      const markReady = () => setSocketPagosReady(true);
      socket.on("connect", markReady);
      if (socket.connected) markReady();
    }

    if (socketProveedorUrl) {
      const socket = io(socketProveedorUrl, {
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
      });
      socketServer.current = socket;

      const markReady = () => setSocketServerReady(true);
      socket.on("connect", markReady);
      if (socket.connected) markReady();
    }

    if (socketCronUrl) {
      const socket = io(socketCronUrl, {
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
      });
      socketCron.current = socket;

      const markReady = () => setSocketCronReady(true);
      socket.on("connect", markReady);
      if (socket.connected) markReady();
    }

    return () => {
      setSocketPagosReady(false);
      setSocketServerReady(false);
      setSocketCronReady(false);
      socketPagos.current?.disconnect();
      socketServer.current?.disconnect();
      socketCron.current?.disconnect();
      socketPagos.current = null;
      socketServer.current = null;
      socketCron.current = null;
    };
  }, []);

  useEffect(() => {
    if (isAuthPage) return;
    let mounted = true;

    const getListProducts = async () => {
      try {
        const resp = await requestGetProveedores("/getAllProduct", {
          silent: true,
        });

        if (mounted && resp.status === 200) {
          setDataProducts(resp.data?.data ?? []);
        }
      } catch (error) {
        console.warn(
          "[admin] No se pudo cargar /getAllProduct. ¿Está server-proveedores en http://localhost:8001?",
          error,
        );
        if (mounted) setDataProducts([]);
      }
    };

    getListProducts();

    return () => {
      mounted = false;
    };
  }, [requestGetProveedores, isAuthPage]);

  useEffect(() => {
    if (isAuthPage) return;
    handleGetCategorias();
    handleGetMarcas();
  }, [dataCategoria.length, dataMarca.length, isAuthPage]);

  useEffect(() => {
    const cronSocket = socketCron.current;
    if (!cronSocket) return;

    const onCronUpdate = (payload: any) => {
      const updates = Array.isArray(payload) ? payload : [payload];
      if (!updates.length) return;

      setDataProducts((prevProducts) => {
        let changed = false;
        const newProducts = prevProducts.map((p) => {
          const update = updates.find((u: any) => Number(u.idProduct) === Number(p.idProduct));
          if (!update) return p;

          changed = true;
          return {
            ...p,
            price: update.price !== undefined ? Number(update.price) : p.price,
            stock: update.stock !== undefined ? Number(update.stock) : p.stock,
            stockBranches: update.branches ? update.branches : p.stockBranches,
          };
        });
        return changed ? newProducts : prevProducts;
      });

      setProductsProveedor((prev) => {
        let changed = false;
        const newData = prev.data.map((p) => {
          const update = updates.find((u: any) => Number(u.idProduct) === Number(p.idProduct));
          if (!update) return p;

          changed = true;
          return {
            ...p,
            price: update.price !== undefined ? Number(update.price) : p.price,
            stock: update.stock !== undefined ? Number(update.stock) : p.stock,
            stockBranches: update.branches ? update.branches : p.stockBranches,
          };
        });
        return changed ? { ...prev, data: newData } : prev;
      });
    };

    cronSocket.on("updatedStockCron", onCronUpdate);
    return () => {
      cronSocket.off("updatedStockCron", onCronUpdate);
    };
  }, [socketCronReady]);

  return (
    <CreateContext.Provider
      value={{
        dataModal,
        setDataModal,
        dataProveedores,
        setDataProveedores,
        socketPagos,
        socketServer,
        socketCron,
        socketPagosReady,
        socketServerReady,
        socketCronReady,
        rowsVentas,
        setRowsVentas,
        rowsVentasInvitados,
        setRowsVentasInvitados,
        showSpinner,
        setShowSpinner,
        dataCategoria,
        setDataCategoria,
        dataMarca,
        setDataMarca,
        dataProductProveedor,
        setProductsProveedor,
        tableKey,
        setTableKey,
        dataProducts,
        setDataProducts,
      }}
    >
      {children}
    </CreateContext.Provider>
  );
};

export const useTheContext = () => useContext(CreateContext);
