import type { NextApiRequest, NextApiResponse } from "next";
import { app } from "../../server/index";

export const config = {
  api: {
    bodyParser: false,
  },
  maxDuration: 60,
};

export default function handler(
  request: NextApiRequest,
  response: NextApiResponse
) {
  return app(request, response);
}
