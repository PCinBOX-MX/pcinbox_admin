"use client";

import { useState, useRef, useEffect } from "react";
import {
  Box,
  Button,
  Stack,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  LinearProgress
} from "@mui/material";
import { MdCloudUpload, MdAutorenew, MdClose } from "react-icons/md";
import * as XLSX from "xlsx";
import { useTheContext } from "@/app/hooks/global.hook";
import ProveedoresUtils from "@/app/services/utils/proveedores.utils";
import UtilsService from "@/app/services/utils/index";
import useProveedores from "@/app/proveedores/useProveedores";
import { ProductsI } from "@/app/interfaces/products/products.interface";

interface ExcelRow {
  UPC: string;
  "Margen de Utilidad": number;
  "Características": string;
}

interface BulkProduct {
  upc: string;
  margin: number;
  characteristics: string;
  matchedProduct: ProductsI | null;
  files: File[];
  status: 'pending' | 'uploading' | 'success' | 'error';
  errorMsg?: string;
}

const BulkUploadProvider = () => {
  const [step, setStep] = useState<1 | 2>(1);
  const [bulkData, setBulkData] = useState<BulkProduct[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const { dataProductProveedor, setDataModal } = useTheContext();
  const { setProductsProveedor } = useProveedores();
  const { requestPostProveedores } = ProveedoresUtils();
  const { formatCurrency } = UtilsService();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json<any>(ws);

      const parsedData: BulkProduct[] = data.map((row) => {
        const lowerRow: any = {};
        Object.keys(row).forEach((k) => {
          lowerRow[k.trim().toLowerCase()] = row[k];
        });

        const upcStr = String(lowerRow["upc"] || "").trim();
        // Match with existing products in context
        const matchedProduct = dataProductProveedor.data.find(
          (p) => String(p.upc) === upcStr || String(p.idProductExt) === upcStr
        ) || null;

        return {
          upc: upcStr,
          margin: Number(lowerRow["margen de utilidad"] || lowerRow["margen"] || lowerRow["margin"] || 0),
          characteristics: String(lowerRow["características"] || lowerRow["caracteristicas"] || ""),
          matchedProduct,
          files: [],
          status: 'pending'
        };
      });

      setBulkData(parsedData);
      setStep(2);
    };
    reader.readAsBinaryString(file);
  };

  const handleFileChangeForProduct = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;
    const fileList = Array.from(selectedFiles).slice(0, 5); // limit to 5
    
    setBulkData((prev) => {
      const newData = [...prev];
      newData[index] = { 
        ...newData[index], 
        files: [...newData[index].files, ...fileList] 
      };
      return newData;
    });
    e.target.value = "";
  };

  const handleRemoveFile = (prodIndex: number, fileIndex: number) => {
    setBulkData((prev) => {
      const newData = [...prev];
      newData[prodIndex] = {
        ...newData[prodIndex],
        files: newData[prodIndex].files.filter((_, i) => i !== fileIndex)
      };
      return newData;
    });
  };

  const parseCharacteristics = (text: string) => {
    if (!text) return [];
    return text.split("\n")
      .map(line => {
        let prop = "";
        let value = "";
        if (line.includes(":")) {
          const parts = line.split(":");
          prop = parts.shift() || "";
          value = parts.join(":");
        } else {
          const match = line.match(/^(.*?)(\d+.*)$/);
          if (match) {
            prop = match[1];
            value = match[2];
          } else {
            prop = line;
          }
        }
        return { prop: prop.trim(), value: value.trim() };
      })
      .filter(item => item.prop !== "");
  };

  const handleBulkSubmit = async () => {
    const validProducts = bulkData.filter(p => p.matchedProduct && p.status !== 'success');
    if (validProducts.length === 0) return;

    setIsUploading(true);
    setProgress({ current: 0, total: validProducts.length });

    let successCount = 0;

    for (let i = 0; i < bulkData.length; i++) {
      const item = bulkData[i];
      if (!item.matchedProduct || item.status === 'success') continue;

      setBulkData(prev => {
        const d = [...prev];
        d[i] = { ...d[i], status: 'uploading' };
        return d;
      });

      const dataProductProp = item.matchedProduct;
      const parsedCharacteristics = parseCharacteristics(item.characteristics);
      
      let formData = new FormData();
      formData.append("clave", dataProductProp.idProductExt.toString());
      formData.append("name", dataProductProp.name);
      formData.append("description", dataProductProp.description || "");
      formData.append("newPrice", dataProductProp.price?.toString() ?? "0");
      formData.append("originPrice", String(dataProductProp?.originPriceMxn ?? dataProductProp?.price ?? 0));
      
      if (Number(dataProductProp.providerId) !== 1) {
        formData.append("profitMargin", item.margin.toString());
      }
      if (Number(dataProductProp.providerId) === 2) {
        formData.append("isDolares", String(Boolean(dataProductProp?.isDolares)));
        formData.append("originPriceMxn", "true");
      }
      
      formData.append("sku", dataProductProp.sku || "");
      formData.append("stock", (dataProductProp.stock ?? 0).toString());
      formData.append("providerId", dataProductProp.providerId?.toString() || "");
      formData.append("nameMarca", dataProductProp.nameMarca || "");
      formData.append("nameCategory", dataProductProp.nameCategory || "");
      formData.append("isPc", "false");
      formData.append("caracteristicas", JSON.stringify(parsedCharacteristics));
      formData.append("upc", dataProductProp?.upc?.toString() || "");
      formData.append("width", dataProductProp?.width?.toString() || "");
      formData.append("height", dataProductProp?.height?.toString() || "");
      formData.append("length", dataProductProp?.largo?.toString() || "");
      formData.append("branches", JSON.stringify(dataProductProp?.branches || []));
      formData.append("peso", dataProductProp?.peso?.toString() ?? "null");

      item.files.forEach((file) => formData.append("files", file));

      try {
        const resp = await requestPostProveedores(formData, "/newProductPcinbox");
        
        if (resp.status == 200) {
          successCount++;
          const data = resp?.data?.data;
          
          setProductsProveedor((prev) => {
            const updateItem = (prevItem: any) => {
              if (prevItem.idProductExt == data?.data?.idProductExt) {
                return { ...prevItem, ...data?.data, idProduct: Number(data?.data?.idProduct) };
              }
              return prevItem;
            };
            return {
              ...prev,
              data: prev.data.map(updateItem),
              copyData: prev.copyData!.map(updateItem),
            };
          });

          setBulkData(prev => {
            const d = [...prev];
            d[i] = { ...d[i], status: 'success' };
            return d;
          });
        } else {
          setBulkData(prev => {
            const d = [...prev];
            d[i] = { ...d[i], status: 'error', errorMsg: 'Error en respuesta' };
            return d;
          });
        }
      } catch (error: any) {
        setBulkData(prev => {
          const d = [...prev];
          d[i] = { ...d[i], status: 'error', errorMsg: 'Error de conexión' };
          return d;
        });
      }

      setProgress(p => ({ ...p, current: p.current + 1 }));
    }

    setIsUploading(false);
    
    setDataModal({
      isOpen: true,
      type: "success",
      content: `Se dieron de alta ${successCount} productos de ${validProducts.length}.`,
      showActions: true,
      title: "Proceso Terminado",
      onClose: () => setDataModal((prev) => ({ ...prev, isOpen: false })),
      onConfirm: () => setDataModal((prev) => ({ ...prev, isOpen: false })),
    });
  };

  return (
    <Stack spacing={3} sx={{ mt: 2, pb: 2, width: '100%' }}>
      {step === 1 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 4 }}>
          <Typography variant="h6">Sube tu archivo Excel (.xlsx)</Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ maxWidth: 400 }}>
            El archivo debe contener las columnas: <b>UPC</b>, <b>Margen de Utilidad</b>, y <b>Características</b>.
          </Typography>
          <Button
            variant="outlined"
            component="label"
            startIcon={<MdCloudUpload />}
            sx={{ height: 56, borderStyle: "dashed", borderWidth: 2, px: 4 }}
          >
            Seleccionar Excel
            <input
              type="file"
              hidden
              accept=".xlsx, .xls, .csv"
              onChange={handleFileUpload}
              onClick={(e) => (e.target as any).value = null}
            />
          </Button>
        </Box>
      )}

      {step === 2 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Revisión e Imágenes ({bulkData.length} productos detectados)
          </Typography>
          
          <TableContainer component={Paper} sx={{ maxHeight: '60vh', overflow: 'auto' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>UPC</TableCell>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Margen</TableCell>
                  <TableCell>Características</TableCell>
                  <TableCell>Imágenes (Arrastrar aquí)</TableCell>
                  <TableCell>Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bulkData.map((row, idx) => (
                  <TableRow key={idx} sx={{ bgcolor: row.status === 'success' ? '#edf7ed' : 'inherit' }}>
                    <TableCell>{row.upc}</TableCell>
                    <TableCell sx={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {row.matchedProduct ? row.matchedProduct.name : <Typography color="error" variant="caption">No encontrado</Typography>}
                    </TableCell>
                    <TableCell>{formatCurrency(row.margin)}</TableCell>
                    <TableCell sx={{ maxWidth: 250, verticalAlign: 'top' }}>
                      <Box sx={{ maxHeight: 80, overflow: 'auto', fontSize: '0.75rem', p: 0.5, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 1 }}>
                        {parseCharacteristics(row.characteristics).map((c, ci) => (
                          <div key={ci} style={{ marginBottom: 4 }}>
                            <b>{c.prop}</b>{c.value ? `: ${c.value}` : ''}
                          </div>
                        ))}
                        {parseCharacteristics(row.characteristics).length === 0 && (
                          <Typography variant="caption" color="text.secondary">Sin características</Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {row.matchedProduct && row.status !== 'success' && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Button component="label" size="small" variant="outlined" sx={{ minWidth: 0, p: 0.5 }}>
                            <MdCloudUpload size={18} />
                            <input
                              type="file"
                              hidden
                              multiple
                              accept="image/*,video/*"
                              onChange={(e) => handleFileChangeForProduct(idx, e)}
                            />
                          </Button>
                          <Stack direction="row" spacing={0.5}>
                            {row.files.map((f, fi) => (
                              <Box key={fi} sx={{ position: 'relative', width: 30, height: 30 }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={URL.createObjectURL(f)} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }} />
                                <IconButton size="small" sx={{ position: 'absolute', top: -8, right: -8, bgcolor: 'rgba(255,255,255,0.8)', p: 0.1 }} onClick={() => handleRemoveFile(idx, fi)}>
                                  <MdClose size={12} color="red" />
                                </IconButton>
                              </Box>
                            ))}
                          </Stack>
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.status === 'pending' && <Typography variant="caption" color="text.secondary">Pendiente</Typography>}
                      {row.status === 'uploading' && <MdAutorenew className="the-spinner" size={18} color="blue" />}
                      {row.status === 'success' && <Typography variant="caption" color="success.main">OK</Typography>}
                      {row.status === 'error' && <Typography variant="caption" color="error.main">{row.errorMsg}</Typography>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {isUploading && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress variant="determinate" value={(progress.current / progress.total) * 100} />
              <Typography variant="caption" align="center" display="block" sx={{ mt: 1 }}>
                Subiendo {progress.current} de {progress.total}
              </Typography>
            </Box>
          )}

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button color="error" variant="outlined" onClick={() => { setStep(1); setBulkData([]); }} disabled={isUploading}>
              Eliminar Excel / Subir otro
            </Button>
            <Button 
              variant="contained" 
              onClick={handleBulkSubmit}
              disabled={isUploading || !bulkData.some(p => p.matchedProduct && p.status !== 'success')}
              startIcon={isUploading ? <MdAutorenew className="the-spinner" /> : <MdCloudUpload />}
            >
              Dar de Alta Todos
            </Button>
          </Box>
        </Box>
      )}
    </Stack>
  );
};

export default BulkUploadProvider;
