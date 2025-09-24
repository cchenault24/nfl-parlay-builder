export const RUNTIME = {
  functionsBaseUrl:
    import.meta.env.VITE_FUNCTIONS_BASE_URL?.replace(/\/+$/, '') ?? '',
}
