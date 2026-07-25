"""
Page-Hinkley Drift Detector — AgentMark AI Pre-Flight Engine (Phase 2B)

Monitors distribution shifts in pre-flight prediction scores over time.
Flags statistical drift without auto-modifying production weights.
"""

from typing import List, Dict, Any


class PageHinkleyDriftDetector:
    """Page-Hinkley Cumulative Sum Drift Detector."""

    def __init__(self, delta: float = 0.005, threshold: float = 15.0, alpha: float = 0.999):
        self.delta = delta
        self.threshold = threshold
        self.alpha = alpha
        self.reset()

    def reset(self) -> None:
        """Resets detector tracking state."""
        self.mean = 0.0
        self.sum = 0.0
        self.min_sum = 0.0
        self.sample_count = 0

    def add_sample(self, value: float) -> bool:
        """
        Processes a new score sample.
        Returns True if drift threshold is exceeded, False otherwise.
        """
        self.sample_count += 1
        self.mean = self.mean + (value - self.mean) / self.sample_count
        self.sum = self.sum + (value - self.mean - self.delta)
        
        if self.sum < self.min_sum:
            self.min_sum = self.sum

        page_hinkley_stat = self.sum - self.min_sum
        return page_hinkley_stat > self.threshold

    def evaluate_batch(self, samples: List[float]) -> Dict[str, Any]:
        """Evaluates a batch of historical score samples for drift."""
        self.reset()
        drift_detected = False
        drift_index = -1

        for idx, sample in enumerate(samples):
            if self.add_sample(sample):
                drift_detected = True
                if drift_index == -1:
                    drift_index = idx

        return {
            "drift_detected": drift_detected,
            "drift_index": drift_index,
            "sample_count": self.sample_count,
            "final_ph_stat": round(self.sum - self.min_sum, 4),
            "threshold": self.threshold
        }
