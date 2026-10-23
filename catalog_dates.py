"""Original catalog addition dates from the validated publication projection."""
from datetime import datetime
from zoneinfo import ZoneInfo


def catalog_additions(updates):
    """Keep the earliest New incident, never a later development or correction.

    Dates follow the publication feed's Los Angeles calendar. Missing first-listing
    records stay absent rather than falling back to disclosure or catalog modified.
    """
    first = {}
    for update in updates["updates"]:
        if update["type"] != "New incident":
            continue
        stamp = datetime.fromisoformat(update["published"])
        if stamp.tzinfo is None:
            raise ValueError("Catalog addition needs a timezone")
        incident = update["incident"]
        if incident not in first or stamp < first[incident][0]:
            first[incident] = (stamp, update)
    return {incident: {
        "date": stamp.astimezone(ZoneInfo("America/Los_Angeles")).date().isoformat(),
        "update": update["id"],
        "reconstructed": bool(update.get("history", {}).get("reconstructed")),
    } for incident, (stamp, update) in first.items()}
