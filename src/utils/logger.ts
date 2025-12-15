const isDev = import.meta.env.MODE === 'development';

export const logger = {
  log: (...args: any[]) => {
    if (isDev) console.log(...args);
  },
  
  error: (...args: any[]) => {
    console.error(...args); // Always log errors
  },
  
  warn: (...args: any[]) => {
    if (isDev) console.warn(...args);
  },
  
  debug: (...args: any[]) => {
    if (isDev) console.debug(...args);
  },
};
