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

        const userRes = await client.query("SELECT id FROM users WHERE role = 'member'");
        const memberUserIds = userRes.rows.map(r => r.id);
        
        if (memberUserIds.length === 0) {
            console.log('No members found to delete.');
            return;
        }

        const userIdList = `(${memberUserIds.join(',')})`;
        const memberRes = await client.query(`SELECT id FROM members WHERE user_id IN ${userIdList}`);
        const memberIds = memberRes.rows.map(r => r.id);
        const memberIdList = memberIds.length > 0 ? `(${memberIds.join(',')})` : null;

        await client.query('BEGIN');

        const safeDelete = async (table, conditions) => {
            for (const condition of conditions) {
                const { col, valList } = condition;
                if (!valList) continue;
                try {
                    // Check if column exists
                    const colRes = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = '${table}' AND column_name = '${col}'`);
                    if (colRes.rows.length > 0) {
                        console.log(`Deleting from ${table} where ${col}...`);
                        await client.query(`DELETE FROM ${table} WHERE ${col} IN ${valList}`);
                        return; // Successfully deleted via this column
                    }
                } catch (e) {
                    console.log(`Skip ${table} via ${col}: ${e.message}`);
                }
            }
        };

        const safeDeleteCamel = async (table, conditions) => {
            for (const condition of conditions) {
                const { col, valList } = condition;
                if (!valList) continue;
                try {
                    const colRes = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = '${table}' AND column_name = '${col}'`);
                    if (colRes.rows.length > 0) {
                        console.log(`Deleting from ${table} where "${col}"...`);
                        await client.query(`DELETE FROM ${table} WHERE "${col}" IN ${valList}`);
                        return;
                    }
                } catch (e) {
                    console.log(`Skip ${table} via ${col}: ${e.message}`);
                }
            }
        };

        if (memberIdList) {
            await safeDelete('loan_repayments', [{ col: 'loan_id', valList: `(SELECT id FROM loans WHERE member_id IN ${memberIdList})` }]);
            await safeDelete('repayment_schedules', [{ col: 'loan_id', valList: `(SELECT id FROM loans WHERE member_id IN ${memberIdList})` }]);
            await safeDelete('guarantors', [{ col: 'loan_id', valList: `(SELECT id FROM loans WHERE member_id IN ${memberIdList})` }, { col: 'member_id', valList: memberIdList }]);
            await safeDelete('loans', [{ col: 'member_id', valList: memberIdList }]);
            await safeDelete('savings_transactions', [{ col: 'member_id', valList: memberIdList }]);
            await safeDelete('savings_accounts', [{ col: 'member_id', valList: memberIdList }]);
            await safeDelete('contributions', [{ col: 'member_id', valList: memberIdList }]);
            await safeDelete('member_profiles', [{ col: 'member_id', valList: memberIdList }]);
            await safeDelete('kyc_documents', [{ col: 'member_id', valList: memberIdList }, { col: 'user_id', valList: userIdList }]);
            await safeDelete('next_of_kin', [{ col: 'member_id', valList: memberIdList }]);
            await safeDelete('attendances', [{ col: 'member_id', valList: memberIdList }, { col: 'user_id', valList: userIdList }]);
            await safeDelete('kyc_records', [{ col: 'member_id', valList: memberIdList }, { col: 'user_id', valList: userIdList }]);
        }

        await safeDelete('program_applications', [{ col: 'applicant_id', valList: userIdList }, { col: 'user_id', valList: userIdList }]);
        await safeDeleteCamel('program_applications', [{ col: 'applicantId', valList: userIdList }]);
        
        await safeDelete('bank_accounts', [{ col: 'owner_id', valList: userIdList }]);
        await safeDelete('wallets', [{ col: 'owner_id', valList: userIdList }]);
        await safeDelete('approvals', [{ col: 'initiator_id', valList: userIdList }, { col: 'requested_by', valList: userIdList }]);
        await safeDelete('approval_logs', [{ col: 'user_id', valList: userIdList }]);
        await safeDelete('support_tickets', [{ col: 'user_id', valList: userIdList }]);
        await safeDelete('user_tours', [{ col: 'user_id', valList: userIdList }]);
        await safeDelete('otp_codes', [{ col: 'user_id', valList: userIdList }]);
        await safeDelete('email_logs', [{ col: 'user_id', valList: userIdList }]);
        await safeDelete('notifications', [{ col: 'user_id', valList: userIdList }]);
        await safeDelete('audit_logs', [{ col: 'user_id', valList: userIdList }]);
        await safeDelete('sessions', [{ col: 'user_id', valList: userIdList }]);
        await safeDelete('personal_access_tokens', [{ col: 'tokenable_id', valList: userIdList }]);

        if (memberIdList) {
            await safeDelete('members', [{ col: 'id', valList: memberIdList }]);
        }
        
        console.log('Final step: Deleting users...');
        await client.query(`DELETE FROM users WHERE id IN ${userIdList}`);

        await client.query('COMMIT');
        console.log('Purge completed successfully.');

    } catch (err) {
        if (client) await client.query('ROLLBACK').catch(e => {});
        console.error('Purge failed:', err.message);
    } finally {
        await client.end();
    }
}

run();
