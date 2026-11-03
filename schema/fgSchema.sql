CREATE TABLE finished_goods(
    id BIGSERIAL PRIMARY KEY,
    -- PRODUCT REFERENCE
    product_id BIGINT NOT NULL REFERENCES product_master(id),
    sku_code VARCHAR(50) UNIQUE NOT NULL,
    product_name VARCHAR(200) NOT NULL,
    division VARCHAR(30) NOT NULL,
    -- current fg stock
    available_qty_meter DECIMAL(12,2) DEFAULT 0
    CHECK (available_qty_meter >= 0),
    -- stock control
    reserved_qty_meter DECIMAL(12,2) DEFAULT 0
     CHECK (reserved_qty_meter >= 0),
     remaining_reserved_qty_meter DECIMAL(12,2) DEFAULT 0
     CHECK (remaining_reserved_qty_meter > 0)
    dispatched_qty_meter DECIMAL(12,2) DEFAULT 0
     CHECK(dispatched_qty_meter >= 0),
    -- audit 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (division,product_name)
)