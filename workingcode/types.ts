
export type NativeLanguage = 'Telugu' | 'Hindi' | 'Marathi' | 'Kannada' | 'Tamil' | 'English';
export type TargetLanguage = 'French' | 'Russian' | 'Spanish' | 'Chinese' | 'Arabic';

export interface Message {
  role: 'user' | 'vishwa';
  text: string;
  timestamp: Date;
}

export interface GroundingSource {
  title: string;
  uri: string;
}
