import { Booking, DiseaseReport, Lab, NotificationItem, Profile } from './types';

export const DEMO_TOKEN = 'demo-share-a7k3m9';
export const DEMO_PROFILE: Profile = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Yash Adani',
  age: 30,
  gender: 'Male',
  mobile_number: '+1 555 014 2291',
  date_of_birth: '1996-05-12',
  photo_url: null,
  is_verified: true,
  hide_name: false,
  public_share_token: DEMO_TOKEN
};

export const DEMO_REPORTS: DiseaseReport[] = [
  { id: 'r1', profile_id: DEMO_PROFILE.id, disease_name: 'Covid-19', status: 'verified_negative', lab_id: 'l1', lab_name: 'Northstar Diagnostics', report_date: '2026-09-05', report_verification_code: 'REP-COVID-9A17', report_file_hash: 'demo-covid-hash', source_type: 'lab_issued', verification_state: 'verified' },
  { id: 'r2', profile_id: DEMO_PROFILE.id, disease_name: 'Dengue', status: 'detected_positive', lab_id: 'l2', lab_name: 'Atlas Clinical Labs — Uptown', report_date: '2026-08-28', report_verification_code: 'REP-DENGUE-7K22', report_file_hash: 'demo-dengue-hash', source_type: 'lab_issued', verification_state: 'verified' },
  { id: 'r3', profile_id: DEMO_PROFILE.id, disease_name: 'Malaria', status: 'verified_negative', lab_id: 'l3', lab_name: 'Cedar Health Labs', report_date: '2026-07-17', report_verification_code: 'REP-MALARIA-5Q41', report_file_hash: 'demo-malaria-hash', source_type: 'lab_issued', verification_state: 'verified' },
  { id: 'r4', profile_id: DEMO_PROFILE.id, disease_name: 'Monkeypox', status: 'not_found', lab_id: null, lab_name: null, report_date: '2026-06-03', report_verification_code: 'REP-MPX-3H14', report_file_hash: 'demo-mpx-hash', source_type: 'lab_issued', verification_state: 'verified' },
  { id: 'r5', profile_id: DEMO_PROFILE.id, disease_name: 'Swine Flu', status: 'not_updated', lab_id: 'l4', lab_name: 'Veridian Diagnostics', report_date: '2026-05-22', report_verification_code: 'REP-H1N1-1M88', report_file_hash: 'demo-h1n1-hash', source_type: 'lab_issued', verification_state: 'verified' }
];

export const DEMO_LABS: Lab[] = [
  { id: 'l1', parent_lab_id: null, name: 'Northstar Diagnostics', address: '2500 Cedar Springs Rd, Dallas, TX', postal_code: '75201', rating: 4.9, latitude: 32.7977, longitude: -96.8062, is_favorite: true, branch_count: 3 },
  { id: 'l1b1', parent_lab_id: 'l1', name: 'Northstar Diagnostics — Uptown', address: '3227 McKinney Ave, Dallas, TX', postal_code: '75204', rating: 4.8, latitude: 32.8024, longitude: -96.7990 },
  { id: 'l1b2', parent_lab_id: 'l1', name: 'Northstar Diagnostics — Lakewood', address: '6415 Gaston Ave, Dallas, TX', postal_code: '75214', rating: 4.7, latitude: 32.8144, longitude: -96.7537 },
  { id: 'l1b3', parent_lab_id: 'l1', name: 'Northstar Diagnostics — Preston', address: '6025 Royal Ln, Dallas, TX', postal_code: '75230', rating: 4.8, latitude: 32.8953, longitude: -96.8021 },
  { id: 'l2', parent_lab_id: null, name: 'Atlas Clinical Labs', address: '1818 N Harwood St, Dallas, TX', postal_code: '75201', rating: 4.7, latitude: 32.7889, longitude: -96.8011, is_favorite: true, branch_count: 2 },
  { id: 'l2b1', parent_lab_id: 'l2', name: 'Atlas Clinical Labs — Uptown', address: '3699 McKinney Ave, Dallas, TX', postal_code: '75204', rating: 4.8, latitude: 32.8079, longitude: -96.7983 },
  { id: 'l2b2', parent_lab_id: 'l2', name: 'Atlas Clinical Labs — Bishop Arts', address: '408 N Bishop Ave, Dallas, TX', postal_code: '75208', rating: 4.6, latitude: 32.7497, longitude: -96.8278 },
  { id: 'l3', parent_lab_id: null, name: 'Cedar Health Labs', address: '3414 Oak Lawn Ave, Dallas, TX', postal_code: '75219', rating: 4.8, latitude: 32.8093, longitude: -96.8054, branch_count: 0 },
  { id: 'l4', parent_lab_id: null, name: 'Veridian Diagnostics', address: '8611 Hillcrest Rd, Dallas, TX', postal_code: '75225', rating: 4.6, latitude: 32.8652, longitude: -96.7862, branch_count: 0 },
  { id: 'l5', parent_lab_id: null, name: 'Elm Street Pathology', address: '1700 Pacific Ave, Dallas, TX', postal_code: '75201', rating: 4.5, latitude: 32.7815, longitude: -96.7983, branch_count: 0 },
  { id: 'l6', parent_lab_id: null, name: 'Parkland Reference Lab', address: '5200 Harry Hines Blvd, Dallas, TX', postal_code: '75235', rating: 4.9, latitude: 32.8124, longitude: -96.8351, branch_count: 0 },
  { id: 'l7', parent_lab_id: null, name: 'Trinity Molecular', address: '1445 Ross Ave, Dallas, TX', postal_code: '75202', rating: 4.4, latitude: 32.7839, longitude: -96.8031, branch_count: 0 },
  { id: 'l8', parent_lab_id: null, name: 'Oak Cliff Diagnostics', address: '221 W 12th St, Dallas, TX', postal_code: '75208', rating: 4.5, latitude: 32.7440, longitude: -96.8262, branch_count: 0 },
  { id: 'l9', parent_lab_id: null, name: 'White Rock Lab Services', address: '1151 N Buckner Blvd, Dallas, TX', postal_code: '75218', rating: 4.7, latitude: 32.8345, longitude: -96.7166, branch_count: 0 },
  { id: 'l10', parent_lab_id: null, name: 'Deep Ellum Diagnostics', address: '2801 Elm St, Dallas, TX', postal_code: '75226', rating: 4.3, latitude: 32.7845, longitude: -96.7839, branch_count: 0 }
];

export const DEMO_BOOKINGS: Booking[] = [
  { id: 'b1', profile_id: DEMO_PROFILE.id, lab_id: 'l3', lab_name: 'Cedar Health Labs', report_name: 'Malaria follow-up panel', report_description: 'Follow-up after travel', booking_date: '2026-09-24', time_slot: '10:30 AM', status: 'booked', created_at: '2026-09-19T15:30:00Z' }
];

export const DEMO_NOTIFICATIONS: NotificationItem[] = [
  { id: 'n1', profile_id: DEMO_PROFILE.id, type: 'booking', title: 'Booking confirmed', message: 'Malaria follow-up panel is booked for September 24 at 10:30 AM.', read_at: null, created_at: '2026-09-19T15:31:00Z' },
  { id: 'n2', profile_id: DEMO_PROFILE.id, type: 'report', title: 'Verified report added', message: 'Covid-19 report is verified.', read_at: null, created_at: '2026-09-18T12:00:00Z' },
  { id: 'n3', profile_id: DEMO_PROFILE.id, type: 'profile', title: 'Profile updated', message: 'Changed: profile photo.', read_at: '2026-09-18T12:30:00Z', created_at: '2026-09-18T11:55:00Z' }
];
