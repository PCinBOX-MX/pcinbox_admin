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
    loading: boolean;
    data: ProductsI[];
  };
  setProductsProveedor: Dispatch<
    SetStateAction<{ loading: boolean; data: ProductsI[] }>
  >;
  socketPagos: RefObject<Socket | null>;
  rowsVentas: SalesI[];
  setRowsVentas: Dispatch<SetStateAction<SalesI[]>>;
  showSpinner: boolean;
  setShowSpinner: Dispatch<SetStateAction<boolean>>;
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
  },
  setProductsProveedor: () => {},
  socketPagos: { current: null },
  rowsVentas: [],
  setRowsVentas: () => {},
  showSpinner: false,
  setShowSpinner: () => {},
  dataMarca: [],
  setDataMarca: () => {},
  dataCategoria: [],
  setDataCategoria: () => {},
  tableKey: 0,
  setTableKey: () => {},
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
  }>({
    loading: false,
    data: [],
  });

  const [rowsVentas, setRowsVentas] = useState<SalesI[]>([]);

  const [showSpinner, setShowSpinner] = useState<boolean>(false);

  const socketPagos = useRef<Socket | null>(null);

  const [dataMarca, setDataMarca] = useState([]);
  const [tableKey, setTableKey] = useState(0);

  const [dataCategoria, setDataCategoria] = useState([]);
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
    socketPagos.current = io(process.env.NEXT_PUBLIC_SOCKET_PAGOS || "", {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    return () => {
      socketPagos.current?.disconnect();
    };
  }, []);

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
        rowsVentas,
        setRowsVentas,
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
      }}
    >
      {children}
    </CreateContext.Provider>
  );
};

export const useTheContext = () => useContext(CreateContext);
