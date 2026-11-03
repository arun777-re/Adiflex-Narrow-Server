CREATE TABLE production_master (
    id BIGSERIAL PRIMARY KEY,
    sales_order_id BIGINT NOT NULL
    REFERENCES sales_orders(id),
    so_no VARCHAR(100) NOT NULL,
    cycle_id VARCHAR(100) NOT NULL,
    sku_code VARCHAR(60) NOT NULL,
    product_name VARCHAR(120) NOT NULL,
    -- so_qty - available_in_stock
    production_target_qty DECIMAL(12,2) NOT NULL DEFAULT 0,
    division VARCHAR(20) NOT NULL,
    -- PENDING , PARTIALLY_COMPLETED, IN_PROGRESS,COMPLETED/CYCLE_COMPLETED
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    commited_date DATE ,
    customer VARCHAR(200) NOT NULL,
    order_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- this is the total production_qty for this order at packing 
    total_production_qty DECIMAL(12,2) DEFAULT 0,
    -- THIS IS THE actual_stage_production_qty - total_production_qty
    cycle_remaining_production_qty DECIMAL(12,2) DEFAULT 0,
    -- this is the production_target_qty - sum of all stages actual_stage_production_qty
    -- actual_remaining_production_qty DECIMAL(12,2) DEFAULT 0,
    -- total sales order qty
    so_qty DECIMAL(12,2) NOT NULL DEFAULT 0,
    CHECK (so_qty >= 0),
    -- quantity takes from the fg
    available_in_stock DECIMAL(12,2) NOT NULL DEFAULT 0,
    CHECK (available_in_stock >=0),
    -- final total qty assigned to this stage  this is equal to the production_stage_runs.input_qty
    actual_cycle_production_qty DECIMAL(12,2) NOT NULL DEFAULT 0,
       CHECK (actual_cycle_production_qty >=0),
    -- total qty assigned to this stage at first time (this will hit if partial selection) avilable qty before selection actual_cycle_production_qty
    first_time_production_qty DECIMAL(12,2) NOT NULL DEFAULT 0,
       CHECK (first_time_production_qty >=0),
    UNIQUE(so_no,cycle_id)
);


CREATE INDEX idx_production_master_so_no 
ON production_master(so_no);

CREATE INDEX idx_production_master_status
ON production_master(status);
