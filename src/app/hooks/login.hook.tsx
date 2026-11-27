"use client";

import { FormEvent, useState } from "react";
import { LoginI } from "../interfaces/login/login.interface";
import UtilsService from "../services/utils";
import { persistAdminRole, normalizeAdminRole } from "../constants/permissions";
import { useTheContext } from "./global.hook";
import { clearVoluntaryLogout } from "../utils/sessionAuth";
import { setAdminMemoryToken } from "../utils/authMemory";

const useLogin = () => {
  const [dataLogin, setDataLogin] = useState<LoginI>({
    email: "",
    password: "",
  });

  const [loadingLogin, setLoadingLogin] = useState<boolean>(false);

  const { requestPost, onRouterPush } = UtilsService();

  const { setDataModal } = useTheContext();

  const handleOnChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;

    setDataLogin((prevDataLogin) => ({
      ...prevDataLogin,
      [name]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const { email, password } = dataLogin;

    if (!email || !password) {
      setDataModal({
        isOpen: true,
        content: "Completa los campos",
        title: "Error",
        type: "error",
        onConfirm: () => {
          setDataModal((prev) => ({ ...prev, isOpen: false }));
        },
        onClose: () => {
          setDataModal((prev) => ({ ...prev, isOpen: false }));
        },
        showActions: true,
      });
      return;
    }

    try {
      setLoadingLogin(true);
      const resp = await requestPost(dataLogin, "/user/login");
      setLoadingLogin(false);
      if (resp && resp.status == 200) {
        const data = resp.data;

        const role = normalizeAdminRole(data?.data?.role);

        if (role === "admin" || role === "support") {
          clearVoluntaryLogout();
          // Cookie httpOnly + JWT/email en memoria (no identidad en localStorage).
          localStorage.removeItem("token");
          localStorage.removeItem("email");
          setAdminMemoryToken(data?.data?.token || data?.token || null);
          persistAdminRole(role);
          onRouterPush("/dashboard");
        } else {
          alert("Cuenta no permitida");
        }
      } else {
        setDataModal({
          isOpen: true,
          content:
            resp?.data?.message ||
            "No pudimos iniciar sesión. Verifica tu correo y contraseña.",
          title: "Error",
          type: "error",
          onConfirm: () => {
            setDataModal((prev) => ({ ...prev, isOpen: false }));
          },
          onClose: () => {
            setDataModal((prev) => ({ ...prev, isOpen: false }));
          },
          showActions: true,
        });
      }
    } catch (error: any) {
      setLoadingLogin(false);
      setDataModal({
        isOpen: true,
        content:
          error?.response?.data?.message ||
          "No pudimos iniciar sesión. Verifica tu correo y contraseña.",
        title: "Error",
        type: "error",
        onConfirm: () => {
          setDataModal((prev) => ({ ...prev, isOpen: false }));
        },
        onClose: () => {
          setDataModal((prev) => ({ ...prev, isOpen: false }));
        },
        showActions: true,
      });
    }
  };

  return {
    loadingLogin,
    dataLogin,
    handleSubmit,
    handleOnChange,
  };
};

export default useLogin;
