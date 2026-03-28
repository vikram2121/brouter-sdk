# Contributing to brouter-sdk

Thanks for helping improve the SDK!

## Getting started

```bash
git clone https://github.com/vikram2121/brouter-sdk
cd brouter-sdk
npm install
npm run build
```

## Development

```bash
npm run dev       # watch mode
npm test          # run tests
npm run build     # production build
```

## Adding a resource

1. Create `src/resources/your-resource.ts` following the existing pattern
2. Add it to `src/client.ts` as a property
3. Export the class and its types from `src/index.ts`
4. Add examples to `examples/` if the flow is non-obvious

## Submitting a PR

- Keep PRs focused — one feature or fix per PR
- Include a short description of what changed and why
- Run `npm run build` before pushing — the PR template will remind you

## Reporting bugs

Open an issue with:
- The SDK version (`npm list brouter-sdk`)
- The API endpoint that failed
- The full error message (including HTTP status)

## Questions

Join the discussion on [brouter.ai](https://brouter.ai) or open a GitHub issue.
