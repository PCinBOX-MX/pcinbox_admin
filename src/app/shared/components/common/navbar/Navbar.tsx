"use client";

import { LogOut, Menu, User, X } from "lucide-react";
import GridNavbar from "./gridNavbar";
import useNavbar from "./useNavbar";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

const Navbar = () => {
  const pathName = usePathname();
  const { navItems } = GridNavbar();
  const {
    activeTab,
    isOpen,
    isLoadStorage,
    setIsLoadStorage,
    setIsOpen,
    setActiveTab,
    handleActiveTab,
    handleLogout,
  } = useNavbar();

  useEffect(() => {
    if (!pathName) return;

    setIsLoadStorage(true);

    setActiveTab(
      pathName === "/dashboard"
        ? "ventas"
        : pathName === "/proveedores"
        ? "proveedores"
        : pathName === "/customer"
        ? "clientes"
        : pathName === "/settings"
        ? "ajustes"
        : ""
    );
  }, [pathName]);

  return (
    <nav className="fixed z-10 top-0 left-0 w-full bg-gradient-to-r bg-white min-h-[100px]">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between min-h-[100px] w-full shadow">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div
                style={{
                  paddingLeft: "15px",
                }}
                className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent"
              >
                <img
                  src="https://ik.imagekit.io/pcinboxkit/logos/logo.png?updatedAt=1759534318587"
                  alt="Logo"
                  width={150}
                  height={150}
                  loading="lazy"
                />
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-center gap-3">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleActiveTab(item.label, item.id)}
                    style={{
                      padding: "5px",
                    }}
                    className={` cursor-pointer rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                      isLoadStorage && activeTab === item.id
                        ? "bg-[#bb3d4b] text-white shadow-lg shadow-blue-500/50"
                        : "text-black hover:bg-slate-700 hover:text-white"
                    }`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* User Profile & Logout */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={handleLogout}
              style={{
                padding: "5px",
                marginRight: "10px",
                cursor: "pointer",
              }}
              className="rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 text-white transition-all duration-200 flex items-center gap-2 shadow-lg shadow-red-500/30"
            >
              <LogOut size={18} />
              Cerrar Sesión
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-lg text-gray-300 hover:text-white hover:bg-slate-700 transition-colors"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden bg-slate-800 border-t border-slate-700">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    localStorage.setItem("activeTab", String(item.id));
                    setActiveTab(item.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 flex items-center gap-3 ${
                    activeTab === item.id
                      ? "bg-blue-600 text-white"
                      : "text-gray-300 hover:bg-slate-700 hover:text-white"
                  }`}
                >
                  <Icon size={20} />
                  {item.label}
                </button>
              );
            })}
            <div className="pt-4 border-t border-slate-700 mt-4">
              <div className="flex items-center gap-2 px-4 py-2 mb-2 text-gray-300">
                <User size={20} />
                <span className="text-base font-medium">Usuario</span>
              </div>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-3 rounded-lg text-base font-medium bg-red-600 hover:bg-red-700 text-white transition-all duration-200 flex items-center gap-3"
              >
                <LogOut size={20} />
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
