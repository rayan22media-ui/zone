import json
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import pymysql


def _parse_iso(value: Any):
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except Exception:
            return value
    return value


def _doc_matches(doc: Dict[str, Any], query: Dict[str, Any]) -> bool:
    if not query:
        return True
    for key, val in query.items():
        if key == "$or":
            return any(_doc_matches(doc, q) for q in val)
        if isinstance(val, dict):
            current = doc.get(key)
            for op, opv in val.items():
                if op == "$in" and current not in opv:
                    return False
                if op == "$regex":
                    if not isinstance(current, str) or opv.lower() not in current.lower():
                        return False
            continue
        if doc.get(key) != val:
            return False
    return True


def _apply_update(doc: Dict[str, Any], update: Dict[str, Any]) -> Dict[str, Any]:
    if "$set" in update:
        doc.update(update["$set"])
    if "$inc" in update:
        for k, v in update["$inc"].items():
            doc[k] = (doc.get(k, 0) or 0) + v
    if "$addToSet" in update:
        for k, v in update["$addToSet"].items():
            arr = doc.get(k, [])
            if v not in arr:
                arr.append(v)
            doc[k] = arr
    if "$pull" in update:
        for k, v in update["$pull"].items():
            arr = doc.get(k, [])
            doc[k] = [x for x in arr if x != v]
    return doc


class MySQLCursor:
    def __init__(self, docs: List[Dict[str, Any]]):
        self.docs = docs

    def sort(self, key: str, direction: int):
        reverse = direction == -1
        self.docs.sort(key=lambda x: _parse_iso(x.get(key)) or "", reverse=reverse)
        return self

    def skip(self, count: int):
        self.docs = self.docs[count:]
        return self

    def limit(self, count: int):
        self.docs = self.docs[:count]
        return self

    async def to_list(self, length: int):
        return self.docs[:length]


class MySQLCollection:
    def __init__(self, adapter: "MySQLAdapter", name: str):
        self.adapter = adapter
        self.name = name

    def find(self, query: Optional[Dict] = None, projection: Optional[Dict] = None):
        docs = self.adapter._get_docs(self.name)
        filtered = [d.copy() for d in docs if _doc_matches(d, query or {})]
        if projection and projection.get("_id") == 0:
            for d in filtered:
                d.pop("_id", None)
        return MySQLCursor(filtered)

    async def find_one(self, query: Dict, projection: Optional[Dict] = None):
        docs = self.adapter._get_docs(self.name)
        for d in docs:
            if _doc_matches(d, query):
                out = d.copy()
                if projection and projection.get("_id") == 0:
                    out.pop("_id", None)
                return out
        return None

    async def insert_one(self, doc: Dict):
        self.adapter._insert_doc(self.name, doc)

    async def update_one(self, query: Dict, update: Dict):
        self.adapter._update_docs(self.name, query, update, many=False)

    async def update_many(self, query: Dict, update: Dict):
        self.adapter._update_docs(self.name, query, update, many=True)

    async def delete_one(self, query: Dict):
        self.adapter._delete_docs(self.name, query, many=False)

    async def delete_many(self, query: Dict):
        self.adapter._delete_docs(self.name, query, many=True)

    async def count_documents(self, query: Dict):
        return len([d for d in self.adapter._get_docs(self.name) if _doc_matches(d, query)])

    def aggregate(self, pipeline: List[Dict]):
        docs = [d.copy() for d in self.adapter._get_docs(self.name)]
        for stage in pipeline:
            if "$match" in stage:
                docs = [d for d in docs if _doc_matches(d, stage["$match"])]
            elif "$sort" in stage:
                for k, v in stage["$sort"].items():
                    docs.sort(key=lambda x: _parse_iso(x.get(k)) or "", reverse=v == -1)
            elif "$group" in stage:
                group = stage["$group"]
                # Support admin stats groups: {_id:"$field", count:{$sum:1}}
                if isinstance(group.get("_id"), str):
                    field = group["_id"].replace("$", "")
                    counts = {}
                    for d in docs:
                        key = d.get(field)
                        counts[key] = counts.get(key, 0) + 1
                    docs = [{"_id": k, "count": v} for k, v in counts.items()]
                else:
                    # Support conversations pipeline in this project.
                    grouped = {}
                    cond = group.get("_id", {}).get("other_user", {}).get("$cond", [])
                    current_user_id = None
                    if len(cond) >= 1:
                        eq_part = cond[0].get("$eq", []) if isinstance(cond[0], dict) else []
                        if len(eq_part) == 2:
                            current_user_id = eq_part[1]
                    for d in docs:
                        offer_id = d.get("offer_id")
                        other_user = d.get("receiver_id") if d.get("sender_id") == current_user_id else d.get("sender_id")
                        gk = (offer_id, other_user)
                        if gk not in grouped:
                            grouped[gk] = {
                                "_id": {"offer_id": offer_id, "other_user": other_user},
                                "last_message": d.get("content"),
                                "updated_at": d.get("created_at"),
                                "messages": [d],
                            }
                        else:
                            grouped[gk]["messages"].append(d)
                    docs = list(grouped.values())
            elif "$limit" in stage:
                docs = docs[: stage["$limit"]]
        return MySQLCursor(docs)


class MySQLAdapter:
    def __init__(self):
        self.conn = pymysql.connect(
            host=os.environ["MYSQL_HOST"],
            user=os.environ["MYSQL_USER"],
            password=os.environ["MYSQL_PASSWORD"],
            database=os.environ["MYSQL_DB"],
            charset="utf8mb4",
            autocommit=True,
            cursorclass=pymysql.cursors.DictCursor,
        )
        self._ensure_schema()

    def _ensure_schema(self):
        with self.conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS app_documents (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    collection_name VARCHAR(64) NOT NULL,
                    doc_id VARCHAR(64) NULL,
                    doc_json LONGTEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_collection (collection_name),
                    INDEX idx_doc_id (doc_id)
                ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
                """
            )

    def __getattr__(self, item: str):
        return MySQLCollection(self, item)

    def _get_docs(self, collection_name: str):
        with self.conn.cursor() as cur:
            cur.execute("SELECT doc_json FROM app_documents WHERE collection_name=%s", (collection_name,))
            rows = cur.fetchall()
        return [json.loads(r["doc_json"]) for r in rows]

    def _insert_doc(self, collection_name: str, doc: Dict[str, Any]):
        with self.conn.cursor() as cur:
            cur.execute(
                "INSERT INTO app_documents (collection_name, doc_id, doc_json) VALUES (%s, %s, %s)",
                (collection_name, doc.get("id"), json.dumps(doc, ensure_ascii=False)),
            )

    def _update_docs(self, collection_name: str, query: Dict, update: Dict, many: bool):
        with self.conn.cursor() as cur:
            cur.execute("SELECT id, doc_json FROM app_documents WHERE collection_name=%s", (collection_name,))
            rows = cur.fetchall()
            updated = 0
            for row in rows:
                doc = json.loads(row["doc_json"])
                if _doc_matches(doc, query):
                    doc = _apply_update(doc, update)
                    cur.execute("UPDATE app_documents SET doc_json=%s, doc_id=%s WHERE id=%s", (json.dumps(doc, ensure_ascii=False), doc.get("id"), row["id"]))
                    updated += 1
                    if not many:
                        break

    def _delete_docs(self, collection_name: str, query: Dict, many: bool):
        with self.conn.cursor() as cur:
            cur.execute("SELECT id, doc_json FROM app_documents WHERE collection_name=%s", (collection_name,))
            rows = cur.fetchall()
            deleted = 0
            for row in rows:
                doc = json.loads(row["doc_json"])
                if _doc_matches(doc, query):
                    cur.execute("DELETE FROM app_documents WHERE id=%s", (row["id"],))
                    deleted += 1
                    if not many:
                        break

    def close(self):
        self.conn.close()
