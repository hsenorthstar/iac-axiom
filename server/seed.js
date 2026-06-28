/* Seed the real database. Idempotent: `node server/seed.js` fills only if empty;
   `node server/seed.js --reset` wipes and reseeds. */
import { db, migrate } from "./db.js";

const days = (d) => new Date(Date.now() + d * 86400000).toISOString();
const J = JSON.stringify;

export function seed({ reset = false } = {}) {
  migrate();
  if (reset) {
    for (const t of ["config","users","companies","projects","bids","engagements","milestones","deliverables","earnings_ledger","recognition_ledger","jobs","courses","enrollments","posts","threads","messages","notifications","awards","coi_records","payouts","admin_actions","referrals"]) {
      db.prepare(`DELETE FROM ${t}`).run();
    }
  }
  const count = db.prepare("SELECT COUNT(*) c FROM users").get().c;
  if (count > 0 && !reset) return;

  const cfg = db.prepare("INSERT OR REPLACE INTO config (key,value) VALUES (?,?)");
  cfg.run("payoutsEnabled", "false");
  cfg.run("pointsOnlyMode", "true");
  cfg.run("razorpayKeyId", "rzp_test_IAC_demo");
  cfg.run("currency", "INR");

  const U = db.prepare(`INSERT INTO users (id,handle,name,email,role,title,region,verified,powerScore,xp,level,avatar,bio,badges,skills,certs,reviews)
    VALUES (@id,@handle,@name,@email,@role,@title,@region,@verified,@powerScore,@xp,@level,@avatar,@bio,@badges,@skills,@certs,@reviews)`);
  const users = [
    { id:"u_arpan", handle:"arpan", name:"Arpan Aggarwal", email:"hsenorthstar@gmail.com", role:"ADMIN", title:"Founder · Northstar Safety", region:"IN", verified:1, powerScore:982, xp:41250, level:18, avatar:"AA", bio:"Building IAC — the arena where verified safety professionals win work on merit.", badges:J(["Founder","Safety King Judge","Verified"]), skills:J(["EHS Strategy","Process Safety","BBS","ISO 45001"]), certs:J(["NEBOSH IGC","Lead Auditor ISO 45001","IOSH MS"]), reviews:J([{by:"Tata Projects",stars:5,text:"Sharp, fast, audit-ready."}]) },
    { id:"u_meera", handle:"meera", name:"Meera Nair", email:"meera@iac.club", role:"PROFESSIONAL", title:"Lead EHS Auditor", region:"IN", verified:1, powerScore:871, xp:28940, level:14, avatar:"MN", bio:"300+ site audits across infra & manufacturing. Zero LTI programs.", badges:J(["Top Auditor","Verified","100 Deliveries"]), skills:J(["ISO 45001","Fire Safety","HIRA","Construction Safety"]), certs:J(["NEBOSH Diploma","Lead Auditor"]), reviews:J([{by:"L&T Construction",stars:5,text:"Best audit report we've had."},{by:"UltraTech",stars:5,text:"Closed 40 NCs in one cycle."}]) },
    { id:"u_dev", handle:"devraj", name:"Devraj Singh", email:"dev@iac.club", role:"PROFESSIONAL", title:"Process Safety Engineer", region:"AE", verified:1, powerScore:804, xp:21100, level:12, avatar:"DS", bio:"HAZOP/LOPA facilitator for oil & gas and chemicals across GCC.", badges:J(["PHA Specialist","Verified"]), skills:J(["HAZOP","LOPA","PSM","Risk Assessment"]), certs:J(["CCPS","TUV FSE"]), reviews:J([{by:"ADNOC contractor",stars:5,text:"Rigorous facilitation."}]) },
    { id:"u_sara", handle:"sara", name:"Sara Khan", email:"sara@iac.club", role:"PROFESSIONAL", title:"Sustainability & ESG Lead", region:"IN", verified:0, powerScore:612, xp:9800, level:8, avatar:"SK", bio:"BRSR & GHG inventories for listed manufacturers.", badges:J(["Rising Star"]), skills:J(["ESG Reporting","BRSR","GHG Accounting","GRI"]), certs:J(["GRI Certified"]), reviews:J([]) },
  ];
  users.forEach((u) => U.run(u));

  const C = db.prepare(`INSERT INTO companies (id,name,sector,region,verified,safetyScore,safetyKingRank,openRoles,ltifr,blurb) VALUES (@id,@name,@sector,@region,@verified,@safetyScore,@safetyKingRank,@openRoles,@ltifr,@blurb)`);
  const companies = [
    { id:"c_apex", name:"Apex Infrastructure", sector:"Construction", region:"IN", verified:1, safetyScore:88, safetyKingRank:1, openRoles:3, ltifr:0.42, blurb:"₹12,000 Cr infra builder. Zero-harm mandate across 40 active sites." },
    { id:"c_helios", name:"Helios Chemicals", sector:"Chemicals", region:"IN", verified:1, safetyScore:84, safetyKingRank:2, openRoles:2, ltifr:0.55, blurb:"Specialty chemicals. PSM-driven culture, 6 sites." },
    { id:"c_gulf", name:"Gulf Energy EPC", sector:"Oil & Gas", region:"AE", verified:1, safetyScore:81, safetyKingRank:3, openRoles:4, ltifr:0.61, blurb:"EPC contractor for downstream projects in the GCC." },
    { id:"c_verde", name:"Verde Foods", sector:"FMCG", region:"IN", verified:1, safetyScore:79, safetyKingRank:4, openRoles:1, ltifr:0.73, blurb:"Packaged foods, 9 plants. Scaling EHS systems." },
  ];
  companies.forEach((c) => C.run(c));

  const P = db.prepare(`INSERT INTO projects (id,clientId,title,category,region,location,remote,summary,scope,skills,clientBudget,fairRateFloor,bestValue,bids,deadline,status,urgency)
    VALUES (@id,@clientId,@title,@category,@region,@location,@remote,@summary,@scope,@skills,@clientBudget,@fairRateFloor,@bestValue,@bids,@deadline,@status,@urgency)`);
  const projects = [
    { id:"p_audit_apex", clientId:"c_apex", title:"ISO 45001 surveillance audit — 4 metro sites", category:"Audit", region:"IN", location:"Mumbai / Pune", remote:0, summary:"Stage-2 surveillance across 4 active metro construction sites. NC closure plan + management review pack required.", scope:J(["On-site audit (4 sites)","NC register + CAPA","Management review deck","Closure verification"]), skills:J(["ISO 45001","Construction Safety","Lead Auditor"]), clientBudget:480000, fairRateFloor:180000, bestValue:215000, bids:7, deadline:days(9), status:"OPEN", urgency:"high" },
    { id:"p_hazop_gulf", clientId:"c_gulf", title:"HAZOP facilitation — crude unit revamp", category:"Process Safety", region:"AE", location:"Abu Dhabi", remote:0, summary:"5-day HAZOP for a crude distillation unit revamp. Certified facilitator + scribe deliverables.", scope:J(["Node-by-node HAZOP","LOPA on high-risk nodes","Action tracker","Closeout report"]), skills:J(["HAZOP","LOPA","PSM"]), clientBudget:1100000, fairRateFloor:520000, bestValue:640000, bids:4, deadline:days(14), status:"OPEN", urgency:"med" },
    { id:"p_brsr_verde", clientId:"c_verde", title:"BRSR Core assurance readiness", category:"ESG", region:"IN", location:"Remote", remote:1, summary:"Prepare BRSR Core disclosures and assurance-readiness pack for FY reporting across 9 plants.", scope:J(["Gap assessment","GHG inventory (Scope 1+2)","Disclosure drafting","Assurance dry-run"]), skills:J(["BRSR","ESG Reporting","GHG Accounting"]), clientBudget:360000, fairRateFloor:140000, bestValue:165000, bids:6, deadline:days(20), status:"OPEN", urgency:"low" },
    { id:"p_fire_helios", clientId:"c_helios", title:"Fire risk assessment + drill program", category:"Fire Safety", region:"IN", location:"Gujarat", remote:0, summary:"FRA for a specialty chemicals plant and a 6-month emergency drill calendar with evaluation rubric.", scope:J(["Fire risk assessment","Drill calendar","Evaluation rubric","Training of wardens"]), skills:J(["Fire Safety","HIRA","Emergency Planning"]), clientBudget:290000, fairRateFloor:110000, bestValue:132000, bids:9, deadline:days(6), status:"OPEN", urgency:"high" },
  ];
  projects.forEach((p) => P.run(p));

  // engagement + milestones + deliverables
  db.prepare(`INSERT INTO engagements (id,projectId,bidId,professionalId,status,deliveryAmount,currency,startedAt,completedAt) VALUES (?,?,?,?,?,?,?,?,?)`)
    .run("e_brsr","p_brsr_verde","bx","u_meera","IN_PROGRESS",162000,"INR",days(-12),null);
  const M = db.prepare(`INSERT INTO milestones (id,engagementId,title,amount,currency,status,dueAt,approvedAt) VALUES (?,?,?,?,?,?,?,?)`);
  M.run("m1","e_brsr","Gap assessment",48600,"INR","APPROVED",days(-6),days(-5));
  M.run("m2","e_brsr","GHG inventory",56700,"INR","SUBMITTED",days(2),null);
  M.run("m3","e_brsr","Disclosure + dry-run",56700,"INR","PENDING",days(11),null);
  const D = db.prepare(`INSERT INTO deliverables (id,engagementId,milestoneId,title,status,submittedAt) VALUES (?,?,?,?,?,?)`);
  D.run("d1","e_brsr","m1","Gap assessment report v1","APPROVED",days(-6));
  D.run("d2","e_brsr","m2","Scope 1+2 GHG workbook","IN_REVIEW",days(-1));

  // ledgers
  db.prepare(`INSERT INTO earnings_ledger (id,userId,type,amount,currency,tdsWithheld,reference,description,createdAt) VALUES (?,?,?,?,?,?,?,?,?)`)
    .run("el1","u_meera","CREDIT",48600,"INR",4860,"m1","Milestone approved: Gap assessment",days(-5));
  const RL = db.prepare(`INSERT INTO recognition_ledger (id,userId,type,points,reason,reference,createdAt) VALUES (?,?,?,?,?,?,?)`);
  RL.run("r1","u_meera","CREDIT",250,"MILESTONE_APPROVED","m1",days(-5));
  RL.run("r2","u_meera","CREDIT",500,"BID_WON","bx",days(-12));
  RL.run("r3","u_meera","CREDIT",1000,"PROFILE_VERIFIED",null,days(-40));
  RL.run("r4","u_meera","CREDIT",150,"REVIEW_5_STAR",null,days(-3));

  const Jb = db.prepare(`INSERT INTO jobs (id,companyId,title,type,region,location,comp,skills,postedAt) VALUES (?,?,?,?,?,?,?,?,?)`);
  Jb.run("j1","c_apex","Corporate EHS Manager","Full-time","IN","Mumbai","₹28–36 LPA",J(["ISO 45001","Leadership"]),days(-2));
  Jb.run("j2","c_gulf","Process Safety Lead (GCC)","Contract","AE","Abu Dhabi","AED 45–55K/mo",J(["HAZOP","PSM"]),days(-5));
  Jb.run("j3","c_verde","ESG & Sustainability Analyst","Full-time","IN","Bengaluru","₹12–18 LPA",J(["BRSR","GHG"]),days(-1));
  Jb.run("j4","c_helios","Site Safety Officer","Full-time","IN","Gujarat","₹6–9 LPA",J(["Fire Safety","HIRA"]),days(-7));

  const Co = db.prepare(`INSERT INTO courses (id,title,lessons,level,cert,tag) VALUES (?,?,?,?,?,?)`);
  Co.run("co1","Incident Investigation with TapRooT®",12,"Intermediate",1,"Investigation");
  Co.run("co2","HAZOP & LOPA Practitioner",18,"Advanced",1,"Process Safety");
  Co.run("co3","BRSR & ESG Reporting Essentials",9,"Beginner",1,"ESG");
  Co.run("co4","Behaviour-Based Safety Foundations",8,"Beginner",0,"Culture");
  const En = db.prepare(`INSERT INTO enrollments (userId,courseId,pct) VALUES (?,?,?)`);
  En.run("u_meera","co1",65); En.run("u_meera","co3",100); En.run("u_meera","co4",30);

  const Po = db.prepare(`INSERT INTO posts (id,authorId,title,body,tag,likes,comments,createdAt) VALUES (?,?,?,?,?,?,?,?)`);
  Po.run("po1","u_dev","LOPA credit for SIS — how conservative do you go?","Curious how peers justify PFD credits when the SIL verification is borderline. Sharing my approach…","Process Safety",42,11,days(-1));
  Po.run("po2","u_sara","BRSR Core: the assurance gap nobody talks about","Most teams nail disclosure but fail the assurance dry-run on data lineage. Here's a checklist…","ESG",88,23,days(-2));
  Po.run("po3","u_meera","Closed 40 NCs in one cycle — the system that did it","A lightweight CAPA cadence + ownership matrix. Template inside.","Audit",130,35,days(-4));

  const T = db.prepare(`INSERT INTO threads (id,userId,withCompanyId,subject,updatedAt) VALUES (?,?,?,?,?)`);
  T.run("t1","u_meera","c_apex","ISO 45001 audit — site access",days(-0.2));
  T.run("t2","u_meera","c_verde","BRSR — GHG workbook review",days(-1.1));
  const Ms = db.prepare(`INSERT INTO messages (id,threadId,sender,text,createdAt) VALUES (?,?,?,?,?)`);
  Ms.run("ms1","t1","them","Hi Meera — confirming the 4-site audit. Can you start Monday?",days(-1));
  Ms.run("ms2","t1","me","Yes. Sharing the audit plan + sampling tonight.",days(-0.9));
  Ms.run("ms3","t1","them","Gate passes ready for Mon. Bring PPE.",days(-0.2));
  Ms.run("ms4","t2","them","Got the workbook — reviewing the Scope 2 factors now.",days(-1.1));

  const N = db.prepare(`INSERT INTO notifications (id,userId,kind,title,body,readAt,createdAt) VALUES (?,?,?,?,?,?,?)`);
  N.run("n1","u_meera","bid.outbid","You're no longer best-value","Apex audit — a lower compliant bid was placed.",null,days(-0.1));
  N.run("n2","u_meera","milestone.approved","Milestone approved — ₹48,600","Verde BRSR · Gap assessment cleared (net of TDS).",days(-5),days(-5));
  N.run("n3","u_meera","xp.awarded","+150 XP","5-star review from UltraTech.",null,days(-3));

  const Aw = db.prepare(`INSERT INTO awards (id,type,winner,year,note) VALUES (?,?,?,?,?)`);
  Aw.run("a1","Individual Safety Hero","Meera Nair",2026,"300+ audits, zero-LTI programs.");
  Aw.run("a2","Company Safety King","Apex Infrastructure",2026,"LTIFR 0.42 across 40 sites.");
  Aw.run("a3","Rising Star","Sara Khan",2026,"BRSR Core leadership for FMCG.");

  db.prepare(`INSERT INTO coi_records (id,engagementId,referrerId,professionalId,createdAt,resolvedAt) VALUES (?,?,?,?,?,?)`).run("coi1","e_brsr","u_dev","u_meera",days(-10),null);
  const Pay = db.prepare(`INSERT INTO payouts (id,userId,amount,status,createdAt) VALUES (?,?,?,?,?)`);
  Pay.run("pay1","u_meera",43740,"PENDING",days(-2));
  Pay.run("pay2","u_dev",61000,"PENDING",days(-1));
  const Au = db.prepare(`INSERT INTO admin_actions (id,adminId,action,targetType,targetId,metadata,createdAt) VALUES (?,?,?,?,?,?,?)`);
  Au.run("au1","u_arpan","PROJECT_PUBLISHED","Project","p_audit_apex","{}",days(-9));
  Au.run("au2","u_arpan","BID_ACCEPTED","Bid","bx","{}",days(-12));

  db.prepare(`INSERT INTO referrals (userId,code,invited,joined,earnedXp) VALUES (?,?,?,?,?)`).run("u_meera","MEERA-IAC",14,6,3000);
  // a draft bid persisted server-side (cross-surface continuity)
  db.prepare(`INSERT INTO bids (id,projectId,professionalId,amount,note,status,deliveryDays,score) VALUES (?,?,?,?,?,?,?,?)`).run("b1","p_audit_apex","u_meera",208000,"","DRAFT",18,94);

  console.log("Seeded IAC database.");
}

// run when invoked directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seed({ reset: process.argv.includes("--reset") });
}
