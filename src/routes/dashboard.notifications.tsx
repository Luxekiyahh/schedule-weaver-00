import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, MessageSquare, Bell } from "lucide-react";
import { toast } from "sonner";
import { sendTestSms } from "@/lib/sms/sms.functions";

export const Route = createFileRoute("/dashboard/notifications")({
  component: NotificationsPage,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/onboarding" });
  },
  head: () => ({ meta: [{ title: "Notifications — Dashboard" }] }),
});

type Settings = {
  client_email: boolean;
  client_sms: boolean;
  provider_email: boolean;
};

const DEFAULTS: Settings = { client_email: true, client_sms: false, provider_email: true };

function NotificationsPage() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [initial, setInitial] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testing, setTesting] = useState(false);
  const sendTest = useServerFn(sendTestSms);

  async function onTestSms() {
    if (!testPhone.trim()) return;
    setTesting(true);
    try {
      const res = await sendTest({ data: { phone: testPhone.trim() } });
      if (res.ok) toast.success("Test SMS sent", { description: `Message ${res.sid} is on its way.` });
      else toast.error("Could not send test SMS", { description: res.error });
    } catch (err) {
      toast.error("Could not send test SMS", { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setTesting(false);
    }
  }

  useEffect(() => {
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) return;
      const { data: mem } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", userRes.user.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      if (!mem) { setLoading(false); return; }
      setWorkspaceId(mem.workspace_id);
      const { data: ws } = await supabase
        .from("workspaces")
        .select("notification_settings")
        .eq("id", mem.workspace_id)
        .single();
      const cfg = { ...DEFAULTS, ...((ws?.notification_settings as Partial<Settings>) ?? {}) };
      setSettings(cfg);
      setInitial(cfg);
      setLoading(false);
    })();
  }, []);

  const dirty =
    settings.client_email !== initial.client_email ||
    settings.client_sms !== initial.client_sms ||
    settings.provider_email !== initial.provider_email;

  async function onSave() {
    if (!workspaceId) return;
    setSaving(true);
    const { error } = await supabase
      .from("workspaces")
      .update({ notification_settings: settings })
      .eq("id", workspaceId);
    setSaving(false);
    if (error) { toast.error("Could not save", { description: error.message }); return; }
    setInitial(settings);
    toast.success("Notification preferences saved");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground">Choose how clients and your team are alerted about bookings.</p>
      </header>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-indigo-100 text-indigo-600 grid place-items-center">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Email notifications</CardTitle>
              <CardDescription>Confirmations and booking alerts via email.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <Row
            id="client_email"
            title="Send confirmation email to clients"
            desc="A branded confirmation goes to the client immediately after booking."
            checked={settings.client_email}
            onChange={(v) => setSettings((s) => ({ ...s, client_email: v }))}
          />
          <Row
            id="provider_email"
            title="Notify me via email when a new appointment is booked"
            desc="You'll get a short alert with client name, service, and time."
            checked={settings.provider_email}
            onChange={(v) => setSettings((s) => ({ ...s, provider_email: v }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-100 text-emerald-600 grid place-items-center">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>SMS notifications</CardTitle>
              <CardDescription>Short text alerts powered by Twilio.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <Row
            id="client_sms"
            title="Send text message alert to clients"
            desc="A 160-character confirmation text to the client's phone number."
            checked={settings.client_sms}
            onChange={(v) => setSettings((s) => ({ ...s, client_sms: v }))}
          />
        </CardContent>
      </Card>

      {dirty && (
        <div className="sticky bottom-4 z-10">
          <div className="rounded-xl border bg-background/95 backdrop-blur shadow-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Bell className="h-4 w-4" /> You have unsaved changes
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setSettings(initial)} disabled={saving}>Reset</Button>
              <Button onClick={onSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ id, title, desc, checked, onChange }: {
  id: string; title: string; desc: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="space-y-1">
        <Label htmlFor={id} className="text-sm font-medium leading-none cursor-pointer">{title}</Label>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
