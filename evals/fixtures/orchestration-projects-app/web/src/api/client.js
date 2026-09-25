// The session token identifies the user and their organization; the server
// scopes every response to that organization.
export async function api(path, { signal, method = 'GET', body } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    signal,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${sessionStorage.getItem('token')}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} failed with ${res.status}`);
  return res.status === 204 ? null : res.json();
}

// Decoded session: { userId, orgId, role }
export function currentSession() {
  const token = sessionStorage.getItem('token');
  if (!token) return null;
  return JSON.parse(atob(token.split('.')[1]));
}
