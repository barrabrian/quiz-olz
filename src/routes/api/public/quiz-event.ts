import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const EventSchema = z.object({
  session_id: z.string().min(1).max(64),
  event: z.string().min(1).max(40),
  step: z.string().max(40).nullable().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export const Route = createFileRoute("/api/public/quiz-event")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let parsed;
        try {
          parsed = EventSchema.parse(await request.json());
        } catch {
          return new Response(JSON.stringify({ ok: false }), {
            status: 400,
            headers: { "content-type": "application/json" },
          });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin.from("quiz_events").insert({
          session_id: parsed.session_id,
          event: parsed.event,
          step: parsed.step ?? null,
          payload: (parsed.payload ?? {}) as never,
        });

        if (error) {
          console.error("quiz-event insert failed", error);
          return new Response(JSON.stringify({ ok: false }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ ok: true }), {
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
