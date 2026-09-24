# Luxe Allure logo, location privacy, and media

Update the custom Luxe Allure Artistry booking experience using the uploaded logo, while keeping the business name readable and limiting studio location details to the city and ZIP.

## Booking page

- Add the uploaded Luxe Allure Artistry logo prominently beside the existing business-name heading.
- Remove the generated white-model hero image immediately and replace that area with a polished logo-led treatment until the selected Instagram media is uploaded.
- Preserve the current nude and champagne booking interface rather than recoloring the entire page around the logo.
- Create a padded square favicon from the uploaded logo so the Luxe Allure booking page has matching browser branding without stretching the wide logo.
- Improve the Luxe Allure page title, description, social title, and social description while preserving the other booking pages' metadata.

## Studio and travel locations

- Save the public studio location as **Kissimmee, FL 34758**. No street address will be displayed or sent for studio bookings.
- Show **Kissimmee, FL 34758** only when the client chooses an in-studio appointment.
- For travel bookings, continue requiring the client's full destination address.
- Make booking confirmations location-aware: studio confirmations use Kissimmee, FL 34758; travel confirmations use the client's submitted address.
- Apply the correct location to the booking summary, client confirmation text, confirmation email, and owner alert so the business-wide studio location never replaces a travel address.

## Instagram media

- Add the selected Instagram photos and videos as a cohesive media section after you upload the original files here.
- Use locally hosted copies rather than depending on Instagram links, so the booking page stays fast and media does not disappear when Instagram blocks embedding.
- Do not reuse the generated white-model image.

## Verification

- Check the full Luxe Allure flow on mobile and desktop for both studio and travel bookings.
- Verify the logo remains legible, the favicon is correctly padded, and no text overlaps the media.
- Verify studio and travel locations are correct in the on-page summary, text messages, emails, and owner alerts.

## Current blocker

The logo is ready. The Instagram photos and videos are not yet attached, so the media section will be completed when those original files are uploaded.

## Technical details

- Store the uploaded logo through the project asset delivery flow; keep only the required square favicon file in the public app files.
- Parse the existing Luxe Allure location note into an appointment-specific display location for notifications rather than always using the workspace address.
- Keep all changes scoped to Luxe Allure Artistry and shared notification location selection; do not change other tenants' visual designs or booking rules.
