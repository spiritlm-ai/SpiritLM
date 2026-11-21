import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import {
  NextResponse,
  type NextFetchEvent,
  type NextRequest,
} from "next/server";
import { corsOrigin, corsPreflight, withCors } from "@/lib/cors";

const isDashboardRoute = createRouteMatcher(["/dashboard(.*)"]);
const isApiRoute = createRouteMatcher(["/v1(.*)"]);

const withClerk = clerkMiddleware(async (auth, request) => {
  if (isDashboardRoute(request)) {
    await auth.protect({
      unauthenticatedUrl: new URL("/auth/sign-in", request.url).toString(),
    });
  }
});

export default function middleware(request: NextRequest, event: NextFetchEvent) {
  if (isApiRoute(request)) {
    const origin = corsOrigin(request);
    if (request.method === "OPTIONS") {
      return corsPreflight(origin);
    }
    return withCors(NextResponse.next(), origin);
  }

  return withClerk(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
