"use client";

import ModalComponent from "./shared/components/especific/modal/ModalComponent";
import { useTheContext } from "./hooks/global.hook";
import useProtected from "./hooks/protectedRoute.hook";
import { usePathname } from "next/navigation";
import Navbar from "./shared/components/common/navbar/Navbar";

export default function AppWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { dataModal } = useTheContext();
  const pathName = usePathname();

  useProtected(pathName);

  return (
    <div>
      <main className="min-h-[100%]">
        {pathName != "/features/auth/Login" &&
          pathName != "/" &&
          pathName != "/features/auth/Register" && <Navbar />}
        {children}

        <ModalComponent
          isOpen={dataModal.isOpen}
          title={dataModal.title}
          content={dataModal.content}
          onConfirm={() => dataModal.onConfirm()}
          onClose={() => dataModal.onClose()}
          type={dataModal.type}
          children={dataModal.children}
          showActions={dataModal.showActions}
        />
      </main>
    </div>
  );
}
