export type ReportStatus = 'verified_negative' | 'not_found' | 'not_updated' | 'detected_positive';
export type ReportSource = 'lab_issued' | 'user_upload';
export type ReportVerificationState = 'pending' | 'verified' | 'rejected';
export type NotificationType = 'booking' | 'report' | 'profile';

export type Profile = {
  id: string;
  name: string;
  age: number | null;
  gender: string | null;
  mobile_number?: string | null;
  date_of_birth: string | null;
  photo_url: string | null;
  is_verified: boolean;
  hide_name: boolean;
  public_share_token: string;
};

export type ExtractedReportMetadata = {
  patient_name?: string | null;
  age?: number | null;
  gender?: string | null;
  date_of_birth?: string | null;
  mobile_number?: string | null;
  lab_name?: string | null;
  report_date?: string | null;
  disease_name?: string | null;
  extracted_status?: ReportStatus | null;
};

export type DiseaseReport = {
  id: string;
  profile_id: string;
  disease_name: string;
  status: ReportStatus;
  lab_id: string | null;
  lab_name?: string | null;
  report_date: string;
  report_file_url?: string | null;
  report_verification_code: string;
  report_file_hash?: string | null;
  source_type?: ReportSource;
  verification_state?: ReportVerificationState;
  extracted_metadata?: ExtractedReportMetadata | null;
};

export type Lab = {
  id: string;
  parent_lab_id: string | null;
  name: string;
  address: string;
  postal_code: string;
  rating: number;
  latitude: number;
  longitude: number;
  is_favorite?: boolean;
  branch_count?: number;
};

export type Booking = {
  id: string;
  profile_id: string;
  lab_id: string;
  lab_name?: string;
  report_name: string;
  report_description: string;
  booking_date: string;
  time_slot: string;
  status: 'booked' | 'completed' | 'cancelled';
  created_at: string;
};

export type NotificationItem = {
  id: string;
  profile_id: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
};
