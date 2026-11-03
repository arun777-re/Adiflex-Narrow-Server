export const calculateRemainingQuantity = (targetQty, allocatedQty) =>
  Math.max(0, Number(targetQty || 0) - Number(allocatedQty || 0));

export const calculateActualRemainingQuantity = (targetQty, actualQty) =>
  Math.max(0, Number(targetQty || 0) - Number(actualQty || 0));

export const getNextCycleId = (soNo, skuCode, cycleIds = []) => {
  const cycleNumbers = cycleIds
    .map((cycleId) => {
      const match = String(cycleId || "").match(/-C(\d+)$/i);
      return match ? Number(match[1]) : 0;
    })
    .filter(Number.isFinite);

  const nextNumber = Math.max(0, ...cycleNumbers) + 1;

  return `${soNo}-${skuCode}-C${nextNumber}`;
};

export const getUpdatedBy = (user) =>
  user.id || user.userId || user.user_id || null;