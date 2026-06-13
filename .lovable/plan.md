## Fix Pricing nav link

In `src/routes/index.tsx` the header "Pricing" link (line 108) currently points to `#features`. Change it to navigate to the `/pricing` route using TanStack Router's `<Link to="/pricing">` instead of an `<a href>`.

```tsx
<Link to="/pricing" className="hover:text-white transition">Pricing</Link>
```

No other changes.