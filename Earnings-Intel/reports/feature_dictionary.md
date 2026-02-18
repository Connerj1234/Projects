# Feature Dictionary

## Tabular features

- `sent_count`: number of sentence-like segments split on `.?!`
- `token_count`: count of word-like tokens
- `avg_sentence_len`: token_count / max(sent_count, 1)
- `avg_token_len`: average token character length
- `flesch_proxy`: readability proxy from sentence length and syllable estimate
- `uncertainty_count`: count of uncertainty lexicon hits
- `uncertainty_ratio`: uncertainty_count / token_count
- `risk_count`: count of risk lexicon hits
- `risk_ratio`: risk_count / token_count
- `positive_count`: count of positive sentiment lexicon hits
- `negative_count`: count of negative sentiment lexicon hits
- `positive_ratio`: positive_count / token_count
- `negative_ratio`: negative_count / token_count
- `sentiment_net`: (positive_count - negative_count) / token_count
- `numbers_density`: numeric token count / token_count
- `qa_ratio`: share of transcript characters in Q&A section (heuristic)

## Text features

- `features_text.npz`: TF-IDF sparse matrix over full transcript text (1-2 gram, english stopwords)
- `tfidf_vectorizer.joblib`: fitted TF-IDF vectorizer object

## Embeddings

- `embeddings.npy`: dense document vectors from TruncatedSVD over TF-IDF, L2-normalized
