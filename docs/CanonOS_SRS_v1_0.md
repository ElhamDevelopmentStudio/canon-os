# CanonOS

## Software Requirements Specification

_A Personal Media Intelligence System for Movies, Series, Anime, Novels, and Audiobooks_

**Version:** 1.0
**Date:** May 1, 2026
**Prepared for:** Personal use and future product development
**Prepared by:** GPT-5.5 Pro

**Core question:** Given my history, standards, mood, fatigue, and dislike of generic media, what is actually worth my time?


---

## Document Control

| Field | Value |
| --- | --- |
| Document name | CanonOS Software Requirements Specification |
| Product name | CanonOS |
| Product type | Single-user personal media intelligence system, expandable to multi-user product |
| Version | 1.0 |
| Date | May 1, 2026 |
| Primary user | A highly experienced movie, series, anime, novel, and audiobook consumer with high standards and fatigue from generic media |
| Primary purpose | Define exactly what CanonOS must do, how it should behave, what data it needs, and how success will be measured |

### Revision History

| Version | Date | Author | Change |
| --- | --- | --- | --- |
| 1.0 | 2026-05-01 | GPT-5.5 Pro | Initial complete SRS for CanonOS |

## Section Map

- 1. Introduction - why the project exists and what this SRS covers.
- 2. Product Vision - the CanonOS product concept and guiding principles.
- 3. Users and Use Cases - who uses the system and in what situations.
- 4. Product Scope - what is in scope, out of scope, and assumed.
- 5. System Architecture - the major parts of the product and how they interact.
- 6. Feature Requirements - exact functional requirements by module.
- 7. Data Requirements - entities, fields, relationships, and storage rules.
- 8. AI and Recommendation Requirements - how intelligence should work and what it must avoid.
- 9. User Interface Requirements - required screens and user experience behavior.
- 10. External Interfaces - integrations, APIs, model providers, and imports.
- 11. Non-Functional Requirements - privacy, security, performance, reliability, and usability.
- 12. Workflows and User Journeys - step-by-step product behavior.
- 13. Testing and Acceptance - how to prove the product is working.
- 14. Release Plan - what to build first and what comes later.
- 15. Risks, Open Decisions, and Appendices - constraints, recommendations, glossary, and examples.


---

## 1. Introduction

### 1.1 Purpose

This Software Requirements Specification defines CanonOS, a personal media intelligence system designed for a user who has consumed a very large amount of movies, TV series, anime, novels, and audiobooks and now needs a reliable way to find media that is genuinely worth their time.

CanonOS is not a normal recommendation app. It is a decision system, taste model, anti-generic filter, queue manager, reflection journal, and discovery engine. Its purpose is to help the user choose better, waste less time, understand their evolving taste, and avoid low-value consumption loops.

### 1.2 Problem Statement

The user has watched, read, and listened extensively. Basic recommendation systems are no longer useful because they mostly suggest obvious classics, popular current releases, or generic similarity matches. The user needs a system that understands deeper personal preference, current mood, media fatigue, narrative quality, genericness risk, adaptation quality, and cross-medium patterns.

CanonOS must also preserve a critical distinction: the user does not believe that all modern movies or series are terrible. The system must be skeptical of generic modern output while still actively finding modern exceptions that are original, high-quality, or personally aligned.

### 1.3 Intended Audience

- Product owner: the user who will use CanonOS personally and may later evolve it into a larger project.
- Designer: anyone designing the screens, workflows, and product behavior.
- Developer: anyone building the front end, backend, data layer, and AI services.
- AI engineer: anyone designing scoring, embeddings, taste modeling, and LLM prompts.
- QA tester: anyone validating whether the system meets the functional and non-functional requirements.
- Future contributor: anyone extending CanonOS into a mobile app, public product, or multi-user system.

### 1.4 Product Definition

CanonOS is a local-first or private-first web application that stores the user media library, learns the user taste profile, evaluates candidate media, recommends what to consume next, identifies genericness risk, tracks aftertaste, and helps the user build a meaningful personal canon across movies, series, anime, novels, and audiobooks.

### 1.5 Product Goal in One Sentence

CanonOS should answer: Given my history, standards, current state, fatigue, and dislike of generic media, what is actually worth my time right now?

### 1.6 Success Criteria

- The user trusts CanonOS before starting a movie, show, anime, novel, or audiobook.
- The system reduces time wasted on generic or low-value media.
- The system discovers worthwhile works that normal platforms do not surface.
- The system improves as the user logs more reactions and aftertaste entries.
- The system recommends fewer items, but with higher relevance.
- The system can recommend not watching, pausing, sampling, dropping, reading, or listening instead of forcing consumption.
- The system fairly separates modern works that are generic from modern works that are genuinely worthwhile.
- The user can inspect why each recommendation was made.

### 1.7 Definitions

| Term | Definition |
| --- | --- |
| Aftertaste | The user reaction after finishing or dropping a work, especially whether it stayed meaningful after time passed. |
| Candidate | A movie, series, anime, novel, audiobook, or other work the user is considering. |
| Canon | The user personal collection of works that are meaningful, excellent, formative, or worth preserving. |
| Genericness | The degree to which a work feels formulaic, hollow, algorithmic, derivative, filler-heavy, or lacking authorial voice. |
| Media item | Any consumable work: movie, TV series, anime, book, audiobook, manga, light novel, or related format. |
| Mood fit | How well a candidate matches the user current energy, focus, available time, emotional appetite, and medium preference. |
| Narrative DNA | A structured representation of story properties such as pacing, themes, character arcs, atmosphere, ending type, conflict, and moral complexity. |
| Personal fit | How well a candidate matches the user stable taste profile. |
| Regret risk | The estimated risk that the user will feel the work wasted time after starting or finishing it. |
| Worthiness score | The final score expressing whether a work is worth the user time, considering quality, personal fit, mood, risk, and commitment cost. |


---

## 2. Product Vision

### 2.1 Vision Statement

CanonOS is a personal operating system for media judgment. It should act like a private critic, historian, librarian, mood-aware assistant, anti-generic filter, and long-term taste memory. It should make the user media life more intentional, not merely more active.

### 2.2 Product Principles

| Principle | Meaning |
| --- | --- |
| Protect attention | The system must value the user time more than engagement. It may recommend skipping, dropping, pausing, or consuming nothing. |
| Personal over popular | The system must not equate popularity, awards, social hype, or platform promotion with personal value. |
| Explain every judgment | The system must provide reasons, risk signals, confidence, and tradeoffs for recommendations. |
| Respect nuance about modern media | The system must not classify a work as bad because it is modern. It must identify modern exceptions and avoid lazy anti-modern bias. |
| Learn from negative taste | Dislikes, dropped works, regret, boredom, and frustration must be treated as important training signals. |
| Cross-medium intelligence | The system must connect movies, series, anime, novels, and audiobooks through story structure, mood, themes, and user reaction. |
| Small set of strong choices | The system should usually provide 1 to 5 carefully selected options rather than long recommendation lists. |
| Evolve with the user | Taste drift, burnout, changing standards, and medium fatigue must be tracked over time. |
| No manipulation loop | The system must not include dark patterns, infinite-scroll addiction loops, or engagement maximization. |

### 2.3 Product Positioning

| CanonOS is | CanonOS is not |
| --- | --- |
| A private media decision system | A generic social media tracker |
| A taste memory and evaluator | A popularity chart |
| A mood-aware queue manager | A simple watchlist |
| A cross-medium discovery engine | Only a movie app |
| An anti-waste tool | A binge-maximizing engagement product |
| A critic that can say no | A recommender that always suggests more |

### 2.4 Primary Product Outcome

After using CanonOS for several months, the user should have a clearer picture of their taste, a cleaner queue, fewer regretted starts, more deep-cut discoveries, better medium balance, and higher satisfaction per hour spent.

### 2.5 Product Modes

| Mode | Purpose |
| --- | --- |
| Library Mode | Track every consumed, dropped, paused, and planned work. |
| Evaluate Mode | Analyze a candidate and decide commit, sample, delay, skip, read, listen, or watch. |
| Tonight Mode | Pick what to consume now based on mood, time, energy, and risk tolerance. |
| Reflect Mode | Capture aftertaste, regret, memorability, and taste updates. |
| Discovery Mode | Find obscure, older, foreign, underwatched, or cross-medium recommendations. |
| Canon Mode | Build curated seasons, themes, lists, and personal canon collections. |
| Detox Mode | Help the user drop or avoid low-value consumption loops. |


---

## 3. Users and Use Cases

### 3.1 Primary Persona

| Field | Value |
| --- | --- |
| Persona name | The Exhausted Connoisseur |
| Media history | Hundreds or thousands of watched/read/listened works across movies, TV, anime, novels, and audiobooks |
| Core frustration | Most obvious recommendations are already known, and many modern mainstream works feel generic or hollow |
| Need | A system that understands deep taste, rejects shallow recommendations, and helps select high-value media |
| Important nuance | The user does not reject all modern media. CanonOS must find modern exceptions and avoid automatic anti-modern bias |
| Common situation | The user wants something excellent but is tired, indecisive, skeptical of hype, and at risk of starting something mediocre |
| Definition of value | A work is valuable if it is worth the time, memorable, emotionally or intellectually meaningful, or useful in expanding taste |

### 3.2 Secondary Personas

| Persona | Use |
| --- | --- |
| Future product user | A person with a large media history who wants better recommendations and media discipline. |
| Developer/admin | Maintains metadata connectors, AI prompts, database, backups, and releases. |
| Researcher/curator | Uses CanonOS to study taste evolution, genre patterns, themes, and canon formation. |

### 3.3 Primary Use Cases

| ID | Use case | Description |
| --- | --- | --- |
| UC-01 | Evaluate a movie before watching | User enters a movie title; CanonOS returns commit/sample/delay/skip with reasons and risks. |
| UC-02 | Choose what to consume tonight | User enters mood, time, energy, and medium preference; CanonOS returns 1 to 5 choices. |
| UC-03 | Log aftertaste | User finishes or drops a work and records what worked, what failed, and whether it was worth the time. |
| UC-04 | Avoid a low-value series | CanonOS detects high genericness risk or weak payoff and recommends sample or skip. |
| UC-05 | Discover a deep cut | User asks for something beyond obvious classics; CanonOS suggests obscure or underexplored works. |
| UC-06 | Balance media formats | System suggests audiobook or novel when visual media fatigue is high. |
| UC-07 | Choose adaptation path | System recommends read first, watch first, audiobook first, skip adaptation, or stop at a certain point. |
| UC-08 | Track taste change | User reviews monthly insights about what they are rating higher or lower over time. |
| UC-09 | Build a personal canon season | User creates a themed exploration path such as moral collapse or modern works worth it. |
| UC-10 | Drop without guilt | System recommends abandoning a work after a predefined sample rule fails. |

### 3.4 Main User Needs

- The user needs to avoid obvious recommendations they already know.
- The user needs the system to understand why a work succeeds or fails for them.
- The user needs cross-medium awareness across movies, shows, anime, novels, and audiobooks.
- The user needs the system to account for mood, fatigue, time, and focus.
- The user needs honest skip and drop recommendations.
- The user needs a way to distinguish quality from addictiveness.
- The user needs the system to find modern works that are exceptions to the genericness problem.
- The user needs explanations, not black-box scores.


---

## 4. Product Scope

### 4.1 In Scope

- Personal media library tracking across movies, series, anime, novels, audiobooks, manga, and light novels.
- Detailed rating dimensions beyond a single 1 to 10 score.
- Candidate evaluation with recommendation outcome, confidence, reasons, warnings, and best use case.
- Anti-genericness scoring and red-flag detection.
- Mood-aware Tonight Mode for choosing what to consume now.
- Aftertaste logging and taste evolution reports.
- Deep-cut discovery and queue curation.
- Cross-medium adaptation guidance.
- Personal canon building and curated seasons.
- Completion detox rules for sampling, dropping, pausing, and time saved.
- Private-first data storage and export.
- AI-assisted analysis using user data, metadata, notes, and legal/available summaries or descriptions.

### 4.2 Out of Scope for MVP

- Public social network features such as followers, likes, comments, and public profiles.
- Automatic piracy, scraping, or storage of copyrighted full scripts, subtitles, books, or audiobooks without permission.
- Streaming playback inside CanonOS.
- Replacing professional mental health support or addiction treatment.
- Guaranteeing objective artistic truth; CanonOS optimizes for the user personal value and transparent reasoning.
- Building a full mobile app in the first release, unless chosen as a separate implementation track.
- Collaborative multi-user recommendation models in MVP.
- Real-time availability by region in MVP, unless a metadata provider is integrated.

### 4.3 Assumptions

| ID | Assumption |
| --- | --- |
| A-01 | The first version is for one primary user. |
| A-02 | The user can manually enter or import a large initial media history. |
| A-03 | The system will use external metadata providers where legally and technically available, but must still work with manual entries. |
| A-04 | AI model providers may change; the architecture must keep prompts, evaluations, and model configuration modular. |
| A-05 | The system must be useful before perfect automation exists. |
| A-06 | The user values accuracy, depth, and honesty more than speed or entertainment polish. |
| A-07 | The user wants skepticism toward generic output, not blanket hostility toward all modern works. |

### 4.4 Constraints

| ID | Constraint |
| --- | --- |
| C-01 | Data privacy must be treated as a core requirement because media history, mood logs, and personal notes are sensitive. |
| C-02 | The system must not require perfect external metadata to function. |
| C-03 | The system must not rely only on public ratings or popularity. |
| C-04 | The system must be explainable enough that the user can challenge and correct it. |
| C-05 | The system must avoid engagement-maximizing design patterns. |
| C-06 | Any copyrighted full content ingestion must require user rights or legally available sources. |

### 4.5 Recommended MVP Boundary

The MVP should not try to become a complete media platform. The MVP should prove the core loop: log history, evaluate a candidate, choose tonight, record aftertaste, update taste profile. All other modules should be designed but not fully built until the core loop is trusted.

| MVP included | MVP deferred |
| --- | --- |
| Library, detailed ratings, simple imports | Full automated syncing with every platform |
| Candidate Evaluator | Advanced narrative parsing of full scripts/books |
| Tonight Mode | Full mobile app and notifications |
| Aftertaste Log | Public social features |
| Basic TasteGraph | Full graph visualization engine |
| Anti-Generic Filter v1 | Complex critic council debate UI |


---

## 5. System Architecture

### 5.1 Reference Architecture

CanonOS should be built as a modular private-first application. The first implementation may be a web app, but the system should be structured so future mobile, desktop, and multi-user versions can reuse the backend, data model, and AI services.

| Layer | Responsibilities |
| --- | --- |
| User Interface Layer | Dashboard, Library, Candidate Evaluator, Tonight Mode, Aftertaste Log, Queue, Canon Seasons, Settings. |
| Application Service Layer | Business logic for media logging, candidate evaluation, scoring, queue generation, taste updates, and detox rules. |
| AI Reasoning Layer | LLM prompts, embeddings, taste inference, narrative analysis, critic council, explanations, and confidence scoring. |
| Data Layer | Media items, user reactions, scorecards, mood check-ins, queues, canon seasons, embeddings, and audit logs. |
| Integration Layer | CSV imports, external metadata providers, optional platform connectors, model providers, and export APIs. |
| Privacy/Security Layer | Authentication, encryption, access control, backup, deletion, privacy controls, and data export. |

### 5.2 High-Level System Diagram

```text
User
  |
  v
CanonOS Web UI
  |-- Library Manager
  |-- Candidate Evaluator
  |-- Tonight Mode
  |-- Aftertaste Log
  |-- Canon Seasons
  |
  v
Application Services
  |-- TasteGraph Service
  |-- Anti-Generic Filter
  |-- Queue Service
  |-- Detox Rules Service
  |-- Adaptation Intelligence
  |
  v
AI Reasoning and Scoring Layer
  |-- LLM reasoning
  |-- Embedding similarity
  |-- Narrative DNA extraction
  |-- Critic Council prompts
  |
  v
Database + Vector Store + Files
  |
  v
Optional Metadata Providers / Imports / Exports
```

### 5.3 Recommended Technical Stack

**Recommendation:** The SRS is technology-agnostic, but this stack provides a concrete build path for an ambitious but manageable first version.

| Area | Recommended choice |
| --- | --- |
| Frontend | Next.js or React web application with a clean dashboard-first interface. |
| Backend | Python FastAPI or Node.js API. Python is preferred if narrative analysis and ML workflows become important. |
| Database | PostgreSQL for production. SQLite is acceptable for an early local prototype. |
| Vector storage | pgvector or a separate vector database for embeddings and similarity search. |
| AI layer | Configurable LLM provider for reasoning, summarization, explanation, and structured extraction. |
| Embeddings | Configurable embedding model for comparing user notes, media descriptions, themes, and narrative DNA. |
| Authentication | Single-user password or local login for MVP; full auth provider only if multi-user later. |
| Deployment | Local Docker Compose for private use, then private cloud deployment if desired. |
| Exports | JSON and CSV export from day one. |

### 5.4 Core Data Flow

1. User adds or imports media history.
2. CanonOS normalizes each item into a common media item schema.
3. User adds ratings, tags, reactions, and aftertaste notes.
4. TasteGraph updates stable taste dimensions and negative taste signals.
5. User submits a candidate or opens Tonight Mode.
6. System collects candidate metadata, user history, mood state, queue state, fatigue patterns, and relevant similar works.
7. AI/scoring layer computes fit, risk, genericness, mood fit, commitment cost, and confidence.
8. System returns a decision, explanation, warnings, and suggested action.
9. User consumes, drops, delays, or ignores the recommendation.
10. User records aftertaste and the model updates future behavior.

### 5.5 Architecture Requirements

| ID | Requirement | Priority | Acceptance criteria |
| --- | --- | --- | --- |
| ARCH-01 | CanonOS shall separate UI, business logic, AI reasoning, data persistence, and external integrations. | High | Code modules are independently testable and can be modified without rewriting the full application. |
| ARCH-02 | CanonOS shall support manual media entry even when no external metadata provider is available. | High | A user can create a complete candidate evaluation using only manually entered title, type, year, and notes. |
| ARCH-03 | CanonOS shall store all user-specific taste and reaction data in a private database controlled by the user. | High | The app can show all stored user ratings, notes, moods, and aftertaste entries and can export them. |
| ARCH-04 | CanonOS shall keep AI provider configuration replaceable. | Medium | Changing the LLM provider does not require rewriting feature modules. |
| ARCH-05 | CanonOS shall log AI inputs, outputs, model version, prompt version, and confidence for recommendation traceability. | High | Each evaluation has an audit record viewable by the user or developer. |


---

## 6. Feature Requirements

This section defines the exact functional modules CanonOS must include. Each requirement has an ID, priority, and acceptance criteria. Priority values are High, Medium, or Low. High means required for MVP or essential system trust. Medium means important for V1. Low means optional or future release.

### 6.1 Library Manager

The Library Manager is the source of truth for all consumed, dropped, paused, planned, and candidate media. Without a strong library, every other module becomes unreliable.

#### 6.1.1 Required Behavior

- Store movies, series, anime, novels, audiobooks, manga, light novels, documentaries, and other user-defined formats.
- Allow manual entry, editing, deletion, import, filtering, sorting, tagging, and search.
- Track status: completed, watching, reading, listening, paused, dropped, want, candidate, archived, and blocked.
- Support detailed scorecards, notes, and aftertaste links.
- Represent series and anime as parent works with seasons, arcs, or episodes where needed.

| ID | Requirement | Priority | Acceptance criteria |
| --- | --- | --- | --- |
| LIB-01 | The system shall allow the user to create a media item with title, medium, year, creator, country/language, status, and notes. | High | User can save a valid item with required fields and see it in the library. |
| LIB-02 | The system shall support at least these media types: movie, TV series, anime, novel, audiobook, manga, light novel, documentary, and custom. | High | All listed media types are selectable and filterable. |
| LIB-03 | The system shall support status values: completed, in progress, paused, dropped, want, candidate, archived, blocked. | High | Status can be changed and status history is recorded. |
| LIB-04 | The system shall provide library search by title, creator, tags, themes, medium, year, status, score, and text notes. | High | Search returns relevant results within 1 second for 10,000 records in normal use. |
| LIB-05 | The system shall support bulk import from CSV or JSON. | High | User can import at least 500 items in one operation with validation errors shown clearly. |
| LIB-06 | The system shall allow duplicate detection and merging for items with similar title/year/medium. | Medium | Potential duplicates are flagged and user can merge or dismiss them. |
| LIB-07 | The system shall store multiple ratings per item, including overall score, worthiness, genericness, regret, memorability, and rewatch/read value. | High | Each item detail page shows all score dimensions and can edit them. |
| LIB-08 | The system shall support user-defined tags, themes, tropes, and red flags. | High | User can create, apply, rename, delete, and filter custom tags. |
| LIB-09 | The system shall track consumption dates and time spent where available. | Medium | Finished date, started date, dropped date, and estimated duration are saved and visible. |
| LIB-10 | The system shall allow the user to mark a work as never recommend. | High | Blocked works do not appear in recommendation outputs unless explicitly requested. |

### 6.2 TasteGraph

TasteGraph is the living model of the user taste. It must learn from positive and negative reactions, not just ratings. It must store stable preferences, current fatigue, and taste evolution over time.

| ID | Requirement | Priority | Acceptance criteria |
| --- | --- | --- | --- |
| TG-01 | The system shall maintain a taste profile containing positive signals, negative signals, preferred themes, disliked patterns, medium preferences, and current fatigue indicators. | High | Taste Profile page displays current positive, negative, and fatigue signals. |
| TG-02 | The system shall update TasteGraph when the user completes, drops, rates, or logs aftertaste for a work. | High | New aftertaste entries trigger visible changes or a recorded no-change decision. |
| TG-03 | The system shall distinguish stable taste from temporary mood or fatigue. | High | Taste insights label signals as stable, recent, or temporary. |
| TG-04 | The system shall learn from dropped and regretted works as strongly as from loved works. | High | Dropped/regretted works influence red flags and future skip recommendations. |
| TG-05 | The system shall calculate taste vectors for themes, pacing, atmosphere, character depth, originality, endings, and medium type. | Medium | Taste vector values are visible in developer or advanced view. |
| TG-06 | The system shall produce monthly taste evolution summaries. | Medium | Monthly report shows changes, repeated patterns, and recommendations for adjustment. |
| TG-07 | The system shall allow the user to correct taste assumptions. | High | Each taste insight has accept, reject, edit, or ignore controls. |
| TG-08 | The system shall preserve the distinction between modern genericness and modern quality exceptions. | High | Taste profile includes separate fields for modern fatigue and modern exceptions. |
| TG-09 | The system shall identify overconsumption patterns such as too many long series, too many mid-tier shows, or visual-media fatigue. | Medium | System displays fatigue warnings based on recent logs. |
| TG-10 | The system shall store enough history to explain why a taste insight exists. | High | Each insight can show example works that caused or support it. |

### 6.3 Candidate Evaluator

The Candidate Evaluator is the main decision tool. It must decide whether a candidate should be watched, read, listened to, sampled, delayed, skipped, or blocked.

| ID | Requirement | Priority | Acceptance criteria |
| --- | --- | --- | --- |
| CE-01 | The system shall allow the user to enter a candidate by title, media type, year, creator, link, or manual description. | High | Candidate can be evaluated with either metadata lookup or manual data. |
| CE-02 | The system shall return one primary action: commit, sample, delay, skip, drop, read source first, listen instead, or no media. | High | Every evaluation includes exactly one primary action. |
| CE-03 | The system shall calculate personal fit, mood fit, genericness risk, regret risk, commitment cost, and overall worthiness. | High | All six scores appear in the evaluation result. |
| CE-04 | The system shall explain why the candidate may work for the user. | High | Evaluation includes at least three positive reasons or states insufficient evidence. |
| CE-05 | The system shall explain why the candidate may fail for the user. | High | Evaluation includes risk warnings tied to known user patterns. |
| CE-06 | The system shall provide confidence level and explain what information is missing. | High | Low-confidence evaluations identify missing data and suggested next input. |
| CE-07 | The system shall compare the candidate with relevant loved, hated, dropped, and regretted works. | Medium | Evaluation includes similar positives and similar negatives when available. |
| CE-08 | The system shall provide a sampling rule when recommending sample. | High | Sample recommendation states exact stop condition such as one episode, 30 minutes, or 50 pages. |
| CE-09 | The system shall record user response to the evaluation. | High | User can mark followed, ignored, disagreed, consumed, dropped, or saved. |
| CE-10 | The system shall avoid recommending a work solely because it is popular or critically praised. | High | Evaluation must include personal-fit reasons, not only public reputation. |
| CE-11 | The system shall identify when the best action is not watching anything. | Medium | Tonight/candidate output can recommend rest, audiobook, or no media when state indicates low-value consumption. |
| CE-12 | The system shall support reevaluating the same candidate under a different mood or time constraint. | Medium | Evaluation history shows multiple runs and changed outcomes. |

### 6.4 Anti-Generic Filter

The Anti-Generic Filter protects the user from generic, hollow, filler-heavy, overhyped, algorithmic-feeling, or low-payoff works. It must be skeptical but fair.

| ID | Requirement | Priority | Acceptance criteria |
| --- | --- | --- | --- |
| AGF-01 | The system shall calculate a genericness risk score from 0 to 100. | High | Every candidate evaluation includes genericness risk. |
| AGF-02 | The system shall identify specific genericness signals such as fake complexity, shallow darkness, filler, weak ending risk, derivative premise, low authorial voice, and hype mismatch. | High | Detected signals are listed with evidence or uncertainty. |
| AGF-03 | The system shall separate modernness from genericness. | High | A work being recent cannot by itself increase genericness score. |
| AGF-04 | The system shall detect modern exceptions using originality, creator reputation, strong execution signals, user-aligned themes, or unusual reception patterns. | High | Evaluations can label a modern work as likely exception rather than generic. |
| AGF-05 | The system shall let the user define personal red flags. | High | User can add and edit red flags that influence evaluations. |
| AGF-06 | The system shall learn red flags from repeated negative aftertaste entries. | Medium | System proposes new red flags after repeated patterns. |
| AGF-07 | The system shall avoid over-filtering risky or unusual works that may be personally rewarding. | Medium | Evaluation can mark high-risk/high-reward and explain the tradeoff. |
| AGF-08 | The system shall support a sample-first decision for uncertain but potentially worthwhile works. | High | Candidate with mixed signals can be assigned sample rather than skip. |

### 6.5 Adaptive Queue and Tonight Mode

Adaptive Queue and Tonight Mode choose what the user should consume now. These modules must account for current state, not only general taste.

| ID | Requirement | Priority | Acceptance criteria |
| --- | --- | --- | --- |
| AQ-01 | The system shall maintain a queue of candidates with status, priority, estimated duration, medium, mood fit, and reason for inclusion. | High | Queue page shows all required fields and allows sorting/filtering. |
| AQ-02 | The system shall allow the user to run a mood check-in with time available, energy, focus, emotional appetite, medium preference, intensity preference, and risk tolerance. | High | Tonight Mode cannot run without the required check-in fields or defaults. |
| AQ-03 | The system shall return 1 to 5 recommended options for the current session. | High | Tonight Mode never returns more than 5 primary recommendations. |
| AQ-04 | The system shall label each option as safe, challenging, wildcard, comfort, short, deep, audio-only, or avoid. | Medium | Each recommendation has a category label. |
| AQ-05 | The system shall recommend against long commitments when the user has low focus, high fatigue, or low time. | High | A long series is not recommended as top choice under incompatible check-in conditions. |
| AQ-06 | The system shall support queue deprioritization due to fatigue, overexposure, or wrong mood. | High | Queue items can move to delayed with recorded reason. |
| AQ-07 | The system shall learn whether Tonight Mode choices were successful. | High | Post-session feedback changes future queue ranking. |
| AQ-08 | The system shall support medium switching suggestions such as audiobook instead of series. | Medium | Recommendations can include a different medium when better fit. |
| AQ-09 | The system shall display why the top option is better now than other queued items. | High | Top recommendation includes comparative explanation. |

### 6.6 Aftertaste Log

Aftertaste Log records whether a work mattered after it was consumed. It is the primary feedback loop for improving CanonOS.

| ID | Requirement | Priority | Acceptance criteria |
| --- | --- | --- | --- |
| AL-01 | The system shall prompt the user to log aftertaste after completing, dropping, or pausing a work. | High | Completion or drop event creates an aftertaste task. |
| AL-02 | The system shall capture worth the time, memorability, emotional impact, intellectual impact, regret, genericness, ending satisfaction, and completion satisfaction. | High | Aftertaste form includes all listed fields. |
| AL-03 | The system shall allow free-form notes about what worked and what failed. | High | User can save positive and negative notes. |
| AL-04 | The system shall support delayed aftertaste follow-up after a configurable interval. | Medium | User can receive or view a follow-up prompt after 1, 7, or 30 days. |
| AL-05 | The system shall compare immediate rating and delayed aftertaste. | Medium | Item detail shows rating drift when both exist. |
| AL-06 | The system shall update TasteGraph from aftertaste entries. | High | TasteGraph logs the update source as aftertaste. |
| AL-07 | The system shall identify addictive but empty works. | High | Aftertaste form includes a field for addictive in the moment but weak afterward. |
| AL-08 | The system shall allow user to mark a work as personal canon. | Medium | Aftertaste or item page can add work to canon list. |


---

### 6.7 Media Archaeologist

Media Archaeologist finds deep cuts, forgotten works, old works, foreign works, under-discussed works, and non-obvious adjacent recommendations. It should be built after the core loop works.

| ID | Requirement | Priority | Acceptance criteria |
| --- | --- | --- | --- |
| MA-01 | The system shall support discovery requests by theme, mood, era, country, medium, creator, narrative pattern, or favorite work. | Medium | User can start discovery from at least five input types. |
| MA-02 | The system shall prioritize non-obvious works when user selects deep-cut mode. | Medium | Deep-cut results exclude items already in library and obvious mainstream items where known. |
| MA-03 | The system shall explain why each discovered item expands the user taste rather than merely matching it. | Medium | Each discovery includes an expansion rationale. |
| MA-04 | The system shall support cross-medium discovery paths. | Medium | A discovery path can move from anime to film to novel to audiobook. |
| MA-05 | The system shall support exploration maps such as older cinema, psychological anime, literary crime, and foreign thrillers. | Low | User can generate and save an exploration map. |

### 6.8 Narrative DNA Analyzer

Narrative DNA Analyzer represents a work by story properties rather than only genre or popularity. It is the most ambitious analysis module and should be introduced gradually.

| ID | Requirement | Priority | Acceptance criteria |
| --- | --- | --- | --- |
| NDA-01 | The system shall store narrative dimensions including pacing, atmosphere, character depth, moral complexity, theme, conflict type, ending type, originality, and filler ratio. | Medium | Media item detail has a Narrative DNA section. |
| NDA-02 | The system shall infer narrative DNA from user notes, metadata, summaries, legal excerpts, or manually entered analysis. | Medium | Narrative DNA can be created without full copyrighted source text. |
| NDA-03 | The system shall compare works by narrative DNA across media types. | Medium | System can compare a novel to an anime or a film using shared dimensions. |
| NDA-04 | The system shall allow user correction of inferred narrative DNA. | High | User can edit dimensions and save corrections. |
| NDA-05 | The system shall identify story patterns that repeatedly lead to love, boredom, regret, or dropping. | Medium | Taste reports cite narrative DNA patterns and example works. |
| NDA-06 | The system shall avoid claiming full textual analysis when only metadata or summaries were used. | High | Analysis output states data basis and confidence. |

### 6.9 Critic Council

Critic Council is an interface and reasoning style where multiple internal critic personas debate a candidate. It is useful for trust, nuance, and entertainment, but it should not replace final scoring.

| ID | Requirement | Priority | Acceptance criteria |
| --- | --- | --- | --- |
| CC-01 | The system shall support critic roles: Ruthless Critic, Historian, Modern Defender, Anime Specialist, Literary Editor, Mood Doctor, Completion Strategist, and Wildcard. | Medium | Critic Council can display all listed roles. |
| CC-02 | Each critic shall give a short argument with recommendation, confidence, and reason. | Medium | Critic output contains no role longer than 150 words by default. |
| CC-03 | The Modern Defender shall specifically guard against unfair anti-modern bias. | High | Modern works are evaluated with a fairness note when relevant. |
| CC-04 | The Ruthless Critic shall focus on time protection and genericness risk. | Medium | Ruthless Critic output lists skip risks. |
| CC-05 | The final recommendation shall synthesize critic disagreement instead of simply averaging votes. | Medium | Final output explains tradeoffs and why one action was chosen. |
| CC-06 | The user shall be able to disable or hide Critic Council. | Low | Settings include a Critic Council toggle. |

### 6.10 Completion Detox System

Completion Detox helps the user stop consuming mediocre media out of habit, completion pressure, or empty stimulation. It must be non-judgmental and practical.

| ID | Requirement | Priority | Acceptance criteria |
| --- | --- | --- | --- |
| CD-01 | The system shall define sampling rules by medium and candidate confidence. | High | Sampling rules can be configured and attached to recommendations. |
| CD-02 | The system shall support drop, pause, delay, and archive decisions without penalty. | High | User can mark a work dropped with reason and time saved. |
| CD-03 | The system shall calculate estimated time saved from drops and skips. | Medium | Dashboard shows time saved in the current month and overall. |
| CD-04 | The system shall detect sunk-cost continuation patterns. | Medium | System warns when user continues primarily because of completion history. |
| CD-05 | The system shall recommend stopping a work when sample rule fails. | High | At the sample boundary, the system asks continue or drop and gives a recommendation. |
| CD-06 | The system shall distinguish guilty pleasure from regretted consumption. | Medium | User can mark trash but enjoyable separately from regret. |
| CD-07 | The system shall avoid moralizing language. | High | Detox messages are neutral, practical, and respectful. |

### 6.11 Personal Canon Builder

Personal Canon Builder turns consumption into meaningful exploration rather than random queue movement.

| ID | Requirement | Priority | Acceptance criteria |
| --- | --- | --- | --- |
| PCB-01 | The system shall allow the user to create canon lists and themed seasons. | Medium | User can create a named canon season with description and items. |
| PCB-02 | A canon season shall support ordered items across multiple media types. | Medium | Season can include movies, anime, novels, audiobooks, and custom items in one order. |
| PCB-03 | The system shall allow themes such as moral collapse, anti-heroes done right, forgotten masterpieces, modern works worth it, and atmosphere over plot. | Medium | System includes starter templates and custom themes. |
| PCB-04 | The system shall include reflection questions for each canon season. | Low | Season detail page includes prompts and summary notes. |
| PCB-05 | The system shall support marking items as personal canon, near-canon, rejected, or historically important but not loved. | Medium | Canon status appears on item detail and lists. |

### 6.12 Cross-Medium Adaptation Intelligence

Adaptation Intelligence helps choose whether to read, watch, listen, or skip when a story exists in multiple forms.

| ID | Requirement | Priority | Acceptance criteria |
| --- | --- | --- | --- |
| AI-01 | The system shall represent relationships between source material and adaptations. | Medium | Item detail can link novel, manga, anime, film, TV, audiobook, and remake versions. |
| AI-02 | The system shall recommend best experience path: read first, watch first, listen first, adaptation sufficient, source preferred, or skip adaptation. | Medium | Adaptation evaluation returns one path recommendation. |
| AI-03 | The system shall track adaptation risks such as incomplete adaptation, weak ending, compression, changed tone, or poor narration. | Medium | Adaptation view lists risks with confidence. |
| AI-04 | The system shall allow user to log adaptation comparison notes. | Low | User can compare source and adaptation after consuming both. |
| AI-05 | The system shall support audiobook narration quality as an evaluation dimension. | Medium | Audiobook item includes narrator and narration score fields. |

### 6.13 Settings, Admin, and Data Management

| ID | Requirement | Priority | Acceptance criteria |
| --- | --- | --- | --- |
| SET-01 | The system shall provide settings for scoring weights, red flags, preferred media types, model provider, privacy, and export. | High | Settings page includes all listed categories. |
| SET-02 | The system shall support full data export in JSON and CSV. | High | User can export all library, ratings, notes, and logs. |
| SET-03 | The system shall support data import validation and rollback. | High | Failed imports do not corrupt existing data; user sees errors. |
| SET-04 | The system shall support backup and restore. | Medium | User can create a backup and restore it in a test environment. |
| SET-05 | The system shall allow deletion of any item, note, mood log, evaluation, or AI trace. | High | Deleted data is removed or marked according to configured retention policy. |
| SET-06 | The system shall maintain a changelog of prompt versions and scoring versions. | Medium | Evaluation details show the version that generated the result. |


---

## 7. Data Requirements

CanonOS depends on rich structured data. This section defines the required entities, fields, relationships, and data rules. Developers should treat these entities as the minimum data model for implementation.

### 7.1 Entity Relationship Summary

- A MediaItem can have many Ratings, AftertasteEntries, Tags, NarrativeDNA records, Evaluations, and WorkRelationships.
- A CandidateEvaluation can reference one MediaItem, one MoodCheckIn, one TasteProfile snapshot, and many CriticOpinions.
- A TasteProfile is derived from Ratings, AftertasteEntries, DropReasons, Tags, and Evaluations.
- A QueueItem references a MediaItem and stores priority, context, and recommendation state.
- A CanonSeason contains ordered MediaItems and reflection notes.
- A WorkRelationship connects sources, adaptations, remakes, sequels, prequels, and alternate versions.

### 7.2 Core Entities

| Entity | Purpose |
| --- | --- |
| MediaItem | Canonical record for a movie, series, anime, novel, audiobook, manga, or custom work. |
| PersonOrCreator | Director, writer, author, narrator, studio, actor, showrunner, or other creator. |
| RatingProfile | Detailed user rating dimensions for a media item. |
| AftertasteEntry | Post-consumption reflection, regret, memorability, and value assessment. |
| TasteProfile | Derived representation of current and historical user taste. |
| MoodCheckIn | Current state input for Tonight Mode and contextual evaluations. |
| CandidateEvaluation | Decision record for a candidate, including scores and recommendation. |
| CriticOpinion | One critic persona argument inside Critic Council. |
| QueueItem | A candidate or planned work in the user adaptive queue. |
| NarrativeDNA | Structured story attributes for matching and analysis. |
| Tag | User-defined or system-generated label for theme, trope, red flag, or mood. |
| WorkRelationship | Connection between source material, adaptation, sequel, remake, or alternate version. |
| CanonSeason | Curated themed exploration path or personal canon list. |
| ImportRecord | Log of imported files, mapping, validation, and results. |
| AITrace | Prompt/model/version/inputs/outputs for explainability and debugging. |

### 7.3 MediaItem Required Fields

| Field | Type | Description |
| --- | --- | --- |
| id | UUID | Unique internal ID. |
| title | Text | Required display title. |
| original_title | Text | Optional original title. |
| medium | Enum | movie, tv_series, anime, novel, audiobook, manga, light_novel, documentary, custom. |
| year_start | Integer | Release/start year when known. |
| year_end | Integer | End year for series when known. |
| status | Enum | completed, in_progress, paused, dropped, want, candidate, archived, blocked. |
| duration_minutes | Integer | Movie/runtime or estimated total time. |
| episode_count | Integer | For series/anime where applicable. |
| page_count | Integer | For books where applicable. |
| audio_length_minutes | Integer | For audiobooks where applicable. |
| country_language | Text | Country, language, or region. |
| creators | Relation | Directors, authors, studios, showrunners, narrators. |
| external_ids | JSON | Optional IDs from external metadata providers. |
| synopsis | Text | Short user-safe summary. |
| user_notes | Text | Private notes. |
| created_at | Timestamp | Record creation time. |
| updated_at | Timestamp | Last modified time. |

### 7.4 RatingProfile Fields

| Field | Scale | Meaning |
| --- | --- | --- |
| overall_score | 0-10 | General rating. |
| worthiness_score | 0-100 | Was it worth the time? |
| personal_fit | 0-100 | How well it matches stable taste. |
| genericness_score | 0-100 | How generic or hollow it felt. |
| regret_score | 0-100 | How much the user regrets consuming it. |
| memorability_score | 0-100 | How strongly it stayed with the user. |
| emotional_impact | 0-100 | Emotional effect. |
| intellectual_impact | 0-100 | Intellectual or thematic effect. |
| story_depth | 0-100 | Narrative depth. |
| character_depth | 0-100 | Character complexity and believability. |
| atmosphere | 0-100 | Mood, setting, tone, style. |
| originality | 0-100 | Originality of execution. |
| dialogue_quality | 0-100 | Quality of dialogue or prose voice. |
| pacing_quality | 0-100 | Effective pacing for the work type. |
| ending_quality | 0-100 | Payoff and ending satisfaction. |
| rewatch_read_value | 0-100 | Likelihood of revisiting. |
| addictive_but_empty | Boolean/Score | Whether it was compelling but hollow afterward. |

### 7.5 CandidateEvaluation Fields

| Field | Type | Description |
| --- | --- | --- |
| id | UUID | Unique evaluation ID. |
| media_item_id | UUID | Candidate being evaluated. |
| mood_check_in_id | UUID | Optional current-state context. |
| primary_action | Enum | commit, sample, delay, skip, drop, read_first, listen_first, no_media. |
| worthiness_score | 0-100 | Final value estimate. |
| personal_fit_score | 0-100 | Fit to stable taste. |
| mood_fit_score | 0-100 | Fit to current state. |
| genericness_risk | 0-100 | Risk of genericness. |
| regret_risk | 0-100 | Risk of post-consumption regret. |
| commitment_cost | Low/Med/High | Time and attention burden. |
| confidence | 0-100 | Confidence in evaluation. |
| positive_reasons | JSON/Text | Reasons it may work. |
| risk_reasons | JSON/Text | Reasons it may fail. |
| sample_rule | Text | Exact test boundary if sampling. |
| missing_information | Text | What is uncertain or unknown. |
| user_response | Enum | followed, ignored, disagreed, saved, completed, dropped. |
| created_at | Timestamp | Evaluation date/time. |

### 7.6 MoodCheckIn Fields

| Field | Type | Description |
| --- | --- | --- |
| available_time_minutes | Integer | How much time the user has now. |
| energy_level | 1-5 | Physical/mental energy. |
| focus_level | 1-5 | Attention capacity. |
| emotional_appetite | Enum | comfort, darkness, beauty, intensity, challenge, fun, calm, surprise. |
| medium_preference | Enum/List | movie, series, anime, novel, audiobook, no preference. |
| risk_tolerance | 1-5 | Willingness to try uncertain or difficult work. |
| commitment_willingness | 1-5 | Willingness to start a long work. |
| current_fatigue | List | visual fatigue, series fatigue, anime fatigue, reading fatigue, darkness fatigue, hype fatigue. |
| session_goal | Enum | entertain, challenge, recover, explore, finish, sample, reflect. |

### 7.7 Data Quality Rules

| ID | Requirement | Priority | Acceptance criteria |
| --- | --- | --- | --- |
| DATA-01 | Every media item shall have title, medium, status, and created_at. | High | Database rejects records missing required fields. |
| DATA-02 | Scores shall be stored consistently on documented scales. | High | No score outside the valid range can be saved. |
| DATA-03 | User corrections shall override inferred AI labels unless user resets them. | High | Corrected tags remain stable after reanalysis. |
| DATA-04 | The system shall keep source and confidence for inferred data. | High | Inferred fields show source such as user, metadata, AI, import, or manual. |
| DATA-05 | The system shall preserve historical evaluations even if the TasteGraph changes later. | Medium | Old evaluation shows the taste snapshot/version used. |
| DATA-06 | The system shall support export of all user-owned data. | High | Export includes media, ratings, notes, tags, mood logs, aftertaste, queues, and canon seasons. |
| DATA-07 | The system shall not store full copyrighted source text unless the user has rights and explicitly enables it. | High | Ingestion workflow includes legal/source warning and stores source basis. |


---

## 8. AI and Recommendation Requirements

CanonOS intelligence must be useful, explainable, correctable, and skeptical. The AI layer should not hallucinate certainty, overfit to hype, or encourage endless consumption. It must make visible decisions using clear evidence and confidence.

### 8.1 AI Inputs

- User library and ratings.
- Dropped, paused, blocked, and regretted works.
- Aftertaste entries and delayed reflections.
- Mood check-in data.
- Queue state and recent consumption history.
- User-defined red flags and positive taste signals.
- Metadata and short summaries from configured providers or manual input.
- Narrative DNA fields when available.
- Adaptation relationships and audiobook narration notes when available.

### 8.2 AI Outputs

- Primary recommendation action.
- Worthiness, personal fit, mood fit, genericness risk, regret risk, commitment cost, and confidence.
- Positive reasons and risk reasons.
- Sample rule or drop rule where appropriate.
- Modern-media fairness note where relevant.
- Comparison to user-loved and user-disliked works.
- Missing information and uncertainty.
- Traceable update to TasteGraph when user feedback is logged.

### 8.3 Scoring Model

The initial scoring model should be transparent and adjustable. A recommended formula is shown below. Developers may modify weights, but the system must expose the active weights in settings or developer view.

| Component | Default weight | Meaning |
| --- | --- | --- |
| Personal fit | 30% | Stable taste alignment based on history and ratings. |
| Mood fit | 20% | Current suitability based on time, energy, focus, and desired experience. |
| Quality signal | 20% | Expected quality from metadata, notes, creator pattern, and user-aligned evidence. |
| Genericness penalty | -15% | Penalty for genericness risks and personal red flags. |
| Regret risk penalty | -10% | Penalty for likelihood of wasted time or weak aftertaste. |
| Commitment cost penalty | -5% | Penalty when duration/complexity is incompatible with current state. |

### 8.4 AI Behavior Requirements

| ID | Requirement | Priority | Acceptance criteria |
| --- | --- | --- | --- |
| AIR-01 | The AI shall never present uncertain metadata or analysis as fact. | High | Low-confidence claims are labeled uncertain or omitted. |
| AIR-02 | The AI shall explain recommendation logic in simple language. | High | Evaluation result includes plain-English reasoning under 300 words by default. |
| AIR-03 | The AI shall cite internal evidence from the user library when making personal-fit claims. | High | Evaluation references example works from the user history when available. |
| AIR-04 | The AI shall not recommend based solely on popularity, rating averages, awards, or trend status. | High | Output includes user-specific reasons, not only public reputation. |
| AIR-05 | The AI shall support user correction and learn from it. | High | User can reject a claim and the system records the correction. |
| AIR-06 | The AI shall have an explicit fairness rule for modern media. | High | Modern candidates are assessed for genericness through signals, not release date alone. |
| AIR-07 | The AI shall be allowed to recommend no media, dropping, pausing, or sampling. | High | Primary actions include no_media, drop, pause, sample, and skip. |
| AIR-08 | The AI shall separate addictive potential from long-term value. | High | Evaluations can identify addictive but empty risk. |
| AIR-09 | The AI shall not shame the user for consumption habits. | High | Generated text passes tone guidelines for neutrality and respect. |
| AIR-10 | The AI shall log prompt version, model version, input summary, output, and user feedback. | Medium | AITrace record exists for each generated evaluation. |
| AIR-11 | The AI shall avoid producing long lists unless the user requests exploration mode. | Medium | Default recommendation output is 1 to 5 items. |
| AIR-12 | The AI shall ask for missing context only when necessary; otherwise it shall make a best-effort decision with confidence. | High | Evaluation succeeds with low confidence instead of blocking unnecessarily. |

### 8.5 Prompting and Guardrails

- System prompts must state that CanonOS protects user time and should not maximize consumption.
- Prompts must include the user distinction that not all modern media is bad; genericness is the target, not release year.
- Prompts must request structured JSON outputs for scores and a separate plain-language explanation for display.
- Prompts must require confidence and missing-information fields.
- Prompts must distinguish facts from inference.
- Prompts must limit direct quotes and copyrighted text handling according to legal and product policy.
- Prompts must include tone rules: direct, honest, non-moralizing, practical, and clear.

### 8.6 Recommendation Output Template

| Output field | Required content |
| --- | --- |
| Primary action | Commit, sample, delay, skip, drop, read first, listen first, or no media. |
| One-line verdict | Clear sentence explaining the decision. |
| Scores | Worthiness, personal fit, mood fit, genericness risk, regret risk, commitment cost, confidence. |
| Why it may work | 3 to 5 reasons tied to user taste. |
| Why it may fail | 3 to 5 risk signals tied to user red flags. |
| Best context | Best mood, time, medium state, or viewing/reading condition. |
| Sample rule | Only if action is sample; exact stopping condition. |
| Modern fairness note | Required for modern works where genericness or anti-modern bias is relevant. |
| What to do next | Concrete next action such as add to tonight, archive, start now, read source, or block. |


---

## 9. User Interface and User Experience Requirements

The interface must be calm, fast, readable, and decision-oriented. CanonOS should not feel like another noisy media platform. It should feel like a private command center for choosing and understanding media.

### 9.1 Required Screens

| Screen | Purpose |
| --- | --- |
| Dashboard | Shows tonight prompt, current queue, recent aftertaste tasks, fatigue warnings, and taste insights. |
| Library | Searchable/filterable list of all media items. |
| Media Item Detail | Full record with metadata, ratings, notes, narrative DNA, aftertaste, relationships, and evaluations. |
| Add/Edit Media | Manual entry and edit form for all media types. |
| Candidate Evaluator | Input a candidate and receive recommendation output. |
| Tonight Mode | Mood check-in and 1 to 5 current recommendations. |
| Queue | Adaptive watch/read/listen queue with priority and reasons. |
| Aftertaste Log | Reflection form and historical aftertaste entries. |
| Taste Profile | Current taste map, positive signals, negative signals, fatigue, and evolution. |
| Deep-Cut Discovery | Search/discovery interface for Media Archaeologist. |
| Canon Seasons | Curated personal canon lists and themed exploration paths. |
| Adaptation Map | Source/adaptation relationships and recommended experience path. |
| Settings | Scoring weights, tags, red flags, imports/exports, privacy, model config. |

### 9.2 UI Functional Requirements

| ID | Requirement | Priority | Acceptance criteria |
| --- | --- | --- | --- |
| UI-01 | The dashboard shall show the next most useful action, not a feed. | High | Dashboard top area contains one primary action: evaluate, tonight, log aftertaste, or review queue. |
| UI-02 | Every recommendation shall show the primary action prominently. | High | User can see commit/sample/delay/skip without scrolling. |
| UI-03 | Scores shall be visual but not replace explanations. | High | Each score has a short explanation available. |
| UI-04 | The interface shall support fast keyboard-friendly data entry. | Medium | User can add a media item with minimal mouse use. |
| UI-05 | The library shall support saved filters. | Medium | User can save views such as high-regret series, modern exceptions, or deep cuts. |
| UI-06 | The interface shall provide empty states that teach the user what to add next. | Medium | Empty screens include clear next action and example. |
| UI-07 | User corrections shall be available inline where AI outputs are shown. | High | AI claims have correct/reject controls. |
| UI-08 | The system shall never use infinite scroll for recommendations. | High | Recommendation lists are paginated or bounded. |
| UI-09 | The system shall display confidence and missing data for evaluations. | High | Evaluation output includes confidence and missing information section. |
| UI-10 | The system shall provide a compact mode for quick use and an expanded mode for deep analysis. | Medium | User can toggle between summary and full details. |

### 9.3 Interaction Rules

- Default recommendation lists should be short.
- The system should prefer direct verdicts over vague hedging, while still showing uncertainty.
- A skip recommendation must be actionable and non-moralizing.
- A sample recommendation must include a clear stop point.
- The user must always be able to override the system.
- CanonOS should show why a queue item is present, not just that it is present.
- No recommendation should appear without a path to give feedback.

### 9.4 Accessibility Requirements

| ID | Requirement | Priority | Acceptance criteria |
| --- | --- | --- | --- |
| UXA-01 | The application shall support keyboard navigation for all primary workflows. | High | User can complete add item, evaluate, and aftertaste without mouse. |
| UXA-02 | The application shall maintain readable contrast and font sizes. | High | Text remains readable at normal zoom and passes basic accessibility checks. |
| UXA-03 | The application shall not rely on color alone to communicate scores or warnings. | High | Warnings include text labels. |
| UXA-04 | The application shall provide clear error messages for imports, missing fields, and failed AI calls. | High | Errors state what failed and what to do next. |
| UXA-05 | The application shall support reduced motion and low-distraction UI. | Medium | User can disable animations and visual noise. |


---

## 10. External Interface Requirements

CanonOS must work without external integrations, but it should be designed to connect to metadata providers, imports, model providers, and exports. Integrations are optional helpers, not required for core functionality.

### 10.1 User Interface Interfaces

- Web browser UI for MVP.
- Optional future mobile app using the same backend APIs.
- Optional command-line or developer API for imports, backups, and batch analysis.

### 10.2 Metadata Interfaces

| ID | Requirement | Priority | Acceptance criteria |
| --- | --- | --- | --- |
| EXT-01 | The system shall support optional metadata lookup through configurable providers. | Medium | Provider integration can be enabled/disabled without disabling manual entry. |
| EXT-02 | The system shall normalize external metadata into the internal MediaItem schema. | High | Different provider records map to a single canonical item format. |
| EXT-03 | The system shall store external source and retrieval time for imported metadata. | Medium | Item detail shows provider/source for imported fields. |
| EXT-04 | The system shall handle provider failure gracefully. | High | User can continue with manual entry if lookup fails. |
| EXT-05 | The system shall not expose private user ratings or notes to metadata providers unless explicitly configured. | High | Metadata calls do not send private user notes by default. |

### 10.3 Import/Export Interfaces

| ID | Requirement | Priority | Acceptance criteria |
| --- | --- | --- | --- |
| IMP-01 | The system shall support CSV import for media history. | High | User can map CSV columns to CanonOS fields. |
| IMP-02 | The system shall support JSON import and export for full-fidelity data. | High | Exported JSON can be re-imported into a fresh instance. |
| IMP-03 | The system shall support validation preview before import commit. | High | User sees number of valid rows, invalid rows, duplicates, and warnings. |
| IMP-04 | The system shall support rollback of the last import. | Medium | User can undo import and restore previous state. |
| IMP-05 | The system shall provide CSV export for library and ratings. | High | Exported CSV opens with core fields and scores. |

### 10.4 AI Model Interface

| ID | Requirement | Priority | Acceptance criteria |
| --- | --- | --- | --- |
| MODEL-01 | The system shall call AI models through an abstraction layer. | High | Feature code does not directly depend on one provider SDK. |
| MODEL-02 | The system shall support configurable model name, temperature, max output length, and timeout. | Medium | Settings or config file exposes these values. |
| MODEL-03 | The system shall validate structured AI output before saving it. | High | Malformed JSON or missing required fields is rejected or repaired with clear logs. |
| MODEL-04 | The system shall retry failed AI calls according to a safe retry policy. | Medium | Transient failure can retry without duplicate saved evaluations. |
| MODEL-05 | The system shall record cost or token usage when provider exposes it. | Low | AITrace includes usage fields when available. |

### 10.5 Storage and Backup Interfaces

- Local database or private cloud database for user data.
- Optional object storage for backups and export files.
- Encrypted backups should be preferred for sensitive media and mood history.
- Restore process must be tested before production use.


---

## 11. Non-Functional Requirements

### 11.1 Privacy and Security

| ID | Requirement | Priority | Acceptance criteria |
| --- | --- | --- | --- |
| SEC-01 | CanonOS shall treat media history, notes, ratings, moods, and aftertaste as private user data. | High | No private data is shared externally without explicit configuration. |
| SEC-02 | CanonOS shall require authentication unless running in explicitly local-only unlocked mode. | High | App cannot be accessed without login in normal deployment. |
| SEC-03 | CanonOS shall support encryption in transit for network deployments. | High | HTTPS is enabled in deployed environments. |
| SEC-04 | CanonOS shall protect stored secrets such as API keys. | High | Secrets are not stored in source code or exported data. |
| SEC-05 | CanonOS shall allow the user to delete personal data. | High | Deletion works for items, notes, evaluations, mood logs, and exports. |
| SEC-06 | CanonOS shall not use user data to train external models unless explicitly enabled by the user and provider policy permits it. | High | Settings show model data-use posture and default is private/no-training where available. |
| SEC-07 | CanonOS shall provide export before destructive deletion. | Medium | Deletion flow offers backup/export option. |
| SEC-08 | CanonOS shall log access and administrative actions in deployed mode. | Medium | Admin log records login, export, import, deletion, and config changes. |

### 11.2 Performance

| ID | Requirement | Priority | Acceptance criteria |
| --- | --- | --- | --- |
| PERF-01 | Library search shall return results within 1 second for 10,000 media items on normal hardware. | High | Performance test with 10,000 records passes. |
| PERF-02 | Opening a media item detail page shall take less than 2 seconds excluding external AI calls. | High | Measured response time is under target. |
| PERF-03 | Tonight Mode non-AI preselection shall complete within 2 seconds. | Medium | Candidate shortlist appears quickly while AI reasoning can continue. |
| PERF-04 | Candidate evaluation shall show progress state if AI takes longer than 3 seconds. | Medium | User sees loading/progress and can cancel. |
| PERF-05 | Import of 5,000 records shall complete without browser freeze. | Medium | Import runs as background server task with progress updates. |

### 11.3 Reliability and Availability

| ID | Requirement | Priority | Acceptance criteria |
| --- | --- | --- | --- |
| REL-01 | The system shall not lose existing library data due to failed import, failed AI call, or browser refresh. | High | Failure tests preserve existing records. |
| REL-02 | The system shall make recommendation state recoverable after interruption. | Medium | Partially completed evaluations can be retried or discarded. |
| REL-03 | The system shall support backup and restore. | High | Restore test proves a backup can recreate core data. |
| REL-04 | The system shall degrade gracefully when AI provider is unavailable. | High | Manual library and non-AI features continue to work. |
| REL-05 | The system shall maintain data integrity through migrations. | Medium | Database migrations include rollback or backup process. |

### 11.4 Maintainability

| ID | Requirement | Priority | Acceptance criteria |
| --- | --- | --- | --- |
| MAINT-01 | The codebase shall separate modules by feature area. | Medium | Library, evaluator, queue, taste, and AI services are independent modules. |
| MAINT-02 | Prompts shall be versioned and stored separately from application logic. | High | Prompt versions are visible in repository or config. |
| MAINT-03 | Scoring weights shall be configurable. | High | Changing weights does not require code changes. |
| MAINT-04 | Data schema changes shall use migrations. | Medium | Schema changes are tracked and tested. |
| MAINT-05 | Core functions shall have automated tests. | High | Requirements in the test plan have corresponding test cases. |

### 11.5 Usability

| ID | Requirement | Priority | Acceptance criteria |
| --- | --- | --- | --- |
| USE-01 | The system shall make the main decision visible in one screen. | High | User can see top recommendation without navigating through multiple pages. |
| USE-02 | The system shall avoid overwhelming the user with too many options. | High | Default recommendation count is 1 to 5. |
| USE-03 | The system shall make data entry fast enough that logging does not become a burden. | High | User can add a basic item in under 30 seconds. |
| USE-04 | The system shall use plain language for all outputs. | High | Recommendation explanations avoid unnecessary jargon. |
| USE-05 | The system shall provide advanced details only when requested. | Medium | Advanced mode toggle reveals vectors, traces, and prompt details. |

### 11.6 Ethical and Addiction-Sensitive Requirements

| ID | Requirement | Priority | Acceptance criteria |
| --- | --- | --- | --- |
| ETH-01 | CanonOS shall not optimize for more consumption. | High | Product metrics include satisfaction and time saved, not only items consumed. |
| ETH-02 | CanonOS shall support decisions to stop, rest, or consume less. | High | No media is a valid recommendation action. |
| ETH-03 | CanonOS shall not shame the user or use manipulative language. | High | Tone review rejects moralizing outputs. |
| ETH-04 | CanonOS shall distinguish personal media management from medical treatment. | High | Product copy does not claim to treat addiction or mental health conditions. |
| ETH-05 | CanonOS shall avoid dark patterns such as streak pressure, infinite recommendations, or guilt-based completion prompts. | High | Design review confirms no streak or infinite-scroll engagement loop. |


---

## 12. Workflows and User Journeys

### 12.1 Workflow: Add a Media Item

1. User clicks Add Media.
2. User enters title and selects medium.
3. System optionally searches metadata providers or lets user continue manually.
4. User confirms title, year, creator, status, and notes.
5. System checks for duplicates.
6. User saves the item.
7. System places the item in the Library and offers next actions: rate, evaluate, queue, or add aftertaste.

### 12.2 Workflow: Candidate Evaluation

1. User opens Candidate Evaluator.
2. User enters title, link, or manual description.
3. System creates or finds a MediaItem with candidate status.
4. System gathers metadata, user taste, queue context, recent fatigue, and optional mood check-in.
5. System computes scores and asks AI layer for structured evaluation.
6. System validates output and displays primary action, scores, reasons, risks, confidence, and sample rule if needed.
7. User accepts, disagrees, saves to queue, blocks, or ignores.
8. System records user response and updates future recommendation behavior.

### 12.3 Workflow: Tonight Mode

1. User opens Tonight Mode.
2. System asks for available time, energy, focus, desired emotional experience, medium preference, risk tolerance, and commitment willingness.
3. System filters queue and candidate pool based on hard constraints.
4. System ranks items using personal fit, mood fit, genericness risk, regret risk, and commitment cost.
5. System returns 1 to 5 options: top choice, safe choice, challenging choice, wildcard, or audio/read alternative.
6. User chooses an option, delays all options, or asks for a different strategy.
7. System records the session decision.
8. After consumption, system prompts for feedback or aftertaste.

### 12.4 Workflow: Aftertaste Logging

1. User marks a work completed, dropped, or paused.
2. System opens Aftertaste Log or creates a pending aftertaste task.
3. User scores worthiness, regret, genericness, memorability, impact, ending, and completion satisfaction.
4. User writes what worked and what failed.
5. User may mark canon, near-canon, guilty pleasure, addictive but empty, or never recommend.
6. System saves the entry and updates TasteGraph.
7. System may suggest changes to red flags, queue, or media balance.
8. System optionally schedules delayed aftertaste follow-up.

### 12.5 Workflow: Drop Without Guilt

1. User starts a sampled work.
2. System tracks the sample boundary such as 30 minutes, 1 episode, 3 episodes, or 50 pages.
3. At the boundary, system asks whether the work has justified continuation.
4. System compares user response with original risks and sample rule.
5. System recommends continue, pause, or drop.
6. If dropped, system records drop reason and estimated time saved.
7. TasteGraph learns from the drop reason.

### 12.6 Workflow: Modern Work Fairness

1. User evaluates a recent movie or series.
2. System checks for genericness signals without using recency as a negative signal by itself.
3. System checks for exception signals such as strong authorial voice, distinctive reception, unusual structure, creator alignment, or user-aligned themes.
4. System outputs a fairness note if the user recent-media skepticism may bias the decision.
5. System recommends commit, sample, delay, or skip based on actual signals.

### 12.7 Workflow: Adaptation Path

1. User enters a work with multiple versions.
2. System identifies or allows user to manually define source and adaptations.
3. System compares medium fit, completeness, narration quality, pacing, and user preference.
4. System recommends read first, watch first, listen first, adaptation sufficient, source preferred, or skip adaptation.
5. User saves the path to queue or canon season.


---

## 13. Testing and Acceptance

CanonOS should be tested as a decision tool, not only as a database app. Testing must verify data integrity, UI behavior, recommendation usefulness, privacy, and the ability to learn from feedback.

### 13.1 Test Types

| Test type | Purpose |
| --- | --- |
| Unit tests | Validate scoring functions, data validation, import parsing, tag logic, and status transitions. |
| Integration tests | Validate workflows across UI, backend, database, AI layer, and imports. |
| AI output tests | Validate structured output, confidence, missing information, fairness rules, and tone. |
| Recommendation regression tests | Ensure known test profiles produce expected recommendation actions. |
| Privacy tests | Ensure exports, deletions, model calls, and metadata calls protect private data. |
| Performance tests | Validate search, item detail, import, and queue ranking speed. |
| Usability tests | Validate that the user can complete core workflows quickly and understands results. |
| Backup/restore tests | Validate that a backup can recover a full CanonOS instance. |

### 13.2 MVP Acceptance Criteria

| ID | Acceptance criterion |
| --- | --- |
| AC-01 | User can import or manually enter at least 500 media items. |
| AC-02 | User can search/filter the library by title, medium, status, score, tags, and notes. |
| AC-03 | User can rate works using detailed dimensions, not just one score. |
| AC-04 | User can evaluate a candidate and receive a commit/sample/delay/skip style verdict. |
| AC-05 | Candidate evaluation shows personal fit, mood fit, genericness risk, regret risk, worthiness, and confidence. |
| AC-06 | Candidate evaluation explains why the work may work and why it may fail. |
| AC-07 | Tonight Mode recommends 1 to 5 options based on mood, time, focus, and queue state. |
| AC-08 | User can log aftertaste and the Taste Profile updates or records why no update was made. |
| AC-09 | System can recommend skip, drop, delay, sample, or no media. |
| AC-10 | System does not recommend modern works negatively just because they are modern. |
| AC-11 | User can correct AI assumptions and corrections persist. |
| AC-12 | User can export all user-owned data in JSON and CSV. |
| AC-13 | Failure of AI or metadata provider does not break library functions. |
| AC-14 | The system avoids infinite-scroll or engagement-maximizing behavior. |

### 13.3 Sample Test Cases

| ID | Scenario | Expected result |
| --- | --- | --- |
| TC-01 | Import 1,000 mixed media records | Import succeeds, duplicates flagged, invalid rows reported, existing data preserved. |
| TC-02 | Evaluate a modern but high-quality candidate | System does not penalize release year; it identifies exception signals or uncertainty. |
| TC-03 | Evaluate a generic high-hype series | System flags genericness risks and can recommend sample or skip. |
| TC-04 | Run Tonight Mode while tired with 90 minutes available | System avoids long series and suggests short/high-fit options or audiobook. |
| TC-05 | Drop a sampled series after 1 episode | System records drop reason, time saved, and updates negative taste signals. |
| TC-06 | Correct AI claim about a disliked trope | Correction persists and affects future evaluations. |
| TC-07 | AI provider unavailable | Library, queue, manual rating, and export still work. |
| TC-08 | Delete a mood log | Mood log removed and no longer influences recommendations. |
| TC-09 | Restore from backup | Fresh instance contains all library, ratings, notes, queue, and settings. |
| TC-10 | Candidate with little metadata | System returns low-confidence best effort and states missing information. |

### 13.4 Recommendation Quality Evaluation

Recommendation quality should be measured with user-centered metrics. The system should improve satisfaction per hour, not total hours consumed.

| Metric | Target |
| --- | --- |
| Post-recommendation satisfaction | At least 70% of followed recommendations rated worth the time after MVP tuning. |
| Regretted starts | Decrease over time compared with user baseline. |
| Time saved | Track monthly hours avoided through skip/drop decisions. |
| Correction rate | AI assumption corrections should decrease as TasteGraph improves. |
| Modern exception discovery | System should surface modern works the user rates worthwhile, not only old works. |
| Queue quality | User should regularly select from the top 5 queue suggestions without feeling overwhelmed. |


---

## 14. Release Plan

CanonOS should be built in phases. The product becomes valuable only when the learning loop works. Therefore, the release plan prioritizes the smallest complete loop before advanced discovery and narrative analysis.

### 14.1 Phase 0 - Prototype

| Goal | Scope | Done when |
| --- | --- | --- |
| Validate core workflow | Manual library, basic ratings, candidate evaluator mock, aftertaste form. | User can log 50 items and evaluate 5 candidates with useful outputs. |

- Use a simple database or spreadsheet-backed prototype.
- No complex integrations required.
- Focus on fields, scoring language, and user feedback.

### 14.2 Phase 1 - MVP

| Included | Deferred |
| --- | --- |
| Library Manager | Full external platform sync |
| Detailed rating scorecards | Full narrative DNA parsing |
| Candidate Evaluator v1 | Critic Council UI polish |
| Tonight Mode v1 | Full mobile app |
| Aftertaste Log | Public/social features |
| Taste Profile v1 | Complex visual graph |
| JSON/CSV import/export | Real-time platform availability |
| Privacy and backup basics | Multi-user product |

### 14.3 Phase 2 - V1 Product

- Anti-Generic Filter becomes more advanced and user-tunable.
- Mood-aware queue gets better session learning.
- Taste evolution reports become monthly and trend-based.
- Deep-cut discovery supports richer requests.
- Adaptation Intelligence supports source/adaptation relationship maps.
- More robust metadata imports and provider integrations.

### 14.4 Phase 3 - Advanced CanonOS

- Narrative DNA Analyzer with cross-medium matching.
- Critic Council with role-based debates.
- Personal Canon Seasons and exploration maps.
- Time saved and regret-prevention analytics.
- Advanced prompt and scoring experimentation.
- Optional mobile app or desktop app.

### 14.5 Phase 4 - Productization

- Multi-user support if the project becomes public.
- Account management and billing if needed.
- Per-user privacy boundaries and data isolation.
- Recommendation benchmark dataset and evaluation harness.
- User onboarding flows for importing existing media history.
- Scalable infrastructure and monitoring.

### 14.6 Build Order Recommendation

1. Define database schema for MediaItem, RatingProfile, AftertasteEntry, MoodCheckIn, CandidateEvaluation, Tag, and QueueItem.
2. Build Library Manager and Add/Edit Media screen.
3. Build rating scorecard and aftertaste form.
4. Build initial Taste Profile generation from logged data.
5. Build Candidate Evaluator with transparent scoring and AI output validation.
6. Build Tonight Mode using queue, mood check-in, and candidate scores.
7. Build export/import and backups.
8. Add Anti-Generic Filter improvements.
9. Add deep-cut discovery and adaptation intelligence.
10. Add Narrative DNA and Critic Council after core trust is established.


---

## 15. Risks and Mitigations

| ID | Risk | Severity | Mitigation |
| --- | --- | --- | --- |
| R-01 | System becomes another noisy recommendation app | High | Keep default recommendation count low; focus on decisions and explanations. |
| R-02 | AI hallucination or overconfidence | High | Require confidence, missing information, source basis, and user correction. |
| R-03 | Too much data entry burden | High | Start with lightweight forms, import support, quick add, and optional detail. |
| R-04 | Over-filtering modern media | Medium | Add explicit modern fairness rule and Modern Defender critic. |
| R-05 | Genericness score becomes vague | Medium | Require named signals and user-specific evidence. |
| R-06 | User ignores system if recommendations are wrong early | High | Expose confidence, ask for feedback, and avoid pretending certainty. |
| R-07 | External metadata providers are incomplete or unavailable | Medium | Manual entry must always work; provider layer is optional. |
| R-08 | Privacy leak through model calls | High | Minimize private context sent to models, use provider settings, log data sent, and allow local/private models if desired. |
| R-09 | System encourages more consumption | High | Include no media, skip, drop, and time saved as first-class outcomes. |
| R-10 | Narrative DNA becomes too ambitious too early | Medium | Delay advanced analysis until MVP learning loop is proven. |

### 15.1 Dependency Risks

- External APIs may change, limit access, or return incomplete metadata.
- LLM providers may change pricing, model behavior, privacy terms, or availability.
- Copyright rules affect what content can be ingested and stored.
- User import data may be messy, duplicated, or inconsistent.
- Recommendation usefulness depends on high-quality user feedback over time.

### 15.2 Risk Response Strategy

- Build a useful manual-first system before automation.
- Make AI outputs transparent, correctable, and confidence-labeled.
- Store user-owned data in exportable formats.
- Keep scoring weights configurable.
- Use short recommendation lists and decision-oriented UX.
- Treat dropped/regretted works as high-value learning data.

## 16. Open Decisions and Recommended Defaults

| ID | Decision | Recommended default |
| --- | --- | --- |
| OD-01 | Local-first or cloud-first? | Recommended default: local-first private web app with optional private cloud deployment later. |
| OD-02 | Single-user or multi-user? | Recommended default: single-user MVP, but use schema design that can add user_id later. |
| OD-03 | Manual entry or external integrations first? | Recommended default: manual entry plus CSV/JSON import first; metadata providers second. |
| OD-04 | AI provider choice? | Recommended default: provider abstraction so the model can change without product rewrite. |
| OD-05 | How detailed should ratings be? | Recommended default: quick scorecard for daily use plus advanced fields for important works. |
| OD-06 | Should CanonOS include social features? | Recommended default: no social features until the personal system works. |
| OD-07 | Should CanonOS support mobile from day one? | Recommended default: responsive web first; mobile app later. |
| OD-08 | Should full scripts/books be ingested? | Recommended default: no full copyrighted content unless legally available and explicitly enabled. |


---

## Appendix A - Sample Output Templates

### A.1 Candidate Evaluation Template

| Field | Example content |
| --- | --- |
| Primary action | Sample |
| One-line verdict | Potentially aligned, but only worth testing because genericness risk is medium-high. |
| Worthiness | 68/100 |
| Personal fit | 74/100 |
| Mood fit | 61/100 |
| Genericness risk | 57/100 |
| Regret risk | 45/100 |
| Commitment cost | Medium |
| Confidence | 62/100 |
| Why it may work | Strong atmosphere, morally ambiguous premise, shorter season, creator signal fits prior likes. |
| Why it may fail | Risk of fake complexity, hype mismatch, and weak final payoff. |
| Sample rule | Watch one episode. Continue only if character agency and atmosphere are both strong. |
| Modern fairness note | The work is recent, but recency is not treated as a negative. The concern is formulaic execution risk. |

### A.2 Tonight Mode Template

| Rank | Recommendation | Reason |
| --- | --- | --- |
| 1 | Short high-density film | Best match for low commitment and need for quality. |
| 2 | Audiobook chapter | Good alternative if visual fatigue is high. |
| 3 | One anime episode sample | Only if willing to test a risky but promising work. |
| Avoid tonight | Long prestige series | Too much commitment for current focus level. |

### A.3 Aftertaste Prompt Template

- Was it worth the time?
- Did it stay with you after finishing?
- What worked?
- What felt generic, hollow, or forced?
- Was the ending satisfying?
- Did you continue because you cared or because you wanted completion?
- Would you recommend it to someone with your taste?
- Should similar works be recommended more, less, or only in certain moods?

### A.4 Personal Red Flag Examples

- Fake complexity without payoff.
- Shallow darkness used as style instead of substance.
- Characters acting stupidly to move the plot.
- Long series with low narrative density.
- Prestige packaging over weak writing.
- Derivative premise without distinctive execution.
- Mystery-box storytelling with weak resolution.
- Adaptation that misses the soul of the source.
- Bingeable but forgettable structure.

### A.5 Positive Signal Examples

- Strong authorial voice.
- Moral ambiguity with consequence.
- Atmosphere that supports theme.
- Character agency and believable motivation.
- Memorable ending or emotional aftertaste.
- Original execution even with familiar premise.
- Dense but rewarding storytelling.
- Modern exception with distinctive craft.
- Cross-medium resonance with works the user already values.


---

## Appendix B - Implementation Checklist

| Checklist item | Definition of done |
| --- | --- |
| Database schema created | MediaItem, RatingProfile, AftertasteEntry, MoodCheckIn, CandidateEvaluation, QueueItem, Tag, TasteProfile, AITrace. |
| Library UI built | Add, edit, delete, search, filter, import, export. |
| Rating scorecard built | All major quality and personal-value dimensions. |
| Aftertaste loop built | Completion/drop prompt, delayed reflection, TasteGraph update. |
| Candidate Evaluator built | Action, scores, reasons, risks, confidence, sample rule. |
| Tonight Mode built | Mood check-in, short ranked list, no-media option. |
| Anti-Generic v1 built | Genericness risk, red flags, modern fairness rule. |
| Corrections built | User can correct AI assumptions and inferred taste signals. |
| Import/export built | CSV and JSON, validation, backup. |
| AI trace built | Prompt/model/version/output/user feedback stored. |
| Security basics built | Auth, secrets handling, private data controls. |
| Testing complete | Core workflow, import, AI failure, privacy, backup/restore. |

## Appendix C - Minimal Database Tables

| Table | Purpose |
| --- | --- |
| media_items | All media records. |
| people_creators | Creators, authors, directors, narrators, studios. |
| media_creators | Join table between media and creators. |
| rating_profiles | Detailed user scores. |
| aftertaste_entries | Post-consumption reflections. |
| tags | User/system tags. |
| media_tags | Join table between media and tags. |
| mood_checkins | Tonight Mode and contextual state. |
| candidate_evaluations | Recommendation decisions and scores. |
| critic_opinions | Critic Council role opinions. |
| queue_items | Adaptive queue state. |
| narrative_dna | Story structure and thematic dimensions. |
| work_relationships | Source/adaptation/sequel/remake links. |
| canon_seasons | Curated personal canon programs. |
| canon_season_items | Ordered items in a canon season. |
| taste_profiles | Derived taste snapshots. |
| ai_traces | Prompt/model/output logs. |
| import_records | Import sessions and validation results. |
| settings | User preferences, weights, privacy, model config. |

## Appendix D - Final Definition of Done

CanonOS is ready for serious personal use when the user can rely on it for the core decision loop without feeling that it is a burden or a generic recommender.

- The user has imported or entered enough history for meaningful taste inference.
- The system makes clear decisions and explains them well.
- The system is willing to recommend skip, drop, sample, delay, or no media.
- The system preserves nuance about modern media and finds worthwhile exceptions.
- The user can correct the system and see it improve.
- The system reduces regretted starts and increases satisfaction per hour.
- All user-owned data can be exported, backed up, and deleted.
- The product feels like a private media intelligence system, not another endless content feed.
