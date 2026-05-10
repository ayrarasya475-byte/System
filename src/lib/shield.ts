export const sanitize = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, " [XSS_BLOCKED] ")
    .replace(/on\w+="[^"]*"/gim, " [XSS_EVENT_BLOCKED] ")
    .replace(/javascript:/gim, " [JS_SCHEME_BLOCKED] ")
    // Prevent common SQLi patterns (NoSQL context but still good practice for prompt safety)
    .replace(/UNION\s+SELECT/gim, " [SQLI_BLOCKED] ")
    .replace(/OR\s+1=1/gim, " [SQLI_BLOCKED] ");
};

export const antiDdos = {
  getIp: async () => {
    try {
      const res = await fetch('https://api.ipify.org?format=json').catch(() => null);
      const data = res ? await res.json() : null;
      return data?.ip || '0.0.0.0';
    } catch (e) {
      return '0.0.0.0';
    }
  }
};
