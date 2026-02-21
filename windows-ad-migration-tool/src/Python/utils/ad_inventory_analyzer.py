"""
AD Inventory Analyzer

Reads exported AD inventory data (CSV/JSON) and produces analysis reports
for migration planning. Identifies stale accounts, nested group complexity,
OU structure recommendations, and potential migration issues.
"""

import json
import sys
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd


def load_users(file_path: str) -> pd.DataFrame:
    """Load users from CSV or JSON export."""
    path = Path(file_path)
    if path.suffix == ".csv":
        return pd.read_csv(file_path)
    elif path.suffix == ".json":
        with open(file_path, "r") as f:
            data = json.load(f)
        return pd.DataFrame(data)
    else:
        raise ValueError(f"Unsupported file format: {path.suffix}")


def load_groups(file_path: str) -> pd.DataFrame:
    """Load groups from CSV or JSON export."""
    return load_users(file_path)  # Same loading logic


def analyze_stale_accounts(
    users: pd.DataFrame, days_threshold: int = 90
) -> pd.DataFrame:
    """Identify accounts that haven't logged in within the threshold."""
    if "LastLogonDate" not in users.columns:
        return pd.DataFrame()

    users["LastLogonDate"] = pd.to_datetime(users["LastLogonDate"], errors="coerce")
    cutoff = datetime.now() - timedelta(days=days_threshold)
    stale = users[
        (users["LastLogonDate"] < cutoff) | (users["LastLogonDate"].isna())
    ].copy()

    stale["DaysSinceLogon"] = (datetime.now() - stale["LastLogonDate"]).dt.days
    return stale.sort_values("DaysSinceLogon", ascending=False)


def analyze_disabled_accounts(users: pd.DataFrame) -> pd.DataFrame:
    """Find disabled accounts that may not need migration."""
    if "Enabled" not in users.columns:
        return pd.DataFrame()
    return users[users["Enabled"] == False].copy()


def analyze_group_complexity(groups: pd.DataFrame) -> dict:
    """Analyze group structure for migration complexity."""
    analysis = {
        "total_groups": len(groups),
        "by_scope": {},
        "by_type": {},
        "empty_groups": 0,
        "large_groups": [],
    }

    if "GroupScope" in groups.columns:
        analysis["by_scope"] = groups["GroupScope"].value_counts().to_dict()

    if "GroupCategory" in groups.columns:
        analysis["by_type"] = groups["GroupCategory"].value_counts().to_dict()

    if "MemberCount" in groups.columns:
        analysis["empty_groups"] = int((groups["MemberCount"] == 0).sum())
        large = groups[groups["MemberCount"] > 100]
        analysis["large_groups"] = large[["Name", "MemberCount"]].to_dict("records")

    return analysis


def analyze_ou_structure(users: pd.DataFrame) -> dict:
    """Analyze OU distribution of users."""
    if "DistinguishedName" not in users.columns:
        return {}

    def extract_ou(dn: str) -> str:
        if pd.isna(dn):
            return "Unknown"
        parts = dn.split(",")
        ou_parts = [p.strip() for p in parts if p.strip().startswith("OU=")]
        return ",".join(ou_parts) if ou_parts else "Root"

    users["OU"] = users["DistinguishedName"].apply(extract_ou)
    return users["OU"].value_counts().to_dict()


def generate_migration_summary(users_file: str, groups_file: str) -> dict:
    """Generate a full pre-migration analysis summary."""
    users = load_users(users_file)
    groups = load_groups(groups_file)

    stale = analyze_stale_accounts(users)
    disabled = analyze_disabled_accounts(users)
    group_analysis = analyze_group_complexity(groups)
    ou_distribution = analyze_ou_structure(users)

    summary = {
        "generated_at": datetime.now().isoformat(),
        "user_stats": {
            "total": len(users),
            "enabled": int(users["Enabled"].sum()) if "Enabled" in users.columns else 0,
            "disabled": len(disabled),
            "stale_90_days": len(stale),
        },
        "group_stats": group_analysis,
        "ou_distribution": ou_distribution,
        "recommendations": [],
    }

    # Generate recommendations
    if len(stale) > 0:
        pct = len(stale) / len(users) * 100
        summary["recommendations"].append(
            f"{len(stale)} accounts ({pct:.1f}%) are stale (no logon in 90 days). "
            "Consider excluding these from migration."
        )

    if len(disabled) > 0:
        summary["recommendations"].append(
            f"{len(disabled)} accounts are disabled. "
            "Review whether these need to be migrated."
        )

    if group_analysis.get("empty_groups", 0) > 0:
        summary["recommendations"].append(
            f"{group_analysis['empty_groups']} groups have no members. "
            "Consider skipping empty groups."
        )

    return summary


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python ad_inventory_analyzer.py <users_file> <groups_file>")
        sys.exit(1)

    summary = generate_migration_summary(sys.argv[1], sys.argv[2])
    print(json.dumps(summary, indent=2, default=str))
