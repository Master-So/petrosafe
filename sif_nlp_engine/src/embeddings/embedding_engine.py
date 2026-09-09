"""Text embedding engine using SentenceTransformers.

Provides normalized semantic embeddings with batch encoding, CPU/GPU device selection,
and configurable model architectures (e.g., BAAI/bge-small-en-v1.5, all-MiniLM-L6-v2).
"""

import logging
from typing import List, Optional, Union

import numpy as np
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)


class EmbeddingEngine:
    """Manages sentence transformer model loading and semantic vector generation."""

    def __init__(
        self,
        model_name: str = "BAAI/bge-small-en-v1.5",
        device: Optional[str] = None,
        normalize_embeddings: bool = True,
    ) -> None:
        """Initializes the embedding model.

        Args:
            model_name: Hugging Face model identifier.
            device: 'cpu', 'cuda', or None for automatic device resolution.
            normalize_embeddings: Whether to L2-normalize vectors for cosine similarity.
        """
        self.model_name = model_name
        self.normalize_embeddings = normalize_embeddings
        self.device = device

        logger.info("Initializing EmbeddingEngine with model '%s'...", model_name)
        self.model = SentenceTransformer(model_name, device=self.device)
        self.embedding_dim = self.model.get_sentence_embedding_dimension()
        logger.info(
            "EmbeddingEngine initialized. Embedding dimension: %d, Device: %s",
            self.embedding_dim,
            self.model.device,
        )

    def encode(
        self,
        texts: Union[str, List[str]],
        batch_size: int = 32,
        show_progress_bar: bool = False,
    ) -> np.ndarray:
        """Encodes a single string or list of strings into normalized float32 vectors.

        Args:
            texts: Single text string or list of text strings.
            batch_size: Batch size for inference.
            show_progress_bar: Whether to display progress bar during encoding.

        Returns:
            np.ndarray of shape (N, embedding_dim) as float32.
        """
        if isinstance(texts, str):
            texts = [texts]

        if not texts:
            return np.empty((0, self.embedding_dim), dtype=np.float32)

        # Encode and convert to float32
        embeddings = self.model.encode(
            texts,
            batch_size=batch_size,
            normalize_embeddings=self.normalize_embeddings,
            show_progress_bar=show_progress_bar,
            convert_to_numpy=True,
        )

        return embeddings.astype(np.float32)
