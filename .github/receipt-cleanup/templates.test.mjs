import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (name) => JSON.parse(readFileSync(new URL(name, import.meta.url), 'utf8'));

test('job ships disabled with pinned-target placeholders and dedicated identity/credentials', () => {
    const job = read('./cloud-run-job.template.json');
    assert.equal(job.kind, 'Job');
    assert.equal(job.metadata.namespace, '1012884798546');
    const execution = job.spec.template;
    assert.equal(execution.metadata.annotations['run.googleapis.com/cloudsql-instances'],
        'noted-reef-387021:us-central1:cms-mickeyf');
    assert.equal(execution.spec.taskCount, 1);
    assert.equal(execution.spec.parallelism, 1);
    const task = execution.spec.template.spec;
    assert.equal(Number(task.timeoutSeconds), 180);
    assert.equal(task.maxRetries, 0);
    assert.equal(task.serviceAccountName, 'mickeyf-receipt-cleanup@noted-reef-387021.iam.gserviceaccount.com');
    const [container] = task.containers;
    assert.equal(task.containers.length, 1);
    assert.deepEqual(container.command, ['node']);
    assert.deepEqual(container.args, ['dist/submission-receipt-cleanup.min.js']);
    assert.match(container.image, /@sha256:REVIEWED_DIGEST$/);
    const env = Object.fromEntries(container.env.map((entry) => [entry.name, entry]));
    assert.equal(env.RECEIPT_CLEANUP_ENABLED.value, 'false');
    assert.equal(env.RECEIPT_CLEANUP_DB_USER.value, 'receipt_cleanup');
    assert.equal(env.RECEIPT_CLEANUP_EXPECTED_ACCOUNT.value, 'receipt_cleanup@cloudsqlproxy~%');
    assert.deepEqual(env.RECEIPT_CLEANUP_DB_PASS.valueFrom.secretKeyRef, {
        name: 'mickeyf-receipt-cleanup-db-password', key: 'REVIEWED_SECRET_VERSION',
    });
    assert.equal(env.RECEIPT_CLEANUP_DB_PASS.value, undefined);
    assert.ok(Object.keys(env).every((name) => name === 'NODE_ENV' || name.startsWith('RECEIPT_CLEANUP_')));
    assert.equal(container.ports, undefined);
});

test('scheduler calls the job hourly with scoped separate OAuth identity and no overrides', () => {
    const scheduler = read('./cloud-scheduler-job.template.json');
    assert.equal(scheduler.schedule, '0 * * * *');
    assert.equal(scheduler.timeZone, 'Etc/UTC');
    assert.equal(scheduler.retryConfig.retryCount, 0);
    assert.equal(scheduler.httpTarget.httpMethod, 'POST');
    assert.equal(scheduler.httpTarget.uri,
        'https://run.googleapis.com/v2/projects/noted-reef-387021/locations/us-central1/jobs/mickeyf-submission-receipt-cleanup:run');
    assert.deepEqual(JSON.parse(Buffer.from(scheduler.httpTarget.body, 'base64').toString('utf8')), {});
    assert.equal(scheduler.httpTarget.oauthToken.serviceAccountEmail,
        'mickeyf-receipt-scheduler@noted-reef-387021.iam.gserviceaccount.com');
    assert.equal(scheduler.httpTarget.oauthToken.scope, 'https://www.googleapis.com/auth/cloud-platform');
    assert.equal(scheduler.httpTarget.oidcToken, undefined);
});
