export async function get(url) {
  const res = await fetch(`/api${url}`);
  return res.json();
}

export async function post(url, data) {
  const res = await fetch(`/api${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function deleteRequest(url) {
  const res = await fetch(`/api${url}`, { method: 'DELETE' });
  return res.json();
}
