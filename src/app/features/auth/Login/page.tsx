"use client";

import UtilsService from "@/app/services/utils";
import style from "./login.module.css";
import useLogin from "@/app/hooks/login.hook";
import { MdAutorenew } from "react-icons/md";

const LoginComponent = () => {
  const { onRouterPush } = UtilsService();
  const { handleOnChange, handleSubmit, dataLogin, loadingLogin } = useLogin();

  return (
    <section className="w-full h-[100%] p-0 flex justify-center items-center">
      <div className={style.loginContainer}>
        <div className="w-full flex justify-center items-center my-2">
          <img
            src="https://ik.imagekit.io/pcinboxkit/logos/logo.png?updatedAt=1759534318587"
            width={150}
            height={150}
            className="object-contain"
            alt="Logo"
          />
        </div>
        <div className={style.logo}>
          <h1>Bienvenido</h1>
        </div>

        <form id="loginForm" onSubmit={handleSubmit}>
          <div className={style.formGroup}>
            <label htmlFor="email">Correo electrónico</label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="tu@email.com"
              value={dataLogin.email}
              onChange={handleOnChange}
            />
          </div>

          <div className={style.formGroup}>
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              placeholder="••••••••"
              name="password"
              value={dataLogin.password}
              onChange={handleOnChange}
            />
          </div>

          <button
            disabled={loadingLogin}
            type="submit"
            className={style.loginBtn}
          >
            {loadingLogin ? (
              <MdAutorenew size={20} className="m-auto the-spinner" />
            ) : (
              <>Iniciar Sesión</>
            )}
          </button>
        </form>
        <br />
        <div className="flex justify-center gap-2 w-full">
          <span className="text-[#606060] text-[17px] font-bold">
            ¿Olvidaste tu contraseña?
          </span>{" "}
          <a
            role="button"
            className="text-[#bb3d4b] font-bold hover:cursor-pointer"
          >
            {" "}
            Recuperala aquí
          </a>
        </div>

        <div className={style.signupLink}>
          ¿No tienes una cuenta?{" "}
          <a
            role="button"
            className="cursor-pointer"
            onClick={() => onRouterPush("/features/auth/Register")}
          >
            Regístrate
          </a>
        </div>
      </div>
    </section>
  );
};

export default LoginComponent;
