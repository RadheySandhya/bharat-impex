-- ============================================================
-- BHARAT IMPEX — COMPLETE DATABASE SCHEMA
-- Relational MySQL 8+ / MariaDB compatible (InnoDB)
-- ============================================================

CREATE DATABASE IF NOT EXISTS `bharat_impex` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `bharat_impex`;

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
