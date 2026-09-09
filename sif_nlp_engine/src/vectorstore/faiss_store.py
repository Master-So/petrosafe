"""FAISS vector store module for safety report retrieval.

Implements exact cosine similarity search using inner product (IndexFlatIP) on
normalized embeddings. Associates vectors with application metadata (report_id,
sif_proxy, descriptions) and enforces index isolation.
"""

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

import faiss
import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


class FaissVectorStore:
    """Manages FAISS index creation, serialization, deserialization, and similarity search."""

    def __init__(self) -> None:
        self.index: Optional[faiss.IndexFlatIP] = None
        self.metadata: List[Dict[str, Any]] = []
        self.dimension: int = 0

    def build_index(
        self,
        embeddings: np.ndarray,
        metadata_df: pd.DataFrame,
    ) -> None:
        """Builds an exact inner product (cosine) FAISS index from normalized vectors.

        Args:
            embeddings: Float32 numpy array of shape (N, D).
            metadata_df: DataFrame of length N containing 'report_id', 'description_clean', 'sif_proxy'.
        """
        if embeddings.shape[0] != len(metadata_df):
            raise ValueError(
                f"Embedding count ({embeddings.shape[0]}) does not match metadata row count ({len(metadata_df)})"
            )

        self.dimension = embeddings.shape[1]
        self.index = faiss.IndexFlatIP(self.dimension)

        # Ensure float32 format
        vectors = np.ascontiguousarray(embeddings, dtype=np.float32)
        self.index.add(vectors)

        # Convert metadata DataFrame to list of dicts
        self.metadata = metadata_df.to_dict(orient="records")

        logger.info(
            "Built FAISS IndexFlatIP with %d vectors (dimension: %d)",
            self.index.ntotal,
            self.dimension,
        )

    def search(
        self,
        query_embedding: np.ndarray,
        top_k: int = 10,
    ) -> List[Dict[str, Any]]:
        """Queries the vector index for the top_k most similar historical incidents.

        Args:
            query_embedding: Float32 numpy array of shape (1, D) or (D,).
            top_k: Maximum number of nearest neighbors to retrieve.

        Returns:
            List of matching records with similarity scores and historical attributes.
        """
        if self.index is None:
            raise RuntimeError("FAISS index has not been built or loaded.")

        if query_embedding.ndim == 1:
            query_embedding = query_embedding.reshape(1, -1)

        query_vector = np.ascontiguousarray(query_embedding, dtype=np.float32)
        k = min(top_k, self.index.ntotal)

        distances, indices = self.index.search(query_vector, k)

        results: List[Dict[str, Any]] = []
        for dist, idx in zip(distances[0], indices[0]):
            if idx == -1:
                continue
            item = dict(self.metadata[idx])
            item["similarity"] = float(dist)
            results.append(item)

        return results

    def save(self, index_path: str, metadata_path: str) -> None:
        """Serializes the FAISS index and metadata to disk."""
        if self.index is None:
            raise RuntimeError("Cannot save an uninitialized index.")

        idx_p = Path(index_path)
        meta_p = Path(metadata_path)
        idx_p.parent.mkdir(parents=True, exist_ok=True)
        meta_p.parent.mkdir(parents=True, exist_ok=True)

        faiss.write_index(self.index, str(idx_p))

        # Store metadata as JSON or parquet
        if meta_p.suffix == ".parquet":
            pd.DataFrame(self.metadata).to_parquet(meta_p, index=False)
        else:
            with open(meta_p, "w", encoding="utf-8") as f:
                json.dump(self.metadata, f, indent=2, default=str)

        logger.info("Saved FAISS index to %s and metadata to %s", idx_p, meta_p)

    def load(self, index_path: str, metadata_path: str) -> None:
        """Loads a persisted FAISS index and its metadata."""
        idx_p = Path(index_path)
        meta_p = Path(metadata_path)

        if not idx_p.exists() or not meta_p.exists():
            raise FileNotFoundError(f"Missing index ({idx_p}) or metadata ({meta_p}) file.")

        self.index = faiss.read_index(str(idx_p))
        self.dimension = self.index.d

        if meta_p.suffix == ".parquet":
            self.metadata = pd.read_parquet(meta_p).to_dict(orient="records")
        else:
            with open(meta_p, "r", encoding="utf-8") as f:
                self.metadata = json.load(f)

        logger.info(
            "Loaded FAISS index with %d vectors (dimension: %d) from %s",
            self.index.ntotal,
            self.dimension,
            idx_p,
        )
