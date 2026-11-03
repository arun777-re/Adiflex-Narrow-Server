CREATE TABLE sales_items (
    id BIGSERIAL PRIMARY KEY,
    sales_order_id BIGINT REFERENCES sales_orders(id) ON DELETE CASCADE,
    sku_code VARCHAR(50) NOT NULL,
    item_name VARCHAR(200),
    division VARCHAR(30),
    item_unit VARCHAR(30),
    item_qty DECIMAL(12,2),
    item_qty_meter DECIMAL(12,2),
    item_rate DECIMAL(12,2),
    rate_adjustment DECIMAL(12,2),
    final_rate DECIMAL(12,2),
    -- total amount of sales order item 
    item_amount DECIMAL(14,2),
    -- available fg qty
    opening_fg_qty DECIMAL(12,2) DEFAULT 0,
    -- qty to be manufactured
    production_qty DECIMAL(12,2) DEFAULT 0,
    -- manufactured qty till now
    manufactured_qty DECIMAL(12,2) DEFAULT 0,
    -- dispatched qty till now
    dispatched_qty DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)