"""
Processador de códigos SIGTAP para índices de embedding.
"""
from typing import List

PAD_IDX = 0
UNK_IDX = 1


class SIGTAPProcessor:
    def __init__(self):
        self.vocab = {'<PAD>': PAD_IDX, '<UNK>': UNK_IDX}
        self.reverse_vocab = {PAD_IDX: '<PAD>', UNK_IDX: '<UNK>'}
        self.group_vocab = {'<PAD>': 0, '<UNK>': 0}
        self._fitted = False

    def fit(self, codes: List[str]):
        for c in codes:
            if not c:
                continue
            c = str(c).strip()
            if c and c not in self.vocab:
                idx = len(self.vocab)
                self.vocab[c] = idx
                self.reverse_vocab[idx] = c
                grp = c[:2] if len(c) >= 2 else c
                if grp not in self.group_vocab:
                    self.group_vocab[grp] = len(self.group_vocab)
        self._fitted = True
        return self

    def encode(self, code: str) -> int:
        if not code:
            return UNK_IDX
        c = str(code).strip()
        return self.vocab.get(c, UNK_IDX)

    @property
    def vocab_size(self) -> int:
        return len(self.vocab)
