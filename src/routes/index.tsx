import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 px-6">
      <div className="max-w-lg text-center">
        <div className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-indigo-600">
          <Sparkles className="h-4 w-4" /> Scheduling, simplified
        </div>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900">
          Run your bookings from one calm workspace.
        </h1>
        <p className="mt-3 text-slate-500">
          Two minutes to set up. Free to start.
        </p>
        <Link
          to="/onboarding"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
        >
          Get started <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
