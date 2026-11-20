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
  socketPagosReady: boolean;
  socketServerReady: boolean;
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
  socketPagosReady: false,
  socketServerReady: false,
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
  const [socketPagosReady, setSocketPagosReady] = useState(false);
  const [socketServerReady, setSocketServerReady] = useState(false);

  const [dataMarca, setDataMarca] = useState([]);
  const [tableKey, setTableKey] = useState(0);

  const [dataCategoria, setDataCategoria] = useState([]);
  const [dataProducts, setDataProducts] = useState<ProductsI[]>([]);
  const { requestGetProveedores } = ProveedoresUtils();

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

    // Chrome mete la pestaña en Back-Forward Cache y corta los WS a la fuerza
    // (ruido: "Page entered Back-Forward Cache"). Cerrar limpio en pagehide/freeze
    // y reabrir en pageshow/resume.
    const listSockets = (): Socket[] =>
      [socketPagos.current, socketServer.current].filter(
        (s): s is Socket => Boolean(s),
      );

    const pauseSocketsForLifecycle = () => {
      setSocketPagosReady(false);
      setSocketServerReady(false);
      for (const socket of listSockets()) {
        try {
          socket.io.reconnection(false);
        } catch {
          // ignore
        }
        if (socket.connected) {
          socket.disconnect();
        }
        try {
          socket.io.engine?.close();
        } catch {
          // ignore
        }
      }
    };

    const resumeSocketsFromLifecycle = () => {
      for (const socket of listSockets()) {
        try {
          socket.io.reconnection(true);
        } catch {
          // ignore
        }
        if (!socket.connected) {
          socket.connect();
        }
      }
    };

    const handlePageHide = () => {
      pauseSocketsForLifecycle();
    };

    const handlePageShow = () => {
      resumeSocketsFromLifecycle();
    };

    const handleFreeze = () => {
      pauseSocketsForLifecycle();
    };

    const handleResume = () => {
      resumeSocketsFromLifecycle();
    };

    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("freeze", handleFreeze);
    window.addEventListener("resume", handleResume);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("freeze", handleFreeze);
      window.removeEventListener("resume", handleResume);
      setSocketPagosReady(false);
      setSocketServerReady(false);
      for (const socket of listSockets()) {
        try {
          socket.io.reconnection(false);
        } catch {
          // ignore
        }
        socket.disconnect();
      }
      socketPagos.current = null;
      socketServer.current = null;
    };
  }, []);

  useEffect(() => {
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
  }, [requestGetProveedores]);

  useEffect(() => {
    handleGetCategorias();
    handleGetMarcas();
  }, [dataCategoria.length, dataMarca.length]);

  return (
    <CreateContext.Provider
      value={{
        dataModal,
        setDataModal,
        dataProveedores,
        setDataProveedores,
        socketPagos,
        socketServer,
        socketPagosReady,
        socketServerReady,
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
