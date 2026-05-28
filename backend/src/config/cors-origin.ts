export function resolveCorsOrigin(): boolean | string[] {
  const configuredOrigin = process.env.CORS_ORIGIN;

  if (configuredOrigin && configuredOrigin.trim().length > 0) {
    return configuredOrigin
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  return process.env.NODE_ENV === 'production' ? false : true;
}
