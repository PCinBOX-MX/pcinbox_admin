/// <reference lib="webworker" />
import { pdf } from "@react-pdf/renderer";
import CotizacionPdf, {
  QuoteDetailLevel,
  QuotePdfLine,
} from "./pdf/CotizacionPdf";

type PreviewJob = {
  id: number;
  detailLevel: QuoteDetailLevel;
  userName: string;
  userPhone: string;
  includeAssembly: boolean;
  includeTransfer: boolean;
  comments: string;
  products: QuotePdfLine[];
};

const scope = self as unknown as DedicatedWorkerGlobalScope;

scope.onmessage = (event: MessageEvent<PreviewJob>) => {
  const job = event.data;
  void pdf(
    <CotizacionPdf
      noCotizacion="Vista previa"
      products={job.products}
      userName={job.userName}
      userPhone={job.userPhone}
      includeAssemblyService={job.includeAssembly}
      includeTransferInfo={job.includeTransfer !== false}
      comments={job.comments}
      detailLevel={job.detailLevel}
    />,
  )
    .toBlob()
    .then((blob) => {
      scope.postMessage({ id: job.id, blob });
    })
    .catch((error: unknown) => {
      scope.postMessage({
        id: job.id,
        error: error instanceof Error ? error.message : "preview",
      });
    });
};

export {};
