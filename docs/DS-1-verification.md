# DS-1 real constellation verification

The generator and isolated fixture tests pass. C is not fully green: core and
store build offline, but the GitHub adapter and orchestrator builds fail in
`ubu-github-adapter/src/candidate_mapping.rs:167`. The adapter initializes Task
without `assignee`, `blocked_by`, `duration_estimate`, `correlation_groups`, or
`tags`, which the local core now requires. Aligning that sibling is explicitly
out of scope. No sibling source, manifest, pin, or gitignore was changed.

All commands below ran with local generated configs. The dependency graph has
exactly one path-sourced core. Each sibling HEAD was recorded before C and
verified unchanged after C. Store/orchestrator lockfiles were restored to their
clean pre-build contents, and the newly generated ignored adapter lockfile was
removed to restore its original absence. Generated configs remain ignored and
untracked. This is the only authorized sibling-file output of this ticket.

## C.1: ./scripts/gen-patch-config.sh (exit 0)

```text
Generating local Cargo patch configs under /home/sean/ubu-phase1b
skip: /home/sean/ubu-phase1b/ubu-design has no Cargo.toml
skip: /home/sean/ubu-phase1b/ubu-ui has no Cargo.toml
skip: /home/sean/ubu-phase1b/ubu-brand has no Cargo.toml
Files written:
/home/sean/ubu-phase1b/ubu-store/.cargo/config.toml
/home/sean/ubu-phase1b/ubu-github-adapter/.cargo/config.toml
/home/sean/ubu-phase1b/ubu-planning-kernel/.cargo/config.toml
/home/sean/ubu-phase1b/ubu-orchestrator/.cargo/config.toml
```

## C.2: ubu-core — CARGO_NET_OFFLINE=true cargo build (exit 0)

```text
   Compiling ubu_core v0.1.0 (/home/sean/ubu-phase1b/ubu-core)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 1.19s
```

## C.2: ubu-store — CARGO_NET_OFFLINE=true cargo build (exit 0)

```text
     Locking 1 package to latest compatible version
      Adding ubu_core v0.1.0 (/home/sean/ubu-phase1b/ubu-core)
   Compiling ubu_core v0.1.0 (/home/sean/ubu-phase1b/ubu-core)
   Compiling ubu_store v0.1.0 (/home/sean/ubu-phase1b/ubu-store)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 7.83s
```

## C.2: ubu-github-adapter — CARGO_NET_OFFLINE=true cargo build (exit 101)

```text
     Locking 174 packages to latest compatible versions
      Adding thiserror v1.0.69 (available: v2.0.20)
   Compiling proc-macro2 v1.0.107
   Compiling quote v1.0.47
   Compiling unicode-ident v1.0.26
   Compiling libc v0.2.189
   Compiling memchr v2.8.3
   Compiling stable_deref_trait v1.2.1
   Compiling pin-project-lite v0.2.17
   Compiling itoa v1.0.18
   Compiling futures-core v0.3.34
   Compiling serde_core v1.0.229
   Compiling futures-sink v0.3.34
   Compiling shlex v2.0.1
   Compiling cfg-if v1.0.5
   Compiling bytes v1.12.1
   Compiling find-msvc-tools v0.1.13
   Compiling smallvec v1.16.1
   Compiling once_cell v1.21.4
   Compiling autocfg v1.5.1
   Compiling writeable v0.6.4
   Compiling serde v1.0.229
   Compiling slab v0.4.12
   Compiling futures-channel v0.3.34
   Compiling futures-io v0.3.34
   Compiling litemap v0.8.3
   Compiling log v0.4.34
   Compiling cc v1.4.7
   Compiling futures-task v0.3.34
   Compiling icu_normalizer_data v2.3.0
   Compiling icu_properties_data v2.3.0
   Compiling utf8_iter v1.0.4
   Compiling zeroize v1.9.0
   Compiling tracing-core v0.1.36
   Compiling httparse v1.10.1
   Compiling untrusted v0.9.0
   Compiling tower-service v0.3.3
   Compiling num-traits v0.2.19
   Compiling rustls-pki-types v1.15.1
   Compiling try-lock v0.2.5
   Compiling time-core v0.1.9
   Compiling num-conv v0.2.2
   Compiling zmij v1.0.23
   Compiling deranged v0.5.8
   Compiling want v0.3.1
   Compiling atomic-waker v1.1.2
   Compiling serde_json v1.0.151
   Compiling time-macros v0.2.32
   Compiling thiserror v2.0.20
   Compiling percent-encoding v2.3.2
   Compiling powerfmt v0.2.0
   Compiling http v1.5.0
   Compiling rustls v0.23.45
   Compiling form_urlencoded v1.2.2
   Compiling getrandom v0.4.3
   Compiling rustversion v1.0.23
   Compiling subtle v2.6.1
   Compiling aho-corasick v1.1.5
   Compiling syn v3.0.6
   Compiling syn v2.0.119
   Compiling tower-layer v0.3.3
   Compiling heck v0.5.0
   Compiling base64 v0.22.1
   Compiling num-integer v0.1.47
   Compiling openssl-probe v0.2.1
   Compiling thiserror v1.0.69
   Compiling sync_wrapper v1.0.2
   Compiling mio v1.2.3
   Compiling socket2 v0.6.5
   Compiling getrandom v0.2.17
   Compiling regex-syntax v0.8.11
   Compiling pem v3.0.6
   Compiling num-bigint v0.4.8
   Compiling rustls-native-certs v0.8.4
   Compiling bitflags v2.13.2
   Compiling iana-time-zone v0.1.65
   Compiling ring v0.17.14
   Compiling http-body v1.1.0
   Compiling ubu_core v0.1.0 (/home/sean/ubu-phase1b/ubu-core)
   Compiling ryu v1.0.23
   Compiling arc-swap v1.9.2
   Compiling http-body-util v0.1.5
   Compiling uuid v1.26.1
   Compiling secrecy v0.10.3
   Compiling web-time v1.1.0
   Compiling either v1.18.0
   Compiling time v0.3.55
   Compiling serde_path_to_error v0.1.20
   Compiling regex-automata v0.4.18
   Compiling tracing-attributes v0.1.31
   Compiling snafu-derive v0.8.9
   Compiling thiserror-impl v1.0.69
   Compiling pin-project-internal v1.1.13
   Compiling synstructure v0.14.0
   Compiling zerofrom-derive v0.1.8
   Compiling yoke-derive v0.8.3
   Compiling zerovec-derive v0.11.6
   Compiling displaydoc v0.2.7
   Compiling tokio-macros v2.7.2
   Compiling futures-macro v0.3.34
   Compiling serde_derive v1.0.229
   Compiling thiserror-impl v2.0.20
   Compiling async-trait v0.1.92
   Compiling pin-project v1.1.13
   Compiling tracing v0.1.44
   Compiling tokio v1.53.1
   Compiling futures-util v0.3.34
   Compiling regex v1.13.1
   Compiling rustls-webpki v0.103.15
   Compiling snafu v0.8.9
   Compiling zerofrom v0.1.8
   Compiling simple_asn1 v0.6.4
   Compiling yoke v0.8.3
   Compiling zerovec v0.11.8
   Compiling zerotrie v0.2.5
   Compiling tinystr v0.8.4
   Compiling potential_utf v0.1.6
   Compiling icu_collections v2.3.0
   Compiling icu_locale_core v2.3.0
   Compiling chrono v0.4.45
   Compiling jsonwebtoken v9.3.1
   Compiling serde_urlencoded v0.7.1
   Compiling icu_provider v2.3.1
   Compiling icu_properties v2.3.0
   Compiling icu_normalizer v2.3.0
   Compiling hyper v1.11.1
   Compiling tokio-util v0.7.19
   Compiling futures-executor v0.3.34
   Compiling tower v0.5.3
   Compiling futures v0.3.34
   Compiling hyper-util v0.1.20
   Compiling idna_adapter v1.2.2
   Compiling idna v1.1.0
   Compiling tokio-rustls v0.26.5
   Compiling url v2.5.8
   Compiling tower-http v0.6.11
   Compiling hyper-rustls v0.27.10
   Compiling hyper-timeout v0.5.2
   Compiling octocrab v0.43.0
   Compiling ubu_github_adapter v0.1.0 (/home/sean/ubu-phase1b/ubu-github-adapter)
error[E0063]: missing fields `assignee`, `blocked_by`, `correlation_groups` and 2 other fields in initializer of `ubu_core::core::Task`
   --> src/candidate_mapping.rs:167:5
    |
167 |     Task {
    |     ^^^^ missing `assignee`, `blocked_by`, `correlation_groups` and 2 other fields

For more information about this error, try `rustc --explain E0063`.
error: could not compile `ubu_github_adapter` (lib) due to 1 previous error
warning: build failed, waiting for other jobs to finish...
```

## C.2: ubu-orchestrator — CARGO_NET_OFFLINE=true cargo build (exit 101)

```text
     Locking 5 packages to latest compatible versions
      Adding ubu_core v0.1.0 (/home/sean/ubu-phase1b/ubu-core)
      Adding ubu_github_adapter v0.1.0 (/home/sean/ubu-phase1b/ubu-github-adapter)
      Adding ubu_planning_core v0.1.0 (/home/sean/ubu-phase1b/ubu-planning-kernel/crates/ubu-planning-core)
      Adding ubu_planning_cpu v0.1.0 (/home/sean/ubu-phase1b/ubu-planning-kernel/crates/ubu-planning-cpu)
      Adding ubu_store v0.1.0 (/home/sean/ubu-phase1b/ubu-store)
   Compiling ubu_core v0.1.0 (/home/sean/ubu-phase1b/ubu-core)
   Compiling ubu_planning_core v0.1.0 (/home/sean/ubu-phase1b/ubu-planning-kernel/crates/ubu-planning-core)
   Compiling ubu_github_adapter v0.1.0 (/home/sean/ubu-phase1b/ubu-github-adapter)
   Compiling ubu_store v0.1.0 (/home/sean/ubu-phase1b/ubu-store)
error[E0063]: missing fields `assignee`, `blocked_by`, `correlation_groups` and 2 other fields in initializer of `ubu_core::core::Task`
   --> /home/sean/ubu-phase1b/ubu-github-adapter/src/candidate_mapping.rs:167:5
    |
167 |     Task {
    |     ^^^^ missing `assignee`, `blocked_by`, `correlation_groups` and 2 other fields

For more information about this error, try `rustc --explain E0063`.
error: could not compile `ubu_github_adapter` (lib) due to 1 previous error
warning: build failed, waiting for other jobs to finish...
```

## C.3: CARGO_NET_OFFLINE=true cargo tree -i ubu_core (exit 0)

```text
ubu_core v0.1.0 (/home/sean/ubu-phase1b/ubu-core)
├── ubu_github_adapter v0.1.0 (/home/sean/ubu-phase1b/ubu-github-adapter)
│   └── ubu_orchestrator v0.1.0 (/home/sean/ubu-phase1b/ubu-orchestrator)
├── ubu_orchestrator v0.1.0 (/home/sean/ubu-phase1b/ubu-orchestrator)
├── ubu_planning_core v0.1.0 (/home/sean/ubu-phase1b/ubu-planning-kernel/crates/ubu-planning-core)
│   ├── ubu_orchestrator v0.1.0 (/home/sean/ubu-phase1b/ubu-orchestrator)
│   └── ubu_planning_cpu v0.1.0 (/home/sean/ubu-phase1b/ubu-planning-kernel/crates/ubu-planning-cpu)
│       └── ubu_orchestrator v0.1.0 (/home/sean/ubu-phase1b/ubu-orchestrator)
├── ubu_planning_cpu v0.1.0 (/home/sean/ubu-phase1b/ubu-planning-kernel/crates/ubu-planning-cpu) (*)
└── ubu_store v0.1.0 (/home/sean/ubu-phase1b/ubu-store)
    └── ubu_orchestrator v0.1.0 (/home/sean/ubu-phase1b/ubu-orchestrator)
```

## C.4: git status / ls-files / check-ignore / HEAD verification (exit 0)

```text
PASS ubu-brand: clean working tree; no tracked .cargo/config.toml; HEAD unchanged
PASS ubu-core: clean working tree; no tracked .cargo/config.toml; HEAD unchanged
PASS ubu-github-adapter: clean working tree; no tracked .cargo/config.toml; HEAD unchanged
RESTORED ubu-orchestrator/Cargo.lock to clean pre-build contents
PASS ubu-orchestrator: clean working tree; no tracked .cargo/config.toml; HEAD unchanged
PASS ubu-planning-kernel: clean working tree; no tracked .cargo/config.toml; HEAD unchanged
PASS ubu-schemas: clean working tree; no tracked .cargo/config.toml; HEAD unchanged
RESTORED ubu-store/Cargo.lock to clean pre-build contents
PASS ubu-store: clean working tree; no tracked .cargo/config.toml; HEAD unchanged
PASS ubu-ui: clean working tree; no tracked .cargo/config.toml; HEAD unchanged
```

## B: ./scripts/test-patch-config.sh (exit 0)

```text
PASS package-root dependency uses the actual package name and root directory
PASS virtual workspace aliases resolve two packages under one URL block
PASS unused sibling emits no patch entry
PASS absent and unlisted git siblings are skipped offline
PASS dependency-free consumers get no file and stale marked files are removed
PASS workspace inheritance, member, target, dev and build dependency tables
PASS repeat generation preserves bytes, mtime and unchanged reporting
PASS tracked config is refused without modification
PASS unmarked configs are refused, including dependency-free consumers
PASS missing package fails without overwriting the consumer config
PASS gitignore warning is preserved
PASS test-patch-config.sh (isolated offline fixtures)
```

## Generated orchestrator config

```toml
# Generated by ubu-devshell/scripts/gen-patch-config.sh
# Local-only Cargo patches. Do not commit this file.
# Re-run from ubu-devshell when sibling paths change.

[patch."https://github.com/UbU-project/ubu-core"]
ubu_core = { path = "../ubu-core" }

[patch."https://github.com/UbU-project/ubu-github-adapter"]
ubu_github_adapter = { path = "../ubu-github-adapter" }

[patch."https://github.com/UbU-project/ubu-planning-kernel"]
ubu_planning_core = { path = "../ubu-planning-kernel/crates/ubu-planning-core" }
ubu_planning_cpu = { path = "../ubu-planning-kernel/crates/ubu-planning-cpu" }

[patch."https://github.com/UbU-project/ubu-store"]
ubu_store = { path = "../ubu-store" }
```

## Interpretations and limits

- Python's built-in tomllib requires Python 3.11+; verification used 3.13.5.
  Cargo metadata uses both --offline and CARGO_NET_OFFLINE=true, and --no-deps.
- All four requested dependency tables are supported, plus target-specific tables
  and workspace-member manifests. Package roots and virtual/package workspaces
  use Cargo's member expansion rather than hard-coded directory conventions.
- Git URLs match repos.toml exactly. Registry/path-only deps and missing siblings
  are skipped; unknown package names in a present sibling fail explicitly.
- The stock repos.toml key syntax is preserved. External workspace ownership of a
  consumer without a workspace table is not inferred, and package directories
  outside the mapped sibling are rejected. No real constellation uses these shapes.
- A consumer's declared workspace.dependencies are considered even if a member
  does not inherit them; this follows the requested table coverage literally.
- C records unsuccessful compilation honestly instead of modifying adapter/core
  code or retaining multiple core versions to hide the incompatibility.
- check-all.sh gained only the requested isolated self-test invocation. No other
  script behavior was changed. Full constellation checks cannot be green until
  the adapter is made compatible in a separate ticket.
