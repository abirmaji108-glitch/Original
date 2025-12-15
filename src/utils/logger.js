const isDev = process.env.NODE_ENV === 'development';

const logger = {
  log: (...args) => {
    if (isDev) console.log(...args);
  },
  
  error: (...args) => {
    console.error(...args);
  },
  
  warn: (...args) => {
    if (isDev) console.warn(...args);
  },
  
  debug: (...args) => {
    if (isDev) console.debug(...args);
  },
};

export default logger;
