import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/quiz-airbnb")({
  head: () => ({
    meta: [
      { title: "Quiz · Design para Airbnb — Forma Stay" },
      {
        name: "description",
        content:
          "Responda 6 perguntas rápidas e descubra o caminho de design que faz seu anúncio no Airbnb render mais.",
      },
      { property: "og:title", content: "Quiz · Design para Airbnb — Forma Stay" },
      {
        property: "og:description",
        content:
          "Descubra em 1 minuto o estilo e o pacote de projeto ideais para o seu anúncio de temporada.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content" },
    ],
    links: [{ rel: "stylesheet", href: "/quiz-mobile.css" }],
    scripts: [{ src: "/quiz-fit.js" }],
  }),
  component: QuizPage,
});

function QuizPage() {
  return (
    <iframe
      src="/quiz-airbnb.html"
      title="Quiz Design para Airbnb"
      className="w-full border-0"
      style={{ height: "100svh", maxHeight: "100dvh" }}
    />
  );
}
