'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, Mail, Send } from 'lucide-react';

import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ERROR_TYPES = [
  'Incorrect salary amount',
  'Wrong employer',
  'Incorrect job title',
  'Duplicate entry',
  'Missing entry',
  'Wrong region assignment',
  'Other',
] as const;

const YEARS = [2025, 2024, 2023];

interface FormData {
  errorType: string;
  personName: string;
  employer: string;
  year: string;
  description: string;
  correction: string;
  evidence: string;
  email: string;
}

interface FormErrors {
  errorType?: string;
  description?: string;
  email?: string;
}

export default function ReportErrorPage() {
  const [formData, setFormData] = useState<FormData>({
    errorType: '',
    personName: '',
    employer: '',
    year: '',
    description: '',
    correction: '',
    evidence: '',
    email: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);

  function validate(): boolean {
    const next: FormErrors = {};
    if (!formData.errorType) next.errorType = 'Please select an error type.';
    if (!formData.description.trim())
      next.description = 'A description of the error is required.';
    if (
      formData.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
    ) {
      next.email = 'Please enter a valid email address.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (validate()) {
      setSubmitted(true);
    }
  }

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setFormData((p) => ({ ...p, [key]: value }));
  }

  const mailtoSubject = encodeURIComponent('Data Error Report — Pay Lens');
  const mailtoBody = encodeURIComponent(
    `Error Type: ${formData.errorType}\nPerson: ${formData.personName}\nEmployer: ${formData.employer}\nYear: ${formData.year}\n\nDescription:\n${formData.description}\n\nCorrect Information:\n${formData.correction}\n\nEvidence: ${formData.evidence}`
  );

  const inputClass = (hasError: boolean) =>
    cn(
      'w-full rounded-md border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2',
      hasError
        ? 'border-danger focus:ring-danger/40'
        : 'border-sunshine-200 focus:ring-sunshine-500'
    );

  return (
    <div className="container max-w-3xl py-8 space-y-8">
      <PageHeader
        title="Report a Data Error"
        description="Help us improve data quality by reporting inaccuracies."
      />

      {/* Explanation Section */}
      <section className="space-y-4">
        <div className="flex items-start gap-2 rounded-md border border-sunshine-200 bg-sunshine-200/30 px-4 py-3 text-sm text-sunshine-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-sunshine-600" />
          <p>
            Pay Lens processes data from official government releases. Errors
            can occur in the original data, our normalization pipeline, or our
            region and role assignments.
          </p>
        </div>

        <div className="rounded-md border border-border bg-card p-5 text-sm text-foreground space-y-2">
          <p>
            Community corrections help improve data quality for everyone. When
            you report an error, our team verifies it against official records
            before applying any changes.
          </p>
        </div>
      </section>

      {/* Form or Success State */}
      {submitted ? (
        <div className="rounded-md border border-green-300 bg-green-50 p-6 space-y-4">
          <div className="flex items-center gap-2 text-green-800">
            <CheckCircle2 className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Error Report Received</h2>
          </div>
          <p className="text-sm text-green-700">
            Thank you for helping improve data quality. Since this is a static
            site, please also email your report for processing:
          </p>
          <a
            href={`mailto:corrections@paylens.ca?subject=${mailtoSubject}&body=${mailtoBody}`}
            className="inline-flex items-center gap-2 rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 transition-colors"
          >
            <Mail className="h-4 w-4" />
            Email corrections@paylens.ca
          </a>
          <p className="text-xs text-green-600">
            The email will be pre-filled with the details you entered above.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          {/* Error Type */}
          <fieldset className="space-y-1.5">
            <label
              htmlFor="errorType"
              className="block text-sm font-medium text-foreground"
            >
              Error Type <span className="text-danger">*</span>
            </label>
            <select
              id="errorType"
              value={formData.errorType}
              onChange={(e) => update('errorType', e.target.value)}
              className={inputClass(!!errors.errorType)}
            >
              <option value="">Select error type...</option>
              {ERROR_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            {errors.errorType && (
              <p className="text-xs text-danger">{errors.errorType}</p>
            )}
          </fieldset>

          {/* Person Name */}
          <fieldset className="space-y-1.5">
            <label
              htmlFor="personName"
              className="block text-sm font-medium text-foreground"
            >
              Person&apos;s Name{' '}
              <span className="text-muted-foreground">(if applicable)</span>
            </label>
            <input
              id="personName"
              type="text"
              value={formData.personName}
              onChange={(e) => update('personName', e.target.value)}
              className={inputClass(false)}
            />
          </fieldset>

          {/* Employer */}
          <fieldset className="space-y-1.5">
            <label
              htmlFor="employer"
              className="block text-sm font-medium text-foreground"
            >
              Employer
            </label>
            <input
              id="employer"
              type="text"
              value={formData.employer}
              onChange={(e) => update('employer', e.target.value)}
              className={inputClass(false)}
            />
          </fieldset>

          {/* Year */}
          <fieldset className="space-y-1.5">
            <label
              htmlFor="year"
              className="block text-sm font-medium text-foreground"
            >
              Year
            </label>
            <select
              id="year"
              value={formData.year}
              onChange={(e) => update('year', e.target.value)}
              className={inputClass(false)}
            >
              <option value="">Select year...</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </fieldset>

          {/* Description */}
          <fieldset className="space-y-1.5">
            <label
              htmlFor="description"
              className="block text-sm font-medium text-foreground"
            >
              Description of Error <span className="text-danger">*</span>
            </label>
            <textarea
              id="description"
              rows={4}
              value={formData.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="Describe what is incorrect..."
              className={inputClass(!!errors.description)}
            />
            {errors.description && (
              <p className="text-xs text-danger">{errors.description}</p>
            )}
          </fieldset>

          {/* Correction */}
          <fieldset className="space-y-1.5">
            <label
              htmlFor="correction"
              className="block text-sm font-medium text-foreground"
            >
              What the Correct Information Should Be
            </label>
            <textarea
              id="correction"
              rows={3}
              value={formData.correction}
              onChange={(e) => update('correction', e.target.value)}
              placeholder="Provide the correct data if known..."
              className={inputClass(false)}
            />
          </fieldset>

          {/* Evidence */}
          <fieldset className="space-y-1.5">
            <label
              htmlFor="evidence"
              className="block text-sm font-medium text-foreground"
            >
              Supporting Evidence{' '}
              <span className="text-muted-foreground">
                (optional — URL or description)
              </span>
            </label>
            <input
              id="evidence"
              type="text"
              value={formData.evidence}
              onChange={(e) => update('evidence', e.target.value)}
              placeholder="Link to source or brief description"
              className={inputClass(false)}
            />
          </fieldset>

          {/* Email */}
          <fieldset className="space-y-1.5">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-foreground"
            >
              Your Email{' '}
              <span className="text-muted-foreground">
                (optional, for follow-up)
              </span>
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => update('email', e.target.value)}
              className={inputClass(!!errors.email)}
            />
            {errors.email && (
              <p className="text-xs text-danger">{errors.email}</p>
            )}
          </fieldset>

          <Button type="submit" size="lg" className="w-full sm:w-auto">
            <Send className="mr-2 h-4 w-4" />
            Submit Error Report
          </Button>
        </form>
      )}

      {/* Verification Note */}
      <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <p>
          All corrections are verified against official records before being
          applied. You may be contacted for additional information if you
          provided an email address.
        </p>
      </div>
    </div>
  );
}
