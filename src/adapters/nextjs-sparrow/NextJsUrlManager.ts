import { UrlManager } from "../../components/presentation/UrlManager";

export const NextJsUrlManager: UrlManager = {
  bulkDataImport: () => `/admin/bulk-data-import`,
  performBulkDataImportApi: () => `/api/admin/bulk-data-import`,
  gatewayNameUpdate: (gatewayUID: string) => `/api/gateway/${gatewayUID}/name`,
  nodeNameUpdate: (gatewayUID: string, nodeId: string) =>
    `/api/gateway/${gatewayUID}/node/${nodeId}/config`,
  notehubProject: (notehubUrl, projectUID) =>
    `${notehubUrl}/project/${projectUID}`,

  gatewayDetails: (gatewayUID: string) => `/${gatewayUID}/details`,
  nodeSummary: (gatewayUID: string, nodeId: string) =>
    `/${gatewayUID}/node/${nodeId}/details`,
  nodeDetails: (gatewayUID: string, nodeId: string) =>
    `/${gatewayUID}/node/${nodeId}/details?showDetails=1`,
};
const DEFAULT = { NextJsUrlManager };
export default DEFAULT;
