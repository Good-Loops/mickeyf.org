/** Auth HTTP transport, independent of React and environment configuration. */
type LoginPayload = {
    user_name: string;
    user_password: string;
};

type SignupPayload = LoginPayload & { email: string };
type AccountError = { error: string; message?: string; status?: number };
type LoginResponse = { success: true; user_name: string } | AccountError;
type SignupResponse = { success: true; error?: never } | AccountError;
type VerificationResponse =
    | { loggedIn: true; user_name: string }
    | { loggedIn: false };
type UserOperation =
    | ({ type: 'login' } & LoginPayload)
    | ({ type: 'signup' } & SignupPayload);

export function createAuthApi(apiBase: string, fetchRequest: typeof fetch = fetch) {
    async function postUserOperation(body: UserOperation): Promise<Response> {
        const response = await fetchRequest(`${apiBase}/api/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const separator = body.type === 'signup' ? ':' : '';
            throw new Error(`HTTP error${separator} ${response.status}`);
        }
        // This legacy endpoint returns normal validation errors inside HTTP 200.
        // Callers retain ownership of those alerts; HTTP failures still reject.
        return response;
    }

    async function loginRequest(payload: LoginPayload): Promise<LoginResponse> {
        const response = await postUserOperation({
            type: 'login',
            user_name: payload.user_name,
            user_password: payload.user_password,
        });
        return response.json();
    }

    async function signupRequest(payload: SignupPayload): Promise<SignupResponse> {
        const response = await postUserOperation({
            type: 'signup',
            user_name: payload.user_name,
            email: payload.email,
            user_password: payload.user_password,
        });
        return response.json();
    }

    async function verifyRequest(): Promise<VerificationResponse> {
        const response = await fetchRequest(`${apiBase}/auth/verify-token`, {
            method: 'GET',
            credentials: 'include',
        });
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }
        return response.json();
    }

    async function logoutRequest(): Promise<void> {
        // Preserve best-effort logout: the caller clears local state even when
        // the server returns a non-2xx status, and handles network rejection.
        await fetchRequest(`${apiBase}/auth/logout`, {
            method: 'POST',
            credentials: 'include',
        });
    }

    return { loginRequest, signupRequest, verifyRequest, logoutRequest };
}
