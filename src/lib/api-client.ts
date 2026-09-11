const APP_KEY = process.env.NEXT_PUBLIC_APP_KEY;

export async function apiFetch(
  input: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);

  if (APP_KEY && !headers.has("x-app-key")) {
    headers.set("x-app-key", APP_KEY);
  }

  return fetch(input, {
    ...init,
    credentials: "include",
    mode: "same-origin",
    headers,
  });
}

export default apiFetch;
