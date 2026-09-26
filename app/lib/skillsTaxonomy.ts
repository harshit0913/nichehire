// app/lib/skillsTaxonomy.ts
// Multi-Disciplinary Skills & Academic Degree Taxonomy for Pan-India Students.
// Supports BA, BCA, B.Com, CA, CMA, CS, BBA, BMS, MBA, MBBS, BDS, B.Pharm,
// LLB, BA LLB, B.Sc, M.Sc, B.Tech, and Diploma graduates across every stream.

export interface DisciplineField {
  id: string;
  name: string;
  targetDegrees: string[];
  sampleRoles: string[];
  coreSkills: string[];
}

export const ACADEMIC_DISCIPLINES: Record<string, DisciplineField> = {
  // ─── 1. COMMERCE & CHARTERED ACCOUNTANCY (B.Com, M.Com, CA, CMA, CS) ──────
  commerce: {
    id: 'commerce',
    name: 'Commerce, Taxation & Professional Accounting',
    targetDegrees: [
      'B.Com', 'BCom', 'M.Com', 'MCom', 'Chartered Accountant', 'CA', 'CA Articleship',
      'CA Inter', 'CA Final', 'CMA', 'ICWA', 'CS', 'Company Secretary', 'CFA'
    ],
    sampleRoles: [
      'Chartered Accountant', 'CA Articleship Trainee', 'Statutory Auditor',
      'Taxation Associate', 'Accounts Executive', 'Cost Accountant',
      'Financial Analyst', 'Credit Analyst', 'Chief Financial Officer'
    ],
    coreSkills: [
      'Tally Prime', 'Tally.ERP 9', 'GST Filing & Compliance', 'Direct Tax',
      'Indirect Tax', 'Statutory Audit', 'Internal Audit', 'Income Tax Returns (ITR)',
      'TDS & TCS Returns', 'Balance Sheet Preparation', 'IFRS & Ind AS',
      'Financial Modeling', 'Bank Reconciliation (BRS)', 'SAP FICO',
      'Cost Accounting', 'QuickBooks', 'Zoho Books', 'MIS Reporting',
      'Working Capital Management', 'Corporate Law & ROC Filing', 'Auditing Standards'
    ],
  },

  // ─── 2. MANAGEMENT & BUSINESS (BBA, BMS, MBA, PGDM) ────────────────────────
  management: {
    id: 'management',
    name: 'Management, Business Administration & Supply Chain',
    targetDegrees: [
      'BBA', 'BMS', 'BBS', 'MBA', 'PGDM', 'MMS', 'Master of Management', 'Diploma in Management'
    ],
    sampleRoles: [
      'Business Development Executive', 'Product Manager', 'Operations Manager',
      'Supply Chain Executive', 'Logistics Coordinator', 'Procurement Specialist',
      'Inventory Manager', 'Warehouse Operations Lead', 'Digital Marketing Specialist',
      'HR Generalist', 'Brand Manager', 'Management Consultant', 'Supply Chain Analyst', 'Sales Lead'
    ],
    coreSkills: [
      'Supply Chain Management (SCM)', 'Logistics & Distribution', 'Inventory Control & Warehouse Operations',
      'Procurement & Vendor Negotiation', 'ERP & SAP MM', 'Demand Planning & Forecasting',
      'Business Strategy', 'Market Research & Analytics', 'Operations Management',
      'Vendor Management', 'P&L Management', 'Digital Marketing', 'CRM (Salesforce / HubSpot)',
      'Sales Pipeline Management', 'Lead Generation & B2B Sales', 'HR Generalist',
      'Talent Acquisition', 'Payroll & Statutory Compliance', 'Agile & Scrum Methodologies',
      'Budgeting & Forecasting'
    ],
  },

  // ─── 3. LAW & LEGAL STUDIES (LLB, BA LLB, BBA LLB, LLM) ───────────────────
  law: {
    id: 'law',
    name: 'Law, Judicial Studies & Corporate Legal',
    targetDegrees: [
      'LLB', 'L.L.B.', 'BA LLB', 'B.A. LL.B', 'BBA LLB', 'B.Com LLB',
      'LLM', 'L.L.M.', 'Advocate', 'Law Graduate', 'Bar Council Certified'
    ],
    sampleRoles: [
      'Legal Intern', 'Law Research Associate', 'Judicial Clerk',
      'Litigation Advocate', 'Corporate Legal Counsel', 'Contracts Specialist',
      'Compliance Officer', 'Legal Drafter', 'IPR Associate'
    ],
    coreSkills: [
      'Legal Research', 'Case Law Briefing', 'Court Pleadings & Petitions',
      'Constitutional Law', 'Civil Procedure Code (CPC)', 'Criminal Procedure (CrPC / BNSS)',
      'Indian Penal Code (IPC / BNS)', 'Law of Contracts', 'Contract Drafting & Review',
      'Legal Due Diligence', 'Intellectual Property Rights (IPR)', 'Arbitration & Conciliation',
      'NCLT & Insolvency (IBC)', 'SCC Online & Manupatra', 'Consumer Protection Act',
      'Company Law & ROC Matters', 'Litigation Management', 'Conveyancing & Deeds'
    ],
  },

  // ─── 4. COMPUTER APPLICATIONS & IT (BCA, MCA, B.Sc IT, B.Tech CSE) ────────
  technology: {
    id: 'technology',
    name: 'Computer Applications, Software & Cloud IT',
    targetDegrees: [
      'BCA', 'MCA', 'B.Sc Computer Science', 'B.Sc IT', 'M.Sc Computer Science',
      'B.Tech', 'B.E.', 'M.Tech', 'Diploma in Computer Science'
    ],
    sampleRoles: [
      'Software Engineer', 'Frontend Developer', 'Backend Developer',
      'Full Stack Developer', 'Data Analyst', 'Cloud Engineer',
      'DevOps Engineer', 'Mobile App Developer', 'Cyber Security Analyst'
    ],
    coreSkills: [
      'Python', 'JavaScript', 'TypeScript', 'Java', 'C++', 'React', 'Next.js',
      'Node.js', 'Express', 'SQL', 'PostgreSQL', 'MySQL', 'MongoDB',
      'Data Structures & Algorithms (DSA)', 'Git & GitHub', 'REST APIs', 'GraphQL',
      'Cloud AWS / Azure / GCP', 'Docker & Kubernetes', 'Linux & Shell Scripting',
      'Database Management Systems (DBMS)', 'HTML5 & CSS3 / Tailwind',
      'Cyber Security Fundamentals', 'Power BI & Data Visualization'
    ],
  },

  // ─── 5. ARTS, HUMANITIES & MASS COMMUNICATION (BA, MA, BJMC) ──────────────
  arts: {
    id: 'arts',
    name: 'Arts, Humanities, Content & Social Sciences',
    targetDegrees: [
      'BA', 'B.A.', 'MA', 'M.A.', 'BJMC', 'BMM', 'Bachelor of Journalism',
      'Master of Mass Communication', 'MSW', 'Bachelor of Social Work'
    ],
    sampleRoles: [
      'Content Writer', 'Copywriter', 'Journalist / Reporter',
      'Public Relations Specialist', 'Editor / Proofreader', 'Public Policy Analyst',
      'Communications Manager', 'Social Worker', 'Creative Director'
    ],
    coreSkills: [
      'Content Writing', 'Copywriting & Ad Copy', 'Journalism & Reporting',
      'Editorial Proofreading', 'Public Relations (PR)', 'Corporate Communications',
      'Creative Writing', 'Translation (Hindi, English & Regional)', 'Social Media Management',
      'Public Policy Research', 'Qualitative Research', 'Community Outreach',
      'Interviewing Techniques', 'Storytelling & Scriptwriting', 'WordPress & CMS'
    ],
  },

  // ─── 6. MEDICINE, HEALTHCARE & PHARMACY (MBBS, BDS, B.Pharm, Nursing) ─────
  healthcare: {
    id: 'healthcare',
    name: 'Medicine, Dentistry, Healthcare & Pharmacy',
    targetDegrees: [
      'MBBS', 'BDS', 'B.Pharm', 'BPharm', 'M.Pharm', 'Pharm.D',
      'B.Sc Nursing', 'BPT', 'Physiotherapy', 'BHMS', 'BAMS'
    ],
    sampleRoles: [
      'Medical Officer', 'Clinical Research Associate', 'Pharmacist',
      'Pharmacovigilance Scientist', 'Hospital Administrator', 'Nursing Officer',
      'Resident Doctor', 'Healthcare Consultant', 'Medical Writer'
    ],
    coreSkills: [
      'Clinical Diagnosis', 'Patient Care & Management', 'Emergency Medical Response',
      'Pharmacology', 'Pharmacovigilance', 'Clinical Trials Protocol',
      'Medical Records (EHR / EMR)', 'Pathology & Diagnostics', 'Infection Control',
      'Drug Formulation & Dispensing', 'Hospital Administration', 'Medical Terminology',
      'Medical Writing', 'Patient Counseling', 'Good Clinical Practice (GCP)'
    ],
  },

  // ─── 7. SCIENCE, MATHEMATICS & STATISTICS (B.Sc, M.Sc) ────────────────────
  science: {
    id: 'science',
    name: 'Natural Sciences, Mathematics & Statistical Research',
    targetDegrees: [
      'B.Sc', 'BSc', 'M.Sc', 'MSc', 'Bachelor of Science', 'Master of Science',
      'B.Stat', 'M.Stat', 'Data Science Degree'
    ],
    sampleRoles: [
      'Data Scientist', 'Statistical Analyst', 'Laboratory Scientific Officer',
      'Quality Control Analyst', 'Research Assistant', 'Biochemist'
    ],
    coreSkills: [
      'Statistical Analysis', 'Advanced Excel (Macros, VBA, Pivot)', 'R Programming',
      'Hypothesis Testing & Regression', 'Data Modeling', 'SPSS / SAS',
      'Laboratory Instrumentation', 'Quality Assurance (QA/QC)', 'Biostatistics',
      'Experimental Design', 'Scientific Literature Review', 'Chemical Analysis'
    ],
  },

  // ─── 8. ENGINEERING DISCIPLINES (Civil, Mech, Electrical, Chemical) ────────
  engineering: {
    id: 'engineering',
    name: 'Civil, Mechanical, Electrical & Chemical Engineering',
    targetDegrees: [
      'B.Tech Civil', 'B.Tech Mechanical', 'B.Tech Electrical', 'B.Tech Chemical',
      'B.E. Civil', 'B.E. Mechanical', 'Diploma in Engineering'
    ],
    sampleRoles: [
      'Site Engineer', 'Mechanical Design Engineer', 'Electrical Maintenance Engineer',
      'QA/QC Inspector', 'Structural Draftsman', 'Project Engineer'
    ],
    coreSkills: [
      'AutoCAD 2D/3D', 'SolidWorks / CATIA', 'Structural Analysis (STAAD Pro)',
      'Site Supervision & Surveying', 'Bill of Quantities (BOQ)', 'Quality Inspection (QA/QC)',
      'HVAC Systems', 'PLC / SCADA Automation', 'Circuit Design & Schematics',
      'Equipment Maintenance', 'Industrial Safety & OSHA Standards', 'Project Estimation'
    ],
  },
};

/**
 * Detects the academic discipline of a job based on its title and description.
 */
export function detectJobDiscipline(jobText: string, jobTitle?: string): DisciplineField {
  const titleToCheck = (jobTitle || jobText.slice(0, 80)).toLowerCase();
  const bodyToCheck = jobText.toLowerCase();

  const matchDisciplineInText = (text: string): DisciplineField | null => {
    // 1. Technology, Software & IT (BCA, MCA, B.Tech, Developers)
    if (
      text.includes('software') ||
      text.includes('developer') ||
      text.includes('frontend') ||
      text.includes('backend') ||
      text.includes('full stack') ||
      text.includes('web development') ||
      text.includes('react') ||
      text.includes('next.js') ||
      text.includes('python') ||
      text.includes('cloud engineer') ||
      text.includes('devops') ||
      /\b(bca|mca|b\.tech|m\.tech|btech|mtech|dsa|cybersecurity)\b/i.test(text)
    ) {
      return ACADEMIC_DISCIPLINES.technology;
    }

    // 2. Law & Legal Studies
    if (
      text.includes('legal') ||
      text.includes('advocate') ||
      text.includes('judicial') ||
      text.includes('litigation') ||
      text.includes('pleading') ||
      text.includes('counsel') ||
      /\b(law|llb|llm|court|clerk|ipc|crpc|cpc|bnss)\b/i.test(text)
    ) {
      return ACADEMIC_DISCIPLINES.law;
    }

    // 3. Healthcare & Medicine
    if (
      text.includes('doctor') ||
      text.includes('medical') ||
      text.includes('clinical') ||
      text.includes('nursing') ||
      text.includes('patient care') ||
      text.includes('hospital') ||
      /\b(mbbs|bds|bams|bhms|b\.pharm|m\.pharm|pharma)\b/i.test(text)
    ) {
      return ACADEMIC_DISCIPLINES.healthcare;
    }

    // 4. Commerce, Taxation & Professional Accounting (CA, CMA, Accounts, Audit)
    if (
      text.includes('account') ||
      text.includes('audit') ||
      text.includes('tally') ||
      text.includes('gst') ||
      text.includes('articleship') ||
      text.includes('balance sheet') ||
      text.includes('bookkeeping') ||
      text.includes('taxation') ||
      text.includes('income tax') ||
      /\b(ca|cma|cs|tax|chartered accountant|ca inter|ca final)\b/i.test(text)
    ) {
      return ACADEMIC_DISCIPLINES.commerce;
    }

    // 5. Management, Business & Supply Chain (MBA, SCM, Operations, Logistics)
    if (
      text.includes('supply chain') ||
      text.includes('logistics') ||
      text.includes('procurement') ||
      text.includes('warehouse') ||
      text.includes('inventory') ||
      text.includes('dispatch') ||
      text.includes('business development') ||
      text.includes('product manager') ||
      text.includes('brand manager') ||
      text.includes('operations') ||
      /\b(scm|wms|operations manager|operations trainee|operations lead)\b/i.test(text)
    ) {
      return ACADEMIC_DISCIPLINES.management;
    }

    // 6. Arts, Content & Media (BA, MA, Journalism)
    if (
      text.includes('content') ||
      text.includes('copywrit') ||
      text.includes('journalism') ||
      text.includes('writer') ||
      text.includes('editor') ||
      text.includes('public relations') ||
      text.includes('mass communication') ||
      /\b(ba|ma|bjmc|b\.des)\b/i.test(text)
    ) {
      return ACADEMIC_DISCIPLINES.arts;
    }

    // 7. Core Engineering (Civil, Mechanical, Electrical)
    if (
      text.includes('civil engineer') ||
      text.includes('mechanical engineer') ||
      text.includes('electrical engineer') ||
      text.includes('autocad') ||
      text.includes('site engineer') ||
      text.includes('structural')
    ) {
      return ACADEMIC_DISCIPLINES.engineering;
    }

    return null;
  };

  const titleMatch = matchDisciplineInText(titleToCheck);
  if (titleMatch) return titleMatch;

  const bodyMatch = matchDisciplineInText(bodyToCheck);
  if (bodyMatch) return bodyMatch;

  return ACADEMIC_DISCIPLINES.management;
}

/**
 * Intelligent missing skills suggester:
 * Given a job's text and candidate's existing skills, suggests high-impact missing skills
 * strictly drawn from the RELEVANT academic discipline (not software engineering by default).
 */
export function suggestRelevantMissingSkills(jobText: string, candidateSkills: string[]): string[] {
  const discipline = detectJobDiscipline(jobText);
  const lowText = jobText.toLowerCase();
  const candLow = candidateSkills.map((s) => s.toLowerCase());

  // 1. First, check if the job explicitly mentions skills from its discipline that candidate lacks
  const explicitGaps = discipline.coreSkills.filter(
    (skill) => lowText.includes(skill.toLowerCase()) && !candLow.some((c) => c === skill.toLowerCase())
  );

  if (explicitGaps.length > 0) {
    return explicitGaps.slice(0, 3);
  }

  // 2. Otherwise, suggest core discipline staples that elevate the candidate's profile
  const recommended = discipline.coreSkills.filter(
    (skill) => !candLow.some((c) => c === skill.toLowerCase())
  );

  return recommended.slice(0, 3);
}

/**
 * Checks whether a candidate's degree aligns with job requirements across ALL Indian qualifications.
 */
export function evaluateDegreeAlignment(
  jobText: string,
  candidateEdu: string | Array<string | { degree?: string; institution?: string }>
): { aligned: boolean; text: string; score: number } {
  const jLow = (jobText || '').toLowerCase();
  
  let eduStr = '';
  if (typeof candidateEdu === 'string') {
    eduStr = candidateEdu;
  } else if (Array.isArray(candidateEdu)) {
    eduStr = candidateEdu
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') return `${item.degree || ''} ${item.institution || ''}`;
        return '';
      })
      .join(' ');
  }
  const eLow = eduStr.toLowerCase().trim();

  if (!eLow) {
    return { aligned: false, text: 'No degree specified', score: 10 };
  }

  // 1. Check primary detected discipline first for highest contextual precision
  const primaryDiscipline = detectJobDiscipline(jobText);
  const isPrimaryCandidateMatch = primaryDiscipline.targetDegrees.some((d) => eLow.includes(d.toLowerCase()));
  if (isPrimaryCandidateMatch) {
    return {
      aligned: true,
      text: `${primaryDiscipline.name} degree directly matches role requirements`,
      score: 25,
    };
  }

  // 2. Check remaining disciplines
  for (const discipline of Object.values(ACADEMIC_DISCIPLINES)) {
    if (discipline.id === primaryDiscipline.id) continue;
    const isJobInDiscipline = discipline.targetDegrees.some((d) => jLow.includes(d.toLowerCase())) ||
      discipline.sampleRoles.some((r) => jLow.includes(r.toLowerCase()));

    const isCandidateInDiscipline = discipline.targetDegrees.some((d) => eLow.includes(d.toLowerCase()));

    if (isJobInDiscipline && isCandidateInDiscipline) {
      return {
        aligned: true,
        text: `${discipline.name} degree directly matches role requirements`,
        score: 25,
      };
    }
  }

  // General Bachelor's / Master's alignment
  if (
    (jLow.includes('bachelor') || jLow.includes('graduate') || jLow.includes('degree')) &&
    (eLow.includes('bachelor') || eLow.includes('graduate') || eLow.includes('b.') || eLow.includes('degree'))
  ) {
    return { aligned: true, text: 'Undergraduate degree aligns with educational prerequisites', score: 20 };
  }

  if (
    (jLow.includes('master') || jLow.includes('postgraduate')) &&
    (eLow.includes('master') || eLow.includes('postgraduate') || eLow.includes('m.') || eLow.includes('mba'))
  ) {
    return { aligned: true, text: 'Postgraduate degree meets advanced qualification requirements', score: 25 };
  }

  return { aligned: true, text: 'Educational profile evaluated favorably', score: 15 };
}
