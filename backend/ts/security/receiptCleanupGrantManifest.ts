import {
    renderRuntimeDatabaseAccount,
    type RuntimeDatabaseAccount,
} from './runtimeGrantManifest';

/** The cleanup identity can find expired receipts, serialize by user, and delete receipts only. */
export const RECEIPT_CLEANUP_SELECT_COLUMNS = Object.freeze([
    'user_id', 'game_run_id', 'submitted_at',
] as const);

/** Reviewable SQL only: account creation and production application require separate approval. */
export function renderReceiptCleanupGrantStatements(
    databaseName: string,
    account: RuntimeDatabaseAccount
): readonly string[] {
    if (!/^[A-Za-z0-9_]{1,64}$/u.test(databaseName)) {
        throw new TypeError('Database name must be a simple MySQL identifier');
    }
    const principal = renderRuntimeDatabaseAccount(account);
    const columns = RECEIPT_CLEANUP_SELECT_COLUMNS.map((column) => `\`${column}\``).join(', ');
    return Object.freeze([
        `GRANT SELECT (${columns}), DELETE ON \`${databaseName}\`.\`game_submission_receipts\` TO ${principal};`,
    ]);
}

export interface ReceiptCleanupVerificationConnection {
    query(sql: string): Promise<[unknown, unknown]>;
}

function grantPrivileges(grant: string, database: string, account: RuntimeDatabaseAccount): string[] {
    const quotedPrincipal = `\`${account.user}\`@\`${account.host}\``;
    const stringPrincipal = renderRuntimeDatabaseAccount(account);
    const principal = grant.endsWith(quotedPrincipal) ? quotedPrincipal : stringPrincipal;
    if (grant === `GRANT USAGE ON *.* TO ${principal}`) return ['USAGE'];
    const suffix = ` ON \`${database}\`.\`game_submission_receipts\` TO ${principal}`;
    if (!grant.startsWith('GRANT ') || !grant.endsWith(suffix)) {
        throw new Error('Cleanup account has unexpected grants or role assignments.');
    }
    const privileges = grant.slice('GRANT '.length, -suffix.length);
    const parsed: string[] = [];
    let remaining = privileges;
    while (remaining !== '') {
        const match = /^(DELETE|SELECT \(([^)]+)\))(?=, |$)/u.exec(remaining);
        if (!match) throw new Error('Cleanup account has unexpected receipt privileges.');
        if (match[1] === 'DELETE') parsed.push('DELETE');
        else {
            for (const column of match[2].split(', ')) {
                if (!/^`[A-Za-z0-9_]+`$/u.test(column)) {
                    throw new Error('Cleanup column grant metadata is invalid.');
                }
                parsed.push(`SELECT:${column.slice(1, -1)}`);
            }
        }
        remaining = remaining.slice(match[0].length);
        if (remaining.startsWith(', ')) remaining = remaining.slice(2);
    }
    return parsed;
}

/** Run on the actual cleanup session, inside its deadline, before the first receipt query. */
export async function verifyReceiptCleanupConnection(
    connection: ReceiptCleanupVerificationConnection,
    database: string,
    expectedAccount: RuntimeDatabaseAccount,
    expectedServerUuid: string
): Promise<void> {
    renderReceiptCleanupGrantStatements(database, expectedAccount);
    if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/iu.test(expectedServerUuid)) {
        throw new TypeError('Cleanup requires an independently pinned server UUID.');
    }
    const [identityRows] = await connection.query(`
        SELECT DATABASE() AS databaseName, CURRENT_USER() AS currentUser,
               @@GLOBAL.server_uuid AS serverUuid, CURRENT_ROLE() AS currentRole,
               @@GLOBAL.mandatory_roles AS mandatoryRoles
    `);
    if (!Array.isArray(identityRows) || identityRows.length !== 1) {
        throw new Error('Cleanup identity metadata is unavailable.');
    }
    const identity = identityRows[0] as Record<string, unknown>;
    if (identity.databaseName !== database
        || identity.currentUser !== `${expectedAccount.user}@${expectedAccount.host}`
        || typeof identity.serverUuid !== 'string'
        || identity.serverUuid.toLowerCase() !== expectedServerUuid.toLowerCase()
        || identity.currentRole !== 'NONE'
        || identity.mandatoryRoles !== '') {
        throw new Error('Cleanup database identity or role boundary does not match.');
    }
    const [rows] = await connection.query('SHOW GRANTS');
    if (!Array.isArray(rows) || rows.length < 1 || rows.length > 4) {
        throw new Error('Cleanup grants are unavailable or unexpectedly broad.');
    }
    const privileges = rows.flatMap((row: unknown) => {
        if (!row || typeof row !== 'object') throw new Error('Cleanup grant metadata is invalid.');
        const values = Object.values(row);
        if (values.length !== 1 || typeof values[0] !== 'string' || values[0].length > 2048) {
            throw new Error('Cleanup grant metadata is invalid.');
        }
        return grantPrivileges(values[0], database, expectedAccount);
    }).sort();
    const expected = ['USAGE', 'DELETE', ...RECEIPT_CLEANUP_SELECT_COLUMNS.map((column) => `SELECT:${column}`)].sort();
    if (privileges.length !== expected.length || privileges.some((value, index) => value !== expected[index])) {
        throw new Error('Cleanup account does not have exactly the reviewed receipt privileges.');
    }
}
