# Zephyr — AI-Powered Lead Generation & CRM Platform

**Live URL:** https://zephyr-platform-liart.vercel.app  
**Backend:** https://zephyr-backend-43vu.onrender.com

---

## What is Zephyr?

Zephyr is an intelligent CRM platform built for **Pixel Works** that combines:
- **AI-powered lead discovery** — automatically finds potential clients from the web
- **Multi-agent AI analysis** — scores and qualifies leads using advanced AI (OpenRouter DeepSeek R1 + Groq Llama)
- **Automated pitch generation** — creates personalized email templates and call scripts
- **Complete CRM workflow** — manage leads from discovery to closed deal

---

## Login Credentials

### Production (Live Site)

| Role | Email | Password | Access Level |
|------|-------|----------|--------------|
| **Admin** | `admin@pixelworks.com` | `Admin@1234` | Full system access + analytics |
| Employee 1 | `emp1@pixelworks.com` | `Employee@1234` | Lead management only |
| Employee 2 | `emp2@pixelworks.com` | `Employee@1234` | Lead management only |

**First-time login note:** The backend may take 30–60 seconds to respond on the first request after idle (Render free tier spins down after 15 min). Subsequent requests are instant.

---

## User Roles & What They Can Do

### 👨‍💼 ADMIN Role

**Access:** Everything

#### Dashboard
- View real-time **overview metrics**: total leads, active leads, conversion rate, revenue pipeline
- See **recent activities** across all employees
- Monitor **AI discovery pipeline** status and usage stats
- Track **team performance** with charts and graphs

#### Leads Management
- **View all leads** in the system (across all employees)
- **Create leads** manually or bulk import from CSV
- **Edit/delete any lead** regardless of assignment
- **Assign leads** to employees
- Run **AI analysis** on leads (scores them 0–10, generates pitch)
- Change lead **status** through the pipeline: NEW_LEAD → INTERESTED → CONTACTED → MEETING_SCHEDULED → PROPOSAL_SENT → NEGOTIATION → CLOSED_WON / CLOSED_LOST
- View **AI-generated pitches** (email templates + call scripts)
- View complete **activity history** for each lead

#### AI Discovery Pipeline
- **Trigger automated lead discovery** (scrapes web using Serper.dev + Google APIs)
- Configure **discovery targets** (industry, region, business type)
- View **pipeline runs** and their results
- Monitor **API usage** (Serper, Hunter.io, Apollo.io)

#### Team Management
- View **all employees** and their performance
- See **leads assigned** to each employee
- Track **conversion rates** by employee
- View **activity logs** for each team member

#### Reports & Analytics
- **Daily/Weekly/Monthly reports** with charts
- **Pipeline funnel** visualization (leads at each stage)
- **Source breakdown** (Manual, AI Discovered, CSV Import)
- **Follow-up tracking** (upcoming tasks, overdue items)
- **Revenue forecasting** based on deal values

#### Settings (Future)
- Manage **AI providers** and API keys
- Configure **email templates**
- Set **discovery schedules**
- Manage **user permissions**

---

### 👔 EMPLOYEE Role

**Access:** Own leads + basic CRM

#### My Dashboard
- View **my leads** and their statuses
- See **my follow-ups** (today, upcoming, overdue)
- Track **my performance** (conversion rate, closed deals)
- View **my recent activities**

#### My Leads
- **View leads assigned to me** only (cannot see other employees' leads)
- **Edit leads** I'm assigned to (update contact info, notes, status)
- **Cannot create new leads** (admin does this)
- **Cannot delete leads**
- **Cannot assign/reassign leads**
- Move leads through the **sales pipeline** (update status)
- Request **AI analysis** for my leads (admin may restrict this)

#### Activities
- **Add notes** to my leads
- Log **emails, calls, meetings** with timestamps
- Mark **status changes** (automatically logged)
- View **complete activity history** for my leads

#### Follow-ups
- **Create follow-up reminders** for my leads
- Set **due dates and notes**
- Mark follow-ups as **done**
- View **upcoming tasks** sorted by date
- Get **overdue reminders** (highlighted in red)

#### Limited Visibility
- **Cannot see:** other employees' leads, admin analytics, system settings
- **Can only:** manage assigned leads and track own performance

---

## How Zephyr Works (Step-by-Step)

### 1. Lead Discovery (Automated AI Pipeline)

**Who triggers:** Admin  
**What it does:**

1. **Web scraping** — Uses Serper.dev (Google Search API) to find companies matching your target profile:
   - Digital agencies
   - E-commerce stores
   - Startups
   - SaaS companies
   - Local businesses

2. **Data enrichment** — For each discovered company:
   - Extracts website URL and basic info
   - Uses **Hunter.io** to find email addresses
   - Uses **Apollo.io** to enrich contact details
   - Scrapes public contact info from websites

3. **AI analysis** — Each lead goes through a **multi-agent AI pipeline**:
   - **Agent 1 (Analyzer):** Analyzes the company's website, industry, size, needs
   - **Agent 2 (Scorer):** Scores lead quality 0–10 based on fit for Pixel Works
   - **Agent 3 (Reviewer):** Reviews the analysis for accuracy
   - **Agent 4 (Pitch Generator):** Creates personalized cold email + follow-up email + call script

4. **Auto-assignment** — Admin assigns discovered leads to employees

**Time:** 20–40 seconds per lead (AI processing)  
**Cost:** Free tier limits (2500 Serper queries, 50 Hunter searches, limited Apollo)

---

### 2. Manual Lead Creation

**Who can:** Admin  
**How:**

1. Go to **Leads → Add Lead**
2. Fill in:
   - Company name (required)
   - Website URL
   - Industry
   - Country
   - Contact name
   - Email/phone
   - Initial notes
3. Assign to an employee
4. Lead appears in employee's "My Leads" list

**Bulk Import:**
- Upload CSV file with columns: `Company Name, Website, Industry, Country, Contact Name, Email, Phone`
- System validates and imports in batch
- Auto-assigns based on round-robin or manual selection

---

### 3. Lead Management Workflow (Employee)

#### Step 1: Receive Assignment
- Employee logs in and sees **new lead** in "My Leads" with status `NEW_LEAD`
- Review AI-generated analysis (if available):
  - **AI Score** (0–10, higher = better fit)
  - **Why this is a good prospect**
  - **Recommended services**
  - **Email template** (cold email + follow-up)
  - **Call script** (opening, questions, value prop, objection handlers, closing)

#### Step 2: Initial Contact
- Click **"Add Activity"** and log the outreach:
  - Type: Email / Call / LinkedIn
  - Content: Brief summary of what was said/sent
  - Outcome: Response / No response / Left voicemail
- Use the **AI-generated cold email** as a template (copy/paste, personalize)
- Update status to `INTERESTED` if they respond positively

#### Step 3: Follow-up
- If no response, create a **Follow-up** task:
  - Set date: 3 days from now
  - Note: "Send follow-up email"
- System shows **upcoming follow-ups** on dashboard
- When the date arrives, task appears in "Due Today" section
- Execute follow-up, log as activity, mark task as done

#### Step 4: Qualify & Meet
- If interested, update status to `CONTACTED`
- Schedule a discovery call/meeting
- Create **Meeting** activity with date/time
- Update status to `MEETING_SCHEDULED`
- Use the **AI call script** as a guide:
  - Opening: Introduction + value prop
  - Discovery questions: Budget, timeline, pain points
  - Objection handlers: Pre-written responses to common objections
  - Closing: Next steps

#### Step 5: Proposal
- After meeting, update status to `PROPOSAL_SENT`
- Attach proposal document (future feature)
- Create follow-up task: "Check on proposal decision"

#### Step 6: Negotiation & Close
- If they want to proceed: `NEGOTIATION`
- Final pricing/terms discussion
- Update status to `CLOSED_WON` when deal is signed
- Or `CLOSED_LOST` if they decline (add note with reason)

---

### 4. Admin Monitoring & Analytics

**Daily routine:**

1. **Check Dashboard** — Quick overview of team performance
2. **Review pipeline** — Are leads moving through stages?
3. **Check AI usage** — Monitor API quota (Serper: 2500/month, Hunter: 50/month)
4. **Trigger discovery** — Run weekly/bi-weekly to keep pipeline full
5. **Reassign stale leads** — If employee hasn't touched a lead in 7 days, reassign

**Weekly reports:**
- **Conversion funnel** — How many leads at each stage?
- **Source analysis** — Which discovery method (AI vs Manual vs CSV) converts best?
- **Employee performance** — Who has the highest close rate?
- **Follow-up adherence** — Are employees completing follow-ups on time?

**Monthly reviews:**
- **Revenue pipeline** — Total deal value in `NEGOTIATION` + `PROPOSAL_SENT`
- **Closed deals** — Total won vs lost
- **AI effectiveness** — Do high-AI-score leads close more often? (validate the AI)

---

## Key Features Explained

### 🤖 AI Multi-Agent Analysis

**What it does:** Evaluates if a lead is a good fit for Pixel Works using multiple AI models working together.

**The process:**
1. **Lead Analyzer** (DeepSeek R1 via OpenRouter):
   - Analyzes company website, industry, size
   - Identifies tech stack and pain points
   - Estimates budget and timeline

2. **Lead Scorer** (DeepSeek R1):
   - Scores 0–10 based on:
     - Budget likelihood
     - Service fit (web design, app dev, branding, etc.)
     - Decision-making authority
     - Urgency
   - Provides reasoning for the score

3. **Reviewer Agent** (Groq Llama 3.3 70B):
   - Reviews analysis for accuracy
   - Adjusts score if needed
   - Adds second opinion

4. **Pitch Generator** (DeepSeek R1):
   - Writes **cold email** (subject + body)
   - Writes **follow-up email** (if no response)
   - Writes **call script** with:
     - Opening line
     - 5 discovery questions
     - Value proposition
     - Objection handlers (3 common objections)
     - Closing statement

**Cost per lead:** ~$0.01–0.03 in API costs (OpenRouter + Groq free tiers cover 100s of leads/month)

**Time per lead:** 20–40 seconds

**Accuracy:** Admin should review AI scores initially to calibrate — AI learns patterns over time.

---

### 📊 Lead Statuses (Pipeline Stages)

| Status | Meaning | Typical Duration | Next Action |
|--------|---------|------------------|-------------|
| **NEW_LEAD** | Just discovered/imported | 0–1 day | Review AI analysis, initial outreach |
| **INTERESTED** | Responded positively | 1–3 days | Schedule discovery call |
| **CONTACTED** | Had initial conversation | 3–7 days | Qualify needs, set meeting |
| **MEETING_SCHEDULED** | Call/meeting booked | 1–7 days | Prepare, conduct meeting |
| **PROPOSAL_SENT** | Quote/proposal delivered | 3–14 days | Follow up, answer questions |
| **NEGOTIATION** | Discussing terms/pricing | 7–30 days | Finalize contract |
| **CLOSED_WON** | Deal signed ✅ | Terminal | Celebrate, onboard client |
| **CLOSED_LOST** | Deal fell through ❌ | Terminal | Document reason, move on |

**Pipeline velocity:** Aim to move leads forward every 3–5 days to avoid stagnation.

---

### 📧 Activities (Interaction Log)

Every touchpoint with a lead is logged as an **Activity**:

| Type | When to use | Example |
|------|-------------|---------|
| **NOTE** | Internal observation | "Website is outdated, good candidate for redesign" |
| **EMAIL** | Sent/received email | "Sent cold email using AI template" |
| **CALL** | Phone conversation | "Called, left voicemail. Will follow up via email." |
| **MEETING** | Video/in-person meeting | "Discovery call completed. Budget: $50k, timeline: Q3" |
| **STATUS_CHANGE** | Pipeline movement | "Moved to PROPOSAL_SENT after sending quote" |

**Why it matters:**
- Complete **audit trail** of every interaction
- Helps with **handoffs** (if lead is reassigned)
- **Analytics** (which activities correlate with wins?)
- **Training** (new employees see what works)

---

### 📅 Follow-ups (Task Management)

**Purpose:** Never let a lead go cold.

**How it works:**
1. Employee creates a follow-up task:
   - **Lead:** Which lead to follow up with
   - **Date:** When to do it
   - **Note:** What needs to be done
2. System shows tasks in 3 buckets:
   - **Overdue** (past due date) — Red, urgent
   - **Today** (due today) — Yellow, priority
   - **Upcoming** (future) — Green, plan ahead
3. When employee completes the task:
   - Mark as **Done**
   - Log the activity (what was actually done)
   - Create a new follow-up if needed

**Best practices:**
- **3–5–7 rule:** Follow up after 3 days (no response), 5 days (still no response), 7 days (final attempt)
- **Always log:** Even if "no response," log it so admin knows you tried
- **Persistence wins:** Average sale takes 5–7 touchpoints

---

### 🔍 Discovery Sources

| Source | How it works | Best for |
|--------|--------------|----------|
| **AI_DISCOVERED** | Automated web scraping + AI analysis | Scale, finding hidden opportunities |
| **MANUAL** | Admin/employee manually adds lead | Targeted outreach, referrals |
| **CSV_IMPORT** | Bulk upload from existing list | Migrating from another CRM |

**Recommended mix:** 70% AI Discovered (volume) + 30% Manual (quality).

---

### 🎯 AI Discovery Configuration (Admin)

**What you control:**

1. **Target Types:**
   - Agency (marketing, design, branding)
   - E-commerce (online stores, Shopify, WooCommerce)
   - Startup (tech, SaaS, mobile apps)
   - Local (restaurants, salons, gyms)
   - SaaS (B2B software companies)

2. **Regions:**
   - India, UAE, UK, USA, Singapore, Australia
   - Or no filter (global search)

3. **Frequency:**
   - Run manually when pipeline is low
   - Or set up a weekly cron (future feature)

4. **Limits:**
   - Max leads per run (default: 50)
   - Skip if < X leads in pipeline (avoid duplicates)

**API Quotas (Free Tiers):**
- **Serper:** 2,500 searches/month (~100 leads/day if run daily)
- **Hunter.io:** 50 searches/month (save for high-priority leads)
- **Apollo.io:** Limited free tier (use sparingly)

**Strategy:** Run discovery weekly (Sundays), generate 50–100 leads, team qualifies during the week.

---

## Technical Stack (For Reference)

### Frontend
- **Framework:** React 18 + Vite
- **UI:** Tailwind CSS + shadcn/ui components
- **State:** Zustand + React Query
- **Charts:** Recharts
- **Hosting:** Vercel (zero cold starts, edge network)

### Backend
- **Runtime:** Node.js 22 + Express
- **Database:** PostgreSQL (Neon serverless)
- **ORM:** Prisma
- **Auth:** JWT (7-day expiry)
- **Hosting:** Render (free tier, ~30s cold start after 15 min idle)

### AI Engine
- **Primary AI (Agent 1, 2, 4):** OpenRouter → DeepSeek R1
- **Secondary AI (Agent 3):** Groq → Llama 3.3 70B
- **Architecture:** Multi-agent pipeline with orchestrator

### Scraper
- **Search:** Serper.dev (Google Search API)
- **Email finder:** Hunter.io
- **Enrichment:** Apollo.io
- **Browser automation:** Playwright (public contact scraping)

### APIs Used
- Serper.dev (web search)
- Hunter.io (email verification)
- Apollo.io (B2B data enrichment)
- OpenRouter (AI inference)
- Groq (AI inference)

---

## Common Issues & Solutions

### 1. "Backend is slow to load" (30–60s delay)
**Cause:** Render free tier spins down after 15 min idle.  
**Solution:**
- **Accept it:** First request is slow, rest are fast.
- **Keep-alive:** Set up a cron (cron-job.org) to ping `https://zephyr-backend-43vu.onrender.com/api/health` every 10 minutes.
- **Upgrade:** Render paid tier ($7/mo) removes cold starts.
- **Migrate:** Move to Cloud Run (1–2s cold starts, still free).

### 2. "I can't see another employee's leads"
**Cause:** Working as intended — employees can only see assigned leads.  
**Solution:** Admin must assign the lead to you, or log in as admin to view all.

### 3. "AI analysis failed"
**Cause:** API quota exceeded, or API key invalid.  
**Solution:**
- Check **AI Pipeline → Usage** for quota status.
- Admin: Verify API keys in Render environment variables.
- Wait until next month if free quota exhausted.

### 4. "Email/phone not found for discovered leads"
**Cause:** Hunter.io/Apollo.io free tier limits, or info not publicly available.  
**Solution:**
- Manually research the company's contact page.
- Use LinkedIn to find the right person.
- Focus on leads with website URLs (higher success rate).

### 5. "Follow-up notification not working"
**Cause:** No email notification system implemented yet (future feature).  
**Solution:**
- Check dashboard daily for "Due Today" tasks.
- Set personal reminders in your calendar.

---

## Best Practices

### For Employees

1. **Log everything:** Every call, email, meeting. If it's not logged, it didn't happen.
2. **Move leads forward:** Aim to update status every 3–5 days.
3. **Use AI scripts as templates:** Personalize them, don't copy/paste blindly.
4. **Complete follow-ups:** Overdue tasks hurt your performance score.
5. **Ask for help:** If a lead is stuck, ask admin to reassign or get coaching.

### For Admins

1. **Review AI scores weekly:** Are high-score leads actually converting? Adjust strategy.
2. **Monitor pipeline health:** If too many leads stuck in one stage, investigate.
3. **Rotate assignments:** Don't overload one employee while others sit idle.
4. **Run discovery regularly:** Keep pipeline full (50–100 active leads per employee).
5. **Celebrate wins:** When someone closes a deal, acknowledge it in team meeting.

---

## Future Roadmap (Planned Features)

### Short-term (Next 1–3 months)
- ✅ Core CRM (done)
- ✅ AI analysis pipeline (done)
- ✅ Discovery scraper (done)
- 🔄 Email notifications (follow-up reminders)
- 🔄 Slack integration (daily digest)
- 🔄 Mobile-responsive UI polish

### Medium-term (3–6 months)
- 📧 **Built-in email sending** (SendGrid integration) — send emails directly from Zephyr
- 📞 **VoIP integration** (Twilio) — log calls automatically
- 🤖 **AI discussion mode** — Chat with AI about a lead, get strategy advice
- 📊 **Custom reports** — Build your own charts and filters
- 🔐 **Role-based permissions** — Finer control (e.g., "can request AI analysis" permission)

### Long-term (6–12 months)
- 🌐 **Multi-language support** — Localize for MENA, Europe, Asia
- 💰 **Revenue forecasting** — Predictive analytics on deal close likelihood
- 🧠 **AI continuous learning** — AI learns from closed won/lost patterns, improves scoring
- 📦 **Integrations** — Zapier, HubSpot, Salesforce import/export
- 📱 **Native mobile app** — iOS/Android for on-the-go CRM

---

## Support & Resources

### Documentation
- **This file** — Covers all user workflows
- **README.md** — Technical setup and deployment
- **API Docs** — (Future) OpenAPI/Swagger docs for backend endpoints

### Getting Help
1. **Ask your admin** — They have full system visibility
2. **Check activity logs** — See what successful employees are doing
3. **Review AI analysis** — Learn from AI recommendations
4. **GitHub Issues** — Report bugs at https://github.com/pixelworks121/Zephyr/issues

### Admin Contact
- **Shresth Chauhan** — System administrator
- Email: admin@pixelworks.com (in-app)

---

## Quick Reference Cards

### Employee Daily Checklist
- [ ] Check **Due Today** follow-ups
- [ ] Review **new leads** assigned to me
- [ ] Log activities for yesterday's calls/emails
- [ ] Move at least 1 lead to next status
- [ ] Create follow-ups for any leads I contacted today

### Admin Weekly Checklist
- [ ] Run **discovery pipeline** (Sundays)
- [ ] Review **pipeline funnel** — any bottlenecks?
- [ ] Check **API usage** — approaching limits?
- [ ] **Reassign stale leads** (inactive >7 days)
- [ ] Review **team performance** — coach if needed
- [ ] Plan next week's targets

### Lead Velocity Targets
- **NEW_LEAD → INTERESTED:** 0–3 days
- **INTERESTED → MEETING_SCHEDULED:** 3–7 days
- **MEETING_SCHEDULED → PROPOSAL_SENT:** 1–7 days
- **PROPOSAL_SENT → NEGOTIATION:** 3–14 days
- **NEGOTIATION → CLOSED_WON:** 7–30 days
- **Total cycle time:** 14–61 days (average: ~30 days)

---

## Metrics That Matter

### For Employees
- **Response rate:** % of outreach that gets a reply (target: >20%)
- **Meeting-to-proposal rate:** % of meetings that lead to proposal (target: >60%)
- **Close rate:** % of proposals that close (target: >30%)
- **Average deal size:** Revenue per closed deal
- **Cycle time:** Days from assignment to close (lower = better)

### For Admins
- **Pipeline coverage:** # of active leads per employee (target: 20–30)
- **Conversion rate:** % of NEW_LEAD that become CLOSED_WON (target: >10%)
- **AI accuracy:** Correlation between AI score and actual close rate
- **Discovery ROI:** Cost per discovered lead that closes
- **Team utilization:** % of employees with full pipeline

---

**Last updated:** June 26, 2026  
**Version:** 1.0.0  
**Platform:** Zephyr by Pixel Works
