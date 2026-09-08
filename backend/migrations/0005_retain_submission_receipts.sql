ALTER TABLE game_runs
    DROP CHECK chk_game_runs_personal_best_boolean,
    RENAME TO game_submission_receipts,
    RENAME COLUMN personal_best TO improved_personal_best,
    DROP INDEX uq_game_runs_source_identity,
    ADD INDEX idx_game_submission_receipts_expiry (submitted_at, game_run_id, user_id),
    ADD CONSTRAINT chk_game_submission_receipts_improved_best_boolean
        CHECK (improved_personal_best IN (0, 1));
