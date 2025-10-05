# CarBrain AI Assistant

An enterprise-grade AI-powered sales assistant for automotive dealerships, built with TypeScript, RAG, and fine-tuned LLMs.

## Overview

CarBrain is an intelligent sales assistant that helps car dealerships provide personalized customer experiences through:

- **Semantic Vehicle Search** - Natural language queries for vehicle inventory
- **Fine-Tuned AI Models** - Domain-specific automotive knowledge and sales expertise
- **RAG Integration** - Real-time access to inventory, pricing, and specifications
- **Clean Architecture** - Scalable, maintainable enterprise design patterns

## Technology Stack

### Core Technologies

- **Frontend:** React + TypeScript + TailwindCSS
- **Backend:** Node.js + TypeScript + Clean Architecture
- **AI/ML:** OpenAI (gpt-3.5-turbo) or Local LLM (Ollama) + RAG + pgvector
- **Database:** PostgreSQL + Vector Database (pgvector)
- **Infrastructure:** Docker + AWS Lambda

### Key Features

- Real-time vehicle recommendations
- Multilingual support (Spanish/English)
- Mexican market specialization
- Lead scoring and qualification
- Conversation context management
- A/B testing framework for models

## Architecture

This project follows Clean Architecture principles with clear separation of concerns:

- **Domain Layer:** Business entities, value objects, and domain services
- **Application Layer:** Use cases and business workflows
- **Interface Adapters:** Controllers, presenters, and gateways
- **Infrastructure Layer:** External services, databases, and frameworks

## Getting Started

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- TypeScript
- Git

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd carbrain-ai-assistant

# Install dependencies
npm install

# Start development environment
docker-compose up -d
npm run dev
```

## Project Structure

```
carbrain-ai-assistant/
├── src/
│   ├── domain/           # Business logic and entities
│   ├── application/      # Use cases and workflows
│   ├── infrastructure/   # External services and data
│   └── interfaces/       # Controllers and adapters
├── tests/               # Test suites
├── docs/               # Documentation
└── docker/             # Docker configurations
```

## Contributing

This project follows professional development standards:

- Clean Architecture principles
- Comprehensive testing
- Type safety with TypeScript
- Conventional commit messages
- Code review process

## License

Private development project for portfolio demonstration.

---

**Built with enterprise-grade standards for automotive industry innovation.**

Project: Carbrain AI Sales Assistant Platform

Business Context:
Enterprise-grade AI-powered sales assistant for used car marketplace operations, focusing on customer engagement, vehicle recommendation, and sales process automation.

Core Business Requirements:

- Vehicle Discovery: AI-powered search and recommendations
- Customer Interaction: Intelligent chat assistant for inquiries
- Lead Qualification: Automated scoring and routing
- Appointment Scheduling: Test drives and inspections
- Financing Assistance: Loan pre-qualification and options
- Inventory Management: Real-time vehicle availability

Key Value Propositions:

- Personalized vehicle recommendations using customer preferences
- 24/7 multilingual customer support (Spanish/English)
- Automated lead nurturing and follow-up
- Intelligent pricing negotiations and trade-in evaluations
- Seamless integration with existing dealership operations

Fine-Tuning Opportunities:

- Automotive Domain: Vehicle specifications, features, pricing patterns
- Customer Conversations: Sales dialogue, objection handling, financing discussions
- Mexican Market: Local regulations, financing options, cultural preferences
- Multilingual Support: Spanish automotive terminology and sales patterns

This positions the project as a sophisticated enterprise solution demonstrating deep AI/ML expertise in a real-world business context.

# Carbrain AI Sales Assistant - Architecture & Design

## Table of Contents

- [Clean Architecture Design](#clean-architecture-design)
- [AI/ML Strategy](#aiml-strategy-with-fine-tuning)
- [Project Summary](#project-summary)

---

## Clean Architecture Design

### Domain Layer (Pure Business Logic)

#### Entities

- **Vehicle** - make, model, year, price, mileage, condition, features
- **Customer** - preferences, budget, financing profile, communication history
- **Lead** - qualification score, stage, assigned agent, follow-up actions
- **Appointment** - test drive, inspection, financing meeting
- **Conversation** - customer interactions, AI responses, context
- **FinancingOption** - loan terms, monthly payment, down payment

#### Value Objects

- **VehicleSpecification** - engine, transmission, fuel type, safety features
- **PriceRange** - min, max, monthly budget
- **Location** - dealership, delivery address
- **ContactPreference** - email, SMS, WhatsApp, phone

#### Domain Services

- **VehicleRecommendationService** - matching algorithm
- **PricingCalculationService** - financing, trade-in valuation
- **LeadScoringService** - qualification assessment

### Use Cases (Application Layer)

#### Customer Interaction Use Cases

- `ProcessCustomerInquiry`
- `GenerateVehicleRecommendations`
- `ScheduleTestDrive`
- `CalculateFinancingOptions`
- `QualifyLead`

#### AI Agent Use Cases

- `ProcessNaturalLanguageQuery`
- `GeneratePersonalizedResponse`
- `UpdateConversationContext`
- `TriggerFollowUpActions`

### Interface Adapters Layer

#### Controllers

- **ChatController** - React frontend communication
- **VehicleController** - inventory management
- **CustomerController** - profile management
- **AppointmentController** - scheduling system

#### Presenters

- **VehicleRecommendationPresenter**
- **ConversationPresenter**
- **FinancingOptionsPresenter**

#### Gateways/Repositories

- `IVehicleRepository`
- `ICustomerRepository`
- `IConversationRepository`
- `IAIModelGateway`
- `IVectorDatabaseGateway`

### Infrastructure Layer

#### External Services

- **PostgreSQLVehicleRepository**
- **PgVectorDatabase**
- **OpenAILLMService** (production) or **OllamaLLMService** (local)
- **AWSS3FileStorage**
- **SendGridNotificationService**

#### Frameworks

- **React + TypeScript** (Frontend)
- **Node.js + Express** (API Gateway)
- **Docker** (Local Development)
- **AWS Lambda** (Production Deployment)

---

## AI/ML Strategy with Fine-Tuning

### Multi-Model Architecture

#### Base Model Strategy

- **Production:** OpenAI gpt-3.5-turbo (fast, high-quality responses)
- **Local/Dev:** Llama 3.2 1B (via Ollama) for cost-free development
- **Embedding Model:** text-embedding-3-small (OpenAI) or nomic-embed-text (Ollama)

### Fine-Tuning Approach

#### 1. Domain Fine-Tuning (Knowledge/Facts)

**Purpose:** Teach the model automotive domain knowledge
**Data Type:** Factual, structured information

**Training Data Examples:**

```
User: What's the difference between AWD and 4WD?
Assistant: AWD (All-Wheel Drive) automatically distributes power to all wheels
continuously, ideal for everyday driving and light off-road conditions. 4WD
(Four-Wheel Drive) allows manual engagement for challenging terrain like mud
or snow, typically found in trucks and SUVs.

User: ¿Qué es un crédito automotriz?
Assistant: Un crédito automotriz es un préstamo específico para comprar vehículos.
En México, los bancos como BBVA, Santander y Banamex ofrecen tasas desde 9% anual.
Típicamente requieren 20% de enganche y plazos de 12 a 60 meses.
```

**What it learns:**

- Automotive terminology and specifications
- Mexican financial products and regulations
- Vehicle features and comparisons
- Local market knowledge (brands, dealers, pricing)

#### 2. Conversation Pattern Fine-Tuning (Behavior/Style)

**Purpose:** Teach the model how to sell, not just inform
**Data Type:** Conversational flows, sales techniques

**Training Data Examples:**

```
User: Me interesa ese Honda Civic pero está caro.
Assistant: Entiendo tu preocupación por el precio. El Civic es una excelente
inversión - tiene el menor costo de mantenimiento en su categoría y excelente
valor de reventa. ¿Te ayudo a calcular un financiamiento que se ajuste a tu
presupuesto? Con $50,000 de enganche, serían solo $4,200 mensuales.

User: I'm not sure about financing.
Assistant: I totally understand - financing is a big decision. Many of our
customers initially felt the same way. What I can do is show you a no-obligation
quote with different payment options. You'll see exactly what works for your
budget. Would 36 or 48 months work better for your monthly payments?
```

**What it learns:**

- Objection handling techniques
- Trust building and empathy
- Transitioning to next steps (test drive, financing)
- Cultural communication styles (Mexican vs US sales approaches)

#### Combined Approach Benefits

**Domain + Conversation = Professional Sales AI**

- Accurate information + Persuasive delivery
- Technical knowledge + Emotional intelligence
- Facts + Sales psychology

**Implementation Strategy:**

1. Start with domain fine-tuning (foundation knowledge)
2. Add conversation patterns (sales effectiveness)
3. Iterative improvement based on real customer interactions

### Training Data Sources

#### Domain Knowledge Dataset

- **Vehicle specifications:** Makes, models, features, comparisons
- **Mexican automotive market:** Popular brands, pricing trends, regulations
- **Financing information:** Bank products, loan terms, requirements
- **Service knowledge:** Maintenance, warranties, insurance

#### Conversation Pattern Dataset

- **Sales dialogues:** Successful customer interactions
- **Objection handling:** Common concerns and responses
- **Cultural patterns:** Mexican vs international communication styles
- **Multilingual examples:** Spanish/English code-switching

#### Sources to Generate/Collect

1. Automotive websites scraping (MercadoLibre, AutoTrader Mexico)
2. Bank financing product information
3. Synthetic conversation generation (using GPT-4 to create examples)
4. Real dealership transcripts (anonymized)
5. Automotive review sites and forums

### RAG System Implementation

#### Vector Database Strategy

- **Vehicle Inventory:** Real-time embeddings of available cars
- **Knowledge Base:** Automotive specs, financing options, regulations
- **Conversation History:** Customer context and preferences
- **Document Store:** Manuals, warranties, financing documents

#### Vector Database Content

**Vehicle Embeddings:**

- Full vehicle descriptions with specifications
- Customer review summaries
- Comparison data (similar vehicles)

**Knowledge Base Embeddings:**

- FAQ responses
- Financing explanations
- Feature comparisons
- Maintenance guidelines

#### AI Agent Orchestration

- **Intent Classification:** Customer inquiry routing
- **Context Management:** Conversation state and memory
- **Action Planning:** Next best actions (test drive, financing, follow-up)
- **Response Generation:** Personalized, contextual responses

#### External APIs (Optional Enhancement)

**Real-Time Data:**

- Market pricing APIs (KBB, Edmunds equivalent for Mexico)
- VIN decoding services for detailed specifications
- Credit scoring APIs for financing pre-qualification

**Why This Data Structure:**

- **Scalable:** Supports growth from demo to enterprise
- **Realistic:** Mirrors actual car dealership systems
- **AI-Ready:** Optimized for embedding generation and retrieval
- **Privacy-Conscious:** Customer data stays local

### MLOps Pipeline

#### Model Deployment

- **A/B Testing:** Compare base vs fine-tuned model performance
- **Performance Monitoring:** Response quality, customer satisfaction
- **Continuous Learning:** Model updates from new conversation data
- **Fallback Strategy:** Graceful degradation to base model if needed

#### Optimization Considerations

- Local deployment for privacy and cost efficiency
- Real-time inference with conversation context
- Model versioning and rollback capabilities
- Performance metrics and automated retraining triggers

---

## Project Summary

### Enterprise Solution Overview

A production-ready automotive AI platform demonstrating advanced TypeScript development, fine-tuned LLMs, RAG systems, and Clean Architecture - perfectly aligned with the TypeScript AI Engineer position requirements.

### Technology Stack Coverage

✅ **React + TypeScript** (frontend)
✅ **Node.js + TypeScript** (microservices backend)
✅ **Fine-Tuned LLM** (automotive domain specialization)
✅ **RAG + Vector Database** (intelligent vehicle search)
✅ **AI Agent Orchestration** (sales conversation management)
✅ **AWS Deployment** (Lambda, RDS, S3)
✅ **MLOps Pipeline** (A/B testing, monitoring, deployment)
✅ **Clean Architecture** (enterprise patterns)

### Unique Value Propositions

- **Fine-tuning expertise** beyond basic LLM usage
- **Automotive domain knowledge** with Mexican market focus
- **Multilingual AI** (Spanish/English code-switching)
- **Enterprise architecture** with proper separation of concerns
- **Cost-effective local deployment** strategy

---
