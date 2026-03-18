from __future__ import annotations

from typing import Any


def _stringify_value(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, list):
        parts = [str(v).strip() for v in value if str(v).strip()]
        return "\n".join(parts).strip()
    return str(value).strip()


def _extract_prompt(check_data: dict[str, Any]) -> str:
    # Prefer explicit prompt, then common variants seen in uploaded libraries.
    candidates = [
        check_data.get("prompt"),
        check_data.get("instruction"),
        check_data.get("instructions"),
        check_data.get("requirement"),
        check_data.get("requirements"),
        check_data.get("description"),
        check_data.get("text"),
    ]
    for candidate in candidates:
        text = _stringify_value(candidate)
        if text:
            return text
    return ""


def _extract_name(check_id: str, check_data: dict[str, Any]) -> str:
    candidates = [
        check_data.get("name"),
        check_data.get("title"),
        check_data.get("label"),
        check_data.get("check_name"),
    ]
    for candidate in candidates:
        text = _stringify_value(candidate)
        if text:
            return text
    return check_id or "Unknown Check"


def _normalize_check(check_id: Any, check_data: Any, category: str) -> dict | None:
    cid = str(check_id).strip() if check_id is not None else ""
    if not cid:
        return None

    if isinstance(check_data, dict):
        name = _extract_name(cid, check_data)
        prompt = _extract_prompt(check_data)
    else:
        # Accept simple string-based formats where check data is just prompt text.
        name = cid
        prompt = _stringify_value(check_data)

    return {
        "id": cid,
        "name": name,
        "prompt": prompt,
        "category": category or "Uncategorized",
        "few_shot": _stringify_value(check_data.get("few_shot") if isinstance(check_data, dict) else ""),
        "judge_override": _stringify_value(check_data.get("judge_override") if isinstance(check_data, dict) else ""),
    }


def _parse_subdomain_id_from_category(category: str) -> str:
    text = str(category or "").strip()
    if not text:
        return ""
    first = text.split()[0]
    return first if any(ch.isdigit() for ch in first) else ""


def _iter_subdomains(data: dict[str, Any]) -> list[dict[str, Any]]:
    subdomains: list[dict[str, Any]] = []
    domains = data.get("Domains") or data.get("domains")
    if not isinstance(domains, list):
        return subdomains

    for domain_obj in domains:
        if not isinstance(domain_obj, dict):
            continue
        for _, domain_val in domain_obj.items():
            if not isinstance(domain_val, dict):
                continue
            subs = domain_val.get("subdomains")
            if isinstance(subs, list):
                for sub in subs:
                    if isinstance(sub, dict):
                        subdomains.append(sub)
    return subdomains


def _ensure_checks_list(subdomain: dict[str, Any]) -> list[dict[str, Any]]:
    checks = subdomain.get("checks")
    if isinstance(checks, list):
        return checks
    if isinstance(checks, dict):
        # Convert mapping style to list mapping style for consistency.
        converted = [{k: v} for k, v in checks.items()]
        subdomain["checks"] = converted
        return converted
    subdomain["checks"] = []
    return subdomain["checks"]


def _check_payload_from_input(check_input: dict[str, Any]) -> dict[str, Any]:
    return {
        "name": str(check_input.get("name", "")).strip(),
        "prompt": str(check_input.get("prompt", "")).strip(),
        "few_shot": str(check_input.get("few_shot", "")).strip(),
        "judge_override": str(check_input.get("judge_override", "")).strip(),
    }


def upsert_check_in_library(data: Any, check_input: dict[str, Any]) -> tuple[dict[str, Any], bool]:
    """Insert or update one check in domain/subdomain format. Returns (data, created)."""
    if not isinstance(data, dict):
        raise ValueError("Invalid checks library format")

    check_id = str(check_input.get("id", "")).strip()
    if not check_id:
        raise ValueError("Check id is required")

    category = str(check_input.get("category", "")).strip() or "Uncategorized"
    target_subdomain_id = _parse_subdomain_id_from_category(category)
    payload = _check_payload_from_input(check_input)
    preserved_payload: dict[str, Any] = {}

    subdomains = _iter_subdomains(data)

    # Remove any existing instance with same id first.
    found_existing = False
    for sub in subdomains:
        checks = _ensure_checks_list(sub)
        next_checks: list[dict[str, Any]] = []
        for item in checks:
            if not isinstance(item, dict):
                next_checks.append(item)
                continue

            removed = False
            if check_id in item:
                raw_existing = item.get(check_id)
                if isinstance(raw_existing, dict):
                    preserved_payload = raw_existing
                removed = True
            elif str(item.get("id", "")).strip() == check_id:
                preserved_payload = item
                removed = True

            if removed:
                found_existing = True
                continue
            next_checks.append(item)
        sub["checks"] = next_checks

    # Find insertion target by subdomain id first, then by exact category label.
    target_sub = None
    if target_subdomain_id:
        for sub in subdomains:
            if str(sub.get("id", "")).strip() == target_subdomain_id:
                target_sub = sub
                break

    if target_sub is None:
        for sub in subdomains:
            full_category = f"{sub.get('id', '')} {sub.get('name', '')}".strip()
            if full_category == category:
                target_sub = sub
                break

    if target_sub is None:
        raise ValueError(
            f"Category '{category}' not found in checks library. Upload a library containing this subdomain first."
        )

    checks = _ensure_checks_list(target_sub)
    merged_payload = {**preserved_payload, **payload}
    checks.append({check_id: merged_payload})

    return data, (not found_existing)


def delete_check_from_library(data: Any, check_id: str) -> tuple[dict[str, Any], bool]:
    """Delete one check by id. Returns (data, deleted)."""
    if not isinstance(data, dict):
        raise ValueError("Invalid checks library format")

    cid = str(check_id or "").strip()
    if not cid:
        raise ValueError("Check id is required")

    deleted = False
    for sub in _iter_subdomains(data):
        checks = _ensure_checks_list(sub)
        next_checks: list[dict[str, Any]] = []
        for item in checks:
            if not isinstance(item, dict):
                next_checks.append(item)
                continue

            remove = False
            if cid in item:
                remove = True
            elif str(item.get("id", "")).strip() == cid:
                remove = True

            if remove:
                deleted = True
                continue
            next_checks.append(item)
        sub["checks"] = next_checks

    return data, deleted


def flatten_checks_library(data: Any) -> list[dict]:
    """
    Flattens supported check-library JSON formats into:
    [{id, name, prompt, category}, ...]
    """
    flat_checks: list[dict] = []

    if isinstance(data, list):
        # Either a flat array of checks or a list of domain wrappers.
        if all(isinstance(item, dict) and "id" in item for item in data):
            for item in data:
                norm = _normalize_check(
                    item.get("id"),
                    {
                        "name": item.get("name") or item.get("title") or item.get("label"),
                        "prompt": item.get("prompt"),
                        "instruction": item.get("instruction"),
                        "instructions": item.get("instructions"),
                        "requirement": item.get("requirement"),
                        "requirements": item.get("requirements"),
                        "description": item.get("description"),
                        "text": item.get("text"),
                    },
                    str(item.get("category", "Uncategorized")),
                )
                if norm:
                    flat_checks.append(norm)
            return _dedupe_checks(flat_checks)

    if isinstance(data, dict):
        # Format A: top-level "checks": [] or {}
        top_checks = data.get("checks")
        if isinstance(top_checks, list):
            for item in top_checks:
                if isinstance(item, dict) and "id" in item:
                    norm = _normalize_check(
                        item.get("id"),
                        {
                            "name": item.get("name") or item.get("title") or item.get("label"),
                            "prompt": item.get("prompt"),
                            "instruction": item.get("instruction"),
                            "instructions": item.get("instructions"),
                            "requirement": item.get("requirement"),
                            "requirements": item.get("requirements"),
                            "description": item.get("description"),
                            "text": item.get("text"),
                        },
                        str(item.get("category", "Uncategorized")),
                    )
                    if norm:
                        flat_checks.append(norm)
            if flat_checks:
                return _dedupe_checks(flat_checks)

        if isinstance(top_checks, dict):
            for check_id, check_data in top_checks.items():
                norm = _normalize_check(check_id, check_data, "Uncategorized")
                if norm:
                    flat_checks.append(norm)
            if flat_checks:
                return _dedupe_checks(flat_checks)

        # Format B: current framework format with Domains/subdomains/checks
        domains = data.get("Domains") or data.get("domains")
        if isinstance(domains, list):
            for domain_obj in domains:
                if not isinstance(domain_obj, dict):
                    continue
                for domain_val in domain_obj.values():
                    if not isinstance(domain_val, dict):
                        continue
                    subdomains = domain_val.get("subdomains") or []
                    if not isinstance(subdomains, list):
                        continue

                    for subdomain in subdomains:
                        if not isinstance(subdomain, dict):
                            continue

                        category_name = (
                            f"{subdomain.get('id', '')} {subdomain.get('name', '')}".strip()
                            or "Uncategorized"
                        )

                        checks_obj = subdomain.get("checks")
                        if isinstance(checks_obj, list):
                            for check_item in checks_obj:
                                if not isinstance(check_item, dict):
                                    continue

                                # Shape 1: direct check object in list -> {id, name, prompt, ...}
                                if "id" in check_item:
                                    norm = _normalize_check(
                                        check_item.get("id"),
                                        {
                                            "name": check_item.get("name") or check_item.get("title") or check_item.get("label"),
                                            "prompt": check_item.get("prompt"),
                                            "instruction": check_item.get("instruction"),
                                            "instructions": check_item.get("instructions"),
                                            "requirement": check_item.get("requirement"),
                                            "requirements": check_item.get("requirements"),
                                            "description": check_item.get("description"),
                                            "text": check_item.get("text"),
                                        },
                                        str(check_item.get("category", category_name)),
                                    )
                                    if norm:
                                        flat_checks.append(norm)
                                    continue

                                # Shape 2: mapping object in list -> {"9.1.10": {...}}
                                for check_id, check_data in check_item.items():
                                    norm = _normalize_check(check_id, check_data, category_name)
                                    if norm:
                                        flat_checks.append(norm)
                        elif isinstance(checks_obj, dict):
                            for check_id, check_data in checks_obj.items():
                                norm = _normalize_check(check_id, check_data, category_name)
                                if norm:
                                    flat_checks.append(norm)

            if flat_checks:
                return _dedupe_checks(flat_checks)

    deduped = _dedupe_checks(flat_checks)
    if deduped:
        return deduped

    # Format C fallback: recursively scan for objects with {id, prompt}
    recursive_checks = _collect_checks_recursively(data)
    return _dedupe_checks(recursive_checks)


def _dedupe_checks(checks: list[dict]) -> list[dict]:
    # Last one wins if duplicate IDs exist.
    by_id: dict[str, dict] = {}
    for chk in checks:
        cid = str(chk.get("id", "")).strip()
        if not cid:
            continue
        by_id[cid] = chk
    return list(by_id.values())


def _collect_checks_recursively(node: Any, inherited_category: str = "Uncategorized") -> list[dict]:
    found: list[dict] = []

    if isinstance(node, dict):
        # If this node itself looks like a check object, collect it.
        if "id" in node and "prompt" in node:
            norm = _normalize_check(
                node.get("id"),
                {
                    "name": node.get("name") or node.get("title") or node.get("label"),
                    "prompt": node.get("prompt"),
                    "instruction": node.get("instruction"),
                    "instructions": node.get("instructions"),
                    "requirement": node.get("requirement"),
                    "requirements": node.get("requirements"),
                    "description": node.get("description"),
                    "text": node.get("text"),
                },
                str(node.get("category", inherited_category)),
            )
            if norm:
                found.append(norm)

        # Also allow checks with id but no prompt key if instruction text uses another key.
        elif "id" in node and any(k in node for k in ("instruction", "instructions", "requirement", "requirements", "description", "text", "name", "title", "label")):
            norm = _normalize_check(
                node.get("id"),
                {
                    "name": node.get("name") or node.get("title") or node.get("label"),
                    "prompt": node.get("prompt"),
                    "instruction": node.get("instruction"),
                    "instructions": node.get("instructions"),
                    "requirement": node.get("requirement"),
                    "requirements": node.get("requirements"),
                    "description": node.get("description"),
                    "text": node.get("text"),
                },
                str(node.get("category", inherited_category)),
            )
            if norm:
                found.append(norm)

        # Improve inherited category when obvious section descriptors are present.
        next_category = inherited_category
        if "name" in node and isinstance(node.get("name"), str) and "id" in node:
            next_category = f"{node.get('id', '')} {node.get('name', '')}".strip() or inherited_category

        for value in node.values():
            found.extend(_collect_checks_recursively(value, next_category))

    elif isinstance(node, list):
        for item in node:
            found.extend(_collect_checks_recursively(item, inherited_category))

    return found


def summarize_check_library(checks: list[dict]) -> dict:
    categories = sorted({str(chk.get("category", "Uncategorized")) for chk in checks})
    with_prompt = sum(1 for chk in checks if str(chk.get("prompt", "")).strip())
    return {
        "total_checks": len(checks),
        "categories_count": len(categories),
        "categories": categories,
        "checks_with_prompt": with_prompt,
        "checks_without_prompt": len(checks) - with_prompt,
    }


def analyze_library_structure(data: Any) -> dict:
    """Provides structural diagnostics for domain/subdomain-based libraries."""
    domain_count = 0
    subdomain_count = 0
    empty_subdomain_checks = 0
    non_empty_subdomain_checks = 0

    if isinstance(data, dict):
        domains = data.get("Domains") or data.get("domains")
        if isinstance(domains, list):
            for domain_obj in domains:
                if not isinstance(domain_obj, dict):
                    continue
                for domain_val in domain_obj.values():
                    if not isinstance(domain_val, dict):
                        continue
                    domain_count += 1
                    subdomains = domain_val.get("subdomains") or []
                    if not isinstance(subdomains, list):
                        continue
                    for subdomain in subdomains:
                        if not isinstance(subdomain, dict):
                            continue
                        subdomain_count += 1
                        checks_obj = subdomain.get("checks")

                        if isinstance(checks_obj, list):
                            if len(checks_obj) == 0:
                                empty_subdomain_checks += 1
                            else:
                                non_empty_subdomain_checks += 1
                        elif isinstance(checks_obj, dict):
                            if len(checks_obj) == 0:
                                empty_subdomain_checks += 1
                            else:
                                non_empty_subdomain_checks += 1
                        else:
                            empty_subdomain_checks += 1

    return {
        "domains_count": domain_count,
        "subdomains_count": subdomain_count,
        "empty_subdomains_count": empty_subdomain_checks,
        "non_empty_subdomains_count": non_empty_subdomain_checks,
    }
