/**
 * Smoke test: two WebSocket clients create/join, exchange opaque payloads,
 * leave, and confirm the session is destroyed on the relay.
 */
import WebSocket from 'ws';

const RELAY = process.env.RELAY_URL ?? 'ws://localhost:3001/ws';

function onceMessage(ws) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout waiting for message')), 5000);
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
  const sessionId = 'test' + Date.now().toString(16);

  a.send(JSON.stringify({ type: 'CREATE_SESSION', payload: { sessionId } }));
  const created = await onceMessage(a);
  if (created.type !== 'SESSION_CREATED') throw new Error(`expected SESSION_CREATED, got ${created.type}`);
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

  const aLeft = onceMessage(a);
  b.send(JSON.stringify({ type: 'LEAVE_SESSION', payload: { sessionId } }));
  const left = await aLeft;
  if (left.type !== 'PARTNER_LEFT') throw new Error(`expected PARTNER_LEFT, got ${left.type}`);
  console.log('✓ partner left');

  a.send(JSON.stringify({ type: 'LEAVE_SESSION', payload: { sessionId } }));
  await new Promise((r) => setTimeout(r, 200));

  const health = await fetch('http://localhost:3001/health').then((r) => r.json());
  if (health.sessions !== 0) throw new Error(`expected 0 sessions, got ${health.sessions}`);
  console.log('✓ session destroyed (sessions=0)');

  a.close();
  b.close();
  console.log('\nRelay smoke test passed.');
}

main().catch((err) => {
  console.error('FAIL', err);
  process.exit(1);
});
