/**
 * Smoke test: two WebSocket clients create/join, exchange opaque payloads,
 * leave, and confirm partner notifications work.
 *
 * Empty sessions are retained for RECONNECT_GRACE_MS (60s), so we no longer
 * assert health.sessions === 0 immediately after leave.
 */
import WebSocket from 'ws';

const RELAY = process.env.RELAY_URL ?? 'ws://localhost:3001/ws';
const HEALTH = process.env.RELAY_HEALTH_URL ?? 'http://localhost:3001/health';

function onceMessage(ws) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout waiting for message')), 8000);
    ws.once('message', (data) => {
      clearTimeout(timer);
      resolve(JSON.parse(data.toString()));
    });
  });
}

function connect() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(RELAY);
    ws.once('open', () => resolve(ws));
    ws.once('error', reject);
  });
}

async function main() {
  const a = await connect();
  const sessionId = Date.now().toString(16).padStart(32, '0').slice(-32);

  a.send(JSON.stringify({ type: 'CREATE_SESSION', payload: { sessionId } }));
  const created = await onceMessage(a);
  if (created.type !== 'SESSION_CREATED')
    throw new Error(`expected SESSION_CREATED, got ${created.type}`);
  console.log('✓ session created', created.payload.sessionId);

  const b = await connect();
  const aPartner = onceMessage(a);
  const bPartner = onceMessage(b);
  b.send(JSON.stringify({ type: 'JOIN_SESSION', payload: { sessionId } }));
  const [ap, bp] = await Promise.all([aPartner, bPartner]);
  if (ap.type !== 'PARTNER_JOINED' || bp.type !== 'PARTNER_JOINED') {
    throw new Error('expected PARTNER_JOINED on both sides');
  }
  console.log('✓ partner joined');

  const bMsg = onceMessage(b);
  a.send(
    JSON.stringify({
      type: 'SEND_MESSAGE',
      payload: {
        message: { id: '1', encryptedPayload: 'opaque-ciphertext', timestamp: Date.now() },
      },
    }),
  );
  const received = await bMsg;
  if (received.type !== 'MESSAGE') throw new Error(`expected MESSAGE, got ${received.type}`);
  if (received.payload.message.encryptedPayload !== 'opaque-ciphertext') {
    throw new Error('payload mutated');
  }
  console.log('✓ opaque message forwarded');

  // Reject oversized / invalid frames without killing the connection
  const errWait = onceMessage(a);
  a.send('{not-json');
  const badJson = await errWait;
  if (badJson.type !== 'ERROR') throw new Error('expected ERROR for invalid JSON');
  console.log('✓ invalid JSON rejected');

  const aLeft = onceMessage(a);
  b.send(JSON.stringify({ type: 'LEAVE_SESSION', payload: { sessionId } }));
  const left = await aLeft;
  if (left.type !== 'PARTNER_LEFT') throw new Error(`expected PARTNER_LEFT, got ${left.type}`);
  console.log('✓ partner left');

  a.send(JSON.stringify({ type: 'LEAVE_SESSION', payload: { sessionId } }));
  await new Promise((r) => setTimeout(r, 200));

  const health = await fetch(HEALTH).then((r) => r.json());
  if (health.status !== 'ok') throw new Error(`expected health ok, got ${JSON.stringify(health)}`);
  console.log('✓ health ok (empty sessions may linger for reconnect grace)');

  a.close();
  b.close();
  console.log('\nRelay smoke test passed.');
}

main().catch((err) => {
  console.error('FAIL', err);
  process.exit(1);
});
