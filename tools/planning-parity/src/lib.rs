//! CPU-only semantic stage snapshots, not a tensor layout or device stage.
use serde_json::{json, Value};
use ubu_planning_core::{PlannerStrategy, PlanningRequest, PlanningResponse};
use ubu_planning_cpu::ChunkedSweepStrategy;
use ubu_planning_worker_protocol::{from_wire, to_wire};
pub const PROFILE: &str = "boundary-v1";
pub const ABSOLUTE: f64 = 1e-9;
pub const RELATIVE: f64 = 1e-9;

fn same_shape_numbers(expected: &Value, actual: &Value) -> bool {
    match (expected, actual) {
        (Value::Number(a), Value::Number(b)) => {
            let (Some(a), Some(b)) = (a.as_f64(), b.as_f64()) else {
                return false;
            };
            a.is_finite()
                && b.is_finite()
                && (a - b).abs() <= ABSOLUTE + RELATIVE * a.abs().max(b.abs())
        }
        (Value::Array(a), Value::Array(b)) => {
            a.len() == b.len() && a.iter().zip(b).all(|(a, b)| same_shape_numbers(a, b))
        }
        (Value::Object(a), Value::Object(b)) => {
            a.len() == b.len()
                && a.iter()
                    .all(|(k, a)| b.get(k).is_some_and(|b| same_shape_numbers(a, b)))
        }
        _ => expected == actual,
    }
}
pub fn compare(expected: &Value, actual: &Value) -> bool {
    // Seed and rollout count are exact context, not numeric tolerance inputs.
    expected["profile"] == actual["profile"]
        && expected["profile"] == PROFILE
        && expected["rng_seed"] == actual["rng_seed"]
        && expected["n_rollouts"] == actual["n_rollouts"]
        && expected["exact"] == actual["exact"]
        && same_shape_numbers(&expected["tolerance"], &actual["tolerance"])
}
fn dependency_feasible(plan: &ubu_planning_core::Plan) -> bool {
    plan.steps.iter().all(|step| {
        step.depends_on.iter().all(|id| {
            plan.steps
                .iter()
                .any(|before| &before.task_id == id && before.end <= step.start)
        })
    })
}
fn hard_constraints_feasible(request: &PlanningRequest, plan: &ubu_planning_core::Plan) -> bool {
    ubu_planning_core::validate_plan(plan).is_valid
        && plan.steps.iter().all(|step| {
            request
                .tasks()
                .iter()
                .find(|task| task.id == step.task_id)
                .is_some_and(|task| {
                    request
                        .time_window
                        .as_ref()
                        .is_none_or(|window| step.start >= window.start && step.end <= window.end)
                        && task.window.as_ref().is_none_or(|window| {
                            step.start >= window.start && step.end <= window.end
                        })
                        && task
                            .static_anchor
                            .as_ref()
                            .is_none_or(|anchor| step.start == anchor.start)
                        && step.end - step.start == task.duration.placement_seconds()
                })
        })
}
pub fn snapshot(request: &PlanningRequest, response: &PlanningResponse) -> Value {
    let strategy = ChunkedSweepStrategy::default();
    let raw = strategy.generate_candidates(request);
    let mut inputs = Vec::new();
    let mut feasible_mask = Vec::new();
    for candidate in &raw.plans {
        let validation = ubu_planning_core::validate_plan(candidate);
        let full = ubu_planning_core::legitimization::full_legitimize(
            candidate,
            request.affect_profile.as_ref(),
            request.affect_observation.as_ref(),
        );
        let semi = ubu_planning_core::legitimization::semi_legitimize(candidate, request, &full);
        let feasible = validation.is_valid
            && full.validation.is_valid
            && semi.result != ubu_planning_core::SemiLegitimizationResult::RejectObvious;
        feasible_mask.push(feasible);
        if feasible {
            inputs.push(ubu_planning_core::scoring::ScoringInput {
                schedule: candidate.clone(),
                full_legitimization: full,
                semi_legitimization: semi,
            });
        }
    }
    let scored = ubu_planning_core::scoring::score_and_rank(request, inputs);
    let fixed: Vec<_> = request
        .tasks()
        .iter()
        .filter_map(|task| {
            task.static_anchor.as_ref().map(|a| {
                (
                    a.start,
                    a.start.saturating_add(task.duration.placement_seconds()),
                )
            })
        })
        .collect();
    let chunks = request
        .time_window
        .as_ref()
        .map(|window| {
            ubu_planning_cpu::chunked::partition(window, &fixed)
                .into_iter()
                .map(|chunk| json!([chunk.start, chunk.end]))
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();
    let decoded_request: PlanningRequest = from_wire(to_wire(request).unwrap()).unwrap();
    let decoded_response: PlanningResponse = from_wire(to_wire(response).unwrap()).unwrap();
    let rejection_classes: Vec<_> = response
        .diagnostics
        .iter()
        .map(|d| serde_json::to_value(&d.code).unwrap())
        .collect();
    json!({
        "profile":PROFILE,"rng_seed":request.rng_seed,"n_rollouts":request.effective_n_rollouts(),
        "exact":{
            "schema_decoding":{"request":decoded_request==*request,"response":decoded_response==*response,"schema_version":response.schema_version},
            "chunk_partitioning":chunks,
            "skeleton_sampling":{
                "validity_mask":raw.plans.iter().map(|plan|request.tasks().iter().map(|task|plan.steps.iter().any(|step|step.task_id==task.id)).collect::<Vec<_>>()).collect::<Vec<_>>(),
                "dependency_feasibility":raw.plans.iter().map(dependency_feasible).collect::<Vec<_>>(),
                "hard_constraint_feasibility":raw.plans.iter().map(|plan|hard_constraints_feasible(request,plan)).collect::<Vec<_>>(),
                "rejection_classes":rejection_classes
            },
            "affect_legitimacy_filter":{"feasible_mask":feasible_mask},
            "value_scoring":{"top_k_indices":(0..scored.len().min(request.effective_rollout_top_k())).collect::<Vec<_>>()},
            "monte_carlo_rollout":{"cpu_certified_selected_plan_validity":response.default_plan().map(|plan|ubu_planning_core::validate_plan(plan).is_valid),"status":response.status,"candidate_order":response.plan_candidates.iter().map(|c|&c.candidate_id).collect::<Vec<_>>()}
        },
        "tolerance":{
            "value_scoring":{
                "composite_scores":scored.iter().map(|c|c.score_summary.total_score).collect::<Vec<_>>(),
                "floating_point_scores":scored.iter().map(|c|&c.score_summary).collect::<Vec<_>>(),
                "schedule_diversity_scores":scored.iter().map(|c|c.score_summary.schedule_diversity_score).collect::<Vec<_>>()
            },
            "monte_carlo_rollout":{
                "rollout_frequencies":response.plan_candidates.iter().map(|c|c.rollout_diagnostics.as_ref().map(|r|r.feasibility_frequency)).collect::<Vec<_>>(),
                "probability_intervals":response.plan_candidates.iter().map(|c|json!([c.probability_summary.probability_interval_low,c.probability_summary.probability_interval_high])).collect::<Vec<_>>()
            }
        }
    })
}
pub fn fixture_path(name: &str) -> std::path::PathBuf {
    std::path::PathBuf::from(
        std::env::var_os("UBU_PARITY_FIXTURES")
            .expect("fixture root supplied by the owning script"),
    )
    .join(name)
}
pub fn freeze() {
    let cases: Value =
        serde_json::from_str(&std::fs::read_to_string(fixture_path("requests.json")).unwrap())
            .unwrap();
    let records:Vec<_>=cases.as_array().unwrap().iter().map(|case| {
        let request:PlanningRequest=serde_json::from_value(case["request"].clone()).unwrap();
        let response=ubu_planning_core::plan(request.clone(),&ChunkedSweepStrategy::default());
        json!({"name":case["name"],"request":request,"reference_response":response,"snapshot":snapshot(&request,&response)})
    }).collect();
    std::fs::write(
        fixture_path("cpu-goldens.json"),
        serde_json::to_string_pretty(&records).unwrap() + "\n",
    )
    .unwrap();
}
#[cfg(test)]
mod tests {
    use super::*;
    fn goldens() -> Value {
        serde_json::from_str(&std::fs::read_to_string(fixture_path("cpu-goldens.json")).unwrap())
            .unwrap()
    }
    #[test]
    fn cpu_only_goldens_and_typed_stub_boundary_match_exactly() {
        let records = goldens();
        assert!(records.as_array().unwrap().len() >= 4);
        for case in records.as_array().unwrap() {
            let request: PlanningRequest = serde_json::from_value(case["request"].clone()).unwrap();
            let expected: PlanningResponse =
                serde_json::from_value(case["reference_response"].clone()).unwrap();
            let result = ubu_planning_worker::plan_via_transport(
                request.clone(),
                &ChunkedSweepStrategy::default(),
                &mut ubu_planning_worker_protocol::StubTransport,
            );
            assert!(result.transport_outcome.is_none(), "{}", case["name"]);
            assert_eq!(result.response, expected, "{}", case["name"]);
            let actual = snapshot(&request, &result.response);
            assert_eq!(
                actual, case["snapshot"],
                "pass-through is exact before tolerance is used"
            );
            assert!(compare(&case["snapshot"], &actual));
            assert_eq!(
                result
                    .response
                    .engine_provenance
                    .tolerance_profile
                    .as_deref(),
                Some(PROFILE)
            );
        }
    }
    #[test]
    fn fixture_perturbed_within_profile_is_accepted() {
        let cases = goldens();
        let expected = &cases[0]["snapshot"];
        let mut actual = expected.clone();
        let score = actual["tolerance"]["value_scoring"]["composite_scores"][0]
            .as_f64()
            .unwrap();
        actual["tolerance"]["value_scoring"]["composite_scores"][0] = json!(score + ABSOLUTE / 2.0);
        assert!(compare(expected, &actual));
        assert_ne!(expected, &actual);
    }
    #[test]
    fn fixture_perturbed_beyond_profile_is_refused() {
        let cases = goldens();
        let expected = &cases[0]["snapshot"];
        let mut actual = expected.clone();
        let score = actual["tolerance"]["value_scoring"]["composite_scores"][0]
            .as_f64()
            .unwrap();
        actual["tolerance"]["value_scoring"]["composite_scores"][0] =
            json!(score + 100.0 * (ABSOLUTE + RELATIVE * score.abs()));
        assert!(!compare(expected, &actual));
    }
    #[test]
    fn every_exact_class_rejects_change_without_float_fuzzing() {
        let cases = goldens();
        let expected = &cases[0]["snapshot"];
        for path in [
            "/exact/schema_decoding/request",
            "/exact/chunk_partitioning/0/0",
            "/exact/skeleton_sampling/validity_mask/0/0",
            "/exact/skeleton_sampling/dependency_feasibility/0",
            "/exact/skeleton_sampling/hard_constraint_feasibility/0",
            "/exact/skeleton_sampling/rejection_classes",
            "/exact/monte_carlo_rollout/cpu_certified_selected_plan_validity",
            "/exact/affect_legitimacy_filter/feasible_mask/0",
            "/exact/value_scoring/top_k_indices/0",
        ] {
            let mut actual = expected.clone();
            let target = actual.pointer_mut(path).expect(path);
            *target = json!("synthetic exact-class mismatch");
            assert!(!compare(expected, &actual), "{path}");
        }
    }
    #[test]
    fn numeric_classes_require_equal_shape_and_seed_rollout_context() {
        assert!(same_shape_numbers(&json!(0.0), &json!(ABSOLUTE / 2.0)));
        assert!(same_shape_numbers(
            &json!(1_000_000.0),
            &json!(1_000_000.0001)
        ));
        assert!(!same_shape_numbers(
            &json!(1_000_000.0),
            &json!(1_000_000.01)
        ));
        assert!(!same_shape_numbers(&json!([1.0]), &json!([1.0, 2.0])));
        assert!(!same_shape_numbers(&json!(null), &json!(0.0)));
        let cases = goldens();
        let expected = &cases[0]["snapshot"];
        for field in ["rng_seed", "n_rollouts", "profile"] {
            let mut actual = expected.clone();
            actual[field] = json!("wrong context");
            assert!(!compare(expected, &actual));
        }
        for path in [
            "/tolerance/monte_carlo_rollout/rollout_frequencies/0",
            "/tolerance/monte_carlo_rollout/probability_intervals/0/0",
            "/tolerance/value_scoring/schedule_diversity_scores/0",
        ] {
            let mut actual = expected.clone();
            let value = actual.pointer_mut(path).unwrap();
            let base = value.as_f64().unwrap();
            *value = json!(base + ABSOLUTE / 2.0);
            assert!(compare(expected, &actual));
            *actual.pointer_mut(path).unwrap() = json!(base + 0.1);
            assert!(!compare(expected, &actual));
        }
    }
}
