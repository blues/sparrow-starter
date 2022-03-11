// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { HTTP_STATUS } from "../../../constants/http";
import NotehubRoutedEvent from "../../../services/notehub/models/NotehubRoutedEvent";
import { parseSparrowEvent } from "../../../services/notehub/SparrowEvents";
import { services } from "../../../services/ServiceLocator";


async function ingestEvent(notehubEvent: NotehubRoutedEvent) {
    console.log("ingesting ", JSON.stringify(notehubEvent));
    if (!notehubEvent.project?.id) {
        throw Error(HTTP_STATUS.INVALID_PROJECTUID);         // todo - this is a client error. 
    }

    const sparrowEvent = parseSparrowEvent(notehubEvent);
    return services().getAppService().handleEvent(sparrowEvent);
}

async function handleEvent(req: NextApiRequest, res: NextApiResponse) {
    const result = await ingestEvent(req.body as NotehubRoutedEvent);
    res.status(200).json({});
    return result;
}

export default async function datastoreIngestionHandler(
  req: NextApiRequest,
  res: NextApiResponse
) 
{
    switch (req.method) {
        case "POST":
            await handleEvent(req, res);
            break;
        default:
            // Other methods not allowed at this route
            res.status(405).json({ err: HTTP_STATUS.METHOD_NOT_ALLOWED });
        }
}