import { Capacitor, registerPlugin } from '@capacitor/core';
import { createNativeApiFetch, type NativeApiRequest } from './nativeApiFetch.ts';

const nativeApi = registerPlugin<{ nativeRequest: NativeApiRequest }>('LudolumeApi');

/** One cookie store for auth and both games; browser/Android fetch is unchanged. */
export const apiFetch: typeof fetch = Capacitor.getPlatform() === 'ios'
    ? createNativeApiFetch((options) => nativeApi.nativeRequest(options))
    : (input, init) => fetch(input, init);
