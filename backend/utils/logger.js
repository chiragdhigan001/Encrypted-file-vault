export const logger = {
  info(message, metadata = {}) {
    console.log(JSON.stringify({ level: "info", message, ...metadata, timestamp: new Date().toISOString() }));
  },
  error(message, metadata = {}) {
    console.error(JSON.stringify({ level: "error", message, ...metadata, timestamp: new Date().toISOString() }));
  }
};

export default logger;
