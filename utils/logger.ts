const isDev = import.meta.env.DEV;

export const debug = (...args: unknown[]) => {
  if (isDev) console.log(...args);
};
