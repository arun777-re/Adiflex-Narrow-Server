CREATE TABLE daily_tasks (
    -- task id
    id BIGSERIAL PRIMARY KEY,
    -- user id of the user assigned to the task
    user_id varchar(50) NOT NULL REFERENCES users(user_id),
    -- description of the task
    description VARCHAR(500) NOT NULL,
    -- department of the user
    department VARCHAR(100) NOT NULL,
    -- two types of task daily_task and delegation_task
    task_type VARCHAR(50) NOT NULL,
    start_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    due_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    effective_due_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK(task_type = 'daily_task' OR due_date IS NOT NULL),
    CHECK(due_date IS NULL OR due_date >= start_date)
);