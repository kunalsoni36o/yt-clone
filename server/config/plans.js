export const PLANS = {
  free: {
    name: "Free",
    priceInPaise: 0,
    downloadLimit: 1,
    premiumWatchSeconds: 300,
    adFree: false,
    premiumAccess: false,
    badges: false,
  },
  bronze: {
    name: "Bronze",
    priceInPaise: 9900,
    downloadLimit: 5,
    premiumWatchSeconds: Infinity,
    adFree: true,
    premiumAccess: true,
    badges: false,
  },
  silver: {
    name: "Silver",
    priceInPaise: 19900,
    downloadLimit: 10,
    premiumWatchSeconds: Infinity,
    adFree: true,
    premiumAccess: true,
    badges: true,
  },
  gold: {
    name: "Gold",
    priceInPaise: 39900,
    downloadLimit: Infinity,
    premiumWatchSeconds: Infinity,
    adFree: true,
    premiumAccess: true,
    badges: true,
  },
};

export const ALLOWED_PLANS = Object.keys(PLANS);
export const PAID_PLANS = ["bronze", "silver", "gold"];

export const getPlanConfig = (plan) => {
  const key = (plan || "free").toLowerCase();
  if (key === "unlimited") return PLANS.gold;
  return PLANS[key] || PLANS.free;
};

export const serializePlanConfig = (planConfig) => ({
  downloadLimit:
    planConfig.downloadLimit === Infinity ? "unlimited" : planConfig.downloadLimit,
  premiumWatchSeconds:
    planConfig.premiumWatchSeconds === Infinity
      ? "unlimited"
      : planConfig.premiumWatchSeconds,
  adFree: planConfig.adFree,
  premiumAccess: planConfig.premiumAccess,
  badges: planConfig.badges,
});

export const getDownloadLimit = (plan) => getPlanConfig(plan).downloadLimit;
