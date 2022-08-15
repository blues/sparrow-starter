// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { HTTP_STATUS } from "../../constants/http";
import { GatewayOrNode } from "../../services/AttributeStore";
import { services } from "../../services/ServiceLocatorServer";

function isString(x: unknown): x is string {
  return typeof x === "string";
}

async function handleRedirect(req: NextApiRequest, res: NextApiResponse) {
  const { pin, sensor, gateway } = req.query;
  // query params can be arrays too, though we don't support multiple values here.
  if (isString(gateway) === isString(sensor) || !isString(pin)) {
    res.status(400).json({ err: HTTP_STATUS.INVALID_REQUEST });
    return;
  }

  const device: GatewayOrNode | null = await services()
    .getAttributeStore()
    .updateDevicePin(gateway, sensor, pin);
  if (device?.gatewayUID) {
    const urlManager = services().getUrlManager();
    const url = device.nodeID
      ? urlManager.nodeDetails(device.gatewayUID, device.nodeID)
      : urlManager.gatewayDetails(device.gatewayUID);
    res.redirect(url);
  } else {
    res.status(404).json({ err: HTTP_STATUS.NOT_FOUND_GATEWAY });
  }
}

export default async function goHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  switch (req.method) {
    case "GET":
      await handleRedirect(req, res);
      break;
    default:
      // Other methods not allowed at this route
      res.status(405).json({ err: HTTP_STATUS.METHOD_NOT_ALLOWED });
  }
}
