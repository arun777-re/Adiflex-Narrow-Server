// analytics.utils.js

export const PERIODS = {
  WEEK: "week",
  MONTH: "month",
  YEAR: "year",
};

export const normalizeDivision = (division) => {
  if (!division) return "ALL";

  return String(division).trim().toUpperCase();
};

export const normalizeStatus = (status) => {
  return String(status || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
};

export const isCompletedStatus = (status) => {
  const normalized = normalizeStatus(status);

  return [
    "completed",
    "complete",
    "closed",
    "delivered",
  ].includes(normalized);
};

export const parseDate = (value) => {
  if (!value) return null;

  // Already Date object
  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? null
      : value;
  }

  const str = String(value).trim();

  // ==========================================
  // DD/MM/YYYY
  // ==========================================

  const ddmmyyyy = str.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
  );

  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;

    const date = new Date(
      Number(year),
      Number(month) - 1,
      Number(day)
    );

    // Validate
    if (
      date.getFullYear() === Number(year) &&
      date.getMonth() === Number(month) - 1 &&
      date.getDate() === Number(day)
    ) {
      return date;
    }

    return null;
  }

  // ==========================================
  // YYYY-MM-DD
  // ==========================================

  const yyyymmdd = str.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/
  );

  if (yyyymmdd) {
    const [, year, month, day] = yyyymmdd;

    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day)
    );
  }

  return null;
};

export const parseNumber = (value) => {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const number = Number(
    String(value)
      .replace(/,/g, "")
      .replace(/[₹$]/g, "")
      .trim()
  );

  return Number.isFinite(number) ? number : 0;
};

export const isDateInPeriod = (
  dateValue,
  period
) => {
  // ALL = no date filtering
  if (String(period).toLowerCase() === "all") {
    return true;
  }

  const date = parseDate(dateValue);

  if (!date) {
    console.log(
      "❌ INVALID DATE:",
      dateValue
    );

    return false;
  }

  const now = new Date();

  // ==========================================
  // WEEK
  // ==========================================

  if (period === "week") {
    const startOfWeek = new Date(now);

    const day = startOfWeek.getDay();

    const diff = day === 0 ? 6 : day - 1;

    startOfWeek.setDate(
      startOfWeek.getDate() - diff
    );

    startOfWeek.setHours(0, 0, 0, 0);

    now.setHours(23, 59, 59, 999);

    return (
      date >= startOfWeek &&
      date <= now
    );
  }

  // ==========================================
  // YEAR
  // ==========================================

  if (period === "year") {
    const startOfYear = new Date(
      now.getFullYear(),
      0,
      1
    );

    startOfYear.setHours(0, 0, 0, 0);

    now.setHours(23, 59, 59, 999);

    return (
      date >= startOfYear &&
      date <= now
    );
  }

  // ==========================================
  // MONTH
  // ==========================================

  const startOfMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  );

  startOfMonth.setHours(0, 0, 0, 0);

  now.setHours(23, 59, 59, 999);

  return (
    date >= startOfMonth &&
    date <= now
  );
};