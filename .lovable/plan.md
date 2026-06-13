Plan:

1. Update tenant-host detection so Lovable preview hosts are never treated as tenant storefront subdomains.
   - This fixes the preview showing “Storefront not found” instead of the public marketing page.

2. Reserve public app paths from storefront slugs.
   - Add reserved slugs such as `pricing`, `login`, `signup`, `setup`, `dashboard`, `admin`, `book`, `booking`, `api`, and `home` so they cannot be interpreted as storefront handles.

3. Change the homepage Pricing nav to use an absolute public URL when needed.
   - The Pricing button should land on `https://procschedule.com/pricing` outside any tenant/storefront host, rather than staying under a storefront subdomain.

4. Verify behavior:
   - `/pricing` renders without sign-in.
   - Clicking Pricing from the public homepage opens `/pricing`.
   - Clicking Pricing from a storefront/tenant context exits to the public pricing page.