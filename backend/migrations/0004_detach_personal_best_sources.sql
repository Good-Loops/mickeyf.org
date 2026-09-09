ALTER TABLE game_personal_bests
    DROP FOREIGN KEY fk_game_personal_bests_source_game_run,
    DROP INDEX idx_game_personal_bests_source_game_run,
    DROP COLUMN source_game_run_id;
