import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPerformanceIndexes1783915153998 implements MigrationInterface {
    name = 'AddPerformanceIndexes1783915153998'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX "IDX_f38629a3327e8b7033ca15a6a0" ON "assignments"  ("asset_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_a85b9cb8fdcf98e2ae1e086573" ON "assignments"  ("collaborator_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_ce6063ba9705d8ce937dfee002" ON "assignments"  ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_bfdc3fe63eb7269f4a28625264" ON "assets"  ("category_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_06be3e2fd34f70a8e68e518dbf" ON "assets"  ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_16bad560bbfa596aba55c91755" ON "collaborators"  ("department") `);
        await queryRunner.query(`CREATE INDEX "IDX_e4e8d5cd768fa03652aab3703e" ON "collaborators"  ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_a648709d749342f0580976aa5a" ON "maintenances"  ("asset_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_7f7afe3639e645c6cffbaca27b" ON "maintenances"  ("status") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_7f7afe3639e645c6cffbaca27b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a648709d749342f0580976aa5a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e4e8d5cd768fa03652aab3703e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_16bad560bbfa596aba55c91755"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_06be3e2fd34f70a8e68e518dbf"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_bfdc3fe63eb7269f4a28625264"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ce6063ba9705d8ce937dfee002"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a85b9cb8fdcf98e2ae1e086573"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f38629a3327e8b7033ca15a6a0"`);
    }

}
