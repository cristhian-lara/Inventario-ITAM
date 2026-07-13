import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1783913579848 implements MigrationInterface {
    name = 'InitialSchema1783913579848'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "assignments" ("id" character varying NOT NULL, "asset_id" character varying NOT NULL, "collaborator_id" character varying NOT NULL, "status" character varying NOT NULL, "assignment_type" character varying NOT NULL DEFAULT 'PERMANENT', "start_date" TIMESTAMP NOT NULL, "end_date" TIMESTAMP, "expected_return_date" TIMESTAMP, "last_alert_sent_at" TIMESTAMP, "signature_token" character varying, "signature_metadata" jsonb, "document_path" character varying, "admin_approval" jsonb, CONSTRAINT "PK_c54ca359535e0012b04dcbd80ee" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "system_modules" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "key" character varying(30) NOT NULL, "name" character varying(80) NOT NULL, "display_order" integer NOT NULL DEFAULT '0', "is_active" boolean NOT NULL DEFAULT true, "supports_create" boolean NOT NULL DEFAULT true, "supports_edit" boolean NOT NULL DEFAULT true, "supports_delete" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_b14041c59b4609e614ef0a1af47" UNIQUE ("key"), CONSTRAINT "PK_03181cfef75a5c51913b27419d0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "username" character varying NOT NULL, "password_hash" character varying NOT NULL, "role" character varying(20) NOT NULL DEFAULT 'ESTANDAR', "full_name" character varying(150) NOT NULL, "email" character varying(150) NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username"), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "CHK_users_role" CHECK (role IN ('SUPER_ADMIN','ADMINISTRADOR','ESTANDAR')), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "user_permissions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "module_id" uuid NOT NULL, "can_read" boolean NOT NULL DEFAULT false, "can_create" boolean NOT NULL DEFAULT false, "can_edit" boolean NOT NULL DEFAULT false, "can_delete" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_user_permissions_user_module" UNIQUE ("user_id", "module_id"), CONSTRAINT "CHK_user_permissions_read" CHECK ((NOT (can_create OR can_edit OR can_delete)) OR can_read), CONSTRAINT "PK_01f4295968ba33d73926684264f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "categories" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "attributes_schema" jsonb NOT NULL, CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "assets" ("id" character varying NOT NULL, "category_id" integer, "serial" character varying, "status" character varying NOT NULL, "dynamic_data" jsonb NOT NULL, "purchase_date" date, "warranty_months" integer, "depreciation_years" integer, "purchase_price" numeric(10,2), "vendor_name" character varying, "internal_buyer" character varying, "disposal" jsonb, CONSTRAINT "PK_da96729a8b113377cfb6a62439c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "cecos" ("id" character varying NOT NULL, "name" character varying NOT NULL, "description" character varying, CONSTRAINT "PK_87b224e647e101445e00aa2195d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "hardware_upgrades" ("id" character varying NOT NULL, "asset_id" character varying NOT NULL, "upgrade_date" date NOT NULL, "component" character varying NOT NULL, "old_value" character varying, "new_value" character varying NOT NULL, "performed_by" character varying, "notes" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a9eafd1a720a9c338768893b266" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "collaborators" ("id" character varying NOT NULL, "name" character varying NOT NULL, "email" character varying NOT NULL, "department" integer, "location" character varying NOT NULL, "status" character varying NOT NULL DEFAULT 'ACTIVE', "activation_date" TIMESTAMP NOT NULL, "deactivation_date" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "is_leader" boolean NOT NULL DEFAULT false, "leader_id" character varying, "dynamic_attributes" jsonb NOT NULL DEFAULT '{}', CONSTRAINT "UQ_b210f505222bd59004a77165857" UNIQUE ("email"), CONSTRAINT "PK_f579a5df9d66287f400806ad875" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "collaborator_history" ("id" character varying NOT NULL, "collaborator_id" character varying NOT NULL, "action" character varying NOT NULL, "timestamp" TIMESTAMP NOT NULL DEFAULT now(), "reason" character varying, CONSTRAINT "PK_d494a3b6e895ea51f34baa34b1b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "departments" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "description" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_839517a681a86bb84cbcc6a1e9d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "maintenances" ("id" character varying NOT NULL, "asset_id" character varying NOT NULL, "type" character varying NOT NULL, "status" character varying NOT NULL, "scheduled_date" date NOT NULL, "started_at" TIMESTAMP, "execution_date" date, "reason" character varying, "start_note" text, "notes" text, "collaborator_snapshot_id" character varying, "collaborator_snapshot_name" character varying, "signature_token" character varying, "signature_metadata" jsonb, "signed_at" TIMESTAMP, "pdf_url" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_62403473bd524a42d58589aa78b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "settings" ("key" character varying NOT NULL, "value" text, CONSTRAINT "PK_c8639b7626fa94ba8265628f214" PRIMARY KEY ("key"))`);
        await queryRunner.query(`ALTER TABLE "user_permissions" ADD CONSTRAINT "FK_3495bd31f1862d02931e8e8d2e8" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_permissions" ADD CONSTRAINT "FK_8ab0433089f0b41a0f8e5b10d16" FOREIGN KEY ("module_id") REFERENCES "system_modules"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "assets" ADD CONSTRAINT "FK_bfdc3fe63eb7269f4a286252641" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "assets" DROP CONSTRAINT "FK_bfdc3fe63eb7269f4a286252641"`);
        await queryRunner.query(`ALTER TABLE "user_permissions" DROP CONSTRAINT "FK_8ab0433089f0b41a0f8e5b10d16"`);
        await queryRunner.query(`ALTER TABLE "user_permissions" DROP CONSTRAINT "FK_3495bd31f1862d02931e8e8d2e8"`);
        await queryRunner.query(`DROP TABLE "settings"`);
        await queryRunner.query(`DROP TABLE "maintenances"`);
        await queryRunner.query(`DROP TABLE "departments"`);
        await queryRunner.query(`DROP TABLE "collaborator_history"`);
        await queryRunner.query(`DROP TABLE "collaborators"`);
        await queryRunner.query(`DROP TABLE "hardware_upgrades"`);
        await queryRunner.query(`DROP TABLE "cecos"`);
        await queryRunner.query(`DROP TABLE "assets"`);
        await queryRunner.query(`DROP TABLE "categories"`);
        await queryRunner.query(`DROP TABLE "user_permissions"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TABLE "system_modules"`);
        await queryRunner.query(`DROP TABLE "assignments"`);
    }

}
