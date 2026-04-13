import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Save, Download, Egg, QrCode } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import QRCodeLib from "qrcode";

const AdminEasterEgg = () => {
  const [value, setValue] = useState("500");
  const [prize, setPrize] = useState("🎉 500 Pontos");
  const [saving, setSaving] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const load = async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", ["easter_egg_presencial_value", "easter_egg_presencial_prize"]);
    if (data) {
      data.forEach((s) => {
        if (s.key === "easter_egg_presencial_value") setValue(s.value);
        if (s.key === "easter_egg_presencial_prize") setPrize(s.value);
      });
    }
  };

  useEffect(() => { load(); }, []);

  const qrPayload = JSON.stringify({
    id: "easter-egg-presencial",
    prize,
    value: Number(value),
  });

  useEffect(() => {
    QRCodeLib.toDataURL(qrPayload, { width: 1024, margin: 2 })
      .then(setQrDataUrl)
      .catch(() => {});
  }, [qrPayload]);

  const handleSave = async () => {
    setSaving(true);
    await Promise.all([
      supabase.from("app_settings").update({ value }).eq("key", "easter_egg_presencial_value"),
      supabase.from("app_settings").update({ value: prize }).eq("key", "easter_egg_presencial_prize"),
      supabase.from("missions").update({ points: Number(value) }).eq("slug", "easter-egg-presencial"),
    ]);
    toast({ title: "Configurações do Easter Egg salvas!" });
    setSaving(false);
  };

  const downloadPNG = async () => {
    try {
      const canvas = document.createElement("canvas");
      await QRCodeLib.toCanvas(canvas, qrPayload, { width: 1024, margin: 2 });
      const link = document.createElement("a");
      link.download = "easter-egg-presencial.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      toast({ title: "Erro ao gerar PNG", variant: "destructive" });
    }
  };

  const downloadSVG = async () => {
    try {
      const svgString = await QRCodeLib.toString(qrPayload, { type: "svg", width: 1024, margin: 2 });
      const blob = new Blob([svgString], { type: "image/svg+xml" });
      const link = document.createElement("a");
      link.download = "easter-egg-presencial.svg";
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
    } catch {
      toast({ title: "Erro ao gerar SVG", variant: "destructive" });
    }
  };

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
        <Egg size={24} className="text-green-600" />
        Easter Egg Presencial
      </h1>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        {/* Config */}
        <div className="rounded-2xl bg-card shadow-card p-6">
          <h2 className="font-semibold text-foreground mb-4">Configuração</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-foreground block mb-1">Valor em pontos</label>
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground block mb-1">Texto do prêmio</label>
              <input
                type="text"
                value={prize}
                onChange={(e) => setPrize(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg gradient-cta text-primary-foreground text-sm font-semibold"
            >
              <Save size={16} />
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>

          <div className="mt-6 p-3 rounded-xl bg-secondary/50 border border-border">
            <p className="text-xs font-semibold text-foreground mb-1">Payload do QR Code:</p>
            <pre className="text-xs text-muted-foreground font-mono break-all whitespace-pre-wrap">{qrPayload}</pre>
          </div>
        </div>

        {/* QR Preview & Download */}
        <div className="rounded-2xl bg-card shadow-card p-6 text-center">
          <h2 className="font-semibold text-foreground mb-4">QR Code</h2>
          {qrDataUrl && (
            <img src={qrDataUrl} alt="QR Code Easter Egg" className="w-64 h-64 mx-auto rounded-xl border border-border mb-4" />
          )}
          <div className="flex gap-3 justify-center">
            <button
              onClick={downloadSVG}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-foreground text-sm font-semibold hover:bg-secondary transition-colors"
            >
              <Download size={16} />
              SVG
            </button>
            <button
              onClick={downloadPNG}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-foreground text-sm font-semibold hover:bg-secondary transition-colors"
            >
              <Download size={16} />
              PNG
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminEasterEgg;
