CREATE TABLE sales_orders (
    id BIGSERIAL PRIMARY KEY,

    so_no VARCHAR(50) NOT NULL,

    order_date DATE,

    sku_code VARCHAR(50) NOT NULL,

    customer VARCHAR(200),

    product_name VARCHAR(200),

    order_type VARCHAR(30),

    route VARCHAR(100),

    party_po VARCHAR(100),

    division VARCHAR(30),

    so_qty DECIMAL(12,2),

    unit VARCHAR(30),

    so_qty_meter DECIMAL(12,2),

    standard_rate DECIMAL(12,2),

    rate_adjustment DECIMAL(12,2),

    final_rate DECIMAL(12,2),

    opening_fg_qty DECIMAL(12,2) DEFAULT 0,

    production_qty DECIMAL(12,2) DEFAULT 0,

    job_work DECIMAL(12,2) DEFAULT 0,

    freight DECIMAL(12,2) DEFAULT 0,

    manufactured_qty DECIMAL(12,2) DEFAULT 0,

    dispatched_qty DECIMAL(12,2) DEFAULT 0,

    order_received_by VARCHAR(100),

    overall_status VARCHAR(50),

    billing_location TEXT,

    shipping_location TEXT,

    order_amount DECIMAL(14,2),

    committed_date DATE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);