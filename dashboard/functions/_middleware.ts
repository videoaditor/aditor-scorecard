import { createGate } from "@videoaditor/auth/edge";

// The scorecard gate. The whole dashboard at score.aditor.ai is internal and
// leadership-only, so every path requires a signed-in internal viewer who holds
// scorecard.read - there is no public landing to leave open. Omitting
// protectedPaths/publicPaths means the gate protects everything except its own
// /auth/* routes, so the /api/scorecard proxy is gated too and only a signed-in
// viewer can reach the data source.
//
// Who may read is decided centrally by the scorecard.read policy in aditor-db
// (register_application for https://score.aditor.ai); this gate only enforces the
// token the provider issues.
//
// Secrets come from the Cloudflare Pages project, never the repo:
//   AUTH_CLIENT_SECRET - the raw scorecard-web client secret
//   AUTH_COOKIE_SECRET - a random key the gate uses to seal its cookies
// AUTH_SESSIONS is the KV namespace binding that holds gate sessions.
export const onRequest = createGate({
  issuer: "https://auth.aditor.ai",
  clientId: "scorecard-web",
  clientSecret: (env) => env.AUTH_CLIENT_SECRET as string,
  audience: "https://score.aditor.ai",
  kinds: ["internal"],
  permission: "scorecard.read",
  session: {
    kv: "AUTH_SESSIONS",
    secret: (env) => env.AUTH_COOKIE_SECRET as string,
  },
});
