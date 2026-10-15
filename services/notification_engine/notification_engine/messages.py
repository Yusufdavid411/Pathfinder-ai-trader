from dataclasses import dataclass
from enum import StrEnum


class DeliveryPriority(StrEnum):
    NORMAL = "normal"
    HIGH = "high"


@dataclass(frozen=True)
class TelegramMessage:
    chat_id: int
    text: str
    priority: DeliveryPriority = DeliveryPriority.NORMAL


@dataclass(frozen=True)
class ManualReviewAlert:
    asset: str
    market_state: str
    quality_score: int
    confidence_label: str
    reason: str


def render_manual_review_alert(alert: ManualReviewAlert) -> str:
    return "\n".join(
        [
            "PAT Market Watch",
            f"Asset: {alert.asset}",
            f"Market State: {alert.market_state}",
            f"Market Quality: {alert.quality_score}/100",
            f"Confidence: {alert.confidence_label}",
            f"Reason: {alert.reason}",
            "Action: Manual review required.",
            "Execution: Disabled until a compliant broker path is approved.",
        ]
    )
