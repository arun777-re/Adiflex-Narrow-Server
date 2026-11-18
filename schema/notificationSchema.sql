CREATE TABLE notifications(
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(100) 
    REFERENCES users(user_id)
    ON DELETE CASCADE,
    role VARCHAR(100),
    division VARCHAR(100),
    type VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE INDEX idx_notifications_user_created
ON notifications(user_id,created_at DESC);

CREATE INDEX idx_notifications_unread
ON notifications(user_id,is_read)
WHERE is_read = FALSE;

CREATE INDEX idx_notifications_role_division
ON notifications(role,division,created_at DESC);