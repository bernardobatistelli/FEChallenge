import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { createContext } from "@/server/context";
import { appRouter } from "@/server/routers/app";

export const runtime = "nodejs";

function handler(req: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext({ req }),
  });
}

export { handler as GET, handler as POST };
