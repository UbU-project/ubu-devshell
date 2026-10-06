# Build settings: `scripts/env.sh`

One file holds how these repositories are built on a given machine:
`scripts/env.sh`. It is **sourced**, never run. Every script here that runs
cargo sources it first: `check-ui-contract.sh`, `acceptance.sh`,
`run-live.sh`, `run-orchestrator.sh`, `check-all.sh`, `test-all.sh` and
`fmt-all.sh`, `check-planning-worker.sh`, `gen-patch-config.sh`,
`test-patch-config.sh` and `build-patch-config-tool.sh`. Source it yourself before running cargo by hand:

```sh
source ../ubu-devshell/scripts/env.sh    # from inside the repository you are building
```

It sets two things, exports nothing else, and writes no file.

## How parallel: `CARGO_BUILD_JOBS`

Default `1`. Override it deliberately by exporting `CARGO_BUILD_JOBS` before sourcing.

There is a cap because of what happens without one. A full `cargo test` of
`ubu-orchestrator` links about 55 test binaries with debug information. Left
to itself cargo runs one job for each core. On a 16-core machine with 30 GB
of memory that peaked at 24.4 GB, and the out-of-memory killer took the
whole terminal session with it, twice in one afternoon. During P1B-60,
concurrent orchestrator and store Cargo invocations each allowed four jobs;
`systemd-oomd` killed the terminal scope under sustained memory pressure.

P1B-60 reduced the default from four jobs to one. During P1B-61, the operator
requested a two-job trial, then reported another OOM and requested restoration
of the known-good one-job configuration. The default remains one compile/link
job per Cargo invocation. **Run Cargo
invocations sequentially across repositories**: separate invocations each have
their own job budget, so starting several defeats the intended total limit.
This limits concurrent compiler/linker work, not the memory of one process or
the number of test threads. It does not guarantee a single large build fits.

## Where: `UBU_TARGET_ROOT` and `CARGO_TARGET_DIR`

Unset, nothing changes: every repository builds in its own `target`, as cargo
does by default. An operator who has moved nothing is unaffected.

Set `UBU_TARGET_ROOT` to a directory, and each repository builds in its own
subdirectory of it:

```
$UBU_TARGET_ROOT/ubu-orchestrator
$UBU_TARGET_ROOT/ubu-ui
$UBU_TARGET_ROOT/ubu-core
...
```

**One directory for each repository, never one shared directory.** Workspaces
that share a target directory rebuild each other's dependencies and wait on
each other's lock.

An environment variable does not follow `cd`. So:

- a script that visits several repositories calls `ubu_cargo_env` after each
  `cd` and before cargo. Every script here does;
- a shell that moves to another repository sources `env.sh` again;
- sourced from a repository that builds nothing with cargo, such as this one,
  it leaves `CARGO_TARGET_DIR` unset rather than pointing cargo at the wrong
  repository's directory.

### Pointing it at another drive

```sh
mkdir /path/on/the/other/drive/ubu-targets      # once
export UBU_TARGET_ROOT=/path/on/the/other/drive/ubu-targets
```

Put the `export` in your own shell profile. **It does not go in any
repository.** The first build after that is a full build in the new place,
unless you move the existing `target/debug` there yourself.

### Why not a symlink

Symlinking `target/debug` to the other drive works until `cargo clean`.
`cargo clean` removes the symlink and leaves the artifacts behind it, about
25 GB of them for the orchestrator, and the next build silently rebuilds
everything on the first drive.

Cargo cleans the directory it is configured to use. With `CARGO_TARGET_DIR`
pointing at the other drive, **`cargo clean` is correct with no
maintenance**: it removes what is there, and the next build puts it back
there.

### An unmounted drive is an error

`env.sh` refuses, loudly and naming the path, when:

- `UBU_TARGET_ROOT` is not an absolute path;
- its parent directory does not exist. That is a drive that is not mounted,
  or a mistyped path;
- the directory itself does not exist. A mount point is usually still there,
  empty, when its drive is not mounted, so "the parent exists" is not enough
  to create the root safely. It is created by hand, once.

A script that sources it then stops, before cargo runs. The alternative is a
full rebuild somewhere else, which looks like nothing is wrong for twenty
minutes.

## No machine-specific path in any repository

**No repository may commit a machine-specific path**: not in
`.cargo/config.toml`, not in a script, not in a document. `env.sh` holds no
path. It reads `UBU_TARGET_ROOT` from the environment of the machine it runs
on. `.cargo/config.toml` is ignored by git in the repositories that have one,
and stays for the generated `[patch]` overrides only.
