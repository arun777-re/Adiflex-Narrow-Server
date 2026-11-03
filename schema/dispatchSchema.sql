CREATE TABLE dispatch_details (

    id BIGSERIAL PRIMARY KEY,

    so_no VARCHAR(50) NOT NULL,

    sku_code VARCHAR(50) NOT NULL,

    cycle_id VARCHAR(100),

    product_name VARCHAR(200) NOT NULL,

    customer_name VARCHAR(200) NOT NULL,

    driver_name VARCHAR(100),

    vehicle_no VARCHAR(50),

    party_po_no VARCHAR(50),

    route VARCHAR(100),

    division VARCHAR(30) NOT NULL,

    production_qty DECIMAL(12,2) DEFAULT 0,

    order_qty DECIMAL(12,2) DEFAULT 0,

    rate DECIMAL(12,2) DEFAULT 0,

    shipping_location TEXT NOT NULL,

    billing_location TEXT,

    freight_charges BOOLEAN DEFAULT FALSE,

    freight_amount DECIMAL(12,2) DEFAULT 0,

    already_dispatched_qty DECIMAL(12,2) DEFAULT 0,

    current_dispatch_qty DECIMAL(12,2) DEFAULT 0,

    available_qty DECIMAL(12,2) DEFAULT 0,

    status VARCHAR(50) DEFAULT 'Pending',

    boxes_cartridge INTEGER DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);