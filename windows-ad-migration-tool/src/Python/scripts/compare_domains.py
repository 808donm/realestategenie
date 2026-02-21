"""
Domain Comparison Tool

Compares AD inventory exports from source and target domains to identify:
- Users/groups that already exist in both domains
- SamAccountName conflicts
- Attribute differences for matching objects
- Missing OUs in target that need to be created
"""

import json
import sys
from pathlib import Path

import pandas as pd


def compare_users(source_file: str, target_file: str) -> dict:
    """Compare user inventories between source and target domains."""
    source = _load_data(source_file)
    target = _load_data(target_file)

    source_accounts = set(source["SamAccountName"].dropna())
    target_accounts = set(target["SamAccountName"].dropna())

    conflicts = source_accounts & target_accounts
    unique_to_source = source_accounts - target_accounts

    result = {
        "source_count": len(source_accounts),
        "target_count": len(target_accounts),
        "conflicts": sorted(conflicts),
        "conflict_count": len(conflicts),
        "unique_to_source": sorted(unique_to_source),
        "unique_to_source_count": len(unique_to_source),
    }

    # Detail conflicting accounts
    if conflicts:
        conflict_details = []
        for account in sorted(conflicts):
            src_row = source[source["SamAccountName"] == account].iloc[0]
            tgt_row = target[target["SamAccountName"] == account].iloc[0]

            diffs = {}
            for col in ["DisplayName", "Email", "Department", "Title"]:
                if col in source.columns and col in target.columns:
                    src_val = str(src_row.get(col, ""))
                    tgt_val = str(tgt_row.get(col, ""))
                    if src_val != tgt_val:
                        diffs[col] = {"source": src_val, "target": tgt_val}

            conflict_details.append(
                {
                    "SamAccountName": account,
                    "attribute_differences": diffs,
                }
            )

        result["conflict_details"] = conflict_details

    return result


def compare_groups(source_file: str, target_file: str) -> dict:
    """Compare group inventories between source and target domains."""
    source = _load_data(source_file)
    target = _load_data(target_file)

    source_groups = set(source["SamAccountName"].dropna())
    target_groups = set(target["SamAccountName"].dropna())

    conflicts = source_groups & target_groups

    return {
        "source_count": len(source_groups),
        "target_count": len(target_groups),
        "conflicts": sorted(conflicts),
        "conflict_count": len(conflicts),
        "unique_to_source": sorted(source_groups - target_groups),
        "unique_to_source_count": len(source_groups - target_groups),
    }


def compare_ous(source_file: str, target_file: str) -> dict:
    """Compare OU structures between domains."""
    source = _load_data(source_file)
    target = _load_data(target_file)

    source_ous = set(source["Name"].dropna()) if "Name" in source.columns else set()
    target_ous = set(target["Name"].dropna()) if "Name" in target.columns else set()

    return {
        "source_count": len(source_ous),
        "target_count": len(target_ous),
        "missing_in_target": sorted(source_ous - target_ous),
        "missing_count": len(source_ous - target_ous),
    }


def _load_data(file_path: str) -> pd.DataFrame:
    path = Path(file_path)
    if path.suffix == ".csv":
        return pd.read_csv(file_path)
    elif path.suffix == ".json":
        with open(file_path, "r") as f:
            return pd.DataFrame(json.load(f))
    raise ValueError(f"Unsupported format: {path.suffix}")


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python compare_domains.py <type> <source_file> <target_file>")
        print("  type: users | groups | ous")
        sys.exit(1)

    compare_type = sys.argv[1]
    source = sys.argv[2]
    target = sys.argv[3]

    if compare_type == "users":
        result = compare_users(source, target)
    elif compare_type == "groups":
        result = compare_groups(source, target)
    elif compare_type == "ous":
        result = compare_ous(source, target)
    else:
        print(f"Unknown type: {compare_type}")
        sys.exit(1)

    print(json.dumps(result, indent=2))
