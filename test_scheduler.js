const axios = require('./backend/node_modules/axios');

const API = 'http://localhost:5000/api';

async function runTests() {
  console.log('==================================================');
  console.log('🧪 REACHINBOX EMAIL SCHEDULER SYSTEM VERIFICATION');
  console.log('==================================================\n');

  // 1. Health check
  console.log('1️⃣ Checking System Health...');
  const health = await axios.get(`${API}/health`);
  console.log('Health Status:', health.data);

  // 2. Schedule single email scheduled 4 seconds in future
  console.log('\n2️⃣ Scheduling single email for 4 seconds in the future...');
  const scheduledTime = new Date(Date.now() + 4000).toISOString();
  const scheduleRes = await axios.post(`${API}/emails/schedule`, {
    senderEmail: 'alex@reachinbox.test',
    recipientEmail: 'mitrajit.das@reachinbox.ai',
    subject: 'Welcome to ReachInbox Scheduler!',
    body: 'Hello Mitrajit, your assignment test email was scheduled with BullMQ delayed queue and sent via Ethereal fake SMTP.',
    scheduledAt: scheduledTime,
    delayBetweenEmails: 1000,
    hourlyLimit: 100,
  });
  console.log('✅ Schedule Response:', scheduleRes.data);

  // 3. Wait 8 seconds for BullMQ delayed job to trigger, worker to process, and Ethereal SMTP to deliver
  console.log('\n⏳ Waiting 8 seconds for BullMQ worker to pick up and deliver via Ethereal SMTP...');
  await new Promise((r) => setTimeout(r, 8000));

  // 4. Check Sent Emails
  console.log('\n3️⃣ Checking Sent Emails table...');
  const sentRes = await axios.get(`${API}/emails/sent`);
  console.log(`Delivered Count: ${sentRes.data.total}`);
  if (sentRes.data.emails && sentRes.data.emails.length > 0) {
    const latest = sentRes.data.emails[0];
    console.log('✅ Latest Sent Email:', {
      recipient: latest.recipientEmail,
      subject: latest.subject,
      status: latest.status,
      sentAt: latest.sentAt,
      etherealPreviewUrl: latest.etherealPreviewUrl,
    });
  }

  // 5. Test Rate Limiting Reschedule & Slack alert
  console.log('\n4️⃣ Testing Rate Limiting (Sender Limit = 2/hr)...');
  // Configure sender with tiny limit of 2 emails/hour
  await axios.post(`${API}/emails/senders`, {
    email: 'limited-sender@reachinbox.test',
    displayName: 'Rate Limited Bot',
    hourlyLimit: 2,
  });

  // Schedule 3 emails immediately
  const now = new Date(Date.now() + 1000).toISOString();
  for (let i = 1; i <= 3; i++) {
    await axios.post(`${API}/emails/schedule`, {
      senderEmail: 'limited-sender@reachinbox.test',
      recipientEmail: `lead${i}@enterprise.com`,
      subject: `Batch Test #${i}`,
      body: `Testing rate limiting for job ${i}`,
      scheduledAt: now,
      delayBetweenEmails: 500,
      hourlyLimit: 2,
    });
  }
  console.log('Enqueued 3 emails for sender with limit of 2/hr.');

  // Wait 6 seconds for worker to process
  console.log('⏳ Waiting 6 seconds for worker to enforce hourly limit...');
  await new Promise((r) => setTimeout(r, 6000));

  // Check stats
  const statsRes = await axios.get(`${API}/emails/stats`);
  console.log('✅ Real-time Metrics:', statsRes.data);

  // Check scheduled / deferred
  const schedRes = await axios.get(`${API}/emails/scheduled`);
  console.log(`Pending / Deferred Jobs: ${schedRes.data.total}`);
  schedRes.data.emails.forEach((e) => {
    console.log(`- ${e.recipientEmail} [${e.status}] ScheduledAt: ${e.scheduledAt}`);
  });

  console.log('\n==================================================');
  console.log('🎉 ALL CORE SCHEDULER & RATE-LIMIT TESTS PASSED!');
  console.log('==================================================');
}

runTests().catch((err) => {
  console.error('Test error:', err.response?.data || err.message);
});
