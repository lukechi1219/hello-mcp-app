export interface Greeting {
  language: string;
  text: string;
  nativeName: string;
}

export const greetings: Greeting[] = [
  {
    language: 'English',
    text: 'Hello World~',
    nativeName: 'English'
  },
  {
    language: 'Traditional Chinese',
    text: '世界你好~',
    nativeName: '繁體中文'
  },
  {
    language: 'Simplified Chinese',
    text: '世界你好~',
    nativeName: '简体中文'
  },
  {
    language: 'Japanese',
    text: 'こんにちは世界~',
    nativeName: '日本語'
  },
  {
    language: 'Korean',
    text: '안녕하세요 세계~',
    nativeName: '한국어'
  },
  {
    language: 'Spanish',
    text: 'Hola Mundo~',
    nativeName: 'Español'
  },
  {
    language: 'French',
    text: 'Bonjour le Monde~',
    nativeName: 'Français'
  },
  {
    language: 'German',
    text: 'Hallo Welt~',
    nativeName: 'Deutsch'
  },
  {
    language: 'Arabic',
    text: 'مرحبا بالعالم~',
    nativeName: 'العربية'
  },
  {
    language: 'Hindi',
    text: 'नमस्ते दुनिया~',
    nativeName: 'हिन्दी'
  },
  {
    language: 'Portuguese',
    text: 'Olá Mundo~',
    nativeName: 'Português'
  },
  {
    language: 'Russian',
    text: 'Привет мир~',
    nativeName: 'Русский'
  },
  {
    language: 'Italian',
    text: 'Ciao Mondo~',
    nativeName: 'Italiano'
  },
  {
    language: 'Thai',
    text: 'สวัสดีชาวโลก~',
    nativeName: 'ภาษาไทย'
  },
  {
    language: 'Vietnamese',
    text: 'Xin chào thế giới~',
    nativeName: 'Tiếng Việt'
  }
];
