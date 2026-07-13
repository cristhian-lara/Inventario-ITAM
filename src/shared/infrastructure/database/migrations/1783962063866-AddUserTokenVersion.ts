import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserTokenVersion1783962063866 implements MigrationInterface {
    name = 'AddUserTokenVersion1783962063866'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "token_version" integer NOT NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "token_version"`);
    }

}
