import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles } from "lucide-react";
import { getBookCatalog } from "@/lib/book.functions";
import { DefaultStorefrontLayout } from "@/components/booking-themes/DefaultStorefrontLayout";
import { LuxuryBlushLayout } from "@/components/booking-themes/LuxuryBlushLayout";
import { IndustrialDarkLayout } from "@/components/booking-themes/IndustrialDarkLayout";
import { fontFamilyStack, type StorefrontThemeProps } from "@/components/booking-themes/types";

export const Route = createFileRoute("/book/$slug")({
  component: BookCatalogPage,
  head: ({ params }) => ({
    meta: [
      { title: `Book — ${params.slug}` },
      { name: "description", content: "Browse services and book your appointment online." },
    ],
  }),
});

function BookCatalogPage() {
  const { slug } = Route.useParams();
  const fetchCatalog = useServerFn(getBookCatalog);

  const { data, isLoading } = useQuery({
    queryKey: ["book-catalog", slug],
    queryFn: () => fetchCatalog({ data: { slug } }),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Sparkles className="h-6 w-6 animate-pulse text-muted-foreground" />
      </div>
    );
  }

  if (!data?.workspace) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <h1 className="text-2xl font-semibold">Storefront not found</h1>
        <p className="text-muted-foreground">We couldn't find a business at “{slug}”.</p>
        <Link to="/" className="text-primary underline">Go home</Link>
      </div>
    );
  }

  const { workspace, categories, variants, lengthOptions } = data;

  // Resolve branding tokens once; pass cleanly into the selected skin.
  const props: StorefrontThemeProps = {
    workspace,
    categories,
    variants,
    lengthOptions,
    slug,
    primary: workspace.primary_color || "#4f46e5",
    secondary: workspace.secondary_color || "#ec4899",
    fontStack: fontFamilyStack(workspace.font_family),
  };

  // Dynamic Theme Mapping: single core data pipeline, interchangeable skins.
  switch (workspace.theme_id) {
    case "luxury-blush":
      return <LuxuryBlushLayout {...props} />;
    case "industrial-dark":
      return <IndustrialDarkLayout {...props} />;
    default:
      return <DefaultStorefrontLayout {...props} />;
  }
}
