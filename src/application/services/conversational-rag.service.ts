// Conversational RAG service for multi-turn vehicle search dialogues
// Maintains conversation context and provides intelligent follow-up handling

import { ChatOllama } from '@langchain/ollama';
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { SemanticVehicleSearchService } from './semantic-vehicle-search.service';
import { Vehicle } from '@domain/entities/vehicle';

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

export interface ConversationContext {
  messages: ConversationMessage[];
  currentVehicles?: Vehicle[];
  lastQuery?: string;
  userPreferences?: {
    budget?: { min: number; max: number };
    make?: string;
    bodyType?: string;
    features?: string[];
  };
}

export interface ConversationalResponse {
  message: string;
  vehicles?: Vehicle[];
  context: ConversationContext;
  suggestedFollowUps?: string[];
}

export class ConversationalRAGService {
  private llm: ChatOllama;
  private outputParser: StringOutputParser;
  private systemPrompt: string;

  constructor(
    private semanticSearch: SemanticVehicleSearchService,
    modelName: string = 'llama3.2',
    baseUrl: string = 'http://localhost:11434'
  ) {
    this.llm = new ChatOllama({
      model: modelName,
      baseUrl: baseUrl,
      temperature: 0.7,
    });

    this.outputParser = new StringOutputParser();

    this.systemPrompt = `You are CarBrain, an expert automotive sales assistant specializing in the Mexican car market.

Your role:
- Help customers find their perfect vehicle through natural conversation
- Ask clarifying questions to understand their needs
- Provide personalized recommendations based on budget, preferences, and lifestyle
- Explain vehicle features, pricing, and financing options clearly
- Build trust through empathy and expertise

Communication style:
- Friendly and professional
- Use both Spanish and English naturally (bilingual)
- Focus on customer needs, not just features
- Be concise but informative
- Show enthusiasm for helping them find the right vehicle

When vehicles are found:
- Highlight key features that match their stated needs
- Explain value propositions (reliability, fuel efficiency, resale value)
- Suggest next steps (test drive, financing options, comparisons)

When no exact matches:
- Suggest similar alternatives with explanations
- Ask if they'd like to adjust their criteria
- Explain what vehicles are available in their range`;
  }

  async chat(
    userMessage: string,
    context: ConversationContext = { messages: [] }
  ): Promise<ConversationalResponse> {
    // Add user message to context
    const newContext: ConversationContext = {
      ...context,
      messages: [
        ...context.messages,
        { role: 'user', content: userMessage, timestamp: new Date() }
      ]
    };

    // Determine if this is a vehicle search query or follow-up
    const isSearchQuery = await this.isVehicleSearchQuery(userMessage, context);

    let vehicles: Vehicle[] | undefined;
    let searchContext = '';

    if (isSearchQuery) {
      // Perform semantic search
      const searchResult = await this.semanticSearch.searchWithContext(
        userMessage,
        this.convertToSearchContext(context.messages)
      );

      vehicles = searchResult.vehicles;
      newContext.currentVehicles = vehicles;
      newContext.lastQuery = userMessage;

      // Build context for LLM about search results
      if (vehicles.length > 0) {
        const scores = searchResult.relevanceScores?.map(item => item.score) || [];
        searchContext = this.buildVehicleContext(vehicles, scores);
      } else {
        searchContext = 'No vehicles found matching the current criteria.';
      }
    } else if (context.currentVehicles && context.currentVehicles.length > 0) {
      // Use existing vehicles from context for follow-up questions
      vehicles = context.currentVehicles;
      searchContext = this.buildVehicleContext(vehicles, []);
    }

    // Build conversation prompt
    const prompt = ChatPromptTemplate.fromMessages([
      ['system', this.systemPrompt],
      new MessagesPlaceholder('history'),
      ['system', `Current vehicle search results:\n${searchContext}`],
      ['human', '{input}']
    ]);

    // Convert context messages to LangChain format
    const history = this.convertToLangChainMessages(context.messages);

    // Generate response
    const chain = prompt.pipe(this.llm).pipe(this.outputParser);

    const response = await chain.invoke({
      history,
      input: userMessage
    });

    // Add assistant response to context
    newContext.messages.push({
      role: 'assistant',
      content: response,
      timestamp: new Date()
    });

    // Extract user preferences from conversation
    this.updateUserPreferences(newContext, userMessage);

    // Generate suggested follow-ups
    const suggestedFollowUps = this.generateFollowUpSuggestions(newContext, vehicles);

    const result: ConversationalResponse = {
      message: response,
      context: newContext,
      suggestedFollowUps
    };

    if (vehicles) {
      result.vehicles = vehicles;
    }

    return result;
  }

  private async isVehicleSearchQuery(
    message: string,
    context: ConversationContext
  ): Promise<boolean> {
    // Simple heuristic: if message contains vehicle-related keywords or is first message
    if (context.messages.length === 0) {
      return true;
    }

    const searchKeywords = [
      'busco', 'quiero', 'necesito', 'me interesa',
      'looking for', 'want', 'need', 'interested in',
      'suv', 'sedan', 'pickup', 'camioneta',
      'barato', 'económico', 'cheap', 'affordable',
      'automático', 'manual', 'automatic',
      'presupuesto', 'budget', 'precio', 'price'
    ];

    const lowerMessage = message.toLowerCase();
    const hasSearchKeyword = searchKeywords.some(keyword =>
      lowerMessage.includes(keyword.toLowerCase())
    );

    // Also consider it a search if asking to change/refine criteria
    const isRefinement = [
      'otro', 'otra', 'diferente', 'más', 'menos',
      'other', 'another', 'different', 'more', 'less'
    ].some(keyword => lowerMessage.includes(keyword));

    return hasSearchKeyword || isRefinement;
  }

  private buildVehicleContext(vehicles: Vehicle[], scores: number[]): string {
    const maxVehicles = 5;
    const topVehicles = vehicles.slice(0, maxVehicles);

    let context = `Found ${vehicles.length} vehicles. Top matches:\n\n`;

    topVehicles.forEach((vehicle, index) => {
      const score = scores[index] !== undefined ? ` (relevance: ${(scores[index] * 100).toFixed(0)}%)` : '';
      context += `${index + 1}. ${vehicle.year} ${vehicle.make} ${vehicle.model}${score}\n`;
      context += `   Price: $${vehicle.price.toLocaleString('es-MX')} MXN\n`;
      context += `   Mileage: ${vehicle.mileage.toLocaleString()} km\n`;
      context += `   Condition: ${vehicle.condition}\n`;

      if (vehicle.specification) {
        context += `   Engine: ${vehicle.specification.engine}\n`;
        context += `   Transmission: ${vehicle.specification.transmission}\n`;
        context += `   Fuel: ${vehicle.specification.fuelType}\n`;
      }

      context += '\n';
    });

    if (vehicles.length > maxVehicles) {
      context += `... and ${vehicles.length - maxVehicles} more vehicles available.\n`;
    }

    return context;
  }

  private convertToSearchContext(messages: ConversationMessage[]): Array<{ role: 'user' | 'assistant'; content: string }> {
    return messages.map(msg => ({
      role: msg.role === 'system' ? 'assistant' : msg.role,
      content: msg.content
    }));
  }

  private convertToLangChainMessages(messages: ConversationMessage[]): BaseMessage[] {
    return messages.map(msg => {
      switch (msg.role) {
        case 'system':
          return new SystemMessage(msg.content);
        case 'user':
          return new HumanMessage(msg.content);
        case 'assistant':
          return new AIMessage(msg.content);
        default:
          return new HumanMessage(msg.content);
      }
    });
  }

  private updateUserPreferences(context: ConversationContext, message: string): void {
    if (!context.userPreferences) {
      context.userPreferences = {};
    }

    const lowerMessage = message.toLowerCase();

    // Extract budget mentions
    const budgetMatch = message.match(/\$?\d{1,3}[,\d]*(?:\s*(?:mil|k|thousand))?/gi);
    if (budgetMatch && budgetMatch.length >= 2) {
      const amounts = budgetMatch.map(m => {
        let num = parseFloat(m.replace(/[$,]/g, ''));
        if (m.toLowerCase().includes('mil') || m.toLowerCase().includes('k')) {
          num *= 1000;
        }
        return num;
      });
      context.userPreferences.budget = {
        min: Math.min(...amounts),
        max: Math.max(...amounts)
      };
    }

    // Extract make preference
    const makes = ['honda', 'toyota', 'nissan', 'mazda', 'volkswagen', 'ford', 'chevrolet', 'hyundai', 'kia'];
    const mentionedMake = makes.find(make => lowerMessage.includes(make));
    if (mentionedMake) {
      context.userPreferences.make = mentionedMake;
    }

    // Extract body type
    const bodyTypes = ['suv', 'sedan', 'pickup', 'hatchback', 'coupe', 'camioneta'];
    const mentionedType = bodyTypes.find(type => lowerMessage.includes(type));
    if (mentionedType) {
      context.userPreferences.bodyType = mentionedType;
    }
  }

  private generateFollowUpSuggestions(
    context: ConversationContext,
    vehicles?: Vehicle[]
  ): string[] {
    const suggestions: string[] = [];

    if (!vehicles || vehicles.length === 0) {
      suggestions.push('¿Qué presupuesto tienes en mente?');
      suggestions.push('What type of vehicle are you looking for?');
      suggestions.push('¿Prefieres automático o manual?');
      return suggestions.slice(0, 3);
    }

    // If we have vehicles, suggest next actions
    if (vehicles.length > 1) {
      suggestions.push('¿Quieres comparar dos de estos vehículos?');
      suggestions.push('Tell me more about the first option');
    }

    suggestions.push('¿Te gustaría agendar una prueba de manejo?');
    suggestions.push('What financing options are available?');
    suggestions.push('¿Hay otros colores disponibles?');

    return suggestions.slice(0, 3);
  }

  async resetConversation(): Promise<ConversationContext> {
    return { messages: [] };
  }

  getContext(context: ConversationContext): ConversationContext {
    return { ...context };
  }
}
