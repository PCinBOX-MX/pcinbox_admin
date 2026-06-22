"use client";

import authStyle from "../auth.module.css";
import UtilsService from "@/app/services/utils";
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Link,
  TextField,
  Typography,
} from "@mui/material";

const RegisterComponent = () => {
  const { onRouterPush } = UtilsService();

  return (
    <div className={authStyle.cardWide}>
      <div className={authStyle.heading}>
        <Typography component="h1" variant="h4">
          Crear cuenta
        </Typography>
        <Typography component="p" variant="body2">
          Registra un usuario para el panel admin
        </Typography>
      </div>

      <Box
        component="form"
        id="registerForm"
        className={authStyle.form}
        onSubmit={(event) => event.preventDefault()}
      >
        <div className={authStyle.formRow}>
          <TextField
            fullWidth
            required
            id="firstName"
            label="Nombre"
            placeholder="Juan"
          />
          <TextField
            fullWidth
            required
            id="lastName"
            label="Apellido"
            placeholder="Pérez"
          />
        </div>

        <TextField
          fullWidth
          required
          type="email"
          id="email"
          label="Correo electrónico"
          placeholder="tu@email.com"
          autoComplete="email"
        />

        <div className={authStyle.formRow}>
          <TextField
            fullWidth
            required
            type="password"
            id="password"
            label="Contraseña"
            placeholder="••••••••"
            autoComplete="new-password"
          />
          <TextField
            fullWidth
            required
            type="password"
            id="confirmPassword"
            label="Confirmar contraseña"
            placeholder="••••••••"
            autoComplete="new-password"
          />
        </div>

        <FormControlLabel
          control={
            <Checkbox
              required
              id="terms"
              sx={{
                color: "#d1d5db",
                "&.Mui-checked": { color: "primary.main" },
              }}
            />
          }
          label={
            <Typography variant="body2" color="text.secondary">
              Acepto los{" "}
              <Link href="#" underline="hover">
                Términos y Condiciones
              </Link>{" "}
              y la{" "}
              <Link href="#" underline="hover">
                Política de Privacidad
              </Link>
            </Typography>
          }
        />

        <Button
          fullWidth
          size="large"
          type="submit"
          variant="contained"
          color="primary"
          sx={{ py: 1.35, borderRadius: "12px" }}
        >
          Crear cuenta
        </Button>
      </Box>

      <div className={authStyle.divider}>
        <span>O regístrate con</span>
      </div>

      <button className={authStyle.socialBtn} type="button">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        Google
      </button>

      <div className={authStyle.footerLinks}>
        <Typography className={authStyle.footerText} variant="body2">
          ¿Ya tienes una cuenta?{" "}
          <Link
            component="button"
            type="button"
            underline="hover"
            onClick={() => onRouterPush("/features/auth/Login")}
          >
            Inicia sesión
          </Link>
        </Typography>
      </div>
    </div>
  );
};

export default RegisterComponent;
