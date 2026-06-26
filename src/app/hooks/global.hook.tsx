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
import { proveedoresApi } from "../services/utils/proveedores.utils";
import { ProductsI } from "../interfaces/products/products.interface";

type ModalType = "success" | "error" | "warning" | "info";
type ModalSize = "sm" | "md" | "lg" | "xl";

interface ModalData {
  isOpen: boolean;
  onClose: () => void;
  type: ModalType;
  title: string;
  content: React.ReactNode;
  onConfirm: () => void;
  children?: any;
  showActions: boolean;
  size?: ModalSize;
  confirmLabel?: string;
  showCancel?: boolean;
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
  rowsVentasInvitados: {
    totalRows: number;
    data: any[];
  };
  setRowsVentasInvitados: Dispatch<
    SetStateAction<{
      totalRows: number;
      data: any[];
    }>
  >;
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
  socketsReady: boolean;
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
    size: "md",
    confirmLabel: "Aceptar",
    showCancel: true,
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
  rowsVentasInvitados: {
    totalRows: 0,
    data: [],
  },
  setRowsVentasInvitados: () => {},
  socketsReady: false,
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
    size: "md",
    confirmLabel: "Aceptar",
    showCancel: true,
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
  const [rowsVentasInvitados, setRowsVentasInvitados] = useState<{
    totalRows: number;
    data: any[];
  }>({
    totalRows: 0,
    data: [],
  });

  const [showSpinner, setShowSpinner] = useState<boolean>(false);

  const socketPagos = useRef<Socket | null>(null);
  const socketServer = useRef<Socket | null>(null);

  const [dataMarca, setDataMarca] = useState([]);
  const [tableKey, setTableKey] = useState(0);

  const [dataCategoria, setDataCategoria] = useState([]);
  const [dataProducts, setDataProducts] = useState<ProductsI[]>([]);
  const [socketsReady, setSocketsReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadCatalogData = async () => {
      try {
        const [marcasRes, categoriasRes, productsRes] = await Promise.all([
          proveedoresApi.get("/getAllMarca"),
          proveedoresApi.get("/getAllCategori"),
          proveedoresApi.get("/getAllProduct"),
        ]);

        if (!mounted) return;

        if (marcasRes.status === 200) {
          setDataMarca(marcasRes.data?.data?.data ?? []);
        }
        if (categoriasRes.status === 200) {
          setDataCategoria(categoriasRes.data?.data?.data ?? []);
        }
        if (productsRes.status === 200) {
          setDataProducts(productsRes.data?.data ?? []);
        }
      } catch {
        if (!mounted) return;
        setDataMarca([]);
        setDataCategoria([]);
        setDataProducts([]);
      }
    };

    loadCatalogData();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    socketPagos.current = io(process.env.NEXT_PUBLIC_SOCKET_PAGOS || "", {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socketServer.current = io(process.env.NEXT_PUBLIC_SOCKET_PROVEEDOR || "", {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });
    setSocketsReady(true);

    return () => {
      setSocketsReady(false);
      socketPagos.current?.disconnect();
      socketServer.current?.disconnect();
    };
  }, []);

  return (
    <CreateContext.Provider
      value={{
        dataModal,
        setDataModal,
        dataProveedores,
        setDataProveedores,
        socketPagos,
        socketServer,
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
        socketsReady,
      }}
    >
      {children}
    </CreateContext.Provider>
  );
};

export const useTheContext = () => useContext(CreateContext);
