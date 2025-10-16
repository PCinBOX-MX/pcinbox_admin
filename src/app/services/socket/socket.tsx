// "use client";
// import { useEffect, useRef } from "react";
// import io, { Socket } from "socket.io-client";

// const useSocket = () => {
//   const socketServer = useRef<Socket | null>(null);
//   const socketPagos = useRef<Socket | null>(null);

//   useEffect(() => {
//     // socketServer.current = io(process.env.NEXT_PUBLIC_API_URL || "");
//     socketPagos.current = io(process.env.NEXT_PUBLIC_SOCKET_PAGOS || "");

//     return () => {
//       socketServer.current?.disconnect();
//       socketPagos.current?.disconnect();
//     };
//   }, []);

//   return {
//     socketServer,
//     socketPagos,
//   };
// };

// export default useSocket;
