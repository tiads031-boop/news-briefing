export function info(msg: string) {
  console.log(`[${new Date().toISOString()}] ℹ️ ${msg}`);
}

export function success(msg: string) {
  console.log(`[${new Date().toISOString()}] ✅ ${msg}`);
}

export function warn(msg: string) {
  console.log(`[${new Date().toISOString()}] ⚠️ ${msg}`);
}

export function error(msg: string, err?: unknown) {
  console.error(`[${new Date().toISOString()}] ❌ ${msg}`, err);
}
