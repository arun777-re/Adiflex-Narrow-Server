
import pool from '../config/postgresDB.js'
// =====================================================
// GET ALL PUSH SUBSCRIPTIONS
// =====================================================

export const getPushSubscriptions = async () => {
  const result = await pool.query(`
    SELECT
      id,
      subscription_id,
      user_id,
      user_name,
      role,
      division,
      endpoint,
      p256dh,
      auth,
      device_name,
      ip_address,
      created_at,
      updated_at,
      status
    FROM push_subscriptions
    ORDER BY id DESC
  `);

  return result.rows;
};

// =====================================================
// FIND USER
// =====================================================

export const findUserById = async (userId) => {
  const result = await pool.query(
    `
      SELECT
        id,
        user_id,
        name,
        role,
        division,
        is_active
      FROM users
      WHERE LOWER(TRIM(user_id)) = LOWER(TRIM($1))
      LIMIT 1
    `,
    [userId]
  );

  if (!result.rows.length) {
    return null;
  }

  const user = result.rows[0];

  return {
    row: user,
    userId: user.user_id,
    name: user.name,
    role: user.role,
    division: user.division,
    status: user.is_active ? "ACTIVE" : "INACTIVE",
  };
};

// =====================================================
// FIND SUBSCRIPTION BY ENDPOINT
// =====================================================

export const findSubscriptionByEndpoint = async (endpoint) => {
  const result = await pool.query(
    `
      SELECT *
      FROM push_subscriptions
      WHERE endpoint = $1
      LIMIT 1
    `,
    [endpoint]
  );

  return result.rows[0] || null;
};

// =====================================================
// GET SUBSCRIPTIONS FOR USER
// =====================================================

export const getUserPushSubscriptions = async (userId) => {
  const result = await pool.query(
    `
      SELECT *
      FROM push_subscriptions
      WHERE LOWER(TRIM(user_id)) = LOWER(TRIM($1))
        AND UPPER(status) = 'ACTIVE'
        AND endpoint IS NOT NULL
        AND p256dh IS NOT NULL
        AND auth IS NOT NULL
        AND endpoint <> ''
        AND p256dh <> ''
        AND auth <> ''
      ORDER BY id DESC
    `,
    [userId]
  );

  return result.rows;
};

// =====================================================
// GET SUBSCRIPTIONS FOR ROLE + DIVISION
// =====================================================

export const getSubscriptionsForNotification = async ({
  role,
  division,
}) => {
  const result = await pool.query(
    `
      SELECT *
      FROM push_subscriptions
      WHERE LOWER(TRIM(role)) = LOWER(TRIM($1))
        AND UPPER(status) = 'ACTIVE'
        AND (
          LOWER(TRIM(division)) = 'all'
          OR LOWER(TRIM(division)) = LOWER(TRIM($2))
        )
      ORDER BY id DESC
    `,
    [role, division]
  );

  return result.rows;
};
