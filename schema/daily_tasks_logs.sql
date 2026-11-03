CREATE TABLE daily_tasks_logs (
    -- logs id
    id BIGSERIAL PRIMARY KEY,
    -- task id
    task_id BIGINT NOT NULL REFERENCES daily_tasks(id),
    task_type VARCHAR(50) NOT NULL,
    task_date DATE NOT NULL,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(task_id,task_date),
); 

CREATE UNIQUE INDEX unique_delegation_completion 
ON daily_tasks_logs(task_id)
WHERE task_type = 'delegation_task'
