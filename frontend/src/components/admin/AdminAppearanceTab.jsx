import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowPathIcon,
  CheckIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Skeleton from '../ui/Skeleton';
import EmptyState from '../ui/EmptyState';
import { useSystemConfig } from '../../context/useSystemConfig';
import { useToast } from '../../context/useToast';
import {
  fetchAdminAppearance,
  updateAdminAppearance,
} from '../../services/adminApi';
import {
  DEFAULT_PRIMARY_COLOR,
  PRESET_PRIMARY_COLORS,
  derivePrimaryPalette,
  ensureAccessibleTextColor,
  normalizeHexColor,
} from '../../utils/themeColor';

export default function AdminAppearanceTab() {
  const { t, i18n } = useTranslation(['admin', 'common']);
  const { primaryColor, updatePrimaryColorSnapshot } = useSystemConfig();
  const { showToast } = useToast();

  const [savedColor, setSavedColor] = useState(
    () => normalizeHexColor(primaryColor) || DEFAULT_PRIMARY_COLOR
  );
  const [hexInput, setHexInput] = useState(
    () => normalizeHexColor(primaryColor) || DEFAULT_PRIMARY_COLOR
  );
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadTick, setReloadTick] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let ignore = false;
    fetchAdminAppearance()
      .then((res) => {
        if (ignore) return;
        const serverHex =
          normalizeHexColor(res?.primary_color) || DEFAULT_PRIMARY_COLOR;
        setSavedColor(serverHex);
        setHexInput(serverHex);
        setLoadError('');
        updatePrimaryColorSnapshot(serverHex);
      })
      .catch((err) => {
        if (!ignore) {
          setLoadError(err.message || t('admin:appearance.loadError'));
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [reloadTick, i18n.language, t, updatePrimaryColorSnapshot]);

  const handleRetryLoad = () => {
    setLoading(true);
    setLoadError('');
    setReloadTick((prev) => prev + 1);
  };

  const normalizedDraft = normalizeHexColor(hexInput);
  const isDraftValid = Boolean(normalizedDraft);
  const previewHex = normalizedDraft || savedColor;
  const isDirty = isDraftValid && normalizedDraft !== savedColor;
  const isDefaultPreview = previewHex === DEFAULT_PRIMARY_COLOR;

  // Derive primary shades and accessible text contrast
  const previewPalette = useMemo(
    () => derivePrimaryPalette(previewHex),
    [previewHex]
  );

  const contrastTextColor = useMemo(
    () => ensureAccessibleTextColor(previewHex),
    [previewHex]
  );

  const previewCssVars = useMemo(() => {
    return {
      '--color-sky-50': previewPalette[50],
      '--color-sky-100': previewPalette[100],
      '--color-sky-200': previewPalette[200],
      '--color-sky-300': previewPalette[300],
      '--color-sky-400': previewPalette[400],
      '--color-sky-500': previewPalette[500],
      '--color-sky-600': previewPalette[600],
      '--color-sky-700': previewPalette[700],
      '--color-sky-800': previewPalette[800],
      '--color-sky-900': previewPalette[900],
      '--color-sky-950': previewPalette[950],
      '--color-primary': previewPalette[700],
      '--color-primary-hover': previewPalette[800],
      '--color-primary-active': previewPalette[900],
      '--color-primary-soft': previewPalette[50],
      '--color-primary-subtle': previewPalette[100],
      '--color-primary-border': previewPalette[200],
      '--color-primary-contrast': contrastTextColor,
      '--color-primary-fg': contrastTextColor,
    };
  }, [previewPalette, contrastTextColor]);

  const handleSelectColor = (nextHex) => {
    const clean = normalizeHexColor(nextHex);
    if (clean) {
      setHexInput(clean);
    }
  };

  const handleHexInputChange = (e) => {
    const raw = e.target.value.toUpperCase().replace(/[^#0-9A-F]/g, '');
    if (!raw) {
      setHexInput('#');
      return;
    }
    setHexInput(raw.startsWith('#') ? raw.slice(0, 7) : `#${raw.slice(0, 6)}`);
  };

  const handleSave = async () => {
    if (!isDraftValid || !isDirty || saving) return;
    setSaving(true);
    try {
      const res = await updateAdminAppearance({
        primary_color: normalizedDraft,
      });
      const updatedHex =
        normalizeHexColor(res?.primary_color) || normalizedDraft;
      setSavedColor(updatedHex);
      setHexInput(updatedHex);
      updatePrimaryColorSnapshot(updatedHex);
      showToast(t('admin:appearance.savedToast'), 'success');
    } catch (err) {
      showToast(err.message || t('admin:appearance.saveFailed'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefault = () => {
    setHexInput(DEFAULT_PRIMARY_COLOR);
  };

  if (loading) {
    return <Skeleton variant="admin-appearance" />;
  }

  if (loadError) {
    return (
      <EmptyState
        icon={ExclamationCircleIcon}
        title={t('admin:appearance.loadErrorTitle')}
        description={loadError}
        actionLabel={t('common:actions.retry')}
        onAction={handleRetryLoad}
      />
    );
  }

  return (
    <Card className="w-full overflow-hidden">
      {/* SaaS Card Header - Title on Left, Status Badge on Right (No System Codes) */}
      <div className="px-3.5 sm:px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
        <h2 className="text-sm sm:text-base font-semibold text-slate-900">
          {t('admin:appearance.cardTitle')}
        </h2>
        {isDirty && (
          <Badge variant="due" dot>
            {t('admin:appearance.unsavedBadge')}
          </Badge>
        )}
      </div>

      {/* Clean Divided Rows without Subtitles */}
      <div className="divide-y divide-slate-200">
        {/* Row 1: Preset Colors */}
        <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <span className="text-sm font-medium text-slate-900">
            {t('admin:appearance.presetsLabel')}
          </span>

          <div className="flex flex-wrap items-center gap-2">
            {PRESET_PRIMARY_COLORS.map((preset) => {
              const isSelected = previewHex === preset.hex;
              const swatchContrast = ensureAccessibleTextColor(preset.hex);
              const label = t(`admin:appearance.presets.${preset.id}`);
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectColor(preset.hex)}
                  title={label}
                  aria-label={label}
                  aria-pressed={isSelected}
                  className={`w-9 h-9 rounded-control flex items-center justify-center transition-all duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700 ${
                    isSelected
                      ? 'ring-2 ring-slate-900 ring-offset-2 scale-105'
                      : 'border border-slate-200 hover:scale-105'
                  }`}
                  style={{ backgroundColor: preset.hex }}
                >
                  {isSelected && (
                    <CheckIcon
                      className="w-4 h-4"
                      style={{ color: swatchContrast }}
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2: Custom Color */}
        <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <span className="text-sm font-medium text-slate-900">
            {t('admin:appearance.customPickerLabel')}
          </span>

          <div className="flex flex-wrap items-center gap-2.5">
            <label
              className="relative w-9 h-9 rounded-control border border-slate-300 hover:border-slate-400 overflow-hidden cursor-pointer shrink-0 transition-colors duration-150 focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-sky-700"
              style={{ backgroundColor: previewHex }}
              title={t('admin:appearance.colorPickerAria')}
            >
              <input
                type="color"
                value={previewHex}
                onChange={(e) => handleSelectColor(e.target.value)}
                aria-label={t('admin:appearance.colorPickerAria')}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </label>

            <input
              id="admin-primary-hex-input"
              type="text"
              value={hexInput}
              onChange={handleHexInputChange}
              maxLength={7}
              spellCheck={false}
              placeholder={DEFAULT_PRIMARY_COLOR}
              aria-label={t('admin:appearance.hexInputAria')}
              aria-invalid={!isDraftValid}
              className={`h-9 w-28 px-3 rounded-control bg-white border text-sm font-mono font-medium text-slate-900 uppercase tabular-nums transition-colors duration-150 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700 ${
                isDraftValid
                  ? 'border-slate-200 hover:border-slate-300 focus:border-sky-700'
                  : 'border-red-400 focus:border-red-600'
              }`}
            />
          </div>
        </div>

        {/* Row 3: Interface Preview Section */}
        <div className="p-3.5 sm:p-4 flex flex-col gap-3">
          <span className="text-sm font-medium text-slate-900">
            {t('admin:appearance.previewLabel')}
          </span>

          <div
            style={previewCssVars}
            className="p-3.5 sm:p-4 rounded-surface bg-slate-50 border border-slate-200 flex flex-col gap-3.5"
          >
            {/* Interactive Controls Sample */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Segmented Tab */}
              <div className="inline-flex p-1 bg-white border border-slate-200 rounded-control gap-1">
                <span
                  style={{
                    backgroundColor: previewHex,
                    color: contrastTextColor,
                  }}
                  className="px-2.5 sm:px-3 py-1 rounded-control text-xs font-semibold select-none transition-colors duration-150"
                >
                  {t('admin:appearance.previewTabActive')}
                </span>
                <span className="px-2.5 sm:px-3 py-1 rounded-control text-xs font-medium text-slate-600 select-none">
                  {t('admin:appearance.previewTabInactive')}
                </span>
              </div>

              {/* Action Buttons & Avatar */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  tabIndex={-1}
                  style={{
                    backgroundColor: previewHex,
                    color: contrastTextColor,
                    borderColor: previewHex,
                  }}
                  className="h-8 px-3 text-xs font-semibold rounded-control border inline-flex items-center justify-center pointer-events-none select-none transition-colors duration-150"
                >
                  {t('admin:appearance.previewPrimaryBtn')}
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  className="h-8 px-3 text-xs font-medium rounded-control border border-slate-300 bg-white text-slate-800 inline-flex items-center justify-center pointer-events-none select-none"
                >
                  {t('admin:appearance.previewSecondaryBtn')}
                </button>
                <div
                  style={{
                    backgroundColor: previewHex,
                    color: contrastTextColor,
                  }}
                  className="w-8 h-8 rounded-control font-semibold text-xs flex items-center justify-center select-none shrink-0 transition-colors duration-150"
                  aria-hidden="true"
                >
                  DP
                </div>
              </div>
            </div>

            {/* Learning Card Header & Progress Bar Sample */}
            <div className="p-3 sm:p-3.5 bg-white border border-slate-200 rounded-surface flex flex-col gap-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    style={{
                      backgroundColor: previewHex,
                      color: contrastTextColor,
                      borderColor: previewHex,
                    }}
                    className="h-[22px] px-2 text-[11px] font-medium leading-none rounded-badge border inline-flex items-center justify-center transition-colors duration-150"
                  >
                    N3
                  </span>
                  <Badge variant="lesson">{t('admin:appearance.previewLesson')}</Badge>
                  <Badge variant="learned" dot>
                    {t('admin:appearance.previewLearned')}
                  </Badge>
                </div>
                <span className="text-xs font-medium text-slate-600 tabular-nums">
                  12 / 25
                </span>
              </div>

              {/* Progress Statistics & Track */}
              <div className="flex flex-col gap-1.5 pt-0.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 tabular-nums">
                  <span className="font-medium text-slate-700">
                    {t('common:progress.learningLabel')}
                  </span>
                  <div className="flex items-center gap-2.5 text-[11px] sm:text-xs">
                    <span className="inline-flex items-center gap-1">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: previewPalette[300] }}
                        aria-hidden="true"
                      />
                      <span>{t('common:progress.learnedStat', { count: 8 })}</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: previewHex }}
                        aria-hidden="true"
                      />
                      <span>{t('common:progress.rememberedStat', { count: 4 })}</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span
                        className="w-2 h-2 rounded-full bg-emerald-600"
                        aria-hidden="true"
                      />
                      <span>{t('common:progress.masteredStat', { count: 1 })}</span>
                    </span>
                    <span className="font-semibold text-slate-800">52%</span>
                  </div>
                </div>

                <div className="w-full h-1.5 sm:h-2 rounded-full bg-slate-100 overflow-hidden flex">
                  <div
                    style={{ width: '32%', backgroundColor: previewPalette[300] }}
                    className="h-full transition-all duration-300"
                  />
                  <div
                    style={{ width: '16%', backgroundColor: previewHex }}
                    className="h-full transition-all duration-300"
                  />
                  <div
                    style={{ width: '4%' }}
                    className="h-full bg-emerald-600 transition-all duration-300"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Action Footer */}
      <div className="px-3.5 sm:px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={saving || isDefaultPreview}
          onClick={handleResetToDefault}
          className="w-full sm:w-auto"
        >
          <ArrowPathIcon className="w-4 h-4" aria-hidden="true" />
          <span>{t('admin:appearance.resetDefault')}</span>
        </Button>

        <Button
          variant="primary"
          size="sm"
          disabled={saving || !isDirty || !isDraftValid}
          onClick={handleSave}
          className="w-full sm:w-auto"
        >
          <CheckIcon className="w-4 h-4" aria-hidden="true" />
          <span>
            {saving
              ? t('common:actions.saving')
              : t('admin:appearance.saveAction')}
          </span>
        </Button>
      </div>
    </Card>
  );
}
