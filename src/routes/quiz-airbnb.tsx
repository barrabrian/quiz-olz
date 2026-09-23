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
    ],
  }),
  component: QuizPage,
});

function QuizPage() {
  return (
    <iframe
      src="/quiz-airbnb.html"
      title="Quiz Design para Airbnb"
      className="h-screen w-full border-0"
    />
  );
}
