\encoding UTF8

DROP SCHEMA IF EXISTS warehouse CASCADE;
CREATE SCHEMA warehouse;
SET search_path TO warehouse;

CREATE TABLE suppliers
(
    supplier_code varchar(20) PRIMARY KEY,
    supplier_name varchar(200) NOT NULL,
    inn varchar(12) NOT NULL UNIQUE,
    legal_postal_code varchar(10) NOT NULL,
    legal_city varchar(100) NOT NULL,
    legal_street varchar(120) NOT NULL,
    legal_house varchar(20) NOT NULL,
    bank_postal_code varchar(10) NOT NULL,
    bank_city varchar(100) NOT NULL,
    bank_street varchar(120) NOT NULL,
    bank_house varchar(20) NOT NULL,
    bank_account_number varchar(30) NOT NULL
);

CREATE TABLE materials
(
    material_code varchar(20) PRIMARY KEY,
    material_class_code varchar(20) NOT NULL,
    material_group_code varchar(20) NOT NULL,
    material_name varchar(200) NOT NULL,
    material_account varchar(30) NOT NULL
);

CREATE TABLE measurement_units
(
    material_code varchar(20) NOT NULL,
    unit_code varchar(20) NOT NULL,
    unit_name varchar(80) NOT NULL,
    PRIMARY KEY (material_code, unit_code),
    CONSTRAINT fk_measurement_units_materials
        FOREIGN KEY (material_code)
        REFERENCES materials(material_code)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

CREATE TABLE document_types
(
    document_type_code varchar(20) PRIMARY KEY,
    document_type_name varchar(120) NOT NULL
);

CREATE TABLE storage_units
(
    order_number integer PRIMARY KEY,
    order_date date NOT NULL,
    supplier_code varchar(20) NOT NULL,
    balance_account varchar(30) NOT NULL,
    document_type_code varchar(20) NOT NULL,
    document_number varchar(50) NOT NULL,
    material_code varchar(20) NOT NULL,
    material_account varchar(30) NOT NULL,
    unit_code varchar(20) NOT NULL,
    quantity numeric(18, 3) NOT NULL CHECK (quantity > 0),
    unit_price numeric(18, 2) NOT NULL CHECK (unit_price > 0),
    total_price numeric(18, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    CONSTRAINT fk_storage_units_suppliers
        FOREIGN KEY (supplier_code)
        REFERENCES suppliers(supplier_code)
        ON UPDATE CASCADE,
    CONSTRAINT fk_storage_units_document_types
        FOREIGN KEY (document_type_code)
        REFERENCES document_types(document_type_code)
        ON UPDATE CASCADE,
    CONSTRAINT fk_storage_units_materials
        FOREIGN KEY (material_code)
        REFERENCES materials(material_code)
        ON UPDATE CASCADE,
    CONSTRAINT fk_storage_units_measurement_units
        FOREIGN KEY (material_code, unit_code)
        REFERENCES measurement_units(material_code, unit_code)
);

INSERT INTO suppliers
    (supplier_code, supplier_name, inn, legal_postal_code, legal_city, legal_street, legal_house,
     bank_postal_code, bank_city, bank_street, bank_house, bank_account_number)
VALUES
    ('SUP-001', 'ООО МеталлСнаб', '7708123456', '125047', 'Москва', 'Лесная', '5',
     '101000', 'Москва', 'Мясницкая', '12', '40702810900000000001'),
    ('SUP-002', 'АО ПромКомплект', '7816123001', '190000', 'Санкт-Петербург', 'Садовая', '21',
     '101000', 'Москва', 'Мясницкая', '12', '40702810900000000002'),
    ('SUP-003', 'ИП Волкова Н.А.', '502900771802', '141008', 'Мытищи', 'Мира', '18',
     '141002', 'Мытищи', 'Новомытищинский', '31', '40802810400000000003');

INSERT INTO materials
    (material_code, material_class_code, material_group_code, material_name, material_account)
VALUES
    ('MAT-001', '10', '101', 'Лист стальной 2 мм', '10.01'),
    ('MAT-002', '20', '204', 'Краска акриловая белая', '10.06'),
    ('MAT-003', '30', '302', 'Кабель силовой ВВГнг', '10.05');

INSERT INTO measurement_units (material_code, unit_code, unit_name)
VALUES
    ('MAT-001', 'KG', 'килограммы'),
    ('MAT-001', 'PCS', 'штуки'),
    ('MAT-002', 'L', 'литры'),
    ('MAT-003', 'M', 'метры');

INSERT INTO document_types (document_type_code, document_type_name)
VALUES
    ('INV', 'Счет-фактура'),
    ('WAY', 'Товарная накладная'),
    ('ACT', 'Акт приемки');

INSERT INTO storage_units
    (order_number, order_date, supplier_code, balance_account, document_type_code, document_number,
     material_code, material_account, unit_code, quantity, unit_price)
VALUES
    (1001, '2026-04-08', 'SUP-001', '15', 'WAY', 'ТН-450', 'MAT-001', '10.01', 'KG', 1200, 88.50),
    (1002, '2026-04-12', 'SUP-002', '15', 'INV', 'СФ-981', 'MAT-001', '10.01', 'PCS', 350, 145.00),
    (1003, '2026-04-19', 'SUP-003', '15', 'WAY', 'ТН-118', 'MAT-002', '10.06', 'L', 90, 520.00),
    (1004, '2026-04-28', 'SUP-002', '15', 'ACT', 'АП-77', 'MAT-003', '10.05', 'M', 800, 74.30);

CREATE OR REPLACE FUNCTION count_suppliers_for_material(p_material_code varchar)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
    SELECT COUNT(DISTINCT supplier_code)::integer
    FROM storage_units
    WHERE material_code = p_material_code;
$$;

CREATE OR REPLACE FUNCTION count_suppliers_by_bank_address(
    p_bank_postal_code varchar,
    p_bank_city varchar,
    p_bank_street varchar,
    p_bank_house varchar
)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
    SELECT COUNT(*)::integer
    FROM suppliers
    WHERE bank_postal_code = p_bank_postal_code
      AND bank_city = p_bank_city
      AND bank_street = p_bank_street
      AND bank_house = p_bank_house;
$$;

CREATE OR REPLACE FUNCTION get_suppliers_for_material(p_material_code varchar)
RETURNS TABLE
(
    material_code varchar,
    material_name varchar,
    supplier_code varchar,
    supplier_name varchar,
    inn varchar,
    legal_postal_code varchar,
    legal_city varchar,
    legal_street varchar,
    legal_house varchar,
    bank_postal_code varchar,
    bank_city varchar,
    bank_street varchar,
    bank_house varchar,
    bank_account_number varchar,
    total_quantity numeric,
    total_amount numeric
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        m.material_code,
        m.material_name,
        s.supplier_code,
        s.supplier_name,
        s.inn,
        s.legal_postal_code,
        s.legal_city,
        s.legal_street,
        s.legal_house,
        s.bank_postal_code,
        s.bank_city,
        s.bank_street,
        s.bank_house,
        s.bank_account_number,
        SUM(u.quantity) AS total_quantity,
        SUM(u.total_price) AS total_amount
    FROM storage_units AS u
    JOIN materials AS m ON m.material_code = u.material_code
    JOIN suppliers AS s ON s.supplier_code = u.supplier_code
    WHERE u.material_code = p_material_code
    GROUP BY
        m.material_code, m.material_name, s.supplier_code, s.supplier_name, s.inn,
        s.legal_postal_code, s.legal_city, s.legal_street, s.legal_house,
        s.bank_postal_code, s.bank_city, s.bank_street, s.bank_house, s.bank_account_number
    ORDER BY s.supplier_name;
$$;

CREATE OR REPLACE PROCEDURE add_storage_unit(
    p_order_number integer,
    p_order_date date,
    p_supplier_code varchar,
    p_balance_account varchar,
    p_document_type_code varchar,
    p_document_number varchar,
    p_material_code varchar,
    p_material_account varchar,
    p_unit_code varchar,
    p_quantity numeric,
    p_unit_price numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM materials
        WHERE material_code = p_material_code
          AND material_account = p_material_account
    ) THEN
        RAISE EXCEPTION 'Счет материала не соответствует справочнику материалов.';
    END IF;

    INSERT INTO storage_units
        (order_number, order_date, supplier_code, balance_account, document_type_code, document_number,
         material_code, material_account, unit_code, quantity, unit_price)
    VALUES
        (p_order_number, p_order_date, p_supplier_code, p_balance_account, p_document_type_code,
         p_document_number, p_material_code, p_material_account, p_unit_code, p_quantity, p_unit_price);
END;
$$;

CREATE OR REPLACE FUNCTION sync_storage_material_account()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.material_account IS DISTINCT FROM OLD.material_account THEN
        UPDATE storage_units
        SET material_account = NEW.material_account
        WHERE material_code = NEW.material_code;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_materials_cascade_account_change
AFTER UPDATE OF material_account ON materials
FOR EACH ROW
EXECUTE FUNCTION sync_storage_material_account();

CREATE OR REPLACE FUNCTION delete_storage_units_for_measurement_unit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM storage_units
    WHERE material_code = OLD.material_code
      AND unit_code = OLD.unit_code;

    RETURN OLD;
END;
$$;

CREATE TRIGGER trg_measurement_units_cascade_delete
BEFORE DELETE ON measurement_units
FOR EACH ROW
EXECUTE FUNCTION delete_storage_units_for_measurement_unit();

CREATE OR REPLACE FUNCTION block_supplier_delete_with_receipts()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM storage_units
        WHERE supplier_code = OLD.supplier_code
    ) THEN
        RAISE EXCEPTION 'Нельзя удалить поставщика, у которого есть складские приходы.';
    END IF;

    RETURN OLD;
END;
$$;

CREATE TRIGGER trg_suppliers_block_delete_with_receipts
BEFORE DELETE ON suppliers
FOR EACH ROW
EXECUTE FUNCTION block_supplier_delete_with_receipts();

SELECT count_suppliers_for_material('MAT-001') AS suppliers_for_mat_001;
SELECT count_suppliers_by_bank_address('101000', 'Москва', 'Мясницкая', '12') AS suppliers_for_bank;
SELECT * FROM get_suppliers_for_material('MAT-001');

