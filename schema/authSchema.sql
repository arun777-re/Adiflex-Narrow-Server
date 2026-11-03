CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(150) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) NOT NULL,
    division VARCHAR(30) NOT NULL DEFAULT "all",
    department VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_role
ON users(role);

CREATE INDEX idx_users_division 
ON users(division);

CREATE INDEX idx_users_id
ON users(user_id);
