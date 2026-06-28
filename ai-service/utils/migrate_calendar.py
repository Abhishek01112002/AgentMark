import logging
logger = logging.getLogger(__name__)

from schemas.agent_outputs import ContentCalendar, CalendarWeek, CalendarActivity, Channel, normalize_channel_name
from itertools import groupby


def migrate_flat_calendar(flat_entries: list[dict], campaign_start_date: str = "2026-06-29") -> ContentCalendar:
    if not flat_entries:
        raise ValueError("Cannot migrate empty calendar")

    sorted_entries = sorted(flat_entries, key=lambda x: x.get("week", 0))
    weeks = []

    for week_num, group in groupby(sorted_entries, key=lambda x: x.get("week", 1)):
        entries = list(group)
        activities = []

        for entry in entries:
            raw_channel = entry.get("channel", "")
            normalized = normalize_channel_name(raw_channel)

            if normalized is None:
                logger.info(f"⚠️  Unknown channel '{raw_channel}' in week {week_num} — skipping")
                continue

            activities.append(CalendarActivity(
                day=f"Week {week_num}",
                channel=Channel(normalized),
                description=entry.get("topic", "No description in legacy data"),
                caption_hook="",
                effort="medium",
                quick_win=False,
            ))

        if not activities:
            logger.info(f"⚠️  Week {week_num} has no valid activities — skipping")
            continue

        weeks.append(CalendarWeek(
            week_label=f"Week {week_num}",
            week_start_date=campaign_start_date,
            theme=f"Migrated from legacy format — week {week_num}",
            activities=activities,
        ))

    if not weeks:
        raise ValueError("Migration produced 0 valid weeks — check channel names in source data")

    return ContentCalendar(
        total_weeks=len(weeks),
        campaign_start_date=campaign_start_date,
        weeks=weeks,
    )


def validate_migration(old: list[dict], new: ContentCalendar) -> dict:
    old_count = len(old)
    new_count = sum(len(w.activities) for w in new.weeks)
    skipped = old_count - new_count
    return {
        "old_entries": old_count,
        "new_activities": new_count,
        "skipped": skipped,
        "weeks_generated": len(new.weeks),
        "ok": skipped == 0,
        "warning": f"{skipped} entries skipped (unknown channels)" if skipped > 0 else None,
    }
