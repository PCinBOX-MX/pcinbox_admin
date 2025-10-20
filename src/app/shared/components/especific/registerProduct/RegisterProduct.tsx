"use client";
import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardMedia,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import { Trash2 } from "lucide-react";

const RegisterProduct = () => {
  const [files, setFiles] = useState<File[]>([]);

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    if (files.length > 5) {
      setFiles((prev) => prev.slice(0, 5));
    }
  }, [files]);
  return (
    <Box
      component="form"
      // onSubmit={handleSubmit}
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        width: "100%",
        margin: "auto",
        mt: 5,
      }}
    >
      <div className="grid grid-cols-[1fr_1fr] gap-2">
        <TextField
          label="Nombre"
          variant="outlined"
          name="nombre"
          // value={form.nombre}
          // onChange={handleChange}
          required
        />

        <TextField
          label="Descripción"
          type="text"
          variant="outlined"
          name="description"
          // value={form.email}
          // onChange={handleChange}
        />
      </div>

      <div className="grid grid-cols-[1fr_1fr] gap-2">
        <TextField
          label="Calificación"
          type="number"
          variant="outlined"
          name="rating"
          // value={form.email}
          // onChange={handleChange}
          slotProps={{
            htmlInput: {
              max: 5,
              min: 0,
            },
          }}
          required
        />

        <FormControl fullWidth>
          <InputLabel id="label-categoria">Categoría</InputLabel>
          <Select
            labelId="label-categoria"
            id="select-pais"
            // value={pais}
            label="País"
            // onChange={handleChange}
          >
            <MenuItem value="">
              <em>Ninguno</em>
            </MenuItem>
            <MenuItem value="mx">México</MenuItem>
            <MenuItem value="ar">Argentina</MenuItem>
            <MenuItem value="co">Colombia</MenuItem>
          </Select>
        </FormControl>
      </div>

      <div className="grid grid-cols-[1fr_1fr] gap-2">
        <FormControl fullWidth>
          <InputLabel id="label-marca">Marca</InputLabel>
          <Select
            labelId="label-marca"
            id="select-marca"
            value={"mx"}
            label="País"
            // onChange={handleChange}
          >
            <MenuItem value="">
              <em>Ninguno</em>
            </MenuItem>
            <MenuItem value="mx">México</MenuItem>
            <MenuItem value="ar">Argentina</MenuItem>
            <MenuItem value="co">Colombia</MenuItem>
          </Select>
        </FormControl>
        <TextField
          label="Existencia"
          type="number"
          variant="outlined"
          name="stock"
          // value={form.email}
          // onChange={handleChange}
          required
        />
      </div>

      <div className="grid grid-cols-[auto] gap-2">
        <TextField
          label=""
          type="file"
          variant="outlined"
          name="image_url"
          onChange={(event) => {
            const imgs = (event.target as any).files;

            const fileList: File[] = Array.isArray(imgs)
              ? imgs
              : Array.from(imgs);
            setFiles((prev) => [...prev, ...fileList]);
            event.target.value = "";
          }}
          slotProps={{
            htmlInput: {
              multiple: true,
              max: 5,
              accept: "image/*",
            },
          }}
          // value={form.email}
          // onChange={handleChange}
          required
        />
      </div>

      <div className="flex flex-wrap gap-3">
        {files.map((file, indexFile) => {
          const imageUrl = URL.createObjectURL(file);
          return (
            <Card key={indexFile} sx={{ position: "relative", width: 130 }}>
              <CardMedia
                component="img"
                image={imageUrl}
                alt={file.name}
                sx={{ height: 50, objectFit: "cover" }}
              />
              <CardActions sx={{ justifyContent: "space-between", px: 1 }}>
                <Typography
                  variant="caption"
                  sx={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: 100,
                  }}
                >
                  {file.name}
                </Typography>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleRemoveFile(indexFile)}
                >
                  <Trash2 size={16} />
                </IconButton>
              </CardActions>
            </Card>
          );
        })}
      </div>

      <Button type="submit" variant="contained" color="primary">
        Agregar producto
      </Button>
    </Box>
  );
};

export default RegisterProduct;
