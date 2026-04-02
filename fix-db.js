const { Client } = require('pg');

const client = new Client({
  connectionString: "postgresql://postgres.elzmopyaubsmjdfxtiqk:BQgA$Thmny2tHPe@54.247.26.119:6543/postgres",
  ssl: { rejectUnauthorized: false }
});

const sql = `
DO $$ 
BEGIN 
    -- SECTION B & C: REPRESENTATIVE
    BEGIN ALTER TABLE "organizations" ADD COLUMN "rep_name" character varying; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE "organizations" ADD COLUMN "rep_position" character varying; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE "organizations" ADD COLUMN "rep_phone" character varying; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE "organizations" ADD COLUMN "rep_email" character varying; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE "organizations" ADD COLUMN "rep_gender" character varying; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE "organizations" ADD COLUMN "rep_nationality" character varying; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE "organizations" ADD COLUMN "rep_state_of_origin" character varying; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE "organizations" ADD COLUMN "rep_lga" character varying; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE "organizations" ADD COLUMN "rep_nin" character varying; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE "organizations" ADD COLUMN "rep_bvn" character varying; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE "organizations" ADD COLUMN "rep_id_type" character varying; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE "organizations" ADD COLUMN "rep_id_url" character varying; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE "organizations" ADD COLUMN "rep_passport_url" character varying; EXCEPTION WHEN duplicate_column THEN END;

    -- SECTION D: SAVINGS & ENGAGEMENT
    BEGIN ALTER TABLE "organizations" ADD COLUMN "participate_in_savings" boolean DEFAULT false; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE "organizations" ADD COLUMN "savings_frequency" character varying; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE "organizations" ADD COLUMN "monthly_contribution_amount" numeric(15,2) DEFAULT 0; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE "organizations" ADD COLUMN "areas_of_participation" text; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE "organizations" ADD COLUMN "proposed_beneficiaries" integer; EXCEPTION WHEN duplicate_column THEN END;

    -- SECTION E: ORG BANK DETAILS
    BEGIN ALTER TABLE "organizations" ADD COLUMN "org_account_name" character varying; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE "organizations" ADD COLUMN "org_bank_name" character varying; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE "organizations" ADD COLUMN "org_account_number" character varying; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE "organizations" ADD COLUMN "org_bvn" character varying; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE "organizations" ADD COLUMN "signatories" text; EXCEPTION WHEN duplicate_column THEN END;

    -- SECTION G: OFFICIAL USE
    BEGIN ALTER TABLE "organizations" ADD COLUMN "official_zone" character varying; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE "organizations" ADD COLUMN "received_by" character varying; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE "organizations" ADD COLUMN "official_remarks" text; EXCEPTION WHEN duplicate_column THEN END;

    -- OTHER
    BEGIN ALTER TABLE "organizations" ADD COLUMN "org_type_str" character varying; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE "organizations" ADD COLUMN "active_member_count" integer; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE "organizations" ADD COLUMN "establishment_date" TIMESTAMP; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE "organizations" ADD COLUMN "parent_id" integer; EXCEPTION WHEN duplicate_column THEN END;
    -- Optional but helpful for tree speed
    BEGIN ALTER TABLE "organizations" ADD COLUMN "mpath" character varying; EXCEPTION WHEN duplicate_column THEN END;
END $$;
`;

async function run() {
  await client.connect();
  console.log('Connected to DB');
  try {
    await client.query(sql);
    console.log('Schema update successful');
  } catch (err) {
    console.error('Error updating schema:', err.message);
  } finally {
    await client.end();
  }
}

run();
