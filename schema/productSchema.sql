CREATE TABLE product_master(
    id BIGSERIAL PRIMARY KEY,
    sku_code VARCHAR(50) UNIQUE NOT NULL,
    product_name VARCHAR (200) NOT NULL,
    division VARCHAR(30) NOT NULL,
    size VARCHAR(30) NOT NULL,
    color VARCHAR(30) ,
    rate DECIMAL(12,2) NOT NULL DEFAULT 0,
    basic_unit VARCHAR(40) NOT NULL DEFAULT 'METER',
    meter_per_roll DECIMAL(12,2),
    meter_per_kg DECIMAL(12,2) ,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    category VARCHAR(50),
    UNIQUE (product_name,division,size,color)
) 

