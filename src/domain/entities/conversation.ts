// Conversation entity representing a multi-turn dialogue session
// Tracks conversation history and context for resumable interactions

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ConversationMetadata {
  vehicleIds?: string[];
  lastQuery?: string;
  userPreferences?: {
    budget?: { min: number; max: number };
    make?: string;
    bodyType?: string;
    features?: string[];
  };
  language?: 'es' | 'en' | 'mixed';
  [key: string]: any;
}

export interface ConversationProps {
  id: string;
  customerId?: string;
  sessionId: string;
  messages: ConversationMessage[];
  metadata: ConversationMetadata;
  status: 'active' | 'completed' | 'abandoned';
  startedAt: Date;
  lastActivityAt: Date;
  completedAt?: Date;
}

export class Conversation {
  private constructor(private props: ConversationProps) {}

  static create(props: Omit<ConversationProps, 'id' | 'startedAt' | 'lastActivityAt'>): Conversation {
    return new Conversation({
      ...props,
      id: crypto.randomUUID(),
      startedAt: new Date(),
      lastActivityAt: new Date()
    });
  }

  static reconstitute(props: ConversationProps): Conversation {
    return new Conversation(props);
  }

  get id(): string {
    return this.props.id;
  }

  get customerId(): string | undefined {
    return this.props.customerId;
  }

  get sessionId(): string {
    return this.props.sessionId;
  }

  get messages(): ConversationMessage[] {
    return [...this.props.messages];
  }

  get metadata(): ConversationMetadata {
    return { ...this.props.metadata };
  }

  get status(): 'active' | 'completed' | 'abandoned' {
    return this.props.status;
  }

  get startedAt(): Date {
    return this.props.startedAt;
  }

  get lastActivityAt(): Date {
    return this.props.lastActivityAt;
  }

  get completedAt(): Date | undefined {
    return this.props.completedAt;
  }

  get messageCount(): number {
    return this.props.messages.length;
  }

  get duration(): number {
    const end = this.props.completedAt || new Date();
    return end.getTime() - this.props.startedAt.getTime();
  }

  addMessage(message: ConversationMessage): void {
    this.props.messages.push(message);
    this.props.lastActivityAt = new Date();
  }

  updateMetadata(updates: Partial<ConversationMetadata>): void {
    this.props.metadata = {
      ...this.props.metadata,
      ...updates
    };
    this.props.lastActivityAt = new Date();
  }

  complete(): void {
    this.props.status = 'completed';
    this.props.completedAt = new Date();
    this.props.lastActivityAt = new Date();
  }

  abandon(): void {
    this.props.status = 'abandoned';
    this.props.lastActivityAt = new Date();
  }

  reactivate(): void {
    if (this.props.status !== 'active') {
      this.props.status = 'active';
      this.props.lastActivityAt = new Date();
    }
  }

  isActive(): boolean {
    return this.props.status === 'active';
  }

  isStale(thresholdMinutes: number = 30): boolean {
    const now = new Date().getTime();
    const lastActivity = this.props.lastActivityAt.getTime();
    const minutesSinceActivity = (now - lastActivity) / (1000 * 60);
    return minutesSinceActivity > thresholdMinutes;
  }

  toJSON(): ConversationProps {
    return { ...this.props };
  }
}
