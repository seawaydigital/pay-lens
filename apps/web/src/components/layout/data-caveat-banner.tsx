export function DataCaveatBanner() {
  return (
    <div className="mt-8 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-200">
      <p className="font-medium">Data caveat</p>
      <p className="mt-1">
        The Sunshine List includes only employees earning $100,000 or more. Totals
        and medians reflect disclosed salaries only and may not represent the full
        workforce of any employer.
      </p>
    </div>
  );
}
