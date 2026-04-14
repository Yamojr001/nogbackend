const { Client } = require('./node_modules/pg');

const client = new Client({
    user: 'postgres.elzmopyaubsmjdfxtiqk',
    host: '54.247.26.119',
    database: 'postgres',
    password: 'BQgA$Thmny2tHPe',
    port: 6543,
});

async function run() {
    try {
        await client.connect();
        console.log('Connected to database.');

        // Get list of member user IDs
        const userRes = await client.query("SELECT id FROM users WHERE role = 'member'");
        const memberUserIds = userRes.rows.map(r => r.id);
        
        if (memberUserIds.length === 0) {
            console.log('No members found to delete.');
            return;
        }

        console.log(`Found ${memberUserIds.length} users with role 'member'. Finding linked member profiles...`);
        
        const userIdList = `(${memberUserIds.join(',')})`;
        
        const memberRes = await client.query(`SELECT id FROM members WHERE user_id IN ${userIdList}`);
        const memberIds = memberRes.rows.map(r => r.id);
        const memberIdList = memberIds.length > 0 ? `(${memberIds.join(',')})` : null;

        console.log(`Found ${memberIds.length} member profiles. Starting transaction...`);

        await client.query('BEGIN');

        if (memberIdList) {
            console.log('Purging member-linked data...');
            // Loans & Repayments
            await client.query(`DELETE FROM loan_repayments WHERE loan_id IN (SELECT id FROM loans WHERE member_id IN ${memberIdList})`);
            await client.query(`DELETE FROM repayment_schedules WHERE loan_id IN (SELECT id FROM loans WHERE member_id IN ${memberIdList})`);
            await client.query(`DELETE FROM guarantors WHERE loan_id IN (SELECT id FROM loans WHERE member_id IN ${memberIdList}) OR member_id IN ${memberIdList}`);
            await client.query(`DELETE FROM loans WHERE member_id IN ${memberIdList}`);
            
            // Savings & Contributions
            await client.query(`DELETE FROM savings_transactions WHERE member_id IN ${memberIdList}`);
            await client.query(`DELETE FROM savings_accounts WHERE member_id IN ${memberIdList}`);
            await client.query(`DELETE FROM contributions WHERE member_id IN ${memberIdList}`);
            
            // Profile & KYC
            await client.query(`DELETE FROM member_profiles WHERE member_id IN ${memberIdList}`);
            await client.query(`DELETE FROM kyc_documents WHERE member_id IN ${memberIdList}`);
            await client.query(`DELETE FROM next_of_kin WHERE member_id IN ${memberIdList}`);
        }

        console.log('Purging user-linked data...');
        // Wallets
        const walletRes = await client.query(`SELECT id FROM wallets WHERE owner_id IN ${userIdList} AND owner_type = 'MEMBER'`);
        const walletIds = walletRes.rows.map(r => r.id);
        if (walletIds.length > 0) {
            const walletIdList = `(${walletIds.join(',')})`;
            await client.query(`DELETE FROM wallet_transactions WHERE debit_wallet_id IN ${walletIdList} OR credit_wallet_id IN ${walletIdList}`);
            await client.query(`DELETE FROM wallets WHERE id IN ${walletIdList}`);
        }

        // Applications & Others - Note double quotes for CamelCase columns
        // We try both column names just in case some records use one or the other
        await client.query(`DELETE FROM program_applications WHERE (applicant_id IN ${userIdList} AND applicant_type = 'MEMBER')`);
        await client.query(`DELETE FROM program_applications WHERE ("applicantId" IN ${userIdList} AND "applicantType" = 'MEMBER')`).catch(e => console.log('applicantId column skip if error'));
        
        await client.query(`DELETE FROM kyc_records WHERE user_id IN ${userIdList}`);
        await client.query(`DELETE FROM bank_accounts WHERE owner_id IN ${userIdList} AND owner_type = 'MEMBER'`);
        await client.query(`DELETE FROM attendances WHERE user_id IN ${userIdList}`);
        await client.query(`DELETE FROM "approvals" WHERE initiator_id IN ${userIdList} OR requested_by IN ${userIdList}`);
        await client.query(`DELETE FROM approval_logs WHERE user_id IN ${userIdList}`);
        await client.query(`DELETE FROM support_tickets WHERE user_id IN ${userIdList}`);
        await client.query(`DELETE FROM user_tours WHERE user_id IN ${userIdList}`);
        await client.query(`DELETE FROM otp_codes WHERE user_id IN ${userIdList}`);
        await client.query(`DELETE FROM email_logs WHERE user_id IN ${userIdList}`);
        await client.query(`DELETE FROM notifications WHERE user_id IN ${userIdList}`);
        await client.query(`DELETE FROM audit_logs WHERE user_id IN ${userIdList}`);
        
        // Optional tables
        await client.query(`DELETE FROM sessions WHERE user_id IN ${userIdList}`).catch(e => {});
        await client.query(`DELETE FROM personal_access_tokens WHERE tokenable_id IN ${userIdList} AND tokenable_type = 'User'`).catch(e => {});

        if (memberIdList) {
            await client.query(`DELETE FROM members WHERE id IN ${memberIdList}`);
        }
        
        console.log('Final step: Deleting users...');
        await client.query(`DELETE FROM users WHERE id IN ${userIdList}`);

        await client.query('COMMIT');
        console.log('Purge completed successfully.');

    } catch (err) {
        if (client) await client.query('ROLLBACK').catch(e => {});
        console.error('Purge failed, transaction rolled back:', err.message);
    } finally {
        await client.end();
    }
}

run();
