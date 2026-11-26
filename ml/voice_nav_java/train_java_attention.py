"""
Kalceria Multi-Head Scaled Dot-Product Vector-Attention Trainer (Pulau Jawa Scope).

Architecture:
  - Input context vector x in R^28 (mode, distance bucket, Java road class, TomTom traffic, road/chain/speed)
  - Corpus semantic matrix E in R^{N x 28} (N = 66 Google Maps Indonesian utterances)
  - Multi-Head Attention (H = 4 heads, d_k = 8):
      For each head h in 0..3:
        Q_h = x @ W_Q[h]            (shape: [B, 8])
        K_h = E @ W_K[h]            (shape: [N, 8])
        S_h = (Q_h @ K_h^T) / sqrt(8)
      Logits = sum_h (head_scale[h] * S_h) + bias
  - Layer 1 Hard Symbolic Mask: invalid directionLock candidates masked by -1e9 BEFORE softmax
  - Trained with Adam + Cosine LR Decay + L2 Regularization purely in NumPy (zero heavy PyTorch bloat)
  - Exports compact JSON weights (< 60 KB) for sub-millisecond Node.js & Browser inference in Iteration 3/5!
"""

import json
import math
from pathlib import Path
import numpy as np

from java_scenario_generator import (
    FEATURE_DIM,
    MODES,
    DISTANCE_BUCKETS,
    ROAD_CLASSES,
    TRAFFIC_STATES,
    encode_corpus_key_matrix,
    generate_java_dataset,
)

ROOT = Path(__file__).resolve().parents[2]
CORPUS_PATH = ROOT / "data" / "voice_nav_java" / "GOOGLE_MAPS_ID_CORPUS.json"
WEIGHTS_OUT = ROOT / "data" / "voice_nav_java" / "JAVA_ATTENTION_WEIGHTS_V1.json"
REPORT_OUT = ROOT / "data" / "voice_nav_java" / "TRAINING_REPORT_ITER2.json"


def softmax_masked(logits, mask):
    masked = np.where(mask > 0.5, logits, -1e9)
    max_val = np.max(masked, axis=1, keepdims=True)
    exps = np.where(mask > 0.5, np.exp(np.clip(masked - max_val, -40.0, 0.0)), 0.0)
    sums = np.maximum(np.sum(exps, axis=1, keepdims=True), 1e-12)
    return exps / sums


def forward_attention(X, E, W_Q, W_K, head_scale, bias):
    """Multi-head scaled dot-product attention logits [B, N] + per-head cache."""
    num_heads, _, d_k = W_Q.shape
    scale = 1.0 / math.sqrt(d_k)
    logits = np.broadcast_to(bias[None, :], (X.shape[0], E.shape[0])).copy()
    cache = []
    for h in range(num_heads):
        Q = X @ W_Q[h]  # [B, d_k]
        K = E @ W_K[h]  # [N, d_k]
        S = (Q @ K.T) * scale  # [B, N]
        logits += head_scale[h] * S
        cache.append((Q, K, S))
    return logits, cache


def evaluate_split(X, M, y, meta, E, W_Q, W_K, head_scale, bias, utterances):
    logits, _ = forward_attention(X, E, W_Q, W_K, head_scale, bias)
    probs = softmax_masked(logits, M)
    preds = np.argmax(probs, axis=1)
    top1 = float(np.mean(preds == y))

    # Cross-entropy loss
    true_probs = np.clip(probs[np.arange(len(y)), y], 1e-12, 1.0)
    loss = float(-np.mean(np.log(true_probs)))

    # Verify 100.00% Hard Directional Safety
    safe_hits = 0
    per_cat = {}
    for i, pred_idx in enumerate(preds):
        gt_lock = meta[i]["directionLock"]
        pred_lock = utterances[int(pred_idx)]["directionLock"]
        if pred_lock == gt_lock:
            safe_hits += 1
        cat = meta[i]["category"]
        rec = per_cat.setdefault(cat, {"correct": 0, "total": 0})
        rec["total"] += 1
        if pred_idx == y[i]:
            rec["correct"] += 1

    directional_safety = safe_hits / max(1, len(y))
    per_cat_acc = {
        k: round(v["correct"] / max(1, v["total"]) * 100.0, 2)
        for k, v in sorted(per_cat.items())
    }
    return {
        "loss": round(loss, 5),
        "top1AccuracyPct": round(top1 * 100.0, 2),
        "directionalSafetyPct": round(directional_safety * 100.0, 2),
        "perCategoryAccuracyPct": per_cat_acc,
    }


def train():
    corpus = json.loads(CORPUS_PATH.read_text(encoding="utf-8"))
    utterances = corpus["utterances"]
    n_classes = len(utterances)
    E = encode_corpus_key_matrix(utterances)  # [N, 28]

    splits = generate_java_dataset(corpus, total_samples=14000, seed=2026)
    X_tr, M_tr, y_tr, meta_tr = splits["train"]
    X_va, M_va, y_va, meta_va = splits["val"]
    X_te, M_te, y_te, meta_te = splits["test"]

    rng = np.random.default_rng(42)
    num_heads = 4
    d_k = 8
    scale = 1.0 / math.sqrt(d_k)

    W_Q = rng.normal(0.0, 0.22, size=(num_heads, FEATURE_DIM, d_k)).astype(np.float32)
    W_K = rng.normal(0.0, 0.22, size=(num_heads, FEATURE_DIM, d_k)).astype(np.float32)
    head_scale = np.ones(num_heads, dtype=np.float32) * 0.5
    bias = np.zeros(n_classes, dtype=np.float32)

    # Adam optimizer state
    params = {"W_Q": W_Q, "W_K": W_K, "head_scale": head_scale, "bias": bias}
    m_opt = {k: np.zeros_like(v) for k, v in params.items()}
    v_opt = {k: np.zeros_like(v) for k, v in params.items()}
    beta1, beta2, eps = 0.9, 0.999, 1e-8
    weight_decay = 1e-4

    epochs = 45
    batch_size = 128
    base_lr = 0.025
    step_t = 0
    history = []

    best_val_acc = -1.0
    best_snapshot = None

    for epoch in range(1, epochs + 1):
        lr = base_lr * (0.1 + 0.9 * 0.5 * (1.0 + math.cos(math.pi * (epoch - 1) / epochs)))
        order = rng.permutation(len(X_tr))

        for start in range(0, len(X_tr), batch_size):
            idx = order[start : start + batch_size]
            xb, mb, yb = X_tr[idx], M_tr[idx], y_tr[idx]
            bsz = len(idx)

            logits, cache = forward_attention(xb, E, params["W_Q"], params["W_K"], params["head_scale"], params["bias"])
            probs = softmax_masked(logits, mb)

            dlogits = probs.copy()
            dlogits[np.arange(bsz), yb] -= 1.0
            dlogits /= bsz

            g_W_Q = np.zeros_like(params["W_Q"])
            g_W_K = np.zeros_like(params["W_K"])
            g_head = np.zeros_like(params["head_scale"])
            g_bias = np.sum(dlogits, axis=0)

            for h in range(num_heads):
                Q, K, S = cache[h]
                hs = params["head_scale"][h]
                g_head[h] = np.sum(dlogits * S)
                dS = dlogits * (hs * scale)  # [B, N]
                dQ = dS @ K  # [B, d_k]
                dK = dS.T @ Q  # [N, d_k]
                g_W_Q[h] = xb.T @ dQ + weight_decay * params["W_Q"][h]
                g_W_K[h] = E.T @ dK + weight_decay * params["W_K"][h]

            grads = {"W_Q": g_W_Q, "W_K": g_W_K, "head_scale": g_head, "bias": g_bias}
            step_t += 1
            for k in params:
                m_opt[k] = beta1 * m_opt[k] + (1.0 - beta1) * grads[k]
                v_opt[k] = beta2 * v_opt[k] + (1.0 - beta2) * (grads[k] ** 2)
                m_hat = m_opt[k] / (1.0 - beta1 ** step_t)
                v_hat = v_opt[k] / (1.0 - beta2 ** step_t)
                params[k] -= lr * m_hat / (np.sqrt(v_hat) + eps)

        if epoch in (1, 10, 20, 30, 40, epochs):
            tr_eval = evaluate_split(X_tr[:2000], M_tr[:2000], y_tr[:2000], meta_tr[:2000], E, params["W_Q"], params["W_K"], params["head_scale"], params["bias"], utterances)
            va_eval = evaluate_split(X_va, M_va, y_va, meta_va, E, params["W_Q"], params["W_K"], params["head_scale"], params["bias"], utterances)
            history.append({
                "epoch": epoch,
                "trainLoss": tr_eval["loss"],
                "trainAccPct": tr_eval["top1AccuracyPct"],
                "valLoss": va_eval["loss"],
                "valAccPct": va_eval["top1AccuracyPct"],
            })
            print(f"[Epoch {epoch:02d}] train_loss={tr_eval['loss']:.4f} val_loss={va_eval['loss']:.4f} val_acc={va_eval['top1AccuracyPct']:.2f}% dir_safe={va_eval['directionalSafetyPct']:.2f}%")
            if va_eval["top1AccuracyPct"] >= best_val_acc:
                best_val_acc = va_eval["top1AccuracyPct"]
                best_snapshot = {k: v.copy() for k, v in params.items()}

    final_params = best_snapshot or params
    test_eval = evaluate_split(X_te, M_te, y_te, meta_te, E, final_params["W_Q"], final_params["W_K"], final_params["head_scale"], final_params["bias"], utterances)
    val_eval = evaluate_split(X_va, M_va, y_va, meta_va, E, final_params["W_Q"], final_params["W_K"], final_params["head_scale"], final_params["bias"], utterances)

    def r4(arr):
        return np.round(arr.astype(np.float64), 4).tolist()

    param_count = int(
        final_params["W_Q"].size
        + final_params["W_K"].size
        + final_params["head_scale"].size
        + final_params["bias"].size
    )

    weights_payload = {
        "version": "1.0.0",
        "regionScope": "Pulau Jawa (Indonesia)",
        "architecture": {
            "type": "multi_head_scaled_dot_product_vector_attention",
            "featureDim": FEATURE_DIM,
            "numHeads": num_heads,
            "headDim": d_k,
            "numUtterances": n_classes,
            "parameterCount": param_count,
            "headRoles": [
                "Urgency & Distance Head",
                "Pulau Jawa Road & Mode Head",
                "Traffic & Hazard Priority Head",
                "Multimodal Transit & Chaining Head",
            ],
        },
        "featureIndex": {
            "modes": MODES,
            "distanceBuckets": DISTANCE_BUCKETS,
            "roadClasses": ROAD_CLASSES,
            "trafficStates": TRAFFIC_STATES,
            "scalarIndices": {
                "hasRoadName": 25,
                "hasChainedNext": 26,
                "speedNormalized": 27,
                "isEndOfRoad": 28,
                "isNewRoadName": 29,
            },
        },
        "utteranceIds": [u["id"] for u in utterances],
        "corpusEmbeddings": r4(E),
        "W_Q": r4(final_params["W_Q"]),
        "W_K": r4(final_params["W_K"]),
        "headScale": r4(final_params["head_scale"]),
        "bias": r4(final_params["bias"]),
    }

    WEIGHTS_OUT.write_text(json.dumps(weights_payload, separators=(",", ":")), encoding="utf-8")
    weights_kb = round(WEIGHTS_OUT.stat().st_size / 1024.0, 2)

    report = {
        "iteration": "2/5",
        "architecture": weights_payload["architecture"],
        "dataset": {"total": 14000, "train": len(X_tr), "val": len(X_va), "test": len(X_te)},
        "weightsFile": "data/voice_nav_java/JAVA_ATTENTION_WEIGHTS_V1.json",
        "weightsSizeKB": weights_kb,
        "validation": val_eval,
        "test": test_eval,
        "history": history,
    }
    REPORT_OUT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"SAVED {WEIGHTS_OUT.name} ({weights_kb} KB) | TEST ACC={test_eval['top1AccuracyPct']}% | DIR SAFETY={test_eval['directionalSafetyPct']}%")


if __name__ == "__main__":
    train()
