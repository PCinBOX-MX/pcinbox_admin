"use client";

import useProveedores from "@/app/proveedores/useProveedores";
import { Box, Button, TextField, Typography } from "@mui/material";
import { useForm } from "react-hook-form";
import { MdAutorenew } from "react-icons/md";

const RegisterFormProovedor = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();

  const { handleRegisterProveedores, registerProveedores } = useProveedores();

  const onSubmit = (data: any) => {
    handleRegisterProveedores(data); // manejar registro
    reset(); // luego resetea el formulario
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(onSubmit)}
      sx={{
        width: "100%",
        mx: "auto",
        mt: 1,
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <Box className="admin-modal-form-grid">
        {/* Campo requerido */}
        <TextField
          label="Nombre"
          {...register("companyName", {
            required: "El nombre del proveedor es obligatorio",
          })}
          error={!!errors.companyName}
          helperText={!errors.companyName?.message?.toString()}
        />

        <TextField
          label="Email (opcional)"
          type="email"
          {...register("contactEmail", {
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, // Regex básica para validar email
              message: "Formato de email inválido",
            },
          })}
          error={!!errors.contactEmail}
          helperText={!errors.contactEmail?.message?.toString()}
        />

        <TextField
          label="Teléfono (opcional)"
          type="tel"
          {...register("phone", {
            pattern: {
              value: /^[0-9]{7,15}$/, // Solo dígitos, entre 7 y 15 caracteres
              message:
                "Número de teléfono inválido. Debe tener entre 7 y 15 dígitos.",
            },
          })}
          error={!!errors.phone}
          helperText={!errors.phone?.message?.toString()}
        />

        <TextField
          label="Domicilio (opcional)"
          type="text"
          {...register("address")}
        />
      </Box>
      <Button
        disabled={registerProveedores.loading}
        type="submit"
        variant="contained"
        color="primary"
        sx={{
          width: { xs: "100%", sm: "auto" },
          alignSelf: { xs: "stretch", sm: "flex-start" },
          mt: 0.5,
          minWidth: { sm: 160 },
        }}
      >
        {registerProveedores.loading ? (
          <MdAutorenew size={20} className="admin-m-auto the-spinner" />
        ) : (
          <>Registrar</>
        )}
      </Button>
    </Box>
  );
};

export default RegisterFormProovedor;
