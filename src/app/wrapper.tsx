"use client";

import ModalComponent from "./shared/components/especific/modal/ModalComponent";
import { useTheContext } from "./hooks/global.hook";
import useProtected from "./hooks/protectedRoute.hook";
import { usePathname } from "next/navigation";

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
      <main
        className="min-h-[100%]"
        style={{
          minHeight: "100vh",
        }}
      >
        {children}

        <ModalComponent
          isOpen={dataModal.isOpen}
          title={dataModal.title}
          message={dataModal.message}
          onConfirm={() => dataModal.onConfirm()}
          onClose={() => dataModal.onClose()}
          type={dataModal.type}
          children={dataModal.children}
        />
      </main>
    </div>
  );
}
