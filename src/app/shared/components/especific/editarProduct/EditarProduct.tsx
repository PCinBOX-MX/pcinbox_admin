"use client";

import { Box, TextField } from "@mui/material";

import { useForm } from "react-hook-form";

const EditarProduct = () => {
  const {
    register,
    handleSubmit,

    formState: { errors },
  } = useForm();

  return (
    <Box
      component="form"
      //   onSubmit={handleSubmit(handleRegisterProveedores)}
      sx={{
        width: "100%",
        mx: "auto",
        mt: 1,
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
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
      {/* <Button
        disabled={registerProveedores.loading}
        type="submit"
        variant="contained"
        color="primary"
      >
        {registerProveedores.loading ? (
          <MdAutorenew size={20} className="admin-m-auto the-spinner" />
        ) : (
          <>Registrar</>
        )}
      </Button> */}
    </Box>
  );
};

export default EditarProduct;
