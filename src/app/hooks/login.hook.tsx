"use client";

import { FormEvent, useState } from "react";
import { LoginI } from "../interfaces/login/login.interface";
import UtilsService from "../services/utils";
import { useTheContext } from "./global.hook";

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

        if (data?.data?.role == "admin") {
          localStorage.setItem("email", email || "");
          localStorage.setItem("token", data?.data?.token || data?.token || "");
          onRouterPush("/dashboard");
        } else {
          alert("Cuenta no permitida");
        }
      }
    } catch (error) {
      setLoadingLogin(false);
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
