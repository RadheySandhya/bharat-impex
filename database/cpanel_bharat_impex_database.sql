-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: bharat_impex
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `audit_logs` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `user_name` varchar(150) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `module` varchar(100) NOT NULL,
  `record_id` varchar(100) DEFAULT NULL,
  `old_value` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`old_value`)),
  `new_value` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`new_value`)),
  `ip_address` varchar(50) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_audit_module` (`module`),
  KEY `idx_audit_user` (`user_id`),
  KEY `idx_audit_created` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=50 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
INSERT INTO `audit_logs` VALUES (1,1,'Bharat Impex Admin (admin)','PRODUCT_ROUTE_UPDATED','PROCESSES','1',NULL,'{\"stage_count\":4}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36','2026-10-09 02:31:47'),(2,1,'Bharat Impex Admin (admin)','PRODUCT_ROUTE_UPDATED','PROCESSES','1',NULL,'{\"stage_count\":5}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36','2026-10-09 02:39:06'),(3,NULL,'SYSTEM','LOGIN_SUCCESS','AUTH','1',NULL,'{\"user\":\"admin\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36','2026-10-10 15:03:23'),(4,1,'Bharat Impex Admin (admin)','planning_created','production_planning','1',NULL,'{\"planning_number\":\"PLN-000001\",\"quantity\":100}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36','2026-10-10 16:23:47'),(5,1,'Bharat Impex Admin (admin)','planning_approved','production_planning','1',NULL,NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36','2026-10-10 16:23:52'),(6,1,'Bharat Impex Admin (admin)','planning_released','planning_releases','1','{\"pending_before\":100}','{\"release_number\":\"REL-000001\",\"qty\":100}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36','2026-10-10 16:24:08'),(7,1,'Bharat Impex Admin (admin)','planning_created','production_planning','2',NULL,'{\"planning_number\":\"PLN-000002\",\"quantity\":100}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36','2026-10-10 16:27:24'),(8,1,'Bharat Impex Admin (admin)','planning_approved','production_planning','2',NULL,NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36','2026-10-10 16:27:27'),(9,1,'Bharat Impex Admin (admin)','planning_released','planning_releases','2','{\"pending_before\":100}','{\"release_number\":\"REL-000002\",\"qty\":100}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36','2026-10-10 16:27:33'),(10,NULL,'SYSTEM','LOGIN_SUCCESS','AUTH','1',NULL,'{\"user\":\"admin\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36','2026-10-10 16:39:32'),(11,NULL,'SYSTEM','LOGIN_SUCCESS','AUTH','1',NULL,'{\"user\":\"admin\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36','2026-10-10 16:51:18'),(12,1,'Bharat Impex Admin (admin)','planning_created','production_planning','3',NULL,'{\"planning_number\":\"PLN-000003\",\"quantity\":100}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36','2026-10-10 17:05:52'),(13,1,'Bharat Impex Admin (admin)','planning_approved','production_planning','3',NULL,NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36','2026-10-10 17:05:56'),(14,1,'Bharat Impex Admin (admin)','planning_released','planning_releases','3','{\"pending_before\":100}','{\"release_number\":\"REL-000003\",\"qty\":100}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36','2026-10-10 17:06:00'),(15,1,'Bharat Impex Admin (admin)','planning_created','production_planning','4',NULL,'{\"planning_number\":\"PLN-000004\",\"quantity\":500}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36','2026-10-10 17:06:48'),(16,1,'Bharat Impex Admin (admin)','planning_approved','production_planning','4',NULL,NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36','2026-10-10 17:06:50'),(17,1,'Bharat Impex Admin (admin)','planning_released','planning_releases','4','{\"pending_before\":500}','{\"release_number\":\"REL-000004\",\"qty\":400}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36','2026-10-10 17:06:55'),(18,1,'Bharat Impex Admin (admin)','planning_released','planning_releases','5','{\"pending_before\":100}','{\"release_number\":\"BATCH-000004-B\",\"qty\":100}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36','2026-10-10 17:29:00'),(19,1,'Bharat Impex Admin (admin)','PROCESS_DELETED','MASTERS','2',NULL,NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36','2026-10-11 03:36:37'),(20,1,'Bharat Impex Admin (admin)','PROCESS_DELETED','MASTERS','3',NULL,NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36','2026-10-11 03:36:39'),(21,1,'Bharat Impex Admin (admin)','PROCESS_DELETED','MASTERS','4',NULL,NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36','2026-10-11 03:36:41'),(22,1,'Bharat Impex Admin (admin)','PROCESS_DELETED','MASTERS','5',NULL,NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36','2026-10-11 03:36:42'),(23,1,'Bharat Impex Admin (admin)','planning_created','production_planning','5',NULL,'{\"planning_number\":\"PLN-000005\",\"quantity\":1000}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36','2026-10-12 15:39:33'),(24,1,'Bharat Impex Admin (admin)','planning_approved','production_planning','5',NULL,NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36','2026-10-12 15:39:43'),(25,1,'Bharat Impex Admin (admin)','planning_released','planning_releases','6','{\"pending_before\":1000}','{\"release_number\":\"BATCH-000005-A\",\"qty\":400}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36','2026-10-12 15:40:28'),(26,1,'Bharat Impex Admin (admin)','planning_released','planning_releases','7','{\"pending_before\":600}','{\"release_number\":\"BATCH-000005-B\",\"qty\":600}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36','2026-10-12 15:40:52'),(27,1,'Bharat Impex Admin (admin)','planning_created','production_planning','6',NULL,'{\"planning_number\":\"PLN-000006\",\"quantity\":600}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36','2026-10-13 13:38:50'),(28,1,'Bharat Impex Admin (admin)','planning_approved','production_planning','6',NULL,NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36','2026-10-13 13:43:46'),(29,1,'Bharat Impex Admin (admin)','planning_released','planning_releases','8','{\"pending_before\":600}','{\"release_number\":\"BATCH-000006-A\",\"qty\":300}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36','2026-10-13 13:50:05'),(30,1,'Bharat Impex Admin (admin)','planning_released','planning_releases','9','{\"pending_before\":300}','{\"release_number\":\"BATCH-000006-B\",\"qty\":300}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36','2026-10-13 13:50:32'),(31,1,'Bharat Impex Admin (admin)','planning_created','production_planning','7',NULL,'{\"planning_number\":\"PLN-000007\",\"quantity\":600}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36','2026-10-13 14:10:03'),(32,1,'Bharat Impex Admin (admin)','planning_approved','production_planning','7',NULL,NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36','2026-10-13 14:10:04'),(33,1,'Bharat Impex Admin (admin)','planning_released','planning_releases','10','{\"pending_before\":600}','{\"release_number\":\"BATCH-000007-A\",\"qty\":600}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36','2026-10-13 14:10:09'),(34,NULL,'SYSTEM','LOGIN_SUCCESS','AUTH','1',NULL,'{\"user\":\"admin\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36','2026-10-19 14:06:37'),(35,NULL,'SYSTEM','LOGIN_SUCCESS','AUTH','1',NULL,'{\"user\":\"admin\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36','2026-10-19 14:42:47'),(36,NULL,'SYSTEM','LOGIN_SUCCESS','AUTH','1',NULL,'{\"user\":\"admin\"}','::1','CLI/API','2026-10-19 15:15:38'),(37,1,'Bharat Impex Admin (admin)','FG_BATCH_COMPLETED','STOCK','BATCH-000007-A',NULL,'{\"batch_no\":\"BATCH-000007-A\",\"fg_id\":4,\"fg_code\":\"ABS-7522\",\"product_name\":\"ABS CLOVA SOAP DISH OVAL\",\"good_qty\":600,\"new_stock\":614,\"operator\":\"Supervisor \\/ Operator\"}','::1','CLI/API','2026-10-19 15:15:38'),(38,1,'Bharat Impex Admin (admin)','RM_KITTING_ISSUED','STOCK','BATCH-000007-A',NULL,'{\"batch_no\":\"BATCH-000007-A\",\"fg_id\":4,\"fg_code\":\"ABS-7522\",\"deductions\":[{\"rm_id\":1,\"rm_code\":\"RM-000001\",\"material_name\":\"Brass Rod 25MM (IS 319)\",\"qty_deducted\":210,\"unit_code\":\"KG\",\"new_stock\":-209},{\"rm_id\":8,\"rm_code\":\"RM-000008\",\"material_name\":\"Duplex Printed Product Box A1\",\"qty_deducted\":600,\"unit_code\":\"PCS\",\"new_stock\":-600}]}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36','2026-10-19 16:21:17'),(39,NULL,'SYSTEM','PRODUCTION_ORDER_CREATED','PRODUCTION','PROD-000001',NULL,'{\"order_id\":1,\"fg_id\":1,\"planned_qty\":50,\"priority\":\"HIGH\"}','127.0.0.1','CLI/API','2026-10-19 16:47:58'),(40,NULL,'SYSTEM','PRODUCTION_ORDER_CREATED','PRODUCTION','PROD-000002',NULL,'{\"order_id\":2,\"fg_id\":1,\"planned_qty\":50,\"priority\":\"HIGH\"}','127.0.0.1','CLI/API','2026-10-19 16:50:01'),(41,NULL,'SYSTEM','PRODUCTION_ORDER_CREATED','PRODUCTION','PROD-000003',NULL,'{\"order_id\":3,\"fg_id\":1,\"planned_qty\":50,\"priority\":\"HIGH\"}','127.0.0.1','CLI/API','2026-10-19 16:50:45'),(42,NULL,'SYSTEM','PRODUCTION_ORDER_APPROVED','PRODUCTION','PROD-000003','{\"status\":\"PLANNED\"}','{\"status\":\"APPROVED\"}','127.0.0.1','CLI/API','2026-10-19 16:50:45'),(43,NULL,'SYSTEM','PRODUCTION_ORDER_CREATED','PRODUCTION','PROD-000004',NULL,'{\"order_id\":4,\"fg_id\":1,\"planned_qty\":50,\"priority\":\"HIGH\"}','127.0.0.1','CLI/API','2026-10-19 16:57:12'),(44,NULL,'SYSTEM','PRODUCTION_ORDER_APPROVED','PRODUCTION','PROD-000004','{\"status\":\"PLANNED\"}','{\"status\":\"APPROVED\"}','127.0.0.1','CLI/API','2026-10-19 16:57:12'),(45,1,'Bharat Impex Admin (admin)','planning_created','production_planning','8',NULL,'{\"planning_number\":\"PLN-000008\",\"quantity\":100}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36','2026-10-19 16:58:50'),(46,1,'Bharat Impex Admin (admin)','planning_approved','production_planning','8',NULL,NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36','2026-10-19 16:58:53'),(47,1,'Bharat Impex Admin (admin)','planning_released','planning_releases','11','{\"pending_before\":100}','{\"release_number\":\"BATCH-000008-A\",\"qty\":100,\"auto_kitted\":true,\"materials_count\":7}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36','2026-10-19 16:59:29'),(48,1,'Bharat Impex Admin (admin)','FG_BATCH_COMPLETED','STOCK','BATCH-000008-A',NULL,'{\"batch_no\":\"BATCH-000008-A\",\"fg_id\":2,\"fg_code\":\"FG-000002\",\"product_name\":\"Kitchen Sink Mixer Model B - Swivel Spout\",\"good_qty\":100,\"new_stock\":100,\"operator\":\"Supervisor \\/ Operator\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36','2026-10-19 16:59:49'),(49,NULL,'SYSTEM','LOGIN_SUCCESS','AUTH','1',NULL,'{\"user\":\"admin\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36','2026-10-22 02:03:32');
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bom_headers`
--

DROP TABLE IF EXISTS `bom_headers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `bom_headers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fg_id` int(11) NOT NULL,
  `bom_code` varchar(50) NOT NULL,
  `bom_name` varchar(150) NOT NULL,
  `version` varchar(20) NOT NULL DEFAULT 'V1',
  `is_active` tinyint(1) DEFAULT 1,
  `status` enum('DRAFT','ACTIVE','SUPERSEDED','ARCHIVED') DEFAULT 'ACTIVE',
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `bom_code` (`bom_code`),
  KEY `idx_bom_fg` (`fg_id`),
  CONSTRAINT `bom_headers_ibfk_1` FOREIGN KEY (`fg_id`) REFERENCES `finished_goods` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bom_headers`
--

LOCK TABLES `bom_headers` WRITE;
/*!40000 ALTER TABLE `bom_headers` DISABLE KEYS */;
INSERT INTO `bom_headers` VALUES (1,1,'BOM-FG001-V1','BOM for Basin Tap Model A (Standard)','V1',1,'ACTIVE','2026-01-01',NULL,'Standard production recipe with 1.15kg brass consumption per tap',NULL,'2026-10-08 14:00:53','2026-10-08 14:00:53'),(2,2,'BOM-FG002-V1','BOM for Kitchen Sink Mixer (Heavy)','V1',1,'ACTIVE','2026-01-01',NULL,'Heavy model recipe with swivel spout and dual O-rings',NULL,'2026-10-08 14:00:53','2026-10-08 14:00:53'),(3,3,'BOM-FG003-V1','BOM for Angle Valve 2-in-1','V1',1,'ACTIVE','2026-01-01',NULL,'Standard angle valve recipe',NULL,'2026-10-08 14:00:53','2026-10-08 14:00:53');
/*!40000 ALTER TABLE `bom_headers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bom_items`
--

DROP TABLE IF EXISTS `bom_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `bom_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `bom_id` int(11) NOT NULL,
  `rm_id` int(11) NOT NULL,
  `quantity_per_unit` decimal(12,4) NOT NULL,
  `unit_id` int(11) NOT NULL,
  `wastage_percentage` decimal(5,2) DEFAULT 0.00,
  `scrap_factor` decimal(5,2) DEFAULT 0.00,
  `sequence` int(11) DEFAULT 1,
  `mandatory` tinyint(1) DEFAULT 1,
  `remarks` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `unit_id` (`unit_id`),
  KEY `idx_bom_items_bom` (`bom_id`),
  KEY `idx_bom_items_rm` (`rm_id`),
  CONSTRAINT `bom_items_ibfk_1` FOREIGN KEY (`bom_id`) REFERENCES `bom_headers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `bom_items_ibfk_2` FOREIGN KEY (`rm_id`) REFERENCES `raw_materials` (`id`),
  CONSTRAINT `bom_items_ibfk_3` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bom_items`
--

LOCK TABLES `bom_items` WRITE;
/*!40000 ALTER TABLE `bom_items` DISABLE KEYS */;
INSERT INTO `bom_items` VALUES (18,1,1,1.1500,1,0.00,0.00,1,1,NULL,'2026-10-11 02:51:36'),(19,1,3,1.0000,3,0.00,0.00,2,1,NULL,'2026-10-11 02:51:36'),(20,1,4,1.0000,3,0.00,0.00,3,1,NULL,'2026-10-11 02:51:36'),(21,1,5,1.0000,3,0.00,0.00,4,1,NULL,'2026-10-11 02:51:36'),(22,1,6,2.0000,3,0.00,0.00,5,1,NULL,'2026-10-11 02:51:36'),(23,1,7,1.0000,3,0.00,0.00,6,1,NULL,'2026-10-11 02:51:36'),(24,1,8,1.0000,3,0.00,0.00,7,1,NULL,'2026-10-11 02:51:36'),(25,3,1,0.4200,1,0.00,0.00,1,1,NULL,'2026-10-11 02:51:36'),(26,3,6,1.0000,3,0.00,0.00,2,1,NULL,'2026-10-11 02:51:36'),(27,3,8,1.0000,3,0.00,0.00,3,1,NULL,'2026-10-11 02:51:36'),(28,2,1,1.8500,1,0.00,0.00,1,1,NULL,'2026-10-11 02:51:36'),(29,2,3,1.0000,3,0.00,0.00,2,1,NULL,'2026-10-11 02:51:36'),(30,2,4,1.0000,3,0.00,0.00,3,1,NULL,'2026-10-11 02:51:36'),(31,2,5,2.0000,3,0.00,0.00,4,1,NULL,'2026-10-11 02:51:36'),(32,2,6,3.0000,3,0.00,0.00,5,1,NULL,'2026-10-11 02:51:36'),(33,2,7,1.0000,3,0.00,0.00,6,1,NULL,'2026-10-11 02:51:36'),(34,2,8,1.0000,3,0.00,0.00,7,1,NULL,'2026-10-11 02:51:36');
/*!40000 ALTER TABLE `bom_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `category_name` varchar(150) NOT NULL,
  `category_code` varchar(50) NOT NULL,
  `category_type` enum('RM','FG','BOTH') DEFAULT 'BOTH',
  `description` text DEFAULT NULL,
  `active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `category_code` (`category_code`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES (1,'Metals & Brass Alloys','CAT-RM-MET','RM','Raw brass rods, ingots, copper sheets and extruded metals',1,'2026-10-08 14:00:53','2026-10-08 14:00:53'),(2,'Valves & Cartridges','CAT-RM-COMP','RM','Ceramic cartridges, spindles, aerators and inner mechanisms',1,'2026-10-08 14:00:53','2026-10-08 14:00:53'),(3,'Fasteners & Seals','CAT-RM-FAST','RM','Rubber O-rings, SS screws, washers, washers and gaskets',1,'2026-10-08 14:00:53','2026-10-08 14:00:53'),(4,'Packaging Materials','CAT-RM-PACK','RM','Inner boxes, bubble wrap, master cartons and labels',1,'2026-10-08 14:00:53','2026-10-08 14:00:53'),(5,'Premium Basin Taps','CAT-FG-TAPS','FG','Chrome & Matte finished brass basin mixer taps and pillar taps',1,'2026-10-08 14:00:53','2026-10-08 14:00:53'),(6,'Kitchen Sink Mixers','CAT-FG-SINK','FG','Swivel spout kitchen sink mixers and pull-out faucets',1,'2026-10-08 14:00:53','2026-10-08 14:00:53'),(7,'Angle & Concealed Valves','CAT-FG-VALV','FG','Heavy brass 2-in-1 angle cocks and concealed stop valves',1,'2026-10-08 14:00:53','2026-10-08 14:00:53'),(8,'ABS ACCESSORIES','ABS_ACCESSORIES','FG',NULL,1,'2026-10-09 02:24:41','2026-10-09 02:24:41'),(9,'ABS CONTY','ABS_CONTY','FG',NULL,1,'2026-10-09 02:24:41','2026-10-09 02:24:41'),(10,'OVERHEAD SHOWER ABS','OVERHEAD_SHOWER_ABS','FG',NULL,1,'2026-10-09 02:24:41','2026-10-09 02:24:41'),(11,'PROJECT ANGLE COCK','PROJECT_ANGLE_COCK','FG',NULL,1,'2026-10-09 02:24:41','2026-10-09 02:24:41'),(12,'ARALIA SERIES','ARALIA_SERIES','FG',NULL,1,'2026-10-09 02:24:41','2026-10-09 02:24:41'),(13,'AUTOMATIC FAUCET','AUTOMATIC_FAUCET','FG',NULL,1,'2026-10-09 02:24:41','2026-10-09 02:24:41'),(14,'BATH ROOM CHAIR','BATH_ROOM_CHAIR','FG',NULL,1,'2026-10-09 02:24:41','2026-10-09 02:24:41'),(15,'BEND SHOWER 100 SERIES','BEND_SHOWER_100_SERIES','FG',NULL,1,'2026-10-09 02:24:41','2026-10-09 02:24:41'),(16,'BEND SHOWER 300 SERIES','BEND_SHOWER_300_SERIES','FG',NULL,1,'2026-10-09 02:24:41','2026-10-09 02:24:41'),(17,'O/H ABS + BRASS SHOWER','O_H_ABS___BRASS_SHOWER','FG',NULL,1,'2026-10-09 02:24:41','2026-10-09 02:24:41'),(18,'SHOWER BEND','SHOWER_BEND','FG',NULL,1,'2026-10-09 02:24:42','2026-10-09 02:24:42'),(19,'Bottle Trap','B______T___','FG',NULL,1,'2026-10-09 02:24:42','2026-10-09 02:24:42'),(20,'Bottle Trap Pipe','B______T____P___','FG',NULL,1,'2026-10-09 02:24:42','2026-10-09 02:24:42');
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `company_settings`
--

DROP TABLE IF EXISTS `company_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `company_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_name` varchar(200) NOT NULL DEFAULT 'Bharat Impex',
  `address` text DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `gstin` varchar(50) DEFAULT NULL,
  `currency` varchar(10) DEFAULT 'INR (???)',
  `currency_symbol` varchar(10) DEFAULT '???',
  `timezone` varchar(100) DEFAULT 'Asia/Kolkata',
  `logo_url` text DEFAULT NULL,
  `allow_negative_stock` tinyint(1) DEFAULT 0,
  `default_warehouse_id` int(11) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `company_settings`
--

LOCK TABLES `company_settings` WRITE;
/*!40000 ALTER TABLE `company_settings` DISABLE KEYS */;
INSERT INTO `company_settings` VALUES (1,'Bharat Impex Sanitary & Hardware Pvt Ltd','Plot 42-45, Industrial Area Phase II, Jamnagar, Gujarat 361004','+91 (0288) 2554100','contact@bharatimpex.com','24AAACB2345M1ZV','INR (???)','???','Asia/Kolkata',NULL,0,1,'2026-10-08 14:00:53');
/*!40000 ALTER TABLE `company_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `daily_stock_snapshots`
--

DROP TABLE IF EXISTS `daily_stock_snapshots`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `daily_stock_snapshots` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `snapshot_date` date NOT NULL,
  `material_type` enum('RM','FG','SCRAP') NOT NULL,
  `material_id` int(11) NOT NULL,
  `material_code` varchar(50) NOT NULL,
  `group_name` varchar(150) DEFAULT NULL,
  `closing_stock` decimal(14,3) NOT NULL DEFAULT 0.000,
  `max_level` decimal(14,3) NOT NULL DEFAULT 0.000,
  `min_level` decimal(14,3) NOT NULL DEFAULT 0.000,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_date_mat` (`snapshot_date`,`material_type`,`material_id`),
  KEY `idx_snap_date` (`snapshot_date`)
) ENGINE=InnoDB AUTO_INCREMENT=502 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `daily_stock_snapshots`
--

LOCK TABLES `daily_stock_snapshots` WRITE;
/*!40000 ALTER TABLE `daily_stock_snapshots` DISABLE KEYS */;
INSERT INTO `daily_stock_snapshots` VALUES (1,'2026-10-05','FG',4,'ABS-7522','ABS ACCESSORIES',15.000,25.000,10.000,'2026-10-09 02:24:41'),(2,'2026-10-06','FG',4,'ABS-7522','ABS ACCESSORIES',15.000,25.000,10.000,'2026-10-09 02:24:41'),(3,'2026-10-07','FG',4,'ABS-7522','ABS ACCESSORIES',15.000,25.000,10.000,'2026-10-09 02:24:41'),(4,'2026-10-08','FG',4,'ABS-7522','ABS ACCESSORIES',15.000,25.000,10.000,'2026-10-09 02:24:41'),(5,'2026-10-05','FG',5,'ABS-7521','ABS ACCESSORIES',60.000,25.000,10.000,'2026-10-09 02:24:41'),(6,'2026-10-06','FG',5,'ABS-7521','ABS ACCESSORIES',60.000,25.000,10.000,'2026-10-09 02:24:41'),(7,'2026-10-07','FG',5,'ABS-7521','ABS ACCESSORIES',60.000,25.000,10.000,'2026-10-09 02:24:41'),(8,'2026-10-08','FG',5,'ABS-7521','ABS ACCESSORIES',60.000,25.000,10.000,'2026-10-09 02:24:41'),(9,'2026-10-05','FG',6,'ABS-7524','ABS ACCESSORIES',57.000,25.000,10.000,'2026-10-09 02:24:41'),(10,'2026-10-06','FG',6,'ABS-7524','ABS ACCESSORIES',57.000,25.000,10.000,'2026-10-09 02:24:41'),(11,'2026-10-07','FG',6,'ABS-7524','ABS ACCESSORIES',57.000,25.000,10.000,'2026-10-09 02:24:41'),(12,'2026-10-08','FG',6,'ABS-7524','ABS ACCESSORIES',57.000,25.000,10.000,'2026-10-09 02:24:41'),(13,'2026-10-05','FG',7,'CON-1408','ABS CONTY',31.000,20.000,10.000,'2026-10-09 02:24:41'),(14,'2026-10-06','FG',7,'CON-1408','ABS CONTY',31.000,20.000,10.000,'2026-10-09 02:24:41'),(15,'2026-10-07','FG',7,'CON-1408','ABS CONTY',31.000,20.000,10.000,'2026-10-09 02:24:41'),(16,'2026-10-08','FG',7,'CON-1408','ABS CONTY',31.000,20.000,10.000,'2026-10-09 02:24:41'),(17,'2026-10-05','FG',8,'CON-1403','ABS CONTY',72.000,100.000,20.000,'2026-10-09 02:24:41'),(18,'2026-10-06','FG',8,'CON-1403','ABS CONTY',72.000,100.000,20.000,'2026-10-09 02:24:41'),(19,'2026-10-07','FG',8,'CON-1403','ABS CONTY',72.000,100.000,20.000,'2026-10-09 02:24:41'),(20,'2026-10-08','FG',8,'CON-1403','ABS CONTY',72.000,100.000,20.000,'2026-10-09 02:24:41'),(21,'2026-10-05','FG',9,'CON-1404','ABS CONTY',141.000,150.000,30.000,'2026-10-09 02:24:41'),(22,'2026-10-06','FG',9,'CON-1404','ABS CONTY',141.000,150.000,30.000,'2026-10-09 02:24:41'),(23,'2026-10-07','FG',9,'CON-1404','ABS CONTY',141.000,150.000,30.000,'2026-10-09 02:24:41'),(24,'2026-10-08','FG',9,'CON-1404','ABS CONTY',141.000,150.000,30.000,'2026-10-09 02:24:41'),(25,'2026-10-05','FG',10,'OHA-2766-BK','OVERHEAD SHOWER ABS',0.000,300.000,50.000,'2026-10-09 02:24:41'),(26,'2026-10-06','FG',10,'OHA-2766-BK','OVERHEAD SHOWER ABS',0.000,300.000,50.000,'2026-10-09 02:24:41'),(27,'2026-10-07','FG',10,'OHA-2766-BK','OVERHEAD SHOWER ABS',0.000,300.000,50.000,'2026-10-09 02:24:41'),(28,'2026-10-08','FG',10,'OHA-2766-BK','OVERHEAD SHOWER ABS',0.000,300.000,50.000,'2026-10-09 02:24:41'),(29,'2026-10-05','FG',11,'PAC-1274','PROJECT ANGLE COCK',0.000,500.000,50.000,'2026-10-09 02:24:41'),(30,'2026-10-06','FG',11,'PAC-1274','PROJECT ANGLE COCK',0.000,500.000,50.000,'2026-10-09 02:24:41'),(31,'2026-10-07','FG',11,'PAC-1274','PROJECT ANGLE COCK',0.000,500.000,50.000,'2026-10-09 02:24:41'),(32,'2026-10-08','FG',11,'PAC-1274','PROJECT ANGLE COCK',0.000,500.000,50.000,'2026-10-09 02:24:41'),(33,'2026-10-05','FG',12,'ARA-7108','ARALIA SERIES',8.000,0.000,5.000,'2026-10-09 02:24:41'),(34,'2026-10-06','FG',12,'ARA-7108','ARALIA SERIES',8.000,0.000,5.000,'2026-10-09 02:24:41'),(35,'2026-10-07','FG',12,'ARA-7108','ARALIA SERIES',8.000,0.000,5.000,'2026-10-09 02:24:41'),(36,'2026-10-08','FG',12,'ARA-7108','ARALIA SERIES',8.000,0.000,5.000,'2026-10-09 02:24:41'),(37,'2026-10-05','FG',13,'ARA-7102','ARALIA SERIES',14.000,0.000,5.000,'2026-10-09 02:24:41'),(38,'2026-10-06','FG',13,'ARA-7102','ARALIA SERIES',14.000,0.000,5.000,'2026-10-09 02:24:41'),(39,'2026-10-07','FG',13,'ARA-7102','ARALIA SERIES',14.000,0.000,5.000,'2026-10-09 02:24:41'),(40,'2026-10-08','FG',13,'ARA-7102','ARALIA SERIES',14.000,0.000,5.000,'2026-10-09 02:24:41'),(41,'2026-10-05','FG',14,'APC-1265','AUTOMATIC FAUCET',19.000,50.000,10.000,'2026-10-09 02:24:41'),(42,'2026-10-06','FG',14,'APC-1265','AUTOMATIC FAUCET',19.000,50.000,10.000,'2026-10-09 02:24:41'),(43,'2026-10-07','FG',14,'APC-1265','AUTOMATIC FAUCET',19.000,50.000,10.000,'2026-10-09 02:24:41'),(44,'2026-10-08','FG',14,'APC-1265','AUTOMATIC FAUCET',19.000,50.000,10.000,'2026-10-09 02:24:41'),(45,'2026-10-05','FG',15,'8400','BATH ROOM CHAIR',24.000,0.000,5.000,'2026-10-09 02:24:41'),(46,'2026-10-06','FG',15,'8400','BATH ROOM CHAIR',24.000,0.000,5.000,'2026-10-09 02:24:41'),(47,'2026-10-07','FG',15,'8400','BATH ROOM CHAIR',24.000,0.000,5.000,'2026-10-09 02:24:41'),(48,'2026-10-08','FG',15,'8400','BATH ROOM CHAIR',24.000,0.000,5.000,'2026-10-09 02:24:41'),(49,'2026-10-05','FG',16,'BSR-2103','BEND SHOWER 100 SERIES',173.000,100.000,20.000,'2026-10-09 02:24:41'),(50,'2026-10-06','FG',16,'BSR-2103','BEND SHOWER 100 SERIES',173.000,100.000,20.000,'2026-10-09 02:24:41'),(51,'2026-10-07','FG',16,'BSR-2103','BEND SHOWER 100 SERIES',173.000,100.000,20.000,'2026-10-09 02:24:41'),(52,'2026-10-08','FG',16,'BSR-2103','BEND SHOWER 100 SERIES',173.000,100.000,20.000,'2026-10-09 02:24:41'),(53,'2026-10-05','FG',17,'BSR-2102','BEND SHOWER 100 SERIES',253.000,100.000,20.000,'2026-10-09 02:24:41'),(54,'2026-10-06','FG',17,'BSR-2102','BEND SHOWER 100 SERIES',253.000,100.000,20.000,'2026-10-09 02:24:41'),(55,'2026-10-07','FG',17,'BSR-2102','BEND SHOWER 100 SERIES',253.000,100.000,20.000,'2026-10-09 02:24:41'),(56,'2026-10-08','FG',17,'BSR-2102','BEND SHOWER 100 SERIES',253.000,100.000,20.000,'2026-10-09 02:24:41'),(57,'2026-10-05','FG',18,'BSR-2105','BEND SHOWER 100 SERIES',329.000,0.000,20.000,'2026-10-09 02:24:41'),(58,'2026-10-06','FG',18,'BSR-2105','BEND SHOWER 100 SERIES',329.000,0.000,20.000,'2026-10-09 02:24:41'),(59,'2026-10-07','FG',18,'BSR-2105','BEND SHOWER 100 SERIES',329.000,0.000,20.000,'2026-10-09 02:24:41'),(60,'2026-10-08','FG',18,'BSR-2105','BEND SHOWER 100 SERIES',329.000,0.000,20.000,'2026-10-09 02:24:41'),(61,'2026-10-05','FG',19,'BSR-2366','BEND SHOWER 300 SERIES',118.000,50.000,15.000,'2026-10-09 02:24:41'),(62,'2026-10-06','FG',19,'BSR-2366','BEND SHOWER 300 SERIES',118.000,50.000,15.000,'2026-10-09 02:24:41'),(63,'2026-10-07','FG',19,'BSR-2366','BEND SHOWER 300 SERIES',118.000,50.000,15.000,'2026-10-09 02:24:41'),(64,'2026-10-08','FG',19,'BSR-2366','BEND SHOWER 300 SERIES',118.000,50.000,15.000,'2026-10-09 02:24:41'),(65,'2026-10-05','FG',20,'BSR-2356','BEND SHOWER 300 SERIES',153.000,50.000,15.000,'2026-10-09 02:24:41'),(66,'2026-10-06','FG',20,'BSR-2356','BEND SHOWER 300 SERIES',153.000,50.000,15.000,'2026-10-09 02:24:41'),(67,'2026-10-07','FG',20,'BSR-2356','BEND SHOWER 300 SERIES',153.000,50.000,15.000,'2026-10-09 02:24:41'),(68,'2026-10-08','FG',20,'BSR-2356','BEND SHOWER 300 SERIES',153.000,50.000,15.000,'2026-10-09 02:24:41'),(69,'2026-10-05','FG',21,'BSR-2361','BEND SHOWER 300 SERIES',79.000,50.000,15.000,'2026-10-09 02:24:41'),(70,'2026-10-06','FG',21,'BSR-2361','BEND SHOWER 300 SERIES',79.000,50.000,15.000,'2026-10-09 02:24:41'),(71,'2026-10-07','FG',21,'BSR-2361','BEND SHOWER 300 SERIES',79.000,50.000,15.000,'2026-10-09 02:24:41'),(72,'2026-10-08','FG',21,'BSR-2361','BEND SHOWER 300 SERIES',79.000,50.000,15.000,'2026-10-09 02:24:41'),(73,'2026-10-05','FG',22,'BSR-2369','O/H ABS + BRASS SHOWER',0.000,50.000,10.000,'2026-10-09 02:24:41'),(74,'2026-10-06','FG',22,'BSR-2369','O/H ABS + BRASS SHOWER',0.000,50.000,10.000,'2026-10-09 02:24:41'),(75,'2026-10-07','FG',22,'BSR-2369','O/H ABS + BRASS SHOWER',0.000,50.000,10.000,'2026-10-09 02:24:41'),(76,'2026-10-08','FG',22,'BSR-2369','O/H ABS + BRASS SHOWER',0.000,50.000,10.000,'2026-10-09 02:24:41'),(77,'2026-10-05','FG',23,'BSR-2364','BEND SHOWER 300 SERIES',353.000,150.000,25.000,'2026-10-09 02:24:41'),(78,'2026-10-06','FG',23,'BSR-2364','BEND SHOWER 300 SERIES',353.000,150.000,25.000,'2026-10-09 02:24:41'),(79,'2026-10-07','FG',23,'BSR-2364','BEND SHOWER 300 SERIES',353.000,150.000,25.000,'2026-10-09 02:24:41'),(80,'2026-10-08','FG',23,'BSR-2364','BEND SHOWER 300 SERIES',353.000,150.000,25.000,'2026-10-09 02:24:41'),(81,'2026-10-05','FG',24,'BSR-2365','BEND SHOWER 300 SERIES',167.000,100.000,20.000,'2026-10-09 02:24:41'),(82,'2026-10-06','FG',24,'BSR-2365','BEND SHOWER 300 SERIES',167.000,100.000,20.000,'2026-10-09 02:24:41'),(83,'2026-10-07','FG',24,'BSR-2365','BEND SHOWER 300 SERIES',167.000,100.000,20.000,'2026-10-09 02:24:41'),(84,'2026-10-08','FG',24,'BSR-2365','BEND SHOWER 300 SERIES',167.000,100.000,20.000,'2026-10-09 02:24:41'),(85,'2026-10-05','FG',25,'BSR-2367','BEND SHOWER 300 SERIES',113.000,50.000,15.000,'2026-10-09 02:24:41'),(86,'2026-10-06','FG',25,'BSR-2367','BEND SHOWER 300 SERIES',113.000,50.000,15.000,'2026-10-09 02:24:41'),(87,'2026-10-07','FG',25,'BSR-2367','BEND SHOWER 300 SERIES',113.000,50.000,15.000,'2026-10-09 02:24:41'),(88,'2026-10-08','FG',25,'BSR-2367','BEND SHOWER 300 SERIES',113.000,50.000,15.000,'2026-10-09 02:24:41'),(89,'2026-10-05','FG',26,'BSR-2371','BEND SHOWER 300 SERIES',106.000,100.000,20.000,'2026-10-09 02:24:41'),(90,'2026-10-06','FG',26,'BSR-2371','BEND SHOWER 300 SERIES',106.000,100.000,20.000,'2026-10-09 02:24:41'),(91,'2026-10-07','FG',26,'BSR-2371','BEND SHOWER 300 SERIES',106.000,100.000,20.000,'2026-10-09 02:24:41'),(92,'2026-10-08','FG',26,'BSR-2371','BEND SHOWER 300 SERIES',106.000,100.000,20.000,'2026-10-09 02:24:41'),(93,'2026-10-05','FG',27,'BSR-2372','BEND SHOWER 300 SERIES',340.000,50.000,15.000,'2026-10-09 02:24:42'),(94,'2026-10-06','FG',27,'BSR-2372','BEND SHOWER 300 SERIES',340.000,50.000,15.000,'2026-10-09 02:24:42'),(95,'2026-10-07','FG',27,'BSR-2372','BEND SHOWER 300 SERIES',340.000,50.000,15.000,'2026-10-09 02:24:42'),(96,'2026-10-08','FG',27,'BSR-2372','BEND SHOWER 300 SERIES',340.000,50.000,15.000,'2026-10-09 02:24:42'),(97,'2026-10-05','FG',28,'BSR-2418','O/H ABS + BRASS SHOWER',0.000,50.000,10.000,'2026-10-09 02:24:42'),(98,'2026-10-06','FG',28,'BSR-2418','O/H ABS + BRASS SHOWER',0.000,50.000,10.000,'2026-10-09 02:24:42'),(99,'2026-10-07','FG',28,'BSR-2418','O/H ABS + BRASS SHOWER',0.000,50.000,10.000,'2026-10-09 02:24:42'),(100,'2026-10-08','FG',28,'BSR-2418','O/H ABS + BRASS SHOWER',0.000,50.000,10.000,'2026-10-09 02:24:42'),(101,'2026-10-05','FG',29,'OHA-2645','SHOWER BEND',11.000,0.000,5.000,'2026-10-09 02:24:42'),(102,'2026-10-06','FG',29,'OHA-2645','SHOWER BEND',11.000,0.000,5.000,'2026-10-09 02:24:42'),(103,'2026-10-07','FG',29,'OHA-2645','SHOWER BEND',11.000,0.000,5.000,'2026-10-09 02:24:42'),(104,'2026-10-08','FG',29,'OHA-2645','SHOWER BEND',11.000,0.000,5.000,'2026-10-09 02:24:42'),(105,'2026-10-05','FG',30,'BTP-1903','Bottle Trap',56.000,50.000,15.000,'2026-10-09 02:24:42'),(106,'2026-10-06','FG',30,'BTP-1903','Bottle Trap',56.000,50.000,15.000,'2026-10-09 02:24:42'),(107,'2026-10-07','FG',30,'BTP-1903','Bottle Trap',56.000,50.000,15.000,'2026-10-09 02:24:42'),(108,'2026-10-08','FG',30,'BTP-1903','Bottle Trap',56.000,50.000,15.000,'2026-10-09 02:24:42'),(109,'2026-10-05','FG',31,'BTP-1901','Bottle Trap',318.000,300.000,50.000,'2026-10-09 02:24:42'),(110,'2026-10-06','FG',31,'BTP-1901','Bottle Trap',318.000,300.000,50.000,'2026-10-09 02:24:42'),(111,'2026-10-07','FG',31,'BTP-1901','Bottle Trap',314.000,300.000,50.000,'2026-10-09 02:24:42'),(112,'2026-10-08','FG',31,'BTP-1901','Bottle Trap',314.000,300.000,50.000,'2026-10-09 02:24:42'),(113,'2026-10-05','FG',32,'BTP-8718','Bottle Trap Pipe',43.000,100.000,20.000,'2026-10-09 02:24:42'),(114,'2026-10-06','FG',32,'BTP-8718','Bottle Trap Pipe',43.000,100.000,20.000,'2026-10-09 02:24:42'),(115,'2026-10-07','FG',32,'BTP-8718','Bottle Trap Pipe',39.000,100.000,20.000,'2026-10-09 02:24:42'),(116,'2026-10-08','FG',32,'BTP-8718','Bottle Trap Pipe',39.000,100.000,20.000,'2026-10-09 02:24:42'),(117,'2026-10-05','FG',33,'BTP-8714','Bottle Trap Pipe',651.000,250.000,50.000,'2026-10-09 02:24:42'),(118,'2026-10-06','FG',33,'BTP-8714','Bottle Trap Pipe',651.000,250.000,50.000,'2026-10-09 02:24:42'),(119,'2026-10-07','FG',33,'BTP-8714','Bottle Trap Pipe',651.000,250.000,50.000,'2026-10-09 02:24:42'),(120,'2026-10-08','FG',33,'BTP-8714','Bottle Trap Pipe',651.000,250.000,50.000,'2026-10-09 02:24:42'),(121,'2026-10-09','FG',1,'FG-000001','Premium Basin Taps',0.000,1000.000,50.000,'2026-10-10 15:21:46'),(122,'2026-10-09','FG',2,'FG-000002','Kitchen Sink Mixers',0.000,800.000,30.000,'2026-10-10 15:21:46'),(123,'2026-10-09','FG',3,'FG-000003','Angle & Concealed Valves',0.000,2000.000,100.000,'2026-10-10 15:21:46'),(124,'2026-10-09','FG',4,'ABS-7522','ABS ACCESSORIES',15.000,25.000,10.000,'2026-10-10 15:21:46'),(125,'2026-10-09','FG',5,'ABS-7521','ABS ACCESSORIES',60.000,25.000,10.000,'2026-10-10 15:21:46'),(126,'2026-10-09','FG',6,'ABS-7524','ABS ACCESSORIES',57.000,25.000,10.000,'2026-10-10 15:21:46'),(127,'2026-10-09','FG',7,'CON-1408','ABS CONTY',31.000,20.000,10.000,'2026-10-10 15:21:46'),(128,'2026-10-09','FG',8,'CON-1403','ABS CONTY',72.000,100.000,20.000,'2026-10-10 15:21:46'),(129,'2026-10-09','FG',9,'CON-1404','ABS CONTY',141.000,150.000,30.000,'2026-10-10 15:21:46'),(130,'2026-10-09','FG',10,'OHA-2766-BK','OVERHEAD SHOWER ABS',0.000,300.000,50.000,'2026-10-10 15:21:46'),(131,'2026-10-09','FG',11,'PAC-1274','PROJECT ANGLE COCK',0.000,500.000,50.000,'2026-10-10 15:21:46'),(132,'2026-10-09','FG',12,'ARA-7108','ARALIA SERIES',8.000,0.000,5.000,'2026-10-10 15:21:46'),(133,'2026-10-09','FG',13,'ARA-7102','ARALIA SERIES',14.000,0.000,5.000,'2026-10-10 15:21:46'),(134,'2026-10-09','FG',14,'APC-1265','AUTOMATIC FAUCET',19.000,50.000,10.000,'2026-10-10 15:21:46'),(135,'2026-10-09','FG',15,'8400','BATH ROOM CHAIR',24.000,0.000,5.000,'2026-10-10 15:21:46'),(136,'2026-10-09','FG',16,'BSR-2103','BEND SHOWER 100 SERIES',173.000,100.000,20.000,'2026-10-10 15:21:46'),(137,'2026-10-09','FG',17,'BSR-2102','BEND SHOWER 100 SERIES',253.000,100.000,20.000,'2026-10-10 15:21:46'),(138,'2026-10-09','FG',18,'BSR-2105','BEND SHOWER 100 SERIES',329.000,0.000,20.000,'2026-10-10 15:21:46'),(139,'2026-10-09','FG',19,'BSR-2366','BEND SHOWER 300 SERIES',118.000,50.000,15.000,'2026-10-10 15:21:46'),(140,'2026-10-09','FG',20,'BSR-2356','BEND SHOWER 300 SERIES',153.000,50.000,15.000,'2026-10-10 15:21:46'),(141,'2026-10-09','FG',21,'BSR-2361','BEND SHOWER 300 SERIES',79.000,50.000,15.000,'2026-10-10 15:21:46'),(142,'2026-10-09','FG',22,'BSR-2369','O/H ABS + BRASS SHOWER',0.000,50.000,10.000,'2026-10-10 15:21:46'),(143,'2026-10-09','FG',23,'BSR-2364','BEND SHOWER 300 SERIES',353.000,150.000,25.000,'2026-10-10 15:21:46'),(144,'2026-10-09','FG',24,'BSR-2365','BEND SHOWER 300 SERIES',167.000,100.000,20.000,'2026-10-10 15:21:46'),(145,'2026-10-09','FG',25,'BSR-2367','BEND SHOWER 300 SERIES',113.000,50.000,15.000,'2026-10-10 15:21:46'),(146,'2026-10-09','FG',26,'BSR-2371','BEND SHOWER 300 SERIES',106.000,100.000,20.000,'2026-10-10 15:21:46'),(147,'2026-10-09','FG',27,'BSR-2372','BEND SHOWER 300 SERIES',340.000,50.000,15.000,'2026-10-10 15:21:46'),(148,'2026-10-09','FG',28,'BSR-2418','O/H ABS + BRASS SHOWER',0.000,50.000,10.000,'2026-10-10 15:21:46'),(149,'2026-10-09','FG',29,'OHA-2645','SHOWER BEND',11.000,0.000,5.000,'2026-10-10 15:21:46'),(150,'2026-10-09','FG',30,'BTP-1903','Bottle Trap',56.000,50.000,15.000,'2026-10-10 15:21:46'),(151,'2026-10-09','FG',31,'BTP-1901','Bottle Trap',314.000,300.000,50.000,'2026-10-10 15:21:46'),(152,'2026-10-09','FG',32,'BTP-8718','Bottle Trap Pipe',39.000,100.000,20.000,'2026-10-10 15:21:46'),(153,'2026-10-09','FG',33,'BTP-8714','Bottle Trap Pipe',651.000,250.000,50.000,'2026-10-10 15:21:46'),(154,'2026-10-10','FG',1,'FG-000001','Premium Basin Taps',0.000,1000.000,50.000,'2026-10-10 15:21:46'),(155,'2026-10-10','FG',2,'FG-000002','Kitchen Sink Mixers',0.000,800.000,30.000,'2026-10-10 15:21:46'),(156,'2026-10-10','FG',3,'FG-000003','Angle & Concealed Valves',0.000,2000.000,100.000,'2026-10-10 15:21:46'),(157,'2026-10-10','FG',4,'ABS-7522','ABS ACCESSORIES',15.000,25.000,10.000,'2026-10-10 15:21:46'),(158,'2026-10-10','FG',5,'ABS-7521','ABS ACCESSORIES',60.000,25.000,10.000,'2026-10-10 15:21:46'),(159,'2026-10-10','FG',6,'ABS-7524','ABS ACCESSORIES',57.000,25.000,10.000,'2026-10-10 15:21:46'),(160,'2026-10-10','FG',7,'CON-1408','ABS CONTY',31.000,20.000,10.000,'2026-10-10 15:21:46'),(161,'2026-10-10','FG',8,'CON-1403','ABS CONTY',72.000,100.000,20.000,'2026-10-10 15:21:46'),(162,'2026-10-10','FG',9,'CON-1404','ABS CONTY',141.000,150.000,30.000,'2026-10-10 15:21:46'),(163,'2026-10-10','FG',10,'OHA-2766-BK','OVERHEAD SHOWER ABS',0.000,300.000,50.000,'2026-10-10 15:21:46'),(164,'2026-10-10','FG',11,'PAC-1274','PROJECT ANGLE COCK',0.000,500.000,50.000,'2026-10-10 15:21:46'),(165,'2026-10-10','FG',12,'ARA-7108','ARALIA SERIES',8.000,0.000,5.000,'2026-10-10 15:21:46'),(166,'2026-10-10','FG',13,'ARA-7102','ARALIA SERIES',14.000,0.000,5.000,'2026-10-10 15:21:46'),(167,'2026-10-10','FG',14,'APC-1265','AUTOMATIC FAUCET',19.000,50.000,10.000,'2026-10-10 15:21:46'),(168,'2026-10-10','FG',15,'8400','BATH ROOM CHAIR',24.000,0.000,5.000,'2026-10-10 15:21:46'),(169,'2026-10-10','FG',16,'BSR-2103','BEND SHOWER 100 SERIES',173.000,100.000,20.000,'2026-10-10 15:21:46'),(170,'2026-10-10','FG',17,'BSR-2102','BEND SHOWER 100 SERIES',253.000,100.000,20.000,'2026-10-10 15:21:46'),(171,'2026-10-10','FG',18,'BSR-2105','BEND SHOWER 100 SERIES',329.000,0.000,20.000,'2026-10-10 15:21:46'),(172,'2026-10-10','FG',19,'BSR-2366','BEND SHOWER 300 SERIES',118.000,50.000,15.000,'2026-10-10 15:21:46'),(173,'2026-10-10','FG',20,'BSR-2356','BEND SHOWER 300 SERIES',153.000,50.000,15.000,'2026-10-10 15:21:46'),(174,'2026-10-10','FG',21,'BSR-2361','BEND SHOWER 300 SERIES',79.000,50.000,15.000,'2026-10-10 15:21:46'),(175,'2026-10-10','FG',22,'BSR-2369','O/H ABS + BRASS SHOWER',0.000,50.000,10.000,'2026-10-10 15:21:46'),(176,'2026-10-10','FG',23,'BSR-2364','BEND SHOWER 300 SERIES',353.000,150.000,25.000,'2026-10-10 15:21:46'),(177,'2026-10-10','FG',24,'BSR-2365','BEND SHOWER 300 SERIES',167.000,100.000,20.000,'2026-10-10 15:21:46'),(178,'2026-10-10','FG',25,'BSR-2367','BEND SHOWER 300 SERIES',113.000,50.000,15.000,'2026-10-10 15:21:46'),(179,'2026-10-10','FG',26,'BSR-2371','BEND SHOWER 300 SERIES',106.000,100.000,20.000,'2026-10-10 15:21:46'),(180,'2026-10-10','FG',27,'BSR-2372','BEND SHOWER 300 SERIES',340.000,50.000,15.000,'2026-10-10 15:21:46'),(181,'2026-10-10','FG',28,'BSR-2418','O/H ABS + BRASS SHOWER',0.000,50.000,10.000,'2026-10-10 15:21:46'),(182,'2026-10-10','FG',29,'OHA-2645','SHOWER BEND',11.000,0.000,5.000,'2026-10-10 15:21:46'),(183,'2026-10-10','FG',30,'BTP-1903','Bottle Trap',56.000,50.000,15.000,'2026-10-10 15:21:46'),(184,'2026-10-10','FG',31,'BTP-1901','Bottle Trap',314.000,300.000,50.000,'2026-10-10 15:21:46'),(185,'2026-10-10','FG',32,'BTP-8718','Bottle Trap Pipe',39.000,100.000,20.000,'2026-10-10 15:21:46'),(186,'2026-10-10','FG',33,'BTP-8714','Bottle Trap Pipe',651.000,250.000,50.000,'2026-10-10 15:21:46'),(187,'2026-10-11','FG',1,'FG-000001','Premium Basin Taps',0.000,1000.000,50.000,'2026-10-12 15:44:02'),(188,'2026-10-11','FG',2,'FG-000002','Kitchen Sink Mixers',0.000,800.000,30.000,'2026-10-12 15:44:02'),(189,'2026-10-11','FG',3,'FG-000003','Angle & Concealed Valves',0.000,2000.000,100.000,'2026-10-12 15:44:02'),(190,'2026-10-11','FG',4,'ABS-7522','ABS ACCESSORIES',15.000,25.000,10.000,'2026-10-12 15:44:02'),(191,'2026-10-11','FG',5,'ABS-7521','ABS ACCESSORIES',60.000,25.000,10.000,'2026-10-12 15:44:02'),(192,'2026-10-11','FG',6,'ABS-7524','ABS ACCESSORIES',57.000,25.000,10.000,'2026-10-12 15:44:02'),(193,'2026-10-11','FG',7,'CON-1408','ABS CONTY',30.000,20.000,10.000,'2026-10-12 15:44:02'),(194,'2026-10-11','FG',8,'CON-1403','ABS CONTY',72.000,100.000,20.000,'2026-10-12 15:44:02'),(195,'2026-10-11','FG',9,'CON-1404','ABS CONTY',141.000,150.000,30.000,'2026-10-12 15:44:02'),(196,'2026-10-11','FG',10,'OHA-2766-BK','OVERHEAD SHOWER ABS',0.000,300.000,50.000,'2026-10-12 15:44:02'),(197,'2026-10-11','FG',11,'PAC-1274','PROJECT ANGLE COCK',0.000,500.000,50.000,'2026-10-12 15:44:02'),(198,'2026-10-11','FG',12,'ARA-7108','ARALIA SERIES',8.000,0.000,5.000,'2026-10-12 15:44:02'),(199,'2026-10-11','FG',13,'ARA-7102','ARALIA SERIES',14.000,0.000,5.000,'2026-10-12 15:44:02'),(200,'2026-10-11','FG',14,'APC-1265','AUTOMATIC FAUCET',19.000,50.000,10.000,'2026-10-12 15:44:02'),(201,'2026-10-11','FG',15,'8400','BATH ROOM CHAIR',24.000,0.000,5.000,'2026-10-12 15:44:02'),(202,'2026-10-11','FG',16,'BSR-2103','BEND SHOWER 100 SERIES',173.000,100.000,20.000,'2026-10-12 15:44:02'),(203,'2026-10-11','FG',17,'BSR-2102','BEND SHOWER 100 SERIES',253.000,100.000,20.000,'2026-10-12 15:44:02'),(204,'2026-10-11','FG',18,'BSR-2105','BEND SHOWER 100 SERIES',329.000,0.000,20.000,'2026-10-12 15:44:02'),(205,'2026-10-11','FG',19,'BSR-2366','BEND SHOWER 300 SERIES',118.000,50.000,15.000,'2026-10-12 15:44:02'),(206,'2026-10-11','FG',20,'BSR-2356','BEND SHOWER 300 SERIES',153.000,50.000,15.000,'2026-10-12 15:44:02'),(207,'2026-10-11','FG',21,'BSR-2361','BEND SHOWER 300 SERIES',79.000,50.000,15.000,'2026-10-12 15:44:02'),(208,'2026-10-11','FG',22,'BSR-2369','O/H ABS + BRASS SHOWER',0.000,50.000,10.000,'2026-10-12 15:44:02'),(209,'2026-10-11','FG',23,'BSR-2364','BEND SHOWER 300 SERIES',353.000,150.000,25.000,'2026-10-12 15:44:02'),(210,'2026-10-11','FG',24,'BSR-2365','BEND SHOWER 300 SERIES',167.000,100.000,20.000,'2026-10-12 15:44:02'),(211,'2026-10-11','FG',25,'BSR-2367','BEND SHOWER 300 SERIES',113.000,50.000,15.000,'2026-10-12 15:44:02'),(212,'2026-10-11','FG',26,'BSR-2371','BEND SHOWER 300 SERIES',105.000,100.000,20.000,'2026-10-12 15:44:02'),(213,'2026-10-11','FG',27,'BSR-2372','BEND SHOWER 300 SERIES',340.000,50.000,15.000,'2026-10-12 15:44:02'),(214,'2026-10-11','FG',28,'BSR-2418','O/H ABS + BRASS SHOWER',0.000,50.000,10.000,'2026-10-12 15:44:02'),(215,'2026-10-11','FG',29,'OHA-2645','SHOWER BEND',10.000,0.000,5.000,'2026-10-12 15:44:02'),(216,'2026-10-11','FG',30,'BTP-1903','Bottle Trap',56.000,50.000,15.000,'2026-10-12 15:44:02'),(217,'2026-10-11','FG',31,'BTP-1901','Bottle Trap',314.000,300.000,50.000,'2026-10-12 15:44:02'),(218,'2026-10-11','FG',32,'BTP-8718','Bottle Trap Pipe',39.000,100.000,20.000,'2026-10-12 15:44:02'),(219,'2026-10-11','FG',33,'BTP-8714','Bottle Trap Pipe',651.000,250.000,50.000,'2026-10-12 15:44:02'),(220,'2026-10-11','FG',34,'FG-000034','GENERAL',450.000,0.000,0.000,'2026-10-12 15:44:02'),(221,'2026-10-11','FG',35,'FG-000035','GENERAL',1100.000,0.000,0.000,'2026-10-12 15:44:02'),(222,'2026-10-12','FG',1,'FG-000001','Premium Basin Taps',0.000,1000.000,50.000,'2026-10-13 13:50:59'),(223,'2026-10-12','FG',2,'FG-000002','Kitchen Sink Mixers',0.000,800.000,30.000,'2026-10-13 13:50:59'),(224,'2026-10-12','FG',3,'FG-000003','Angle & Concealed Valves',0.000,2000.000,100.000,'2026-10-13 13:50:59'),(225,'2026-10-12','FG',4,'ABS-7522','ABS ACCESSORIES',14.000,25.000,10.000,'2026-10-13 13:50:59'),(226,'2026-10-12','FG',5,'ABS-7521','ABS ACCESSORIES',60.000,25.000,10.000,'2026-10-13 13:50:59'),(227,'2026-10-12','FG',6,'ABS-7524','ABS ACCESSORIES',57.000,25.000,10.000,'2026-10-13 13:50:59'),(228,'2026-10-12','FG',7,'CON-1408','ABS CONTY',29.000,20.000,10.000,'2026-10-13 13:50:59'),(229,'2026-10-12','FG',8,'CON-1403','ABS CONTY',72.000,100.000,20.000,'2026-10-13 13:50:59'),(230,'2026-10-12','FG',9,'CON-1404','ABS CONTY',141.000,150.000,30.000,'2026-10-13 13:50:59'),(231,'2026-10-12','FG',10,'OHA-2766-BK','OVERHEAD SHOWER ABS',0.000,300.000,50.000,'2026-10-13 13:50:59'),(232,'2026-10-12','FG',11,'PAC-1274','PROJECT ANGLE COCK',0.000,500.000,50.000,'2026-10-13 13:50:59'),(233,'2026-10-12','FG',12,'ARA-7108','ARALIA SERIES',8.000,0.000,5.000,'2026-10-13 13:50:59'),(234,'2026-10-12','FG',13,'ARA-7102','ARALIA SERIES',14.000,0.000,5.000,'2026-10-13 13:50:59'),(235,'2026-10-12','FG',14,'APC-1265','AUTOMATIC FAUCET',19.000,50.000,10.000,'2026-10-13 13:50:59'),(236,'2026-10-12','FG',15,'8400','BATH ROOM CHAIR',24.000,0.000,5.000,'2026-10-13 13:50:59'),(237,'2026-10-12','FG',16,'BSR-2103','BEND SHOWER 100 SERIES',173.000,100.000,20.000,'2026-10-13 13:50:59'),(238,'2026-10-12','FG',17,'BSR-2102','BEND SHOWER 100 SERIES',253.000,100.000,20.000,'2026-10-13 13:50:59'),(239,'2026-10-12','FG',18,'BSR-2105','BEND SHOWER 100 SERIES',329.000,0.000,20.000,'2026-10-13 13:50:59'),(240,'2026-10-12','FG',19,'BSR-2366','BEND SHOWER 300 SERIES',118.000,50.000,15.000,'2026-10-13 13:50:59'),(241,'2026-10-12','FG',20,'BSR-2356','BEND SHOWER 300 SERIES',153.000,50.000,15.000,'2026-10-13 13:50:59'),(242,'2026-10-12','FG',21,'BSR-2361','BEND SHOWER 300 SERIES',79.000,50.000,15.000,'2026-10-13 13:50:59'),(243,'2026-10-12','FG',22,'BSR-2369','O/H ABS + BRASS SHOWER',0.000,50.000,10.000,'2026-10-13 13:50:59'),(244,'2026-10-12','FG',23,'BSR-2364','BEND SHOWER 300 SERIES',353.000,150.000,25.000,'2026-10-13 13:50:59'),(245,'2026-10-12','FG',24,'BSR-2365','BEND SHOWER 300 SERIES',167.000,100.000,20.000,'2026-10-13 13:50:59'),(246,'2026-10-12','FG',25,'BSR-2367','BEND SHOWER 300 SERIES',113.000,50.000,15.000,'2026-10-13 13:50:59'),(247,'2026-10-12','FG',26,'BSR-2371','BEND SHOWER 300 SERIES',105.000,100.000,20.000,'2026-10-13 13:50:59'),(248,'2026-10-12','FG',27,'BSR-2372','BEND SHOWER 300 SERIES',340.000,50.000,15.000,'2026-10-13 13:50:59'),(249,'2026-10-12','FG',28,'BSR-2418','O/H ABS + BRASS SHOWER',100.000,50.000,10.000,'2026-10-13 13:50:59'),(250,'2026-10-12','FG',29,'OHA-2645','SHOWER BEND',10.000,0.000,5.000,'2026-10-13 13:50:59'),(251,'2026-10-12','FG',30,'BTP-1903','Bottle Trap',56.000,50.000,15.000,'2026-10-13 13:50:59'),(252,'2026-10-12','FG',31,'BTP-1901','Bottle Trap',314.000,300.000,50.000,'2026-10-13 13:50:59'),(253,'2026-10-12','FG',32,'BTP-8718','Bottle Trap Pipe',39.000,100.000,20.000,'2026-10-13 13:50:59'),(254,'2026-10-12','FG',33,'BTP-8714','Bottle Trap Pipe',651.000,250.000,50.000,'2026-10-13 13:50:59'),(255,'2026-10-12','FG',34,'FG-000034','GENERAL',450.000,0.000,0.000,'2026-10-13 13:50:59'),(256,'2026-10-12','FG',35,'FG-000035','GENERAL',1100.000,0.000,0.000,'2026-10-13 13:50:59'),(257,'2026-10-13','FG',1,'FG-000001','Premium Basin Taps',0.000,1000.000,50.000,'2026-10-19 14:09:29'),(258,'2026-10-13','FG',2,'FG-000002','Kitchen Sink Mixers',0.000,800.000,30.000,'2026-10-19 14:09:29'),(259,'2026-10-13','FG',3,'FG-000003','Angle & Concealed Valves',0.000,2000.000,100.000,'2026-10-19 14:09:29'),(260,'2026-10-13','FG',4,'ABS-7522','ABS ACCESSORIES',14.000,25.000,10.000,'2026-10-19 14:09:29'),(261,'2026-10-13','FG',5,'ABS-7521','ABS ACCESSORIES',60.000,25.000,10.000,'2026-10-19 14:09:29'),(262,'2026-10-13','FG',6,'ABS-7524','ABS ACCESSORIES',57.000,25.000,10.000,'2026-10-19 14:09:29'),(263,'2026-10-13','FG',7,'CON-1408','ABS CONTY',29.000,20.000,10.000,'2026-10-19 14:09:29'),(264,'2026-10-13','FG',8,'CON-1403','ABS CONTY',72.000,100.000,20.000,'2026-10-19 14:09:29'),(265,'2026-10-13','FG',9,'CON-1404','ABS CONTY',141.000,150.000,30.000,'2026-10-19 14:09:29'),(266,'2026-10-13','FG',10,'OHA-2766-BK','OVERHEAD SHOWER ABS',0.000,300.000,50.000,'2026-10-19 14:09:29'),(267,'2026-10-13','FG',11,'PAC-1274','PROJECT ANGLE COCK',0.000,500.000,50.000,'2026-10-19 14:09:29'),(268,'2026-10-13','FG',12,'ARA-7108','ARALIA SERIES',8.000,0.000,5.000,'2026-10-19 14:09:29'),(269,'2026-10-13','FG',13,'ARA-7102','ARALIA SERIES',14.000,0.000,5.000,'2026-10-19 14:09:29'),(270,'2026-10-13','FG',14,'APC-1265','AUTOMATIC FAUCET',19.000,50.000,10.000,'2026-10-19 14:09:29'),(271,'2026-10-13','FG',15,'8400','BATH ROOM CHAIR',24.000,0.000,5.000,'2026-10-19 14:09:29'),(272,'2026-10-13','FG',16,'BSR-2103','BEND SHOWER 100 SERIES',173.000,100.000,20.000,'2026-10-19 14:09:29'),(273,'2026-10-13','FG',17,'BSR-2102','BEND SHOWER 100 SERIES',253.000,100.000,20.000,'2026-10-19 14:09:29'),(274,'2026-10-13','FG',18,'BSR-2105','BEND SHOWER 100 SERIES',329.000,0.000,20.000,'2026-10-19 14:09:29'),(275,'2026-10-13','FG',19,'BSR-2366','BEND SHOWER 300 SERIES',118.000,50.000,15.000,'2026-10-19 14:09:29'),(276,'2026-10-13','FG',20,'BSR-2356','BEND SHOWER 300 SERIES',153.000,50.000,15.000,'2026-10-19 14:09:29'),(277,'2026-10-13','FG',21,'BSR-2361','BEND SHOWER 300 SERIES',79.000,50.000,15.000,'2026-10-19 14:09:29'),(278,'2026-10-13','FG',22,'BSR-2369','O/H ABS + BRASS SHOWER',0.000,50.000,10.000,'2026-10-19 14:09:29'),(279,'2026-10-13','FG',23,'BSR-2364','BEND SHOWER 300 SERIES',353.000,150.000,25.000,'2026-10-19 14:09:29'),(280,'2026-10-13','FG',24,'BSR-2365','BEND SHOWER 300 SERIES',167.000,100.000,20.000,'2026-10-19 14:09:29'),(281,'2026-10-13','FG',25,'BSR-2367','BEND SHOWER 300 SERIES',113.000,50.000,15.000,'2026-10-19 14:09:29'),(282,'2026-10-13','FG',26,'BSR-2371','BEND SHOWER 300 SERIES',105.000,100.000,20.000,'2026-10-19 14:09:29'),(283,'2026-10-13','FG',27,'BSR-2372','BEND SHOWER 300 SERIES',340.000,50.000,15.000,'2026-10-19 14:09:29'),(284,'2026-10-13','FG',28,'BSR-2418','O/H ABS + BRASS SHOWER',100.000,50.000,10.000,'2026-10-19 14:09:29'),(285,'2026-10-13','FG',29,'OHA-2645','SHOWER BEND',10.000,0.000,5.000,'2026-10-19 14:09:29'),(286,'2026-10-13','FG',30,'BTP-1903','Bottle Trap',56.000,50.000,15.000,'2026-10-19 14:09:29'),(287,'2026-10-13','FG',31,'BTP-1901','Bottle Trap',314.000,300.000,50.000,'2026-10-19 14:09:29'),(288,'2026-10-13','FG',32,'BTP-8718','Bottle Trap Pipe',39.000,100.000,20.000,'2026-10-19 14:09:29'),(289,'2026-10-13','FG',33,'BTP-8714','Bottle Trap Pipe',651.000,250.000,50.000,'2026-10-19 14:09:29'),(290,'2026-10-13','FG',34,'FG-000034','GENERAL',450.000,0.000,0.000,'2026-10-19 14:09:29'),(291,'2026-10-13','FG',35,'FG-000035','GENERAL',1100.000,0.000,0.000,'2026-10-19 14:09:29'),(292,'2026-10-14','FG',1,'FG-000001','Premium Basin Taps',0.000,1000.000,50.000,'2026-10-19 14:09:29'),(293,'2026-10-14','FG',2,'FG-000002','Kitchen Sink Mixers',0.000,800.000,30.000,'2026-10-19 14:09:29'),(294,'2026-10-14','FG',3,'FG-000003','Angle & Concealed Valves',0.000,2000.000,100.000,'2026-10-19 14:09:29'),(295,'2026-10-14','FG',4,'ABS-7522','ABS ACCESSORIES',14.000,25.000,10.000,'2026-10-19 14:09:29'),(296,'2026-10-14','FG',5,'ABS-7521','ABS ACCESSORIES',60.000,25.000,10.000,'2026-10-19 14:09:29'),(297,'2026-10-14','FG',6,'ABS-7524','ABS ACCESSORIES',57.000,25.000,10.000,'2026-10-19 14:09:29'),(298,'2026-10-14','FG',7,'CON-1408','ABS CONTY',29.000,20.000,10.000,'2026-10-19 14:09:29'),(299,'2026-10-14','FG',8,'CON-1403','ABS CONTY',72.000,100.000,20.000,'2026-10-19 14:09:29'),(300,'2026-10-14','FG',9,'CON-1404','ABS CONTY',141.000,150.000,30.000,'2026-10-19 14:09:29'),(301,'2026-10-14','FG',10,'OHA-2766-BK','OVERHEAD SHOWER ABS',0.000,300.000,50.000,'2026-10-19 14:09:29'),(302,'2026-10-14','FG',11,'PAC-1274','PROJECT ANGLE COCK',0.000,500.000,50.000,'2026-10-19 14:09:29'),(303,'2026-10-14','FG',12,'ARA-7108','ARALIA SERIES',8.000,0.000,5.000,'2026-10-19 14:09:29'),(304,'2026-10-14','FG',13,'ARA-7102','ARALIA SERIES',14.000,0.000,5.000,'2026-10-19 14:09:29'),(305,'2026-10-14','FG',14,'APC-1265','AUTOMATIC FAUCET',19.000,50.000,10.000,'2026-10-19 14:09:29'),(306,'2026-10-14','FG',15,'8400','BATH ROOM CHAIR',24.000,0.000,5.000,'2026-10-19 14:09:29'),(307,'2026-10-14','FG',16,'BSR-2103','BEND SHOWER 100 SERIES',173.000,100.000,20.000,'2026-10-19 14:09:29'),(308,'2026-10-14','FG',17,'BSR-2102','BEND SHOWER 100 SERIES',253.000,100.000,20.000,'2026-10-19 14:09:29'),(309,'2026-10-14','FG',18,'BSR-2105','BEND SHOWER 100 SERIES',329.000,0.000,20.000,'2026-10-19 14:09:29'),(310,'2026-10-14','FG',19,'BSR-2366','BEND SHOWER 300 SERIES',118.000,50.000,15.000,'2026-10-19 14:09:29'),(311,'2026-10-14','FG',20,'BSR-2356','BEND SHOWER 300 SERIES',153.000,50.000,15.000,'2026-10-19 14:09:29'),(312,'2026-10-14','FG',21,'BSR-2361','BEND SHOWER 300 SERIES',79.000,50.000,15.000,'2026-10-19 14:09:29'),(313,'2026-10-14','FG',22,'BSR-2369','O/H ABS + BRASS SHOWER',0.000,50.000,10.000,'2026-10-19 14:09:29'),(314,'2026-10-14','FG',23,'BSR-2364','BEND SHOWER 300 SERIES',353.000,150.000,25.000,'2026-10-19 14:09:29'),(315,'2026-10-14','FG',24,'BSR-2365','BEND SHOWER 300 SERIES',167.000,100.000,20.000,'2026-10-19 14:09:29'),(316,'2026-10-14','FG',25,'BSR-2367','BEND SHOWER 300 SERIES',113.000,50.000,15.000,'2026-10-19 14:09:29'),(317,'2026-10-14','FG',26,'BSR-2371','BEND SHOWER 300 SERIES',105.000,100.000,20.000,'2026-10-19 14:09:29'),(318,'2026-10-14','FG',27,'BSR-2372','BEND SHOWER 300 SERIES',340.000,50.000,15.000,'2026-10-19 14:09:29'),(319,'2026-10-14','FG',28,'BSR-2418','O/H ABS + BRASS SHOWER',100.000,50.000,10.000,'2026-10-19 14:09:29'),(320,'2026-10-14','FG',29,'OHA-2645','SHOWER BEND',10.000,0.000,5.000,'2026-10-19 14:09:29'),(321,'2026-10-14','FG',30,'BTP-1903','Bottle Trap',56.000,50.000,15.000,'2026-10-19 14:09:29'),(322,'2026-10-14','FG',31,'BTP-1901','Bottle Trap',314.000,300.000,50.000,'2026-10-19 14:09:29'),(323,'2026-10-14','FG',32,'BTP-8718','Bottle Trap Pipe',39.000,100.000,20.000,'2026-10-19 14:09:29'),(324,'2026-10-14','FG',33,'BTP-8714','Bottle Trap Pipe',651.000,250.000,50.000,'2026-10-19 14:09:29'),(325,'2026-10-14','FG',34,'FG-000034','GENERAL',450.000,0.000,0.000,'2026-10-19 14:09:29'),(326,'2026-10-14','FG',35,'FG-000035','GENERAL',1100.000,0.000,0.000,'2026-10-19 14:09:29'),(327,'2026-10-15','FG',1,'FG-000001','Premium Basin Taps',0.000,1000.000,50.000,'2026-10-19 14:09:29'),(328,'2026-10-15','FG',2,'FG-000002','Kitchen Sink Mixers',0.000,800.000,30.000,'2026-10-19 14:09:29'),(329,'2026-10-15','FG',3,'FG-000003','Angle & Concealed Valves',0.000,2000.000,100.000,'2026-10-19 14:09:29'),(330,'2026-10-15','FG',4,'ABS-7522','ABS ACCESSORIES',14.000,25.000,10.000,'2026-10-19 14:09:29'),(331,'2026-10-15','FG',5,'ABS-7521','ABS ACCESSORIES',60.000,25.000,10.000,'2026-10-19 14:09:29'),(332,'2026-10-15','FG',6,'ABS-7524','ABS ACCESSORIES',57.000,25.000,10.000,'2026-10-19 14:09:29'),(333,'2026-10-15','FG',7,'CON-1408','ABS CONTY',29.000,20.000,10.000,'2026-10-19 14:09:29'),(334,'2026-10-15','FG',8,'CON-1403','ABS CONTY',72.000,100.000,20.000,'2026-10-19 14:09:29'),(335,'2026-10-15','FG',9,'CON-1404','ABS CONTY',141.000,150.000,30.000,'2026-10-19 14:09:29'),(336,'2026-10-15','FG',10,'OHA-2766-BK','OVERHEAD SHOWER ABS',0.000,300.000,50.000,'2026-10-19 14:09:29'),(337,'2026-10-15','FG',11,'PAC-1274','PROJECT ANGLE COCK',0.000,500.000,50.000,'2026-10-19 14:09:29'),(338,'2026-10-15','FG',12,'ARA-7108','ARALIA SERIES',8.000,0.000,5.000,'2026-10-19 14:09:29'),(339,'2026-10-15','FG',13,'ARA-7102','ARALIA SERIES',14.000,0.000,5.000,'2026-10-19 14:09:29'),(340,'2026-10-15','FG',14,'APC-1265','AUTOMATIC FAUCET',19.000,50.000,10.000,'2026-10-19 14:09:29'),(341,'2026-10-15','FG',15,'8400','BATH ROOM CHAIR',24.000,0.000,5.000,'2026-10-19 14:09:29'),(342,'2026-10-15','FG',16,'BSR-2103','BEND SHOWER 100 SERIES',173.000,100.000,20.000,'2026-10-19 14:09:29'),(343,'2026-10-15','FG',17,'BSR-2102','BEND SHOWER 100 SERIES',253.000,100.000,20.000,'2026-10-19 14:09:29'),(344,'2026-10-15','FG',18,'BSR-2105','BEND SHOWER 100 SERIES',329.000,0.000,20.000,'2026-10-19 14:09:29'),(345,'2026-10-15','FG',19,'BSR-2366','BEND SHOWER 300 SERIES',118.000,50.000,15.000,'2026-10-19 14:09:29'),(346,'2026-10-15','FG',20,'BSR-2356','BEND SHOWER 300 SERIES',153.000,50.000,15.000,'2026-10-19 14:09:29'),(347,'2026-10-15','FG',21,'BSR-2361','BEND SHOWER 300 SERIES',79.000,50.000,15.000,'2026-10-19 14:09:29'),(348,'2026-10-15','FG',22,'BSR-2369','O/H ABS + BRASS SHOWER',0.000,50.000,10.000,'2026-10-19 14:09:29'),(349,'2026-10-15','FG',23,'BSR-2364','BEND SHOWER 300 SERIES',353.000,150.000,25.000,'2026-10-19 14:09:29'),(350,'2026-10-15','FG',24,'BSR-2365','BEND SHOWER 300 SERIES',167.000,100.000,20.000,'2026-10-19 14:09:29'),(351,'2026-10-15','FG',25,'BSR-2367','BEND SHOWER 300 SERIES',113.000,50.000,15.000,'2026-10-19 14:09:29'),(352,'2026-10-15','FG',26,'BSR-2371','BEND SHOWER 300 SERIES',105.000,100.000,20.000,'2026-10-19 14:09:29'),(353,'2026-10-15','FG',27,'BSR-2372','BEND SHOWER 300 SERIES',340.000,50.000,15.000,'2026-10-19 14:09:29'),(354,'2026-10-15','FG',28,'BSR-2418','O/H ABS + BRASS SHOWER',100.000,50.000,10.000,'2026-10-19 14:09:29'),(355,'2026-10-15','FG',29,'OHA-2645','SHOWER BEND',10.000,0.000,5.000,'2026-10-19 14:09:29'),(356,'2026-10-15','FG',30,'BTP-1903','Bottle Trap',56.000,50.000,15.000,'2026-10-19 14:09:29'),(357,'2026-10-15','FG',31,'BTP-1901','Bottle Trap',314.000,300.000,50.000,'2026-10-19 14:09:29'),(358,'2026-10-15','FG',32,'BTP-8718','Bottle Trap Pipe',39.000,100.000,20.000,'2026-10-19 14:09:29'),(359,'2026-10-15','FG',33,'BTP-8714','Bottle Trap Pipe',651.000,250.000,50.000,'2026-10-19 14:09:29'),(360,'2026-10-15','FG',34,'FG-000034','GENERAL',450.000,0.000,0.000,'2026-10-19 14:09:29'),(361,'2026-10-15','FG',35,'FG-000035','GENERAL',1100.000,0.000,0.000,'2026-10-19 14:09:29'),(362,'2026-10-16','FG',1,'FG-000001','Premium Basin Taps',0.000,1000.000,50.000,'2026-10-19 14:09:29'),(363,'2026-10-16','FG',2,'FG-000002','Kitchen Sink Mixers',0.000,800.000,30.000,'2026-10-19 14:09:29'),(364,'2026-10-16','FG',3,'FG-000003','Angle & Concealed Valves',0.000,2000.000,100.000,'2026-10-19 14:09:29'),(365,'2026-10-16','FG',4,'ABS-7522','ABS ACCESSORIES',14.000,25.000,10.000,'2026-10-19 14:09:29'),(366,'2026-10-16','FG',5,'ABS-7521','ABS ACCESSORIES',60.000,25.000,10.000,'2026-10-19 14:09:29'),(367,'2026-10-16','FG',6,'ABS-7524','ABS ACCESSORIES',57.000,25.000,10.000,'2026-10-19 14:09:29'),(368,'2026-10-16','FG',7,'CON-1408','ABS CONTY',29.000,20.000,10.000,'2026-10-19 14:09:29'),(369,'2026-10-16','FG',8,'CON-1403','ABS CONTY',72.000,100.000,20.000,'2026-10-19 14:09:29'),(370,'2026-10-16','FG',9,'CON-1404','ABS CONTY',141.000,150.000,30.000,'2026-10-19 14:09:29'),(371,'2026-10-16','FG',10,'OHA-2766-BK','OVERHEAD SHOWER ABS',0.000,300.000,50.000,'2026-10-19 14:09:29'),(372,'2026-10-16','FG',11,'PAC-1274','PROJECT ANGLE COCK',0.000,500.000,50.000,'2026-10-19 14:09:29'),(373,'2026-10-16','FG',12,'ARA-7108','ARALIA SERIES',8.000,0.000,5.000,'2026-10-19 14:09:29'),(374,'2026-10-16','FG',13,'ARA-7102','ARALIA SERIES',14.000,0.000,5.000,'2026-10-19 14:09:29'),(375,'2026-10-16','FG',14,'APC-1265','AUTOMATIC FAUCET',19.000,50.000,10.000,'2026-10-19 14:09:29'),(376,'2026-10-16','FG',15,'8400','BATH ROOM CHAIR',24.000,0.000,5.000,'2026-10-19 14:09:29'),(377,'2026-10-16','FG',16,'BSR-2103','BEND SHOWER 100 SERIES',173.000,100.000,20.000,'2026-10-19 14:09:29'),(378,'2026-10-16','FG',17,'BSR-2102','BEND SHOWER 100 SERIES',253.000,100.000,20.000,'2026-10-19 14:09:29'),(379,'2026-10-16','FG',18,'BSR-2105','BEND SHOWER 100 SERIES',329.000,0.000,20.000,'2026-10-19 14:09:29'),(380,'2026-10-16','FG',19,'BSR-2366','BEND SHOWER 300 SERIES',118.000,50.000,15.000,'2026-10-19 14:09:29'),(381,'2026-10-16','FG',20,'BSR-2356','BEND SHOWER 300 SERIES',153.000,50.000,15.000,'2026-10-19 14:09:29'),(382,'2026-10-16','FG',21,'BSR-2361','BEND SHOWER 300 SERIES',79.000,50.000,15.000,'2026-10-19 14:09:29'),(383,'2026-10-16','FG',22,'BSR-2369','O/H ABS + BRASS SHOWER',0.000,50.000,10.000,'2026-10-19 14:09:29'),(384,'2026-10-16','FG',23,'BSR-2364','BEND SHOWER 300 SERIES',353.000,150.000,25.000,'2026-10-19 14:09:29'),(385,'2026-10-16','FG',24,'BSR-2365','BEND SHOWER 300 SERIES',167.000,100.000,20.000,'2026-10-19 14:09:29'),(386,'2026-10-16','FG',25,'BSR-2367','BEND SHOWER 300 SERIES',113.000,50.000,15.000,'2026-10-19 14:09:29'),(387,'2026-10-16','FG',26,'BSR-2371','BEND SHOWER 300 SERIES',105.000,100.000,20.000,'2026-10-19 14:09:29'),(388,'2026-10-16','FG',27,'BSR-2372','BEND SHOWER 300 SERIES',340.000,50.000,15.000,'2026-10-19 14:09:29'),(389,'2026-10-16','FG',28,'BSR-2418','O/H ABS + BRASS SHOWER',100.000,50.000,10.000,'2026-10-19 14:09:29'),(390,'2026-10-16','FG',29,'OHA-2645','SHOWER BEND',10.000,0.000,5.000,'2026-10-19 14:09:29'),(391,'2026-10-16','FG',30,'BTP-1903','Bottle Trap',56.000,50.000,15.000,'2026-10-19 14:09:29'),(392,'2026-10-16','FG',31,'BTP-1901','Bottle Trap',314.000,300.000,50.000,'2026-10-19 14:09:29'),(393,'2026-10-16','FG',32,'BTP-8718','Bottle Trap Pipe',39.000,100.000,20.000,'2026-10-19 14:09:29'),(394,'2026-10-16','FG',33,'BTP-8714','Bottle Trap Pipe',651.000,250.000,50.000,'2026-10-19 14:09:29'),(395,'2026-10-16','FG',34,'FG-000034','GENERAL',450.000,0.000,0.000,'2026-10-19 14:09:29'),(396,'2026-10-16','FG',35,'FG-000035','GENERAL',1100.000,0.000,0.000,'2026-10-19 14:09:29'),(397,'2026-10-17','FG',1,'FG-000001','Premium Basin Taps',0.000,1000.000,50.000,'2026-10-19 14:09:29'),(398,'2026-10-17','FG',2,'FG-000002','Kitchen Sink Mixers',0.000,800.000,30.000,'2026-10-19 14:09:29'),(399,'2026-10-17','FG',3,'FG-000003','Angle & Concealed Valves',0.000,2000.000,100.000,'2026-10-19 14:09:29'),(400,'2026-10-17','FG',4,'ABS-7522','ABS ACCESSORIES',14.000,25.000,10.000,'2026-10-19 14:09:29'),(401,'2026-10-17','FG',5,'ABS-7521','ABS ACCESSORIES',60.000,25.000,10.000,'2026-10-19 14:09:29'),(402,'2026-10-17','FG',6,'ABS-7524','ABS ACCESSORIES',57.000,25.000,10.000,'2026-10-19 14:09:29'),(403,'2026-10-17','FG',7,'CON-1408','ABS CONTY',29.000,20.000,10.000,'2026-10-19 14:09:29'),(404,'2026-10-17','FG',8,'CON-1403','ABS CONTY',72.000,100.000,20.000,'2026-10-19 14:09:29'),(405,'2026-10-17','FG',9,'CON-1404','ABS CONTY',141.000,150.000,30.000,'2026-10-19 14:09:29'),(406,'2026-10-17','FG',10,'OHA-2766-BK','OVERHEAD SHOWER ABS',0.000,300.000,50.000,'2026-10-19 14:09:29'),(407,'2026-10-17','FG',11,'PAC-1274','PROJECT ANGLE COCK',0.000,500.000,50.000,'2026-10-19 14:09:29'),(408,'2026-10-17','FG',12,'ARA-7108','ARALIA SERIES',8.000,0.000,5.000,'2026-10-19 14:09:29'),(409,'2026-10-17','FG',13,'ARA-7102','ARALIA SERIES',14.000,0.000,5.000,'2026-10-19 14:09:29'),(410,'2026-10-17','FG',14,'APC-1265','AUTOMATIC FAUCET',19.000,50.000,10.000,'2026-10-19 14:09:29'),(411,'2026-10-17','FG',15,'8400','BATH ROOM CHAIR',24.000,0.000,5.000,'2026-10-19 14:09:29'),(412,'2026-10-17','FG',16,'BSR-2103','BEND SHOWER 100 SERIES',173.000,100.000,20.000,'2026-10-19 14:09:29'),(413,'2026-10-17','FG',17,'BSR-2102','BEND SHOWER 100 SERIES',253.000,100.000,20.000,'2026-10-19 14:09:29'),(414,'2026-10-17','FG',18,'BSR-2105','BEND SHOWER 100 SERIES',329.000,0.000,20.000,'2026-10-19 14:09:29'),(415,'2026-10-17','FG',19,'BSR-2366','BEND SHOWER 300 SERIES',118.000,50.000,15.000,'2026-10-19 14:09:29'),(416,'2026-10-17','FG',20,'BSR-2356','BEND SHOWER 300 SERIES',153.000,50.000,15.000,'2026-10-19 14:09:29'),(417,'2026-10-17','FG',21,'BSR-2361','BEND SHOWER 300 SERIES',79.000,50.000,15.000,'2026-10-19 14:09:29'),(418,'2026-10-17','FG',22,'BSR-2369','O/H ABS + BRASS SHOWER',0.000,50.000,10.000,'2026-10-19 14:09:29'),(419,'2026-10-17','FG',23,'BSR-2364','BEND SHOWER 300 SERIES',353.000,150.000,25.000,'2026-10-19 14:09:29'),(420,'2026-10-17','FG',24,'BSR-2365','BEND SHOWER 300 SERIES',167.000,100.000,20.000,'2026-10-19 14:09:29'),(421,'2026-10-17','FG',25,'BSR-2367','BEND SHOWER 300 SERIES',113.000,50.000,15.000,'2026-10-19 14:09:29'),(422,'2026-10-17','FG',26,'BSR-2371','BEND SHOWER 300 SERIES',105.000,100.000,20.000,'2026-10-19 14:09:29'),(423,'2026-10-17','FG',27,'BSR-2372','BEND SHOWER 300 SERIES',340.000,50.000,15.000,'2026-10-19 14:09:29'),(424,'2026-10-17','FG',28,'BSR-2418','O/H ABS + BRASS SHOWER',100.000,50.000,10.000,'2026-10-19 14:09:29'),(425,'2026-10-17','FG',29,'OHA-2645','SHOWER BEND',10.000,0.000,5.000,'2026-10-19 14:09:29'),(426,'2026-10-17','FG',30,'BTP-1903','Bottle Trap',56.000,50.000,15.000,'2026-10-19 14:09:29'),(427,'2026-10-17','FG',31,'BTP-1901','Bottle Trap',314.000,300.000,50.000,'2026-10-19 14:09:29'),(428,'2026-10-17','FG',32,'BTP-8718','Bottle Trap Pipe',39.000,100.000,20.000,'2026-10-19 14:09:29'),(429,'2026-10-17','FG',33,'BTP-8714','Bottle Trap Pipe',651.000,250.000,50.000,'2026-10-19 14:09:29'),(430,'2026-10-17','FG',34,'FG-000034','GENERAL',450.000,0.000,0.000,'2026-10-19 14:09:29'),(431,'2026-10-17','FG',35,'FG-000035','GENERAL',1100.000,0.000,0.000,'2026-10-19 14:09:29'),(432,'2026-10-18','FG',1,'FG-000001','Premium Basin Taps',0.000,1000.000,50.000,'2026-10-19 14:09:29'),(433,'2026-10-18','FG',2,'FG-000002','Kitchen Sink Mixers',0.000,800.000,30.000,'2026-10-19 14:09:29'),(434,'2026-10-18','FG',3,'FG-000003','Angle & Concealed Valves',0.000,2000.000,100.000,'2026-10-19 14:09:29'),(435,'2026-10-18','FG',4,'ABS-7522','ABS ACCESSORIES',14.000,25.000,10.000,'2026-10-19 14:09:29'),(436,'2026-10-18','FG',5,'ABS-7521','ABS ACCESSORIES',60.000,25.000,10.000,'2026-10-19 14:09:29'),(437,'2026-10-18','FG',6,'ABS-7524','ABS ACCESSORIES',57.000,25.000,10.000,'2026-10-19 14:09:29'),(438,'2026-10-18','FG',7,'CON-1408','ABS CONTY',29.000,20.000,10.000,'2026-10-19 14:09:29'),(439,'2026-10-18','FG',8,'CON-1403','ABS CONTY',72.000,100.000,20.000,'2026-10-19 14:09:29'),(440,'2026-10-18','FG',9,'CON-1404','ABS CONTY',141.000,150.000,30.000,'2026-10-19 14:09:29'),(441,'2026-10-18','FG',10,'OHA-2766-BK','OVERHEAD SHOWER ABS',0.000,300.000,50.000,'2026-10-19 14:09:29'),(442,'2026-10-18','FG',11,'PAC-1274','PROJECT ANGLE COCK',0.000,500.000,50.000,'2026-10-19 14:09:29'),(443,'2026-10-18','FG',12,'ARA-7108','ARALIA SERIES',8.000,0.000,5.000,'2026-10-19 14:09:29'),(444,'2026-10-18','FG',13,'ARA-7102','ARALIA SERIES',14.000,0.000,5.000,'2026-10-19 14:09:29'),(445,'2026-10-18','FG',14,'APC-1265','AUTOMATIC FAUCET',19.000,50.000,10.000,'2026-10-19 14:09:29'),(446,'2026-10-18','FG',15,'8400','BATH ROOM CHAIR',24.000,0.000,5.000,'2026-10-19 14:09:29'),(447,'2026-10-18','FG',16,'BSR-2103','BEND SHOWER 100 SERIES',173.000,100.000,20.000,'2026-10-19 14:09:29'),(448,'2026-10-18','FG',17,'BSR-2102','BEND SHOWER 100 SERIES',253.000,100.000,20.000,'2026-10-19 14:09:29'),(449,'2026-10-18','FG',18,'BSR-2105','BEND SHOWER 100 SERIES',329.000,0.000,20.000,'2026-10-19 14:09:29'),(450,'2026-10-18','FG',19,'BSR-2366','BEND SHOWER 300 SERIES',118.000,50.000,15.000,'2026-10-19 14:09:29'),(451,'2026-10-18','FG',20,'BSR-2356','BEND SHOWER 300 SERIES',153.000,50.000,15.000,'2026-10-19 14:09:29'),(452,'2026-10-18','FG',21,'BSR-2361','BEND SHOWER 300 SERIES',79.000,50.000,15.000,'2026-10-19 14:09:29'),(453,'2026-10-18','FG',22,'BSR-2369','O/H ABS + BRASS SHOWER',0.000,50.000,10.000,'2026-10-19 14:09:29'),(454,'2026-10-18','FG',23,'BSR-2364','BEND SHOWER 300 SERIES',353.000,150.000,25.000,'2026-10-19 14:09:29'),(455,'2026-10-18','FG',24,'BSR-2365','BEND SHOWER 300 SERIES',167.000,100.000,20.000,'2026-10-19 14:09:29'),(456,'2026-10-18','FG',25,'BSR-2367','BEND SHOWER 300 SERIES',113.000,50.000,15.000,'2026-10-19 14:09:29'),(457,'2026-10-18','FG',26,'BSR-2371','BEND SHOWER 300 SERIES',105.000,100.000,20.000,'2026-10-19 14:09:29'),(458,'2026-10-18','FG',27,'BSR-2372','BEND SHOWER 300 SERIES',340.000,50.000,15.000,'2026-10-19 14:09:29'),(459,'2026-10-18','FG',28,'BSR-2418','O/H ABS + BRASS SHOWER',100.000,50.000,10.000,'2026-10-19 14:09:29'),(460,'2026-10-18','FG',29,'OHA-2645','SHOWER BEND',10.000,0.000,5.000,'2026-10-19 14:09:29'),(461,'2026-10-18','FG',30,'BTP-1903','Bottle Trap',56.000,50.000,15.000,'2026-10-19 14:09:29'),(462,'2026-10-18','FG',31,'BTP-1901','Bottle Trap',314.000,300.000,50.000,'2026-10-19 14:09:29'),(463,'2026-10-18','FG',32,'BTP-8718','Bottle Trap Pipe',39.000,100.000,20.000,'2026-10-19 14:09:29'),(464,'2026-10-18','FG',33,'BTP-8714','Bottle Trap Pipe',651.000,250.000,50.000,'2026-10-19 14:09:29'),(465,'2026-10-18','FG',34,'FG-000034','GENERAL',450.000,0.000,0.000,'2026-10-19 14:09:29'),(466,'2026-10-18','FG',35,'FG-000035','GENERAL',1100.000,0.000,0.000,'2026-10-19 14:09:29'),(467,'2026-10-19','FG',1,'FG-000001','Premium Basin Taps',0.000,1000.000,50.000,'2026-10-20 03:38:39'),(468,'2026-10-19','FG',2,'FG-000002','Kitchen Sink Mixers',100.000,800.000,30.000,'2026-10-20 03:38:39'),(469,'2026-10-19','FG',3,'FG-000003','Angle & Concealed Valves',0.000,2000.000,100.000,'2026-10-20 03:38:39'),(470,'2026-10-19','FG',4,'ABS-7522','ABS ACCESSORIES',614.000,25.000,10.000,'2026-10-20 03:38:39'),(471,'2026-10-19','FG',5,'ABS-7521','ABS ACCESSORIES',60.000,25.000,10.000,'2026-10-20 03:38:39'),(472,'2026-10-19','FG',6,'ABS-7524','ABS ACCESSORIES',57.000,25.000,10.000,'2026-10-20 03:38:39'),(473,'2026-10-19','FG',7,'CON-1408','ABS CONTY',29.000,20.000,10.000,'2026-10-20 03:38:39'),(474,'2026-10-19','FG',8,'CON-1403','ABS CONTY',337.000,100.000,20.000,'2026-10-20 03:38:39'),(475,'2026-10-19','FG',9,'CON-1404','ABS CONTY',141.000,150.000,30.000,'2026-10-20 03:38:39'),(476,'2026-10-19','FG',10,'OHA-2766-BK','OVERHEAD SHOWER ABS',0.000,300.000,50.000,'2026-10-20 03:38:39'),(477,'2026-10-19','FG',11,'PAC-1274','PROJECT ANGLE COCK',0.000,500.000,50.000,'2026-10-20 03:38:39'),(478,'2026-10-19','FG',12,'ARA-7108','ARALIA SERIES',8.000,0.000,5.000,'2026-10-20 03:38:39'),(479,'2026-10-19','FG',13,'ARA-7102','ARALIA SERIES',14.000,0.000,5.000,'2026-10-20 03:38:39'),(480,'2026-10-19','FG',14,'APC-1265','AUTOMATIC FAUCET',19.000,50.000,10.000,'2026-10-20 03:38:39'),(481,'2026-10-19','FG',15,'8400','BATH ROOM CHAIR',24.000,0.000,5.000,'2026-10-20 03:38:39'),(482,'2026-10-19','FG',16,'BSR-2103','BEND SHOWER 100 SERIES',173.000,100.000,20.000,'2026-10-20 03:38:39'),(483,'2026-10-19','FG',17,'BSR-2102','BEND SHOWER 100 SERIES',253.000,100.000,20.000,'2026-10-20 03:38:39'),(484,'2026-10-19','FG',18,'BSR-2105','BEND SHOWER 100 SERIES',329.000,0.000,20.000,'2026-10-20 03:38:39'),(485,'2026-10-19','FG',19,'BSR-2366','BEND SHOWER 300 SERIES',118.000,50.000,15.000,'2026-10-20 03:38:39'),(486,'2026-10-19','FG',20,'BSR-2356','BEND SHOWER 300 SERIES',153.000,50.000,15.000,'2026-10-20 03:38:39'),(487,'2026-10-19','FG',21,'BSR-2361','BEND SHOWER 300 SERIES',79.000,50.000,15.000,'2026-10-20 03:38:39'),(488,'2026-10-19','FG',22,'BSR-2369','O/H ABS + BRASS SHOWER',0.000,50.000,10.000,'2026-10-20 03:38:39'),(489,'2026-10-19','FG',23,'BSR-2364','BEND SHOWER 300 SERIES',353.000,150.000,25.000,'2026-10-20 03:38:39'),(490,'2026-10-19','FG',24,'BSR-2365','BEND SHOWER 300 SERIES',167.000,100.000,20.000,'2026-10-20 03:38:39'),(491,'2026-10-19','FG',25,'BSR-2367','BEND SHOWER 300 SERIES',113.000,50.000,15.000,'2026-10-20 03:38:39'),(492,'2026-10-19','FG',26,'BSR-2371','BEND SHOWER 300 SERIES',105.000,100.000,20.000,'2026-10-20 03:38:39'),(493,'2026-10-19','FG',27,'BSR-2372','BEND SHOWER 300 SERIES',340.000,50.000,15.000,'2026-10-20 03:38:39'),(494,'2026-10-19','FG',28,'BSR-2418','O/H ABS + BRASS SHOWER',489.000,50.000,10.000,'2026-10-20 03:38:39'),(495,'2026-10-19','FG',29,'OHA-2645','SHOWER BEND',10.000,0.000,5.000,'2026-10-20 03:38:39'),(496,'2026-10-19','FG',30,'BTP-1903','Bottle Trap',56.000,50.000,15.000,'2026-10-20 03:38:39'),(497,'2026-10-19','FG',31,'BTP-1901','Bottle Trap',314.000,300.000,50.000,'2026-10-20 03:38:39'),(498,'2026-10-19','FG',32,'BTP-8718','Bottle Trap Pipe',39.000,100.000,20.000,'2026-10-20 03:38:39'),(499,'2026-10-19','FG',33,'BTP-8714','Bottle Trap Pipe',651.000,250.000,50.000,'2026-10-20 03:38:39'),(500,'2026-10-19','FG',34,'FG-000034','GENERAL',450.000,0.000,0.000,'2026-10-20 03:38:39'),(501,'2026-10-19','FG',35,'FG-000035','GENERAL',1100.000,0.000,0.000,'2026-10-20 03:38:39');
/*!40000 ALTER TABLE `daily_stock_snapshots` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `finished_goods`
--

DROP TABLE IF EXISTS `finished_goods`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `finished_goods` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fg_code` varchar(50) NOT NULL,
  `product_name` varchar(200) NOT NULL,
  `description` text DEFAULT NULL,
  `category_id` int(11) DEFAULT NULL,
  `unit_id` int(11) NOT NULL,
  `selling_price` decimal(12,2) DEFAULT 0.00,
  `minimum_stock` decimal(12,3) DEFAULT 0.000,
  `reorder_level` decimal(12,3) DEFAULT 0.000,
  `maximum_stock` decimal(12,3) DEFAULT 0.000,
  `hsn_code` varchar(50) DEFAULT NULL,
  `active` tinyint(1) DEFAULT 1,
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `fg_code` (`fg_code`),
  KEY `category_id` (`category_id`),
  KEY `unit_id` (`unit_id`),
  KEY `idx_fg_code` (`fg_code`),
  KEY `idx_fg_name` (`product_name`),
  CONSTRAINT `finished_goods_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL,
  CONSTRAINT `finished_goods_ibfk_2` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=36 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `finished_goods`
--

LOCK TABLES `finished_goods` WRITE;
/*!40000 ALTER TABLE `finished_goods` DISABLE KEYS */;
INSERT INTO `finished_goods` VALUES (1,'FG-000001','Brass Basin Tap Model A - Chrome','Single lever chrome plated brass pillar tap with ceramic cartridge',5,3,1250.00,50.000,100.000,1000.000,'84818020',1,NULL,NULL,'2026-10-08 14:00:53','2026-10-11 04:05:12',NULL),(2,'FG-000002','Kitchen Sink Mixer Model B - Swivel Spout','Heavy table-mounted 360-deg swivel spout brass kitchen faucet',6,3,2100.00,30.000,80.000,800.000,'84818020',1,NULL,NULL,'2026-10-08 14:00:53','2026-10-11 04:05:12',NULL),(3,'FG-000003','Angle Valve 2-in-1 Heavy Duty','Brass dual outlet angle cock for geyser and health faucet',7,3,650.00,100.000,250.000,2000.000,'84818020',1,NULL,NULL,'2026-10-08 14:00:53','2026-10-11 04:05:12',NULL),(4,'ABS-7522','ABS CLOVA SOAP DISH OVAL',NULL,8,3,0.00,10.000,10.000,25.000,NULL,1,NULL,NULL,'2026-10-09 02:24:41','2026-10-11 04:05:12',NULL),(5,'ABS-7521','ABS CLOVA SOAP DISH SQUARE',NULL,8,3,0.00,10.000,10.000,25.000,NULL,1,NULL,NULL,'2026-10-09 02:24:41','2026-10-11 04:05:12',NULL),(6,'ABS-7524','ABS CLOVA TOWEL RING',NULL,8,3,0.00,10.000,10.000,25.000,NULL,1,NULL,NULL,'2026-10-09 02:24:41','2026-10-11 04:05:12',NULL),(7,'CON-1408','2 IN 1 BIB COCK ABS CONTY',NULL,9,3,0.00,10.000,10.000,20.000,NULL,1,NULL,NULL,'2026-10-09 02:24:41','2026-10-11 04:05:12',NULL),(8,'CON-1403','ANGLE COCK ABS CONTY',NULL,9,3,0.00,20.000,20.000,100.000,NULL,1,NULL,NULL,'2026-10-09 02:24:41','2026-10-11 04:05:12',NULL),(9,'CON-1404','LONG BODY ABS CONTY',NULL,9,3,0.00,30.000,30.000,150.000,NULL,1,NULL,NULL,'2026-10-09 02:24:41','2026-10-11 04:05:12',NULL),(10,'OHA-2766-BK','OVER HEAD SHOWER CUBIX 6X6 BLACK JALI',NULL,10,3,0.00,50.000,50.000,300.000,NULL,1,NULL,NULL,'2026-10-09 02:24:41','2026-10-11 04:05:12',NULL),(11,'PAC-1274','ANGLE COCK BLANCO ROUND',NULL,11,3,0.00,50.000,50.000,500.000,NULL,1,NULL,NULL,'2026-10-09 02:24:41','2026-10-11 04:05:12',NULL),(12,'ARA-7108','ARALIA - BATH SET',NULL,12,3,0.00,5.000,5.000,0.000,NULL,1,NULL,NULL,'2026-10-09 02:24:41','2026-10-11 04:05:12',NULL),(13,'ARA-7102','ARALIA - TOWEL ROD 24\"',NULL,12,3,0.00,5.000,5.000,0.000,NULL,1,NULL,NULL,'2026-10-09 02:24:41','2026-10-11 02:50:27',NULL),(14,'APC-1265','AUTO PUSH ANGLE COCK',NULL,13,3,0.00,10.000,10.000,50.000,NULL,1,NULL,NULL,'2026-10-09 02:24:41','2026-10-11 04:05:12',NULL),(15,'8400','BATHROOM CHAIR WALL MOUNTED',NULL,14,3,0.00,5.000,5.000,0.000,NULL,1,NULL,NULL,'2026-10-09 02:24:41','2026-10-11 04:05:12',NULL),(16,'BSR-2103','BEND SHOWER LILY',NULL,15,3,0.00,20.000,20.000,100.000,NULL,1,NULL,NULL,'2026-10-09 02:24:41','2026-10-11 04:05:12',NULL),(17,'BSR-2102','BEND SHOWER NUPUR',NULL,15,3,0.00,20.000,20.000,100.000,NULL,1,NULL,NULL,'2026-10-09 02:24:41','2026-10-11 04:05:12',NULL),(18,'BSR-2105','BEND SHOWER TULIP',NULL,15,3,0.00,20.000,20.000,0.000,NULL,1,NULL,NULL,'2026-10-09 02:24:41','2026-10-11 04:05:12',NULL),(19,'BSR-2366','BEND SHOWER HEENA',NULL,16,3,0.00,15.000,15.000,50.000,NULL,1,NULL,NULL,'2026-10-09 02:24:41','2026-10-11 04:05:12',NULL),(20,'BSR-2356','BEND SHOWER - HONEY',NULL,16,3,0.00,15.000,15.000,50.000,NULL,1,NULL,NULL,'2026-10-09 02:24:41','2026-10-11 04:05:12',NULL),(21,'BSR-2361','BEND SHOWER LOTUS',NULL,16,3,0.00,15.000,15.000,50.000,NULL,1,NULL,NULL,'2026-10-09 02:24:41','2026-10-11 04:05:12',NULL),(22,'BSR-2369','BEND SHOWER EXCEL WITH BRASS ARM',NULL,17,3,0.00,10.000,10.000,50.000,NULL,1,NULL,NULL,'2026-10-09 02:24:41','2026-10-11 04:05:12',NULL),(23,'BSR-2364','BEND SHOWER HAMMER',NULL,16,3,0.00,25.000,25.000,150.000,NULL,1,NULL,NULL,'2026-10-09 02:24:41','2026-10-11 04:05:12',NULL),(24,'BSR-2365','BEND SHOWER HANKO',NULL,16,3,0.00,20.000,20.000,100.000,NULL,1,NULL,NULL,'2026-10-09 02:24:41','2026-10-11 04:05:12',NULL),(25,'BSR-2367','BEND SHOWER HYDRA',NULL,16,3,0.00,15.000,15.000,50.000,NULL,1,NULL,NULL,'2026-10-09 02:24:41','2026-10-11 04:05:12',NULL),(26,'BSR-2371','BEND SHOWER ALMOND',NULL,16,3,0.00,20.000,20.000,100.000,NULL,1,NULL,NULL,'2026-10-09 02:24:41','2026-10-11 04:05:12',NULL),(27,'BSR-2372','BEND SHOWER APRICOT',NULL,16,3,0.00,15.000,15.000,50.000,NULL,1,NULL,NULL,'2026-10-09 02:24:41','2026-10-11 04:05:12',NULL),(28,'BSR-2418','BEND SHOWER NANO',NULL,17,3,0.00,10.000,10.000,50.000,NULL,1,NULL,NULL,'2026-10-09 02:24:42','2026-10-11 04:05:12',NULL),(29,'OHA-2645','BODY JET SHOWER WATER TILE (4X4)',NULL,18,3,0.00,5.000,5.000,0.000,NULL,1,NULL,NULL,'2026-10-09 02:24:42','2026-10-11 04:05:12',NULL),(30,'BTP-1903','BOTTLE TRAP PARCO',NULL,19,3,0.00,15.000,15.000,50.000,NULL,1,NULL,NULL,'2026-10-09 02:24:42','2026-10-11 04:05:12',NULL),(31,'BTP-1901','BOTTLE TRAP STD',NULL,19,3,0.00,50.000,50.000,300.000,NULL,1,NULL,NULL,'2026-10-09 02:24:42','2026-10-11 04:05:12',NULL),(32,'BTP-8718','BT PIPE BRASS CP SEAMLESS 18\"',NULL,20,3,0.00,20.000,20.000,100.000,NULL,1,NULL,NULL,'2026-10-09 02:24:42','2026-10-11 02:50:27',NULL),(33,'BTP-8714','BT PIPE STAINLESS STEEL 18 (SS)',NULL,20,3,0.00,50.000,50.000,250.000,NULL,1,NULL,NULL,'2026-10-09 02:24:42','2026-10-11 04:05:12',NULL),(34,'FG-000034','PCS',NULL,NULL,1,0.00,0.000,0.000,0.000,NULL,1,1,NULL,'2026-10-11 02:50:27','2026-10-11 02:50:27',NULL),(35,'FG-000035','PCS',NULL,NULL,1,0.00,0.000,0.000,0.000,NULL,1,1,NULL,'2026-10-11 02:50:27','2026-10-11 02:50:27',NULL);
/*!40000 ALTER TABLE `finished_goods` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `item_mappings`
--

DROP TABLE IF EXISTS `item_mappings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `item_mappings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `external_source` varchar(50) DEFAULT 'TALLY',
  `external_item_name` varchar(255) NOT NULL,
  `material_type` enum('RM','FG') NOT NULL,
  `internal_item_id` int(11) NOT NULL,
  `internal_item_code` varchar(50) NOT NULL,
  `status` enum('MAPPED','UNMAPPED','AMBIGUOUS') DEFAULT 'MAPPED',
  `active` tinyint(1) DEFAULT 1,
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ext_item` (`external_source`,`external_item_name`,`material_type`),
  KEY `idx_mapping_ext` (`external_item_name`),
  KEY `idx_mapping_internal` (`material_type`,`internal_item_id`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `item_mappings`
--

LOCK TABLES `item_mappings` WRITE;
/*!40000 ALTER TABLE `item_mappings` DISABLE KEYS */;
INSERT INTO `item_mappings` VALUES (1,'TALLY','BRASS ROD 25MM','RM',1,'RM-000001','MAPPED',1,NULL,NULL,'2026-10-08 14:00:53','2026-10-08 14:00:53'),(2,'TALLY','BRASS ROD 25 MM IS319','RM',1,'RM-000001','MAPPED',1,NULL,NULL,'2026-10-08 14:00:53','2026-10-08 14:00:53'),(3,'TALLY','COPPER SHEET 2MM','RM',2,'RM-000002','MAPPED',1,NULL,NULL,'2026-10-08 14:00:53','2026-10-08 14:00:53'),(4,'TALLY','CERAMIC CARTRIDGE 35MM','RM',3,'RM-000003','MAPPED',1,NULL,NULL,'2026-10-08 14:00:53','2026-10-08 14:00:53'),(5,'TALLY','ZINC LEVER HANDLE','RM',4,'RM-000004','MAPPED',1,NULL,NULL,'2026-10-08 14:00:53','2026-10-08 14:00:53'),(6,'TALLY','SS SCREW M4X10','RM',5,'RM-000005','MAPPED',1,NULL,NULL,'2026-10-08 14:00:53','2026-10-08 14:00:53'),(7,'TALLY','EPDM O-RING 22MM','RM',6,'RM-000006','MAPPED',1,NULL,NULL,'2026-10-08 14:00:53','2026-10-08 14:00:53'),(8,'TALLY','AERATOR M24 NOZZLE','RM',7,'RM-000007','MAPPED',1,NULL,NULL,'2026-10-08 14:00:53','2026-10-08 14:00:53'),(9,'TALLY','TAP BOX INNER A1','RM',8,'RM-000008','MAPPED',1,NULL,NULL,'2026-10-08 14:00:53','2026-10-08 14:00:53'),(10,'TALLY','BASIN TAP MODEL A CHROME','FG',1,'FG-000001','MAPPED',1,NULL,NULL,'2026-10-08 14:00:53','2026-10-08 14:00:53'),(11,'TALLY','TAP MODEL A (CHROME)','FG',1,'FG-000001','MAPPED',1,NULL,NULL,'2026-10-08 14:00:53','2026-10-08 14:00:53'),(12,'TALLY','KITCHEN SINK MIXER MODEL B','FG',2,'FG-000002','MAPPED',1,NULL,NULL,'2026-10-08 14:00:53','2026-10-08 14:00:53'),(13,'TALLY','ANGLE VALVE 2 IN 1 HEAVY','FG',3,'FG-000003','MAPPED',1,NULL,NULL,'2026-10-08 14:00:53','2026-10-08 14:00:53'),(14,'TALLY','SOMANY BRASS BASIN TAP MODEL A','FG',1,'FG-000001','MAPPED',1,NULL,NULL,'2026-10-11 10:33:07','2026-10-11 10:33:07'),(15,'TALLY','PRINCE PIPE CHROME BASIN TAP','FG',1,'FG-000001','MAPPED',1,NULL,NULL,'2026-10-11 10:33:07','2026-10-11 10:33:07'),(16,'TALLY','ZEN BATH ELEGANCE BASIN TAP','FG',1,'FG-000001','MAPPED',1,NULL,NULL,'2026-10-11 10:33:07','2026-10-11 10:33:07'),(17,'TALLY','SOMANY ANGLE VALVE 2-IN-1 HEAVY','FG',3,'FG-000003','MAPPED',1,NULL,NULL,'2026-10-11 10:33:07','2026-10-11 10:33:07'),(18,'TALLY','ZEN BATH ANGLE COCK DUO','FG',3,'FG-000003','MAPPED',1,NULL,NULL,'2026-10-11 10:33:07','2026-10-11 10:33:07');
/*!40000 ALTER TABLE `item_mappings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `parties`
--

DROP TABLE IF EXISTS `parties`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `parties` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `party_name` varchar(255) NOT NULL,
  `party_type` enum('SUPPLIER','CUSTOMER','BOTH') DEFAULT 'BOTH',
  `contact_person` varchar(150) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `gstin` varchar(50) DEFAULT NULL,
  `active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `party_name` (`party_name`),
  KEY `idx_party_name` (`party_name`),
  KEY `idx_party_type` (`party_type`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `parties`
--

LOCK TABLES `parties` WRITE;
/*!40000 ALTER TABLE `parties` DISABLE KEYS */;
INSERT INTO `parties` VALUES (1,'Radhe Brass Industries','SUPPLIER',NULL,'+91 98250 88771',NULL,'Jamnagar GIDC Phase 2','24AABCR1234F1Z1',1,'2026-10-11 02:40:19','2026-10-11 02:40:19'),(2,'Shree Ram Metals','SUPPLIER',NULL,'+91 98250 44332',NULL,'Shankar Tekri, Jamnagar','24AABCS5678G1Z2',1,'2026-10-11 02:40:19','2026-10-11 02:40:19'),(3,'Apex Sanitary Ware Hub','BOTH',NULL,'+91 99112 33445',NULL,'Chawri Bazar, Delhi','07AACCA9988H1Z3',1,'2026-10-11 02:40:19','2026-10-11 03:50:12'),(4,'Royal Bath & Kitchen Mart','CUSTOMER',NULL,'+91 98200 66778',NULL,'Ghatkopar West, Mumbai','27AABCR4455J1Z4',1,'2026-10-11 02:40:19','2026-10-11 02:40:19'),(5,'Krishna Hardware & Traders','BOTH',NULL,'+91 97240 11990',NULL,'Bedi Gate, Jamnagar','24AACCK3322L1Z5',1,'2026-10-11 02:40:19','2026-10-11 02:40:19');
/*!40000 ALTER TABLE `parties` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `planning_releases`
--

DROP TABLE IF EXISTS `planning_releases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `planning_releases` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `release_number` varchar(50) NOT NULL,
  `planning_id` int(11) NOT NULL,
  `release_quantity` decimal(12,3) NOT NULL,
  `release_date` date NOT NULL,
  `released_by` int(11) NOT NULL DEFAULT 1,
  `status` enum('ACTIVE','CANCELLED') NOT NULL DEFAULT 'ACTIVE',
  `rm_deducted` tinyint(1) DEFAULT 0,
  `kitting_details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`kitting_details`)),
  `remarks` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_release_number` (`release_number`),
  KEY `idx_planning_id` (`planning_id`),
  KEY `idx_release_date` (`release_date`),
  CONSTRAINT `fk_pr_planning` FOREIGN KEY (`planning_id`) REFERENCES `production_planning` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `planning_releases`
--

LOCK TABLES `planning_releases` WRITE;
/*!40000 ALTER TABLE `planning_releases` DISABLE KEYS */;
INSERT INTO `planning_releases` VALUES (1,'BATCH-000001-A',1,100.000,'2026-10-10',1,'ACTIVE',0,NULL,'','2026-10-10 21:54:08','2026-10-10 22:42:08'),(2,'BATCH-000002-A',2,100.000,'2026-10-10',1,'ACTIVE',0,NULL,'','2026-10-10 21:57:33','2026-10-10 22:42:08'),(3,'BATCH-000003-A',3,100.000,'2026-10-10',1,'ACTIVE',0,NULL,'','2026-10-10 22:36:00','2026-10-10 22:42:08'),(4,'BATCH-000004-A',4,400.000,'2026-10-10',1,'ACTIVE',0,NULL,'','2026-10-10 22:36:55','2026-10-10 22:42:08'),(5,'BATCH-000004-B',4,100.000,'2026-10-10',1,'ACTIVE',0,NULL,'','2026-10-10 22:59:00','2026-10-10 22:59:00'),(6,'BATCH-000005-A',5,400.000,'2026-10-12',1,'ACTIVE',0,NULL,'','2026-10-12 21:10:28','2026-10-12 21:10:28'),(7,'BATCH-000005-B',5,600.000,'2026-10-12',1,'ACTIVE',0,NULL,'','2026-10-12 21:10:51','2026-10-12 21:10:51'),(8,'BATCH-000006-A',6,300.000,'2026-10-13',1,'ACTIVE',0,NULL,'','2026-10-13 19:20:05','2026-10-13 19:20:05'),(9,'BATCH-000006-B',6,300.000,'2026-10-13',1,'ACTIVE',0,NULL,'','2026-10-13 19:20:32','2026-10-13 19:20:32'),(10,'BATCH-000007-A',7,600.000,'2026-10-13',1,'ACTIVE',1,'[{\"rm_id\":1,\"rm_code\":\"RM-000001\",\"material_name\":\"Brass Rod 25MM (IS 319)\",\"qty_deducted\":210,\"unit_code\":\"KG\",\"new_stock\":-209},{\"rm_id\":8,\"rm_code\":\"RM-000008\",\"material_name\":\"Duplex Printed Product Box A1\",\"qty_deducted\":600,\"unit_code\":\"PCS\",\"new_stock\":-600}]','','2026-10-13 19:40:09','2026-10-19 21:51:17'),(11,'BATCH-000008-A',8,100.000,'2026-10-19',1,'ACTIVE',1,'[{\"rm_id\":1,\"rm_code\":\"RM-000001\",\"material_name\":\"Brass Rod 25MM (IS 319)\",\"qty_deducted\":185,\"unit_code\":\"KG\",\"new_stock\":315},{\"rm_id\":3,\"rm_code\":\"RM-000003\",\"material_name\":\"Ceramic Disc Cartridge 35MM\",\"qty_deducted\":100,\"unit_code\":\"PCS\",\"new_stock\":900},{\"rm_id\":4,\"rm_code\":\"RM-000004\",\"material_name\":\"Zinc Die-Cast Handle Lever\",\"qty_deducted\":100,\"unit_code\":\"PCS\",\"new_stock\":900},{\"rm_id\":5,\"rm_code\":\"RM-000005\",\"material_name\":\"SS 304 Screw M4x10\",\"qty_deducted\":200,\"unit_code\":\"PCS\",\"new_stock\":800},{\"rm_id\":6,\"rm_code\":\"RM-000006\",\"material_name\":\"EPDM O-Ring 22MM ID\",\"qty_deducted\":300,\"unit_code\":\"PCS\",\"new_stock\":700},{\"rm_id\":7,\"rm_code\":\"RM-000007\",\"material_name\":\"Brass Aerator M24 Neoperl Type\",\"qty_deducted\":100,\"unit_code\":\"PCS\",\"new_stock\":900},{\"rm_id\":8,\"rm_code\":\"RM-000008\",\"material_name\":\"Duplex Printed Product Box A1\",\"qty_deducted\":100,\"unit_code\":\"PCS\",\"new_stock\":900}]','','2026-10-19 22:29:29','2026-10-19 22:29:29');
/*!40000 ALTER TABLE `planning_releases` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `planning_revisions`
--

DROP TABLE IF EXISTS `planning_revisions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `planning_revisions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `planning_id` int(11) NOT NULL,
  `old_quantity` decimal(12,3) NOT NULL,
  `new_quantity` decimal(12,3) NOT NULL,
  `change_type` enum('INCREASE','DECREASE','CANCELLATION') NOT NULL,
  `reason` text NOT NULL,
  `revised_by` int(11) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_planning_id` (`planning_id`),
  CONSTRAINT `fk_pv_planning` FOREIGN KEY (`planning_id`) REFERENCES `production_planning` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `planning_revisions`
--

LOCK TABLES `planning_revisions` WRITE;
/*!40000 ALTER TABLE `planning_revisions` DISABLE KEYS */;
/*!40000 ALTER TABLE `planning_revisions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `process_product_mapping`
--

DROP TABLE IF EXISTS `process_product_mapping`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `process_product_mapping` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fg_id` int(11) NOT NULL,
  `process_id` int(11) NOT NULL,
  `sequence` int(11) NOT NULL DEFAULT 1,
  `is_mandatory` tinyint(1) DEFAULT 1,
  `expected_loss_percent` decimal(5,2) DEFAULT 0.00,
  `description` varchar(255) DEFAULT NULL,
  `active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_fg_sequence` (`fg_id`,`sequence`),
  KEY `process_id` (`process_id`),
  KEY `idx_route_fg` (`fg_id`),
  CONSTRAINT `process_product_mapping_ibfk_1` FOREIGN KEY (`fg_id`) REFERENCES `finished_goods` (`id`) ON DELETE CASCADE,
  CONSTRAINT `process_product_mapping_ibfk_2` FOREIGN KEY (`process_id`) REFERENCES `processes` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2196 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `process_product_mapping`
--

LOCK TABLES `process_product_mapping` WRITE;
/*!40000 ALTER TABLE `process_product_mapping` DISABLE KEYS */;
INSERT INTO `process_product_mapping` VALUES (1986,1,1,1,1,0.50,NULL,1,'2026-10-19 14:44:13'),(1987,1,10,2,1,0.50,NULL,1,'2026-10-19 14:44:13'),(1988,1,6,3,1,0.50,NULL,1,'2026-10-19 14:44:13'),(1989,1,7,4,1,0.50,NULL,1,'2026-10-19 14:44:13'),(1990,1,8,5,1,0.50,NULL,1,'2026-10-19 14:44:13'),(1991,1,9,6,1,0.50,NULL,1,'2026-10-19 14:44:13'),(1992,2,1,1,1,0.50,NULL,1,'2026-10-19 14:44:13'),(1993,2,10,2,1,0.50,NULL,1,'2026-10-19 14:44:13'),(1994,2,6,3,1,0.50,NULL,1,'2026-10-19 14:44:13'),(1995,2,7,4,1,0.50,NULL,1,'2026-10-19 14:44:13'),(1996,2,8,5,1,0.50,NULL,1,'2026-10-19 14:44:13'),(1997,2,9,6,1,0.50,NULL,1,'2026-10-19 14:44:13'),(1998,3,1,1,1,0.50,NULL,1,'2026-10-19 14:44:13'),(1999,3,10,2,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2000,3,6,3,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2001,3,7,4,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2002,3,8,5,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2003,3,9,6,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2004,4,1,1,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2005,4,10,2,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2006,4,6,3,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2007,4,7,4,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2008,4,8,5,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2009,4,9,6,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2010,5,1,1,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2011,5,10,2,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2012,5,6,3,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2013,5,7,4,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2014,5,8,5,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2015,5,9,6,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2016,6,1,1,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2017,6,10,2,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2018,6,6,3,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2019,6,7,4,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2020,6,8,5,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2021,6,9,6,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2022,7,1,1,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2023,7,10,2,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2024,7,6,3,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2025,7,7,4,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2026,7,8,5,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2027,7,9,6,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2028,8,1,1,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2029,8,10,2,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2030,8,6,3,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2031,8,7,4,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2032,8,8,5,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2033,8,9,6,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2034,9,1,1,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2035,9,10,2,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2036,9,6,3,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2037,9,7,4,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2038,9,8,5,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2039,9,9,6,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2040,10,1,1,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2041,10,10,2,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2042,10,6,3,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2043,10,7,4,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2044,10,8,5,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2045,10,9,6,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2046,11,1,1,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2047,11,10,2,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2048,11,6,3,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2049,11,7,4,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2050,11,8,5,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2051,11,9,6,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2052,12,1,1,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2053,12,10,2,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2054,12,6,3,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2055,12,7,4,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2056,12,8,5,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2057,12,9,6,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2058,13,1,1,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2059,13,10,2,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2060,13,6,3,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2061,13,7,4,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2062,13,8,5,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2063,13,9,6,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2064,14,1,1,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2065,14,10,2,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2066,14,6,3,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2067,14,7,4,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2068,14,8,5,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2069,14,9,6,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2070,15,1,1,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2071,15,10,2,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2072,15,6,3,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2073,15,7,4,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2074,15,8,5,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2075,15,9,6,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2076,16,1,1,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2077,16,10,2,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2078,16,6,3,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2079,16,7,4,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2080,16,8,5,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2081,16,9,6,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2082,17,1,1,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2083,17,10,2,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2084,17,6,3,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2085,17,7,4,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2086,17,8,5,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2087,17,9,6,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2088,18,1,1,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2089,18,10,2,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2090,18,6,3,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2091,18,7,4,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2092,18,8,5,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2093,18,9,6,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2094,19,1,1,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2095,19,10,2,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2096,19,6,3,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2097,19,7,4,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2098,19,8,5,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2099,19,9,6,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2100,20,1,1,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2101,20,10,2,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2102,20,6,3,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2103,20,7,4,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2104,20,8,5,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2105,20,9,6,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2106,21,1,1,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2107,21,10,2,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2108,21,6,3,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2109,21,7,4,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2110,21,8,5,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2111,21,9,6,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2112,22,1,1,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2113,22,10,2,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2114,22,6,3,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2115,22,7,4,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2116,22,8,5,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2117,22,9,6,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2118,23,1,1,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2119,23,10,2,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2120,23,6,3,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2121,23,7,4,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2122,23,8,5,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2123,23,9,6,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2124,24,1,1,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2125,24,10,2,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2126,24,6,3,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2127,24,7,4,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2128,24,8,5,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2129,24,9,6,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2130,25,1,1,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2131,25,10,2,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2132,25,6,3,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2133,25,7,4,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2134,25,8,5,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2135,25,9,6,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2136,26,1,1,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2137,26,10,2,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2138,26,6,3,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2139,26,7,4,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2140,26,8,5,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2141,26,9,6,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2142,27,1,1,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2143,27,10,2,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2144,27,6,3,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2145,27,7,4,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2146,27,8,5,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2147,27,9,6,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2148,28,1,1,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2149,28,10,2,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2150,28,6,3,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2151,28,7,4,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2152,28,8,5,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2153,28,9,6,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2154,29,1,1,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2155,29,10,2,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2156,29,6,3,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2157,29,7,4,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2158,29,8,5,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2159,29,9,6,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2160,30,1,1,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2161,30,10,2,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2162,30,6,3,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2163,30,7,4,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2164,30,8,5,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2165,30,9,6,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2166,31,1,1,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2167,31,10,2,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2168,31,6,3,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2169,31,7,4,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2170,31,8,5,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2171,31,9,6,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2172,32,1,1,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2173,32,10,2,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2174,32,6,3,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2175,32,7,4,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2176,32,8,5,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2177,32,9,6,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2178,33,1,1,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2179,33,10,2,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2180,33,6,3,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2181,33,7,4,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2182,33,8,5,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2183,33,9,6,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2184,34,1,1,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2185,34,10,2,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2186,34,6,3,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2187,34,7,4,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2188,34,8,5,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2189,34,9,6,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2190,35,1,1,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2191,35,10,2,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2192,35,6,3,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2193,35,7,4,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2194,35,8,5,1,0.50,NULL,1,'2026-10-19 14:44:13'),(2195,35,9,6,1,0.50,NULL,1,'2026-10-19 14:44:13');
/*!40000 ALTER TABLE `process_product_mapping` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `processes`
--

DROP TABLE IF EXISTS `processes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `processes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `process_code` varchar(50) NOT NULL,
  `process_name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `standard_duration_minutes` int(11) DEFAULT 0,
  `sequence` int(11) DEFAULT 1,
  `active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `process_code` (`process_code`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `processes`
--

LOCK TABLES `processes` WRITE;
/*!40000 ALTER TABLE `processes` DISABLE KEYS */;
INSERT INTO `processes` VALUES (1,'PROC-CAST','Casting','Stage: Casting',30,1,1,'2026-10-08 14:00:53','2026-10-19 14:44:13'),(6,'PROC-PLATE','Grinding','Stage: Grinding',60,3,1,'2026-10-08 14:00:53','2026-10-19 14:44:13'),(7,'PROC-ASSY','Polishing','Stage: Polishing',15,4,1,'2026-10-08 14:00:53','2026-10-19 14:44:13'),(8,'PROC-QC','Assembly','Stage: Assembly',10,5,1,'2026-10-08 14:00:53','2026-10-19 14:44:13'),(9,'PROC-PACK','Packing','Stage: Packing',10,6,1,'2026-10-08 14:00:53','2026-10-19 14:44:13'),(10,'PROC-6','Machining','Stage: Machining',30,2,1,'2026-10-13 13:58:27','2026-10-19 14:44:13');
/*!40000 ALTER TABLE `processes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `production_consumption`
--

DROP TABLE IF EXISTS `production_consumption`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `production_consumption` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `production_order_id` int(11) NOT NULL,
  `stage_entry_id` int(11) DEFAULT NULL,
  `rm_id` int(11) NOT NULL,
  `rm_code` varchar(50) NOT NULL,
  `planned_quantity` decimal(14,3) NOT NULL,
  `reserved_quantity` decimal(14,3) NOT NULL DEFAULT 0.000,
  `consumed_quantity` decimal(14,3) NOT NULL DEFAULT 0.000,
  `unit_id` int(11) NOT NULL,
  `consumption_date` date NOT NULL,
  `operator_id` int(11) DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `unit_id` (`unit_id`),
  KEY `idx_cons_prod` (`production_order_id`),
  KEY `idx_cons_rm` (`rm_id`),
  CONSTRAINT `production_consumption_ibfk_1` FOREIGN KEY (`production_order_id`) REFERENCES `production_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `production_consumption_ibfk_2` FOREIGN KEY (`rm_id`) REFERENCES `raw_materials` (`id`),
  CONSTRAINT `production_consumption_ibfk_3` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=84 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `production_consumption`
--

LOCK TABLES `production_consumption` WRITE;
/*!40000 ALTER TABLE `production_consumption` DISABLE KEYS */;
INSERT INTO `production_consumption` VALUES (1,1,1,1,'RM-000001',115.000,115.000,115.000,1,'2026-10-08',3,'Cast from high grade brass rod','2026-10-08 14:00:53'),(2,1,7,3,'RM-000003',100.000,100.000,0.000,3,'2026-10-08',NULL,'To be consumed at Assembly stage','2026-10-08 14:00:53'),(3,1,7,4,'RM-000004',100.000,100.000,0.000,3,'2026-10-08',NULL,'To be consumed at Assembly stage','2026-10-08 14:00:53'),(4,1,7,5,'RM-000005',100.000,100.000,0.000,3,'2026-10-08',NULL,'To be consumed at Assembly stage','2026-10-08 14:00:53'),(5,1,7,6,'RM-000006',200.000,200.000,0.000,3,'2026-10-08',NULL,'To be consumed at Assembly stage','2026-10-08 14:00:53'),(6,1,9,8,'RM-000008',100.000,100.000,0.000,3,'2026-10-08',NULL,'To be consumed at Packing stage','2026-10-08 14:00:53'),(14,3,NULL,1,'RM-000001',59.225,59.225,0.000,1,'2026-10-08',NULL,NULL,'2026-10-08 14:07:02'),(15,3,NULL,3,'RM-000003',50.250,50.250,0.000,3,'2026-10-08',NULL,NULL,'2026-10-08 14:07:02'),(16,3,NULL,4,'RM-000004',50.500,50.500,0.000,3,'2026-10-08',NULL,NULL,'2026-10-08 14:07:02'),(17,3,NULL,5,'RM-000005',51.000,51.000,0.000,3,'2026-10-08',NULL,NULL,'2026-10-08 14:07:02'),(18,3,NULL,6,'RM-000006',101.000,101.000,0.000,3,'2026-10-08',NULL,NULL,'2026-10-08 14:07:02'),(19,3,NULL,7,'RM-000007',50.250,50.250,0.000,3,'2026-10-08',NULL,NULL,'2026-10-08 14:07:02'),(20,3,NULL,8,'RM-000008',50.250,50.250,0.000,3,'2026-10-08',NULL,NULL,'2026-10-08 14:07:02'),(21,4,NULL,1,'RM-000001',59.225,59.225,0.000,1,'2026-10-08',NULL,NULL,'2026-10-08 14:13:16'),(22,4,NULL,3,'RM-000003',50.250,50.250,0.000,3,'2026-10-08',NULL,NULL,'2026-10-08 14:13:16'),(23,4,NULL,4,'RM-000004',50.500,50.500,0.000,3,'2026-10-08',NULL,NULL,'2026-10-08 14:13:16'),(24,4,NULL,5,'RM-000005',51.000,51.000,0.000,3,'2026-10-08',NULL,NULL,'2026-10-08 14:13:16'),(25,4,NULL,6,'RM-000006',101.000,101.000,0.000,3,'2026-10-08',NULL,NULL,'2026-10-08 14:13:16'),(26,4,NULL,7,'RM-000007',50.250,50.250,0.000,3,'2026-10-08',NULL,NULL,'2026-10-08 14:13:16'),(27,4,NULL,8,'RM-000008',50.250,50.250,0.000,3,'2026-10-08',NULL,NULL,'2026-10-08 14:13:16'),(28,5,NULL,1,'RM-000001',59.225,59.225,0.000,1,'2026-10-08',NULL,NULL,'2026-10-08 14:21:49'),(29,5,NULL,3,'RM-000003',50.250,50.250,0.000,3,'2026-10-08',NULL,NULL,'2026-10-08 14:21:49'),(30,5,NULL,4,'RM-000004',50.500,50.500,0.000,3,'2026-10-08',NULL,NULL,'2026-10-08 14:21:49'),(31,5,NULL,5,'RM-000005',51.000,51.000,0.000,3,'2026-10-08',NULL,NULL,'2026-10-08 14:21:49'),(32,5,NULL,6,'RM-000006',101.000,101.000,0.000,3,'2026-10-08',NULL,NULL,'2026-10-08 14:21:49'),(33,5,NULL,7,'RM-000007',50.250,50.250,0.000,3,'2026-10-08',NULL,NULL,'2026-10-08 14:21:49'),(34,5,NULL,8,'RM-000008',50.250,50.250,0.000,3,'2026-10-08',NULL,NULL,'2026-10-08 14:21:49'),(35,6,NULL,1,'RM-000001',59.225,59.225,0.000,1,'2026-10-08',NULL,NULL,'2026-10-08 14:30:50'),(36,6,NULL,3,'RM-000003',50.250,50.250,0.000,3,'2026-10-08',NULL,NULL,'2026-10-08 14:30:50'),(37,6,NULL,4,'RM-000004',50.500,50.500,0.000,3,'2026-10-08',NULL,NULL,'2026-10-08 14:30:50'),(38,6,NULL,5,'RM-000005',51.000,51.000,0.000,3,'2026-10-08',NULL,NULL,'2026-10-08 14:30:50'),(39,6,NULL,6,'RM-000006',101.000,101.000,0.000,3,'2026-10-08',NULL,NULL,'2026-10-08 14:30:50'),(40,6,NULL,7,'RM-000007',50.250,50.250,0.000,3,'2026-10-08',NULL,NULL,'2026-10-08 14:30:50'),(41,6,NULL,8,'RM-000008',50.250,50.250,0.000,3,'2026-10-08',NULL,NULL,'2026-10-08 14:30:50'),(42,7,NULL,1,'RM-000001',59.225,59.225,0.000,1,'2026-10-08',NULL,NULL,'2026-10-08 14:37:38'),(43,7,NULL,3,'RM-000003',50.250,50.250,0.000,3,'2026-10-08',NULL,NULL,'2026-10-08 14:37:38'),(44,7,NULL,4,'RM-000004',50.500,50.500,0.000,3,'2026-10-08',NULL,NULL,'2026-10-08 14:37:38'),(45,7,NULL,5,'RM-000005',51.000,51.000,0.000,3,'2026-10-08',NULL,NULL,'2026-10-08 14:37:38'),(46,7,NULL,6,'RM-000006',101.000,101.000,0.000,3,'2026-10-08',NULL,NULL,'2026-10-08 14:37:38'),(47,7,NULL,7,'RM-000007',50.250,50.250,0.000,3,'2026-10-08',NULL,NULL,'2026-10-08 14:37:38'),(48,7,NULL,8,'RM-000008',50.250,50.250,0.000,3,'2026-10-08',NULL,NULL,'2026-10-08 14:37:38'),(49,8,NULL,1,'RM-000001',59.225,59.225,0.000,1,'2026-10-08',NULL,NULL,'2026-10-08 14:40:25'),(50,8,NULL,3,'RM-000003',50.250,50.250,0.000,3,'2026-10-08',NULL,NULL,'2026-10-08 14:40:25'),(51,8,NULL,4,'RM-000004',50.500,50.500,0.000,3,'2026-10-08',NULL,NULL,'2026-10-08 14:40:25'),(52,8,NULL,5,'RM-000005',51.000,51.000,0.000,3,'2026-10-08',NULL,NULL,'2026-10-08 14:40:25'),(53,8,NULL,6,'RM-000006',101.000,101.000,0.000,3,'2026-10-08',NULL,NULL,'2026-10-08 14:40:25'),(54,8,NULL,7,'RM-000007',50.250,50.250,0.000,3,'2026-10-08',NULL,NULL,'2026-10-08 14:40:25'),(55,8,NULL,8,'RM-000008',50.250,50.250,0.000,3,'2026-10-08',NULL,NULL,'2026-10-08 14:40:25'),(56,1,NULL,1,'RM-000001',57.500,0.000,0.000,1,'2026-10-19',NULL,NULL,'2026-10-19 16:47:58'),(57,1,NULL,3,'RM-000003',50.000,0.000,0.000,3,'2026-10-19',NULL,NULL,'2026-10-19 16:47:58'),(58,1,NULL,4,'RM-000004',50.000,0.000,0.000,3,'2026-10-19',NULL,NULL,'2026-10-19 16:47:58'),(59,1,NULL,5,'RM-000005',50.000,0.000,0.000,3,'2026-10-19',NULL,NULL,'2026-10-19 16:47:58'),(60,1,NULL,6,'RM-000006',100.000,0.000,0.000,3,'2026-10-19',NULL,NULL,'2026-10-19 16:47:58'),(61,1,NULL,7,'RM-000007',50.000,0.000,0.000,3,'2026-10-19',NULL,NULL,'2026-10-19 16:47:58'),(62,1,NULL,8,'RM-000008',50.000,0.000,0.000,3,'2026-10-19',NULL,NULL,'2026-10-19 16:47:58'),(63,2,NULL,1,'RM-000001',57.500,0.000,0.000,1,'2026-10-19',NULL,NULL,'2026-10-19 16:50:01'),(64,2,NULL,3,'RM-000003',50.000,0.000,0.000,3,'2026-10-19',NULL,NULL,'2026-10-19 16:50:01'),(65,2,NULL,4,'RM-000004',50.000,0.000,0.000,3,'2026-10-19',NULL,NULL,'2026-10-19 16:50:01'),(66,2,NULL,5,'RM-000005',50.000,0.000,0.000,3,'2026-10-19',NULL,NULL,'2026-10-19 16:50:01'),(67,2,NULL,6,'RM-000006',100.000,0.000,0.000,3,'2026-10-19',NULL,NULL,'2026-10-19 16:50:01'),(68,2,NULL,7,'RM-000007',50.000,0.000,0.000,3,'2026-10-19',NULL,NULL,'2026-10-19 16:50:01'),(69,2,NULL,8,'RM-000008',50.000,0.000,0.000,3,'2026-10-19',NULL,NULL,'2026-10-19 16:50:01'),(70,3,NULL,1,'RM-000001',57.500,57.500,0.000,1,'2026-10-19',NULL,NULL,'2026-10-19 16:50:45'),(71,3,NULL,3,'RM-000003',50.000,50.000,0.000,3,'2026-10-19',NULL,NULL,'2026-10-19 16:50:45'),(72,3,NULL,4,'RM-000004',50.000,50.000,0.000,3,'2026-10-19',NULL,NULL,'2026-10-19 16:50:45'),(73,3,NULL,5,'RM-000005',50.000,50.000,0.000,3,'2026-10-19',NULL,NULL,'2026-10-19 16:50:45'),(74,3,NULL,6,'RM-000006',100.000,100.000,0.000,3,'2026-10-19',NULL,NULL,'2026-10-19 16:50:45'),(75,3,NULL,7,'RM-000007',50.000,50.000,0.000,3,'2026-10-19',NULL,NULL,'2026-10-19 16:50:45'),(76,3,NULL,8,'RM-000008',50.000,50.000,0.000,3,'2026-10-19',NULL,NULL,'2026-10-19 16:50:45'),(77,4,NULL,1,'RM-000001',57.500,57.500,0.000,1,'2026-10-19',NULL,NULL,'2026-10-19 16:57:12'),(78,4,NULL,3,'RM-000003',50.000,50.000,0.000,3,'2026-10-19',NULL,NULL,'2026-10-19 16:57:12'),(79,4,NULL,4,'RM-000004',50.000,50.000,0.000,3,'2026-10-19',NULL,NULL,'2026-10-19 16:57:12'),(80,4,NULL,5,'RM-000005',50.000,50.000,0.000,3,'2026-10-19',NULL,NULL,'2026-10-19 16:57:12'),(81,4,NULL,6,'RM-000006',100.000,100.000,0.000,3,'2026-10-19',NULL,NULL,'2026-10-19 16:57:12'),(82,4,NULL,7,'RM-000007',50.000,50.000,0.000,3,'2026-10-19',NULL,NULL,'2026-10-19 16:57:12'),(83,4,NULL,8,'RM-000008',50.000,50.000,0.000,3,'2026-10-19',NULL,NULL,'2026-10-19 16:57:12');
/*!40000 ALTER TABLE `production_consumption` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `production_orders`
--

DROP TABLE IF EXISTS `production_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `production_orders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `production_number` varchar(50) NOT NULL,
  `fg_id` int(11) NOT NULL,
  `bom_id` int(11) NOT NULL,
  `warehouse_id` int(11) NOT NULL DEFAULT 1,
  `planned_quantity` decimal(14,3) NOT NULL,
  `produced_quantity` decimal(14,3) DEFAULT 0.000,
  `rejected_quantity` decimal(14,3) DEFAULT 0.000,
  `scrap_quantity` decimal(14,3) DEFAULT 0.000,
  `priority` enum('LOW','NORMAL','HIGH','URGENT') DEFAULT 'NORMAL',
  `status` enum('DRAFT','PLANNED','APPROVED','MATERIAL_RESERVED','IN_PROGRESS','ON_HOLD','COMPLETED','CANCELLED') DEFAULT 'PLANNED',
  `planned_start_date` date NOT NULL,
  `planned_end_date` date DEFAULT NULL,
  `actual_start_date` datetime DEFAULT NULL,
  `actual_end_date` datetime DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `approved_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `production_number` (`production_number`),
  KEY `bom_id` (`bom_id`),
  KEY `warehouse_id` (`warehouse_id`),
  KEY `idx_prod_status` (`status`),
  KEY `idx_prod_fg` (`fg_id`),
  KEY `idx_prod_date` (`planned_start_date`),
  CONSTRAINT `production_orders_ibfk_1` FOREIGN KEY (`fg_id`) REFERENCES `finished_goods` (`id`),
  CONSTRAINT `production_orders_ibfk_2` FOREIGN KEY (`bom_id`) REFERENCES `bom_headers` (`id`),
  CONSTRAINT `production_orders_ibfk_3` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `production_orders`
--

LOCK TABLES `production_orders` WRITE;
/*!40000 ALTER TABLE `production_orders` DISABLE KEYS */;
INSERT INTO `production_orders` VALUES (1,'PROD-000001',1,1,1,50.000,0.000,0.000,0.000,'HIGH','PLANNED','2026-10-19',NULL,NULL,NULL,'Automated Test Batch',1,NULL,'2026-10-19 16:47:58','2026-10-19 16:47:58'),(2,'PROD-000002',1,1,1,50.000,0.000,0.000,0.000,'HIGH','PLANNED','2026-10-19',NULL,NULL,NULL,'Automated Test Batch',1,NULL,'2026-10-19 16:50:01','2026-10-19 16:50:01'),(3,'PROD-000003',1,1,1,50.000,0.000,0.000,0.000,'HIGH','IN_PROGRESS','2026-10-19',NULL,'2026-10-19 18:50:45',NULL,'Automated Test Batch',1,1,'2026-10-19 16:50:45','2026-10-19 16:50:45'),(4,'PROD-000004',1,1,1,50.000,0.000,0.000,0.000,'HIGH','IN_PROGRESS','2026-10-19',NULL,'2026-10-19 18:57:12',NULL,'Automated Test Batch',1,1,'2026-10-19 16:57:12','2026-10-19 16:57:12');
/*!40000 ALTER TABLE `production_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `production_outputs`
--

DROP TABLE IF EXISTS `production_outputs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `production_outputs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `production_order_id` int(11) NOT NULL,
  `fg_id` int(11) NOT NULL,
  `fg_code` varchar(50) NOT NULL,
  `warehouse_id` int(11) NOT NULL DEFAULT 1,
  `accepted_quantity` decimal(14,3) NOT NULL,
  `rejected_quantity` decimal(14,3) DEFAULT 0.000,
  `batch_lot_number` varchar(100) DEFAULT NULL,
  `output_date` date NOT NULL,
  `remarks` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `warehouse_id` (`warehouse_id`),
  KEY `idx_out_prod` (`production_order_id`),
  KEY `idx_out_fg` (`fg_id`),
  CONSTRAINT `production_outputs_ibfk_1` FOREIGN KEY (`production_order_id`) REFERENCES `production_orders` (`id`),
  CONSTRAINT `production_outputs_ibfk_2` FOREIGN KEY (`fg_id`) REFERENCES `finished_goods` (`id`),
  CONSTRAINT `production_outputs_ibfk_3` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `production_outputs`
--

LOCK TABLES `production_outputs` WRITE;
/*!40000 ALTER TABLE `production_outputs` DISABLE KEYS */;
/*!40000 ALTER TABLE `production_outputs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `production_planning`
--

DROP TABLE IF EXISTS `production_planning`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `production_planning` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `planning_number` varchar(20) NOT NULL,
  `fg_id` int(11) NOT NULL,
  `unit_id` int(11) NOT NULL DEFAULT 3,
  `warehouse_id` int(11) NOT NULL DEFAULT 3,
  `planned_quantity` decimal(12,3) NOT NULL,
  `released_quantity` decimal(12,3) NOT NULL DEFAULT 0.000,
  `produced_quantity` decimal(12,3) NOT NULL DEFAULT 0.000,
  `rejected_quantity` decimal(12,3) NOT NULL DEFAULT 0.000,
  `completed_quantity` decimal(12,3) NOT NULL DEFAULT 0.000,
  `priority` enum('LOW','NORMAL','HIGH','CRITICAL') NOT NULL DEFAULT 'NORMAL',
  `status` enum('DRAFT','PLANNED','APPROVED','PARTIALLY_RELEASED','FULLY_RELEASED','CANCELLED','COMPLETED') NOT NULL DEFAULT 'PLANNED',
  `planning_date` date NOT NULL,
  `required_date` date DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `created_by` int(11) NOT NULL DEFAULT 1,
  `approved_by` int(11) DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `cancelled_by` int(11) DEFAULT NULL,
  `cancelled_at` datetime DEFAULT NULL,
  `cancel_reason` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_planning_number` (`planning_number`),
  KEY `idx_fg_id` (`fg_id`),
  KEY `idx_status` (`status`),
  KEY `idx_planning_date` (`planning_date`),
  KEY `idx_priority` (`priority`),
  KEY `fk_pp_unit` (`unit_id`),
  KEY `fk_pp_warehouse` (`warehouse_id`),
  CONSTRAINT `fk_pp_fg` FOREIGN KEY (`fg_id`) REFERENCES `finished_goods` (`id`),
  CONSTRAINT `fk_pp_unit` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`),
  CONSTRAINT `fk_pp_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `production_planning`
--

LOCK TABLES `production_planning` WRITE;
/*!40000 ALTER TABLE `production_planning` DISABLE KEYS */;
INSERT INTO `production_planning` VALUES (1,'PLN-000001',2,3,2,100.000,100.000,0.000,0.000,0.000,'HIGH','FULLY_RELEASED','2026-10-10','2026-10-24','',1,1,'2026-10-10 21:53:52',NULL,NULL,NULL,'2026-10-10 21:53:47','2026-10-10 21:54:08'),(2,'PLN-000002',2,3,3,100.000,100.000,0.000,0.000,0.000,'NORMAL','FULLY_RELEASED','2026-10-10','2026-10-11','',1,1,'2026-10-10 21:57:27',NULL,NULL,NULL,'2026-10-10 21:57:24','2026-10-10 21:57:33'),(3,'PLN-000003',2,3,3,100.000,100.000,0.000,0.000,0.000,'NORMAL','FULLY_RELEASED','2026-10-10','2026-10-17','',1,1,'2026-10-10 22:35:56',NULL,NULL,NULL,'2026-10-10 22:35:52','2026-10-10 22:36:00'),(4,'PLN-000004',2,3,3,500.000,500.000,0.000,0.000,0.000,'NORMAL','FULLY_RELEASED','2026-10-10',NULL,'',1,1,'2026-10-10 22:36:50',NULL,NULL,NULL,'2026-10-10 22:36:48','2026-10-10 22:59:00'),(5,'PLN-000005',28,3,3,1000.000,1000.000,0.000,0.000,0.000,'NORMAL','FULLY_RELEASED','2026-10-12','2026-10-17','',1,1,'2026-10-12 21:09:43',NULL,NULL,NULL,'2026-10-12 21:09:33','2026-10-12 21:10:51'),(6,'PLN-000006',8,3,3,600.000,600.000,0.000,0.000,0.000,'HIGH','FULLY_RELEASED','2026-10-13','2026-10-20','',1,1,'2026-10-13 19:13:46',NULL,NULL,NULL,'2026-10-13 19:08:50','2026-10-13 19:20:32'),(7,'PLN-000007',4,3,3,600.000,600.000,600.000,0.000,600.000,'NORMAL','COMPLETED','2026-10-13','2026-10-22','',1,1,'2026-10-13 19:40:04',NULL,NULL,NULL,'2026-10-13 19:40:03','2026-10-19 20:45:38'),(8,'PLN-000008',2,3,2,100.000,100.000,100.000,0.000,100.000,'HIGH','COMPLETED','2026-10-19','2026-10-31','',1,1,'2026-10-19 22:28:53',NULL,NULL,NULL,'2026-10-19 22:28:50','2026-10-19 22:29:49');
/*!40000 ALTER TABLE `production_planning` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `production_rejections`
--

DROP TABLE IF EXISTS `production_rejections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `production_rejections` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `production_order_id` int(11) NOT NULL,
  `stage_entry_id` int(11) NOT NULL,
  `rejection_reason_id` int(11) NOT NULL,
  `quantity` decimal(14,3) NOT NULL,
  `scrap_recoverable_quantity` decimal(14,3) DEFAULT 0.000,
  `scrap_material_id` int(11) DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `scrap_material_id` (`scrap_material_id`),
  KEY `idx_rej_order` (`production_order_id`),
  KEY `idx_rej_stage` (`stage_entry_id`),
  KEY `idx_rej_reason` (`rejection_reason_id`),
  CONSTRAINT `production_rejections_ibfk_1` FOREIGN KEY (`production_order_id`) REFERENCES `production_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `production_rejections_ibfk_2` FOREIGN KEY (`stage_entry_id`) REFERENCES `production_stage_entries` (`id`) ON DELETE CASCADE,
  CONSTRAINT `production_rejections_ibfk_3` FOREIGN KEY (`rejection_reason_id`) REFERENCES `rejection_reasons` (`id`),
  CONSTRAINT `production_rejections_ibfk_4` FOREIGN KEY (`scrap_material_id`) REFERENCES `scrap_materials` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `production_rejections`
--

LOCK TABLES `production_rejections` WRITE;
/*!40000 ALTER TABLE `production_rejections` DISABLE KEYS */;
INSERT INTO `production_rejections` VALUES (1,3,13,1,2.000,2.300,2,'Porosity in test batch',3,'2026-10-19 16:50:45'),(2,4,19,1,2.000,2.300,2,'Porosity in test batch',3,'2026-10-19 16:57:12');
/*!40000 ALTER TABLE `production_rejections` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `production_stage_entries`
--

DROP TABLE IF EXISTS `production_stage_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `production_stage_entries` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `production_order_id` int(11) NOT NULL,
  `process_id` int(11) NOT NULL,
  `sequence` int(11) NOT NULL,
  `input_quantity` decimal(14,3) NOT NULL DEFAULT 0.000,
  `good_quantity` decimal(14,3) NOT NULL DEFAULT 0.000,
  `rejected_quantity` decimal(14,3) NOT NULL DEFAULT 0.000,
  `scrap_quantity` decimal(14,3) NOT NULL DEFAULT 0.000,
  `loss_quantity` decimal(14,3) NOT NULL DEFAULT 0.000,
  `status` enum('PENDING','READY','IN_PROGRESS','PAUSED','COMPLETED','SKIPPED','ON_HOLD') DEFAULT 'PENDING',
  `started_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `total_duration_minutes` int(11) DEFAULT 0,
  `operator_id` int(11) DEFAULT NULL,
  `supervisor_id` int(11) DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `process_id` (`process_id`),
  KEY `idx_stage_prod` (`production_order_id`),
  KEY `idx_stage_status` (`status`),
  CONSTRAINT `production_stage_entries_ibfk_1` FOREIGN KEY (`production_order_id`) REFERENCES `production_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `production_stage_entries_ibfk_2` FOREIGN KEY (`process_id`) REFERENCES `processes` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `production_stage_entries`
--

LOCK TABLES `production_stage_entries` WRITE;
/*!40000 ALTER TABLE `production_stage_entries` DISABLE KEYS */;
INSERT INTO `production_stage_entries` VALUES (1,1,1,1,50.000,0.000,0.000,0.000,0.000,'READY',NULL,NULL,0,NULL,NULL,NULL,'2026-10-19 16:47:58','2026-10-19 16:47:58'),(2,1,10,2,0.000,0.000,0.000,0.000,0.000,'PENDING',NULL,NULL,0,NULL,NULL,NULL,'2026-10-19 16:47:58','2026-10-19 16:47:58'),(3,1,6,3,0.000,0.000,0.000,0.000,0.000,'PENDING',NULL,NULL,0,NULL,NULL,NULL,'2026-10-19 16:47:58','2026-10-19 16:47:58'),(4,1,7,4,0.000,0.000,0.000,0.000,0.000,'PENDING',NULL,NULL,0,NULL,NULL,NULL,'2026-10-19 16:47:58','2026-10-19 16:47:58'),(5,1,8,5,0.000,0.000,0.000,0.000,0.000,'PENDING',NULL,NULL,0,NULL,NULL,NULL,'2026-10-19 16:47:58','2026-10-19 16:47:58'),(6,1,9,6,0.000,0.000,0.000,0.000,0.000,'PENDING',NULL,NULL,0,NULL,NULL,NULL,'2026-10-19 16:47:58','2026-10-19 16:47:58'),(7,2,1,1,50.000,0.000,0.000,0.000,0.000,'READY',NULL,NULL,0,NULL,NULL,NULL,'2026-10-19 16:50:01','2026-10-19 16:50:01'),(8,2,10,2,0.000,0.000,0.000,0.000,0.000,'PENDING',NULL,NULL,0,NULL,NULL,NULL,'2026-10-19 16:50:01','2026-10-19 16:50:01'),(9,2,6,3,0.000,0.000,0.000,0.000,0.000,'PENDING',NULL,NULL,0,NULL,NULL,NULL,'2026-10-19 16:50:01','2026-10-19 16:50:01'),(10,2,7,4,0.000,0.000,0.000,0.000,0.000,'PENDING',NULL,NULL,0,NULL,NULL,NULL,'2026-10-19 16:50:01','2026-10-19 16:50:01'),(11,2,8,5,0.000,0.000,0.000,0.000,0.000,'PENDING',NULL,NULL,0,NULL,NULL,NULL,'2026-10-19 16:50:01','2026-10-19 16:50:01'),(12,2,9,6,0.000,0.000,0.000,0.000,0.000,'PENDING',NULL,NULL,0,NULL,NULL,NULL,'2026-10-19 16:50:01','2026-10-19 16:50:01'),(13,3,1,1,50.000,48.000,2.000,2.300,0.000,'COMPLETED','2026-10-19 18:50:45','2026-10-19 18:50:45',1,3,1,' Stage 1 finished with 48 good parts','2026-10-19 16:50:45','2026-10-19 16:50:45'),(14,3,10,2,48.000,0.000,0.000,0.000,0.000,'READY',NULL,NULL,0,NULL,NULL,NULL,'2026-10-19 16:50:45','2026-10-19 16:50:45'),(15,3,6,3,0.000,0.000,0.000,0.000,0.000,'PENDING',NULL,NULL,0,NULL,NULL,NULL,'2026-10-19 16:50:45','2026-10-19 16:50:45'),(16,3,7,4,0.000,0.000,0.000,0.000,0.000,'PENDING',NULL,NULL,0,NULL,NULL,NULL,'2026-10-19 16:50:45','2026-10-19 16:50:45'),(17,3,8,5,0.000,0.000,0.000,0.000,0.000,'PENDING',NULL,NULL,0,NULL,NULL,NULL,'2026-10-19 16:50:45','2026-10-19 16:50:45'),(18,3,9,6,0.000,0.000,0.000,0.000,0.000,'PENDING',NULL,NULL,0,NULL,NULL,NULL,'2026-10-19 16:50:45','2026-10-19 16:50:45'),(19,4,1,1,50.000,48.000,2.000,2.300,0.000,'COMPLETED','2026-10-19 18:57:12','2026-10-19 18:57:12',1,3,1,' Stage 1 finished with 48 good parts','2026-10-19 16:57:12','2026-10-19 16:57:12'),(20,4,10,2,48.000,0.000,0.000,0.000,0.000,'READY',NULL,NULL,0,NULL,NULL,NULL,'2026-10-19 16:57:12','2026-10-19 16:57:13'),(21,4,6,3,0.000,0.000,0.000,0.000,0.000,'PENDING',NULL,NULL,0,NULL,NULL,NULL,'2026-10-19 16:57:12','2026-10-19 16:57:12'),(22,4,7,4,0.000,0.000,0.000,0.000,0.000,'PENDING',NULL,NULL,0,NULL,NULL,NULL,'2026-10-19 16:57:12','2026-10-19 16:57:12'),(23,4,8,5,0.000,0.000,0.000,0.000,0.000,'PENDING',NULL,NULL,0,NULL,NULL,NULL,'2026-10-19 16:57:12','2026-10-19 16:57:12'),(24,4,9,6,0.000,0.000,0.000,0.000,0.000,'PENDING',NULL,NULL,0,NULL,NULL,NULL,'2026-10-19 16:57:12','2026-10-19 16:57:12');
/*!40000 ALTER TABLE `production_stage_entries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `production_stage_logs`
--

DROP TABLE IF EXISTS `production_stage_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `production_stage_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `stage_entry_id` int(11) NOT NULL,
  `action` enum('START','PAUSE','RESUME','COMPLETE','HOLD') NOT NULL,
  `action_time` datetime NOT NULL,
  `operator_id` int(11) DEFAULT NULL,
  `reason` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `stage_entry_id` (`stage_entry_id`),
  CONSTRAINT `production_stage_logs_ibfk_1` FOREIGN KEY (`stage_entry_id`) REFERENCES `production_stage_entries` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `production_stage_logs`
--

LOCK TABLES `production_stage_logs` WRITE;
/*!40000 ALTER TABLE `production_stage_logs` DISABLE KEYS */;
INSERT INTO `production_stage_logs` VALUES (1,19,'START','2026-10-08 16:07:02',3,NULL),(2,19,'COMPLETE','2026-10-08 16:07:02',3,NULL),(3,28,'START','2026-10-08 16:13:16',3,NULL),(4,28,'COMPLETE','2026-10-08 16:13:16',3,NULL),(5,37,'START','2026-10-08 16:21:49',3,NULL),(6,37,'COMPLETE','2026-10-08 16:21:49',3,NULL),(7,20,'START','2026-10-08 19:56:38',1,NULL),(8,20,'PAUSE','2026-10-08 19:56:41',1,'Operator pause'),(9,46,'START','2026-10-08 16:30:50',3,NULL),(10,46,'COMPLETE','2026-10-08 16:30:50',3,NULL),(11,47,'START','2026-10-08 20:01:51',1,NULL),(12,47,'COMPLETE','2026-10-08 20:01:59',1,NULL),(13,4,'COMPLETE','2026-10-08 20:02:14',1,NULL),(14,20,'RESUME','2026-10-08 20:02:43',1,NULL),(15,20,'COMPLETE','2026-10-08 20:02:45',1,NULL),(16,55,'START','2026-10-08 16:37:38',3,NULL),(17,55,'COMPLETE','2026-10-08 16:37:38',3,NULL),(18,64,'START','2026-10-08 16:40:25',3,NULL),(19,64,'COMPLETE','2026-10-08 16:40:25',3,NULL),(20,13,'START','2026-10-19 18:50:45',3,NULL),(21,13,'COMPLETE','2026-10-19 18:50:45',3,NULL),(22,19,'START','2026-10-19 18:57:12',3,NULL),(23,19,'COMPLETE','2026-10-19 18:57:12',3,NULL);
/*!40000 ALTER TABLE `production_stage_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_import_batches`
--

DROP TABLE IF EXISTS `purchase_import_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `purchase_import_batches` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `batch_code` varchar(50) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_hash` varchar(64) NOT NULL,
  `total_rows` int(11) DEFAULT 0,
  `successful_rows` int(11) DEFAULT 0,
  `failed_rows` int(11) DEFAULT 0,
  `duplicate_rows` int(11) DEFAULT 0,
  `unmapped_rows` int(11) DEFAULT 0,
  `status` enum('UPLOADED','VALIDATING','VALIDATION_FAILED','PENDING_CONFIRMATION','IMPORTED','PARTIALLY_IMPORTED','REVERSED','FAILED') DEFAULT 'UPLOADED',
  `error_summary` text DEFAULT NULL,
  `imported_by` int(11) DEFAULT NULL,
  `imported_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `reversed_by` int(11) DEFAULT NULL,
  `reversed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `batch_code` (`batch_code`),
  KEY `idx_pur_hash` (`file_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_import_batches`
--

LOCK TABLES `purchase_import_batches` WRITE;
/*!40000 ALTER TABLE `purchase_import_batches` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_import_batches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_inputs`
--

DROP TABLE IF EXISTS `purchase_inputs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `purchase_inputs` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `purchase_batch_id` int(11) DEFAULT NULL,
  `purchase_date` date NOT NULL,
  `invoice_number` varchar(100) DEFAULT NULL,
  `supplier_name` varchar(200) DEFAULT NULL,
  `tally_item_name` varchar(255) NOT NULL,
  `rm_id` int(11) NOT NULL,
  `rm_code` varchar(50) NOT NULL,
  `warehouse_id` int(11) NOT NULL DEFAULT 1,
  `quantity` decimal(14,3) NOT NULL,
  `unit_id` int(11) NOT NULL,
  `rate` decimal(12,2) DEFAULT 0.00,
  `amount` decimal(14,2) DEFAULT 0.00,
  `source` varchar(50) DEFAULT 'TALLY_CSV',
  `reference_number` varchar(100) DEFAULT NULL,
  `is_reversed` tinyint(1) DEFAULT 0,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `purchase_batch_id` (`purchase_batch_id`),
  KEY `unit_id` (`unit_id`),
  KEY `warehouse_id` (`warehouse_id`),
  KEY `idx_pur_date` (`purchase_date`),
  KEY `idx_pur_rm` (`rm_id`),
  KEY `idx_pur_invoice` (`invoice_number`),
  CONSTRAINT `purchase_inputs_ibfk_1` FOREIGN KEY (`purchase_batch_id`) REFERENCES `purchase_import_batches` (`id`) ON DELETE SET NULL,
  CONSTRAINT `purchase_inputs_ibfk_2` FOREIGN KEY (`rm_id`) REFERENCES `raw_materials` (`id`),
  CONSTRAINT `purchase_inputs_ibfk_3` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`),
  CONSTRAINT `purchase_inputs_ibfk_4` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_inputs`
--

LOCK TABLES `purchase_inputs` WRITE;
/*!40000 ALTER TABLE `purchase_inputs` DISABLE KEYS */;
INSERT INTO `purchase_inputs` VALUES (1,NULL,'2026-10-11','INW-261011-001','Apex Sanitary Ware Hub','2MM',2,'RM-000002',1,1.000,1,720.00,720.00,'MANUAL_ENTRY',NULL,0,1,'2026-10-11 03:50:12'),(2,NULL,'2026-10-11','INW-261011-002','Apex Sanitary Ware Hub','319)',1,'RM-000001',1,1.000,1,580.00,580.00,'MANUAL_ENTRY',NULL,0,1,'2026-10-11 03:50:12');
/*!40000 ALTER TABLE `purchase_inputs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `raw_materials`
--

DROP TABLE IF EXISTS `raw_materials`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `raw_materials` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `rm_code` varchar(50) NOT NULL,
  `material_name` varchar(200) NOT NULL,
  `description` text DEFAULT NULL,
  `category_id` int(11) DEFAULT NULL,
  `unit_id` int(11) NOT NULL,
  `purchase_unit_id` int(11) DEFAULT NULL,
  `conversion_factor` decimal(12,4) DEFAULT 1.0000,
  `standard_rate` decimal(12,2) DEFAULT 0.00,
  `minimum_stock` decimal(12,3) DEFAULT 0.000,
  `reorder_level` decimal(12,3) DEFAULT 0.000,
  `maximum_stock` decimal(12,3) DEFAULT 0.000,
  `hsn_code` varchar(50) DEFAULT NULL,
  `active` tinyint(1) DEFAULT 1,
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `rm_code` (`rm_code`),
  KEY `category_id` (`category_id`),
  KEY `unit_id` (`unit_id`),
  KEY `purchase_unit_id` (`purchase_unit_id`),
  KEY `idx_rm_code` (`rm_code`),
  KEY `idx_rm_name` (`material_name`),
  CONSTRAINT `raw_materials_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL,
  CONSTRAINT `raw_materials_ibfk_2` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`),
  CONSTRAINT `raw_materials_ibfk_3` FOREIGN KEY (`purchase_unit_id`) REFERENCES `units` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `raw_materials`
--

LOCK TABLES `raw_materials` WRITE;
/*!40000 ALTER TABLE `raw_materials` DISABLE KEYS */;
INSERT INTO `raw_materials` VALUES (1,'RM-000001','Brass Rod 25MM (IS 319)','Standard extruded brass rod for tap body casting & CNC machining',1,1,1,1.0000,580.00,200.000,400.000,3000.000,'74072110',1,NULL,NULL,'2026-10-08 14:00:53','2026-10-11 04:05:12',NULL),(2,'RM-000002','Copper Sheet 2MM','Electrolytic copper sheet for internal plating electrodes and washers',1,1,1,1.0000,720.00,50.000,100.000,1000.000,'74091100',1,NULL,NULL,'2026-10-08 14:00:53','2026-10-11 04:05:12',NULL),(3,'RM-000003','Ceramic Disc Cartridge 35MM','High precision 35mm ceramic quarter turn cartridge',2,3,3,1.0000,85.00,150.000,300.000,2500.000,'84819090',1,NULL,NULL,'2026-10-08 14:00:53','2026-10-11 04:05:12',NULL),(4,'RM-000004','Zinc Die-Cast Handle Lever','Heavy zinc handle casting for chrome plating',1,3,3,1.0000,45.00,200.000,500.000,3000.000,'79070000',1,NULL,NULL,'2026-10-08 14:00:53','2026-10-11 04:05:12',NULL),(5,'RM-000005','SS 304 Screw M4x10','Stainless steel grub screws for handle fastening',3,3,3,1.0000,1.50,1000.000,2000.000,20000.000,'73181500',1,NULL,NULL,'2026-10-08 14:00:53','2026-10-11 04:05:12',NULL),(6,'RM-000006','EPDM O-Ring 22MM ID','High temperature food grade EPDM rubber O-ring',3,3,3,1.0000,2.50,500.000,1000.000,10000.000,'40169330',1,NULL,NULL,'2026-10-08 14:00:53','2026-10-11 04:05:12',NULL),(7,'RM-000007','Brass Aerator M24 Neoperl Type','Water saving multi-mesh aerator nozzle',2,3,3,1.0000,28.00,200.000,400.000,4000.000,'84819090',1,NULL,NULL,'2026-10-08 14:00:53','2026-10-11 04:05:12',NULL),(8,'RM-000008','Duplex Printed Product Box A1','Corrugated printed inner box with foam insert',4,3,3,1.0000,18.00,300.000,600.000,5000.000,'48191010',1,NULL,NULL,'2026-10-08 14:00:53','2026-10-11 04:05:12',NULL);
/*!40000 ALTER TABLE `raw_materials` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rejection_reasons`
--

DROP TABLE IF EXISTS `rejection_reasons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `rejection_reasons` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `reason_code` varchar(50) NOT NULL,
  `reason_name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `category` varchar(100) DEFAULT 'GENERAL',
  `active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `reason_code` (`reason_code`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rejection_reasons`
--

LOCK TABLES `rejection_reasons` WRITE;
/*!40000 ALTER TABLE `rejection_reasons` DISABLE KEYS */;
INSERT INTO `rejection_reasons` VALUES (1,'REJ-POROSITY','Casting Porosity / Blow Holes','Internal voids and gas pockets discovered during CNC turning','CASTING',1,'2026-10-08 14:00:53','2026-10-08 14:00:53'),(2,'REJ-CRACK','Thermal Crack / Shrinkage','Hairline cracks due to uneven cooling during solidification','CASTING',1,'2026-10-08 14:00:53','2026-10-08 14:00:53'),(3,'REJ-DIMENSION','Dimensional Tolerance Out-of-Spec','Thread pitch or cartridge seat diameter exceeding +/- 0.05mm tolerance','MACHINING',1,'2026-10-08 14:00:53','2026-10-08 14:00:53'),(4,'REJ-SCRATCH','Surface Scratches / Dents','Handling dents and abrasive scratches on visible polished face','SURFACE',1,'2026-10-08 14:00:53','2026-10-08 14:00:53'),(5,'REJ-PEEL','Plating Blister / Chrome Peeling','Adhesion failure between nickel layer and brass substrate','PLATING',1,'2026-10-08 14:00:53','2026-10-08 14:00:53'),(6,'REJ-HAZE','Plating Cloudiness / Dull Spot','Lack of brightness due to plating bath contamination','PLATING',1,'2026-10-08 14:00:53','2026-10-08 14:00:53'),(7,'REJ-LEAK','Hydrostatic Pressure Leakage','Water drip during 6 Bar hydraulic bench test at joint/cartridge','QC_TESTING',1,'2026-10-08 14:00:53','2026-10-08 14:00:53'),(8,'REJ-JAM','Handle Jam / Rough Operation','Cartridge spindle misaligned or excessive torque on screw','ASSEMBLY',1,'2026-10-08 14:00:53','2026-10-08 14:00:53');
/*!40000 ALTER TABLE `rejection_reasons` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `roles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `role_code` varchar(50) NOT NULL,
  `role_name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `permissions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`permissions`)),
  `active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `role_code` (`role_code`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'ADMIN','System Administrator','Full system access across all modules and settings','[\"ALL\"]',1,'2026-10-08 14:00:53','2026-10-08 14:00:53'),(2,'MANAGER','General Manager','Operational oversight across inventory, production, purchase and sales','[\"VIEW_ALL\", \"APPROVE_PRODUCTION\", \"MANAGE_MASTERS\", \"VIEW_REPORTS\"]',1,'2026-10-08 14:00:53','2026-10-08 14:00:53'),(3,'PURCHASE','Purchase Officer','Manage purchase CSV imports, Tally mappings, and raw material inputs','[\"PURCHASE_READ\", \"PURCHASE_IMPORT\", \"PURCHASE_REVERSE\", \"MAPPING_MANAGE\"]',1,'2026-10-08 14:00:53','2026-10-08 14:00:53'),(4,'STORE','Store & Inventory Manager','Manage stock adjustments, warehouse transfers, and opening stock','[\"STOCK_READ\", \"STOCK_ADJUST\", \"STOCK_TRANSFER\"]',1,'2026-10-08 14:00:53','2026-10-08 14:00:53'),(5,'PRODUCTION_MANAGER','Production Manager','Create production plans, BOMs, manage process routes, and approve orders','[\"PRODUCTION_READ\", \"PRODUCTION_PLAN\", \"BOM_MANAGE\", \"PROCESS_MANAGE\"]',1,'2026-10-08 14:00:53','2026-10-08 14:00:53'),(6,'PRODUCTION_OPERATOR','Production Operator','Execute stage tracking, start/pause/complete stages, log rejections','[\"PRODUCTION_OPERATOR_VIEW\", \"STAGE_EXECUTE\", \"REJECTION_LOG\"]',1,'2026-10-08 14:00:53','2026-10-08 14:00:53'),(7,'SALES','Sales Officer','Manage sales CSV imports, finished goods dispatches, and sales reports','[\"SALES_READ\", \"SALES_IMPORT\", \"SALES_REVERSE\"]',1,'2026-10-08 14:00:53','2026-10-08 14:00:53'),(8,'VIEWER','Auditor / Viewer','Read-only access to dashboards and analytical reports','[\"REPORTS_VIEW\"]',1,'2026-10-08 14:00:53','2026-10-08 14:00:53');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sale_import_batches`
--

DROP TABLE IF EXISTS `sale_import_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sale_import_batches` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `batch_code` varchar(50) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_hash` varchar(64) NOT NULL,
  `total_rows` int(11) DEFAULT 0,
  `successful_rows` int(11) DEFAULT 0,
  `failed_rows` int(11) DEFAULT 0,
  `duplicate_rows` int(11) DEFAULT 0,
  `unmapped_rows` int(11) DEFAULT 0,
  `status` enum('UPLOADED','VALIDATING','VALIDATION_FAILED','PENDING_CONFIRMATION','IMPORTED','PARTIALLY_IMPORTED','REVERSED','FAILED') DEFAULT 'UPLOADED',
  `error_summary` text DEFAULT NULL,
  `imported_by` int(11) DEFAULT NULL,
  `imported_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `reversed_by` int(11) DEFAULT NULL,
  `reversed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `batch_code` (`batch_code`),
  KEY `idx_sale_hash` (`file_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sale_import_batches`
--

LOCK TABLES `sale_import_batches` WRITE;
/*!40000 ALTER TABLE `sale_import_batches` DISABLE KEYS */;
/*!40000 ALTER TABLE `sale_import_batches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sale_inputs`
--

DROP TABLE IF EXISTS `sale_inputs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sale_inputs` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `sale_batch_id` int(11) DEFAULT NULL,
  `sale_date` date NOT NULL,
  `invoice_number` varchar(100) DEFAULT NULL,
  `customer_name` varchar(200) DEFAULT NULL,
  `tally_item_name` varchar(255) NOT NULL,
  `fg_id` int(11) NOT NULL,
  `sub_sku_id` int(11) DEFAULT NULL,
  `fg_code` varchar(50) NOT NULL,
  `warehouse_id` int(11) NOT NULL DEFAULT 1,
  `quantity` decimal(14,3) NOT NULL,
  `unit_id` int(11) NOT NULL,
  `rate` decimal(12,2) DEFAULT 0.00,
  `amount` decimal(14,2) DEFAULT 0.00,
  `source` varchar(50) DEFAULT 'TALLY_CSV',
  `reference_number` varchar(100) DEFAULT NULL,
  `is_reversed` tinyint(1) DEFAULT 0,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `sale_batch_id` (`sale_batch_id`),
  KEY `unit_id` (`unit_id`),
  KEY `warehouse_id` (`warehouse_id`),
  KEY `idx_sale_date` (`sale_date`),
  KEY `idx_sale_fg` (`fg_id`),
  KEY `idx_sale_invoice` (`invoice_number`),
  KEY `idx_sale_sub_sku` (`sub_sku_id`),
  CONSTRAINT `sale_inputs_ibfk_1` FOREIGN KEY (`sale_batch_id`) REFERENCES `sale_import_batches` (`id`) ON DELETE SET NULL,
  CONSTRAINT `sale_inputs_ibfk_2` FOREIGN KEY (`fg_id`) REFERENCES `finished_goods` (`id`),
  CONSTRAINT `sale_inputs_ibfk_3` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`),
  CONSTRAINT `sale_inputs_ibfk_4` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sale_inputs`
--

LOCK TABLES `sale_inputs` WRITE;
/*!40000 ALTER TABLE `sale_inputs` DISABLE KEYS */;
INSERT INTO `sale_inputs` VALUES (1,NULL,'2026-10-11','DSP-261011-001','Apex Sanitary Ware Hub','2 IN 1 BIB COCK ABS CONTY',7,NULL,'CON-1408',3,1.000,3,0.00,0.00,'MANUAL_ENTRY',NULL,0,1,'2026-10-11 02:45:28'),(2,NULL,'2026-10-11','DSP-261011-003','Krishna Hardware & Traders','(4X4)',29,NULL,'OHA-2645',3,1.000,3,0.00,0.00,'MANUAL_ENTRY',NULL,0,1,'2026-10-11 03:50:12'),(3,NULL,'2026-10-11','DSP-261011-004','Krishna Hardware & Traders','ALMOND',26,NULL,'BSR-2371',3,1.000,3,0.00,0.00,'MANUAL_ENTRY',NULL,0,1,'2026-10-11 03:50:12'),(4,NULL,'2026-10-12','DSP-261012-002','Krishna Hardware & Traders','2 IN 1 BIB COCK ABS CONTY',7,NULL,'CON-1408',3,1.000,3,0.00,0.00,'MANUAL_ENTRY',NULL,0,1,'2026-10-12 15:45:50'),(5,NULL,'2026-10-12','DSP-261012-003','Krishna Hardware & Traders','ABS CLOVA SOAP DISH OVAL',4,NULL,'ABS-7522',3,1.000,3,0.00,0.00,'MANUAL_ENTRY',NULL,0,1,'2026-10-12 15:45:50');
/*!40000 ALTER TABLE `sale_inputs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `scrap_materials`
--

DROP TABLE IF EXISTS `scrap_materials`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `scrap_materials` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `scrap_code` varchar(50) NOT NULL,
  `scrap_name` varchar(150) NOT NULL,
  `unit_id` int(11) NOT NULL,
  `standard_rate` decimal(12,2) DEFAULT 0.00,
  `description` text DEFAULT NULL,
  `active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `scrap_code` (`scrap_code`),
  KEY `unit_id` (`unit_id`),
  CONSTRAINT `scrap_materials_ibfk_1` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `scrap_materials`
--

LOCK TABLES `scrap_materials` WRITE;
/*!40000 ALTER TABLE `scrap_materials` DISABLE KEYS */;
INSERT INTO `scrap_materials` VALUES (1,'SCRAP-BRASS-CHIP','Brass Turning Chips & Swarf',1,380.00,'Clean dry brass swarf generated from CNC machining and runner cutting',1,'2026-10-08 14:00:53'),(2,'SCRAP-BRASS-REJ','Brass Rejected Castings (Solid)',1,440.00,'Solid rejected brass bodies suitable for remelting in foundry furnace',1,'2026-10-08 14:00:53'),(3,'SCRAP-COPPER','Copper Offcuts & Plate Scrap',1,520.00,'Pure copper scrap pieces',1,'2026-10-08 14:00:53');
/*!40000 ALTER TABLE `scrap_materials` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock`
--

DROP TABLE IF EXISTS `stock`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `stock` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `material_type` enum('RM','FG','SCRAP') NOT NULL,
  `material_id` int(11) NOT NULL,
  `material_code` varchar(50) NOT NULL,
  `material_name` varchar(200) NOT NULL,
  `warehouse_id` int(11) NOT NULL DEFAULT 1,
  `quantity` decimal(14,3) NOT NULL DEFAULT 0.000,
  `reserved_quantity` decimal(14,3) NOT NULL DEFAULT 0.000,
  `available_quantity` decimal(14,3) GENERATED ALWAYS AS (`quantity` - `reserved_quantity`) STORED,
  `unit_id` int(11) NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_material_warehouse` (`material_type`,`material_id`,`warehouse_id`),
  KEY `unit_id` (`unit_id`),
  KEY `warehouse_id` (`warehouse_id`),
  KEY `idx_stock_mat` (`material_type`,`material_id`),
  KEY `idx_stock_avail` (`available_quantity`),
  CONSTRAINT `stock_ibfk_1` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`),
  CONSTRAINT `stock_ibfk_2` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=52 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock`
--

LOCK TABLES `stock` WRITE;
/*!40000 ALTER TABLE `stock` DISABLE KEYS */;
INSERT INTO `stock` VALUES (1,'FG',4,'ABS-7522','ABS CLOVA SOAP DISH OVAL',3,614.000,0.000,614.000,3,'2026-10-19 15:15:38'),(2,'FG',5,'ABS-7521','ABS CLOVA SOAP DISH SQUARE',3,60.000,0.000,60.000,3,'2026-10-11 04:05:12'),(3,'FG',6,'ABS-7524','ABS CLOVA TOWEL RING',3,57.000,0.000,57.000,3,'2026-10-11 04:05:12'),(4,'FG',7,'CON-1408','2 IN 1 BIB COCK ABS CONTY',3,29.000,0.000,29.000,3,'2026-10-12 15:45:50'),(5,'FG',8,'CON-1403','ANGLE COCK ABS CONTY',3,337.000,0.000,337.000,3,'2026-10-19 15:04:46'),(6,'FG',9,'CON-1404','LONG BODY ABS CONTY',3,141.000,0.000,141.000,3,'2026-10-11 04:05:12'),(7,'FG',10,'OHA-2766-BK','OVER HEAD SHOWER CUBIX 6X6 BLACK JALI',3,0.000,0.000,0.000,3,'2026-10-11 04:05:12'),(8,'FG',11,'PAC-1274','ANGLE COCK BLANCO ROUND',3,0.000,0.000,0.000,3,'2026-10-11 04:05:12'),(9,'FG',12,'ARA-7108','ARALIA - BATH SET',3,8.000,0.000,8.000,3,'2026-10-11 04:05:12'),(10,'FG',13,'ARA-7102','ARALIA - TOWEL ROD 24\"',3,14.000,0.000,14.000,3,'2026-10-11 02:50:27'),(11,'FG',14,'APC-1265','AUTO PUSH ANGLE COCK',3,19.000,0.000,19.000,3,'2026-10-11 04:05:12'),(12,'FG',15,'8400','BATHROOM CHAIR WALL MOUNTED',3,24.000,0.000,24.000,3,'2026-10-11 04:05:12'),(13,'FG',16,'BSR-2103','BEND SHOWER LILY',3,173.000,0.000,173.000,3,'2026-10-11 04:05:12'),(14,'FG',17,'BSR-2102','BEND SHOWER NUPUR',3,253.000,0.000,253.000,3,'2026-10-11 04:05:12'),(15,'FG',18,'BSR-2105','BEND SHOWER TULIP',3,329.000,0.000,329.000,3,'2026-10-11 04:05:12'),(16,'FG',19,'BSR-2366','BEND SHOWER HEENA',3,118.000,0.000,118.000,3,'2026-10-11 04:05:12'),(17,'FG',20,'BSR-2356','BEND SHOWER - HONEY',3,153.000,0.000,153.000,3,'2026-10-11 04:05:12'),(18,'FG',21,'BSR-2361','BEND SHOWER LOTUS',3,79.000,0.000,79.000,3,'2026-10-11 04:05:12'),(19,'FG',22,'BSR-2369','BEND SHOWER EXCEL WITH BRASS ARM',3,0.000,0.000,0.000,3,'2026-10-11 04:05:12'),(20,'FG',23,'BSR-2364','BEND SHOWER HAMMER',3,353.000,0.000,353.000,3,'2026-10-11 04:05:12'),(21,'FG',24,'BSR-2365','BEND SHOWER HANKO',3,167.000,0.000,167.000,3,'2026-10-11 04:05:12'),(22,'FG',25,'BSR-2367','BEND SHOWER HYDRA',3,113.000,0.000,113.000,3,'2026-10-11 04:05:12'),(23,'FG',26,'BSR-2371','BEND SHOWER ALMOND',3,105.000,0.000,105.000,3,'2026-10-11 04:05:12'),(24,'FG',27,'BSR-2372','BEND SHOWER APRICOT',3,340.000,0.000,340.000,3,'2026-10-11 04:05:12'),(25,'FG',28,'BSR-2418','BEND SHOWER NANO',3,489.000,0.000,489.000,3,'2026-10-19 15:04:46'),(26,'FG',29,'OHA-2645','BODY JET SHOWER WATER TILE (4X4)',3,10.000,0.000,10.000,3,'2026-10-11 04:05:12'),(27,'FG',30,'BTP-1903','BOTTLE TRAP PARCO',3,56.000,0.000,56.000,3,'2026-10-11 04:05:12'),(28,'FG',31,'BTP-1901','BOTTLE TRAP STD',3,314.000,0.000,314.000,3,'2026-10-11 04:05:12'),(29,'FG',32,'BTP-8718','BT PIPE BRASS CP SEAMLESS 18\"',3,39.000,0.000,39.000,3,'2026-10-11 02:50:27'),(30,'FG',33,'BTP-8714','BT PIPE STAINLESS STEEL 18 (SS)',3,651.000,0.000,651.000,3,'2026-10-11 04:05:12'),(31,'RM',1,'RM-000001','Brass Rod 25MM (IS 319)',1,315.000,233.450,81.550,1,'2026-10-19 16:59:29'),(32,'RM',2,'RM-000002','Copper Sheet 2MM',1,1.000,0.000,1.000,1,'2026-10-11 04:05:12'),(33,'RM',3,'RM-000003','Ceramic Disc Cartridge 35MM',1,900.000,200.500,699.500,3,'2026-10-19 16:59:29'),(34,'RM',4,'RM-000004','Zinc Die-Cast Handle Lever',1,900.000,201.000,699.000,3,'2026-10-19 16:59:29'),(35,'RM',5,'RM-000005','SS 304 Screw M4x10',1,800.000,202.000,598.000,3,'2026-10-19 16:59:29'),(36,'RM',6,'RM-000006','EPDM O-Ring 22MM ID',1,700.000,402.000,298.000,3,'2026-10-19 16:59:29'),(37,'RM',7,'RM-000007','Brass Aerator M24 Neoperl Type',1,900.000,200.500,699.500,3,'2026-10-19 16:59:29'),(38,'RM',8,'RM-000008','Duplex Printed Product Box A1',1,900.000,200.500,699.500,3,'2026-10-19 16:59:29'),(39,'FG',1,'FG-000001','Brass Basin Tap Model A - Chrome',3,0.000,0.000,0.000,3,'2026-10-11 04:05:12'),(40,'FG',2,'FG-000002','Kitchen Sink Mixer Model B - Swivel Spout',3,0.000,0.000,0.000,3,'2026-10-11 04:05:12'),(41,'FG',3,'FG-000003','Angle Valve 2-in-1 Heavy Duty',3,0.000,0.000,0.000,3,'2026-10-11 04:05:12'),(42,'FG',34,'FG-000034','PCS',3,450.000,0.000,450.000,1,'2026-10-11 02:50:27'),(43,'FG',35,'FG-000035','PCS',3,1100.000,0.000,1100.000,1,'2026-10-11 02:50:27'),(50,'SCRAP',2,'SCRAP-BRASS-REJ','Brass Rejected Castings (Solid)',1,4.600,0.000,4.600,1,'2026-10-19 16:57:12'),(51,'FG',2,'FG-000002','Kitchen Sink Mixer Model B - Swivel Spout',1,100.000,0.000,100.000,3,'2026-10-19 16:59:49');
/*!40000 ALTER TABLE `stock` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_adjustments`
--

DROP TABLE IF EXISTS `stock_adjustments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `stock_adjustments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `adjustment_number` varchar(50) NOT NULL,
  `material_type` enum('RM','FG','SCRAP') NOT NULL,
  `material_id` int(11) NOT NULL,
  `warehouse_id` int(11) NOT NULL,
  `adjustment_type` enum('IN','OUT') NOT NULL,
  `system_quantity` decimal(14,3) NOT NULL,
  `physical_quantity` decimal(14,3) NOT NULL,
  `difference_quantity` decimal(14,3) NOT NULL,
  `reason` varchar(255) NOT NULL,
  `remarks` text DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `adjustment_number` (`adjustment_number`),
  KEY `warehouse_id` (`warehouse_id`),
  CONSTRAINT `stock_adjustments_ibfk_1` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_adjustments`
--

LOCK TABLES `stock_adjustments` WRITE;
/*!40000 ALTER TABLE `stock_adjustments` DISABLE KEYS */;
/*!40000 ALTER TABLE `stock_adjustments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_ledger`
--

DROP TABLE IF EXISTS `stock_ledger`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `stock_ledger` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `transaction_type` enum('OPENING','PURCHASE','PURCHASE_REVERSAL','PRODUCTION_RESERVE','PRODUCTION_RELEASE','PRODUCTION_CONSUMPTION','PRODUCTION_OUTPUT','SALE','SALE_REVERSAL','REJECTION','SCRAP_GENERATED','SCRAP_SALE','ADJUSTMENT_IN','ADJUSTMENT_OUT','TRANSFER_IN','TRANSFER_OUT') NOT NULL,
  `transaction_id` varchar(100) NOT NULL,
  `material_type` enum('RM','FG','SCRAP') NOT NULL,
  `material_id` int(11) NOT NULL,
  `material_code` varchar(50) NOT NULL,
  `warehouse_id` int(11) NOT NULL DEFAULT 1,
  `quantity_in` decimal(14,3) NOT NULL DEFAULT 0.000,
  `quantity_out` decimal(14,3) NOT NULL DEFAULT 0.000,
  `balance_after` decimal(14,3) NOT NULL,
  `unit_id` int(11) NOT NULL,
  `rate` decimal(12,2) DEFAULT 0.00,
  `reference_number` varchar(150) DEFAULT NULL,
  `batch_lot_number` varchar(100) DEFAULT NULL,
  `transaction_date` date NOT NULL,
  `remarks` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `unit_id` (`unit_id`),
  KEY `warehouse_id` (`warehouse_id`),
  KEY `idx_ledger_mat` (`material_type`,`material_id`),
  KEY `idx_ledger_type` (`transaction_type`),
  KEY `idx_ledger_txid` (`transaction_id`),
  KEY `idx_ledger_date` (`transaction_date`),
  CONSTRAINT `stock_ledger_ibfk_1` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`),
  CONSTRAINT `stock_ledger_ibfk_2` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=96 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_ledger`
--

LOCK TABLES `stock_ledger` WRITE;
/*!40000 ALTER TABLE `stock_ledger` DISABLE KEYS */;
INSERT INTO `stock_ledger` VALUES (1,'SALE','DSP-261011-001','FG',7,'CON-1408',3,0.000,1.000,30.000,3,0.00,'DSP-261011-001',NULL,'2026-10-11','Dispatch to Apex Sanitary Ware Hub (Inv: DSP-261011-001) - ',1,'2026-10-11 02:45:28'),(2,'OPENING','BLK-467511FD','RM',1,'RM-000001',1,0.000,0.000,0.000,3,580.00,'BULK_IMPORT',NULL,'2026-10-11','Bulk initial stock setup',1,'2026-10-11 02:50:27'),(3,'OPENING','BLK-41C219B6','RM',2,'RM-000002',1,0.000,0.000,0.000,3,720.00,'BULK_IMPORT',NULL,'2026-10-11','Bulk initial stock setup',1,'2026-10-11 02:50:27'),(4,'OPENING','BLK-EB2234C6','RM',3,'RM-000003',1,0.000,0.000,0.000,3,85.00,'BULK_IMPORT',NULL,'2026-10-11','Bulk initial stock setup',1,'2026-10-11 02:50:27'),(5,'OPENING','BLK-BF8D11CE','RM',4,'RM-000004',1,0.000,0.000,0.000,3,45.00,'BULK_IMPORT',NULL,'2026-10-11','Bulk initial stock setup',1,'2026-10-11 02:50:27'),(6,'OPENING','BLK-EF5C47B3','RM',5,'RM-000005',1,0.000,0.000,0.000,3,1.50,'BULK_IMPORT',NULL,'2026-10-11','Bulk initial stock setup',1,'2026-10-11 02:50:27'),(7,'OPENING','BLK-71243589','RM',6,'RM-000006',1,0.000,0.000,0.000,3,2.50,'BULK_IMPORT',NULL,'2026-10-11','Bulk initial stock setup',1,'2026-10-11 02:50:27'),(8,'OPENING','BLK-9938E27D','RM',7,'RM-000007',1,0.000,0.000,0.000,3,28.00,'BULK_IMPORT',NULL,'2026-10-11','Bulk initial stock setup',1,'2026-10-11 02:50:27'),(9,'OPENING','BLK-8A0CAC15','RM',8,'RM-000008',1,0.000,0.000,0.000,3,18.00,'BULK_IMPORT',NULL,'2026-10-11','Bulk initial stock setup',1,'2026-10-11 02:50:27'),(10,'OPENING','BLK-58DC4CD0','FG',1,'FG-000001',3,0.000,0.000,0.000,3,1250.00,'BULK_IMPORT',NULL,'2026-10-11','Bulk initial stock setup',1,'2026-10-11 02:50:27'),(11,'OPENING','BLK-A5429ED3','FG',2,'FG-000002',3,0.000,0.000,0.000,3,2100.00,'BULK_IMPORT',NULL,'2026-10-11','Bulk initial stock setup',1,'2026-10-11 02:50:27'),(12,'OPENING','BLK-403BF954','FG',3,'FG-000003',3,0.000,0.000,0.000,3,650.00,'BULK_IMPORT',NULL,'2026-10-11','Bulk initial stock setup',1,'2026-10-11 02:50:27'),(13,'OPENING','BLK-3C0FC5DB','FG',4,'ABS-7522',3,15.000,0.000,15.000,3,0.00,'BULK_IMPORT',NULL,'2026-10-11','Bulk initial stock setup',1,'2026-10-11 02:50:27'),(14,'OPENING','BLK-BE3F8B99','FG',5,'ABS-7521',3,60.000,0.000,60.000,3,0.00,'BULK_IMPORT',NULL,'2026-10-11','Bulk initial stock setup',1,'2026-10-11 02:50:27'),(15,'OPENING','BLK-3CDC1346','FG',6,'ABS-7524',3,57.000,0.000,57.000,3,0.00,'BULK_IMPORT',NULL,'2026-10-11','Bulk initial stock setup',1,'2026-10-11 02:50:27'),(16,'OPENING','BLK-A660F79A','FG',7,'CON-1408',3,30.000,0.000,30.000,3,0.00,'BULK_IMPORT',NULL,'2026-10-11','Bulk initial stock setup',1,'2026-10-11 02:50:27'),(17,'OPENING','BLK-08ADA396','FG',8,'CON-1403',3,72.000,0.000,72.000,3,0.00,'BULK_IMPORT',NULL,'2026-10-11','Bulk initial stock setup',1,'2026-10-11 02:50:27'),(18,'OPENING','BLK-7FBF9484','FG',9,'CON-1404',3,141.000,0.000,141.000,3,0.00,'BULK_IMPORT',NULL,'2026-10-11','Bulk initial stock setup',1,'2026-10-11 02:50:27'),(19,'OPENING','BLK-FEC2689E','FG',10,'OHA-2766-BK',3,0.000,0.000,0.000,3,0.00,'BULK_IMPORT',NULL,'2026-10-11','Bulk initial stock setup',1,'2026-10-11 02:50:27'),(20,'OPENING','BLK-4F431DCA','FG',11,'PAC-1274',3,0.000,0.000,0.000,3,0.00,'BULK_IMPORT',NULL,'2026-10-11','Bulk initial stock setup',1,'2026-10-11 02:50:27'),(21,'OPENING','BLK-0A134B2B','FG',12,'ARA-7108',3,8.000,0.000,8.000,3,0.00,'BULK_IMPORT',NULL,'2026-10-11','Bulk initial stock setup',1,'2026-10-11 02:50:27'),(22,'OPENING','BLK-66860465','FG',13,'ARA-7102',3,14.000,0.000,14.000,3,0.00,'BULK_IMPORT',NULL,'2026-10-11','Bulk initial stock setup',1,'2026-10-11 02:50:27'),(23,'OPENING','BLK-6B5673BF','FG',14,'APC-1265',3,19.000,0.000,19.000,3,0.00,'BULK_IMPORT',NULL,'2026-10-11','Bulk initial stock setup',1,'2026-10-11 02:50:27'),(24,'OPENING','BLK-50A6A912','FG',15,'8400',3,24.000,0.000,24.000,3,0.00,'BULK_IMPORT',NULL,'2026-10-11','Bulk initial stock setup',1,'2026-10-11 02:50:27'),(25,'OPENING','BLK-2B08B184','FG',16,'BSR-2103',3,173.000,0.000,173.000,3,0.00,'BULK_IMPORT',NULL,'2026-10-11','Bulk initial stock setup',1,'2026-10-11 02:50:27'),(26,'OPENING','BLK-EA4B7666','FG',17,'BSR-2102',3,253.000,0.000,253.000,3,0.00,'BULK_IMPORT',NULL,'2026-10-11','Bulk initial stock setup',1,'2026-10-11 02:50:27'),(27,'OPENING','BLK-4FBBF2C3','FG',18,'BSR-2105',3,329.000,0.000,329.000,3,0.00,'BULK_IMPORT',NULL,'2026-10-11','Bulk initial stock setup',1,'2026-10-11 02:50:27'),(28,'OPENING','BLK-89330C0C','FG',19,'BSR-2366',3,118.000,0.000,118.000,3,0.00,'BULK_IMPORT',NULL,'2026-10-11','Bulk initial stock setup',1,'2026-10-11 02:50:27'),(29,'OPENING','BLK-35D868A2','FG',20,'BSR-2356',3,153.000,0.000,153.000,3,0.00,'BULK_IMPORT',NULL,'2026-10-11','Bulk initial stock setup',1,'2026-10-11 02:50:27'),(30,'OPENING','BLK-6AC929FA','FG',21,'BSR-2361',3,79.000,0.000,79.000,3,0.00,'BULK_IMPORT',NULL,'2026-10-11','Bulk initial stock setup',1,'2026-10-11 02:50:27'),(31,'OPENING','BLK-434B3B0A','FG',22,'BSR-2369',3,0.000,0.000,0.000,3,0.00,'BULK_IMPORT',NULL,'2026-10-11','Bulk initial stock setup',1,'2026-10-11 02:50:27'),(32,'OPENING','BLK-90EBE48B','FG',23,'BSR-2364',3,353.000,0.000,353.000,3,0.00,'BULK_IMPORT',NULL,'2026-10-11','Bulk initial stock setup',1,'2026-10-11 02:50:27'),(33,'OPENING','BLK-F5F7F405','FG',24,'BSR-2365',3,167.000,0.000,167.000,3,0.00,'BULK_IMPORT',NULL,'2026-10-11','Bulk initial stock setup',1,'2026-10-11 02:50:27'),(34,'OPENING','BLK-D02C607E','FG',25,'BSR-2367',3,113.000,0.000,113.000,3,0.00,'BULK_IMPORT',NULL,'2026-10-11','Bulk initial stock setup',1,'2026-10-11 02:50:27'),(35,'OPENING','BLK-BEE329F0','FG',26,'BSR-2371',3,106.000,0.000,106.000,3,0.00,'BULK_IMPORT',NULL,'2026-10-11','Bulk initial stock setup',1,'2026-10-11 02:50:27'),(36,'OPENING','BLK-F0FF343D','FG',27,'BSR-2372',3,340.000,0.000,340.000,3,0.00,'BULK_IMPORT',NULL,'2026-10-11','Bulk initial stock setup',1,'2026-10-11 02:50:27'),(37,'OPENING','BLK-FA9B602B','FG',28,'BSR-2418',3,0.000,0.000,0.000,3,0.00,'BULK_IMPORT',NULL,'2026-10-11','Bulk initial stock setup',1,'2026-10-11 02:50:27'),(38,'OPENING','BLK-D7072452','FG',29,'OHA-2645',3,11.000,0.000,11.000,3,0.00,'BULK_IMPORT',NULL,'2026-10-11','Bulk initial stock setup',1,'2026-10-11 02:50:27'),(39,'OPENING','BLK-CDA4A599','FG',30,'BTP-1903',3,56.000,0.000,56.000,3,0.00,'BULK_IMPORT',NULL,'2026-10-11','Bulk initial stock setup',1,'2026-10-11 02:50:27'),(40,'OPENING','BLK-91633F2C','FG',31,'BTP-1901',3,314.000,0.000,314.000,3,0.00,'BULK_IMPORT',NULL,'2026-10-11','Bulk initial stock setup',1,'2026-10-11 02:50:27'),(41,'OPENING','BLK-35E7EAA0','FG',32,'BTP-8718',3,39.000,0.000,39.000,3,0.00,'BULK_IMPORT',NULL,'2026-10-11','Bulk initial stock setup',1,'2026-10-11 02:50:27'),(42,'OPENING','BLK-0485B54B','FG',33,'BTP-8714',3,651.000,0.000,651.000,3,0.00,'BULK_IMPORT',NULL,'2026-10-11','Bulk initial stock setup',1,'2026-10-11 02:50:27'),(43,'OPENING','BLK-FBD2574F','FG',34,'FG-000034',3,450.000,0.000,450.000,1,0.00,'BULK_IMPORT',NULL,'2026-10-11','Bulk initial stock setup',1,'2026-10-11 02:50:27'),(44,'OPENING','BLK-D3B3AB5B','FG',35,'FG-000035',3,1100.000,0.000,1100.000,1,0.00,'BULK_IMPORT',NULL,'2026-10-11','Bulk initial stock setup',1,'2026-10-11 02:50:27'),(45,'PURCHASE','INW-261011-001','RM',2,'RM-000002',1,1.000,0.000,1.000,1,720.00,'INW-261011-001',NULL,'2026-10-11','Inward from Apex Sanitary Ware Hub (Inv: INW-261011-001) - ',1,'2026-10-11 03:50:12'),(46,'PURCHASE','INW-261011-002','RM',1,'RM-000001',1,1.000,0.000,1.000,1,580.00,'INW-261011-002',NULL,'2026-10-11','Inward from Apex Sanitary Ware Hub (Inv: INW-261011-002) - ',1,'2026-10-11 03:50:12'),(47,'SALE','DSP-261011-003','FG',29,'OHA-2645',3,0.000,1.000,10.000,3,0.00,'DSP-261011-003',NULL,'2026-10-11','Dispatch to Krishna Hardware & Traders (Inv: DSP-261011-003) - ',1,'2026-10-11 03:50:12'),(48,'SALE','DSP-261011-004','FG',26,'BSR-2371',3,0.000,1.000,105.000,3,0.00,'DSP-261011-004',NULL,'2026-10-11','Dispatch to Krishna Hardware & Traders (Inv: DSP-261011-004) - ',1,'2026-10-11 03:50:12'),(49,'PRODUCTION_OUTPUT','INW-261012-001','FG',28,'BSR-2418',3,100.000,0.000,100.000,3,0.00,'INW-261012-001',NULL,'2026-10-12','FG Inward from Apex Sanitary Ware Hub (Ref: INW-261012-001) - ',1,'2026-10-12 15:45:50'),(50,'SALE','DSP-261012-002','FG',7,'CON-1408',3,0.000,1.000,29.000,3,0.00,'DSP-261012-002',NULL,'2026-10-12','Dispatch to Krishna Hardware & Traders (Inv: DSP-261012-002) - ',1,'2026-10-12 15:45:50'),(51,'SALE','DSP-261012-003','FG',4,'ABS-7522',3,0.000,1.000,14.000,3,0.00,'DSP-261012-003',NULL,'2026-10-12','Dispatch to Krishna Hardware & Traders (Inv: DSP-261012-003) - ',1,'2026-10-12 15:45:50'),(52,'PRODUCTION_OUTPUT','BATCH-000006-A','FG',8,'CON-1403',3,265.000,0.000,337.000,3,185.00,'BATCH-000006-A','BATCH-000006-A','2026-10-19','SKU Tracking Final Handoff to Ready FG Stock (Batch #BATCH-000006-A)',1,'2026-10-19 15:04:46'),(53,'PRODUCTION_OUTPUT','BATCH-000005-A','FG',28,'BSR-2418',3,389.000,0.000,489.000,3,145.00,'BATCH-000005-A','BATCH-000005-A','2026-10-19','SKU Tracking Final Handoff to Ready FG Stock (Batch #BATCH-000005-A)',1,'2026-10-19 15:04:46'),(54,'PRODUCTION_OUTPUT','BATCH-000007-A','FG',4,'ABS-7522',3,600.000,0.000,614.000,3,0.00,'BATCH-000007-A','BATCH-000007-A','2026-10-19','SKU Tracking Final Handoff to Ready FG Stock. Operator: Supervisor / Operator. Test completion',1,'2026-10-19 15:15:38'),(55,'PRODUCTION_CONSUMPTION','BATCH-000007-A','RM',1,'RM-000001',1,0.000,210.000,-209.000,1,580.00,'BATCH-000007-A','BATCH-000007-A','2026-10-19','Raw Material Consumption (Full Kitting) for Batch #BATCH-000007-A - ABS CLOVA SOAP DISH OVAL (Qty: 600). Upfront Full Kitting RM deduction for Batch #BATCH-000007-A',1,'2026-10-19 16:21:17'),(56,'PRODUCTION_CONSUMPTION','BATCH-000007-A','RM',8,'RM-000008',1,0.000,600.000,-600.000,3,18.00,'BATCH-000007-A','BATCH-000007-A','2026-10-19','Raw Material Consumption (Full Kitting) for Batch #BATCH-000007-A - ABS CLOVA SOAP DISH OVAL (Qty: 600). Upfront Full Kitting RM deduction for Batch #BATCH-000007-A',1,'2026-10-19 16:21:17'),(58,'PRODUCTION_RESERVE','PROD-000003','RM',1,'RM-000001',1,0.000,0.000,500.000,1,0.00,'PROD-000003',NULL,'2026-10-19','Reserved 59.225 for Production Order PROD-000003',1,'2026-10-19 16:50:45'),(59,'PRODUCTION_RESERVE','PROD-000003','RM',3,'RM-000003',1,0.000,0.000,1000.000,3,0.00,'PROD-000003',NULL,'2026-10-19','Reserved 50.25 for Production Order PROD-000003',1,'2026-10-19 16:50:45'),(60,'PRODUCTION_RESERVE','PROD-000003','RM',4,'RM-000004',1,0.000,0.000,1000.000,3,0.00,'PROD-000003',NULL,'2026-10-19','Reserved 50.5 for Production Order PROD-000003',1,'2026-10-19 16:50:45'),(61,'PRODUCTION_RESERVE','PROD-000003','RM',5,'RM-000005',1,0.000,0.000,1000.000,3,0.00,'PROD-000003',NULL,'2026-10-19','Reserved 51 for Production Order PROD-000003',1,'2026-10-19 16:50:45'),(62,'PRODUCTION_RESERVE','PROD-000003','RM',6,'RM-000006',1,0.000,0.000,1000.000,3,0.00,'PROD-000003',NULL,'2026-10-19','Reserved 101 for Production Order PROD-000003',1,'2026-10-19 16:50:45'),(63,'PRODUCTION_RESERVE','PROD-000003','RM',7,'RM-000007',1,0.000,0.000,1000.000,3,0.00,'PROD-000003',NULL,'2026-10-19','Reserved 50.25 for Production Order PROD-000003',1,'2026-10-19 16:50:45'),(64,'PRODUCTION_RESERVE','PROD-000003','RM',8,'RM-000008',1,0.000,0.000,1000.000,3,0.00,'PROD-000003',NULL,'2026-10-19','Reserved 50.25 for Production Order PROD-000003',1,'2026-10-19 16:50:45'),(65,'PRODUCTION_RESERVE','PROD-000003','RM',1,'RM-000001',1,0.000,0.000,500.000,1,0.00,'PROD-000003',NULL,'2026-10-19','Reserved 57.5 for Production Order PROD-000003',1,'2026-10-19 16:50:45'),(66,'PRODUCTION_RESERVE','PROD-000003','RM',3,'RM-000003',1,0.000,0.000,1000.000,3,0.00,'PROD-000003',NULL,'2026-10-19','Reserved 50 for Production Order PROD-000003',1,'2026-10-19 16:50:45'),(67,'PRODUCTION_RESERVE','PROD-000003','RM',4,'RM-000004',1,0.000,0.000,1000.000,3,0.00,'PROD-000003',NULL,'2026-10-19','Reserved 50 for Production Order PROD-000003',1,'2026-10-19 16:50:45'),(68,'PRODUCTION_RESERVE','PROD-000003','RM',5,'RM-000005',1,0.000,0.000,1000.000,3,0.00,'PROD-000003',NULL,'2026-10-19','Reserved 50 for Production Order PROD-000003',1,'2026-10-19 16:50:45'),(69,'PRODUCTION_RESERVE','PROD-000003','RM',6,'RM-000006',1,0.000,0.000,1000.000,3,0.00,'PROD-000003',NULL,'2026-10-19','Reserved 100 for Production Order PROD-000003',1,'2026-10-19 16:50:45'),(70,'PRODUCTION_RESERVE','PROD-000003','RM',7,'RM-000007',1,0.000,0.000,1000.000,3,0.00,'PROD-000003',NULL,'2026-10-19','Reserved 50 for Production Order PROD-000003',1,'2026-10-19 16:50:45'),(71,'PRODUCTION_RESERVE','PROD-000003','RM',8,'RM-000008',1,0.000,0.000,1000.000,3,0.00,'PROD-000003',NULL,'2026-10-19','Reserved 50 for Production Order PROD-000003',1,'2026-10-19 16:50:45'),(72,'SCRAP_GENERATED','PROD-000003-S1','SCRAP',2,'SCRAP-BRASS-REJ',1,2.300,0.000,2.300,1,440.00,'PROD-000003',NULL,'2026-10-19','Recovered from Stage #1 Rejections: Porosity in test batch',3,'2026-10-19 16:50:45'),(73,'PRODUCTION_RESERVE','PROD-000004','RM',1,'RM-000001',1,0.000,0.000,500.000,1,0.00,'PROD-000004',NULL,'2026-10-19','Reserved 59.225 for Production Order PROD-000004',1,'2026-10-19 16:57:12'),(74,'PRODUCTION_RESERVE','PROD-000004','RM',3,'RM-000003',1,0.000,0.000,1000.000,3,0.00,'PROD-000004',NULL,'2026-10-19','Reserved 50.25 for Production Order PROD-000004',1,'2026-10-19 16:57:12'),(75,'PRODUCTION_RESERVE','PROD-000004','RM',4,'RM-000004',1,0.000,0.000,1000.000,3,0.00,'PROD-000004',NULL,'2026-10-19','Reserved 50.5 for Production Order PROD-000004',1,'2026-10-19 16:57:12'),(76,'PRODUCTION_RESERVE','PROD-000004','RM',5,'RM-000005',1,0.000,0.000,1000.000,3,0.00,'PROD-000004',NULL,'2026-10-19','Reserved 51 for Production Order PROD-000004',1,'2026-10-19 16:57:12'),(77,'PRODUCTION_RESERVE','PROD-000004','RM',6,'RM-000006',1,0.000,0.000,1000.000,3,0.00,'PROD-000004',NULL,'2026-10-19','Reserved 101 for Production Order PROD-000004',1,'2026-10-19 16:57:12'),(78,'PRODUCTION_RESERVE','PROD-000004','RM',7,'RM-000007',1,0.000,0.000,1000.000,3,0.00,'PROD-000004',NULL,'2026-10-19','Reserved 50.25 for Production Order PROD-000004',1,'2026-10-19 16:57:12'),(79,'PRODUCTION_RESERVE','PROD-000004','RM',8,'RM-000008',1,0.000,0.000,1000.000,3,0.00,'PROD-000004',NULL,'2026-10-19','Reserved 50.25 for Production Order PROD-000004',1,'2026-10-19 16:57:12'),(80,'PRODUCTION_RESERVE','PROD-000004','RM',1,'RM-000001',1,0.000,0.000,500.000,1,0.00,'PROD-000004',NULL,'2026-10-19','Reserved 57.5 for Production Order PROD-000004',1,'2026-10-19 16:57:12'),(81,'PRODUCTION_RESERVE','PROD-000004','RM',3,'RM-000003',1,0.000,0.000,1000.000,3,0.00,'PROD-000004',NULL,'2026-10-19','Reserved 50 for Production Order PROD-000004',1,'2026-10-19 16:57:12'),(82,'PRODUCTION_RESERVE','PROD-000004','RM',4,'RM-000004',1,0.000,0.000,1000.000,3,0.00,'PROD-000004',NULL,'2026-10-19','Reserved 50 for Production Order PROD-000004',1,'2026-10-19 16:57:12'),(83,'PRODUCTION_RESERVE','PROD-000004','RM',5,'RM-000005',1,0.000,0.000,1000.000,3,0.00,'PROD-000004',NULL,'2026-10-19','Reserved 50 for Production Order PROD-000004',1,'2026-10-19 16:57:12'),(84,'PRODUCTION_RESERVE','PROD-000004','RM',6,'RM-000006',1,0.000,0.000,1000.000,3,0.00,'PROD-000004',NULL,'2026-10-19','Reserved 100 for Production Order PROD-000004',1,'2026-10-19 16:57:12'),(85,'PRODUCTION_RESERVE','PROD-000004','RM',7,'RM-000007',1,0.000,0.000,1000.000,3,0.00,'PROD-000004',NULL,'2026-10-19','Reserved 50 for Production Order PROD-000004',1,'2026-10-19 16:57:12'),(86,'PRODUCTION_RESERVE','PROD-000004','RM',8,'RM-000008',1,0.000,0.000,1000.000,3,0.00,'PROD-000004',NULL,'2026-10-19','Reserved 50 for Production Order PROD-000004',1,'2026-10-19 16:57:12'),(87,'SCRAP_GENERATED','PROD-000004-S1','SCRAP',2,'SCRAP-BRASS-REJ',1,2.300,0.000,4.600,1,440.00,'PROD-000004',NULL,'2026-10-19','Recovered from Stage #1 Rejections: Porosity in test batch',3,'2026-10-19 16:57:12'),(88,'PRODUCTION_CONSUMPTION','BATCH-000008-A','RM',1,'RM-000001',1,0.000,185.000,315.000,1,580.00,'BATCH-000008-A','BATCH-000008-A','2026-10-19','Raw Material Consumption (Full Kitting on Release) for Batch #BATCH-000008-A - Kitchen Sink Mixer Model B - Swivel Spout (Qty: 100). ',1,'2026-10-19 16:59:29'),(89,'PRODUCTION_CONSUMPTION','BATCH-000008-A','RM',3,'RM-000003',1,0.000,100.000,900.000,3,85.00,'BATCH-000008-A','BATCH-000008-A','2026-10-19','Raw Material Consumption (Full Kitting on Release) for Batch #BATCH-000008-A - Kitchen Sink Mixer Model B - Swivel Spout (Qty: 100). ',1,'2026-10-19 16:59:29'),(90,'PRODUCTION_CONSUMPTION','BATCH-000008-A','RM',4,'RM-000004',1,0.000,100.000,900.000,3,45.00,'BATCH-000008-A','BATCH-000008-A','2026-10-19','Raw Material Consumption (Full Kitting on Release) for Batch #BATCH-000008-A - Kitchen Sink Mixer Model B - Swivel Spout (Qty: 100). ',1,'2026-10-19 16:59:29'),(91,'PRODUCTION_CONSUMPTION','BATCH-000008-A','RM',5,'RM-000005',1,0.000,200.000,800.000,3,1.50,'BATCH-000008-A','BATCH-000008-A','2026-10-19','Raw Material Consumption (Full Kitting on Release) for Batch #BATCH-000008-A - Kitchen Sink Mixer Model B - Swivel Spout (Qty: 100). ',1,'2026-10-19 16:59:29'),(92,'PRODUCTION_CONSUMPTION','BATCH-000008-A','RM',6,'RM-000006',1,0.000,300.000,700.000,3,2.50,'BATCH-000008-A','BATCH-000008-A','2026-10-19','Raw Material Consumption (Full Kitting on Release) for Batch #BATCH-000008-A - Kitchen Sink Mixer Model B - Swivel Spout (Qty: 100). ',1,'2026-10-19 16:59:29'),(93,'PRODUCTION_CONSUMPTION','BATCH-000008-A','RM',7,'RM-000007',1,0.000,100.000,900.000,3,28.00,'BATCH-000008-A','BATCH-000008-A','2026-10-19','Raw Material Consumption (Full Kitting on Release) for Batch #BATCH-000008-A - Kitchen Sink Mixer Model B - Swivel Spout (Qty: 100). ',1,'2026-10-19 16:59:29'),(94,'PRODUCTION_CONSUMPTION','BATCH-000008-A','RM',8,'RM-000008',1,0.000,100.000,900.000,3,18.00,'BATCH-000008-A','BATCH-000008-A','2026-10-19','Raw Material Consumption (Full Kitting on Release) for Batch #BATCH-000008-A - Kitchen Sink Mixer Model B - Swivel Spout (Qty: 100). ',1,'2026-10-19 16:59:29'),(95,'PRODUCTION_OUTPUT','BATCH-000008-A','FG',2,'FG-000002',1,100.000,0.000,100.000,3,2100.00,'BATCH-000008-A','BATCH-000008-A','2026-10-19','SKU Tracking Final Handoff to Ready FG Stock. Operator: Supervisor / Operator. Final handoff from proc_pack to Ready FG Stock',1,'2026-10-19 16:59:49');
/*!40000 ALTER TABLE `stock_ledger` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_transfer_items`
--

DROP TABLE IF EXISTS `stock_transfer_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `stock_transfer_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `transfer_id` int(11) NOT NULL,
  `material_type` enum('RM','FG','SCRAP') NOT NULL,
  `material_id` int(11) NOT NULL,
  `quantity` decimal(14,3) NOT NULL,
  `unit_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `transfer_id` (`transfer_id`),
  KEY `unit_id` (`unit_id`),
  CONSTRAINT `stock_transfer_items_ibfk_1` FOREIGN KEY (`transfer_id`) REFERENCES `stock_transfers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `stock_transfer_items_ibfk_2` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_transfer_items`
--

LOCK TABLES `stock_transfer_items` WRITE;
/*!40000 ALTER TABLE `stock_transfer_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `stock_transfer_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_transfers`
--

DROP TABLE IF EXISTS `stock_transfers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `stock_transfers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `transfer_number` varchar(50) NOT NULL,
  `source_warehouse_id` int(11) NOT NULL,
  `destination_warehouse_id` int(11) NOT NULL,
  `transfer_date` date NOT NULL,
  `status` enum('PENDING','IN_TRANSIT','COMPLETED','CANCELLED') DEFAULT 'COMPLETED',
  `remarks` text DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `transfer_number` (`transfer_number`),
  KEY `source_warehouse_id` (`source_warehouse_id`),
  KEY `destination_warehouse_id` (`destination_warehouse_id`),
  CONSTRAINT `stock_transfers_ibfk_1` FOREIGN KEY (`source_warehouse_id`) REFERENCES `warehouses` (`id`),
  CONSTRAINT `stock_transfers_ibfk_2` FOREIGN KEY (`destination_warehouse_id`) REFERENCES `warehouses` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_transfers`
--

LOCK TABLES `stock_transfers` WRITE;
/*!40000 ALTER TABLE `stock_transfers` DISABLE KEYS */;
/*!40000 ALTER TABLE `stock_transfers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sub_skus`
--

DROP TABLE IF EXISTS `sub_skus`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sub_skus` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `parent_fg_id` int(11) NOT NULL,
  `sub_sku_code` varchar(50) NOT NULL,
  `sub_sku_name` varchar(255) NOT NULL,
  `brand_name` varchar(150) NOT NULL,
  `client_item_code` varchar(100) DEFAULT NULL,
  `selling_price` decimal(12,2) DEFAULT 0.00,
  `description` text DEFAULT NULL,
  `active` tinyint(1) DEFAULT 1,
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `sub_sku_code` (`sub_sku_code`),
  KEY `idx_sub_sku_parent` (`parent_fg_id`),
  KEY `idx_sub_sku_brand` (`brand_name`),
  KEY `idx_sub_sku_name` (`sub_sku_name`),
  CONSTRAINT `sub_skus_ibfk_1` FOREIGN KEY (`parent_fg_id`) REFERENCES `finished_goods` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sub_skus`
--

LOCK TABLES `sub_skus` WRITE;
/*!40000 ALTER TABLE `sub_skus` DISABLE KEYS */;
INSERT INTO `sub_skus` VALUES (1,1,'SOM-TAP-01','Somany Brass Basin Tap Model A','Somany',NULL,1350.00,'OEM Branding for Somany Ceramics',1,NULL,NULL,'2026-10-11 10:33:07','2026-10-11 10:33:07'),(2,1,'PP-TAP-01','Prince Pipe Chrome Basin Tap','Prince Pipe',NULL,1300.00,'Private Label for Prince Pipes & Fittings',1,NULL,NULL,'2026-10-11 10:33:07','2026-10-11 10:33:07'),(3,1,'ZEN-TAP-01','Zen Bath Elegance Basin Tap','Zen Bath Fittings',NULL,1280.00,'Private Label for Zen Bath',1,NULL,NULL,'2026-10-11 10:33:07','2026-10-11 10:33:07'),(4,3,'SOM-ANG-02','Somany Angle Valve 2-in-1 Heavy','Somany',NULL,720.00,'OEM for Somany',1,NULL,NULL,'2026-10-11 10:33:07','2026-10-11 10:33:07'),(5,3,'ZEN-ANG-02','Zen Bath Angle Cock Duo','Zen Bath Fittings',NULL,690.00,'OEM for Zen Bath Fittings',1,NULL,NULL,'2026-10-11 10:33:07','2026-10-11 10:33:07');
/*!40000 ALTER TABLE `sub_skus` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `units`
--

DROP TABLE IF EXISTS `units`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `units` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `unit_code` varchar(20) NOT NULL,
  `unit_name` varchar(100) NOT NULL,
  `decimal_allowed` tinyint(1) DEFAULT 1,
  `active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unit_code` (`unit_code`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `units`
--

LOCK TABLES `units` WRITE;
/*!40000 ALTER TABLE `units` DISABLE KEYS */;
INSERT INTO `units` VALUES (1,'KG','Kilogram',1,1,'2026-10-08 14:00:53','2026-10-08 14:00:53'),(2,'GRAM','Gram',1,1,'2026-10-08 14:00:53','2026-10-08 14:00:53'),(3,'PCS','Pieces',0,1,'2026-10-08 14:00:53','2026-10-08 14:00:53'),(4,'MTR','Meter',1,1,'2026-10-08 14:00:53','2026-10-08 14:00:53'),(5,'LTR','Liter',1,1,'2026-10-08 14:00:53','2026-10-08 14:00:53'),(6,'BOX','Box / Carton',0,1,'2026-10-08 14:00:53','2026-10-08 14:00:53'),(7,'SET','Set',0,1,'2026-10-08 14:00:53','2026-10-08 14:00:53'),(8,'DOZEN','Dozen',0,1,'2026-10-08 14:00:53','2026-10-08 14:00:53');
/*!40000 ALTER TABLE `units` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `full_name` varchar(150) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `role_id` int(11) NOT NULL,
  `active` tinyint(1) DEFAULT 1,
  `last_login_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  KEY `role_id` (`role_id`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'admin','admin@bharatimpex.com','$2a$12$9Yc/E1o/z80nN5H.qS1UreV2Yf7zG48Qo8a.6B2l31R6H0O8Z9rCe','Bharat Impex Admin','+91 98765 43210',1,1,'2026-10-22 02:03:32','2026-10-08 14:00:53','2026-10-22 02:03:32'),(2,'manager','manager@bharatimpex.com','$2a$12$9Yc/E1o/z80nN5H.qS1UreV2Yf7zG48Qo8a.6B2l31R6H0O8Z9rCe','Rajesh Sharma (Operations Manager)','+91 98765 43211',2,1,NULL,'2026-10-08 14:00:53','2026-10-08 14:00:53'),(3,'operator','operator@bharatimpex.com','$2a$12$9Yc/E1o/z80nN5H.qS1UreV2Yf7zG48Qo8a.6B2l31R6H0O8Z9rCe','Suresh Kumar (Shopfloor Lead)','+91 98765 43212',6,1,'2026-10-08 14:35:30','2026-10-08 14:00:53','2026-10-08 14:35:30');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `warehouses`
--

DROP TABLE IF EXISTS `warehouses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `warehouses` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `warehouse_code` varchar(50) NOT NULL,
  `warehouse_name` varchar(150) NOT NULL,
  `location` varchar(255) DEFAULT NULL,
  `contact_person` varchar(150) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `is_default` tinyint(1) DEFAULT 0,
  `active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `warehouse_code` (`warehouse_code`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `warehouses`
--

LOCK TABLES `warehouses` WRITE;
/*!40000 ALTER TABLE `warehouses` DISABLE KEYS */;
INSERT INTO `warehouses` VALUES (1,'WH-MAIN','Main Raw Material & RM Store','Building A - Ground Floor','Vikram Patel','+91 98250 11223',1,1,'2026-10-08 14:00:53','2026-10-08 14:00:53'),(2,'WH-FACTORY','Shopfloor & WIP Store','Building B - Manufacturing Unit','Suresh Kumar','+91 98250 11224',0,1,'2026-10-08 14:00:53','2026-10-08 14:00:53'),(3,'WH-FG','Finished Goods Dispatch Hub','Building C - Logistics Bay','Amit Shah','+91 98250 11225',0,1,'2026-10-08 14:00:53','2026-10-08 14:00:53'),(4,'WH-NORTH','North Depot Stores','Building C, Sector 5','','',0,0,'2026-10-19 16:05:30','2026-10-19 16:08:51');
/*!40000 ALTER TABLE `warehouses` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-22 20:48:44
