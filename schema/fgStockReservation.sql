    CREATE TABLE fg_stock_reservations(
        id BIGSERIAL PRIMARY KEY,
 -- SALES ITEM REFERENCE
    sales_item_id BIGINT NOT NULL
    REFERENCES sales_items(id),

-- FINISHED GOODS REFERENCE 
    finished_goods_id BIGINT NOT NULL 
    REFERENCES finished_goods(id),

-- RESERVED QTY MUST BE POSITIVE 
    reserved_qty_meter DECIMAL(12,2) NOT NULL
    CHECK (reserved_qty_meter > 0),

-- ordered sales item qty 
    requested_qty_meter DECIMAL(12,2) NOT NULL
    CHECK (requested_qty_meter > 0)

-- QUANTITY DISPATCHED FROM RESERVATION
    dispatched_qty_meter DECIMAL(12,2) NOT NULL DEFAULT 0
    CHECK (dispatched_qty_meter >= 0),

--     remaining dispatch qty = reserved_qty_meter - dispatched_qty_meter
remaining_reserved_qty_meter DECIMAL(12,2) NOT NULL DEFAULT 0
CHECK(remaining_reserved_qty_meter >=0)
CHECK(remaining_reserved_qty_meter <= reserved_qty_meter)

-- status of the current reservation 
        status VARCHAR(25) NOT NULL DEFAULT 'RESERVED'
        CHECK (
            status IN (
                'RESERVED',
                'PARTIALLY_DISPATCHED',
                'DISPATCHED',
                'RELEASED'
            )
        ),
        reserved_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        released_qty_meter DECIMAL(12,2) NOT NULL DEFAULT 0
        CHECK (released_qty_meter >= 0)
-- dispatch cannot greater than reserved qty
        CHECK (dispatched_qty_meter + released_qty_meter <= reserved_qty_meter)
    );

    CREATE INDEX idx_fg_reservations_sales_item
    ON fg_stock_reservations(sales_item_id);

    CREATE INDEX idx_fg_reservations_finished_goods_status
    ON fg_stock_reservations(finished_goods_id,status);

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