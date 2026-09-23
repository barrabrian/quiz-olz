import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";

type GateSession = { unlocked?: boolean };

function sessionConfig() {
  return {
    password: process.env["SESSION_SECRET"]!,
    name: "quiz-dashboard",
    maxAge: 60 * 60 * 24 * 7,
    cookie: { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" },
  };
}

function matches(input: string, expected: string) {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

export const unlockDashboard = createServerFn({ method: "POST" })
  .inputValidator((data: { password: string }) => data)
  .handler(async ({ data }) => {
    const expected = process.env["DASHBOARD_PASSWORD"];
    if (!expected) throw new Error("DASHBOARD_PASSWORD is not set");
    if (!data?.password || !matches(data.password, expected)) {
      return { ok: false as const };
    }
    const session = await useSession<GateSession>(sessionConfig());
    await session.update({ unlocked: true });
    return { ok: true as const };
  });

export const lockDashboard = createServerFn({ method: "POST" }).handler(async () => {
  const session = await useSession<GateSession>(sessionConfig());
  await session.clear();
  return { ok: true as const };
});

export const getDashboardStatus = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useSession<GateSession>(sessionConfig());
  return { unlocked: Boolean(session.data.unlocked) };
});

type EventRow = {
  session_id: string;
  event: string;
  step: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
};

const LABELS: Record<string, Record<string, string>> = {
  qty: { one: "1 unidade", few: "2 a 4 unidades", many: "5 ou mais" },
  goal: {
    diaria: "Subir a diária",
    ocupacao: "Encher o calendário",
    review: "Reviews melhores",
    estreia: "Estrear imóvel novo",
    renovar: "Renovar anúncio cansado",
  },
  type: { studio: "Studio / quitinete", apto: "Apartamento", casa: "Casa / sobrado", loft: "Loft" },
  pains: {
    foto: "A foto não vende",
    identidade: "Pouca identidade",
    morar: "Parece casa de morar",
    desgaste: "Desgaste e manutenção",
    guarda: "Pouco lugar de guarda",
    banho: "Banheiro ou cozinha fracos",
    ruido: "Privacidade / ruído",
  },
  look: {
    clean: "Clean que vende",
    acolhedor: "Acolhedor / hygge",
    urbano: "Urbano / industrial",
    praia: "Praia / mediterrâneo",
    boutique: "Boutique / autoral",
    japandi: "Japandi sereno",
  },
};

const STEP_LABELS: Record<string, string> = {
  s1: "1 · Quantidade de imóveis",
  s2: "2 · Objetivo",
  s3: "3 · Tipo e tamanho",
  s4: "4 · Dores",
  s5: "5 · Orçamento",
  s6: "6 · Estilo visual",
  result: "7 · Resultado",
};

function label(field: string, value: string) {
  return LABELS[field]?.[value] ?? value;
}

function budgetBand(v: number) {
  if (v <= 8000) return "Até R$ 8 mil";
  if (v <= 25000) return "R$ 8 mil – 25 mil";
  if (v <= 60000) return "R$ 25 mil – 60 mil";
  if (v <= 150000) return "R$ 60 mil – 150 mil";
  return "Acima de R$ 150 mil";
}

export const getQuizAnalytics = createServerFn({ method: "GET" })
  .inputValidator((data: { days?: number } | undefined) => ({ days: data?.days ?? 30 }))
  .handler(async ({ data }) => {
    const session = await useSession<GateSession>(sessionConfig());
    if (!session.data.unlocked) throw new Error("unauthorized");

    const since = new Date(Date.now() - data.days * 24 * 60 * 60 * 1000).toISOString();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("quiz_events")
      .select("session_id, event, step, payload, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(20000);

    if (error) throw new Error(error.message);
    const events = (rows ?? []) as EventRow[];

    const sessions = new Set(events.map((e) => e.session_id));
    const starters = new Set(events.filter((e) => e.event === "quiz_start").map((e) => e.session_id));
    const completers = new Set(
      events.filter((e) => e.event === "quiz_complete").map((e) => e.session_id),
    );
    const clickers = new Set(
      events.filter((e) => e.event === "whatsapp_click").map((e) => e.session_id),
    );

    // Funnel: unique sessions reaching each step
    const stepSessions: Record<string, Set<string>> = {};
    for (const e of events) {
      if (e.event !== "step_view" || !e.step || !STEP_LABELS[e.step]) continue;
      (stepSessions[e.step] ??= new Set()).add(e.session_id);
    }
    const funnel = Object.keys(STEP_LABELS).map((step) => ({
      step,
      label: STEP_LABELS[step]!,
      count: stepSessions[step]?.size ?? 0,
    }));

    // Latest snapshot per session (from completions, else deepest step view)
    const latest = new Map<string, EventRow>();
    for (const e of events) {
      if (!e.payload || Object.keys(e.payload).length === 0) continue;
      if (e.event !== "quiz_complete" && e.event !== "step_view" && e.event !== "quiz_exit") continue;
      if (!latest.has(e.session_id)) latest.set(e.session_id, e);
    }

    const answered = [...latest.values()].map((e) => e.payload as Record<string, unknown>);
    const completedSnapshots: Record<string, unknown>[] = events
      .filter((e) => e.event === "quiz_complete")
      .map((e) => ({ at: e.created_at, ...(e.payload as Record<string, unknown>) }));

    function distribution(field: "qty" | "goal" | "type" | "look") {
      const counts = new Map<string, number>();
      for (const snap of answered) {
        const v = snap[field];
        if (typeof v !== "string" || !v) continue;
        counts.set(v, (counts.get(v) ?? 0) + 1);
      }
      return [...counts.entries()]
        .map(([value, count]) => ({ value, label: label(field, value), count }))
        .sort((a, b) => b.count - a.count);
    }

    const painCounts = new Map<string, number>();
    for (const snap of answered) {
      const pains = snap["pains"];
      if (!Array.isArray(pains)) continue;
      for (const p of pains) {
        if (typeof p !== "string") continue;
        painCounts.set(p, (painCounts.get(p) ?? 0) + 1);
      }
    }
    const pains = [...painCounts.entries()]
      .map(([value, count]) => ({ value, label: label("pains", value), count }))
      .sort((a, b) => b.count - a.count);

    const budgetCounts = new Map<string, number>();
    let budgetSum = 0;
    let budgetN = 0;
    for (const snap of answered) {
      const b = snap["budget"];
      if (typeof b !== "number") continue;
      budgetSum += b;
      budgetN += 1;
      const band = budgetBand(b);
      budgetCounts.set(band, (budgetCounts.get(band) ?? 0) + 1);
    }
    const budgets = [...budgetCounts.entries()].map(([value, count]) => ({
      value,
      label: value,
      count,
    }));

    const durations = completedSnapshots
      .map((s) => (typeof s["seconds"] === "number" ? (s["seconds"] as number) : null))
      .filter((n): n is number => n !== null && n > 0 && n < 3600);

    const byDay = new Map<string, { sessions: Set<string>; completions: number }>();
    for (const e of events) {
      const day = e.created_at.slice(0, 10);
      const entry = byDay.get(day) ?? { sessions: new Set<string>(), completions: 0 };
      entry.sessions.add(e.session_id);
      if (e.event === "quiz_complete") entry.completions += 1;
      byDay.set(day, entry);
    }
    const daily = [...byDay.entries()]
      .map(([day, v]) => ({ day, visits: v.sessions.size, completions: v.completions }))
      .sort((a, b) => a.day.localeCompare(b.day));

    const recent = completedSnapshots.slice(0, 25).map((s) => ({
      at: s["at"] as string,
      qty: typeof s["qty"] === "string" ? label("qty", s["qty"]) : "—",
      goal: typeof s["goal"] === "string" ? label("goal", s["goal"]) : "—",
      type: typeof s["type"] === "string" ? label("type", s["type"]) : "—",
      look: typeof s["look"] === "string" ? label("look", s["look"]) : "—",
      sizeM2: typeof s["sizeM2"] === "number" ? (s["sizeM2"] as number) : null,
      budget: typeof s["budget"] === "number" ? (s["budget"] as number) : null,
      pains: Array.isArray(s["pains"])
        ? (s["pains"] as string[]).map((p) => label("pains", p))
        : [],
      seconds: typeof s["seconds"] === "number" ? (s["seconds"] as number) : null,
    }));

    return {
      days: data.days,
      totals: {
        visits: sessions.size,
        starts: starters.size,
        completions: completers.size,
        whatsapp: clickers.size,
        events: events.length,
        avgBudget: budgetN ? Math.round(budgetSum / budgetN) : null,
        avgSeconds: durations.length
          ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
          : null,
      },
      funnel,
      daily,
      qty: distribution("qty"),
      goal: distribution("goal"),
      type: distribution("type"),
      look: distribution("look"),
      pains,
      budgets,
      recent,
    };
  });
