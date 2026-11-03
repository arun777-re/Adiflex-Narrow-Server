CREATE TABLE production_stage_runs (
    id BIGSERIAL PRIMARY KEY,
-- foreign key for production process id
    production_process_id BIGINT NOT NULL
        REFERENCES production_master(id),
-- code of the stage   
 stage_code VARCHAR(30) NOT NULL
        CHECK (stage_code IN (
            'JOB_WORK',
            'WARPING',
            'FILLING',
            'MACHINE',
            'FINISHING',
            'QUALITY',
            'ROLLING',
            'PACKING'
        )),
    -- this is only useful when process starts means how much qty is selected for the cycle
    input_qty DECIMAL(12,2) NOT NULL DEFAULT 0,
    -- donot need this 
    processed_qty DECIMAL(12,2) NOT NULL DEFAULT 0,
    -- how much is accepted qty after machine by all processes
    accepted_qty DECIMAL(12,2) NOT NULL DEFAULT 0,
    -- this is the remaining qty of the stage accepted_qty - released_qty
    remaining_qty DECIMAL(12,2) NOT NULL DEFAULT 0,
    -- wastage count 
    wastage_qty DECIMAL(12,2) NOT NULL DEFAULT 0,
    -- released qty
    released_qty DECIMAL(12,2) NOT NULL DEFAULT 0,
-- status of the cycle
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN (
            'PENDING',
            'IN_PROGRESS',
            'PARTIALLY_RELEASED',
            'COMPLETED',
            'CANCELLED'
        )),
    assigned_to VARCHAR(100),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    -- actual qty of the cycle at packing completion = production_master.total_production_qty
    actual_qty_at_packing DECIMAL(12,2) NOT NULL DEFAULT 0,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- input_qty - accepted_qty
    pending_input_qty DECIMAL(12,2) NOT NULL DEFAULT 0,
    UNIQUE (production_process_id, stage_code),
    CHECK (input_qty >= 0),
    CHECK (processed_qty >= 0),
    CHECK (accepted_qty >= 0),
    CHECK (wastage_qty >= 0),
    CHECK (released_qty >= 0),
    CHECK (actual_qty_at_packing >= 0),
    CHECK (pending_input_qty >= 0)
);

-- indexes to find out 
CREATE INDEX idx_stage_runs_process_status
    ON production_stage_runs (production_process_id, status);
CREATE INDEX idx_stage_runs_status
    ON production_stage_runs (status);