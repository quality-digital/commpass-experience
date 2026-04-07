import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Plus, Pencil, Trash2, X, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Question = {
  id?: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  sort_order: number;
};

type Quiz = {
  id: string;
  slug: string;
  title: string;
  description: string;
  max_points: number;
  time_per_question: number;
  is_active: boolean;
  benefit_title?: string | null;
  benefit_description?: string | null;
  benefit_url?: string | null;
  benefit_coupon?: string | null;
  questions?: Question[];
};

const emptyQuiz = { slug: "", title: "", description: "", max_points: 300, time_per_question: 15, is_active: true, benefit_title: "", benefit_description: "", benefit_url: "", benefit_coupon: "" };
const emptyQuestion: Question = { question: "", options: ["", "", "", ""], correct_index: 0, explanation: "", sort_order: 0 };

const AdminQuizzes = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [editing, setEditing] = useState<Partial<Quiz> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [expandedQuiz, setExpandedQuiz] = useState<string | null>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<Question[]>([]);

  const load = async () => {
    const { data } = await supabase.from("quizzes").select("*").order("created_at");
    if (data) setQuizzes(data);
  };

  useEffect(() => { load(); }, []);

  const loadQuestions = async (quizId: string) => {
    if (expandedQuiz === quizId) { setExpandedQuiz(null); return; }
    const { data } = await supabase.from("quiz_questions").select("*").eq("quiz_id", quizId).order("sort_order");
    setExpandedQuestions(data?.map((q) => ({ ...q, options: q.options as string[] })) || []);
    setExpandedQuiz(quizId);
  };

  const handleSave = async () => {
    if (!editing) return;
    const payload = {
      slug: editing.slug!,
      title: editing.title!,
      description: editing.description!,
      max_points: editing.max_points || 300,
      time_per_question: editing.time_per_question || 15,
      is_active: editing.is_active ?? true,
      benefit_title: editing.benefit_title || null,
      benefit_description: editing.benefit_description || null,
      benefit_url: editing.benefit_url || null,
      benefit_coupon: editing.benefit_coupon || null,
    };

    let quizId = editing.id;

    if (isNew) {
      const { data, error } = await supabase.from("quizzes").insert(payload).select().single();
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
      quizId = data.id;
    } else {
      const { error } = await supabase.from("quizzes").update(payload).eq("id", editing.id!);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    }

    // Save questions
    if (quizId && questions.length > 0) {
      // Delete existing questions for this quiz
      await supabase.from("quiz_questions").delete().eq("quiz_id", quizId);
      // Insert new
      const qPayload = questions.map((q, i) => ({
        quiz_id: quizId!,
        question: q.question,
        options: q.options,
        correct_index: q.correct_index,
        explanation: q.explanation,
        sort_order: i + 1,
      }));
      await supabase.from("quiz_questions").insert(qPayload);
    }

    toast({ title: isNew ? "Quiz criado" : "Quiz atualizado" });
    setEditing(null);
    setQuestions([]);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este quiz e todas as perguntas?")) return;
    await supabase.from("quizzes").delete().eq("id", id);
    toast({ title: "Quiz excluído" });
    load();
  };

  const startEdit = async (quiz: Quiz) => {
    setEditing(quiz);
    setIsNew(false);
    const { data } = await supabase.from("quiz_questions").select("*").eq("quiz_id", quiz.id).order("sort_order");
    setQuestions(data?.map((q) => ({ ...q, options: q.options as string[] })) || []);
  };

  const update = (key: string, value: any) => setEditing((p) => p ? { ...p, [key]: value } : null);
  const updateQ = (idx: number, key: string, value: any) => {
    setQuestions((prev) => prev.map((q, i) => i === idx ? { ...q, [key]: value } : q));
  };
  const updateQOption = (qIdx: number, optIdx: number, value: string) => {
    setQuestions((prev) => prev.map((q, i) => i === qIdx ? { ...q, options: q.options.map((o, j) => j === optIdx ? value : o) } : q));
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Quizzes</h1>
        <button
          onClick={() => { setEditing(emptyQuiz); setIsNew(true); setQuestions([{ ...emptyQuestion }]); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg gradient-cta text-primary-foreground text-sm font-semibold"
        >
          <Plus size={16} /> Novo Quiz
        </button>
      </div>

      {editing && (
        <div className="p-6 rounded-2xl bg-card shadow-card mb-6 max-h-[70vh] overflow-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-foreground">{isNew ? "Novo Quiz" : "Editar Quiz"}</h2>
            <button onClick={() => { setEditing(null); setQuestions([]); }} className="text-muted-foreground"><X size={20} /></button>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            {[
              { key: "slug", label: "Slug" },
              { key: "title", label: "Título" },
              { key: "max_points", label: "Pontos Máx.", type: "number" },
              { key: "time_per_question", label: "Tempo/Pergunta (s)", type: "number" },
            ].map((f) => (
              <div key={f.key}>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">{f.label}</label>
                <input
                  type={f.type || "text"}
                  value={(editing as any)[f.key] || ""}
                  onChange={(e) => update(f.key, f.type === "number" ? Number(e.target.value) : e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                />
              </div>
            ))}
            <div className="col-span-2">
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Descrição</label>
              <textarea value={editing.description || ""} onChange={(e) => update("description", e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={editing.is_active ?? true} onChange={(e) => update("is_active", e.target.checked)} />
              <span className="text-sm text-foreground">Ativo</span>
            </div>
          </div>

          <h3 className="font-bold text-foreground text-sm mb-3">Benefício (opcional)</h3>
          <div className="grid grid-cols-2 gap-4 mb-6">
            {[
              { key: "benefit_title", label: "Título do Benefício" },
              { key: "benefit_coupon", label: "Cupom" },
              { key: "benefit_url", label: "Link para Resgate" },
            ].map((f) => (
              <div key={f.key}>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">{f.label}</label>
                <input
                  type="text"
                  value={(editing as any)[f.key] || ""}
                  onChange={(e) => update(f.key, e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                />
              </div>
            ))}
            <div className="col-span-2">
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Descrição do Benefício</label>
              <textarea value={editing.benefit_description || ""} onChange={(e) => update("benefit_description", e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm" />
            </div>
          </div>

          <h3 className="font-bold text-foreground text-sm mb-3">Perguntas</h3>
          <div className="space-y-4">
            {questions.map((q, qi) => (
              <div key={qi} className="p-4 rounded-xl border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-muted-foreground">Pergunta {qi + 1}</span>
                  <button onClick={() => setQuestions((p) => p.filter((_, i) => i !== qi))} className="text-destructive text-xs">Remover</button>
                </div>
                <input
                  placeholder="Pergunta"
                  value={q.question}
                  onChange={(e) => updateQ(qi, "question", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm mb-2"
                />
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {q.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <input type="radio" name={`correct-${qi}`} checked={q.correct_index === oi} onChange={() => updateQ(qi, "correct_index", oi)} />
                      <input
                        placeholder={`Opção ${oi + 1}`}
                        value={opt}
                        onChange={(e) => updateQOption(qi, oi, e.target.value)}
                        className="flex-1 px-2 py-1.5 rounded border border-border bg-background text-foreground text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => setQuestions((p) => [...p, { ...emptyQuestion, sort_order: p.length + 1 }])} className="mt-3 text-primary text-sm font-semibold flex items-center gap-1">
            <Plus size={14} /> Adicionar Pergunta
          </button>

          <div className="flex justify-end gap-3 mt-4">
            <button onClick={() => { setEditing(null); setQuestions([]); }} className="px-4 py-2 rounded-lg border border-border text-muted-foreground text-sm font-medium">Cancelar</button>
            <button onClick={handleSave} className="px-4 py-2 rounded-lg gradient-cta text-primary-foreground text-sm font-semibold">Salvar</button>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-card shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-3 text-muted-foreground font-medium">Título</th>
              <th className="text-left p-3 text-muted-foreground font-medium">Pontos</th>
              <th className="text-left p-3 text-muted-foreground font-medium">Tempo</th>
              <th className="text-left p-3 text-muted-foreground font-medium">Status</th>
              <th className="text-right p-3 text-muted-foreground font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {quizzes.map((q) => (
              <>
                <tr key={q.id} className="border-b border-border last:border-0">
                  <td className="p-3 font-medium text-foreground">
                    <button onClick={() => loadQuestions(q.id)} className="flex items-center gap-1 hover:text-primary">
                      {expandedQuiz === q.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      {q.title}
                    </button>
                  </td>
                  <td className="p-3 text-primary font-bold">{q.max_points}</td>
                  <td className="p-3 text-muted-foreground">{q.time_per_question}s</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${q.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {q.is_active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button onClick={() => startEdit(q)} className="text-muted-foreground hover:text-foreground mr-2"><Pencil size={14} /></button>
                    <button onClick={() => handleDelete(q.id)} className="text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
                  </td>
                </tr>
                {expandedQuiz === q.id && expandedQuestions.map((eq, i) => (
                  <tr key={eq.id || i} className="bg-secondary/30">
                    <td colSpan={5} className="p-3 pl-8 text-xs text-muted-foreground">
                      <strong>{i + 1}.</strong> {eq.question} — <span className="text-primary">Resposta: {eq.options[eq.correct_index]}</span>
                    </td>
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
};

export default AdminQuizzes;
