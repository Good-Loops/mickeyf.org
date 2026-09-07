import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import { AddressInfo } from 'node:net';
import test from 'node:test';
import express from 'express';
import type qs from 'qs';

// Resolve from each consumer so nested installs cannot hide a vulnerable copy.
for (const consumer of ['express', 'body-parser']) {
    const consumerRequire = createRequire(require.resolve(consumer));
    const parser = consumerRequire('qs') as typeof qs;

    test(`${consumer}: bracket-key comma arrays obey the configured limit`, () => {
        const options = { comma: true, arrayLimit: 3, throwOnLimitExceeded: true };
        assert.doesNotThrow(() => parser.parse('a[]=1,2,3', options));
        assert.throws(() => parser.parse('a[]=1,2,3,4', options), RangeError);
    });

    test(`${consumer}: untrusted constructor keys cannot break query serialization`, () => {
        const input = 'x%5Bconstructor%5D%5BisBuffer%5D=y';
        for (const options of [{ plainObjects: true }, { allowPrototypes: true }]) {
            const parsed = parser.parse(input, options);
            assert.equal(parser.stringify(parsed), input);
        }
    });
}

async function withQueryServer(run: (origin: string) => Promise<void>): Promise<void> {
    // app.ts uses this default Express parser; importing app.ts would start a DB connection.
    const app = express();
    app.get('/', (req, res) => res.json(req.query));
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const { port } = server.address() as AddressInfo;
    try {
        await run(`http://127.0.0.1:${port}`);
    } finally {
        await new Promise<void>((resolve, reject) => {
            server.close(error => error ? reject(error) : resolve());
        });
    }
}

test('default Express query parsing preserves encoding, duplicates and nested values', async () => {
    await withQueryServer(async origin => {
        const response = await fetch(
            `${origin}/?name=Player+One&symbol=%2B&tag=one&tag=two&filter[rank]=B&list=1,2`
        );
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), {
            name: 'Player One',
            symbol: '+',
            tag: ['one', 'two'],
            filter: { rank: 'B' },
            list: '1,2',
        });
    });
});

test('default Express query parsing retains parameter limits and prototype isolation', async () => {
    await withQueryServer(async origin => {
        const parameters = Array.from({ length: 1000 }, (_, index) => `key${index}=value`);
        const limited = await fetch(`${origin}/?${parameters.join('&')}&overflow=value`);
        assert.equal(limited.status, 200);
        const values = await limited.json();
        assert.equal(Object.keys(values).length, 1000);
        assert.equal(values.key999, 'value');
        assert.equal(Object.prototype.hasOwnProperty.call(values, 'overflow'), false);

        const pollution = await fetch(
            `${origin}/?__proto__[requestParsingPolluted]=yes&constructor[prototype][requestParsingPolluted]=yes&safe=ok`
        );
        assert.equal(pollution.status, 200);
        const parsed = await pollution.json();
        assert.equal(parsed.safe, 'ok');
        assert.equal(Object.prototype.hasOwnProperty.call(parsed, '__proto__'), false);
        assert.equal(Object.prototype.hasOwnProperty.call(Object.prototype, 'requestParsingPolluted'), false);
    });
});
