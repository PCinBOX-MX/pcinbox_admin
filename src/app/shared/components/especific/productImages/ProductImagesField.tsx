"use client";

import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardMedia,
  IconButton,
  Typography,
} from "@mui/material";
import { Trash2 } from "lucide-react";
import { RefObject } from "react";
import { MdCloudUpload } from "react-icons/md";
import {
  MAX_PRODUCT_IMAGES,
  MIN_PRODUCT_IMAGES,
} from "@/app/constants/productImages.constants";

type ProductImagesFieldProps = {
  previews: string[];
  /** Si se pasa, detecta videos por `file.type` para el preview. */
  files?: File[];
  error: string | null;
  onAddFiles: (files: File[]) => void;
  onRemove: (index: number) => void;
  sectionRef?: RefObject<HTMLDivElement | null>;
  accept?: string;
  title?: string;
  /** Versión más compacta para celdas de tabla / layouts densos. */
  compact?: boolean;
  inputTestId?: string;
  triggerTestId?: string;
  errorTestId?: string;
  imagesTestId?: string;
  imageItemTestIdPrefix?: string;
  removeTestIdPrefix?: string;
};

/**
 * Selector de imágenes compartido para Editar / Dar de alta / Registrar.
 */
const ProductImagesField = ({
  previews,
  files,
  error,
  onAddFiles,
  onRemove,
  sectionRef,
  accept = "image/*",
  title = "Imágenes del producto",
  compact = false,
  inputTestId = "product-images-input",
  triggerTestId = "product-images-trigger",
  errorTestId = "product-images-error",
  imagesTestId = "product-images-list",
  imageItemTestIdPrefix = "product-image",
  removeTestIdPrefix = "product-remove-image",
}: ProductImagesFieldProps) => {
  const count = previews.length;
  const previewHeight = compact ? 56 : 88;
  const cardWidth = compact ? 72 : 120;

  return (
    <Box
      ref={sectionRef}
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: compact ? 1 : 1.5,
        textAlign: "left",
        minWidth: compact ? 180 : undefined,
      }}
    >
      {!compact && (
        <>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#374151" }}>
            {title}
          </Typography>
          <Typography variant="caption" sx={{ color: "#6b7280", mt: -1 }}>
            Mínimo {MIN_PRODUCT_IMAGES}, máximo {MAX_PRODUCT_IMAGES}. {count}/
            {MAX_PRODUCT_IMAGES} cargadas.
          </Typography>
        </>
      )}

      <Button
        variant="outlined"
        component="label"
        fullWidth
        startIcon={<MdCloudUpload size={compact ? 18 : 22} />}
        data-testid={triggerTestId}
        sx={{
          minHeight: compact ? 44 : 64,
          borderStyle: "dashed",
          borderWidth: 2,
          borderColor: error ? "#f59e0b" : "#b92b3d",
          color: "#992230",
          backgroundColor: error ? "#fffbeb" : "#fdf2f4",
          textTransform: "none",
          fontWeight: 600,
          fontSize: compact ? "0.8rem" : "0.95rem",
          px: compact ? 1 : 2,
          "&:hover": {
            borderStyle: "dashed",
            borderWidth: 2,
            borderColor: "#992230",
            backgroundColor: "#fce8ec",
          },
        }}
      >
        {count > 0
          ? `Agregar (${count}/${MAX_PRODUCT_IMAGES})`
          : compact
            ? "Subir imágenes"
            : "Seleccionar imágenes"}
        <input
          data-testid={inputTestId}
          type="file"
          hidden
          multiple
          accept={accept}
          onChange={(event) => {
            const selected = Array.from(
              (event.target as HTMLInputElement).files || [],
            );
            if (selected.length) onAddFiles(selected);
            event.target.value = "";
          }}
        />
      </Button>

      {error && (
        <Alert
          severity="warning"
          data-testid={errorTestId}
          sx={compact ? { py: 0, fontSize: "0.75rem" } : undefined}
        >
          {error}
        </Alert>
      )}

      {compact && count > 0 && (
        <Typography variant="caption" sx={{ color: "#6b7280" }}>
          {count}/{MAX_PRODUCT_IMAGES}
        </Typography>
      )}

      <Box
        sx={{ display: "flex", gap: compact ? 1 : 1.5, flexWrap: "wrap" }}
        data-testid={imagesTestId}
      >
        {previews.map((src, index) => {
          const file = files?.[index];
          const isVideo = Boolean(file?.type?.startsWith("video/"));

          return (
            <Card
              key={`${src}-${index}`}
              sx={{
                position: "relative",
                width: cardWidth,
                borderRadius: 2,
                overflow: "hidden",
                border: "1px solid #e5e7eb",
                boxShadow: "none",
              }}
              data-testid={`${imageItemTestIdPrefix}-${index}`}
              data-image-src={src}
            >
              {isVideo ? (
                <video
                  src={src}
                  controls
                  style={{
                    width: "100%",
                    height: previewHeight,
                    objectFit: "cover",
                  }}
                />
              ) : (
                <CardMedia
                  component="img"
                  image={src}
                  alt=""
                  sx={{ height: previewHeight, objectFit: "cover" }}
                />
              )}
              <CardActions sx={{ justifyContent: "flex-end", px: 0.5, py: 0.25 }}>
                <IconButton
                  size="small"
                  color="error"
                  data-testid={`${removeTestIdPrefix}-${index}`}
                  onClick={() => onRemove(index)}
                >
                  <Trash2 size={compact ? 14 : 16} />
                </IconButton>
              </CardActions>
            </Card>
          );
        })}
      </Box>
    </Box>
  );
};

export default ProductImagesField;
