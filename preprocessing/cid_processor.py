"""
Processador de códigos CID-10 para índices de embedding.
"""
from typing import List

# Padding e unknown
PAD_IDX = 0
UNK_IDX = 1


class CIDProcessor:
    def __init__(self):
        self.vocab = {'<PAD>': PAD_IDX, '<UNK>': UNK_IDX}
        self.reverse_vocab = {PAD_IDX: '<PAD>', UNK_IDX: '<UNK>'}
        self._fitted = False

    def fit(self, codes: List[str]):
        for c in codes:
            if not c:
                continue
            c = str(c).upper().strip().replace('.', '')
            if c and c not in self.vocab:
                idx = len(self.vocab)
                self.vocab[c] = idx
                self.reverse_vocab[idx] = c
        self._fitted = True
        return self

    def encode(self, code: str) -> int:
        if not code:
            return UNK_IDX
        c = str(code).upper().strip().replace('.', '')
        return self.vocab.get(c, UNK_IDX)

    def encode_multiple(self, codes: List[str], max_len: int) -> List[int]:
        out = []
        for c in (codes or [])[:max_len]:
            out.append(self.encode(c))
        while len(out) < max_len:
            out.append(PAD_IDX)
        return out[:max_len]

    @property
    def vocab_size(self) -> int:
        return len(self.vocab)
