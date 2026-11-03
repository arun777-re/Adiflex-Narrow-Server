CREATE TABLE delivery_challan_items (
    id BIGSERIAL PRIMARY KEY,
    challan_id BIGINT NOT NULL 
    REFERENCES delivery_challans(id),
    reservation_id BIGINT NOT NULL
    REFERENCES fg_stock_reservations(id),
    sales_item_id BIGINT NOT NULL
    REFERENCES sales_items(id),
    sku_code VARCHAR(50) NOT NULL,
    product_name VARCHAR(200) NOT NULL,
    dispatched_qty_meter DECIMAL(12,2) NOT NULL DEFAULT 0,
    meter_per_roll DECIMAL(12,2) NOT NULL DEFAULT 0,
    -- roll_qty = dispatched_qty_meter/meter_per_roll
    roll_qty DECIMAL(12,2) NOT NULL DEFAULT 0,
    -- rate per meter
    rate_per_meter DECIMAL(12,2) NOT NULL DEFAULT 0,
    -- amount = rate_per_meter * dispatched_qty_meter
    amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    CHECK(dispatched_qty_meter > 0),
    CHECK(meter_per_roll > 0),
    CHECK(roll_qty > 0),
    CHECK(rate_per_meter > 0),
    CHECK(amount > 0),
    UNIQUE (challan_id,reservation_id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_delivery_challans_challan_no
ON delivery_challans(challan_no);

CREATE INDEX idx_delivery_challan_items_challan_id
ON delivery_challan_items(challan_id);

CREATE INDEX idx_delivery_challan_items_reservation_id
ON delivery_challan_items(reservation_id);