# Feature: invoice detail and overdue reminders

1. Add `getInvoice(id)` to the invoice service so the detail page can load one invoice.
2. The dashboard shows an outstanding total. Add `outstandingTotal()` to the invoice service and cache the result in `src/cache.js`, because the dashboard polls it often.
3. Add `src/jobs/mark-overdue.js`, a nightly job that sets `status` to `overdue` on every unpaid invoice whose `dueDate` is before the job's run date.

Add tests for the new behavior.
