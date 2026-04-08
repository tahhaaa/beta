export type StudentProfile = "Bon niveau" | "Niveau à renforcer";
export type CourseFormat = "Cours collectif mini groupe" | "Cours individuel" | "Cours en ligne 100%";

export type ReservationStatus = "pending" | "confirmed";
export type StudentPortalSessionStatus = "scheduled" | "done" | "cancelled";
export type StudentPortalTaskStatus = "todo" | "done";

export type Reservation = {
  id: number;
  studentName: string;
  school: string;
  level: StudentProfile;
  courseFormat: CourseFormat;
  whatsapp: string;
  city: string;
  status: ReservationStatus;
  createdAt: string;
  updatedAt: string;
  confirmedAt: string | null;
};

export type StudentSpace = {
  id: number;
  reservationId: number;
  accessCode: string;
  portalActive: boolean;
  individualSessionsPerWeek: 1 | 2;
  targetSessionCount: number;
  courseEndsAt: string;
  createdAt: string;
  updatedAt: string;
};

export type StudentPortalSession = {
  id: number;
  studentSpaceId: number;
  title: string;
  scheduledAt: string;
  instructions: string;
  fileUrl: string;
  status: StudentPortalSessionStatus;
  createdAt: string;
  updatedAt: string;
};

export type StudentPortalTask = {
  id: number;
  studentSpaceId: number;
  title: string;
  dueAt: string;
  details: string;
  fileUrl: string;
  status: StudentPortalTaskStatus;
  createdAt: string;
  updatedAt: string;
};

export type Pricing = Record<StudentProfile, number>;
export type FormatPricing = Record<CourseFormat, number>;

export type DashboardStats = {
  totalReservations: number;
  todayReservations: number;
  confirmedReservations: number;
  estimatedRevenue: number;
  pendingRevenue: number;
  revenueByFormat: Array<{
    format: CourseFormat;
    revenue: number;
    count: number;
  }>;
  levelBreakdown: Array<{
    level: StudentProfile;
    count: number;
  }>;
  monthlyReservations: Array<{
    month: string;
    count: number;
    confirmed: number;
  }>;
};

export type AdminSession = {
  username: string;
  exp: number;
};

export type SiteSettings = {
  centerName: string;
  directWhatsapp: string;
  professorNote: string;
  maintenanceMode: boolean;
  formatPricing: FormatPricing;
  courseFormats: Array<{
    id: CourseFormat;
    label: string;
    enabled: boolean;
  }>;
};
