<?php
// ============================================================
// BHARAT IMPEX — PROCESS & ROUTE CONTROLLER
// ============================================================

class ProcessController {

    public static function index(): void {
        Auth::requireAuth();
        $db = Database::getConnection();

        $stmt = $db->query("
            SELECT p.*,
                   (SELECT COUNT(*) FROM process_product_mapping ppm WHERE ppm.process_id = p.id) as mapped_product_count
            FROM processes p
            WHERE p.active = 1
            ORDER BY p.sequence ASC, p.id ASC
        ");
        $processes = $stmt->fetchAll();

        Response::success($processes);
    }

    public static function create(): void {
        $user = Auth::requireAuth();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $name = trim($input['process_name'] ?? '');
        $code = strtoupper(trim($input['process_code'] ?? ''));
        $duration = (int)($input['standard_duration_minutes'] ?? 0);
        $desc = trim($input['description'] ?? '');

        if (empty($name)) {
            Response::error('Process name is required.', null, 400);
        }

        if (empty($code)) {
            $code = 'PROC-' . strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $name), 0, 6));
        }

        $db = Database::getConnection();
        $db->beginTransaction();
        try {
            $seqStmt = $db->query("SELECT COALESCE(MAX(sequence), 0) + 1 FROM processes WHERE active = 1");
            $nextSeq = (int)$seqStmt->fetchColumn();
            if (isset($input['sequence']) && (int)$input['sequence'] > 0) {
                $nextSeq = (int)$input['sequence'];
            }

            $stmt = $db->prepare("
                INSERT INTO processes (process_code, process_name, description, standard_duration_minutes, sequence, active, created_at)
                VALUES (?, ?, ?, ?, ?, 1, NOW())
            ");
            $stmt->execute([$code, $name, $desc ?: "Stage: $name", $duration, $nextSeq]);
            $id = (int)$db->lastInsertId();

            // Sync to process_product_mapping for all active finished goods
            $fgs = $db->query("SELECT id FROM finished_goods WHERE active = 1")->fetchAll(PDO::FETCH_COLUMN);
            $ppmInsert = $db->prepare("
                INSERT INTO process_product_mapping (fg_id, process_id, sequence, is_mandatory, expected_loss_percent, active, created_at)
                VALUES (?, ?, ?, 1, 0.5, 1, NOW())
            ");
            foreach ($fgs as $fgId) {
                $ppmInsert->execute([$fgId, $id, $nextSeq]);
            }

            AuditService::log('PROCESS_CREATED', 'MASTERS', $code, null, ['id' => $id, 'name' => $name]);
            $db->commit();

            Response::success(['id' => $id, 'process_code' => $code, 'sequence' => $nextSeq], 'Process created successfully.');
        } catch (Exception $e) {
            $db->rollBack();
            Response::error('Failed to create process: ' . $e->getMessage(), null, 400);
        }
    }

    public static function update(): void {
        $user = Auth::requireAuth();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $id = (int)($input['id'] ?? 0);

        if (!$id) {
            Response::error('Process ID is required.', null, 400);
        }

        $name = trim($input['process_name'] ?? '');
        if (empty($name)) {
            Response::error('Process name is required.', null, 400);
        }

        $db = Database::getConnection();
        $db->beginTransaction();
        try {
            $code = strtoupper(trim($input['process_code'] ?? ''));
            $desc = trim($input['description'] ?? '');
            $duration = (int)($input['standard_duration_minutes'] ?? 0);
            $active = isset($input['active']) ? (int)$input['active'] : 1;

            if ($code) {
                $stmt = $db->prepare("
                    UPDATE processes 
                    SET process_name = ?, process_code = ?, description = ?, standard_duration_minutes = ?, active = ?, updated_at = NOW()
                    WHERE id = ?
                ");
                $stmt->execute([$name, $code, $desc ?: "Stage: $name", $duration, $active, $id]);
            } else {
                $stmt = $db->prepare("
                    UPDATE processes 
                    SET process_name = ?, description = ?, standard_duration_minutes = ?, active = ?, updated_at = NOW()
                    WHERE id = ?
                ");
                $stmt->execute([$name, $desc ?: "Stage: $name", $duration, $active, $id]);
            }

            if (isset($input['sequence']) && (int)$input['sequence'] > 0) {
                $seq = (int)$input['sequence'];
                $db->prepare("UPDATE processes SET sequence = ? WHERE id = ?")->execute([$seq, $id]);
                $db->prepare("UPDATE process_product_mapping SET sequence = ? WHERE process_id = ?")->execute([$seq, $id]);
            }

            AuditService::log('PROCESS_UPDATED', 'MASTERS', (string)$id, null, ['name' => $name]);
            $db->commit();

            Response::success(null, 'Process updated successfully.');
        } catch (Exception $e) {
            $db->rollBack();
            Response::error('Failed to update process: ' . $e->getMessage(), null, 400);
        }
    }

    /**
     * Get Route stages configured for a Finished Good
     */
    public static function getProductRoute(): void {
        Auth::requireAuth();
        $fgId = (int)($_GET['fg_id'] ?? 0);

        if (!$fgId) {
            Response::error('Finished Good ID is required.', null, 400);
        }

        $db = Database::getConnection();
        $stmt = $db->prepare("
            SELECT ppm.*, p.process_name, p.process_code, p.standard_duration_minutes
            FROM process_product_mapping ppm
            JOIN processes p ON ppm.process_id = p.id
            WHERE ppm.fg_id = ?
            ORDER BY ppm.sequence ASC
        ");
        $stmt->execute([$fgId]);
        $routes = $stmt->fetchAll();

        Response::success($routes);
    }

    /**
     * Save / Update Dynamic Route mapping for a Finished Good
     */
    public static function saveProductRoute(): void {
        $user = Auth::requireAuth();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $fgId = (int)($input['fg_id'] ?? 0);
        $stages = $input['stages'] ?? [];

        if (!$fgId || empty($stages)) {
            Response::error('Finished Good and at least one process stage are required.', null, 400);
        }

        $db = Database::getConnection();
        $db->beginTransaction();

        try {
            // Remove previous mapping
            $db->prepare("DELETE FROM process_product_mapping WHERE fg_id = ?")->execute([$fgId]);

            $insertStmt = $db->prepare("
                INSERT INTO process_product_mapping (fg_id, process_id, sequence, is_mandatory, expected_loss_percent, description, active, created_at)
                VALUES (?, ?, ?, ?, ?, ?, 1, NOW())
            ");

            foreach ($stages as $idx => $stage) {
                $insertStmt->execute([
                    $fgId,
                    (int)$stage['process_id'],
                    $stage['sequence'] ?? ($idx + 1),
                    isset($stage['is_mandatory']) ? (int)$stage['is_mandatory'] : 1,
                    (float)($stage['expected_loss_percent'] ?? 0.0),
                    $stage['description'] ?? null
                ]);
            }

            AuditService::log('PRODUCT_ROUTE_UPDATED', 'PROCESSES', (string)$fgId, null, ['stage_count' => count($stages)]);

            $db->commit();
            Response::success(null, 'Product manufacturing route saved successfully.');
        } catch (Exception $e) {
            $db->rollBack();
            Response::error($e->getMessage(), null, 400);
        }
    }

    /**
     * Delete a Process Step
     */
    public static function delete(): void {
        $user = Auth::requireAuth();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $id = (int)($input['id'] ?? ($_GET['id'] ?? 0));

        if (!$id) {
            Response::error('Process ID is required.', null, 400);
        }

        $db = Database::getConnection();
        $db->beginTransaction();
        try {
            // Delete product mapping for this process
            $db->prepare("DELETE FROM process_product_mapping WHERE process_id = ?")->execute([$id]);

            // Try hard delete, or fall back to soft delete if historic order entries exist
            try {
                $db->prepare("DELETE FROM processes WHERE id = ?")->execute([$id]);
            } catch (Exception $fke) {
                $db->prepare("UPDATE processes SET active = 0 WHERE id = ?")->execute([$id]);
            }

            // Re-order remaining active processes sequences 1..N
            $remaining = $db->query("SELECT id FROM processes WHERE active = 1 ORDER BY sequence ASC, id ASC")->fetchAll(PDO::FETCH_COLUMN);
            $seqStmt = $db->prepare("UPDATE processes SET sequence = ? WHERE id = ?");
            foreach ($remaining as $idx => $rId) {
                $seqStmt->execute([$idx + 1, $rId]);
            }

            // Sync updated sequence to process_product_mapping for all active finished goods
            if (!empty($remaining)) {
                $fgs = $db->query("SELECT id FROM finished_goods WHERE active = 1")->fetchAll(PDO::FETCH_COLUMN);
                $delPpm = $db->prepare("DELETE FROM process_product_mapping WHERE fg_id = ?");
                $ppmInsert = $db->prepare("
                    INSERT INTO process_product_mapping (fg_id, process_id, sequence, is_mandatory, expected_loss_percent, active, created_at)
                    VALUES (?, ?, ?, 1, 0.5, 1, NOW())
                ");
                foreach ($fgs as $fgId) {
                    $delPpm->execute([$fgId]);
                    foreach ($remaining as $idx => $rId) {
                        $ppmInsert->execute([$fgId, $rId, $idx + 1]);
                    }
                }
            }

            AuditService::log('PROCESS_DELETED', 'MASTERS', (string)$id, null, null);
            $db->commit();
            Response::success(null, 'Process step deleted successfully.');
        } catch (Exception $e) {
            $db->rollBack();
            Response::error('Failed to delete process: ' . $e->getMessage(), null, 400);
        }
    }

    /**
     * Batch Save Visual Workflow / Process Route
     */
    public static function batchSaveFlow(): void {
        $user = Auth::requireAuth();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $steps = $input['steps'] ?? [];

        if (empty($steps)) {
            Response::error('At least one process step is required.', null, 400);
        }

        $db = Database::getConnection();
        $db->beginTransaction();
        try {
            $savedIds = [];
            foreach ($steps as $idx => $st) {
                $pId = (int)($st['id'] ?? 0);
                $name = trim($st['process_name'] ?? '');
                $code = strtoupper(trim($st['process_code'] ?? ''));
                $duration = (int)($st['standard_duration_minutes'] ?? 0);
                $desc = trim($st['description'] ?? '');
                $seq = $idx + 1;

                if (!$name) continue;
                if (!$code) {
                    $code = 'PROC-' . strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $name), 0, 6));
                }

                if ($pId > 0) {
                    $stmt = $db->prepare("
                        UPDATE processes 
                        SET process_name = ?, process_code = ?, description = ?, standard_duration_minutes = ?, sequence = ?, active = 1, updated_at = NOW()
                        WHERE id = ?
                    ");
                    $stmt->execute([$name, $code, $desc, $duration, $seq, $pId]);
                    $savedIds[] = $pId;
                } else {
                    $stmt = $db->prepare("
                        INSERT INTO processes (process_code, process_name, description, standard_duration_minutes, sequence, active, created_at)
                        VALUES (?, ?, ?, ?, ?, 1, NOW())
                    ");
                    $stmt->execute([$code, $name, $desc, $duration, $seq]);
                    $savedIds[] = (int)$db->lastInsertId();
                }
            }

            // Sync updated production sequence to process_product_mapping for all finished goods
            if (!empty($savedIds)) {
                $fgs = $db->query("SELECT id FROM finished_goods WHERE active = 1")->fetchAll(PDO::FETCH_COLUMN);
                $delPpm = $db->prepare("DELETE FROM process_product_mapping WHERE fg_id = ?");
                $ppmInsert = $db->prepare("
                    INSERT INTO process_product_mapping (fg_id, process_id, sequence, is_mandatory, expected_loss_percent, active, created_at)
                    VALUES (?, ?, ?, 1, 0.5, 1, NOW())
                ");
                foreach ($fgs as $fgId) {
                    $delPpm->execute([$fgId]);
                    foreach ($savedIds as $seqIdx => $sPid) {
                        $ppmInsert->execute([$fgId, $sPid, $seqIdx + 1]);
                    }
                }

                // Sync stage sequence in production_stage_entries for pending/ready stages
                $updPse = $db->prepare("UPDATE production_stage_entries SET sequence = ? WHERE process_id = ? AND status IN ('PENDING', 'READY')");
                foreach ($savedIds as $seqIdx => $sPid) {
                    $updPse->execute([$seqIdx + 1, $sPid]);
                }
            }

            // Remove any requested deleted ids
            $deletedIds = $input['deleted_ids'] ?? [];
            if (!empty($deletedIds)) {
                $delPlaceholders = implode(',', array_fill(0, count($deletedIds), '?'));
                $db->prepare("DELETE FROM process_product_mapping WHERE process_id IN ($delPlaceholders)")->execute($deletedIds);
                try {
                    $db->prepare("DELETE FROM processes WHERE id IN ($delPlaceholders)")->execute($deletedIds);
                } catch (Exception $fke) {
                    $db->prepare("UPDATE processes SET active = 0 WHERE id IN ($delPlaceholders)")->execute($deletedIds);
                }
            }

            $db->commit();
            Response::success(['saved_ids' => $savedIds], 'Production process flow saved successfully.');
        } catch (Exception $e) {
            $db->rollBack();
            Response::error('Failed to save process flow: ' . $e->getMessage(), null, 400);
        }
    }
}

