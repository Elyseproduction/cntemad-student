export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  is_admin_badge: boolean;
  is_developer: boolean;
  created_at: string;
}

export interface MessageView {
  message_id: string;
  user_id: string;
  viewed_at: string;
  user: Profile;
}

export interface TypingStatus {
  user_id: string;
  channel_id: string;
  updated_at: string;
  user: Profile;
}

export interface CodeExercise {
  id: string;
  chapter_id: string;
  title: string;
  instructions: string;
  starter_code: string;
  expected_output?: string;
  language: 'python' | 'javascript' | 'html' | 'css';
  created_at: string;
}

export interface ChapterImage {
  chapter_id: string;
  image_url: string;
  generated_at: string;
}
