CREATE TABLE sales_orders ( 
    id BIGSERIAL PRIMARY KEY, 
    so_no VARCHAR(50) NOT NULL, 
    order_date DATE, 
    customer VARCHAR(200), 
    order_type VARCHAR(30), 
    route VARCHAR(100), 
    party_po VARCHAR(100), 
    order_received_by VARCHAR(100), 
    overall_status VARCHAR(60) ,
    billing_location TEXT, 
    shipping_location TEXT, 
    total_items INTEGER DEFAULT 1,
    total_order_qty_meter DECIMAL(14,2) DEFAULT 0,
    -- total manufactured qty till now
    total_manufactured_qty DECIMAL(14,2) DEFAULT 0,
    -- total dispatched qty till now
    total_dispatched_qty DECIMAL(14,2) DEFAULT 0,
    order_amount DECIMAL(14,2), 
    committed_date DATE, 
    total_wastage_qty DECIMAL(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    gst_no VARCHAR(40)
);