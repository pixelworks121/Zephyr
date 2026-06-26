const bcrypt = require('bcryptjs');
const prisma = require('../src/utils/prismaClient');

async function main() {
  const hash = (pw) => bcrypt.hashSync(pw, 10);

  // Users
  const admin = await prisma.user.upsert({
    where: { email: 'admin@pixelworks.com' },
    update: {},
    create: { name: 'Shresth Chauhan', email: 'admin@pixelworks.com', password: hash('Admin@1234'), role: 'ADMIN' },
  });
  const emp1 = await prisma.user.upsert({
    where: { email: 'emp1@pixelworks.com' },
    update: {},
    create: { name: 'Employee One', email: 'emp1@pixelworks.com', password: hash('Employee@1234'), role: 'EMPLOYEE' },
  });
  const emp2 = await prisma.user.upsert({
    where: { email: 'emp2@pixelworks.com' },
    update: {},
    create: { name: 'Employee Two', email: 'emp2@pixelworks.com', password: hash('Employee@1234'), role: 'EMPLOYEE' },
  });

  // Leads
  const leads = await Promise.all([
    prisma.lead.create({ data: { companyName: 'TechCorp India', status: 'NEW_LEAD', source: 'MANUAL', country: 'India', industry: 'Technology', assignedToId: emp1.id } }),
    prisma.lead.create({ data: { companyName: 'StyleStore Dubai', status: 'INTERESTED', source: 'AI_DISCOVERED', country: 'UAE', industry: 'E-Commerce', aiScore: 8.5, assignedToId: emp1.id } }),
    prisma.lead.create({ data: { companyName: 'GrowthAgency UK', status: 'CONTACTED', source: 'MANUAL', country: 'UK', industry: 'Agency', assignedToId: emp2.id } }),
    prisma.lead.create({ data: { companyName: 'FoodieApp Singapore', status: 'MEETING_SCHEDULED', source: 'AI_DISCOVERED', country: 'Singapore', industry: 'Food & Beverage', aiScore: 7.2, assignedToId: emp2.id } }),
    prisma.lead.create({ data: { companyName: 'LocalBiz Australia', status: 'CLOSED_WON', source: 'CSV_IMPORT', country: 'Australia', industry: 'Retail', assignedToId: emp1.id } }),
  ]);

  // Activities (1-2 per lead)
  const activities = await Promise.all([
    prisma.activity.create({ data: { leadId: leads[0].id, userId: emp1.id, type: 'NOTE', content: 'Initial research completed' } }),
    prisma.activity.create({ data: { leadId: leads[1].id, userId: emp1.id, type: 'EMAIL', content: 'Sent introductory email' } }),
    prisma.activity.create({ data: { leadId: leads[1].id, userId: emp1.id, type: 'CALL', content: 'Follow-up call — interested in web redesign' } }),
    prisma.activity.create({ data: { leadId: leads[2].id, userId: emp2.id, type: 'EMAIL', content: 'Reached out via LinkedIn' } }),
    prisma.activity.create({ data: { leadId: leads[3].id, userId: emp2.id, type: 'MEETING', content: 'Discovery call scheduled for next week' } }),
    prisma.activity.create({ data: { leadId: leads[3].id, userId: emp2.id, type: 'NOTE', content: 'They need a mobile app for food delivery' } }),
    prisma.activity.create({ data: { leadId: leads[4].id, userId: emp1.id, type: 'STATUS_CHANGE', content: 'Status changed from Negotiation to Closed Won' } }),
  ]);

  // Follow-ups (future dates)
  const tomorrow = new Date(Date.now() + 86400000);
  const nextWeek = new Date(Date.now() + 7 * 86400000);
  const followUps = await Promise.all([
    prisma.followUp.create({ data: { leadId: leads[1].id, userId: emp1.id, scheduledAt: tomorrow, note: 'Send proposal document' } }),
    prisma.followUp.create({ data: { leadId: leads[3].id, userId: emp2.id, scheduledAt: nextWeek, note: 'Confirm meeting agenda' } }),
  ]);

  console.log(`Seed complete:
  Users: 3 (1 admin + 2 employees)
  Leads: ${leads.length}
  Activities: ${activities.length}
  Follow-ups: ${followUps.length}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
