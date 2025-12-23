import { API_BASE } from '@/config/apiConfig';

type LoginPayload = {
    user_name: string;
    user_password: string;
};

type LoginSuccess = {
    token: string;
    user_name: string;
};

type LoginError = {
    error: string;
    message?: string;
};

export async function loginRequest(
  payload: LoginPayload
): Promise<LoginSuccess | LoginError> {
    const resp = await fetch(`${API_BASE}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
            type: 'login',
            user_name: payload.user_name,
            user_password: payload.user_password,
        }),
    });

  if (!resp.ok) {
    throw new Error(`HTTP error ${resp.status}`);
  }

  return resp.json();
}

export async function verifyRequest() {
    const resp = await fetch(`${API_BASE}/auth/verify-token`, {
        method: 'GET',
        credentials: 'include',
    });

  if (!resp.ok) {
    throw new Error(`HTTP error ${resp.status}`);
  }

  return resp.json() as Promise<{ loggedIn: boolean }>;
}
