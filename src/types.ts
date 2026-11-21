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
  username: string;
  cover: string;
  about: string;
  skills: string[];
  github_url: string;
  behance_url: string;
  website_url: string;
  available: boolean;
};
export type Listing = {
  id: string;
  kind: 'service' | 'project';
  status: 'draft' | 'published' | 'closed';
  owner_id: string;
  title: string;
  body: string;
  category: string;
  category_id: string | null;
  specialty: string;
  currency: 'EUR' | 'USD' | 'RSD' | 'GBP';
  job_type: 'fixed' | 'hourly' | 'oneoff' | 'ongoing';
  tags: string;
  price: number | null;
  deadline: string | null;
  reference_url: string;
  created_at: string;
};
export type CategoryNode = {
  id: string;
  parent_id: string | null;
  name_sr: string;
  name_en: string;
  icon: string;
  sort_order: number;
  active: boolean;
};
export type ListingImage = {
  id: string;
  listing_id: string;
  image_path: string;
  position: number;
  is_cover: boolean;
};
export type PortfolioProject = {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  image_paths: string[];
  project_url: string;
  created_at: string;
};
export type Review = {
  id: string; reviewer_id: string; listing_id: string | null; profile_id: string | null;
  rating: number; body: string; created_at: string; updated_at: string;
};
export type ReviewStat = { listing_id?: string; profile_id?: string; review_count: number; rating_avg: number; rank_score?: number; };
export type PushSubscription = {id:string; user_id:string; endpoint:string; p256dh:string; auth_key:string; created_at:string;};
export type InboxItem = {
  thread_id: string;
  listing_id: string;
  peer_name: string;
  listing_title: string;
  last_body: string | null;
  last_at: string | null;
  unread: number;
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
  reviews: Review;
  listing_review_stats: ReviewStat;
  profile_review_stats: ReviewStat;
  push_subscriptions: PushSubscription;
  categories: CategoryNode;
  listing_images: ListingImage;
  portfolio_projects: PortfolioProject;
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

export type LiveChatMessage = {
  id: string;
  sender: string;
  sender_name: string;
  body: string;
  created_at: string;
};
