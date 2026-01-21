/** Environment mode: 'development' or 'production'. */
export const MODE = import.meta.env.MODE;

/** Base URL for API requests, varying by environment. */
export const API_BASE =
  MODE === 'development'
    ? import.meta.env.VITE_DEV_API_URL
    : import.meta.env.VITE_PROD_API_URL;
