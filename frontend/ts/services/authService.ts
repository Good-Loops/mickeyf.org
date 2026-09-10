/** Configured auth requests; UI/context callers own state and alerts. */
import { API_BASE } from '@/config/apiConfig';
import { createAuthApi } from './authApi.ts';

export const {
    loginRequest,
    signupRequest,
    verifyRequest,
    logoutRequest,
} = createAuthApi(API_BASE);
