import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  getDashboardStatus,
  getQuizAnalytics,
  lockDashboard,
  unlockDashboard,
} from "@/lib/dashboard.functions";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Painel do Quiz — Forma Stay" },
      {
        name: "description",
        content: "Métricas de visitas, respostas e conversões do quiz de design para Airbnb.",
      },
      { property: "og:title", content: "Painel do Quiz — Forma Stay" },
      {
        property: "og:description",
        content: "Área restrita com os resultados e a taxa de conversão do quiz.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const status = useQuery({
    queryKey: ["dashboard-status"],
    queryFn: () => getDashboardStatus(),
  });

  if (status.isLoading) {
    return <div className="grid min-h-screen place-items-center text-muted-foreground">Carregando…</div>;
  }

  return status.data?.unlocked ? <Analytics /> : <Gate />;
}

function Gate() {
  const unlock = useServerFn(unlockDashboard);
  const qc = useQueryClient();
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(false);
    const res = await unlock({ data: { password } });
    setBusy(false);
    if (res.ok) {
      await qc.invalidateQueries({ queryKey: ["dashboard-status"] });
    } else {
      setError(true);
      setPassword("");
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-muted px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-sm"
      >
        <h1 className="text-2xl font-extrabold tracking-tight">Painel do quiz</h1>
        <p className="mt-2 text-sm text-muted-foreground">Área restrita. Informe a senha.</p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          placeholder="Senha"
          className="mt-6 w-full rounded-lg border border-input bg-background px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring"
        />
        {error && <p className="mt-2 text-sm text-destructive">Senha incorreta.</p>}
        <button
          type="submit"
          disabled={busy || !password}
          className="mt-4 w-full rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-opacity disabled:opacity-40"
        >
          {busy ? "Verificando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}

function pct(part: number, total: number) {
  if (!total) return "0%";
  return Math.round((part / total) * 100) + "%";
}

function brl(n: number) {
  return "R$ " + n.toLocaleString("pt-BR");
}

function Analytics() {
  const [days, setDays] = useState(30);
  const qc = useQueryClient();
  const lock = useServerFn(lockDashboard);
  const fetchAnalytics = useServerFn(getQuizAnalytics);

  const { data, isLoading, error } = useQuery({
    queryKey: ["quiz-analytics", days],
    queryFn: () => fetchAnalytics({ data: { days } }),
  });

  return (
    <div className="min-h-screen bg-muted">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">Painel do quiz · Airbnb</h1>
            <p className="text-sm text-muted-foreground">Respostas e conversão do /quiz-airbnb</p>
          </div>
          <div className="flex items-center gap-2">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                  d === days
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {d}d
              </button>
            ))}
            <button
              onClick={async () => {
                await lock();
                await qc.invalidateQueries({ queryKey: ["dashboard-status"] });
              }}
              className="rounded-full border border-border px-3 py-1.5 text-sm font-semibold"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-6">
        {isLoading && <p className="text-muted-foreground">Carregando métricas…</p>}
        {error && <p className="text-destructive">Não foi possível carregar os dados.</p>}
        {data && (
          <div className="space-y-6">
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Visitas" value={data.totals.visits} />
              <Stat
                label="Iniciaram o quiz"
                value={data.totals.starts}
                hint={pct(data.totals.starts, data.totals.visits) + " das visitas"}
              />
              <Stat
                label="Concluíram"
                value={data.totals.completions}
                hint={pct(data.totals.completions, data.totals.visits) + " das visitas"}
              />
              <Stat
                label="Cliques no WhatsApp"
                value={data.totals.whatsapp}
                hint={pct(data.totals.whatsapp, data.totals.completions) + " de quem concluiu"}
              />
            </section>

            <section className="grid gap-3 sm:grid-cols-2">
              <Stat
                label="Orçamento médio informado"
                value={data.totals.avgBudget ? brl(data.totals.avgBudget) : "—"}
              />
              <Stat
                label="Tempo médio até o resultado"
                value={
                  data.totals.avgSeconds
                    ? Math.floor(data.totals.avgSeconds / 60) +
                      "min " +
                      (data.totals.avgSeconds % 60) +
                      "s"
                    : "—"
                }
              />
            </section>

            <Panel title="Funil por etapa" subtitle="Visitantes únicos que chegaram em cada etapa">
              <div className="space-y-2">
                {data.funnel.map((f) => (
                  <Bar
                    key={f.step}
                    label={f.label}
                    count={f.count}
                    total={data.funnel[0]?.count || data.totals.visits}
                  />
                ))}
              </div>
            </Panel>

            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title="Quantidade de imóveis"><BarList items={data.qty} /></Panel>
              <Panel title="Objetivo principal"><BarList items={data.goal} /></Panel>
              <Panel title="Tipo de unidade"><BarList items={data.type} /></Panel>
              <Panel title="Estilo escolhido"><BarList items={data.look} /></Panel>
              <Panel title="Dores marcadas"><BarList items={data.pains} /></Panel>
              <Panel title="Faixa de orçamento"><BarList items={data.budgets} /></Panel>
            </div>

            <Panel title="Por dia" subtitle="Visitas e conclusões">
              <div className="flex items-end gap-1 overflow-x-auto pb-2">
                {data.daily.map((d) => {
                  const max = Math.max(...data.daily.map((x) => x.visits), 1);
                  return (
                    <div key={d.day} className="flex w-8 flex-none flex-col items-center gap-1">
                      <div className="flex h-28 w-full items-end gap-0.5">
                        <div
                          className="w-1/2 rounded-t bg-secondary"
                          style={{ height: `${(d.visits / max) * 100}%` }}
                          title={`${d.visits} visitas`}
                        />
                        <div
                          className="w-1/2 rounded-t bg-primary"
                          style={{ height: `${(d.completions / max) * 100}%` }}
                          title={`${d.completions} conclusões`}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{d.day.slice(5)}</span>
                    </div>
                  );
                })}
                {data.daily.length === 0 && (
                  <p className="text-sm text-muted-foreground">Sem dados no período.</p>
                )}
              </div>
            </Panel>

            <Panel title="Últimas respostas completas">
              {data.recent.length === 0 ? (
                <p className="text-sm text-muted-foreground">Ninguém concluiu o quiz ainda.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="py-2 pr-3">Quando</th>
                        <th className="py-2 pr-3">Imóveis</th>
                        <th className="py-2 pr-3">Objetivo</th>
                        <th className="py-2 pr-3">Tipo</th>
                        <th className="py-2 pr-3">m²</th>
                        <th className="py-2 pr-3">Orçamento</th>
                        <th className="py-2 pr-3">Estilo</th>
                        <th className="py-2">Dores</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recent.map((r, i) => (
                        <tr key={i} className="border-t border-border align-top">
                          <td className="py-2 pr-3 whitespace-nowrap text-muted-foreground">
                            {new Date(r.at).toLocaleString("pt-BR")}
                          </td>
                          <td className="py-2 pr-3">{r.qty}</td>
                          <td className="py-2 pr-3">{r.goal}</td>
                          <td className="py-2 pr-3">{r.type}</td>
                          <td className="py-2 pr-3">{r.sizeM2 ?? "—"}</td>
                          <td className="py-2 pr-3">{r.budget ? brl(r.budget) : "A definir"}</td>
                          <td className="py-2 pr-3">{r.look}</td>
                          <td className="py-2">{r.pains.join(" · ") || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-extrabold tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-base font-extrabold tracking-tight">{title}</h2>
      {subtitle && <p className="mb-3 text-xs text-muted-foreground">{subtitle}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Bar({ label, count, total }: { label: string; count: number; total: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {count} · {pct(count, total)}
        </span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: total ? `${(count / total) * 100}%` : "0%" }}
        />
      </div>
    </div>
  );
}

function BarList({ items }: { items: { value: string; label: string; count: number }[] }) {
  const total = items.reduce((a, b) => a + b.count, 0);
  if (!items.length) return <p className="text-sm text-muted-foreground">Sem dados ainda.</p>;
  return (
    <div className="space-y-2">
      {items.map((i) => (
        <Bar key={i.value} label={i.label} count={i.count} total={total} />
      ))}
    </div>
  );
}
