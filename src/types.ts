// Tipovi odgovaraju kolonama u supabase/schema.sql. Sadržaj oglasa ostaje na jeziku autora.
export type Lang = 'sr' | 'en';
export type User = {
  id: string;
};
export type Profile = {
  id: string;
  name: string;
  bio: string;
  avatar: string;
  intent: string;
  category: string;
  branch: string;
  specialty: string;
  onboarded: boolean;
};
export type Listing = {
  id: string;
  kind: 'service' | 'project';
  status: 'draft' | 'published' | 'closed';
  owner_id: string;
  title: string;
  body: string;
  category: string;
  specialty: string;
  tags: string;
  price: number | null;
  deadline: string | null;
  reference_url: string;
  created_at: string;
};
export type Work = {
  id: string;
  listing_id: string;
  title: string;
  contribution: string;
  image_path: string;
  video: string;
  position: number;
};
export type Slot = {
  id: string;
  owner_id: string;
  starts_at: string;
  booked: boolean;
};
export type Booking = {
  id: string;
  listing_id: string;
  slot_id: string;
  client_id: string;
  brief: string;
  status: string;
};
export type Application = {
  id: string;
  listing_id: string;
  applicant: string;
  proposal: string;
  price: number | null;
  deadline: string | null;
  work_id: string | null;
  status: string;
};
export type Thread = {
  id: string;
  listing_id: string;
  owner_id: string;
  peer_id: string;
};
export type Message = {
  id: string;
  thread_id: string;
  sender: string;
  body: string;
  created_at: string;
};
export type Report = {
  id: string;
  reporter: string;
  thread_id: string | null;
  listing_id: string | null;
  reason: string;
  resolved: boolean;
};
export type Tables = {
  profiles: Profile;
  listings: Listing;
  works: Work;
  slots: Slot;
  bookings: Booking;
  applications: Application;
  threads: Thread;
  messages: Message;
  reports: Report;
  admins: {
    user_id: string;
  };
};
