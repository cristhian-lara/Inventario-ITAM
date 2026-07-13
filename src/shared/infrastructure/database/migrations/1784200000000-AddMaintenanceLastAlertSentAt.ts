import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMaintenanceLastAlertSentAt1784200000000 implements MigrationInterface {
    name = 'AddMaintenanceLastAlertSentAt1784200000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "maintenances" ADD "last_alert_sent_at" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "maintenances" DROP COLUMN "last_alert_sent_at"`);
    }

}
