const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_URL = "https://api.github.com/user";

export async function onRequestGet({ request, env }) {
  const clientId = env.GITHUB_OAUTH_CLIENT_ID || env.GITHUB_CLIENT_ID;
  const clientSecret = env.GITHUB_OAUTH_CLIENT_SECRET || env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return renderError("GitHub OAuth client id or secret is not configured.");
  }

  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const savedState = getCookie(request.headers.get("Cookie") || "", "cms_oauth_state");

  if (!code) {
    return renderError("GitHub did not return an authorization code.");
  }

  if (!state || !savedState || state !== savedState) {
    return renderError("OAuth state validation failed. Please try signing in again.");
  }

  const origin = getOrigin(request, env);
  const redirectUri = `${origin}/api/callback`;
  const tokenResponse = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "blog-gaojiefeng-decap-cms",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      state,
    }),
  });

  const tokenData = await tokenResponse.json();

  if (!tokenResponse.ok || tokenData.error || !tokenData.access_token) {
    return renderError(tokenData.error_description || tokenData.error || "GitHub token exchange failed.");
  }

  const accessToken = tokenData.access_token;
  let login = "";

  try {
    login = await getGitHubLogin(accessToken);
  } catch (error) {
    return renderError(error.message || "Could not verify GitHub user.");
  }

  if (!isAllowedUser(login, env.CMS_ALLOWED_GITHUB_USERS)) {
    return renderError(`GitHub user "${login}" is not allowed to edit this site.`);
  }

  return renderSuccess(accessToken);
}

function getOrigin(request, env) {
  if (env.OAUTH_BASE_URL) {
    return env.OAUTH_BASE_URL.replace(/\/$/, "");
  }

  const url = new URL(request.url);
  return url.origin;
}

function getCookie(cookieHeader, name) {
  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
  const prefix = `${name}=`;
  const cookie = cookies.find((item) => item.startsWith(prefix));

  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : "";
}

async function getGitHubLogin(token) {
  const response = await fetch(GITHUB_USER_URL, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "blog-gaojiefeng-decap-cms",
    },
  });

  if (!response.ok) {
    throw new Error("Could not verify GitHub user.");
  }

  const user = await response.json();
  return user.login || "";
}

function isAllowedUser(login, allowedUsers) {
  const users = (allowedUsers || "gaojiefengxswhuhit")
    .split(",")
    .map((user) => user.trim().toLowerCase())
    .filter(Boolean);

  return users.includes(login.toLowerCase());
}

function renderSuccess(token) {
  const payload = escapeScriptJson(
    JSON.stringify({
      token,
      provider: "github",
    }),
  );

  return htmlResponse(`<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <title>登录成功</title>
  </head>
  <body>
    <p>登录成功，正在返回博客后台...</p>
    <script>
      const payload = ${payload};
      const receiveMessage = (message) => {
        window.opener.postMessage(
          "authorization:github:success:" + JSON.stringify(payload),
          message.origin
        );
        window.removeEventListener("message", receiveMessage, false);
        window.close();
      };

      window.addEventListener("message", receiveMessage, false);
      window.opener.postMessage("authorizing:github", "*");
    </script>
  </body>
</html>`);
}

function renderError(message) {
  const payload = escapeScriptJson(
    JSON.stringify({
      error: message,
      provider: "github",
    }),
  );

  return htmlResponse(`<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <title>登录失败</title>
  </head>
  <body>
    <p>登录失败：${escapeHtml(message)}</p>
    <script>
      const payload = ${payload};

      if (window.opener) {
        window.opener.postMessage(
          "authorization:github:error:" + JSON.stringify(payload),
          "*"
        );
      }
    </script>
  </body>
</html>`, 400);
}

function htmlResponse(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Set-Cookie": "cms_oauth_state=; Path=/api; HttpOnly; SameSite=Lax; Max-Age=0",
    },
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeScriptJson(value) {
  return value
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}
