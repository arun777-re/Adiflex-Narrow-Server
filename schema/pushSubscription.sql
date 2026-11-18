CREATE TABLE push_subscriptions (
    id BIGSERIAL PRIMARY KEY,
    subscription_id VARCHAR(100) NOT NULL UNIQUE,
    user_id VARCHAR(100) REFERENCES users(user_id) ON DELETE CASCADE,
    user_name VARCHAR(150) ,
    role VARCHAR(100) NOT NULL,
    division VARCHAR(100) NOT NULL,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    device_name VARCHAR(150) DEFAULT 'UNKNOWN DEVICE',
    ip_address VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE','INACTIVE'))
);

CREATE INDEX    idx_push_user_status
ON push_subscriptions(user_id,status);

CREATE INDEX idx_push_role_division
ON push_subscriptions(role,division,status);