export interface ExperienceEntry {
  id: string;
  role: string;
  organization: string;
  startDate: string;
  endDate?: string; // absent = current
  bullets: string[]; // Each bullet independently trackable for the 1:1 fact-check diff
}

export interface EducationEntry {
  id: string;
  institution: string;
  qualification: string;
  fieldOfStudy?: string;
  graduationYear?: string;
}

export interface ProjectEntry {
  id: string;
  title: string;
  description: string;
  link?: string;
}

export interface ResumeData {
  id: string;
  userId: string;
  contact: {
    name: string;
    email: string;
    phone?: string;
    location?: string;
    links?: string[];
  };
  summary?: string;
  experience: ExperienceEntry[];
  education: EducationEntry[];
  skills: string[];
  projects?: ProjectEntry[];
  certifications?: string[];
  templateId: 'minimal' | 'corporate_ats' | 'modern_tech' | 'executive';
  lastEditedAt: string;
  sourceOfTruth: 'user_authored' | 'ai_polished' | 'ai_strengthened';
}

export interface BulletDiffReview {
  originalBullet: string;
  rewrittenBullet: string;
  flaggedFabrications: string[];
  status: 'pending' | 'accepted' | 'rejected';
}

export interface StrengthenQuestion {
  bulletIndex: number;
  originalBullet: string;
  question: string;
  answer?: string;
  skipped?: boolean;
}
