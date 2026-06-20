export interface Requirement {
  id: string;
  title: string;
  description?: string;
  status: RequirementStatus;
  priority: Priority;
  projectId: string;
  author: string;
  testCoverage: number;
  date?: string;
  createdAt: string;
  updatedAt: string;
  testCases?: TestCase[];
}

export interface TestCase {
  id: string;
  title: string;
  description?: string;
  preconditions?: string;
  steps: string[];
  expectedResult: string;
  requirementId: string;
  requirement?: Requirement;
  testPlanId?: string;
  projectId: string;
  priority: Priority;
  status: TestCaseStatus;
  category: TestCaseCategory;
  automated: boolean;
  author?: string;
  lastExecuted?: string;
  executionResult?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TestPlan {
  id: string;
  title: string;
  description?: string;
  strategy?: string;
  scope?: string;
  risks?: string;
  resources?: string;
  startDate?: string;
  endDate?: string;
  status: TestPlanStatus;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSettings {
  id: string;
  projectId: string;
  aiProvider: AIProvider;
  apiKey: string;
  baseUrl?: string;
  maxTokens: number;
  temperature: number;
  model?: string;
  systemPromptTestPlan?: string;
  systemPromptTestCase?: string;
  systemPromptScript?: string;
  enableStreaming?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AIContentParams {
  projectId?: string;
  aiProvider?: AIProvider;
  type: GenerationType | string;
  requirement?: any;
  customPrompt?: string;
  context?: Record<string, any>;
  prompt?: string;
}

export interface AIContentResponse {
  type: GenerationType | string;
  content: string;
  timestamp: string;
}

export interface AIContentResponse {
  type: GenerationType | string;
  content: string;
  timestamp: string;
}

export interface ProjectStats {
  totalRequirements: number;
  pendingReview: number;
  lowCoverage: number;
  midCoverage: number;
  highCoverage: number;
  averageCoverage: number;
  totalTestCases: number;
  passRate: number;
  automationRate: number;
  pendingExecution: number;
  totalDefects: number;
  openDefects: number;
  totalScripts: number;
}

export interface PaginationParams {
  page: number;
  limit: number;
  search?: string;
  status?: RequirementStatus;
  priority?: Priority;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Defect {
  id: string;
  title: string;
  description?: string;
  steps?: string;
  severity: DefectSeverity;
  priority: Priority;
  status: DefectStatus;
  type: DefectType;
  projectId: string;
  testCaseId?: string;
  requirementId?: string;
  reporter?: string;
  assignee?: string;
  environment?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export interface TestScript {
  id: string;
  title: string;
  description?: string;
  code: string;
  language: string;
  filePath?: string;
  requirementId?: string;
  testCaseId?: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

// ==================== Type Aliases ====================
export type RequirementStatus = 'DRAFT' | 'REVIEW' | 'IN_PROGRESS' | 'APPROVED';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TestCaseStatus = 'PENDING' | 'PASS' | 'FAIL' | 'BLOCKED';
export type TestCaseCategory = 'FUNCTIONAL' | 'PERFORMANCE' | 'SECURITY' | 'USABILITY' | 'COMPATIBILITY' | 'REGRESSION' | 'SMOKE' | 'E2E';
export type TestPlanStatus = 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD';
export type AIProvider = 'OPENAI' | 'ANTHROPIC' | 'GOOGLE' | 'DEEPSEEK' | 'KIMI' | 'QWEN';
export type DefectSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type DefectStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'REOPENED';
export type DefectType = 'BUG' | 'IMPROVEMENT' | 'TASK';

export enum GenerationType {
  REQUIREMENT = 'REQUIREMENT',
  TEST_PLAN = 'TEST_PLAN',
  TEST_CASE = 'TEST_CASE',
  TEST_CASES = 'TEST_CASES',
  TEST_SCRIPT = 'TEST_SCRIPT',
  CODE_REVIEW = 'CODE_REVIEW',
  EXPLAIN_CODE = 'EXPLAIN_CODE',
  OPTIMIZE_CODE = 'OPTIMIZE_CODE',
}

// ==================== Agent 工作流相关类型 ====================

export enum AgentType {
  QA_ARCHITECT = 'QA_ARCHITECT',           // 需求分析与评审 Agent
  TEST_DESIGNER = 'TEST_DESIGNER',         // 测试设计与用例生成 Agent
  TEST_DEVELOPER = 'TEST_DEVELOPER',       // 测试开发与执行 Agent
  TEST_MAINTAINER = 'TEST_MAINTAINER',     // 测试维护 Agent
}

export enum AgentTaskStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum AgentActionType {
  // QA Architect Actions
  ANALYZE_REQUIREMENT = 'ANALYZE_REQUIREMENT',
  DETECT_CONFLICTS = 'DETECT_CONFLICTS',
  GENERATE_AC = 'GENERATE_AC',
  
  // Test Designer Actions
  GENERATE_TEST_POINTS = 'GENERATE_TEST_POINTS',
  GENERATE_TEST_CASES = 'GENERATE_TEST_CASES',
  TRACE_REQUIREMENT = 'TRACE_REQUIREMENT',
  SYNTHESIZE_TEST_DATA = 'SYNTHESIZE_TEST_DATA',
  
  // Test Developer Actions
  GENERATE_SCRIPT = 'GENERATE_SCRIPT',
  EXECUTE_SCRIPT = 'EXECUTE_SCRIPT',
  ANALYZE_EXECUTION_RESULT = 'ANALYZE_EXECUTION_RESULT',
  FIX_SCRIPT = 'FIX_SCRIPT',
  FUZZ_TEST_API = 'FUZZ_TEST_API',
  
  // Test Maintainer Actions
  SELF_HEAL_SCRIPT = 'SELF_HEAL_SCRIPT',
  ANALYZE_FAILURE_LOG = 'ANALYZE_FAILURE_LOG',
  ROOT_CAUSE_ANALYSIS = 'ROOT_CAUSE_ANALYSIS',
}

export interface AgentTask {
  id: string;
  type: AgentType;
  action: AgentActionType;
  status: AgentTaskStatus;
  input: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  metadata?: Record<string, any>;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface AgentWorkflow {
  id: string;
  name: string;
  description?: string;
  type: AgentType;
  status: AgentTaskStatus;
  tasks: AgentTask[];
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  timestamp: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface ToolResult {
  toolCallId: string;
  result: any;
  error?: string;
}

export interface AgentConfig {
  id: string;
  type: AgentType;
  name: string;
  description?: string;
  systemPrompt: string;
  tools: string[];
  maxIterations: number;
  temperature: number;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentExecutionLog {
  id: string;
  taskId: string;
  iteration: number;
  action: AgentActionType;
  input: string;
  output: string;
  error?: string;
  duration: number;
  createdAt: string;
}

export interface TestPoint {
  id: string;
  title: string;
  description?: string;
  category: string;
  priority: Priority;
  requirementId: string;
  children?: TestPoint[];
  testCaseIds?: string[];
}

export interface TraceabilityMatrix {
  requirementId: string;
  requirementTitle: string;
  testPointIds: string[];
  testCaseIds: string[];
  coverage: number;
  status: 'COVERED' | 'PARTIAL' | 'UNCOVERED';
}

export interface DiagnosticReport {
  id: string;
  requirementId: string;
  ambiguities: string[];
  conflicts: string[];
  missingEdgeCases: string[];
  suggestions: string[];
  confidence: number;
  createdAt: string;
}

export interface SelfHealingResult {
  originalXPath: string;
  suggestedXPath: string;
  confidence: number;
  diffScreenshot?: string;
  reasoning: string;
}

export interface RootCauseReport {
  id: string;
  defectId: string;
  suspectedCommit?: string;
  suspectedAuthor?: string;
  affectedFiles: string[];
  rootCause: string;
  fixSuggestion: string;
  confidence: number;
  createdAt: string;
}

export interface SandboxExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
  artifacts?: string[];
}

export interface FuzzTestResult {
  endpoint: string;
  method: string;
  totalRequests: number;
  failures: FuzzFailure[];
  duration: number;
}

export interface FuzzFailure {
  input: Record<string, any>;
  statusCode: number;
  response: string;
  error?: string;
}
