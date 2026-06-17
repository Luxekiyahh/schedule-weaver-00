import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ChevronRight, ChevronLeft, Sparkles, Building2, CalendarDays, ClipboardList, ShieldCheck } from "lucide-react";

export default function SetupWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  // Intake Form States
  const [industry, setIndustry] = useState("braiding");
  const [businessName, setBusinessName] = useState("");
  const [staffCount, setStaffCount] = useState("1");
  const [hours, setHours] = useState("Mon-Fri: 9am - 6pm, Sat: 10am - 4pm, Sun: Closed");
  const [servicesList, setServicesList] = useState("");
  const [policy, setPolicy] = useState("");
  const [intakeRequirements, setIntakeRequirements] = useState("");

  // Seed data matrix presets
  const INDUSTRY_PRESETS: Record<
    string,
    {
      categories: Array<{ name: string; description: string }>;
      variants: Array<{ name: string; price_cents: number; duration_min: number }>;
    }
  > = {
    braiding: {
      categories: [
        { name: "Knotless Braids", description: "Lightweight, scalp-friendly knotless braids. All hair included." },
        { name: "Box Braids", description: "Classic box braids with a clean, snatched finish." },
      ],
      variants: [
        { name: "Medium Mid-Back", price_cents: 25000, duration_min: 420 },
        { name: "Small Waist-Length", price_cents: 35000, duration_min: 540 },
      ],
    },
    barbering: {
      categories: [
        { name: "Haircuts & Fades", description: "Precision sharp clipper cuts, skin fades, and structural edge-ups." },
      ],
      variants: [{ name: "Standard Cut & Shave", price_cents: 5500, duration_min: 45 }],
    },
    esthetics: {
      categories: [
        { name: "Eyelash Enhancements", description: "Premium lightweight individual lash clusters or extensions." },
      ],
      variants: [{ name: "Full Set Classic", price_cents: 12000, duration_min: 90 }],
    },
  };

  const saveSetupMutation = useMutation({
    mutationFn: async () => {
      // 1. Fetch authenticated user session context
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Authentication session expired.");

      // 2. Fetch or create active profile/workspace context link
      const { data: workspace, error: wsError } = await supabase
        .from("workspaces")
        .insert([
          {
            name: businessName || "My Service Brand",
            slug: (businessName || "brand").toLowerCase().replace(/[^a-z0-9]/g, "-"),
            subscription_tier: "basic", // default base tier status
          },
        ])
        .select()
        .single();

      if (wsError) throw wsError;

      // 3. Store intake discovery specs into custom profile notes or branding data layer
      await supabase.from("branding_settings").insert([
        {
          workspace_id: workspace.id,
          primary_color: "#FFD1DC", // Soft luxury baby pink anchor preset
          font_family: "Inter",
          // Saving intake questions as setup configuration notes for master admin review
          setup_notes: JSON.stringify({
            staff_count: staffCount,
            operational_hours: hours,
            requested_menu: servicesList,
            booking_policy: policy,
            intake_form_needs: intakeRequirements,
            selected_industry: industry,
          }),
        },
      ]);

      // 4. Run automated relational seeding engine based on chosen industry track
      const preset = INDUSTRY_PRESETS[industry];
      if (preset) {
        for (const cat of preset.categories) {
          const { data: catData, error: catError } = await supabase
            .from("service_categories")
            .insert([{ workspace_id: workspace.id, name: cat.name, description: cat.description }])
            .select()
            .single();

          if (catError) continue;

          const variantsToInsert = preset.variants.map((v) => ({
            category_id: catData.id,
            name: v.name,
            price_cents: v.price_cents,
            duration_min: v.duration_min,
            is_active: true,
          }));

          await supabase.from("service_variants").insert(variantsToInsert);
        }
      }
      return workspace;
    },
    onSuccess: () => {
      toast.success("Storefront discovery profile initialized successfully!");
      navigate("/dashboard/services"); // Direct dashboard target mapping redirect
    },
    onError: (err: any) => {
      toast.error(`Configuration error: ${err.message}`);
    },
  });

  const nextStep = () => setStep((p) => Math.min(p + 1, 4));
  const prevStep = () => setStep((p) => Math.max(p - 1, 1));

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-zinc-50/50 p-4 font-sans selection:bg-pink-100">
      <Card className="w-full max-w-xl border border-zinc-200/80 shadow-xl shadow-zinc-100/40 bg-white rounded-xl overflow-hidden transition-all duration-300">
        {/* Designer Header Block */}
        <CardHeader className="border-b border-zinc-100 bg-gradient-to-b from-zinc-50/50 to-white pb-6">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
            AI Storefront Designer Assistant
          </div>
          <CardTitle className="text-2xl font-semibold text-zinc-900 tracking-tight">
            Configure Your Booking Platform Bones
          </CardTitle>
          <CardDescription className="text-zinc-500 text-sm">
            Step {step} of 4 — Let's establish your foundational parameters so we can design your unique storefront
            canvas.
          </CardDescription>

          {/* Clean Step Indicator Progress Bar */}
          <div className="w-full bg-zinc-100 h-1 rounded-full mt-4 overflow-hidden">
            <div className="bg-zinc-900 h-full transition-all duration-500" style={{ width: `${(step / 4) * 100}%` }} />
          </div>
        </CardHeader>

        <CardContent className="pt-6 min-h-[280px]">
          {/* STEP 1: Core Business Identity & Industry Dropdown Selection */}
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-2 text-sm font-medium text-zinc-800 mb-1">
                <Building2 className="w-4 h-4 text-zinc-500" /> Core Details
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Business or Brand Name
                </label>
                <Input
                  placeholder="e.g., Luxe Beauty Loft"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="h-11 border-zinc-200 focus-visible:ring-zinc-900"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Primary Industry Category
                </label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full h-11 bg-white border border-zinc-200 rounded-md px-3 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 transition-all"
                >
                  <option value="braiding">Hair & Braiding (Generates Knotless & Box Braid presets)</option>
                  <option value="barbering">Barbering & Grooming (Generates Fade & Line-Up presets)</option>
                  <option value="esthetics">Nails & Esthetics (Generates Lashes & Skin Care presets)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Number of Staff Members / Providers
                </label>
                <Input
                  type="number"
                  min="1"
                  value={staffCount}
                  onChange={(e) => setStaffCount(e.target.value)}
                  className="h-11 border-zinc-200"
                />
              </div>
            </div>
          )}

          {/* STEP 2: Service Descriptions & Durations Specification */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-2 text-sm font-medium text-zinc-800 mb-1">
                <ClipboardList className="w-4 h-4 text-zinc-500" /> Catalog & Service Matrix Specification
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                  List All Services (Names, Prices, Durations)
                </label>
                <Textarea
                  placeholder="Example:&#10;- Knotless Braids (Medium, Mid-Back) | $250 | 4 Hours&#10;- Consultation Session | $30 | 15 Mins"
                  value={servicesList}
                  onChange={(e) => setServicesList(e.target.value)}
                  className="min-h-[160px] border-zinc-200 focus-visible:ring-zinc-900 resize-none text-sm leading-relaxed"
                />
                <p className="text-[11px] text-zinc-400 italic">
                  List as much detail as possible. You can upload service imagery inside your dashboard later.
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: Operational Availability & Schedule Parameters */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-2 text-sm font-medium text-zinc-800 mb-1">
                <CalendarDays className="w-4 h-4 text-zinc-500" /> Operational Parameters
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Weekly Standard Business Hours
                </label>
                <Input value={hours} onChange={(e) => setHours(e.target.value)} className="h-11 border-zinc-200" />
              </div>
              <div className="space-y-2 pt-2">
                <label className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Custom Intake Form Requirements (Optional)
                </label>
                <Textarea
                  placeholder="Do you require clients to answer specific questions upon booking? (e.g., Skin types, allergies, current hair condition details...)"
                  value={intakeRequirements}
                  onChange={(e) => setIntakeRequirements(e.target.value)}
                  className="min-h-[80px] border-zinc-200 focus-visible:ring-zinc-900 text-sm"
                />
              </div>
            </div>
          )}

          {/* STEP 4: System Rules, Salon Policies & Activation Validation */}
          {step === 4 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-2 text-sm font-medium text-zinc-800 mb-1">
                <ShieldCheck className="w-4 h-4 text-zinc-500" /> Salon Policies & Booking Guidelines
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Cancellation, Late Fee, & Studio Policy Guidelines
                </label>
                <Textarea
                  placeholder="Example: No extra guests. Non-refundable deposits required. Cancellations must be made 24 hours in advance to avoid a 50% penalty charge."
                  value={policy}
                  onChange={(e) => setPolicy(e.target.value)}
                  className="min-h-[140px] border-zinc-200 focus-visible:ring-zinc-900 text-sm leading-relaxed"
                />
              </div>
            </div>
          )}
        </CardContent>

        {/* Form Action Controls Footer */}
        <CardFooter className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50/50 pt-4 pb-4">
          <Button
            variant="ghost"
            onClick={prevStep}
            disabled={step === 1 || saveSetupMutation.isPending}
            className="text-zinc-600 hover:text-zinc-900 font-medium text-sm transition-all"
          >
            <ChevronLeft className="w-4 h-4 mr-1.5" />
            Back
          </Button>

          {step < 4 ? (
            <Button
              onClick={nextStep}
              disabled={step === 1 && !businessName.trim()}
              className="bg-zinc-900 text-white hover:bg-zinc-800 font-medium text-sm px-4 h-10 transition-all shadow-md shadow-zinc-900/10"
            >
              Next Step
              <ChevronRight className="w-4 h-4 ml-1.5" />
            </Button>
          ) : (
            <Button
              onClick={() => saveSetupMutation.mutate()}
              disabled={saveSetupMutation.isPending}
              className="bg-gradient-to-r from-zinc-900 to-zinc-800 text-white hover:opacity-95 font-medium text-sm px-5 h-10 transition-all shadow-md shadow-zinc-900/20"
            >
              {saveSetupMutation.isPending ? "Constructing Bones..." : "Compile Storefront Profile"}
              <Sparkles className="w-4 h-4 ml-1.5 text-pink-300" />
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
