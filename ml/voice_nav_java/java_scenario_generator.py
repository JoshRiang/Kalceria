"""
Pulau Jawa Road-Ahead Navigation Scenario Generator for Vector-Attention Static-ML Training.

Encodes real Pulau Jawa road contexts (Jakarta, Bandung, Semarang, Yogyakarta, Surabaya)
into the canonical 30-dimensional feature vector shared bit-for-bit with runtime JS inference:
  [0..4]   transport mode one-hot (foot, motorcycle, car, bus, train)
  [5..10]  distance bucket one-hot (far_1000m, prepare_500m, approach_200m, imminent_80m, now_25m, immediate)
  [11..20] Java road class one-hot (tol, arteri, lokal, gang, bundaran, flyover, underpass, perlintasan_ka, stasiun, halte)
  [21..24] TomTom traffic state one-hot (FREE, MODERATE, SLOW, JAM)
  [25]     hasRoadName (0/1)
  [26]     hasChainedNext (0/1)
  [27]     speedNormalized (0..1)
  [28]     isEndOfRoad (0/1 — OSRM T-junction end_of_road signal)
  [29]     isNewRoadName (0/1 — OSRM new_name road transition signal)
"""

import numpy as np

MODES = ["foot", "motorcycle", "car", "bus", "train"]
DISTANCE_BUCKETS = ["far_1000m", "prepare_500m", "approach_200m", "imminent_80m", "now_25m", "immediate"]
ROAD_CLASSES = ["tol", "arteri", "lokal", "gang", "bundaran", "flyover", "underpass", "perlintasan_ka", "stasiun", "halte"]
TRAFFIC_STATES = ["FREE", "MODERATE", "SLOW", "JAM"]

FEATURE_DIM = len(MODES) + len(DISTANCE_BUCKETS) + len(ROAD_CLASSES) + len(TRAFFIC_STATES) + 5  # 30


def encode_context_vector(
    mode,
    distance_bucket,
    road_class,
    traffic_state,
    has_road,
    has_chained,
    speed_kmh,
    is_end_of_road=False,
    is_new_road_name=False,
):
    vec = np.zeros(FEATURE_DIM, dtype=np.float32)
    if mode in MODES:
        vec[MODES.index(mode)] = 1.0
    if distance_bucket in DISTANCE_BUCKETS:
        vec[5 + DISTANCE_BUCKETS.index(distance_bucket)] = 1.0
    if road_class in ROAD_CLASSES:
        vec[11 + ROAD_CLASSES.index(road_class)] = 1.0
    if traffic_state in TRAFFIC_STATES:
        vec[21 + TRAFFIC_STATES.index(traffic_state)] = 1.0
    vec[25] = 1.0 if has_road else 0.0
    vec[26] = 1.0 if has_chained else 0.0
    vec[27] = float(np.clip(speed_kmh / 90.0, 0.0, 1.0))
    vec[28] = 1.0 if is_end_of_road else 0.0
    vec[29] = 1.0 if is_new_road_name else 0.0
    return vec


def encode_corpus_key_matrix(utterances):
    """Build dense semantic descriptor matrix E_corpus [N_utterances, 30] from corpus metadata."""
    mat = np.zeros((len(utterances), FEATURE_DIM), dtype=np.float32)
    for idx, u in enumerate(utterances):
        modes = u.get("modes", [])
        for m in modes:
            if m in MODES:
                mat[idx, MODES.index(m)] = 1.0 / max(1, len(modes))

        buckets = u.get("distanceBuckets", [])
        for b in buckets:
            if b in DISTANCE_BUCKETS:
                mat[idx, 5 + DISTANCE_BUCKETS.index(b)] = 1.0 / max(1, len(buckets))

        rclasses = u.get("roadClasses", [])
        if "any" in rclasses:
            mat[idx, 11:21] = 0.25
        for rc in rclasses:
            if rc in ROAD_CLASSES:
                mat[idx, 11 + ROAD_CLASSES.index(rc)] = 1.0

        tstates = u.get("trafficStates", [])
        for ts in tstates:
            if ts in TRAFFIC_STATES:
                mat[idx, 21 + TRAFFIC_STATES.index(ts)] = 1.0 / max(1, len(tstates))

        mat[idx, 25] = 1.0 if u.get("requiresRoad") else -0.35
        mat[idx, 26] = 1.0 if str(u.get("directionLock", "")).startswith("chained_") else 0.0
        urg = u.get("urgency", "calm")
        mat[idx, 27] = {"calm": 0.25, "advisory": 0.55, "urgent": 0.85, "alert": 1.0}.get(urg, 0.5)
        mat[idx, 28] = 1.0 if u.get("maneuverType") == "end_of_road" else -0.35
        mat[idx, 29] = 1.0 if u.get("maneuverType") == "new_name" else -0.35
    return mat


def _pick_speed_for_context(rng, mode, road_class, traffic_state):
    base = {"foot": 4.8, "motorcycle": 38.0, "car": 45.0, "bus": 26.0, "train": 48.0}[mode]
    if road_class == "tol":
        base *= 1.6
    elif road_class == "gang":
        base *= 0.45
    elif road_class == "bundaran":
        base *= 0.55
    traffic_mult = {"FREE": 1.0, "MODERATE": 0.72, "SLOW": 0.45, "JAM": 0.18}[traffic_state]
    if mode in ("foot", "train"):
        traffic_mult = 1.0
    return float(np.clip(base * traffic_mult + rng.normal(0, 3.0), 0.0, 110.0))


def _resolve_oracle_label(utterances, by_id, scenario):
    """Ground-truth Pulau Jawa expert policy mapping road-ahead context -> exact best Google Maps template."""
    dlock = scenario["directionLock"]
    mode = scenario["mode"]
    dist = scenario["distanceBucket"]
    rc = scenario["roadClass"]
    traf = scenario["trafficState"]
    has_road = scenario["hasRoad"]
    sub_hint = scenario.get("subHint")

    if dlock == "depart":
        if mode == "foot":
            return "depart_foot_walk"
        if mode in ("bus", "train"):
            return "depart_transit_mode"
        if mode == "motorcycle" and has_road and rc in ("arteri", "lokal", "gang"):
            return "depart_motorcycle_notoll"
        return "depart_standard_road" if has_road else "depart_standard_noroad"

    if dlock == "straight":
        if sub_hint == "new_name" and has_road and dist in ("approach_200m", "imminent_80m"):
            return "new_name_continue"
        if mode == "car" and rc == "tol" and has_road and dist in ("far_1000m", "prepare_500m"):
            return "continue_straight_tol"
        if has_road and dist in ("far_1000m", "prepare_500m"):
            return "continue_straight_far_road"
        return "continue_straight_short"

    if dlock in ("left", "right"):
        side = dlock
        if sub_hint == "end_of_road" and has_road and dist in ("approach_200m", "imminent_80m", "now_25m"):
            return f"end_of_road_{side}"
        if dist in ("now_25m", "immediate"):
            return f"turn_{side}_now"
        if rc == "gang" and mode in ("foot", "motorcycle") and has_road and dist in ("approach_200m", "imminent_80m"):
            return f"turn_{side}_gang_moto_foot"
        if dist == "imminent_80m":
            return f"turn_{side}_imminent_80" if has_road else f"turn_{side}_now"
        if dist in ("far_1000m", "prepare_500m") and mode in ("car", "motorcycle") and has_road:
            return f"turn_{side}_prepare_500"
        if has_road and dist == "approach_200m":
            return f"turn_{side}_approach_200_road"
        return f"turn_{side}_approach_200_noroad"

    if dlock in ("slight_left", "slight_right", "sharp_left", "sharp_right"):
        if dist in ("now_25m", "immediate") or not has_road:
            return f"turn_{dlock}_now"
        return f"turn_{dlock}_road"

    if dlock == "uturn":
        if rc == "arteri" and traf in ("SLOW", "JAM") and mode in ("motorcycle", "car") and has_road and dist in ("approach_200m", "imminent_80m"):
            return "uturn_arteri_caution"
        if dist in ("prepare_500m", "approach_200m") and mode in ("motorcycle", "car"):
            return "uturn_prepare"
        return "uturn_now"

    if dlock == "roundabout":
        if dist in ("imminent_80m", "now_25m", "immediate") or not has_road:
            return "roundabout_now_exit"
        if rc == "bundaran" and traf in ("MODERATE", "SLOW", "JAM") and mode in ("motorcycle", "car"):
            return "rotary_large_java"
        return "roundabout_approach_exit"

    if dlock in ("keep_left", "keep_right"):
        if dist in ("now_25m", "immediate") or not has_road:
            return f"fork_{dlock}_now"
        return f"fork_{dlock}_road"

    if dlock in ("merge_left", "merge_right"):
        return f"{dlock}_road"

    if dlock == "ramp_enter":
        if rc == "flyover":
            return "flyover_take_java"
        if rc == "underpass":
            return "underpass_take_java"
        return "ramp_enter_toll_car"

    if dlock == "ramp_exit":
        return "ramp_exit_toll_car"

    if dlock == "chained_lr":
        return "chain_left_then_right"
    if dlock == "chained_rl":
        return "chain_right_then_left"
    if dlock == "chained_ll":
        return "chain_left_then_left"
    if dlock == "chained_rr":
        return "chain_right_then_right"

    if dlock == "traffic":
        if traf == "JAM" and has_road:
            return "traffic_jam_ahead_delay"
        if traf == "SLOW" and has_road:
            return "traffic_slow_ahead_road"
        return "traffic_moderate_ahead"

    if dlock == "hazard":
        return "hazard_rail_crossing_java"

    if dlock == "transit_walk":
        return "transit_walk_to_station" if mode == "train" else "transit_walk_to_halte"

    if dlock == "transit_board":
        return "transit_board_train" if mode == "train" else "transit_board_bus"

    if dlock == "transit_alight":
        return "transit_alight_train" if mode == "train" else "transit_alight_bus"

    if dlock == "transit_transfer":
        return "transit_transfer_line"

    if dlock == "reroute":
        return "off_route_recalculating"

    if dlock in ("arrive_ahead", "arrive_left", "arrive_right"):
        return f"{dlock}_event"

    return utterances[0]["id"]


def generate_java_dataset(corpus, total_samples=14000, seed=2026):
    """Generates balanced, realistic Pulau Jawa navigation training/val/test tensors."""
    rng = np.random.default_rng(seed)
    utterances = corpus["utterances"]
    id_to_idx = {u["id"]: i for i, u in enumerate(utterances)}
    by_id = {u["id"]: u for u in utterances}
    n_classes = len(utterances)

    # Precompute directionLock -> valid class mask for Layer 1 Symbolic Guardrail alignment
    dlock_to_indices = {}
    for idx, u in enumerate(utterances):
        dlock_to_indices.setdefault(u["directionLock"], []).append(idx)

    X = np.zeros((total_samples, FEATURE_DIM), dtype=np.float32)
    M = np.zeros((total_samples, n_classes), dtype=np.float32)  # 1 = direction-valid, 0 = masked out
    y = np.zeros(total_samples, dtype=np.int64)
    meta = []

    all_dlocks = list(dlock_to_indices.keys())

    for s in range(total_samples):
        # Balanced sampling across every utterance class + realistic Pulau Jawa noise perturbations
        base_u = utterances[s % n_classes] if s < n_classes * 150 else utterances[int(rng.integers(0, n_classes))]
        dlock = base_u["directionLock"]

        # Sample realistic Pulau Jawa context matching this maneuver family
        mode = str(rng.choice(base_u["modes"]))
        dist = str(rng.choice(base_u["distanceBuckets"]))
        rchoices = [r for r in base_u["roadClasses"] if r != "any"] or ["arteri", "lokal", "gang"]
        if mode == "motorcycle" and "tol" in rchoices and len(rchoices) > 1:
            rchoices = [r for r in rchoices if r != "tol"]
        rc = str(rng.choice(rchoices))
        traf = str(rng.choice(base_u["trafficStates"]))

        # Realistic road-name availability variation
        if base_u.get("requiresRoad"):
            has_road = True if rng.random() < 0.88 else False
        else:
            has_road = True if rng.random() < 0.45 else False

        has_chained = dlock.startswith("chained_")
        sub_hint = None
        is_end_of_road = False
        is_new_road_name = False
        if base_u["id"] == "new_name_continue":
            sub_hint = "new_name"
            is_new_road_name = True
        elif base_u["id"] in ("end_of_road_left", "end_of_road_right"):
            sub_hint = "end_of_road"
            is_end_of_road = True

        speed_kmh = _pick_speed_for_context(rng, mode, rc, traf)

        # Resolve deterministic ground-truth label under Pulau Jawa expert rules
        scenario = {
            "directionLock": dlock,
            "mode": mode,
            "distanceBucket": dist,
            "roadClass": rc,
            "trafficState": traf,
            "hasRoad": has_road,
            "subHint": sub_hint,
        }
        target_id = _resolve_oracle_label(utterances, by_id, scenario)
        target_idx = id_to_idx[target_id]

        vec = encode_context_vector(
            mode,
            dist,
            rc,
            traf,
            has_road,
            has_chained,
            speed_kmh,
            is_end_of_road=is_end_of_road,
            is_new_road_name=is_new_road_name,
        )
        X[s] = vec
        y[s] = target_idx

        # Layer 1 Hard Symbolic Mask: strictly allow ONLY candidates with identical directionLock
        for valid_idx in dlock_to_indices[dlock]:
            cand = utterances[valid_idx]
            if not has_road and cand.get("requiresRoad") and valid_idx != target_idx:
                continue
            M[s, valid_idx] = 1.0
        M[s, target_idx] = 1.0

        meta.append({"directionLock": dlock, "category": base_u["category"], "targetId": target_id})

    # Deterministic shuffle & split 80% / 10% / 10%
    perm = rng.permutation(total_samples)
    X, M, y = X[perm], M[perm], y[perm]
    meta = [meta[i] for i in perm]

    n_train = int(total_samples * 0.80)
    n_val = int(total_samples * 0.10)
    return {
        "train": (X[:n_train], M[:n_train], y[:n_train], meta[:n_train]),
        "val": (X[n_train : n_train + n_val], M[n_train : n_train + n_val], y[n_train : n_train + n_val], meta[n_train : n_train + n_val]),
        "test": (X[n_train + n_val :], M[n_train + n_val :], y[n_train + n_val :], meta[n_train + n_val :]),
    }
