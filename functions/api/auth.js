const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";

export async function onRequestGet({ request, env }) {
  const clientId = env.GITHUB_OAUTH_CLIENT_ID || env.GITHUB_CLIENT_ID;

  if (!clientId) {
    return jsonError("GitHub OAuth client id is not configured.", 500);
  }

  const requestUrl = new URL(request.url);
  const provider = requestUrl.searchParams.get("provider") || "github";

  if (provider !== "github") {
    return jsonError("Only GitHub OAuth is supported.", 400);
  }

  const origin = getOrigin(request, env);
  const redirectUri = `${origin}/api/callback`;
  const state = crypto.randomUUID();
  const scope = env.GITHUB_OAUTH_SCOPE || "public_repo";
  const authorizeUrl = new URL(GITHUB_AUTHORIZE_URL);

  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("scope", scope);
  authorizeUrl.searchParams.set("state", state);

  const headers = new Headers({
    Location: authorizeUrl.toString(),
    "Cache-Control": "no-store",
  });

  headers.append("Set-Cookie", serializeCookie("cms_oauth_state", state, origin));

  return new Response(null, {
    status: 302,
    headers,
  });
}

function getOrigin(request, env) {
  if (env.OAUTH_BASE_URL) {
    return env.OAUTH_BASE_URL.replace(/\/$/, "");
  }

  const url = new URL(request.url);
  return url.origin;
}

function serializeCookie(name, value, origin) {
  const secure = origin.startsWith("https://") ? "; Secure" : "";
  return `${name}=${encodeURIComponent(value)}; Path=/api; HttpOnly; SameSite=Lax; Max-Age=600${secure}`;
}

function jsonError(message, status) {
  return Response.json(
    { error: message },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
