# Fix cancelled appointments + add delete on the calendar

## What's happening now

In `src/routes/dashboard.calendar.tsx`, choosing **Cancelled** in the appointment dialog's Status dropdown *does* work — it writes `status = 'cancelled'` to the database. But cancelled appointments keep rendering in the day/week/month views (styled grey with a line-through), so it looks like "nothing happened." There is also no delete action anywhere. Your account has permission to delete appointments, so both fixes are safe.

## Changes

### 1. Hide cancelled appointments from the calendar (with a toggle)
- By default, filter out `cancelled` appointments from the day, week, and month grids so cancelling visibly removes the appointment.
- Add a small **"Show cancelled"** toggle in the calendar header so you can bring them back into view when you want to review them.
- The day's stats (revenue, pending count) already ignore cancelled ones, so those stay correct.

### 2. Add a Delete button to the appointment dialog
- Add a **Delete appointment** button (with a confirm prompt) in the detail dialog.
- On confirm, permanently remove the appointment from the database and the calendar, close the dialog, and show a success toast.
- If the delete is blocked or fails, show the error instead of failing silently.

### 3. Keep the Cancelled option
- The Status dropdown keeps all options (Pending, Confirmed, Completed, Cancelled, No-show). Marking **Cancelled** now clearly removes the appointment from the default calendar view (recoverable via the toggle), while **Delete** is the permanent option.

## Technical notes
- All changes are confined to `src/routes/dashboard.calendar.tsx` (frontend). No schema or backend changes.
- Delete uses the existing appointments delete path allowed for owners/admins; cancel continues to use the existing status update.

## Verification
- Mark an appointment Cancelled → it disappears from the calendar; enable "Show cancelled" → it reappears greyed out.
- Delete an appointment → it's gone from the calendar and does not return after refresh.
