//! Deliberate failing-run lifetime check, only under P1B-70's bounded exemption.
use std::{io, time::Duration};
use ubu_planning_worker_protocol::session::WorkerSession;
fn main() {
    let python = std::env::var("UBU_WORKER_TEST_PYTHON").unwrap_or_else(|_| "python3".into());
    let worker = match WorkerSession::spawn(&python, Duration::from_secs(3)) {
        Ok(worker) => worker,
        Err(error) if error.kind() == io::ErrorKind::NotFound => {
            println!("SKIP: suitable local Python unavailable for failing-owner check");
            return;
        }
        Err(error) => panic!("owned worker could not start: {error}"),
    };
    // The owner already exists if writing this synthetic bookkeeping panics.
    std::fs::write(
        std::env::var_os("UBU_WORKER_PID_FILE").expect("owned temporary PID path"),
        worker.id().to_string(),
    )
    .unwrap();
    panic!("synthetic failing worker owner; Drop must reap its child");
}
