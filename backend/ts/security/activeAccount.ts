import { Pool, RowDataPacket } from 'mysql2/promise';

/** A signed token proves issuance, not that its account still exists. Never cache this lookup. */
export async function readActiveAccount(database: Pick<Pool, 'query'>, userId: number) {
    const [rows] = await database.query<Array<RowDataPacket & { userName: string }>>(
        {
            sql: 'SELECT user_name AS userName FROM users WHERE user_id = ? LIMIT 1',
            timeout: 10_000,
        },
        [userId]
    );
    return rows[0] ? { userName: rows[0].userName } : null;
}
