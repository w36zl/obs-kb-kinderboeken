# Release Workflow Diagram

## Visual Flow

```
                           ┌─────────────────────┐
                           │  ReleaseManager     │
                           │  (Parent Agent)     │
                           └──────────┬──────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
                    v                 v                 v
            ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
            │ RepoInspector│  │RunNpmChecks  │  │RunSmokeTests │
            │              │  │              │  │              │
            │ Validates:   │  │ Runs:        │  │ Verifies:    │
            │ • branch     │  │ • lint       │  │ • API works  │
            │ • git status │  │ • tests      │  │ • Parsing OK │
            │ • no changes │  │ • install    │  │              │
            └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
                   │                 │                 │
                   └─────────────────┼─────────────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    │                                 │
                    v                                 v
            ┌──────────────┐              ┌──────────────────┐
            │VersionBumper │              │  PluginBuilder   │
            │              │              │                  │
            │ Updates:     │              │ Builds & copies: │
            │ • manifest   │              │ • npm run build  │
            │ • package    │              │ • copy to plugin │
            │ • CHANGELOG  │              │ • verify main.js │
            └──────┬───────┘              └──────┬───────────┘
                   │                             │
                   └──────────────┬──────────────┘
                                  │
                        ┌─────────┴──────────┐
                        │                    │
                        v                    v
                   ┌──────────────┐   ┌─────────────────┐
                   │ GitPublisher │   │  Success! ✅    │
                   │              │   │                 │
                   │ Publishes:   │   │ Plugin released │
                   │ • commit     │   │ to GitHub       │
                   │ • push       │   │                 │
                   │ • tag        │   │ Users can       │
                   │ • release    │   │ install via     │
                   └──────────────┘   │ BRAT            │
                                      └─────────────────┘
```

## Sequential Execution Order

```
1️⃣  RepoInspector
    └─ Validates repository state
       (STOP if validation fails)

2️⃣  RunNpmChecks
    └─ Runs lint, tests, install
       (STOP if any check fails)

3️⃣  RunSmokeTests
    └─ Verifies API connectivity
       (STOP if smoke tests fail)

4️⃣  VersionBumper
    └─ Updates version numbers
       (STOP if update fails)

5️⃣  PluginBuilder
    └─ Builds and deploys to local plugin folder
       (STOP if build fails)

6️⃣  GitPublisher
    └─ Commits, tags, and publishes to GitHub
       (STOP if publish fails)

✅  Release Complete
```

## Safety Guarantees

- ✅ No operations run unless all prior steps succeed
- ✅ All validation happens BEFORE any changes
- ✅ Build happens BEFORE publishing
- ✅ Local plugin folder updated automatically
- ✅ GitHub release created with artifacts

## Failure Handling

At any step, if there's a failure:
1. The workflow **stops immediately**
2. Error details are reported
3. No subsequent steps are executed
4. Repository state is preserved (unless already modified)
