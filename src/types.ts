export interface ComponentSpec {
  id: string;
  type: 'stat' | 'input' | 'button' | 'chart' | 'list' | string;
  label: string;
  value: string;
  data?: { key: string; val: number }[];
}

export interface GeneratedApplet {
  name: string;
  description: string;
  components: ComponentSpec[];
  codeSnippet: string;
  systemMessage: string;
}

export interface Session {
  id: string;
  name: string;
  prompt: string;
  temperature: number;
  topP: number;
  systemInstruction: string;
  dotColor: string;
  generatedApplet?: GeneratedApplet;
}
