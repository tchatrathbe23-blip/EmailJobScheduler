const axios = require('./backend/node_modules/axios');

const API = 'http://localhost:5000/api';

async function testRestart() {
  console.log('\n--- 🔄 Testing Restart Survival & Idempotency ---');
  const futureTime = new Date(Date.now() + 15000).toISOString();

  const res = await axios.post(`${API}/emails/schedule`, {
    senderEmail: 'restart-test@reachinbox.test',
    recipientEmail: 'restart-lead@company.com',
    subject: 'Server Restart Resilience Test',
    body: 'This email was scheduled before a simulated server reboot and dispatched seamlessly on time after reboot.',
    scheduledAt: futureTime,
    delayBetweenEmails: 1000,
    hourlyLimit: 50,
  });

  console.log('✅ Scheduled email for future execution (15s):', res.data.email.id);
  console.log('Ready to test restart scenario.');
}

testRestart().catch(console.error);
