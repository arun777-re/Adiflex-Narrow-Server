const cache = new Map();

const DEFAULT_CACHE_TTL = 12 * 60 * 60 * 1000;

export const setCache = (
  key,
  data,
  ttl = DEFAULT_CACHE_TTL
) => {
  console.log("💾 SET CACHE:", key);
  console.log("📦 CACHE SIZE BEFORE:", cache.size);

  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
  });

  console.log("📦 CACHE SIZE AFTER:", cache.size);
  console.log("🔑 CACHE KEYS:", [...cache.keys()]);
};

export const getFromCache = (key) => {
  console.log("🔍 GET CACHE:", key);
  console.log("📦 CURRENT CACHE SIZE:", cache.size);
  console.log("🔑 CURRENT CACHE KEYS:", [...cache.keys()]);

  const cached = cache.get(key);

  if (!cached) {
    console.log("❌ CACHE NOT FOUND:", key);
    return null;
  }

  if (Date.now() - cached.timestamp < cached.ttl) {
    console.log("✅ CACHE VALID:", key);
    return cached.data;
  }

  console.log("⏰ CACHE EXPIRED:", key);

  cache.delete(key);

  return null;
};

export const clearCache = (key) => {
  console.log("🧹 CLEAR CACHE:", key);
  cache.delete(key);
};