import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Forma Stay — Design de interiores para Airbnb" },
      {
        name: "description",
        content:
          "Projeto de interiores pensado para anúncios de temporada: fotos que vendem, diária maior e reviews melhores.",
      },
      { property: "og:title", content: "Forma Stay — Design de interiores para Airbnb" },
      {
        property: "og:description",
        content: "Faça o quiz e descubra o caminho de design ideal para o seu anúncio.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-6">
      <div className="max-w-xl text-center">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-muted-foreground">
          Forma Stay
        </p>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
          Seu Airbnb rende mais com projeto de interiores
        </h1>
        <p className="mt-4 text-muted-foreground">
          Responda 6 perguntas rápidas e veja o recorte de projeto que faz sentido para a sua
          unidade.
        </p>
        <Link
          to="/quiz-airbnb"
          className="mt-8 inline-flex items-center justify-center rounded-lg bg-primary px-6 py-4 text-sm font-bold text-primary-foreground"
        >
          Fazer o quiz
        </Link>
      </div>
    </div>
  );
}
