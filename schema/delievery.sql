CREATE TABLE delivery_challans (
    id BIGSERIAL PRIMARY KEY,
    challan_no VARCHAR(40) UNIQUE NOT NULL,
    -- sales_order_id BIGINT NOT NULL 
    -- REFERENCES sales_orders(id),
    challan_date TIMESTAMP NOT NULL 
    DEFAULT CURRENT_TIMESTAMP,
    billing_location TEXT NOT NULL,
    shipping_location TEXT NOT NULL,
    route TEXT,
    driver_name VARCHAR(150) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ISSUED'
    CHECK(status IN ('ISSUED','CANCELLED')),
    vehicle_no VARCHAR(40) NOT NULL,
    -- ADD CONSTRAINTS FOR VEHICLE NO
    total_rolls DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_qty_meter DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    customer_name VARCHAR(200) NOT NULL,
    gst_no VARCHAR(200) NOT NULL,
    tax_of_gst DECIMAL(12,2) NOT NULL DEFAULT 0,
    gst_rate DECIMAL(12,2) NOT NULL DEFAULT 0,
    amount_including_gst DECIMAL(12,2) NOT NULL DEFAULT 0,
    created_by BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
)