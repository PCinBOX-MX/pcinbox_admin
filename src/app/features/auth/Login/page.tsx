"use client";

import { useEffect } from "react";
import UtilsService from "@/app/services/utils";
import authStyle from "../auth.module.css";
import useLogin from "@/app/hooks/login.hook";
import {
  Box,
  Button,
  CircularProgress,
  Link,
  TextField,
  Typography,
} from "@mui/material";
import { useTheContext } from "@/app/hooks/global.hook";
import { isVoluntaryLogoutPending } from "@/app/utils/sessionAuth";

const LoginComponent = () => {
  const { onRouterPush } = UtilsService();
  const { handleOnChange, handleSubmit, dataLogin, loadingLogin } = useLogin();
  const { setDataModal } = useTheContext();

  // Si llegamos por logout voluntario, no dejar abierto «Sesión expirada».
  useEffect(() => {
    if (!isVoluntaryLogoutPending()) return;
    setDataModal((prev) => {
      if (!prev.isOpen) return prev;
      if (prev.title === "Sesión expirada") {
        return { ...prev, isOpen: false };
      }
      return prev;
    });
  }, [setDataModal]);

  return (
    <div className={authStyle.card}>
      <div className={authStyle.logoWrap}>
        <img
          src="https://ik.imagekit.io/pcinboxkit/logos/logo.png?updatedAt=1759534318587"
          className={authStyle.logoImg}
          alt="PCinBOX"
          loading="lazy"
        />
      </div>

      <div className={authStyle.heading}>
        <Typography component="h1" variant="h4">
          Bienvenido
        </Typography>
        <Typography component="p" variant="body2">
          Accede al panel de administración
        </Typography>
      </div>

      <Box
        component="form"
        id="loginForm"
        onSubmit={handleSubmit}
        className={authStyle.form}
      >
        <TextField
          fullWidth
          required
          type="email"
          id="email"
          name="email"
          label="Correo electrónico"
          placeholder="tu@email.com"
          value={dataLogin.email}
          onChange={handleOnChange}
          autoComplete="email"
        />

        <TextField
          fullWidth
          required
          type="password"
          id="password"
          name="password"
          label="Contraseña"
          placeholder="••••••••"
          value={dataLogin.password}
          onChange={handleOnChange}
          autoComplete="current-password"
        />

        <Button
          fullWidth
          size="large"
          type="submit"
          variant="contained"
          color="primary"
          disabled={loadingLogin}
          sx={{ mt: 0.5, py: 1.35, borderRadius: "12px" }}
        >
          {loadingLogin ? (
            <CircularProgress size={22} color="inherit" />
          ) : (
            "Iniciar sesión"
          )}
        </Button>
      </Box>


    </div>
  );
};

export default LoginComponent;
