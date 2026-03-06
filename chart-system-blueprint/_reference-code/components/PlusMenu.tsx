'use client';

import { useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';
import {
  Sparkles,
  Globe,
  Presentation,
  ScanText,
  Database,
  MessageSquareText,
  BarChart3,
  FileText,
  Clock,
  ChevronRight,
  Files,
  Search,
  Shield,
  PenTool,
  Building2,
  Play,
  HelpCircle,
} from 'lucide-react';

/**
 * Toggle states for the Plus Menu features
 */
export interface PlusMenuToggleStates {
  // Content Generation
  generateImageEnabled: boolean;
  agentEnabled: boolean;
  slidesEnabled: boolean;
  // Processing Modes
  ocrEnabled: boolean;
  dataEnabled: boolean;
  nlpEnabled: boolean;
  chartEnabled: boolean; // Modo unificado: interativo + executivo
  infographicEnabled: boolean;
  // Integrations
  hubspotEnabled: boolean;
  // Advanced Research (Admin only)
  deepResearchEnabled: boolean;
  // New: Google Workspace
  emailEnabled: boolean;
  calendarEnabled: boolean;
  driveEnabled: boolean;
  contactsEnabled: boolean;
  // New: CRM expanded
  crmEnabled: boolean;
  // New: Automation
  workflowEnabled: boolean;
  whatsappEnabled: boolean;
  // New: Memory & Export
  memoryEnabled: boolean;
  exportEnabled: boolean;
}

/**
 * Default toggle states (all disabled)
 */
export const DEFAULT_PLUS_MENU_STATES: PlusMenuToggleStates = {
  generateImageEnabled: false,
  agentEnabled: false,
  slidesEnabled: false,
  ocrEnabled: false,
  dataEnabled: false,
  nlpEnabled: false,
  chartEnabled: false, // Modo unificado: interativo + executivo
  infographicEnabled: false,
  hubspotEnabled: false,
  deepResearchEnabled: false,
  // New states
  emailEnabled: false,
  calendarEnabled: false,
  driveEnabled: false,
  contactsEnabled: false,
  crmEnabled: false,
  workflowEnabled: false,
  whatsappEnabled: false,
  memoryEnabled: false,
  exportEnabled: false,
};

interface PlusMenuProps {
  /** Whether the menu is open */
  isOpen: boolean;
  /** Callback to close the menu */
  onClose: () => void;
  /** Current toggle states */
  toggleStates: PlusMenuToggleStates;
  /** Callback when a toggle changes */
  onToggleChange: (key: keyof PlusMenuToggleStates) => void;
  /** Callback to open templates panel */
  onOpenTemplates?: () => void;
  /** Callback to extract automation from conversation */
  onExtractAutomation?: () => void;
  /** Callback to open document processor */
  onOpenDocumentProcessor?: () => void;
  /** Callback to open program preview panel */
  onOpenProgramPreview?: () => void;
  /** Callback to open feature help panel */
  onOpenHelp?: () => void;
  /** Whether the current user is an admin */
  isAdmin?: boolean;
}

interface ToggleItemProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

interface ActionItemProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick?: () => void;
  disabled?: boolean;
}

interface SectionHeaderProps {
  title: string;
}

/**
 * Toggle switch component
 */
function Toggle({ enabled, disabled }: { enabled: boolean; disabled?: boolean }) {
  return (
    <div
      className={cn(
        'relative inline-flex h-5 w-9 items-center rounded-full',
        'transition-colors duration-200',
        enabled
          ? 'bg-[var(--qi-interactive)]'
          : 'bg-[var(--qi-bg-tertiary)]',
        disabled && 'opacity-50'
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white shadow-sm',
          'transition-transform duration-200',
          enabled ? 'translate-x-4' : 'translate-x-0.5'
        )}
      />
    </div>
  );
}

/**
 * Section header
 */
function SectionHeader({ title }: SectionHeaderProps) {
  return (
    <div
      className={cn(
        'px-[var(--qi-spacing-md)] py-[var(--qi-spacing-xs)]',
        'bg-[var(--qi-bg-secondary)]',
        'border-b border-[var(--qi-border)]'
      )}
    >
      <span className="text-[var(--qi-font-size-body-xs)] font-medium text-[var(--qi-text-secondary)] uppercase tracking-wide">
        {title}
      </span>
    </div>
  );
}

/**
 * Toggle menu item - horizontal layout for vertical list
 */
function ToggleItem({ icon, label, description, enabled, onToggle, disabled = false }: ToggleItemProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      title={description}
      className={cn(
        'flex items-center gap-[var(--qi-spacing-sm)]',
        'px-[var(--qi-spacing-sm)] py-[var(--qi-spacing-xs)]',
        'rounded-[var(--qi-radius-sm)]',
        'w-full text-left',
        'hover:bg-[var(--qi-bg-secondary)]',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'transition-colors duration-[var(--qi-duration-fast)]',
        enabled && 'bg-[var(--qi-accent-muted)] border border-[var(--qi-accent)]'
      )}
    >
      <div className={cn(
        'flex-shrink-0',
        enabled ? 'text-[var(--qi-interactive)]' : 'text-[var(--qi-text-secondary)]'
      )}>
        {icon}
      </div>
      <p className="flex-1 text-[var(--qi-font-size-body-sm)] font-medium text-[var(--qi-text-primary)]">
        {label}
      </p>
      <Toggle enabled={enabled} disabled={disabled} />
    </button>
  );
}

/**
 * Action menu item - horizontal layout for vertical list
 */
function ActionItem({ icon, label, description, onClick, disabled = false }: ActionItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={description}
      className={cn(
        'flex items-center gap-[var(--qi-spacing-sm)]',
        'px-[var(--qi-spacing-sm)] py-[var(--qi-spacing-xs)]',
        'rounded-[var(--qi-radius-sm)]',
        'w-full text-left',
        'hover:bg-[var(--qi-bg-secondary)]',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'transition-colors duration-[var(--qi-duration-fast)]'
      )}
    >
      <div className="flex-shrink-0 text-[var(--qi-text-secondary)]">
        {icon}
      </div>
      <p className="flex-1 text-[var(--qi-font-size-body-sm)] font-medium text-[var(--qi-text-primary)]">
        {label}
      </p>
      <ChevronRight
        strokeWidth={1.75}
        className="w-4 h-4 text-[var(--qi-text-tertiary)]"
      />
    </button>
  );
}

/**
 * Plus Menu component
 *
 * Dropdown menu with 10 options divided into 3 sections:
 * - Content Generation (toggles): Gerar Imagem, Agente Browser, Gerar Slides
 * - Processing Modes (toggles): OCR, Data Specialist, NLP, Gerar Grafico
 * - Tools (actions): Templates, Workflow Builder, Criar Automação
 */
export const PlusMenu = memo(function PlusMenu({
  isOpen,
  onClose,
  toggleStates,
  onToggleChange,
  onOpenTemplates,
  onExtractAutomation,
  onOpenDocumentProcessor,
  onOpenProgramPreview,
  onOpenHelp,
  isAdmin = false,
}: PlusMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const { canUsePlusMenuFeature, isSuperAdmin, isLoading: _permissionsLoading } = usePermissions();

  // Consider both isSuperAdmin (from permissions API) and isAdmin prop for full access
  const hasFullAccess = isSuperAdmin || isAdmin;

  // Memoized permission checks for each feature
  const permissions = useMemo(() => ({
    generateImage: hasFullAccess || canUsePlusMenuFeature('generateImage'),
    agent: hasFullAccess || canUsePlusMenuFeature('agent'),
    slides: hasFullAccess || canUsePlusMenuFeature('slides'),
    ocr: hasFullAccess || canUsePlusMenuFeature('ocr'),
    data: hasFullAccess || canUsePlusMenuFeature('data'),
    nlp: hasFullAccess || canUsePlusMenuFeature('nlp'),
    chart: hasFullAccess || canUsePlusMenuFeature('chart'),
    infographic: hasFullAccess || canUsePlusMenuFeature('infographic'),
    hubspot: hasFullAccess || canUsePlusMenuFeature('hubspot'),
    deepResearch: hasFullAccess || canUsePlusMenuFeature('deepResearch'),
  }), [canUsePlusMenuFeature, hasFullAccess]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Close on ESC
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleToggle = useCallback(
    (key: keyof PlusMenuToggleStates) => {
      onToggleChange(key);
    },
    [onToggleChange]
  );

  const handleActionClick = useCallback(
    (action?: () => void) => {
      if (action) {
        action();
        onClose();
      }
    },
    [onClose]
  );

  if (!isOpen) return null;

  const iconProps = {
    strokeWidth: 1.75,
    className: 'w-4 h-4',
  };

  return (
    <div
      ref={menuRef}
      className={cn(
        'absolute bottom-full left-0 mb-2',
        'w-[400px]',
        'bg-[var(--qi-surface)]',
        'border border-[var(--qi-border)]',
        'rounded-[var(--qi-radius-md)]',
        'shadow-lg',
        'overflow-hidden',
        'z-50'
      )}
    >
      {/* Two column layout */}
      <div className="grid grid-cols-2">
        {/* Left Column: Content Generation + Tools */}
        <div className="border-r border-[var(--qi-border)]">
          {/* Section 1: Content Generation */}
          <SectionHeader title="Geração de Conteúdo" />
          <div className="flex flex-col gap-[var(--qi-spacing-xs)] p-[var(--qi-spacing-sm)]">
            {permissions.generateImage && (
              <ToggleItem
                icon={<Sparkles {...iconProps} />}
                label="Gerar Imagem"
                description="Gera imagem com IA baseada na conversa"
                enabled={toggleStates.generateImageEnabled}
                onToggle={() => handleToggle('generateImageEnabled')}
              />
            )}
            {permissions.agent && (
              <ToggleItem
                icon={<Globe {...iconProps} />}
                label="Agente Browser"
                description="Navega e executa ações no browser"
                enabled={toggleStates.agentEnabled}
                onToggle={() => handleToggle('agentEnabled')}
              />
            )}
            {permissions.slides && (
              <ToggleItem
                icon={<Presentation {...iconProps} />}
                label="Gerar Slides"
                description="Cria apresentação PowerPoint"
                enabled={toggleStates.slidesEnabled}
                onToggle={() => handleToggle('slidesEnabled')}
              />
            )}
            {!permissions.generateImage && !permissions.agent && !permissions.slides && (
              <p className="text-xs text-[var(--qi-text-tertiary)] italic px-2">
                Sem acesso a geração de conteúdo
              </p>
            )}
          </div>

          {/* Section 2: Tools */}
          <SectionHeader title="Ferramentas" />
          <div className="flex flex-col gap-[var(--qi-spacing-xs)] p-[var(--qi-spacing-sm)]">
            <ActionItem
              icon={<FileText {...iconProps} />}
              label="Templates"
              description="Abre biblioteca de templates"
              onClick={() => handleActionClick(onOpenTemplates)}
              disabled={!onOpenTemplates}
            />
            <ActionItem
              icon={<Clock {...iconProps} />}
              label="Automação"
              description="Extrai automação da conversa atual"
              onClick={() => handleActionClick(onExtractAutomation)}
              disabled={!onExtractAutomation}
            />
            <ActionItem
              icon={<Files {...iconProps} />}
              label="Documentos"
              description="PDF merge/split, Excel criação/edicao"
              onClick={() => handleActionClick(onOpenDocumentProcessor)}
              disabled={!onOpenDocumentProcessor}
            />
            <ActionItem
              icon={<Play {...iconProps} />}
              label="Preview Programa"
              description="Abre preview do VibeCoding/programa"
              onClick={() => handleActionClick(onOpenProgramPreview)}
              disabled={!onOpenProgramPreview}
            />
          </div>
        </div>

        {/* Right Column: Processing Modes */}
        <div>
          <SectionHeader title="Modos de Processamento" />
          <div className="flex flex-col gap-[var(--qi-spacing-xs)] p-[var(--qi-spacing-sm)]">
            {permissions.ocr && (
              <ToggleItem
                icon={<ScanText {...iconProps} />}
                label="OCR"
                description="Extrai texto de imagens"
                enabled={toggleStates.ocrEnabled}
                onToggle={() => handleToggle('ocrEnabled')}
              />
            )}
            {permissions.data && (
              <ToggleItem
                icon={<Database {...iconProps} />}
                label="Data Specialist"
                description="Análise de dados avancada"
                enabled={toggleStates.dataEnabled}
                onToggle={() => handleToggle('dataEnabled')}
              />
            )}
            {permissions.nlp && (
              <ToggleItem
                icon={<MessageSquareText {...iconProps} />}
                label="NLP"
                description="Processamento de linguagem natural"
                enabled={toggleStates.nlpEnabled}
                onToggle={() => handleToggle('nlpEnabled')}
              />
            )}
            {permissions.chart && (
              <ToggleItem
                icon={<BarChart3 {...iconProps} />}
                label="Gráfico"
                description="Gráficos interativos com opcao de análise executiva"
                enabled={toggleStates.chartEnabled}
                onToggle={() => handleToggle('chartEnabled')}
              />
            )}
            {permissions.infographic && (
              <ToggleItem
                icon={<PenTool {...iconProps} />}
                label="Infografico"
                description="Gera infografico visual com IA"
                enabled={toggleStates.infographicEnabled}
                onToggle={() => handleToggle('infographicEnabled')}
              />
            )}
            {permissions.hubspot && (
              <ToggleItem
                icon={<Building2 {...iconProps} className="w-4 h-4 text-[var(--qi-brand-hubspot)]" />}
                label="HubSpot CRM"
                description="Análise de contatos e deals do HubSpot"
                enabled={toggleStates.hubspotEnabled}
                onToggle={() => handleToggle('hubspotEnabled')}
              />
            )}

            {/* Deep Research - requires permission */}
            {permissions.deepResearch && (
              <div className="mt-[var(--qi-spacing-sm)] pt-[var(--qi-spacing-sm)] border-t border-[var(--qi-border)]">
                <div className="flex items-center gap-1 mb-[var(--qi-spacing-xs)]">
                  <Shield strokeWidth={1.75} className="w-3 h-3 text-[var(--qi-interactive)]" />
                  <span className="text-[10px] text-[var(--qi-interactive)] font-medium uppercase">
                    Avancado
                  </span>
                </div>
                <ToggleItem
                  icon={<Search {...iconProps} />}
                  label="Pesquisa Profunda"
                  description="Pesquisa autonoma com multiplos agentes (custo elevado)"
                  enabled={toggleStates.deepResearchEnabled}
                  onToggle={() => handleToggle('deepResearchEnabled')}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer with help button */}
      <div className="px-3 py-2 border-t border-[var(--qi-border)] bg-[var(--qi-bg-secondary)]">
        <button
          type="button"
          onClick={() => {
            onOpenHelp?.();
            onClose();
          }}
          className={cn(
            'flex items-center gap-2',
            'text-xs text-[var(--qi-text-tertiary)]',
            'hover:text-[var(--qi-interactive)]',
            'transition-colors'
          )}
        >
          <HelpCircle strokeWidth={1.75} className="w-3.5 h-3.5" />
          <span>Ajuda - como usar as funcionalidades</span>
        </button>
      </div>
    </div>
  );
});
