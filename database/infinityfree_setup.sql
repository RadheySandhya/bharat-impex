-- BHARAT IMPEX - INFINITYFREE ONE-CLICK IMPORT FOR PHPMYADMIN
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- BHARAT IMPEX — COMPLETE DATABASE SCHEMA
-- Relational MySQL 8+ / MariaDB compatible (InnoDB)
-- ============================================================

-- Disable foreign key checks during migration
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- 1. SYSTEM & CONFIGURATION TABLES
-- ------------------------------------------------------------

-- Roles table
CREATE TABLE IF NOT EXISTS `roles` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `role_code` VARCHAR(50) NOT NULL UNIQUE,
    `role_name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `permissions` JSON NULL,
    `active` TINYINT(1) DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Users table
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(100) NOT NULL UNIQUE,
    `email` VARCHAR(150) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `full_name` VARCHAR(150) NOT NULL,
    `phone` VARCHAR(30) NULL,
    `role_id` INT NOT NULL,
    `active` TINYINT(1) DEFAULT 1,
    `last_login_at` TIMESTAMP NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Company Settings
CREATE TABLE IF NOT EXISTS `company_settings` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `company_name` VARCHAR(200) NOT NULL DEFAULT 'Bharat Impex',
    `address` TEXT NULL,
    `phone` VARCHAR(50) NULL,
    `email` VARCHAR(100) NULL,
    `gstin` VARCHAR(50) NULL,
    `currency` VARCHAR(10) DEFAULT 'INR (₹)',
    `currency_symbol` VARCHAR(10) DEFAULT '₹',
    `timezone` VARCHAR(100) DEFAULT 'Asia/Kolkata',
    `logo_url` TEXT NULL,
    `allow_negative_stock` TINYINT(1) DEFAULT 0,
    `default_warehouse_id` INT NULL,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Audit Logs
CREATE TABLE IF NOT EXISTS `audit_logs` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NULL,
    `user_name` VARCHAR(150) NULL,
    `action` VARCHAR(100) NOT NULL,
    `module` VARCHAR(100) NOT NULL,
    `record_id` VARCHAR(100) NULL,
    `old_value` JSON NULL,
    `new_value` JSON NULL,
    `ip_address` VARCHAR(50) NULL,
    `user_agent` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_audit_module` (`module`),
    INDEX `idx_audit_user` (`user_id`),
    INDEX `idx_audit_created` (`created_at`)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 2. MASTER ENTITIES (UNITS, CATEGORIES, WAREHOUSES)
-- ------------------------------------------------------------

-- Units of measurement
CREATE TABLE IF NOT EXISTS `units` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `unit_code` VARCHAR(20) NOT NULL UNIQUE,
    `unit_name` VARCHAR(100) NOT NULL,
    `decimal_allowed` TINYINT(1) DEFAULT 1,
    `active` TINYINT(1) DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Categories
CREATE TABLE IF NOT EXISTS `categories` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `category_name` VARCHAR(150) NOT NULL,
    `category_code` VARCHAR(50) NOT NULL UNIQUE,
    `category_type` ENUM('RM', 'FG', 'BOTH') DEFAULT 'BOTH',
    `description` TEXT NULL,
    `active` TINYINT(1) DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Warehouses / Locations
CREATE TABLE IF NOT EXISTS `warehouses` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `warehouse_code` VARCHAR(50) NOT NULL UNIQUE,
    `warehouse_name` VARCHAR(150) NOT NULL,
    `location` VARCHAR(255) NULL,
    `contact_person` VARCHAR(150) NULL,
    `phone` VARCHAR(50) NULL,
    `is_default` TINYINT(1) DEFAULT 0,
    `active` TINYINT(1) DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 3. RAW MATERIALS & FINISHED GOODS
-- ------------------------------------------------------------

-- Raw Materials Master
CREATE TABLE IF NOT EXISTS `raw_materials` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `rm_code` VARCHAR(50) NOT NULL UNIQUE,
    `material_name` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `category_id` INT NULL,
    `unit_id` INT NOT NULL,
    `purchase_unit_id` INT NULL,
    `conversion_factor` DECIMAL(12, 4) DEFAULT 1.0000,
    `standard_rate` DECIMAL(12, 2) DEFAULT 0.00,
    `minimum_stock` DECIMAL(12, 3) DEFAULT 0.000,
    `reorder_level` DECIMAL(12, 3) DEFAULT 0.000,
    `maximum_stock` DECIMAL(12, 3) DEFAULT 0.000,
    `hsn_code` VARCHAR(50) NULL,
    `active` TINYINT(1) DEFAULT 1,
    `created_by` INT NULL,
    `updated_by` INT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` TIMESTAMP NULL,
    FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL,
    FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`purchase_unit_id`) REFERENCES `units` (`id`) ON DELETE SET NULL,
    INDEX `idx_rm_code` (`rm_code`),
    INDEX `idx_rm_name` (`material_name`)
) ENGINE=InnoDB;

-- Finished Goods Master (SKU)
CREATE TABLE IF NOT EXISTS `finished_goods` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `fg_code` VARCHAR(50) NOT NULL UNIQUE,
    `product_name` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `category_id` INT NULL,
    `unit_id` INT NOT NULL,
    `selling_price` DECIMAL(12, 2) DEFAULT 0.00,
    `minimum_stock` DECIMAL(12, 3) DEFAULT 0.000,
    `reorder_level` DECIMAL(12, 3) DEFAULT 0.000,
    `maximum_stock` DECIMAL(12, 3) DEFAULT 0.000,
    `hsn_code` VARCHAR(50) NULL,
    `active` TINYINT(1) DEFAULT 1,
    `created_by` INT NULL,
    `updated_by` INT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` TIMESTAMP NULL,
    FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL,
    FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE RESTRICT,
    INDEX `idx_fg_code` (`fg_code`),
    INDEX `idx_fg_name` (`product_name`)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 4. STOCK & STOCK LEDGER
-- ------------------------------------------------------------

-- Real-time Stock aggregated per material and warehouse
CREATE TABLE IF NOT EXISTS `stock` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `material_type` ENUM('RM', 'FG', 'SCRAP') NOT NULL,
    `material_id` INT NOT NULL,
    `material_code` VARCHAR(50) NOT NULL,
    `material_name` VARCHAR(200) NOT NULL,
    `warehouse_id` INT NOT NULL DEFAULT 1,
    `quantity` DECIMAL(14, 3) NOT NULL DEFAULT 0.000,
    `reserved_quantity` DECIMAL(14, 3) NOT NULL DEFAULT 0.000,
    `available_quantity` DECIMAL(14, 3) GENERATED ALWAYS AS (`quantity` - `reserved_quantity`) STORED,
    `unit_id` INT NOT NULL,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_material_warehouse` (`material_type`, `material_id`, `warehouse_id`),
    FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT,
    INDEX `idx_stock_mat` (`material_type`, `material_id`),
    INDEX `idx_stock_avail` (`available_quantity`)
) ENGINE=InnoDB;

-- Immutable Stock Ledger
CREATE TABLE IF NOT EXISTS `stock_ledger` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `transaction_type` ENUM(
        'OPENING',
        'PURCHASE',
        'PURCHASE_REVERSAL',
        'PRODUCTION_RESERVE',
        'PRODUCTION_RELEASE',
        'PRODUCTION_CONSUMPTION',
        'PRODUCTION_OUTPUT',
        'SALE',
        'SALE_REVERSAL',
        'REJECTION',
        'SCRAP_GENERATED',
        'SCRAP_SALE',
        'ADJUSTMENT_IN',
        'ADJUSTMENT_OUT',
        'TRANSFER_IN',
        'TRANSFER_OUT'
    ) NOT NULL,
    `transaction_id` VARCHAR(100) NOT NULL,
    `material_type` ENUM('RM', 'FG', 'SCRAP') NOT NULL,
    `material_id` INT NOT NULL,
    `material_code` VARCHAR(50) NOT NULL,
    `warehouse_id` INT NOT NULL DEFAULT 1,
    `quantity_in` DECIMAL(14, 3) NOT NULL DEFAULT 0.000,
    `quantity_out` DECIMAL(14, 3) NOT NULL DEFAULT 0.000,
    `balance_after` DECIMAL(14, 3) NOT NULL,
    `unit_id` INT NOT NULL,
    `rate` DECIMAL(12, 2) DEFAULT 0.00,
    `reference_number` VARCHAR(150) NULL,
    `batch_lot_number` VARCHAR(100) NULL,
    `transaction_date` DATE NOT NULL,
    `remarks` TEXT NULL,
    `created_by` INT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT,
    INDEX `idx_ledger_mat` (`material_type`, `material_id`),
    INDEX `idx_ledger_type` (`transaction_type`),
    INDEX `idx_ledger_txid` (`transaction_id`),
    INDEX `idx_ledger_date` (`transaction_date`)
) ENGINE=InnoDB;

-- Stock Adjustments table
CREATE TABLE IF NOT EXISTS `stock_adjustments` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `adjustment_number` VARCHAR(50) NOT NULL UNIQUE,
    `material_type` ENUM('RM', 'FG', 'SCRAP') NOT NULL,
    `material_id` INT NOT NULL,
    `warehouse_id` INT NOT NULL,
    `adjustment_type` ENUM('IN', 'OUT') NOT NULL,
    `system_quantity` DECIMAL(14, 3) NOT NULL,
    `physical_quantity` DECIMAL(14, 3) NOT NULL,
    `difference_quantity` DECIMAL(14, 3) NOT NULL,
    `reason` VARCHAR(255) NOT NULL,
    `remarks` TEXT NULL,
    `created_by` INT NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Stock Transfers table
CREATE TABLE IF NOT EXISTS `stock_transfers` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `transfer_number` VARCHAR(50) NOT NULL UNIQUE,
    `source_warehouse_id` INT NOT NULL,
    `destination_warehouse_id` INT NOT NULL,
    `transfer_date` DATE NOT NULL,
    `status` ENUM('PENDING', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED') DEFAULT 'COMPLETED',
    `remarks` TEXT NULL,
    `created_by` INT NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`source_warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`destination_warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Stock Transfer Items
CREATE TABLE IF NOT EXISTS `stock_transfer_items` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `transfer_id` INT NOT NULL,
    `material_type` ENUM('RM', 'FG', 'SCRAP') NOT NULL,
    `material_id` INT NOT NULL,
    `quantity` DECIMAL(14, 3) NOT NULL,
    `unit_id` INT NOT NULL,
    FOREIGN KEY (`transfer_id`) REFERENCES `stock_transfers` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 5. TALLY MAPPINGS & CSV IMPORTS
-- ------------------------------------------------------------

-- Central Item Mapping Table (Tally Item Name -> System RM or FG)
CREATE TABLE IF NOT EXISTS `item_mappings` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `external_source` VARCHAR(50) DEFAULT 'TALLY',
    `external_item_name` VARCHAR(255) NOT NULL,
    `material_type` ENUM('RM', 'FG') NOT NULL,
    `internal_item_id` INT NOT NULL,
    `internal_item_code` VARCHAR(50) NOT NULL,
    `status` ENUM('MAPPED', 'UNMAPPED', 'AMBIGUOUS') DEFAULT 'MAPPED',
    `active` TINYINT(1) DEFAULT 1,
    `created_by` INT NULL,
    `updated_by` INT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_ext_item` (`external_source`, `external_item_name`, `material_type`),
    INDEX `idx_mapping_ext` (`external_item_name`),
    INDEX `idx_mapping_internal` (`material_type`, `internal_item_id`)
) ENGINE=InnoDB;

-- Purchase Import Batches
CREATE TABLE IF NOT EXISTS `purchase_import_batches` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `batch_code` VARCHAR(50) NOT NULL UNIQUE,
    `file_name` VARCHAR(255) NOT NULL,
    `file_hash` VARCHAR(64) NOT NULL,
    `total_rows` INT DEFAULT 0,
    `successful_rows` INT DEFAULT 0,
    `failed_rows` INT DEFAULT 0,
    `duplicate_rows` INT DEFAULT 0,
    `unmapped_rows` INT DEFAULT 0,
    `status` ENUM('UPLOADED', 'VALIDATING', 'VALIDATION_FAILED', 'PENDING_CONFIRMATION', 'IMPORTED', 'PARTIALLY_IMPORTED', 'REVERSED', 'FAILED') DEFAULT 'UPLOADED',
    `error_summary` TEXT NULL,
    `imported_by` INT NULL,
    `imported_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `reversed_by` INT NULL,
    `reversed_at` TIMESTAMP NULL,
    INDEX `idx_pur_hash` (`file_hash`)
) ENGINE=InnoDB;

-- Purchase Inputs (Tally Purchase Line Items)
CREATE TABLE IF NOT EXISTS `purchase_inputs` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `purchase_batch_id` INT NULL,
    `purchase_date` DATE NOT NULL,
    `invoice_number` VARCHAR(100) NULL,
    `supplier_name` VARCHAR(200) NULL,
    `tally_item_name` VARCHAR(255) NOT NULL,
    `rm_id` INT NOT NULL,
    `rm_code` VARCHAR(50) NOT NULL,
    `warehouse_id` INT NOT NULL DEFAULT 1,
    `quantity` DECIMAL(14, 3) NOT NULL,
    `unit_id` INT NOT NULL,
    `rate` DECIMAL(12, 2) DEFAULT 0.00,
    `amount` DECIMAL(14, 2) DEFAULT 0.00,
    `source` VARCHAR(50) DEFAULT 'TALLY_CSV',
    `reference_number` VARCHAR(100) NULL,
    `is_reversed` TINYINT(1) DEFAULT 0,
    `created_by` INT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`purchase_batch_id`) REFERENCES `purchase_import_batches` (`id`) ON DELETE SET NULL,
    FOREIGN KEY (`rm_id`) REFERENCES `raw_materials` (`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT,
    INDEX `idx_pur_date` (`purchase_date`),
    INDEX `idx_pur_rm` (`rm_id`),
    INDEX `idx_pur_invoice` (`invoice_number`)
) ENGINE=InnoDB;

-- Sales Import Batches
CREATE TABLE IF NOT EXISTS `sale_import_batches` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `batch_code` VARCHAR(50) NOT NULL UNIQUE,
    `file_name` VARCHAR(255) NOT NULL,
    `file_hash` VARCHAR(64) NOT NULL,
    `total_rows` INT DEFAULT 0,
    `successful_rows` INT DEFAULT 0,
    `failed_rows` INT DEFAULT 0,
    `duplicate_rows` INT DEFAULT 0,
    `unmapped_rows` INT DEFAULT 0,
    `status` ENUM('UPLOADED', 'VALIDATING', 'VALIDATION_FAILED', 'PENDING_CONFIRMATION', 'IMPORTED', 'PARTIALLY_IMPORTED', 'REVERSED', 'FAILED') DEFAULT 'UPLOADED',
    `error_summary` TEXT NULL,
    `imported_by` INT NULL,
    `imported_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `reversed_by` INT NULL,
    `reversed_at` TIMESTAMP NULL,
    INDEX `idx_sale_hash` (`file_hash`)
) ENGINE=InnoDB;

-- Sales Inputs (Tally Sale Line Items)
CREATE TABLE IF NOT EXISTS `sale_inputs` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `sale_batch_id` INT NULL,
    `sale_date` DATE NOT NULL,
    `invoice_number` VARCHAR(100) NULL,
    `customer_name` VARCHAR(200) NULL,
    `tally_item_name` VARCHAR(255) NOT NULL,
    `fg_id` INT NOT NULL,
    `fg_code` VARCHAR(50) NOT NULL,
    `warehouse_id` INT NOT NULL DEFAULT 1,
    `quantity` DECIMAL(14, 3) NOT NULL,
    `unit_id` INT NOT NULL,
    `rate` DECIMAL(12, 2) DEFAULT 0.00,
    `amount` DECIMAL(14, 2) DEFAULT 0.00,
    `source` VARCHAR(50) DEFAULT 'TALLY_CSV',
    `reference_number` VARCHAR(100) NULL,
    `is_reversed` TINYINT(1) DEFAULT 0,
    `created_by` INT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`sale_batch_id`) REFERENCES `sale_import_batches` (`id`) ON DELETE SET NULL,
    FOREIGN KEY (`fg_id`) REFERENCES `finished_goods` (`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT,
    INDEX `idx_sale_date` (`sale_date`),
    INDEX `idx_sale_fg` (`fg_id`),
    INDEX `idx_sale_invoice` (`invoice_number`)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 6. BOM (BILL OF MATERIALS) & VERSIONING
-- ------------------------------------------------------------

-- BOM Headers
CREATE TABLE IF NOT EXISTS `bom_headers` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `fg_id` INT NOT NULL,
    `bom_code` VARCHAR(50) NOT NULL UNIQUE,
    `bom_name` VARCHAR(150) NOT NULL,
    `version` VARCHAR(20) NOT NULL DEFAULT 'V1',
    `is_active` TINYINT(1) DEFAULT 1,
    `status` ENUM('DRAFT', 'ACTIVE', 'SUPERSEDED', 'ARCHIVED') DEFAULT 'ACTIVE',
    `effective_from` DATE NOT NULL,
    `effective_to` DATE NULL,
    `remarks` TEXT NULL,
    `created_by` INT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`fg_id`) REFERENCES `finished_goods` (`id`) ON DELETE RESTRICT,
    INDEX `idx_bom_fg` (`fg_id`)
) ENGINE=InnoDB;

-- BOM Items (Raw Materials required per 1 unit of FG)
CREATE TABLE IF NOT EXISTS `bom_items` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `bom_id` INT NOT NULL,
    `rm_id` INT NOT NULL,
    `quantity_per_unit` DECIMAL(12, 4) NOT NULL,
    `unit_id` INT NOT NULL,
    `wastage_percentage` DECIMAL(5, 2) DEFAULT 0.00,
    `scrap_factor` DECIMAL(5, 2) DEFAULT 0.00,
    `sequence` INT DEFAULT 1,
    `mandatory` TINYINT(1) DEFAULT 1,
    `remarks` VARCHAR(255) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`bom_id`) REFERENCES `bom_headers` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`rm_id`) REFERENCES `raw_materials` (`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE RESTRICT,
    INDEX `idx_bom_items_bom` (`bom_id`),
    INDEX `idx_bom_items_rm` (`rm_id`)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 7. DYNAMIC PROCESSES & PRODUCT ROUTING
-- ------------------------------------------------------------

-- Master Processes (Casting, Grinding, Polishing, Assembly, QC, etc.)
CREATE TABLE IF NOT EXISTS `processes` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `process_code` VARCHAR(50) NOT NULL UNIQUE,
    `process_name` VARCHAR(150) NOT NULL,
    `description` TEXT NULL,
    `standard_duration_minutes` INT DEFAULT 0,
    `active` TINYINT(1) DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Process Route Templates per Finished Good
CREATE TABLE IF NOT EXISTS `process_product_mapping` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `fg_id` INT NOT NULL,
    `process_id` INT NOT NULL,
    `sequence` INT NOT NULL DEFAULT 1,
    `is_mandatory` TINYINT(1) DEFAULT 1,
    `expected_loss_percent` DECIMAL(5, 2) DEFAULT 0.00,
    `description` VARCHAR(255) NULL,
    `active` TINYINT(1) DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`fg_id`) REFERENCES `finished_goods` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`process_id`) REFERENCES `processes` (`id`) ON DELETE RESTRICT,
    UNIQUE KEY `uk_fg_sequence` (`fg_id`, `sequence`),
    INDEX `idx_route_fg` (`fg_id`)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 8. REJECTION & SCRAP REASONS
-- ------------------------------------------------------------

-- Rejection Reasons Master
CREATE TABLE IF NOT EXISTS `rejection_reasons` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `reason_code` VARCHAR(50) NOT NULL UNIQUE,
    `reason_name` VARCHAR(150) NOT NULL,
    `description` TEXT NULL,
    `category` VARCHAR(100) DEFAULT 'GENERAL',
    `active` TINYINT(1) DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Scrap Stock Categories / Materials
CREATE TABLE IF NOT EXISTS `scrap_materials` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `scrap_code` VARCHAR(50) NOT NULL UNIQUE,
    `scrap_name` VARCHAR(150) NOT NULL,
    `unit_id` INT NOT NULL,
    `standard_rate` DECIMAL(12, 2) DEFAULT 0.00,
    `description` TEXT NULL,
    `active` TINYINT(1) DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 9. PRODUCTION SYSTEM (ORDERS, STAGES, CONSUMPTION, OUTPUT)
-- ------------------------------------------------------------

-- Production Orders
CREATE TABLE IF NOT EXISTS `production_orders` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `production_number` VARCHAR(50) NOT NULL UNIQUE,
    `fg_id` INT NOT NULL,
    `bom_id` INT NOT NULL,
    `warehouse_id` INT NOT NULL DEFAULT 1,
    `planned_quantity` DECIMAL(14, 3) NOT NULL,
    `produced_quantity` DECIMAL(14, 3) DEFAULT 0.000,
    `rejected_quantity` DECIMAL(14, 3) DEFAULT 0.000,
    `scrap_quantity` DECIMAL(14, 3) DEFAULT 0.000,
    `priority` ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT') DEFAULT 'NORMAL',
    `status` ENUM(
        'DRAFT',
        'PLANNED',
        'APPROVED',
        'MATERIAL_RESERVED',
        'IN_PROGRESS',
        'ON_HOLD',
        'COMPLETED',
        'CANCELLED'
    ) DEFAULT 'PLANNED',
    `planned_start_date` DATE NOT NULL,
    `planned_end_date` DATE NULL,
    `actual_start_date` DATETIME NULL,
    `actual_end_date` DATETIME NULL,
    `remarks` TEXT NULL,
    `created_by` INT NULL,
    `approved_by` INT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`fg_id`) REFERENCES `finished_goods` (`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`bom_id`) REFERENCES `bom_headers` (`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT,
    INDEX `idx_prod_status` (`status`),
    INDEX `idx_prod_fg` (`fg_id`),
    INDEX `idx_prod_date` (`planned_start_date`)
) ENGINE=InnoDB;

-- Production Stage Entries (Execution at each dynamic stage)
CREATE TABLE IF NOT EXISTS `production_stage_entries` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `production_order_id` INT NOT NULL,
    `process_id` INT NOT NULL,
    `sequence` INT NOT NULL,
    `input_quantity` DECIMAL(14, 3) NOT NULL DEFAULT 0.000,
    `good_quantity` DECIMAL(14, 3) NOT NULL DEFAULT 0.000,
    `rejected_quantity` DECIMAL(14, 3) NOT NULL DEFAULT 0.000,
    `scrap_quantity` DECIMAL(14, 3) NOT NULL DEFAULT 0.000,
    `loss_quantity` DECIMAL(14, 3) NOT NULL DEFAULT 0.000,
    `status` ENUM('PENDING', 'READY', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'SKIPPED', 'ON_HOLD') DEFAULT 'PENDING',
    `started_at` DATETIME NULL,
    `completed_at` DATETIME NULL,
    `total_duration_minutes` INT DEFAULT 0,
    `operator_id` INT NULL,
    `supervisor_id` INT NULL,
    `remarks` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`production_order_id`) REFERENCES `production_orders` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`process_id`) REFERENCES `processes` (`id`) ON DELETE RESTRICT,
    INDEX `idx_stage_prod` (`production_order_id`),
    INDEX `idx_stage_status` (`status`)
) ENGINE=InnoDB;

-- Production Stage Pause/Resume Logs
CREATE TABLE IF NOT EXISTS `production_stage_logs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `stage_entry_id` INT NOT NULL,
    `action` ENUM('START', 'PAUSE', 'RESUME', 'COMPLETE', 'HOLD') NOT NULL,
    `action_time` DATETIME NOT NULL,
    `operator_id` INT NULL,
    `reason` VARCHAR(255) NULL,
    FOREIGN KEY (`stage_entry_id`) REFERENCES `production_stage_entries` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Production Rejections Breakdown
CREATE TABLE IF NOT EXISTS `production_rejections` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `production_order_id` INT NOT NULL,
    `stage_entry_id` INT NOT NULL,
    `rejection_reason_id` INT NOT NULL,
    `quantity` DECIMAL(14, 3) NOT NULL,
    `scrap_recoverable_quantity` DECIMAL(14, 3) DEFAULT 0.000,
    `scrap_material_id` INT NULL,
    `remarks` TEXT NULL,
    `created_by` INT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`production_order_id`) REFERENCES `production_orders` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`stage_entry_id`) REFERENCES `production_stage_entries` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`rejection_reason_id`) REFERENCES `rejection_reasons` (`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`scrap_material_id`) REFERENCES `scrap_materials` (`id`) ON DELETE SET NULL,
    INDEX `idx_rej_order` (`production_order_id`),
    INDEX `idx_rej_stage` (`stage_entry_id`),
    INDEX `idx_rej_reason` (`rejection_reason_id`)
) ENGINE=InnoDB;

-- Raw Material Consumption for Production
CREATE TABLE IF NOT EXISTS `production_consumption` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `production_order_id` INT NOT NULL,
    `stage_entry_id` INT NULL,
    `rm_id` INT NOT NULL,
    `rm_code` VARCHAR(50) NOT NULL,
    `planned_quantity` DECIMAL(14, 3) NOT NULL,
    `reserved_quantity` DECIMAL(14, 3) NOT NULL DEFAULT 0.000,
    `consumed_quantity` DECIMAL(14, 3) NOT NULL DEFAULT 0.000,
    `unit_id` INT NOT NULL,
    `consumption_date` DATE NOT NULL,
    `operator_id` INT NULL,
    `remarks` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`production_order_id`) REFERENCES `production_orders` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`rm_id`) REFERENCES `raw_materials` (`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE RESTRICT,
    INDEX `idx_cons_prod` (`production_order_id`),
    INDEX `idx_cons_rm` (`rm_id`)
) ENGINE=InnoDB;

-- Final Finished Goods Output from Production
CREATE TABLE IF NOT EXISTS `production_outputs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `production_order_id` INT NOT NULL,
    `fg_id` INT NOT NULL,
    `fg_code` VARCHAR(50) NOT NULL,
    `warehouse_id` INT NOT NULL DEFAULT 1,
    `accepted_quantity` DECIMAL(14, 3) NOT NULL,
    `rejected_quantity` DECIMAL(14, 3) DEFAULT 0.000,
    `batch_lot_number` VARCHAR(100) NULL,
    `output_date` DATE NOT NULL,
    `remarks` TEXT NULL,
    `created_by` INT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`production_order_id`) REFERENCES `production_orders` (`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`fg_id`) REFERENCES `finished_goods` (`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT,
    INDEX `idx_out_prod` (`production_order_id`),
    INDEX `idx_out_fg` (`fg_id`)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;


-- ==================== SEEDS ====================

-- ============================================================
-- BHARAT IMPEX — INITIAL SEED DATA
-- Default roles, users, masters, processes, BOMs, and sample stock
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Roles
INSERT INTO `roles` (`id`, `role_code`, `role_name`, `description`, `permissions`) VALUES
(1, 'ADMIN', 'System Administrator', 'Full system access across all modules and settings', '["ALL"]'),
(2, 'MANAGER', 'General Manager', 'Operational oversight across inventory, production, purchase and sales', '["VIEW_ALL", "APPROVE_PRODUCTION", "MANAGE_MASTERS", "VIEW_REPORTS"]'),
(3, 'PURCHASE', 'Purchase Officer', 'Manage purchase CSV imports, Tally mappings, and raw material inputs', '["PURCHASE_READ", "PURCHASE_IMPORT", "PURCHASE_REVERSE", "MAPPING_MANAGE"]'),
(4, 'STORE', 'Store & Inventory Manager', 'Manage stock adjustments, warehouse transfers, and opening stock', '["STOCK_READ", "STOCK_ADJUST", "STOCK_TRANSFER"]'),
(5, 'PRODUCTION_MANAGER', 'Production Manager', 'Create production plans, BOMs, manage process routes, and approve orders', '["PRODUCTION_READ", "PRODUCTION_PLAN", "BOM_MANAGE", "PROCESS_MANAGE"]'),
(6, 'PRODUCTION_OPERATOR', 'Production Operator', 'Execute stage tracking, start/pause/complete stages, log rejections', '["PRODUCTION_OPERATOR_VIEW", "STAGE_EXECUTE", "REJECTION_LOG"]'),
(7, 'SALES', 'Sales Officer', 'Manage sales CSV imports, finished goods dispatches, and sales reports', '["SALES_READ", "SALES_IMPORT", "SALES_REVERSE"]'),
(8, 'VIEWER', 'Auditor / Viewer', 'Read-only access to dashboards and analytical reports', '["REPORTS_VIEW"]')
ON DUPLICATE KEY UPDATE `role_name` = VALUES(`role_name`);

-- 2. Users (Passwords hashed for 'admin123' and 'operator123' using bcrypt)
-- admin123: $2y$10$8g4kKz6jW4vQ8FkL1vK7qOQYpGq/hFkE4YhNvZvX1Q1eE1V5K.Z7y
-- operator123: $2y$10$wD8.0V3uMh18x7K6B3iGxe7xI.W5Z.tQ4c8N8nUvJ1Z3z1.V7z9K6
INSERT INTO `users` (`id`, `username`, `email`, `password_hash`, `full_name`, `phone`, `role_id`, `active`) VALUES
(1, 'admin', 'admin@bharatimpex.com', '$2a$12$9Yc/E1o/z80nN5H.qS1UreV2Yf7zG48Qo8a.6B2l31R6H0O8Z9rCe', 'Bharat Impex Admin', '+91 98765 43210', 1, 1),
(2, 'manager', 'manager@bharatimpex.com', '$2a$12$9Yc/E1o/z80nN5H.qS1UreV2Yf7zG48Qo8a.6B2l31R6H0O8Z9rCe', 'Rajesh Sharma (Operations Manager)', '+91 98765 43211', 2, 1),
(3, 'operator', 'operator@bharatimpex.com', '$2a$12$9Yc/E1o/z80nN5H.qS1UreV2Yf7zG48Qo8a.6B2l31R6H0O8Z9rCe', 'Suresh Kumar (Shopfloor Lead)', '+91 98765 43212', 6, 1)
ON DUPLICATE KEY UPDATE `full_name` = VALUES(`full_name`);

-- 3. Company Settings
INSERT INTO `company_settings` (`id`, `company_name`, `address`, `phone`, `email`, `gstin`, `currency`, `currency_symbol`, `timezone`, `allow_negative_stock`, `default_warehouse_id`) VALUES
(1, 'Bharat Impex Sanitary & Hardware Pvt Ltd', 'Plot 42-45, Industrial Area Phase II, Jamnagar, Gujarat 361004', '+91 (0288) 2554100', 'contact@bharatimpex.com', '24AAACB2345M1ZV', 'INR (₹)', '₹', 'Asia/Kolkata', 0, 1)
ON DUPLICATE KEY UPDATE `company_name` = VALUES(`company_name`);

-- 4. Units of Measurement
INSERT INTO `units` (`id`, `unit_code`, `unit_name`, `decimal_allowed`) VALUES
(1, 'KG', 'Kilogram', 1),
(2, 'GRAM', 'Gram', 1),
(3, 'PCS', 'Pieces', 0),
(4, 'MTR', 'Meter', 1),
(5, 'LTR', 'Liter', 1),
(6, 'BOX', 'Box / Carton', 0),
(7, 'SET', 'Set', 0),
(8, 'DOZEN', 'Dozen', 0)
ON DUPLICATE KEY UPDATE `unit_name` = VALUES(`unit_name`);

-- 5. Categories
INSERT INTO `categories` (`id`, `category_code`, `category_name`, `category_type`, `description`) VALUES
(1, 'CAT-RM-MET', 'Metals & Brass Alloys', 'RM', 'Raw brass rods, ingots, copper sheets and extruded metals'),
(2, 'CAT-RM-COMP', 'Valves & Cartridges', 'RM', 'Ceramic cartridges, spindles, aerators and inner mechanisms'),
(3, 'CAT-RM-FAST', 'Fasteners & Seals', 'RM', 'Rubber O-rings, SS screws, washers, washers and gaskets'),
(4, 'CAT-RM-PACK', 'Packaging Materials', 'RM', 'Inner boxes, bubble wrap, master cartons and labels'),
(5, 'CAT-FG-TAPS', 'Premium Basin Taps', 'FG', 'Chrome & Matte finished brass basin mixer taps and pillar taps'),
(6, 'CAT-FG-SINK', 'Kitchen Sink Mixers', 'FG', 'Swivel spout kitchen sink mixers and pull-out faucets'),
(7, 'CAT-FG-VALV', 'Angle & Concealed Valves', 'FG', 'Heavy brass 2-in-1 angle cocks and concealed stop valves')
ON DUPLICATE KEY UPDATE `category_name` = VALUES(`category_name`);

-- 6. Warehouses
INSERT INTO `warehouses` (`id`, `warehouse_code`, `warehouse_name`, `location`, `contact_person`, `phone`, `is_default`, `active`) VALUES
(1, 'WH-MAIN', 'Main Raw Material & RM Store', 'Building A - Ground Floor', 'Vikram Patel', '+91 98250 11223', 1, 1),
(2, 'WH-FACTORY', 'Shopfloor & WIP Store', 'Building B - Manufacturing Unit', 'Suresh Kumar', '+91 98250 11224', 0, 1),
(3, 'WH-FG', 'Finished Goods Dispatch Hub', 'Building C - Logistics Bay', 'Amit Shah', '+91 98250 11225', 0, 1)
ON DUPLICATE KEY UPDATE `warehouse_name` = VALUES(`warehouse_name`);

-- 7. Raw Materials
INSERT INTO `raw_materials` (`id`, `rm_code`, `material_name`, `description`, `category_id`, `unit_id`, `purchase_unit_id`, `conversion_factor`, `standard_rate`, `minimum_stock`, `reorder_level`, `maximum_stock`, `hsn_code`) VALUES
(1, 'RM-000001', 'Brass Rod 25MM (IS 319)', 'Standard extruded brass rod for tap body casting & CNC machining', 1, 1, 1, 1.0000, 580.00, 200.000, 400.000, 3000.000, '74072110'),
(2, 'RM-000002', 'Copper Sheet 2MM', 'Electrolytic copper sheet for internal plating electrodes and washers', 1, 1, 1, 1.0000, 720.00, 50.000, 100.000, 1000.000, '74091100'),
(3, 'RM-000003', 'Ceramic Disc Cartridge 35MM', 'High precision 35mm ceramic quarter turn cartridge', 2, 3, 3, 1.0000, 85.00, 150.000, 300.000, 2500.000, '84819090'),
(4, 'RM-000004', 'Zinc Die-Cast Handle Lever', 'Heavy zinc handle casting for chrome plating', 1, 3, 3, 1.0000, 45.00, 200.000, 500.000, 3000.000, '79070000'),
(5, 'RM-000005', 'SS 304 Screw M4x10', 'Stainless steel grub screws for handle fastening', 3, 3, 3, 1.0000, 1.50, 1000.000, 2000.000, 20000.000, '73181500'),
(6, 'RM-000006', 'EPDM O-Ring 22MM ID', 'High temperature food grade EPDM rubber O-ring', 3, 3, 3, 1.0000, 2.50, 500.000, 1000.000, 10000.000, '40169330'),
(7, 'RM-000007', 'Brass Aerator M24 Neoperl Type', 'Water saving multi-mesh aerator nozzle', 2, 3, 3, 1.0000, 28.00, 200.000, 400.000, 4000.000, '84819090'),
(8, 'RM-000008', 'Duplex Printed Product Box A1', 'Corrugated printed inner box with foam insert', 4, 3, 3, 1.0000, 18.00, 300.000, 600.000, 5000.000, '48191010')
ON DUPLICATE KEY UPDATE `material_name` = VALUES(`material_name`);

-- 8. Finished Goods (SKU)
INSERT INTO `finished_goods` (`id`, `fg_code`, `product_name`, `description`, `category_id`, `unit_id`, `selling_price`, `minimum_stock`, `reorder_level`, `maximum_stock`, `hsn_code`) VALUES
(1, 'FG-000001', 'Brass Basin Tap Model A - Chrome', 'Single lever chrome plated brass pillar tap with ceramic cartridge', 5, 3, 1250.00, 50.000, 100.000, 1000.000, '84818020'),
(2, 'FG-000002', 'Kitchen Sink Mixer Model B - Swivel Spout', 'Heavy table-mounted 360-deg swivel spout brass kitchen faucet', 6, 3, 2100.00, 30.000, 80.000, 800.000, '84818020'),
(3, 'FG-000003', 'Angle Valve 2-in-1 Heavy Duty', 'Brass dual outlet angle cock for geyser and health faucet', 7, 3, 650.00, 100.000, 250.000, 2000.000, '84818020')
ON DUPLICATE KEY UPDATE `product_name` = VALUES(`product_name`);

-- 9. Dynamic Processes Master
INSERT INTO `processes` (`id`, `process_code`, `process_name`, `description`, `standard_duration_minutes`, `active`) VALUES
(1, 'PROC-CAST', 'Gravity Die Casting', 'Molding molten brass into tap body shells', 30, 1),
(2, 'PROC-FETT', 'Fettling & Runner Cutting', 'Removal of sprues, runners and flash from cast parts', 15, 1),
(3, 'PROC-CNC', 'CNC Machining & Threading', 'High precision CNC turning and threading of internal bores', 25, 1),
(4, 'PROC-GRIND', 'Abrasive Belt Grinding', 'Deburring and contour surface grinding', 20, 1),
(5, 'PROC-POLISH', 'Mirror Buffing & Polishing', 'Sisal and cloth buffing for defect-free optical shine', 25, 1),
(6, 'PROC-PLATE', 'Electro-Plating (Nickel + Chrome)', 'Multi-layer electroplating for corrosion resistance and lustrous chrome', 60, 1),
(7, 'PROC-ASSY', 'Assembly & Cartridge Fitment', 'Inserting ceramic cartridge, O-rings, spindle and handle lever', 15, 1),
(8, 'PROC-QC', 'Hydro-Static Pressure Testing & QC', 'Testing at 6 Bar hydraulic pressure for 0% leakage, cosmetic audit', 10, 1),
(9, 'PROC-PACK', 'Final Laser Marking & Packaging', 'Laser branding, barcode label application and boxing', 10, 1)
ON DUPLICATE KEY UPDATE `process_name` = VALUES(`process_name`);

-- 10. Process Routes Mapping
-- Route for FG-000001 (Basin Tap Model A)
INSERT INTO `process_product_mapping` (`fg_id`, `process_id`, `sequence`, `is_mandatory`, `expected_loss_percent`, `description`) VALUES
(1, 1, 1, 1, 2.00, 'Casting tap body from brass rod'),
(1, 2, 2, 1, 1.00, 'Fettling and cutting runners'),
(1, 3, 3, 1, 0.50, 'CNC machining inner cartridge chamber'),
(1, 4, 4, 1, 1.50, 'Belt grinding body curves'),
(1, 5, 5, 1, 1.00, 'Mirror buffing before electroplating'),
(1, 6, 6, 1, 1.00, 'Nickel + Chrome plating'),
(1, 7, 7, 1, 0.50, 'Component assembly (Cartridge, Handle, Screw)'),
(1, 8, 8, 1, 1.00, 'Pressure leakage testing & visual QC'),
(1, 9, 9, 1, 0.00, 'Final packaging into printed box')
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`);

-- Route for FG-000002 (Kitchen Sink Mixer)
INSERT INTO `process_product_mapping` (`fg_id`, `process_id`, `sequence`, `is_mandatory`, `expected_loss_percent`, `description`) VALUES
(2, 1, 1, 1, 2.50, 'Cast mixer body and swivel spout'),
(2, 3, 2, 1, 1.00, 'CNC machining dual inlet threads'),
(2, 4, 3, 1, 1.50, 'Contour surface grinding'),
(2, 5, 4, 1, 1.00, 'High shine buffing'),
(2, 6, 5, 1, 1.00, 'Chrome electroplating'),
(2, 7, 6, 1, 0.50, 'Swivel spout & cartridge assembly'),
(2, 8, 7, 1, 1.00, 'Hydraulic test & inspection'),
(2, 9, 8, 1, 0.00, 'Packaging with foam protector')
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`);

-- Route for FG-000003 (Angle Valve)
INSERT INTO `process_product_mapping` (`fg_id`, `process_id`, `sequence`, `is_mandatory`, `expected_loss_percent`, `description`) VALUES
(3, 1, 1, 1, 2.00, 'Hot forging / casting angle valve body'),
(3, 3, 2, 1, 0.50, '1/2 inch BSP threading'),
(3, 5, 3, 1, 1.00, 'Buffing & finishing'),
(3, 6, 4, 1, 1.00, 'Bright chrome plating'),
(3, 7, 5, 1, 0.50, 'Spindle and wall flange assembly'),
(3, 8, 6, 1, 1.00, 'Air pressure leak check'),
(3, 9, 7, 1, 0.00, 'Individual box packaging')
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`);

-- 11. Rejection Reasons Master
INSERT INTO `rejection_reasons` (`id`, `reason_code`, `reason_name`, `category`, `description`) VALUES
(1, 'REJ-POROSITY', 'Casting Porosity / Blow Holes', 'CASTING', 'Internal voids and gas pockets discovered during CNC turning'),
(2, 'REJ-CRACK', 'Thermal Crack / Shrinkage', 'CASTING', 'Hairline cracks due to uneven cooling during solidification'),
(3, 'REJ-DIMENSION', 'Dimensional Tolerance Out-of-Spec', 'MACHINING', 'Thread pitch or cartridge seat diameter exceeding +/- 0.05mm tolerance'),
(4, 'REJ-SCRATCH', 'Surface Scratches / Dents', 'SURFACE', 'Handling dents and abrasive scratches on visible polished face'),
(5, 'REJ-PEEL', 'Plating Blister / Chrome Peeling', 'PLATING', 'Adhesion failure between nickel layer and brass substrate'),
(6, 'REJ-HAZE', 'Plating Cloudiness / Dull Spot', 'PLATING', 'Lack of brightness due to plating bath contamination'),
(7, 'REJ-LEAK', 'Hydrostatic Pressure Leakage', 'QC_TESTING', 'Water drip during 6 Bar hydraulic bench test at joint/cartridge'),
(8, 'REJ-JAM', 'Handle Jam / Rough Operation', 'ASSEMBLY', 'Cartridge spindle misaligned or excessive torque on screw')
ON DUPLICATE KEY UPDATE `reason_name` = VALUES(`reason_name`);

-- 12. Scrap Materials
INSERT INTO `scrap_materials` (`id`, `scrap_code`, `scrap_name`, `unit_id`, `standard_rate`, `description`) VALUES
(1, 'SCRAP-BRASS-CHIP', 'Brass Turning Chips & Swarf', 1, 380.00, 'Clean dry brass swarf generated from CNC machining and runner cutting'),
(2, 'SCRAP-BRASS-REJ', 'Brass Rejected Castings (Solid)', 1, 440.00, 'Solid rejected brass bodies suitable for remelting in foundry furnace'),
(3, 'SCRAP-COPPER', 'Copper Offcuts & Plate Scrap', 1, 520.00, 'Pure copper scrap pieces')
ON DUPLICATE KEY UPDATE `scrap_name` = VALUES(`scrap_name`);

-- 13. BOM Headers & Versions
INSERT INTO `bom_headers` (`id`, `fg_id`, `bom_code`, `bom_name`, `version`, `is_active`, `status`, `effective_from`, `remarks`) VALUES
(1, 1, 'BOM-FG001-V1', 'BOM for Basin Tap Model A (Standard)', 'V1', 1, 'ACTIVE', '2026-01-01', 'Standard production recipe with 1.15kg brass consumption per tap'),
(2, 2, 'BOM-FG002-V1', 'BOM for Kitchen Sink Mixer (Heavy)', 'V1', 1, 'ACTIVE', '2026-01-01', 'Heavy model recipe with swivel spout and dual O-rings'),
(3, 3, 'BOM-FG003-V1', 'BOM for Angle Valve 2-in-1', 'V1', 1, 'ACTIVE', '2026-01-01', 'Standard angle valve recipe')
ON DUPLICATE KEY UPDATE `bom_name` = VALUES(`bom_name`);

-- 14. BOM Items (Recipes)
-- For FG-000001 (Basin Tap Model A) - Per 1 Unit of Tap
INSERT INTO `bom_items` (`bom_id`, `rm_id`, `quantity_per_unit`, `unit_id`, `wastage_percentage`, `scrap_factor`, `sequence`, `mandatory`, `remarks`) VALUES
(1, 1, 1.1500, 1, 3.00, 15.00, 1, 1, 'Brass rod for body shell casting & machining'),
(1, 3, 1.0000, 3, 0.50, 0.00, 2, 1, '35mm ceramic cartridge'),
(1, 4, 1.0000, 3, 1.00, 0.00, 3, 1, 'Zinc handle lever'),
(1, 5, 1.0000, 3, 2.00, 0.00, 4, 1, 'SS M4x10 grub screw'),
(1, 6, 2.0000, 3, 1.00, 0.00, 5, 1, '22mm EPDM sealing O-rings'),
(1, 7, 1.0000, 3, 0.50, 0.00, 6, 1, 'Neoperl type water aerator'),
(1, 8, 1.0000, 3, 0.50, 0.00, 7, 1, 'Printed packaging box')
ON DUPLICATE KEY UPDATE `quantity_per_unit` = VALUES(`quantity_per_unit`);

-- For FG-000002 (Kitchen Sink Mixer)
INSERT INTO `bom_items` (`bom_id`, `rm_id`, `quantity_per_unit`, `unit_id`, `wastage_percentage`, `scrap_factor`, `sequence`, `mandatory`, `remarks`) VALUES
(2, 1, 1.8500, 1, 3.50, 18.00, 1, 1, 'Brass rod for body and swivel pipe'),
(2, 3, 1.0000, 3, 0.50, 0.00, 2, 1, '35mm ceramic cartridge'),
(2, 4, 1.0000, 3, 1.00, 0.00, 3, 1, 'Zinc handle lever'),
(2, 5, 2.0000, 3, 2.00, 0.00, 4, 1, 'SS screws'),
(2, 6, 3.0000, 3, 1.00, 0.00, 5, 1, '3 EPDM O-rings for swivel neck'),
(2, 7, 1.0000, 3, 0.50, 0.00, 6, 1, 'Swivel aerator nozzle'),
(2, 8, 1.0000, 3, 0.50, 0.00, 7, 1, 'Large printed packaging box')
ON DUPLICATE KEY UPDATE `quantity_per_unit` = VALUES(`quantity_per_unit`);

-- For FG-000003 (Angle Valve)
INSERT INTO `bom_items` (`bom_id`, `rm_id`, `quantity_per_unit`, `unit_id`, `wastage_percentage`, `scrap_factor`, `sequence`, `mandatory`, `remarks`) VALUES
(3, 1, 0.4200, 1, 2.00, 10.00, 1, 1, 'Brass rod for body'),
(3, 6, 1.0000, 3, 1.00, 0.00, 2, 1, 'EPDM O-ring seal'),
(3, 8, 1.0000, 3, 0.50, 0.00, 3, 1, 'Small printed box')
ON DUPLICATE KEY UPDATE `quantity_per_unit` = VALUES(`quantity_per_unit`);

-- 15. Tally Item Mappings
INSERT INTO `item_mappings` (`external_source`, `external_item_name`, `material_type`, `internal_item_id`, `internal_item_code`, `status`, `active`) VALUES
('TALLY', 'BRASS ROD 25MM', 'RM', 1, 'RM-000001', 'MAPPED', 1),
('TALLY', 'BRASS ROD 25 MM IS319', 'RM', 1, 'RM-000001', 'MAPPED', 1),
('TALLY', 'COPPER SHEET 2MM', 'RM', 2, 'RM-000002', 'MAPPED', 1),
('TALLY', 'CERAMIC CARTRIDGE 35MM', 'RM', 3, 'RM-000003', 'MAPPED', 1),
('TALLY', 'ZINC LEVER HANDLE', 'RM', 4, 'RM-000004', 'MAPPED', 1),
('TALLY', 'SS SCREW M4X10', 'RM', 5, 'RM-000005', 'MAPPED', 1),
('TALLY', 'EPDM O-RING 22MM', 'RM', 6, 'RM-000006', 'MAPPED', 1),
('TALLY', 'AERATOR M24 NOZZLE', 'RM', 7, 'RM-000007', 'MAPPED', 1),
('TALLY', 'TAP BOX INNER A1', 'RM', 8, 'RM-000008', 'MAPPED', 1),
('TALLY', 'BASIN TAP MODEL A CHROME', 'FG', 1, 'FG-000001', 'MAPPED', 1),
('TALLY', 'TAP MODEL A (CHROME)', 'FG', 1, 'FG-000001', 'MAPPED', 1),
('TALLY', 'KITCHEN SINK MIXER MODEL B', 'FG', 2, 'FG-000002', 'MAPPED', 1),
('TALLY', 'ANGLE VALVE 2 IN 1 HEAVY', 'FG', 3, 'FG-000003', 'MAPPED', 1)
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);

-- 16. Initial Stock Setup & Ledger Seed
-- Raw Materials Stock
INSERT INTO `stock` (`material_type`, `material_id`, `material_code`, `material_name`, `warehouse_id`, `quantity`, `reserved_quantity`, `unit_id`) VALUES
('RM', 1, 'RM-000001', 'Brass Rod 25MM (IS 319)', 1, 1500.000, 0.000, 1),
('RM', 2, 'RM-000002', 'Copper Sheet 2MM', 1, 450.000, 0.000, 1),
('RM', 3, 'RM-000003', 'Ceramic Disc Cartridge 35MM', 1, 850.000, 0.000, 3),
('RM', 4, 'RM-000004', 'Zinc Die-Cast Handle Lever', 1, 900.000, 0.000, 3),
('RM', 5, 'RM-000005', 'SS 304 Screw M4x10', 1, 5000.000, 0.000, 3),
('RM', 6, 'RM-000006', 'EPDM O-Ring 22MM ID', 1, 3500.000, 0.000, 3),
('RM', 7, 'RM-000007', 'Brass Aerator M24 Neoperl Type', 1, 1200.000, 0.000, 3),
('RM', 8, 'RM-000008', 'Duplex Printed Product Box A1', 1, 1800.000, 0.000, 3),
-- Finished Goods Stock
('FG', 1, 'FG-000001', 'Brass Basin Tap Model A - Chrome', 3, 220.000, 0.000, 3),
('FG', 2, 'FG-000002', 'Kitchen Sink Mixer Model B - Swivel Spout', 3, 115.000, 0.000, 3),
('FG', 3, 'FG-000003', 'Angle Valve 2-in-1 Heavy Duty', 3, 480.000, 0.000, 3),
-- Scrap Stock
('SCRAP', 1, 'SCRAP-BRASS-CHIP', 'Brass Turning Chips & Swarf', 2, 85.500, 0.000, 1),
('SCRAP', 2, 'SCRAP-BRASS-REJ', 'Brass Rejected Castings (Solid)', 2, 32.000, 0.000, 1)
ON DUPLICATE KEY UPDATE `quantity` = VALUES(`quantity`);

-- Corresponding Opening Stock Ledger
INSERT INTO `stock_ledger` (`transaction_type`, `transaction_id`, `material_type`, `material_id`, `material_code`, `warehouse_id`, `quantity_in`, `quantity_out`, `balance_after`, `unit_id`, `rate`, `reference_number`, `transaction_date`, `remarks`, `created_by`) VALUES
('OPENING', 'INIT-OP-001', 'RM', 1, 'RM-000001', 1, 1500.000, 0.000, 1500.000, 1, 580.00, 'SYSTEM_INIT', '2026-10-01', 'Initial Opening Stock Verified', 1),
('OPENING', 'INIT-OP-002', 'RM', 2, 'RM-000002', 1, 450.000, 0.000, 450.000, 1, 720.00, 'SYSTEM_INIT', '2026-10-01', 'Initial Opening Stock Verified', 1),
('OPENING', 'INIT-OP-003', 'RM', 3, 'RM-000003', 1, 850.000, 0.000, 850.000, 3, 85.00, 'SYSTEM_INIT', '2026-10-01', 'Initial Opening Stock Verified', 1),
('OPENING', 'INIT-OP-004', 'RM', 4, 'RM-000004', 1, 900.000, 0.000, 900.000, 3, 45.00, 'SYSTEM_INIT', '2026-10-01', 'Initial Opening Stock Verified', 1),
('OPENING', 'INIT-OP-005', 'RM', 5, 'RM-000005', 1, 5000.000, 0.000, 5000.000, 3, 1.50, 'SYSTEM_INIT', '2026-10-01', 'Initial Opening Stock Verified', 1),
('OPENING', 'INIT-OP-006', 'RM', 6, 'RM-000006', 1, 3500.000, 0.000, 3500.000, 3, 2.50, 'SYSTEM_INIT', '2026-10-01', 'Initial Opening Stock Verified', 1),
('OPENING', 'INIT-OP-007', 'RM', 7, 'RM-000007', 1, 1200.000, 0.000, 1200.000, 3, 28.00, 'SYSTEM_INIT', '2026-10-01', 'Initial Opening Stock Verified', 1),
('OPENING', 'INIT-OP-008', 'RM', 8, 'RM-000008', 1, 1800.000, 0.000, 1800.000, 3, 18.00, 'SYSTEM_INIT', '2026-10-01', 'Initial Opening Stock Verified', 1),
('OPENING', 'INIT-OP-009', 'FG', 1, 'FG-000001', 3, 220.000, 0.000, 220.000, 3, 1250.00, 'SYSTEM_INIT', '2026-10-01', 'Initial Opening Stock Verified', 1),
('OPENING', 'INIT-OP-010', 'FG', 2, 'FG-000002', 3, 115.000, 0.000, 115.000, 3, 2100.00, 'SYSTEM_INIT', '2026-10-01', 'Initial Opening Stock Verified', 1),
('OPENING', 'INIT-OP-011', 'FG', 3, 'FG-000003', 3, 480.000, 0.000, 480.000, 3, 650.00, 'SYSTEM_INIT', '2026-10-01', 'Initial Opening Stock Verified', 1),
('OPENING', 'INIT-OP-012', 'SCRAP', 1, 'SCRAP-BRASS-CHIP', 2, 85.500, 0.000, 85.500, 1, 380.00, 'SYSTEM_INIT', '2026-10-01', 'Initial Scrap Stock Verified', 1),
('OPENING', 'INIT-OP-013', 'SCRAP', 2, 'SCRAP-BRASS-REJ', 2, 32.000, 0.000, 32.000, 1, 440.00, 'SYSTEM_INIT', '2026-10-01', 'Initial Scrap Stock Verified', 1);

-- 17. Sample Production Order (PROD-000001 for Tap Model A, 100 units in progress)
INSERT INTO `production_orders` (`id`, `production_number`, `fg_id`, `bom_id`, `warehouse_id`, `planned_quantity`, `produced_quantity`, `rejected_quantity`, `scrap_quantity`, `priority`, `status`, `planned_start_date`, `actual_start_date`, `remarks`, `created_by`) VALUES
(1, 'PROD-000001', 1, 1, 1, 100.000, 0.000, 3.000, 4.500, 'HIGH', 'IN_PROGRESS', '2026-10-08', '2026-10-08 09:30:00', 'Batch #1 for Diwali distribution orders', 1);

-- Production Stages for PROD-000001
INSERT INTO `production_stage_entries` (`id`, `production_order_id`, `process_id`, `sequence`, `input_quantity`, `good_quantity`, `rejected_quantity`, `scrap_quantity`, `loss_quantity`, `status`, `started_at`, `completed_at`, `total_duration_minutes`, `operator_id`, `supervisor_id`, `remarks`) VALUES
(1, 1, 1, 1, 100.000, 97.000, 3.000, 4.500, 0.000, 'COMPLETED', '2026-10-08 09:30:00', '2026-10-08 11:45:00', 135, 3, 2, 'Casting completed with 3 rejections due to porosity'),
(2, 1, 2, 2, 97.000, 97.000, 0.000, 0.000, 0.000, 'COMPLETED', '2026-10-08 12:00:00', '2026-10-08 13:15:00', 75, 3, 2, 'Runner cut cleanly, 100% passed'),
(3, 1, 3, 3, 97.000, 96.000, 1.000, 1.200, 0.000, 'COMPLETED', '2026-10-08 14:00:00', '2026-10-08 15:30:00', 90, 3, 2, '1 body rejected due to thread tool wear'),
(4, 1, 4, 4, 96.000, 0.000, 0.000, 0.000, 0.000, 'IN_PROGRESS', '2026-10-08 16:00:00', NULL, 60, 3, 2, 'Belt grinding underway on 40-grit belt'),
(5, 1, 5, 5, 0.000, 0.000, 0.000, 0.000, 0.000, 'PENDING', NULL, NULL, 0, NULL, NULL, NULL),
(6, 1, 6, 6, 0.000, 0.000, 0.000, 0.000, 0.000, 'PENDING', NULL, NULL, 0, NULL, NULL, NULL),
(7, 1, 7, 7, 0.000, 0.000, 0.000, 0.000, 0.000, 'PENDING', NULL, NULL, 0, NULL, NULL, NULL),
(8, 1, 8, 8, 0.000, 0.000, 0.000, 0.000, 0.000, 'PENDING', NULL, NULL, 0, NULL, NULL, NULL),
(9, 1, 9, 9, 0.000, 0.000, 0.000, 0.000, 0.000, 'PENDING', NULL, NULL, 0, NULL, NULL, NULL);

-- Rejections breakdown for sample order
INSERT INTO `production_rejections` (`id`, `production_order_id`, `stage_entry_id`, `rejection_reason_id`, `quantity`, `scrap_recoverable_quantity`, `scrap_material_id`, `remarks`, `created_by`) VALUES
(1, 1, 1, 1, 3.000, 3.450, 2, 'Blow holes discovered in tap neck during visual gate check', 3),
(2, 1, 3, 3, 1.000, 1.150, 2, 'Thread pitch oversized by 0.12mm', 3);

-- Sample Consumption Reserved & Consumed
INSERT INTO `production_consumption` (`production_order_id`, `stage_entry_id`, `rm_id`, `rm_code`, `planned_quantity`, `reserved_quantity`, `consumed_quantity`, `unit_id`, `consumption_date`, `operator_id`, `remarks`) VALUES
(1, 1, 1, 'RM-000001', 115.000, 115.000, 115.000, 1, '2026-10-08', 3, 'Cast from high grade brass rod'),
(1, 7, 3, 'RM-000003', 100.000, 100.000, 0.000, 3, '2026-10-08', NULL, 'To be consumed at Assembly stage'),
(1, 7, 4, 'RM-000004', 100.000, 100.000, 0.000, 3, '2026-10-08', NULL, 'To be consumed at Assembly stage'),
(1, 7, 5, 'RM-000005', 100.000, 100.000, 0.000, 3, '2026-10-08', NULL, 'To be consumed at Assembly stage'),
(1, 7, 6, 'RM-000006', 200.000, 200.000, 0.000, 3, '2026-10-08', NULL, 'To be consumed at Assembly stage'),
(1, 9, 8, 'RM-000008', 100.000, 100.000, 0.000, 3, '2026-10-08', NULL, 'To be consumed at Packing stage');

SET FOREIGN_KEY_CHECKS = 1;


SET FOREIGN_KEY_CHECKS = 1;
