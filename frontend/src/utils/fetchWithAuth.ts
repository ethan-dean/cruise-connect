import getBackendUrl from "./getBackendUrl";

async function refreshAccessToken() {
  const response = await fetch(`${getBackendUrl()}/api/v1/users/refresh-token`, {
    method: 'POST',
    credentials: 'include',
  });
  if (response.ok) {
    const data = await response.json();
    localStorage.setItem('accessToken', data.accessToken);
    return null;
  } else {
    const data = await response.json();
    return data.error;
  }
}

export default async function fetchWithAuth(url: string, options: any ) {
  let response = null;

  const accessToken = localStorage.getItem('accessToken') || '';
  response = await fetch(url, {
    ...options,
    headers: { ...options?.headers, Authorization: `Bearer ${accessToken}` },
  });

  // 401 Unauthorized and 403 Forbidden errors on auth endpoints come from failed token authentication only
  if (response.status === 401 || response.status === 403) {
    const error = await refreshAccessToken();
    if (error) {
      return error;
    }
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      return 'TOKEN_REFRESH_ERROR';
    }

    response = await fetch(url, {
      ...options,
      headers: { ...options?.headers, Authorization: `Bearer ${accessToken}` },
    });
  }

  return response;
}
