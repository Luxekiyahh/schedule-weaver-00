import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "ProcSchedule — A Custom Booking Site for Service Professionals" },
      { name: "description", content: "Stop sending clients to a generic calendar. We custom-code a high-converting booking and client-retention site for your business for a flat $100 setup." },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "ProcSchedule — A Custom Booking Site for Service Professionals" },
      { property: "og:description", content: "Stop sending clients to a generic calendar. We custom-code a high-converting booking and client-retention site for your business for a flat $100 setup." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "ProcSchedule — A Custom Booking Site for Service Professionals" },
      { name: "twitter:description", content: "Stop sending clients to a generic calendar. We custom-code a high-converting booking and client-retention site for your business for a flat $100 setup." },
      { property: "og:image", content: "https://procschedule.com/__l5e/assets-v1/622e3933-71fe-4cab-957a-44e58034c292/procschedule-icon-1024.png" },
      { name: "twitter:image", content: "https://procschedule.com/__l5e/assets-v1/622e3933-71fe-4cab-957a-44e58034c292/procschedule-icon-1024.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/__l5e/assets-v1/72d84a02-2a15-4d0a-9765-2dfd95a55580/procschedule-favicon-32.png" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/__l5e/assets-v1/19cde8a3-208a-4990-94e6-57c0b0d3bb42/procschedule-favicon-16.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/__l5e/assets-v1/31b50624-670c-47d5-9934-ae5c6757f6d7/procschedule-icon-180.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap",
      },
    ],
    scripts: [
      {
        src: "https://cdnjs.cloudflare.com/ajax/libs/color-thief/2.3.2/color-thief.umd.js",
        defer: true,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
