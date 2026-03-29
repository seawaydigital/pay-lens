'use client';

import { useState } from 'react';
import { CheckCircle2, Info, Mail, ShieldCheck } from 'lucide-react';

import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const YEARS = [2025, 2024, 2023] as const;

const REASONS = [
  'Privacy concern',
  'Safety concern',
  'Data error',
  'Other',
] as const;

interface FormData {
  fullName: string;
  email: string;
  employer: string;
  years: number[];
  reason: string;
  details: string;
  consent: boolean;
}

interface FormErrors {
  fullName?: string;
  email?: string;
  employer?: string;
  years?: string;
  reason?: string;
  consent?: string;
}

export default function OptOutPage() {
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    employer: '',
    years: [],
    reason: '',
    details: '',
    consent: false,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);

  function validate(): boolean {
    const next: FormErrors = {};
    if (!formData.fullName.trim()) next.fullName = 'Full name is required.';
    if (!formData.email.trim()) {
      next.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      next.email = 'Please enter a valid email address.';
    }
    if (!formData.employer.trim()) next.employer = 'Employer is required.';
    if (formData.years.length === 0) next.years = 'Select at least one year.';
    if (!formData.reason) next.reason = 'Please select a reason.';
    if (!formData.consent) next.consent = 'You must confirm your identity.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (validate()) {
      setSubmitted(true);
    }
  }

  function toggleYear(year: number) {
    setFormData((prev) => ({
      ...prev,
      years: prev.years.includes(year)
        ? prev.years.filter((y) => y !== year)
        : [...prev.years, year],
    }));
  }

  const mailtoSubject = encodeURIComponent('Name Removal Request — Pay Lens');
  const mailtoBody = encodeURIComponent(
    `Name: ${formData.fullName}\nEmail: ${formData.email}\nEmployer: ${formData.employer}\nYears: ${formData.years.join(', ')}\nReason: ${formData.reason}\nDetails: ${formData.details}`
  );

  return (
    <div className="container max-w-3xl py-8 space-y-8">
      <PageHeader
        title="Request Name Removal"
        description="Submit a request to suppress your name from Pay Lens search results."
      />

      {/* Explanation Section */}
      <section className="space-y-4">
        <div className="flex items-start gap-2 rounded-md border border-sunshine-200 bg-sunshine-200/30 px-4 py-3 text-sm text-sunshine-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-sunshine-600" />
          <p>
            The Sunshine List is public data published by the Government of
            Ontario. Pay Lens does not control what appears on the official list.
          </p>
        </div>

        <div className="rounded-md border border-border bg-card p-5 space-y-3 text-sm text-foreground">
          <h2 className="font-semibold text-base text-sunshine-900">
            How this works
          </h2>
          <p>
            We respect individual privacy concerns. While we cannot alter
            government records, we can adjust how data is displayed on Pay Lens.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-green-200 bg-green-50 p-3 space-y-1">
              <p className="font-medium text-green-800">What we can do</p>
              <p className="text-green-700">
                Suppress display of a specific name on Pay Lens while keeping
                the aggregate data (salary, employer, position) intact for
                statistical accuracy.
              </p>
            </div>
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 space-y-1">
              <p className="font-medium text-amber-800">What we cannot do</p>
              <p className="text-amber-700">
                Remove data from the official Ontario government dataset. That
                requires contacting the Government of Ontario directly.
              </p>
            </div>
          </div>
          <p className="text-muted-foreground">
            Requests are reviewed within 5 business days.
          </p>
        </div>
      </section>

      {/* Form or Success State */}
      {submitted ? (
        <div className="rounded-md border border-green-300 bg-green-50 p-6 space-y-4">
          <div className="flex items-center gap-2 text-green-800">
            <CheckCircle2 className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Request Received</h2>
          </div>
          <p className="text-sm text-green-700">
            Your request has been recorded. Since this is a static site, please
            also email your request for processing:
          </p>
          <a
            href={`mailto:privacy@paylens.ca?subject=${mailtoSubject}&body=${mailtoBody}`}
            className="inline-flex items-center gap-2 rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 transition-colors"
          >
            <Mail className="h-4 w-4" />
            Email privacy@paylens.ca
          </a>
          <p className="text-xs text-green-600">
            The email will be pre-filled with the details you entered above.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          {/* Full Name */}
          <fieldset className="space-y-1.5">
            <label
              htmlFor="fullName"
              className="block text-sm font-medium text-foreground"
            >
              Full Name (as it appears on the Sunshine List){' '}
              <span className="text-danger">*</span>
            </label>
            <input
              id="fullName"
              type="text"
              value={formData.fullName}
              onChange={(e) =>
                setFormData((p) => ({ ...p, fullName: e.target.value }))
              }
              className={cn(
                'w-full rounded-md border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2',
                errors.fullName
                  ? 'border-danger focus:ring-danger/40'
                  : 'border-sunshine-200 focus:ring-sunshine-500'
              )}
            />
            {errors.fullName && (
              <p className="text-xs text-danger">{errors.fullName}</p>
            )}
          </fieldset>

          {/* Email */}
          <fieldset className="space-y-1.5">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-foreground"
            >
              Email Address <span className="text-danger">*</span>
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData((p) => ({ ...p, email: e.target.value }))
              }
              className={cn(
                'w-full rounded-md border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2',
                errors.email
                  ? 'border-danger focus:ring-danger/40'
                  : 'border-sunshine-200 focus:ring-sunshine-500'
              )}
            />
            {errors.email && (
              <p className="text-xs text-danger">{errors.email}</p>
            )}
          </fieldset>

          {/* Employer */}
          <fieldset className="space-y-1.5">
            <label
              htmlFor="employer"
              className="block text-sm font-medium text-foreground"
            >
              Employer <span className="text-danger">*</span>
            </label>
            <input
              id="employer"
              type="text"
              value={formData.employer}
              onChange={(e) =>
                setFormData((p) => ({ ...p, employer: e.target.value }))
              }
              className={cn(
                'w-full rounded-md border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2',
                errors.employer
                  ? 'border-danger focus:ring-danger/40'
                  : 'border-sunshine-200 focus:ring-sunshine-500'
              )}
            />
            {errors.employer && (
              <p className="text-xs text-danger">{errors.employer}</p>
            )}
          </fieldset>

          {/* Years */}
          <fieldset className="space-y-1.5">
            <legend className="block text-sm font-medium text-foreground">
              Year(s) of Appearance <span className="text-danger">*</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {YEARS.map((year) => (
                <button
                  key={year}
                  type="button"
                  onClick={() => toggleYear(year)}
                  className={cn(
                    'rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
                    formData.years.includes(year)
                      ? 'border-sunshine-400 bg-sunshine-400 text-sunshine-900'
                      : 'border-sunshine-200 bg-white text-sunshine-700 hover:bg-sunshine-200/40'
                  )}
                >
                  {year}
                </button>
              ))}
            </div>
            {errors.years && (
              <p className="text-xs text-danger">{errors.years}</p>
            )}
          </fieldset>

          {/* Reason */}
          <fieldset className="space-y-1.5">
            <label
              htmlFor="reason"
              className="block text-sm font-medium text-foreground"
            >
              Reason for Request <span className="text-danger">*</span>
            </label>
            <select
              id="reason"
              value={formData.reason}
              onChange={(e) =>
                setFormData((p) => ({ ...p, reason: e.target.value }))
              }
              className={cn(
                'w-full rounded-md border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2',
                errors.reason
                  ? 'border-danger focus:ring-danger/40'
                  : 'border-sunshine-200 focus:ring-sunshine-500'
              )}
            >
              <option value="">Select a reason...</option>
              {REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            {errors.reason && (
              <p className="text-xs text-danger">{errors.reason}</p>
            )}
          </fieldset>

          {/* Details */}
          <fieldset className="space-y-1.5">
            <label
              htmlFor="details"
              className="block text-sm font-medium text-foreground"
            >
              Additional Details{' '}
              <span className="text-muted-foreground">(optional)</span>
            </label>
            <textarea
              id="details"
              rows={4}
              value={formData.details}
              onChange={(e) =>
                setFormData((p) => ({ ...p, details: e.target.value }))
              }
              className="w-full rounded-md border border-sunshine-200 px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-sunshine-500"
            />
          </fieldset>

          {/* Consent */}
          <fieldset className="space-y-1.5">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.consent}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, consent: e.target.checked }))
                }
                className="mt-0.5 h-4 w-4 rounded border-sunshine-200 text-sunshine-600 focus:ring-sunshine-500"
              />
              <span className="text-sm text-foreground">
                I confirm that I am the individual named above or their
                authorized representative.{' '}
                <span className="text-danger">*</span>
              </span>
            </label>
            {errors.consent && (
              <p className="text-xs text-danger">{errors.consent}</p>
            )}
          </fieldset>

          <Button type="submit" size="lg" className="w-full sm:w-auto">
            <ShieldCheck className="mr-2 h-4 w-4" />
            Submit Removal Request
          </Button>
        </form>
      )}

      {/* FAQ Section */}
      <section className="space-y-4 border-t border-border pt-8">
        <h2 className="text-xl font-semibold text-sunshine-900">
          Frequently Asked Questions
        </h2>

        <div className="space-y-4">
          <div className="rounded-md border border-border bg-card p-4 space-y-1">
            <h3 className="font-medium text-foreground">
              Will my salary data be completely removed?
            </h3>
            <p className="text-sm text-muted-foreground">
              No. Aggregate statistics will still include the salary amount.
              Only your name will be suppressed from search results and detail
              pages. This preserves the statistical integrity of the dataset.
            </p>
          </div>

          <div className="rounded-md border border-border bg-card p-4 space-y-1">
            <h3 className="font-medium text-foreground">
              How long does it take?
            </h3>
            <p className="text-sm text-muted-foreground">
              Requests are reviewed within 5 business days. You will receive an
              email confirmation once the suppression has been applied.
            </p>
          </div>

          <div className="rounded-md border border-border bg-card p-4 space-y-1">
            <h3 className="font-medium text-foreground">
              Can I request removal from the official Ontario list?
            </h3>
            <p className="text-sm text-muted-foreground">
              No. The official Sunshine List is published by the Government of
              Ontario. Requests to modify the source data must be directed to
              the Ontario government directly.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
